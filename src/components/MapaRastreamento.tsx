
'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Veiculo {
  id: string;
  placa: string;
  latitude: number;
  longitude: number;
  status: 'ativo' | 'parado' | 'manutencao';
  velocidade: number;
  condutor: string;
  ultimaAtualizacao: string;
}

interface MapaRastreamentoProps {
  veiculos?: Veiculo[];
  onVeiculoSelect?: (veiculo: Veiculo) => void;
  lat?: number;
  lng?: number;
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void;
}

export default function MapaRastreamento({ 
  veiculos = [], 
  onVeiculoSelect, 
  lat, 
  lng, 
  onLocationUpdate 
}: MapaRastreamentoProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Veiculo | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [MapComponent, setMapComponent] = useState<JSX.Element | null>(null);
  const [coords, setCoords] = useState({ lat: lat || -23.5505, lng: lng || -46.6333 });

  // Geolocation tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoords(newCoords);
        onLocationUpdate?.(newCoords);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [onLocationUpdate]);

  // Map loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadMap = async () => {
      try {
        const L = await import('leaflet');
        const {
          MapContainer,
          TileLayer,
          Marker,
          Popup,
        } = await import('react-leaflet');

        // Fix para ícones do Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        setMapComponent(
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={16}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={[coords.lat, coords.lng]}>
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong>🚗 Localização Atual</strong><br />
                  <small>
                    Lat: {coords.lat.toFixed(5)}<br />
                    Lng: {coords.lng.toFixed(5)}<br />
                    Atualizado: {new Date().toLocaleTimeString()}
                  </small>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        );
        
        setMapLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar mapa:', error);
        setMapComponent(
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
              <p>Erro ao carregar mapa</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
              </p>
            </div>
          </div>
        );
        setMapLoaded(true);
      }
    };

    loadMap();
  }, [coords.lat, coords.lng]);

  const handleVehicleClick = (veiculo: Veiculo) => {
    setSelectedVehicle(veiculo);
    onVeiculoSelect?.(veiculo);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ativo': return '#00ff00';
      case 'parado': return '#ffa500';
      case 'manutencao': return '#ff0000';
      default: return '#808080';
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      <style jsx>{`
        .mapa-container {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          position: relative;
          overflow: hidden;
        }

        .mapa-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: white;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .mapa-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .veiculo-marker {
          position: absolute;
          width: 30px;
          height: 30px;
          background: var(--color);
          border-radius: 50%;
          border: 2px solid white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          transform: translate(-50%, -50%);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .veiculo-marker:hover {
          transform: translate(-50%, -50%) scale(1.2);
          z-index: 10;
        }

        .veiculo-marker.selected {
          transform: translate(-50%, -50%) scale(1.3);
          box-shadow: 0 0 20px var(--color);
          z-index: 20;
        }

        .veiculo-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 1rem;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }

        .veiculo-info.show {
          transform: translateY(0);
        }

        .controles {
          position: absolute;
          top: 1rem;
          right: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .controle-btn {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 0.5rem;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .controle-btn:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .legenda {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 1rem;
          border-radius: var(--radius);
          font-size: 12px;
        }

        .legenda-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .legenda-cor {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid white;
        }
      `}</style>

      <div className="mapa-container">
        {!mapLoaded ? (
          <div className="mapa-loading">
            <div className="spinner"></div>
            <span>Carregando Mapa GPS...</span>
          </div>
        ) : (
          <>
            {MapComponent}
            
            {/* Legenda */}
            {veiculos.length > 0 && (
              <div className="legenda">
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '14px' }}>Status dos Veículos</h4>
                <div className="legenda-item">
                  <div className="legenda-cor" style={{ backgroundColor: '#00ff00' }}></div>
                  <span>Ativo</span>
                </div>
                <div className="legenda-item">
                  <div className="legenda-cor" style={{ backgroundColor: '#ffa500' }}></div>
                  <span>Parado</span>
                </div>
                <div className="legenda-item">
                  <div className="legenda-cor" style={{ backgroundColor: '#ff0000' }}></div>
                  <span>Manutenção</span>
                </div>
              </div>
            )}

            {/* Controles */}
            <div className="controles">
              <button className="controle-btn" onClick={() => setSelectedVehicle(null)}>
                🔍 Ver Todos
              </button>
              <button className="controle-btn">
                📍 Centralizar
              </button>
              <button className="controle-btn">
                🔄 Atualizar
              </button>
            </div>

            {/* Markers dos veículos */}
            {veiculos.map((veiculo) => {
              // Simular posições no mapa (converter lat/lng para pixels)
              const x = ((veiculo.longitude + 180) / 360) * 100;
              const y = ((90 - veiculo.latitude) / 180) * 100;
              
              return (
                <div
                  key={veiculo.id}
                  className={`veiculo-marker ${selectedVehicle?.id === veiculo.id ? 'selected' : ''}`}
                  style={{
                    '--color': getStatusColor(veiculo.status),
                    left: `${Math.min(Math.max(x, 5), 95)}%`,
                    top: `${Math.min(Math.max(y, 5), 95)}%`
                  } as React.CSSProperties}
                  onClick={() => handleVehicleClick(veiculo)}
                  title={`${veiculo.placa} - ${veiculo.condutor}`}
                >
                  🚗
                </div>
              );
            })}

            {/* Info do veículo selecionado */}
            {selectedVehicle && (
              <div className={`veiculo-info show`}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedVehicle.placa}</h3>
                    <button 
                      onClick={() => setSelectedVehicle(null)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px' }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
                    <div>
                      <strong>Condutor:</strong> {selectedVehicle.condutor}
                    </div>
                    <div>
                      <strong>Status:</strong> 
                      <span style={{ 
                        color: getStatusColor(selectedVehicle.status),
                        marginLeft: '0.5rem',
                        fontWeight: 'bold'
                      }}>
                        {selectedVehicle.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <strong>Velocidade:</strong> {selectedVehicle.velocidade} km/h
                    </div>
                    <div>
                      <strong>Última Atualização:</strong> {selectedVehicle.ultimaAtualizacao}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
