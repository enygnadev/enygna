
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
  const [mapInstance, setMapInstance] = React.useState<any>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [shouldRenderMap, setShouldRenderMap] = React.useState(false);
  const mapKey = React.useMemo(() => `map-${Date.now()}-${Math.random()}`, []);

  React.useEffect(() => {
    setIsClient(true);
    // Pequeno delay para garantir que o DOM está pronto
    setTimeout(() => setShouldRenderMap(true), 100);
  }, []);

  // Limpar instância do mapa ao desmontar
  React.useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (error) {
          console.warn('Erro ao limpar mapa:', error);
        }
      }
    };
  }, [mapInstance]);

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

  // Carregar e inicializar o mapa Leaflet
  React.useEffect(() => {
    if (!isClient || !shouldRenderMap || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // Importar Leaflet dinamicamente
        const L = (await import('leaflet')).default;

        // Configurar ícones
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        if (!isMounted || !mapContainerRef.current) return;

        // Criar o mapa
        const map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          touchZoom: true,
          attributionControl: true
        });

        // Adicionar tiles do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: 'map-tiles'
        }).addTo(map);

        // Ícone customizado para localização principal
        const mainIcon = L.divIcon({
          className: 'custom-marker-main',
          html: `
            <div style="
              width: 30px;
              height: 30px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
              position: relative;
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 16px;
                color: white;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                font-weight: bold;
              ">📍</span>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -30]
        });

        // Adicionar marcador principal
        L.marker([lat, lng], { icon: mainIcon }).addTo(map)
          .bindPopup(`
            <div style="
              padding: 8px;
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
            ">
              <strong style="color: #1f2937; font-size: 14px;">${label}</strong><br>
              <span style="color: #6b7280; font-size: 12px;">
                📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
              </span>
              ${accuracy ? `<br><span style="color: #059669; font-size: 11px;">🎯 Precisão: ±${Math.round(accuracy)}m</span>` : ''}
            </div>
          `);

        // Círculo de precisão
        if (accuracy && accuracy > 0) {
          L.circle([lat, lng], {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            radius: accuracy,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(map);
        }

        // Ponto de comparação se existir
        if (compareTo) {
          const compareIcon = L.divIcon({
            className: 'custom-marker-compare',
            html: `
              <div style="
                width: 26px;
                height: 26px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
                position: relative;
              ">
                <span style="
                  transform: rotate(45deg);
                  font-size: 14px;
                  color: white;
                  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
                  font-weight: bold;
                ">🏢</span>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 26],
            popupAnchor: [0, -26]
          });

          L.marker([compareTo.lat, compareTo.lng], { icon: compareIcon }).addTo(map)
            .bindPopup(`
              <div style="
                padding: 8px;
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
              ">
                <strong style="color: #1f2937; font-size: 14px;">${compareTo.label || 'Referência'}</strong><br>
                <span style="color: #6b7280; font-size: 12px;">
                  📍 ${compareTo.lat.toFixed(5)}, ${compareTo.lng.toFixed(5)}
                </span>
              </div>
            `);

          // Área de geofencing
          L.circle([compareTo.lat, compareTo.lng], {
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.1,
            radius: samePlaceRadius,
            weight: 2,
            dashArray: '8, 4'
          }).addTo(map);

          // Linha conectando os pontos
          L.polyline([[lat, lng], [compareTo.lat, compareTo.lng]], {
            color: '#6366f1',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5'
          }).addTo(map);

          // Ajustar visualização para mostrar ambos os pontos
          const group = L.featureGroup([
            L.marker([lat, lng]),
            L.marker([compareTo.lat, compareTo.lng])
          ]);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        // Definir instância do mapa
        setMapInstance(map);

        // Invalidar tamanho após um pequeno delay
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('Erro ao carregar mapa:', error);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [isClient, shouldRenderMap, lat, lng, compareTo, label, accuracy, samePlaceRadius]);

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
        
        .custom-marker-main {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
        
        .custom-marker-compare {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
        
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .map-tiles {
          filter: saturate(1.1) contrast(1.05);
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
        {!shouldRenderMap && (
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
            zIndex: 1000
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
              <p style={{ margin: 0, fontSize: 12 }}>Carregando mapa...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
