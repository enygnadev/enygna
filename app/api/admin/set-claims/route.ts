import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface SetClaimsRequest {
  userId: string;
  claims: {
    role?: string;
    empresaId?: string;
    sistemasAtivos?: string[];
    permissions?: Record<string, boolean>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SetClaimsRequest = await request.json();
    const { userId, claims } = body;

    if (!userId || !claims) {
      return NextResponse.json(
        { error: 'userId e claims são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário solicitante tem permissão
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);

      // Verificar se quem está fazendo a requisição é admin
      if (!['superadmin', 'adminmaster', 'admin'].includes(decodedToken.role)) {
        return NextResponse.json(
          { error: 'Permissão insuficiente' },
          { status: 403 }
        );
      }

      // Preparar claims customizados
      const customClaims: Record<string, any> = {
        role: claims.role || 'colaborador',
        empresaId: claims.empresaId || null,
        sistemasAtivos: claims.sistemasAtivos || [],
        permissions: claims.permissions || {},
        updatedAt: Date.now()
      };

      // Definir claims no Firebase Auth
      await adminAuth.setCustomUserClaims(userId, customClaims);

      // Também atualizar no Firestore para backup
      try {
        const firestore = getFirestore();
        await firestore.collection('users').doc(userId).update({
          role: customClaims.role,
          empresaId: customClaims.empresaId,
          sistemasAtivos: customClaims.sistemasAtivos,
          permissions: customClaims.permissions,
          claimsUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      } catch (firestoreError) {
        console.warn('Erro ao atualizar Firestore (claims definidas no Auth):', firestoreError);
      }

      console.log(`Claims definidas para usuário ${userId}:`, customClaims);

      return NextResponse.json({
        success: true,
        message: 'Claims definidas com sucesso',
        claims: customClaims
      });

    } catch (authError) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Erro ao definir claims:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obter claims atuais
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);

      // Verificar permissão
      if (!['superadmin', 'adminmaster', 'admin'].includes(decodedToken.role)) {
        return NextResponse.json(
          { error: 'Permissão insuficiente' },
          { status: 403 }
        );
      }

      // Obter usuário e claims
      const userRecord = await adminAuth.getUser(userId);

      return NextResponse.json({
        userId: userRecord.uid,
        email: userRecord.email,
        claims: userRecord.customClaims || {},
        emailVerified: userRecord.emailVerified
      });

    } catch (authError) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Erro ao obter claims:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}