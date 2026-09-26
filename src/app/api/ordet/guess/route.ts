import { NextResponse, type NextRequest } from "next/server";
import { isWordLength } from "@/game-engine/ordet";
import { isValidDate } from "@/lib/time";
import { getDeviceId } from "@/server/device";
import { GameError } from "@/server/errors";
import { errorResponse, noStore } from "@/server/http";
import { makeGuess } from "@/server/ordet-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const { langd, idx, ord, svart, datum } = body ?? {};
    if (
      !isWordLength(langd) ||
      !Number.isInteger(idx) ||
      (idx as number) < 0 ||
      typeof ord !== "string" ||
      ord.length > 20 ||
      typeof svart !== "boolean" ||
      !(datum === undefined || datum === null || isValidDate(datum))
    ) {
      throw new GameError("VALIDATION_ERROR", 400);
    }
    const result = makeGuess(await getDeviceId(), {
      length: langd,
      idx: idx as number,
      word: ord,
      hard: svart,
      date: (datum as string | null | undefined) ?? null,
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
