
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do admin
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se o usuário autenticado é admin
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
    const currentUserRole = decodedClaims.role;
    
    if (!['superadmin', 'adminmaster'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { uid, empresaId, role, sistemasAtivos } = await request.json();

    if (!uid || !role) {
      return NextResponse.json({ 
        error: 'UID e role são obrigatórios' 
      }, { status: 400 });
    }

    // Definir claims customizados
    const customClaims: Record<string, any> = {
      role,
      timestamp: Date.now()
    };

    if (empresaId) {
      customClaims.empresaId = empresaId;
    }

    if (sistemasAtivos && Array.isArray(sistemasAtivos)) {
      customClaims.sistemasAtivos = sistemasAtivos;
    }

    // Aplicar claims no Firebase Auth
    await adminAuth.setCustomUserClaims(uid, customClaims);

    // Atualizar documento do usuário no Firestore
    await adminDb.collection('users').doc(uid).set({
      role,
      empresaId: empresaId || null,
      sistemasAtivos: sistemasAtivos || [],
      updatedAt: new Date().toISOString(),
      updatedBy: decodedClaims.uid
    }, { merge: true });

    // Log de auditoria
    await adminDb.collection('audit_logs').add({
      action: 'set_claims',
      adminId: decodedClaims.uid,
      targetUserId: uid,
      changes: customClaims,
      timestamp: new Date().toISOString(),
      ip: request.ip || 'unknown'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Claims atualizados com sucesso' 
    });

  } catch (error: any) {
    console.error('Erro ao definir claims:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 });
  }
}
