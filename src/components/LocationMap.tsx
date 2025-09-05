
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
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClient, setIsClient] = React.useState(false);

  // Garantir que está no cliente
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Cleanup e inicialização do mapa
  React.useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // Limpar qualquer instância anterior
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.warn('Erro ao limpar mapa anterior:', e);
          }
          mapInstanceRef.current = null;
        }

        // Limpar container
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
          mapContainerRef.current._leaflet_id = null;
        }

        // Aguardar um pouco para garantir limpeza
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) return;

        // Importar Leaflet dinamicamente
        const L = (await import('leaflet')).default;

        // Configurar ícones com fallback
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        
        // Criar ícones customizados com CSS em vez de imagens externas
        const createCustomIcon = (color: string, emoji: string) => {
          return L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="
                width: 30px;
                height: 30px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                position: relative;
              ">
                <span style="
                  transform: rotate(45deg);
                  font-size: 16px;
                  color: white;
                  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                ">${emoji}</span>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          });
        };

        if (!isMounted || !mapContainerRef.current) return;

        // Criar nova instância do mapa
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          touchZoom: true
        }).setView([lat, lng], 16);

        // Tile layer moderno
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          className: 'map-tiles'
        }).addTo(map);

        // Marcador principal
        const mainIcon = createCustomIcon('linear-gradient(135deg, #3b82f6, #1d4ed8)', '📍');
        
        L.marker([lat, lng], { icon: mainIcon }).addTo(map)
          .bindPopup(`
            <div style="
              padding: 8px;
              font-family: system-ui, -apple-system, sans-serif;
              min-width: 200px;
            ">
              <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                ${label}
              </h4>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
              </p>
              ${accuracy ? `
                <p style="margin: 4px 0 0 0; color: #059669; font-size: 11px;">
                  🎯 Precisão: ±${Math.round(accuracy)}m
                </p>
              ` : ''}
            </div>
          `)
          .openPopup();

        // Círculo de precisão estilizado
        if (accuracy && accuracy > 0) {
          L.circle([lat, lng], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(map);
        }

        // Ponto de comparação se existir
        if (compareTo) {
          const compareIcon = createCustomIcon('linear-gradient(135deg, #ef4444, #dc2626)', '🏢');
          
          L.marker([compareTo.lat, compareTo.lng], { icon: compareIcon }).addTo(map)
            .bindPopup(`
              <div style="
                padding: 8px;
                font-family: system-ui, -apple-system, sans-serif;
                min-width: 180px;
              ">
                <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
                  ${compareTo.label || 'Referência'}
                </h4>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  📍 ${compareTo.lat.toFixed(5)}, ${compareTo.lng.toFixed(5)}
                </p>
              </div>
            `);

          // Área de geofencing estilizada
          L.circle([compareTo.lat, compareTo.lng], {
            radius: samePlaceRadius,
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '10, 5'
          }).addTo(map);

          // Linha conectora pontilhada
          L.polyline([[lat, lng], [compareTo.lat, compareTo.lng]], {
            color: '#6b7280',
            weight: 2,
            opacity: 0.7,
            dashArray: '8, 8'
          }).addTo(map);
        }

        mapInstanceRef.current = map;
        setIsLoading(false);

        // Ajustar visualização se tiver ponto de comparação
        if (compareTo) {
          const bounds = L.latLngBounds([[lat, lng], [compareTo.lat, compareTo.lng]]);
          map.fitBounds(bounds, { padding: [20, 20] });
        }

      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Erro no cleanup:', error);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, lat, lng, label, accuracy, compareTo, samePlaceRadius]);

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
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Carregando mapa...</p>
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
        
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }
        
        .map-tiles {
          filter: saturate(1.1) contrast(1.05);
        }
        
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
        
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Status bar estilizado */}
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
            <span style={{ 
              fontSize: 16,
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
            }}>
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

      {/* Container do mapa */}
      <div style={{ position: 'relative' }}>
        <div 
          ref={mapContainerRef}
          style={{ 
            width: '100%', 
            height: 320,
            borderRadius: 16,
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            background: '#f8fafc'
          }} 
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(248, 250, 252, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 16,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 8px'
              }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>Carregando...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
