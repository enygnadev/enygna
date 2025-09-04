
import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: "enygna-4957d",
    private_key_id: "50ogg",
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: "103974569083956937284",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs/firebase-adminsdk-50ogg%40enygna-4957d.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    projectId: "enygna-4957d"
  });
}

const db = admin.firestore();

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
      lunchThresholdMinutes
    } = userData;

    // Validar dados obrigatórios
    if (!email || !password || !displayName || !empresaId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // 1. Criar usuário no Firebase Auth usando Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });

    // 2. Criar documento na coleção principal 'users'
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role: role || 'colaborador',
      tipo: tipo || 'colaborador',
      empresaId,
      sistemasAtivos: sistemasAtivos || [],
      permissions: {
        canAccessSystems: sistemasAtivos || []
      },
      hourlyRate: Number(hourlyRate) || 0,
      monthlySalary: Number(monthlySalary) || 0,
      monthlyBaseHours: Number(monthlyBaseHours) || 220,
      toleranceMinutes: Number(toleranceMinutes) || 0,
      lunchBreakMinutes: Number(lunchBreakMinutes) || 0,
      lunchThresholdMinutes: Number(lunchThresholdMinutes) || 360,
      ativo: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Criar documento na subcoleção da empresa
    await db.collection('empresas').doc(empresaId).collection('colaboradores').doc(userRecord.uid).set({
      email,
      displayName,
      role: role || 'colaborador',
      empresaId,
      workDaysPerMonth: Number(workDaysPerMonth) || 22,
      salaryType: salaryType || 'monthly',
      hourlyRate: Number(hourlyRate) || 0,
      dailyRate: Number(dailyRate) || 0,
      monthlyRate: Number(monthlyRate) || 0,
      monthlySalary: Number(monthlySalary) || 0,
      effectiveHourlyRate: salaryType === 'hourly' ? Number(hourlyRate) || 0 : 0,
      monthlyBaseHours: Number(monthlyBaseHours) || 220,
      toleranceMinutes: Number(toleranceMinutes) || 0,
      lunchBreakMinutes: Number(lunchBreakMinutes) || 0,
      lunchThresholdMinutes: Number(lunchThresholdMinutes) || 360,
      isAuthUser: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      success: true, 
      userId: userRecord.uid,
      message: 'Colaborador criado com sucesso' 
    });

  } catch (error: any) {
    console.error('Erro ao criar colaborador:', error);
    
    let errorMessage = 'Erro interno do servidor';
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'email-already-in-use';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'weak-password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'invalid-email';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
