import { NextRequest, NextResponse } from 'next/server';

// Esta rota não é mais necessária com client-only approach
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Esta funcionalidade foi movida para o client-side' },
    { status: 410 }
  );
}