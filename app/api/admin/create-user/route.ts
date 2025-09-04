import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({
    error: 'This endpoint is not available. Use client-side Firebase Auth for user creation.'
  }, { status: 501 });
}
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin apenas se não estiver inicializado
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || `firebase-adminsdk-yourapp@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'dummy-key',
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, role, empresaId } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    // Criar usuário no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // Definir claims customizados
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: role || 'colaborador',
      empresaId: empresaId || null,
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: 'Usuário criado com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    
    let errorMessage = 'Erro interno do servidor';
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Este email já está em uso';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'A senha deve ter pelo menos 6 caracteres';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
