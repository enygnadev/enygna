import { NextRequest, NextResponse } from 'next/server';
import { auth, db, FieldValue } from '@/firebaseAdmin'; // Assumindo que FieldValue é importado de 'firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    const {
      email,
      password,
      displayName,
      role,
      tipo,
      empresaId,
      sistemasAtivos,
      workDaysPerMonth,
      salaryType,
      hourlyRate,
      dailyRate,
      monthlyRate,
      monthlySalary,
      monthlyBaseHours,
      toleranceMinutes,
      lunchBreakMinutes,
      lunchThresholdMinutes,
      sistema // Assumindo que 'sistema' também pode ser passado
    } = userData;

    // Validar dados obrigatórios
    if (!email || !password || !displayName || !empresaId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Criar usuário no Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true, // Definir como true se a verificação for feita de outra forma ou se for um usuário interno
    });

    // Criar documento do usuário no Firestore
    const userDoc = {
      uid: userRecord.uid,
      email,
      displayName,
      role: role || 'colaborador',
      empresaId,
      sistemasAtivos: sistemasAtivos || [],
      tipo: 'usuario',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
      permissions: {
        canAccessSystems: sistemasAtivos || [],
        admin: ['admin', 'gestor', 'superadmin'].includes(role || 'colaborador')
      }
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    // Definir claims personalizados
    const customClaims = {
      role: role || 'colaborador',
      empresaId,
      sistemasAtivos: sistemasAtivos || [],
      canAccessSystems: sistemasAtivos || [],
      email_verified: true,
      permissions: {
        canAccessSystems: sistemasAtivos || [],
        admin: ['admin', 'gestor', 'superadmin'].includes(role || 'colaborador')
      }
    };

    try {
      await auth.setCustomUserClaims(userRecord.uid, customClaims);
      console.log('Claims definidos para usuário:', userRecord.uid);
    } catch (claimsError) {
      console.warn('Erro ao definir claims:', claimsError);
    }

    // Adicionar à subcoleção específica do sistema se especificado
    if (sistema && sistema !== 'universal') {
      const sistemaUserDoc = {
        ...userDoc,
        sistema
      };
      await db.collection(`${sistema}_users`).doc(userRecord.uid).set(sistemaUserDoc);
    }

    console.log('Usuário criado com sucesso:', userRecord.uid);

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      claims: customClaims
    });

  } catch (error: any) {
    console.error('Erro ao processar dados do colaborador:', error);

    // Tratar erros específicos de autenticação ou banco de dados se necessário
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 409 });
    }
    if (error.code === 'permission-denied') {
      return NextResponse.json({ error: 'Permissão negada para criar usuário.' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}