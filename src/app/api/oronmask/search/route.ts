import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/server/http";
import { search } from "@/server/oronmask-service";

export async function GET(req: NextRequest) {
  try {
    const hits = await search(req.nextUrl.searchParams.get("q") ?? "");
    return NextResponse.json({ hits }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    return errorResponse(e);
  }
}
