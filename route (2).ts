import { NextResponse, type NextRequest } from "next/server";
import { isCategory } from "@/game-engine/oronmask";
import { isValidDate } from "@/lib/time";
import { getDeviceId } from "@/server/device";
import { errorResponse, noStore } from "@/server/http";
import { GameError, makeMove } from "@/server/oronmask-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const category = body?.kategori;
    const idx = body?.idx;
    const trackId = body?.trackId;
    const date = body?.datum;
    if (
      !isCategory(category) ||
      !Number.isInteger(idx) ||
      (idx as number) < 0 ||
      !(trackId === null || (Number.isInteger(trackId) && (trackId as number) > 0)) ||
      !(date === undefined || date === null || isValidDate(date))
    ) {
      throw new GameError("VALIDATION_ERROR", 400);
    }
    const deviceId = await getDeviceId();
    const result = await makeMove(deviceId, {
      category,
      idx: idx as number,
      trackId: trackId as number | null,
      date: (date as string | null | undefined) ?? null,
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
