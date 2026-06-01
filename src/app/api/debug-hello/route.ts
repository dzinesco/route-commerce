import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ts: new Date().toISOString(),
    deployment: "debug-hello",
    msg: "hello from latest build"
  });
}