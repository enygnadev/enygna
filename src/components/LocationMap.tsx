
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
    const x = ((longitude + 180) / 360) * 100;
    const y = ((90 - latitude) / 180) * 100;
    return {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y))
    };
  };

  const mainPosition = convertCoordToPosition(lat, lng);
  const comparePosition = compareTo ? convertCoordToPosition(compareTo.lat, compareTo.lng) : null;

  // Gerar elementos urbanos baseados nas coordenadas
  const generateUrbanElements = () => {
    const elements = [];
    const seed = Math.abs(lat * lng * 1000) % 1000;
    
    // Gerar ruas principais
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) + (seed % 30);
      const length = 60 + (seed % 40);
      elements.push(
        <div
          key={`street-${i}`}
          className="street"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${length}%`,
            height: '3px',
            background: 'linear-gradient(90deg, #9ca3af, #d1d5db)',
            transformOrigin: '0 50%',
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            opacity: 0.8,
            zIndex: 1
          }}
        />
      );
    }

    // Gerar quarteirões
    for (let i = 0; i < 12; i++) {
      const x = 15 + ((seed + i * 37) % 70);
      const y = 15 + ((seed + i * 23) % 70);
      const size = 8 + ((seed + i * 17) % 12);
      elements.push(
        <div
          key={`block-${i}`}
          className="city-block"
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: `${size}%`,
            height: `${size * 0.8}%`,
            background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
            border: '1px solid #d1d5db',
            borderRadius: '2px',
            zIndex: 2
          }}
        />
      );
    }

    // Gerar áreas verdes (parques)
    for (let i = 0; i < 3; i++) {
      const x = 20 + ((seed + i * 67) % 60);
      const y = 20 + ((seed + i * 43) % 60);
      const size = 12 + ((seed + i * 29) % 8);
      elements.push(
        <div
          key={`park-${i}`}
          className="park"
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: `${size}%`,
            height: `${size * 0.7}%`,
            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
            border: '1px solid #86efac',
            borderRadius: '50%',
            zIndex: 2
          }}
        />
      );
    }

    // Gerar prédios importantes
    for (let i = 0; i < 5; i++) {
      const x = 25 + ((seed + i * 53) % 50);
      const y = 25 + ((seed + i * 41) % 50);
      elements.push(
        <div
          key={`building-${i}`}
          className="important-building"
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: '6px',
            height: '6px',
            background: '#4f46e5',
            borderRadius: '2px',
            border: '1px solid #6366f1',
            zIndex: 3
          }}
        />
      );
    }

    return elements;
  };

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
          z-index: 20;
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
          z-index: 15;
        }
        
        .geofence-circle {
          position: absolute;
          border: 2px dashed #10b981;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.1);
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 15;
        }
        
        .connection-line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #10b981);
          transform-origin: left center;
          pointer-events: none;
          opacity: 0.6;
          z-index: 10;
        }

        .street {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .city-block {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .park {
          box-shadow: inset 0 1px 2px rgba(34, 197, 94, 0.2);
        }

        .important-building {
          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
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

      {/* Mapa visual realista */}
      <div style={{ position: 'relative' }}>
        <div 
          style={{ 
            width: '100%', 
            height: 320,
            borderRadius: 16,
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            position: 'relative'
          }} 
        >
          {/* Base do mapa com textura */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
              linear-gradient(45deg, transparent 25%, rgba(156, 163, 175, 0.03) 25%, rgba(156, 163, 175, 0.03) 50%, transparent 50%, transparent 75%, rgba(156, 163, 175, 0.03) 75%)
            `,
            backgroundSize: '100px 100px'
          }} />

          {/* Grid de ruas menores */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px',
            zIndex: 1
          }} />

          {/* Avenidas principais */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(75, 85, 99, 0.6) 3px, transparent 3px),
              linear-gradient(90deg, rgba(75, 85, 99, 0.6) 3px, transparent 3px)
            `,
            backgroundSize: '80px 80px',
            zIndex: 2
          }} />

          {/* Elementos urbanos gerados */}
          {generateUrbanElements()}

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
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)',
              position: 'relative'
            }}>
              <span style={{
                transform: 'rotate(45deg)',
                fontSize: 16,
                color: 'white',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                fontWeight: 'bold'
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
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
                position: 'relative'
              }}>
                <span style={{
                  transform: 'rotate(45deg)',
                  fontSize: 14,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                  fontWeight: 'bold'
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
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 8,
            padding: '8px 12px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 25
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

          {/* Informações do mapa */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 8,
            padding: '8px 12px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 11,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 25
          }}>
            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              🗺️ Mapa da Cidade
            </div>
            <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>
              Ruas, quarteirões e pontos de interesse
            </div>
          </div>

          {/* Legenda dos elementos */}
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 8,
            padding: '6px 8px',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: 9,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 25,
            maxWidth: 120
          }}>
            <div style={{ color: '#9ca3af', marginBottom: 2 }}>━ Ruas</div>
            <div style={{ color: '#d1d5db', marginBottom: 2 }}>▢ Quarteirões</div>
            <div style={{ color: '#22c55e', marginBottom: 2 }}>● Áreas Verdes</div>
            <div style={{ color: '#4f46e5' }}>▪ Edifícios</div>
          </div>
        </div>
      </div>
    </div>
  );
}
