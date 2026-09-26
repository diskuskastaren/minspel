import { NextResponse, type NextRequest } from "next/server";
import { ROUNDS } from "@/game-engine/rattstavat";
import { isValidDate } from "@/lib/time";
import { getDeviceId } from "@/server/device";
import { GameError } from "@/server/errors";
import { errorResponse, noStore } from "@/server/http";
import { answer } from "@/server/rattstavat-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const { runda, svar, datum } = body ?? {};
    if (
      !Number.isInteger(runda) ||
      (runda as number) < 0 ||
      (runda as number) >= ROUNDS ||
      typeof svar !== "string" ||
      svar.length > 60 ||
      !(datum === undefined || datum === null || isValidDate(datum))
    ) {
      throw new GameError("VALIDATION_ERROR", 400);
    }
    const state = answer(await getDeviceId(), { round: runda as number, text: svar, date: (datum as string | null | undefined) ?? null });
    return NextResponse.json(state, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
