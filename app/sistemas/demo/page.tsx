"use client"

import { useState } from "react"
import AnimatedBeamDemo from "@/src/components/AnimatedBeamDemo"

export default function SistemasBeamDemoPage() {
  const [showLegend, setShowLegend] = useState(true)

  return (
    <div 
      className="container"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        minHeight: "100vh",
        padding: "clamp(16px, 4vw, 32px)",
        color: "white"
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "clamp(24px, 5vw, 48px)",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: "800",
            marginBottom: "8px",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            🌟 Demo Sistemas Animados
          </h1>
          <p style={{
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: "16px"
          }}>
            Demonstração interativa do ecossistema ENY-GNA com animações
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowLegend(!showLegend)}
            style={{
              padding: "12px 20px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "10px",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s ease"
            }}
          >
            {showLegend ? "🙈 Ocultar" : "👁️ Mostrar"} Legenda
          </button>
          
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "12px 20px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            ← Voltar aos Sistemas
          </button>
        </div>
      </div>

      {/* Demonstração Principal */}
      <div style={{
        marginBottom: "clamp(32px, 6vw, 64px)"
      }}>
        <AnimatedBeamDemo />
      </div>

      {/* Legenda */}
      {showLegend && (
        <div style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "clamp(20px, 4vw, 40px)",
          backdropFilter: "blur(20px)",
          marginBottom: "clamp(32px, 6vw, 64px)"
        }}>
          <h2 style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: "700",
            marginBottom: "24px",
            color: "#3b82f6"
          }}>
            📖 Como Funciona
          </h2>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "24px"
          }}>
            <div>
              <h3 style={{ color: "#8b5cf6", fontSize: "1.1rem", marginBottom: "8px" }}>
                🎯 Sistema Central
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                O centro representa o hub principal - clique para voltar à página de sistemas
              </p>
            </div>
            
            <div>
              <h3 style={{ color: "#3b82f6", fontSize: "1.1rem", marginBottom: "8px" }}>
                ⚡ Feixes Animados
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                As animações mostram a conexão e fluxo de dados entre os sistemas
              </p>
            </div>
            
            <div>
              <h3 style={{ color: "#10b981", fontSize: "1.1rem", marginBottom: "8px" }}>
                🖱️ Navegação Interativa
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6 }}>
                Clique em qualquer sistema para navegar diretamente para ele
              </p>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "12px",
            marginTop: "24px"
          }}>
            {[
              { icon: "🕒", name: "Ponto", color: "#3b82f6" },
              { icon: "🎫", name: "Chamados", color: "#ec4899" },
              { icon: "💼", name: "CRM", color: "#06b6d4" },
              { icon: "💰", name: "Financeiro", color: "#10b981" },
              { icon: "🚗", name: "Frota", color: "#8b5cf6" },
              { icon: "📄", name: "Documentos", color: "#6366f1" }
            ].map((sistema) => (
              <div 
                key={sistema.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  border: `1px solid ${sistema.color}33`
                }}
              >
                <div style={{ fontSize: "1.5rem" }}>{sistema.icon}</div>
                <div style={{ 
                  fontSize: "0.875rem", 
                  fontWeight: 500,
                  color: sistema.color 
                }}>
                  {sistema.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recursos Técnicos */}
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "20px",
        padding: "clamp(20px, 4vw, 40px)",
        backdropFilter: "blur(20px)"
      }}>
        <h2 style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: "700",
          marginBottom: "24px",
          color: "#f59e0b"
        }}>
          🚀 Recursos Técnicos
        </h2>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px"
        }}>
          <div>
            <h4 style={{ color: "#3b82f6", marginBottom: "8px" }}>⚡ Framer Motion</h4>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.9rem" }}>
              Animações fluidas e performáticas com gradientes dinâmicos
            </p>
          </div>
          
          <div>
            <h4 style={{ color: "#8b5cf6", marginBottom: "8px" }}>📐 SVG Responsivo</h4>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.9rem" }}>
              Gráficos vetoriais que se adaptam a qualquer tamanho de tela
            </p>
          </div>
          
          <div>
            <h4 style={{ color: "#10b981", marginBottom: "8px" }}>🎨 Design System</h4>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.9rem" }}>
              Integrado ao tema existente com glass morphism
            </p>
          </div>
          
          <div>
            <h4 style={{ color: "#f59e0b", marginBottom: "8px" }}>🔄 Real-time</h4>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.9rem" }}>
              ResizeObserver para recalculo automático das posições
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}