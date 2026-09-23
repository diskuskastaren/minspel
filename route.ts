import { type NextRequest } from "next/server";
import { isCategory } from "@/game-engine/oronmask";
import { getDeviceId } from "@/server/device";
import { errorResponse } from "@/server/http";
import { GameError, getClip } from "@/server/oronmask-service";

// Levererar bara den del av dagens klipp som spelaren har låst upp.
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("kategori");
    if (!isCategory(category)) throw new GameError("VALIDATION_ERROR", 400);
    const deviceId = await getDeviceId();
    const bytes = await getClip(deviceId, req.nextUrl.searchParams.get("datum"), category);
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
