import { NextResponse } from "next/server";
import { getDeviceId } from "@/server/device";
import { errorResponse, noStore } from "@/server/http";
import { getToday } from "@/server/today-service";

export async function GET() {
  try {
    return NextResponse.json(getToday(await getDeviceId()), { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
