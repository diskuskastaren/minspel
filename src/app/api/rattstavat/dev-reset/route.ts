import { NextResponse, type NextRequest } from "next/server";
import { getDeviceId } from "@/server/device";
import { resetDay, resolveDate } from "@/server/rattstavat-service";

// Endast lokal utveckling: nollställ dagens (eller valt datums) runda för den här enheten.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  const { date } = resolveDate(req.nextUrl.searchParams.get("datum"));
  resetDay(await getDeviceId(), date);
  return NextResponse.json({ ok: true });
}
