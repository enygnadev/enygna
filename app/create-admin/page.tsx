"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const ADMIN_EMAIL = "enygna@enygna.com";
const ADMIN_PASSWORD = "enygna123";
const ADMIN_DISPLAY_NAME = "ENYGNA Admin";

export default function CreateAdminOpenPage() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // --- Evita hidratação: só calculamos o diagnóstico após montar no client
  const [mounted, setMounted] = useState(false);
  const [cfgOk, setCfgOk] = useState<boolean | null>(null);
  const [diag, setDiag] = useState<string>("");

  useEffect(() => {
    setMounted(true);

    // calcula diagnóstico apenas no client (pós-mount)
    const required = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ] as const;

    const missing = required.filter(
      (k) => !process.env[k] || String(process.env[k]).trim() === ""
    );

    if (missing.length === 0) {
      setCfgOk(true);
      setDiag("✅ Config Firebase OK.");
    } else {
      setCfgOk(false);
      setDiag(
        `⚠️ Variáveis ausentes: ${missing.join(
          ", "
        )}.\nEdite seu .env.local e preencha esses campos. Em seguida, reinicie o dev server.`
      );
    }
  }, []);

  async function ensureAdmin() {
    if (!cfgOk) {
      setStatus("❌ Configuração inválida. " + (diag || ""));
      return;
    }

    setLoading(true);
    setStatus("Criando/garantindo admin padrão…");

    try {
      // 1) Cria; se já existir, faz login
      let user = null as null | typeof auth.currentUser;
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        );
        user = cred.user;
        setStatus("✅ Usuário admin criado. Ajustando perfil e Firestore…");
      } catch (err: any) {
        if (err?.code === "auth/email-already-in-use") {
          try {
            const cred = await signInWithEmailAndPassword(
              auth,
              ADMIN_EMAIL,
              ADMIN_PASSWORD
            );
            user = cred.user;
            setStatus("ℹ️ Usuário já existia. Garantindo papel de admin…");
          } catch (loginErr: any) {
            if (
              loginErr?.code === "auth/wrong-password" ||
              loginErr?.code === "auth/invalid-credential"
            ) {
              setStatus(
                "❌ E-mail já existe, mas a senha padrão não confere. Altere ADMIN_PASSWORD para a senha correta OU redefina a senha no console do Firebase."
              );
              return;
            }
            throw loginErr;
          }
        } else if (err?.code === "auth/operation-not-allowed") {
          setStatus(
            "❌ Provedor Email/Password desativado. Ative em Firebase Console → Authentication → Sign-in method → Email/Password."
          );
          return;
        } else if (
          err?.code === "auth/invalid-api-key" ||
          err?.message?.includes("api-key-not-valid")
        ) {
          setStatus(
            "❌ API key inválida. Preencha NEXT_PUBLIC_FIREBASE_API_KEY no .env.local com a chave real do projeto e reinicie o servidor."
          );
          return;
        } else if (err?.code === "auth/network-request-failed") {
          setStatus(
            "❌ Falha de rede ao contatar o Firebase. Verifique sua conexão e as credenciais do projeto."
          );
          return;
        } else {
          throw err;
        }
      }

      if (!user) throw new Error("Falha ao obter usuário.");

      // 2) Ajusta displayName (best-effort)
      try {
        if (!user.displayName) {
          await updateProfile(user, { displayName: ADMIN_DISPLAY_NAME });
        }
      } catch {
        /* noop */
      }

      // 3) Garante doc users/{uid} com role: "admin"
      const userRef = doc(db, "users", user.uid);
      const base = {
        uid: user.uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_DISPLAY_NAME,
        role: "admin" as const,
        updatedAt: serverTimestamp(),
      };
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await setDoc(userRef, base, { merge: true });
      } else {
        await setDoc(userRef, {
          ...base,
          createdAt: serverTimestamp(),
          createdBy: "bootstrap:anyone",
        });
      }

      setStatus((s) => s + "\n✅ Admin garantido no Firestore.");

      // 4) Desloga para não deixar sessão ativa do visitante como admin
      try {
        await signOut(auth);
        setStatus((s) => s + "\n🔐 Sessão encerrada por segurança.");
      } catch {
        setStatus((s) => s + "\n⚠️ Não foi possível encerrar a sessão (tente atualizar).");
      }
    } catch (e: any) {
      console.error(e);
      setStatus("❌ Erro: " + (e?.message || "falha desconhecida"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Criar Admin Padrão (ABERTO)</h1>

      {/* Durante SSR (ou antes do mount), não renderizamos diagnóstico para evitar mismatch */}
      <pre
        className="whitespace-pre-wrap text-sm p-3 rounded-xl max-w-xl"
        style={{
          background:
            cfgOk === true
              ? "rgba(16,185,129,.12)"
              : cfgOk === false
              ? "rgba(245,158,11,.12)"
              : "rgba(255,255,255,.08)",
          border: "1px solid rgba(255,255,255,.15)",
          minHeight: 48,
        }}
        suppressHydrationWarning
      >
        {mounted ? diag : "Verificando configuração..."}
      </pre>

      <p className="text-center text-sm opacity-80 max-w-xl">
        Qualquer pessoa pode criar/forçar o admin <b>{ADMIN_EMAIL}</b> (senha fixa).
        <br />
        <span className="text-red-600 font-medium">
          Use só para bootstrap e DELETE esta página depois.
        </span>
      </p>

      <button
        onClick={ensureAdmin}
        disabled={loading || cfgOk === false || cfgOk === null}
        className="px-5 py-2 rounded-xl shadow-md border text-sm disabled:opacity-50"
        title={
          cfgOk === false
            ? "Corrija a configuração do Firebase para habilitar"
            : "Criar/Garantir Admin"
        }
      >
        {loading ? "Processando…" : "Criar/Garantir Admin"}
      </button>

      {status && (
        <pre className="whitespace-pre-wrap text-sm bg-black/5 p-3 rounded-xl max-w-xl">
          {status}
        </pre>
      )}

      <div className="text-xs opacity-60 mt-4">
        Caminho da página: <code>app/create-admin/page.tsx</code>
      </div>
    </main>
  );
}