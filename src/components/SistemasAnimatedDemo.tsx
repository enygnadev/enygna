"use client"

import React, { forwardRef, useRef } from "react"
import { AnimatedBeam } from "./ui/animated-beam"

// Componente de círculo reutilizável
const SystemCircle = forwardRef<
  HTMLDivElement, 
  { 
    className?: string
    children?: React.ReactNode
    onClick?: () => void
    system?: string
    size?: "small" | "medium" | "large"
  }
>(({ className = "", children, onClick, system, size = "medium" }, ref) => {
  const sizeStyles = {
    small: "w-12 h-12 text-lg",
    medium: "w-16 h-16 text-2xl", 
    large: "w-20 h-20 text-3xl"
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`
        ${sizeStyles[size]}
        flex items-center justify-center rounded-full
        cursor-pointer transition-all duration-300 transform
        hover:scale-110 hover:shadow-lg
        ${className}
      `}
      style={{
        background: "rgba(255, 255, 255, 0.1)",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      {children}
    </div>
  )
})

SystemCircle.displayName = "SystemCircle"

export default function SistemasAnimatedDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const centralRef = useRef<HTMLDivElement>(null)
  const pontoRef = useRef<HTMLDivElement>(null)
  const chamadosRef = useRef<HTMLDivElement>(null)
  const crmRef = useRef<HTMLDivElement>(null)
  const financeiroRef = useRef<HTMLDivElement>(null)
  const frotaRef = useRef<HTMLDivElement>(null)
  const documentosRef = useRef<HTMLDivElement>(null)

  const handleSystemClick = (systemId: string) => {
    // Redirecionar para o sistema correspondente
    const routes: Record<string, string> = {
      ponto: "/ponto/auth",
      chamados: "/chamados/auth", 
      crm: "/crm/auth",
      financeiro: "/financeiro/auth",
      frota: "/frota/auth",
      documentos: "/documentos/auth"
    }

    if (routes[systemId]) {
      window.location.href = routes[systemId]
    } else {
      alert(`Sistema ${systemId} será implementado em breve!`)
    }
  }

  return (
    <div 
      className="relative w-full h-[500px] flex items-center justify-center overflow-hidden"
      ref={containerRef}
      style={{
        background: "linear-gradient(135deg, rgba(17, 17, 17, 0.95) 0%, rgba(34, 34, 34, 0.95) 100%)",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(20px)"
      }}
    >
      {/* Layout dos sistemas */}
      <div className="relative w-full max-w-lg h-full flex flex-col justify-between p-8">
        
        {/* Linha superior */}
        <div className="flex justify-between items-center">
          <SystemCircle 
            ref={pontoRef} 
            onClick={() => handleSystemClick("ponto")}
            className="bg-gradient-to-br from-blue-500 to-purple-600"
          >
            🕒
          </SystemCircle>
          
          <SystemCircle 
            ref={chamadosRef} 
            onClick={() => handleSystemClick("chamados")}
            className="bg-gradient-to-br from-pink-500 to-red-600"
          >
            🎫
          </SystemCircle>
        </div>

        {/* Linha central */}
        <div className="flex justify-between items-center">
          <SystemCircle 
            ref={crmRef} 
            onClick={() => handleSystemClick("crm")}
            className="bg-gradient-to-br from-cyan-500 to-blue-600"
          >
            💼
          </SystemCircle>

          {/* Sistema Central */}
          <SystemCircle 
            ref={centralRef} 
            size="large"
            onClick={() => window.location.href = "/sistemas"}
            className="bg-gradient-to-br from-yellow-500 to-orange-600 ring-4 ring-white ring-opacity-30"
          >
            🏢
          </SystemCircle>

          <SystemCircle 
            ref={financeiroRef} 
            onClick={() => handleSystemClick("financeiro")}
            className="bg-gradient-to-br from-green-500 to-emerald-600"
          >
            💰
          </SystemCircle>
        </div>

        {/* Linha inferior */}
        <div className="flex justify-between items-center">
          <SystemCircle 
            ref={frotaRef} 
            onClick={() => handleSystemClick("frota")}
            className="bg-gradient-to-br from-purple-500 to-indigo-600"
          >
            🚗
          </SystemCircle>
          
          <SystemCircle 
            ref={documentosRef} 
            onClick={() => handleSystemClick("documentos")}
            className="bg-gradient-to-br from-indigo-500 to-purple-600"
          >
            📄
          </SystemCircle>
        </div>
      </div>

      {/* Feixes animados conectando ao centro */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={pontoRef}
        toRef={centralRef}
        curvature={-75}
        gradientStartColor="#3b82f6"
        gradientStopColor="#8b5cf6"
        duration={3}
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={crmRef}
        toRef={centralRef}
        gradientStartColor="#06b6d4"
        gradientStopColor="#3b82f6"
        duration={3.5}
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={frotaRef}
        toRef={centralRef}
        curvature={75}
        gradientStartColor="#8b5cf6"
        gradientStopColor="#6366f1"
        duration={4}
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={chamadosRef}
        toRef={centralRef}
        curvature={-75}
        reverse
        gradientStartColor="#ec4899"
        gradientStopColor="#ef4444"
        duration={3.2}
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={financeiroRef}
        toRef={centralRef}
        reverse
        gradientStartColor="#10b981"
        gradientStopColor="#059669"
        duration={3.8}
      />
      
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={documentosRef}
        toRef={centralRef}
        curvature={75}
        reverse
        gradientStartColor="#6366f1"
        gradientStopColor="#8b5cf6"
        duration={4.2}
      />

      {/* Título */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <h3 className="text-white text-lg font-semibold text-center">
          🌟 Ecossistema ENY-GNA
        </h3>
        <p className="text-white/70 text-sm text-center mt-1">
          Clique nos sistemas para navegar
        </p>
      </div>
    </div>
  )
}