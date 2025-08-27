import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({
    error: 'This endpoint is not available. User promotion requires Firebase Admin SDK.'
  }, { status: 501 });
}