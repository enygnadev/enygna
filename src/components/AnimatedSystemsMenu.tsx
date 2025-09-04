"use client"

import React, { forwardRef, useRef } from "react"
import { AnimatedBeam } from "./magicui/animated-beam"

interface SystemIconProps {
  className?: string
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  gradient?: string
  title?: string
}

const SystemIcon = forwardRef<HTMLDivElement, SystemIconProps>(
  ({ className, children, onClick, disabled, gradient, title }, ref) => {
    return (
      <div
        ref={ref}
        onClick={disabled ? undefined : onClick}
        title={title}
        className={`
          z-10 flex items-center justify-center 
          w-16 h-16 rounded-full border-2 
          shadow-lg cursor-pointer 
          transition-all duration-300 ease-out
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-200 border-gray-300' 
            : 'hover:scale-110 hover:shadow-xl bg-white border-gray-200 hover:border-blue-400'
          }
          ${className || ''}
        `}
        style={{
          background: disabled ? undefined : gradient || 'white',
          boxShadow: disabled 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
            : '0 10px 25px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className={`text-2xl ${disabled ? 'grayscale' : ''}`}>
          {children}
        </div>
      </div>
    )
  }
)

SystemIcon.displayName = "SystemIcon"

interface AnimatedSystemsMenuProps {
  onSystemSelect: (systemId: string) => void
  hasAccess: (system: string) => boolean
  user?: any
  userData?: any
}

export default function AnimatedSystemsMenu({ 
  onSystemSelect, 
  hasAccess, 
  user, 
  userData 
}: AnimatedSystemsMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pontoRef = useRef<HTMLDivElement>(null)
  const chamadosRef = useRef<HTMLDivElement>(null)
  const vendasRef = useRef<HTMLDivElement>(null)
  const centralRef = useRef<HTMLDivElement>(null)
  const estoqueRef = useRef<HTMLDivElement>(null)
  const financeiroRef = useRef<HTMLDivElement>(null)
  const rhRef = useRef<HTMLDivElement>(null)
  const documentosRef = useRef<HTMLDivElement>(null)
  const frotaRef = useRef<HTMLDivElement>(null)

  const systems = [
    {
      id: 'ponto',
      name: 'Sistema de Ponto',
      icon: '🕒',
      ref: pontoRef,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'top-left'
    },
    {
      id: 'chamados',
      name: 'Chamados TI',
      icon: '🎫',
      ref: chamadosRef,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      position: 'top-right'
    },
    {
      id: 'vendas',
      name: 'Sistema de Vendas',
      icon: '💼',
      ref: vendasRef,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      position: 'middle-left'
    },
    {
      id: 'estoque',
      name: 'Controle de Estoque',
      icon: '📦',
      ref: estoqueRef,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      position: 'middle-right'
    },
    {
      id: 'financeiro',
      name: 'Sistema Financeiro',
      icon: '💰',
      ref: financeiroRef,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      position: 'bottom-left'
    },
    {
      id: 'rh',
      name: 'Recursos Humanos',
      icon: '👥',
      ref: rhRef,
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      position: 'bottom-right'
    },
    {
      id: 'documentos',
      name: 'Gerador de Documentos',
      icon: '📄',
      ref: documentosRef,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'bottom-center'
    },
    {
      id: 'frota',
      name: 'Gerenciamento de Frota',
      icon: '🚗',
      ref: frotaRef,
      gradient: 'linear-gradient(135deg, #00ff7f 0%, #8a2be2 100%)',
      position: 'top-center'
    }
  ]

  const handleSystemClick = (systemId: string) => {
    const hasSystemAccess = user && userData && hasAccess(systemId)
    const isAccessible = !user || hasSystemAccess || ['vendas', 'estoque', 'rh'].includes(systemId)
    
    if (isAccessible) {
      onSystemSelect(systemId)
    }
  }

  return (
    <div className="relative flex justify-center items-center w-full">
      <div
        className="relative flex h-[600px] w-full max-w-4xl items-center justify-center overflow-hidden rounded-2xl p-10"
        ref={containerRef}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Grid Layout dos Sistemas */}
        <div className="grid grid-cols-3 gap-16 w-full max-w-2xl">
          {/* Linha Superior */}
          <div className="flex justify-center">
            <SystemIcon
              ref={pontoRef}
              onClick={() => handleSystemClick('ponto')}
              disabled={user && userData && !hasAccess('ponto')}
              gradient={systems[0].gradient}
              title={systems[0].name}
            >
              {systems[0].icon}
            </SystemIcon>
          </div>
          
          <div className="flex justify-center">
            <SystemIcon
              ref={frotaRef}
              onClick={() => handleSystemClick('frota')}
              disabled={user && userData && !hasAccess('frota')}
              gradient={systems.find(s => s.id === 'frota')?.gradient}
              title="Gerenciamento de Frota"
            >
              🚗
            </SystemIcon>
          </div>

          <div className="flex justify-center">
            <SystemIcon
              ref={chamadosRef}
              onClick={() => handleSystemClick('chamados')}
              disabled={user && userData && !hasAccess('chamados')}
              gradient={systems[1].gradient}
              title={systems[1].name}
            >
              {systems[1].icon}
            </SystemIcon>
          </div>

          {/* Linha do Meio */}
          <div className="flex justify-center">
            <SystemIcon
              ref={vendasRef}
              onClick={() => handleSystemClick('vendas')}
              disabled={false}
              gradient={systems[2].gradient}
              title={systems[2].name}
            >
              {systems[2].icon}
            </SystemIcon>
          </div>

          <div className="flex justify-center">
            <SystemIcon
              ref={centralRef}
              className="w-20 h-20 border-4 border-blue-400"
              onClick={() => {}}
              disabled={false}
              gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
              title="Central de Sistemas"
            >
              🏢
            </SystemIcon>
          </div>

          <div className="flex justify-center">
            <SystemIcon
              ref={estoqueRef}
              onClick={() => handleSystemClick('estoque')}
              disabled={false}
              gradient={systems[3].gradient}
              title={systems[3].name}
            >
              {systems[3].icon}
            </SystemIcon>
          </div>

          {/* Linha Inferior */}
          <div className="flex justify-center">
            <SystemIcon
              ref={financeiroRef}
              onClick={() => handleSystemClick('financeiro')}
              disabled={user && userData && !hasAccess('financeiro')}
              gradient={systems[4].gradient}
              title={systems[4].name}
            >
              {systems[4].icon}
            </SystemIcon>
          </div>

          <div className="flex justify-center">
            <SystemIcon
              ref={documentosRef}
              onClick={() => handleSystemClick('documentos')}
              disabled={user && userData && !hasAccess('documentos')}
              gradient={systems.find(s => s.id === 'documentos')?.gradient}
              title="Gerador de Documentos"
            >
              📄
            </SystemIcon>
          </div>

          <div className="flex justify-center">
            <SystemIcon
              ref={rhRef}
              onClick={() => handleSystemClick('rh')}
              disabled={false}
              gradient={systems[5].gradient}
              title={systems[5].name}
            >
              {systems[5].icon}
            </SystemIcon>
          </div>
        </div>

        {/* Animated Beams conectando todos os sistemas à central */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={pontoRef}
          toRef={centralRef}
          curvature={-75}
          endYOffset={-10}
          gradientStartColor="#667eea"
          gradientStopColor="#764ba2"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={chamadosRef}
          toRef={centralRef}
          curvature={-75}
          endYOffset={-10}
          reverse
          gradientStartColor="#f093fb"
          gradientStopColor="#f5576c"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={vendasRef}
          toRef={centralRef}
          gradientStartColor="#4facfe"
          gradientStopColor="#00f2fe"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={estoqueRef}
          toRef={centralRef}
          reverse
          gradientStartColor="#43e97b"
          gradientStopColor="#38f9d7"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={financeiroRef}
          toRef={centralRef}
          curvature={75}
          endYOffset={10}
          gradientStartColor="#fa709a"
          gradientStopColor="#fee140"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={rhRef}
          toRef={centralRef}
          curvature={75}
          endYOffset={10}
          reverse
          gradientStartColor="#a8edea"
          gradientStopColor="#fed6e3"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={documentosRef}
          toRef={centralRef}
          gradientStartColor="#667eea"
          gradientStopColor="#764ba2"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={frotaRef}
          toRef={centralRef}
          gradientStartColor="#00ff7f"
          gradientStopColor="#8a2be2"
        />
      </div>
    </div>
  )
}