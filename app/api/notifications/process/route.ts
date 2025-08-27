
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/src/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma chamada autorizada (pode ser um cron job ou webhook)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.NOTIFICATIONS_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Processar fila de emails
    await notificationService.processEmailQueue();
    
    return NextResponse.json({ success: true, message: 'Email queue processed' });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      { error: 'Failed to process email queue' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.NOTIFICATIONS_API_KEY;
    
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (action) {
      case 'check-delays':
        await notificationService.checkForDelays();
        return NextResponse.json({ success: true, message: 'Delays checked' });
      
      case 'check-absences':
        await notificationService.checkForAbsences();
        return NextResponse.json({ success: true, message: 'Absences checked' });
      
      case 'process-queue':
        await notificationService.processEmailQueue();
        return NextResponse.json({ success: true, message: 'Queue processed' });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
