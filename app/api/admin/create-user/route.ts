import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({
    error: 'This endpoint is not available. Use client-side Firebase Auth for user creation.'
  }, { status: 501 });
}