import admin from 'firebase-admin';

// Inicializar Firebase Admin apenas uma vez
if (!admin.apps.length) {
  // Verificar se as credenciais necessárias estão disponíveis
  const hasCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
    (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  
  if (!hasCredentials) {
    console.warn('Firebase Admin credentials not found. Admin features will be disabled.');
    console.warn('Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env.local file');
  } else {
    // Em produção, use variáveis de ambiente seguras
    // Em desenvolvimento, pode usar arquivo de service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : {
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
    }
  }
}

export default admin;

// Helper functions para sessões seguras
export async function verifySessionCookie(sessionCookie: string): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error('Session cookie verification failed:', error);
    return null;
  }
}

export async function createSessionCookie(idToken: string, expiresIn: number = 7 * 24 * 60 * 60 * 1000) {
  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    return sessionCookie;
  } catch (error) {
    console.error('Session cookie creation failed:', error);
    throw error;
  }
}

export async function setCustomUserClaims(uid: string, claims: Record<string, any>) {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Failed to set custom claims:', error);
    return false;
  }
}

export async function revokeAllUserSessions(uid: string) {
  try {
    await admin.auth().revokeRefreshTokens(uid);
    return true;
  } catch (error) {
    console.error('Failed to revoke user sessions:', error);
    return false;
  }
}