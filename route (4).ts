import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId } from "@/server/device";
import { errorResponse, noStore } from "@/server/http";
import { getState } from "@/server/oronmask-service";

export async function GET(req: NextRequest) {
  try {
    const deviceId = await getDeviceId();
    const state = await getState(deviceId, req.nextUrl.searchParams.get("datum"));
    return NextResponse.json(state, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
