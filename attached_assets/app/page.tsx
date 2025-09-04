"use client"

import { useState } from "react"
import AnimatedBeamDemo from "@/components/animated-beam-demo"
import SistemasPage from "@/components/sistemas-page"

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"home" | "sistemas">("home")

  if (currentView === "sistemas") {
    return <SistemasPage onBack={() => setCurrentView("home")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Sistema Integrado de Gestão</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Clique nos sistemas conectados para acessar o menu principal
          </p>
        </div>

        {/* Animated Beam Demo */}
        <div className="flex justify-center mb-8">
          <div onClick={() => setCurrentView("sistemas")} className="cursor-pointer">
            <AnimatedBeamDemo />
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <button
            onClick={() => setCurrentView("sistemas")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg"
          >
            Acessar Sistemas
          </button>
        </div>
      </div>
    </div>
  )
}
