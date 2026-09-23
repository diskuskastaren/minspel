import "server-only";
import { NextResponse } from "next/server";
import { GameError } from "./oronmask-service";
import { UpstreamError } from "./deezer";

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof GameError) return NextResponse.json({ code: e.code }, { status: e.status });
  if (e instanceof UpstreamError) {
    console.error("[deezer]", e.message);
    return NextResponse.json({ code: "UPSTREAM_ERROR" }, { status: 502 });
  }
  console.error(e);
  return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
}

export const noStore = { "Cache-Control": "no-store" };
