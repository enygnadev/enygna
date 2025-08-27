// functions/src/index.ts
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Opcional: fixe a região se quiser (ex.: "southamerica-east1")
const region = "southamerica-east1";

if (!admin.apps.length) {
  admin.initializeApp();
}

/** ===== Tipos de payload das Callables ===== */
type Role = "superadmin" | "admin" | "gestor" | "colaborador";

type SetCompanyClaimsReq = {
  uid: string;
  role: Role;
  empresaId?: string; // obrigatório quando role !== 'superadmin'
};
type SetCompanyClaimsRes = { ok: true };

type CreateCompanyUserReq = {
  email: string;
  password: string;
  displayName?: string;
  role: Role;
  empresaId?: string; // obrigatório quando role !== 'superadmin'
};
type CreateCompanyUserRes = { ok: true; uid: string };

/**
 * Define/atualiza custom claims (role, empresaId) de um usuário existente.
 * Chamado no front via httpsCallable("setCompanyClaims")
 */
export const setCompanyClaims = functions
  .region(region)
  .https.onCall(async (data: SetCompanyClaimsReq, context): Promise<SetCompanyClaimsRes> => {
    // Validação defensiva do payload
    if (!data || typeof data !== "object") {
      throw new functions.https.HttpsError("invalid-argument", "Payload inválido.");
    }
    const { uid, empresaId, role } = data;

    if (!uid || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Parâmetros obrigatórios: uid, role."
      );
    }
    if (role !== "superadmin" && !empresaId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "empresaId é obrigatório para papéis diferentes de superadmin."
      );
    }

    await admin.auth().setCustomUserClaims(uid, {
      role,
      ...(empresaId ? { empresaId } : {}),
    });

    // (Opcional) Auditoria em Firestore
    if (empresaId) {
      await admin
        .firestore()
        .collection("empresas")
        .doc(empresaId)
        .collection("colaboradores")
        .doc(uid)
        .set(
          {
            role,
            empresaId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    return { ok: true };
  });

/**
 * Cria usuário no Auth e aplica claims (role, empresaId).
 * Chamado no front via httpsCallable("createCompanyUser")
 */
export const createCompanyUser = functions
  .region(region)
  .https.onCall(async (data: CreateCompanyUserReq, context): Promise<CreateCompanyUserRes> => {
    if (!data || typeof data !== "object") {
      throw new functions.https.HttpsError("invalid-argument", "Payload inválido.");
    }

    const { email, password, displayName, empresaId, role } = data;

    if (!email || !password || !role) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Parâmetros obrigatórios: email, password, role."
      );
    }
    if (role !== "superadmin" && !empresaId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "empresaId é obrigatório para papéis diferentes de superadmin."
      );
    }

    // Cria usuário
    const user = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || "",
      emailVerified: false,
      disabled: false,
    });

    // Aplica claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role,
      ...(empresaId ? { empresaId } : {}),
    });

    // Doc do colaborador no escopo da empresa (auditoria/controle)
    if (empresaId) {
      await admin
        .firestore()
        .collection("empresas")
        .doc(empresaId)
        .collection("colaboradores")
        .doc(user.uid)
        .set(
          {
            email,
            displayName: displayName || "",
            role,
            empresaId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    return { ok: true, uid: user.uid };
  });
