
"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export default function PromoteSuperAdmin() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUserRole(null);
        setUserInfo(null);
        return;
      }

      setUserInfo(user);

      try {
        // Verificar role via token claims
        const token = await getIdTokenResult(user, true);
        const tokenRole = (token.claims as any).role || null;
        
        // Verificar role via Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const firestoreRole = userDoc.exists() ? userDoc.data()?.role : null;
        
        const finalRole = tokenRole || firestoreRole || "colaborador";
        setCurrentUserRole(finalRole);
        
        if (finalRole === 'superadmin') {
          setStatus("✅ Você já é um Super Administrador! Pode acessar o painel admin.");
        }
      } catch (error) {
        console.error("Erro ao verificar role:", error);
        setCurrentUserRole("colaborador");
      }
    });

    return () => unsub();
  }, []);

  async function promoteToSuperAdmin() {
    if (!auth.currentUser) {
      setStatus("❌ Você precisa estar logado para usar esta funcionalidade");
      return;
    }

    setLoading(true);
    setStatus("🔄 Promovendo usuário a Super Admin...");

    try {
      const user = auth.currentUser;
      
      // Primeiro, atualizar no Firestore
      await updateDoc(doc(db, "users", user.uid), {
        role: "superadmin",
        promotedAt: new Date().toISOString(),
        promotedBy: "self-promotion"
      });

      setStatus("📝 Perfil atualizado no Firestore. Configurando permissões...");

      // Obter token atual
      const idToken = await user.getIdToken(true);

      // Chamar API para definir custom claims
      const response = await fetch("/api/admin/promote-superadmin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid: user.uid }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus("✅ Usuário promovido a Super Admin com sucesso!\n🔄 Fazendo logout para atualizar permissões...");

        // Aguardar um pouco e fazer logout
        setTimeout(async () => {
          try {
            await auth.signOut();
            setStatus("🔐 Logout realizado. Faça login novamente para acessar o painel admin.");
          } catch (error) {
            setStatus("⚠️ Promovido com sucesso, mas erro no logout. Atualize a página e tente fazer login novamente.");
          }
        }, 2000);
      } else {
        setStatus(`⚠️ Perfil atualizado, mas erro na API: ${result.error}\n\nTente atualizar as permissões ou fazer logout/login novamente.`);
      }

    } catch (error: any) {
      console.error("Erro ao promover usuário:", error);
      setStatus(`❌ Erro: ${error?.message || "Falha desconhecida"}`);
    } finally {
      setLoading(false);
    }
  }

  const handleForceRefresh = async () => {
    if (!auth.currentUser) return;
    
    try {
      setLoading(true);
      setStatus("🔄 Atualizando permissões...");
      
      // Força refresh do token
      await getIdTokenResult(auth.currentUser, true);
      
      // Recarrega a página
      window.location.reload();
    } catch (error) {
      setStatus("❌ Erro ao atualizar permissões");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ opacity: 0.7 }}>Carregando...</div>
      </div>
    );
  }

  return (
    <main className="container" style={{ padding: 40, maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 700 }}>
          🚀 Promover a Super Admin
        </h1>

        <div style={{ marginBottom: 24 }}>
          <p style={{ marginBottom: 16, opacity: 0.8 }}>
            Esta página permite promover o usuário atual a <strong>Super Administrador</strong>.
          </p>
          
          {userInfo && (
            <div style={{ 
              padding: 16, 
              border: "1px solid rgba(59, 130, 246, 0.3)", 
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.1)",
              marginBottom: 16,
              textAlign: 'left'
            }}>
              <p><strong>Email:</strong> {userInfo.email}</p>
              <p><strong>Nome:</strong> {userInfo.displayName || 'Não informado'}</p>
              <p><strong>Role atual:</strong> {currentUserRole || 'Verificando...'}</p>
              <p><strong>UID:</strong> {userInfo.uid}</p>
            </div>
          )}

          {currentUserRole === 'superadmin' ? (
            <div style={{
              padding: 16,
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.1)",
              marginBottom: 24,
              fontSize: 14
            }}>
              ✅ <strong>Você já é um Super Administrador!</strong> Pode acessar o painel admin.
            </div>
          ) : (
            <div style={{
              padding: 16,
              border: "1px solid rgba(245,158,11,.3)",
              borderRadius: 8,
              background: "rgba(245,158,11,.1)",
              marginBottom: 24,
              fontSize: 14
            }}>
              ⚠️ <strong>Atenção:</strong> Esta ação irá conceder acesso total ao sistema.
              Use apenas se você é o administrador principal do sistema.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentUserRole !== 'superadmin' && (
            <button
              onClick={promoteToSuperAdmin}
              disabled={loading || !userInfo}
              className="button button-primary"
              style={{ 
                width: "100%", 
                padding: "16px 24px",
                fontSize: 16
              }}
            >
              {loading ? "🔄 Processando..." : "⭐ Promover a Super Admin"}
            </button>
          )}

          <button
            onClick={handleForceRefresh}
            disabled={loading || !userInfo}
            className="button"
            style={{ 
              width: "100%", 
              padding: "12px 24px",
              fontSize: 14,
              backgroundColor: '#10b981',
              color: 'white'
            }}
          >
            {loading ? "🔄 Atualizando..." : "🔄 Atualizar Permissões"}
          </button>

          <a
            href="/admin"
            className="button"
            style={{
              width: "100%", 
              padding: "12px 24px",
              fontSize: 14,
              backgroundColor: '#6b7280',
              color: 'white',
              textDecoration: 'none',
              display: 'block'
            }}
          >
            🏢 Ir para Painel Admin
          </a>

          <a
            href="/"
            className="button button-ghost"
            style={{
              width: "100%", 
              padding: "12px 24px",
              fontSize: 14
            }}
          >
            🏠 Voltar ao Início
          </a>
        </div>

        {status && (
          <div style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid rgba(107, 114, 128, 0.3)",
            borderRadius: 8,
            background: "rgba(107, 114, 128, 0.1)",
            fontSize: 14,
            whiteSpace: 'pre-line',
            textAlign: 'left'
          }}>
            {status}
          </div>
        )}
      </div>
    </main>
  );
}
