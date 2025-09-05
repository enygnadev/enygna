
'use client';

import React from 'react';

type Props = {
  lat: number;
  lng: number;
  label?: string;
  accuracy?: number;
  compareTo?: { lat: number; lng: number; label?: string };
  samePlaceRadius?: number;
  autoRefreshMs?: number;
  docPath?: string;
  preferClientLocation?: boolean;
  useGeoWatch?: boolean;
  autoRecenter?: boolean;
};

export default function LocationMap({
  lat,
  lng,
  label = "Localização",
  accuracy,
  compareTo,
  samePlaceRadius = 120,
}: Props) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Calcular distância se tiver ponto de comparação
  const distance = React.useMemo(() => {
    if (!compareTo) return null;

    const R = 6371000; // Raio da Terra em metros
    const φ1 = (lat * Math.PI) / 180;
    const φ2 = (compareTo.lat * Math.PI) / 180;
    const Δφ = ((compareTo.lat - lat) * Math.PI) / 180;
    const Δλ = ((compareTo.lng - lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, [lat, lng, compareTo]);

  const isInsideRadius = distance !== null && distance <= samePlaceRadius;

  // Converter coordenadas para posição no mapa visual
  const convertCoordToPosition = (latitude: number, longitude: number) => {
    // Normalizar coordenadas para posição no contêiner (0-100%)
    const x = ((longitude + 180) / 360) * 100;
    const y = ((90 - latitude) / 180) * 100;
    return {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y))
    };
  };

  const mainPosition = convertCoordToPosition(lat, lng);
  const comparePosition = compareTo ? convertCoordToPosition(compareTo.lat, compareTo.lng) : null;

  if (!isClient) {
    return (
      <div style={{
        width: '100%',
        height: 320,
        background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Carregando localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        
        .map-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .map-marker:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }
        
        .marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          animation: ripple 2s infinite;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .accuracy-circle {
          position: absolute;
          border: 2px dashed #3b82f6;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.1);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .geofence-circle {
          position: absolute;
          border: 2px dashed #10b981;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        
        .connection-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          transform-origin: left center;
          pointer-events: none;
          opacity: 0.6;
        }
      `}</style>

      {/* Status bar */}
      {compareTo && distance !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            padding: '12px 16px',
            borderRadius: 12,
            background: isInsideRadius 
              ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' 
              : 'linear-gradient(135deg, #fef2f2, #fecaca)',
            border: `2px solid ${isInsideRadius ? '#10b981' : '#ef4444'}`,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {isInsideRadius ? '✅' : '⚠️'}
            </span>
            <span style={{ color: isInsideRadius ? '#065f46' : '#991b1b' }}>
              {isInsideRadius ? 'Dentro da área permitida' : 'Fora da área permitida'}
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            color: isInsideRadius ? '#065f46' : '#991b1b',
            opacity: 0.8,
            fontSize: 12
          }}>
            <span>📏 {Math.round(distance)}m</span>
            <span>🎯 Raio: {samePlaceRadius}m</span>
            {accuracy && <span>📍 ±{Math.round(accuracy)}m</span>}
          </div>
        </div>
      )}

      {/* Mapa visual customizado */}
      <div style={{ position: 'relative' }}>
        <div 
          style={{ 
            width: '100%', 
            height: 320,
            borderRadius: 16,
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #ecfdf5 100%)',
            position: 'relative'
          }} 
        >
          {/* Grid de fundo para simular mapa */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />

          {/* Padrão de "ruas" */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(100, 116, 139, 0.2) 2px, transparent 2px),
              linear-gradient(90deg, rgba(100, 116, 139, 0.2) 2px, transparent 2px)
            `,
            backgroundSize: '120px 120px'
          }} />

          {/* Linha de conexão entre pontos */}
          {comparePosition && (
            <div
              className="connection-line"
              style={{
                left: `${mainPosition.x}%`,
                top: `${mainPosition.y}%`,
                width: Math.sqrt(
                  Math.pow((comparePosition.x - mainPosition.x) * 3.2, 2) + 
                  Math.pow((comparePosition.y - mainPosition.y) * 3.2, 2)
                ),
                transform: `rotate(${Math.atan2(
                  (comparePosition.y - mainPosition.y) * 3.2,
                  (comparePosition.x - mainPosition.x) * 3.2
                ) * 180 / Math.PI}deg)`
              }}
            />
          )}

          {/* Círculo de precisão */}
          {accuracy && accuracy > 0 && (
            <div
              className="accuracy-circle"
              style={{
                left: `${mainPosition.x}%`,
                top: `${mainPosition.y}%`,
                width: Math.min(accuracy / 2, 100),
                height: Math.min(accuracy / 2, 100),
                border: '2px dashed #3b82f6',
                background: 'rgba(59, 130, 246, 0.1)'
              }}
            />
          )}

          {/* Área de geofencing */}
          {comparePosition && (
            <div
              className="geofence-circle"
              style={{
                left: `${comparePosition.x}%`,
                top: `${comparePosition.y}%`,
                width: Math.min(samePlaceRadius / 3, 120),
                height: Math.min(samePlaceRadius / 3, 120)
              }}
            />
          )}

          {/* Marcador principal */}
          <div
            className="map-marker"
            style={{
              left: `${mainPosition.x}%`,
              top: `${mainPosition.y}%`
            }}
            title={`${label} - ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
          >
            <div style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: '3px solid white',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              position: 'relative'
            }}>
              <span style={{
                transform: 'rotate(45deg)',
                fontSize: 16,
                color: 'white',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
              }}>📍</span>
            </div>
            <div className="marker-pulse" style={{
              background: 'rgba(59, 130, 246, 0.3)'
            }} />
          </div>

          {/* Marcador de comparação */}
          {comparePosition && (
            <div
              className="map-marker"
              style={{
                left: `${comparePosition.x}%`,
                top: `${comparePosition.y}%`
              }}
              title={`${compareTo!.label || 'Referência'} - ${compareTo!.lat.toFixed(5)}, ${compareTo!.lng.toFixed(5)}`}
            >
              <div style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: '3px solid white',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                position: 'relative'
              }}>
                <span style={{
                  transform: 'rotate(45deg)',
                  fontSize: 14,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                }}>🏢</span>
              </div>
              <div className="marker-pulse" style={{
                background: 'rgba(239, 68, 68, 0.3)'
              }} />
            </div>
          )}

          {/* Legenda no canto */}
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 8,
            padding: '8px 12px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>
              {label}
            </div>
            <div style={{ color: '#6b7280', lineHeight: 1.3 }}>
              📍 {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
            {accuracy && (
              <div style={{ color: '#059669', fontSize: 10, marginTop: 2 }}>
                🎯 ±{Math.round(accuracy)}m
              </div>
            )}
          </div>

          {/* Informações adicionais */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 8,
            padding: '8px 12px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ color: '#6b7280' }}>
              🗺️ Mapa Simplificado
            </div>
            <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>
              Visualização aproximada
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
