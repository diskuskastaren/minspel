import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId } from "@/server/device";
import { errorResponse, noStore } from "@/server/http";
import { getState } from "@/server/ordet-service";

export async function GET(req: NextRequest) {
  try {
    const deviceId = await getDeviceId();
    return NextResponse.json(getState(deviceId, req.nextUrl.searchParams.get("datum")), { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
