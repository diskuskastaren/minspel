import { NextResponse, type NextRequest } from "next/server";
import { ROUNDS } from "@/game-engine/rattstavat";
import type { AudioKind } from "@/game-engine/rattstavat-api-types";
import { getDeviceId } from "@/server/device";
import { GameError } from "@/server/errors";
import { errorResponse, noStore } from "@/server/http";
import { audio } from "@/server/rattstavat-service";

const KINDS: AudioKind[] = ["ord", "definition", "mening"];

// Uppläsning för en runda: MP3 om den finns, annars text för webbläsarens talsyntes (bara lokalt).
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const round = Number(q.get("runda"));
    const kind = q.get("typ") as AudioKind;
    if (!Number.isInteger(round) || round < 0 || round >= ROUNDS || !KINDS.includes(kind)) throw new GameError("VALIDATION_ERROR", 400);
    const result = audio(await getDeviceId(), { round, kind, date: q.get("datum") });
    if (result.kind === "text") return NextResponse.json({ text: result.text }, { headers: noStore });
    return new Response(result.bytes as unknown as BodyInit, {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": String(result.bytes.length), ...noStore },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
