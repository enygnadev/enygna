import admin from 'firebase-admin';
import { getApps, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Configuração do Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
  }),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
};

// Inicializar apenas se não existir
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseAdminConfig);
} else {
  app = getApps()[0];
}

// Exportar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export { FieldValue };

// Funções para gerenciar cookies de sessão
export async function createSessionCookie(idToken: string, expiresIn: number): Promise<string> {
  return auth.createSessionCookie(idToken, { expiresIn });
}

export async function verifySessionCookie(sessionCookie: string) {
  try {
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return null;
  }
}

export default admin;