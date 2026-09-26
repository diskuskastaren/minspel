import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId } from "@/server/device";
import { saveFeedback } from "@/server/feedback";
import { errorResponse, noStore } from "@/server/http";

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    saveFeedback(await getDeviceId(), { typ: body.typ, text: body.text, spel: body.spel, sida: body.sida });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
