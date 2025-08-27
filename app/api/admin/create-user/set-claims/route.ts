
// This API route has been removed because it depends on Firebase Admin SDK
// which is no longer available in this client-only setup.

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ 
    error: 'This endpoint is not available. Custom claims require Firebase Admin SDK.' 
  }, { status: 501 });
}
