
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ThemeSelector from '@/src/components/ThemeSelector';
import dynamic from 'next/dynamic';

// Importar mapa dinamicamente para evitar problemas de SSR
const MapaRastreamento = dynamic(
  () => import('@/src/components/MapaRastreamento'),
  { 
    ssr: false, 
    loading: () => (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)'
      }}>
        <div className="spinner"></div>
      </div>
    )
  }
);

export default function GpsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [veiculoId, setVeiculoId] = useState('');
  const [error, setError] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    // Registrar service worker para tracking em background
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) {
          navigator.serviceWorker.register('/gps-sw.js').catch(console.error);
        }
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        window.location.href = '/sistemas';
      }
    });

    return () => unsubscribe();
  }, []);

  const iniciarRastreamento = async () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste dispositivo');
      return;
    }

    if (!veiculoId.trim()) {
      setError('Informe o ID do veículo para continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verificar se o veículo existe
      const veiculoRef = doc(db, 'veiculos', veiculoId.trim());
      const veiculoSnap = await getDoc(veiculoRef);

      if (!veiculoSnap.exists()) {
        setError('Veículo não encontrado. Verifique o ID.');
        setLoading(false);
        return;
      }

      // Iniciar tracking contínuo
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setLocation(coords);
          setLastUpdate(new Date().toLocaleTimeString());

          try {
            // Atualizar posição no Firestore
            await updateDoc(veiculoRef, {
              'gps.latitude': coords.lat,
              'gps.longitude': coords.lng,
              'gps.ultimaAtualizacao': new Date().toISOString(),
              'gps.accuracy': position.coords.accuracy,
              'gps.speed': position.coords.speed || 0,
              'gps.heading': position.coords.heading || 0
            });
          } catch (err) {
            console.error('Erro ao salvar localização:', err);
          }
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setError(`Erro no GPS: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );

      setWatchId(id);
      setTracking(true);
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      setError('Erro ao buscar dados do veículo');
    } finally {
      setLoading(false);
    }
  };

  const pararRastreamento = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTracking(false);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '60px',
              height: '60px',
              border: '4px solid var(--color-border)',
              borderTop: '4px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Carregando sistema GPS...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .gps-root {
          background: linear-gradient(135deg, var(--gradient-primary));
          min-height: 100vh;
          padding: var(--gap-xl);
        }

        .gps-card {
          background: var(--gradient-card);
          border-radius: var(--radius-lg);
          padding: var(--gap-xl);
          backdrop-filter: blur(15px);
          border: 1px solid var(--color-border);
          margin-bottom: var(--gap-xl);
        }

        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .status-online {
          background: #00ff7f;
          animation: pulse 2s infinite;
        }

        .status-offline {
          background: #ff6b6b;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .map-container {
          height: 400px;
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        .tracking-button {
          background: linear-gradient(45deg, #00ff7f, #32cd32);
          color: #000;
          border: none;
          border-radius: 25px;
          padding: 1rem 2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-right: 1rem;
        }

        .tracking-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 255, 127, 0.4);
        }

        .stop-button {
          background: linear-gradient(45deg, #ff6b6b, #ff4444);
          color: #fff;
          border: none;
          border-radius: 25px;
          padding: 1rem 2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .stop-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
        }
      `}</style>

      <div className="gps-root">
        {/* Header */}
        <div className="responsive-flex" style={{
          marginBottom: 'var(--gap-xl)',
          padding: 'var(--gap-md)',
          background: 'var(--gradient-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)'
        }}>
          <div className="row" style={{ gap: 'var(--gap-md)' }}>
            <Link href="/frota" className="button button-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Voltar à Frota
            </Link>
            <div className="badge">
              🛰️ Sistema GPS v2.0
            </div>
            <div className="badge">
              <span className={`status-indicator ${tracking ? 'status-online' : 'status-offline'}`}></span>
              {tracking ? 'Rastreando' : 'Inativo'}
            </div>
          </div>
          <ThemeSelector size="medium" />
        </div>

        {/* Hero */}
        <div className="gps-card" style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: 'white'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛰️</div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>
            Localização ao Vivo do Motorista
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Rastreamento GPS em tempo real com precisão militar
          </p>
        </div>

        {/* Controles */}
        <div className="gps-card">
          <h3 style={{ marginBottom: 'var(--gap-md)' }}>Configurações de Rastreamento</h3>
          
          {!tracking && (
            <div style={{ marginBottom: 'var(--gap-md)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                ID do Veículo *
              </label>
              <input
                className="input"
                placeholder="ex: veiculo123"
                value={veiculoId}
                onChange={(e) => setVeiculoId(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--color-textSecondary)', marginTop: '0.5rem' }}>
                Digite o ID do veículo cadastrado no sistema
              </p>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--gap-md)' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 'var(--gap-md)' }}>
            {!tracking ? (
              <button
                className="tracking-button"
                onClick={iniciarRastreamento}
                disabled={loading || !veiculoId.trim()}
              >
                ▶️ {loading ? 'Iniciando...' : 'Iniciar Rastreamento 24h'}
              </button>
            ) : (
              <button
                className="stop-button"
                onClick={pararRastreamento}
              >
                ⏹️ Parar Rastreamento
              </button>
            )}
          </div>

          {tracking && location && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--gap-md)', marginTop: 'var(--gap-md)' }}>
              <div className="badge">
                📍 Lat: {location.lat.toFixed(6)}
              </div>
              <div className="badge">
                📍 Lng: {location.lng.toFixed(6)}
              </div>
              <div className="badge">
                🕐 Última atualização: {lastUpdate}
              </div>
              <div className="badge">
                🛰️ Status: Ativo
              </div>
            </div>
          )}
        </div>

        {/* Mapa */}
        {location && (
          <div className="gps-card">
            <h3 style={{ marginBottom: 'var(--gap-md)' }}>Localização em Tempo Real</h3>
            <div className="map-container">
              <MapaRastreamento 
                lat={location.lat} 
                lng={location.lng}
                onLocationUpdate={(coords) => {
                  console.log("Nova localização recebida:", coords);
                  setLocation(coords);
                }}
              />
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="gps-card">
          <h3 style={{ marginBottom: 'var(--gap-md)' }}>📋 Instruções de Uso</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--gap-md)' }}>
            <div>
              <h4>1️⃣ Configuração Inicial</h4>
              <p>Digite o ID do veículo cadastrado no sistema de frota.</p>
            </div>
            <div>
              <h4>2️⃣ Iniciar Rastreamento</h4>
              <p>Clique em "Iniciar Rastreamento" para ativar o GPS contínuo.</p>
            </div>
            <div>
              <h4>3️⃣ Monitoramento</h4>
              <p>A localização será atualizada automaticamente a cada 5 segundos.</p>
            </div>
            <div>
              <h4>4️⃣ Background</h4>
              <p>O tracking continuará mesmo com o navegador minimizado.</p>
            </div>
          </div>
        </div>

        {/* Recursos */}
        <div className="gps-card">
          <h3 style={{ marginBottom: 'var(--gap-md)' }}>🚀 Recursos Avançados</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--gap-md)' }}>
            <div className="badge">🎯 Precisão militar (±3m)</div>
            <div className="badge">⚡ Atualização em tempo real</div>
            <div className="badge">📱 Funciona em background</div>
            <div className="badge">🔄 Sincronização automática</div>
            <div className="badge">🔋 Otimizado para bateria</div>
            <div className="badge">🌐 Funciona offline</div>
          </div>
        </div>
      </div>
    </div>
  );
}
