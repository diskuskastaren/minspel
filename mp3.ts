// Klipper en MP3-fil på ramgränser så att servern bara lämnar ut så mycket
// ljud som spelaren har låst upp. Då går det inte att "tjuvlyssna" genom att
// låta klippet spela vidare – filen tar helt enkelt slut.

const BITRATES: Record<string, number[]> = {
  // [MPEG-version][layer] → kbps per index 1..14
  "1-3": [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-3": [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Record<number, number[]> = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  25: [11025, 12000, 8000],
};

type Frame = { offset: number; length: number; seconds: number };

function id3Size(buf: Uint8Array): number {
  if (buf.length >= 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    const footer = buf[5] & 0x10 ? 10 : 0;
    return 10 + size + footer;
  }
  return 0;
}

function parseHeader(buf: Uint8Array, i: number): { length: number; seconds: number } | null {
  if (i + 4 > buf.length) return null;
  if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (buf[i + 1] >> 3) & 0x03; // 00=2.5, 10=2, 11=1
  const layerBits = (buf[i + 1] >> 1) & 0x03; // 01 = Layer III
  if (versionBits === 0x01 || layerBits !== 0x01) return null;
  const version = versionBits === 0x03 ? 1 : versionBits === 0x02 ? 2 : 25;
  const bitrateIdx = (buf[i + 2] >> 4) & 0x0f;
  const srIdx = (buf[i + 2] >> 2) & 0x03;
  const padding = (buf[i + 2] >> 1) & 0x01;
  if (bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) return null;
  const kbps = BITRATES[version === 1 ? "1-3" : "2-3"][bitrateIdx - 1];
  const sampleRate = SAMPLE_RATES[version][srIdx];
  const samples = version === 1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * kbps * 1000) / sampleRate) + padding;
  if (length < 24) return null;
  return { length, seconds: samples / sampleRate };
}

function isInfoFrame(buf: Uint8Array, f: Frame): boolean {
  const end = Math.min(f.offset + f.length, buf.length);
  for (let i = f.offset + 4; i + 4 <= end && i < f.offset + 64; i++) {
    const tag = String.fromCharCode(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
    if (tag === "Xing" || tag === "Info" || tag === "VBRI") return true;
  }
  return false;
}

export function parseFrames(buf: Uint8Array): Frame[] {
  const frames: Frame[] = [];
  let i = id3Size(buf);
  while (i < buf.length) {
    const h = parseHeader(buf, i);
    if (h && i + h.length <= buf.length) {
      frames.push({ offset: i, length: h.length, seconds: h.seconds });
      i += h.length;
    } else {
      i++; // återsynka
    }
  }
  if (frames.length > 0 && isInfoFrame(buf, frames[0])) frames.shift();
  return frames;
}

export function mp3Duration(buf: Uint8Array): number {
  return parseFrames(buf).reduce((s, f) => s + f.seconds, 0);
}

/** Returnerar ljudet från startSec och durationSec framåt (avrundat uppåt till hel ram). */
export function sliceMp3(buf: Uint8Array, startSec: number, durationSec: number): Uint8Array {
  const frames = parseFrames(buf);
  const picked: Frame[] = [];
  let t = 0;
  for (const f of frames) {
    const frameStart = t;
    t += f.seconds;
    if (t <= startSec) continue;
    if (frameStart >= startSec + durationSec) break;
    picked.push(f);
  }
  const total = picked.reduce((s, f) => s + f.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const f of picked) {
    out.set(buf.subarray(f.offset, f.offset + f.length), o);
    o += f.length;
  }
  return out;
}
