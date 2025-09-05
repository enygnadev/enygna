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
  const [mapInstance, setMapInstance] = React.useState<any>(null);
  const [isClient, setIsClient] = React.useState(false);

  // Garantir que está no cliente
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Inicializar mapa apenas uma vez
  React.useEffect(() => {
    if (!isClient || !mapContainerRef.current || mapInstance) return;

    let map: any;

    const initMap = async () => {
      try {
        // Importar Leaflet dinamicamente
        const L = (await import('leaflet')).default;

        // Configurar ícones do Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Criar mapa
        map = L.map(mapContainerRef.current).setView([lat, lng], 16);

        // Adicionar tile layer do OpenStreetMap (gratuito)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Marcador da posição atual
        L.marker([lat, lng]).addTo(map)
          .bindPopup(`${label}<br/>${lat.toFixed(5)}, ${lng.toFixed(5)}${accuracy ? `<br/>±${Math.round(accuracy)}m` : ''}`)
          .openPopup();

        // Se tiver ponto de comparação, adicionar
        if (compareTo) {
          L.marker([compareTo.lat, compareTo.lng]).addTo(map)
            .bindPopup(`${compareTo.label || 'Referência'}<br/>${compareTo.lat.toFixed(5)}, ${compareTo.lng.toFixed(5)}`);

          // Círculo do raio de geofencing
          L.circle([compareTo.lat, compareTo.lng], {
            radius: samePlaceRadius,
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2
          }).addTo(map);
        }

        // Círculo de precisão se disponível
        if (accuracy && accuracy > 0) {
          L.circle([lat, lng], {
            radius: accuracy,
            color: '#ff7800',
            fillColor: '#ff7800',
            fillOpacity: 0.1
          }).addTo(map);
        }

        setMapInstance(map);
      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map) {
        try {
          map.remove();
        } catch (error) {
          console.warn('Erro ao limpar mapa:', error);
        }
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
      <div style={{ width: '100%', height: 300, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Status bar */}
      {compareTo && distance !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 8,
            padding: '8px 12px',
            borderRadius: 8,
            backgroundColor: isInsideRadius ? '#f0f9ff' : '#fef2f2',
            border: `1px solid ${isInsideRadius ? '#3b82f6' : '#ef4444'}`,
            fontSize: 12,
          }}
        >
          <span style={{ color: isInsideRadius ? '#1e40af' : '#dc2626' }}>
            {isInsideRadius ? '✓ Dentro da área' : '⚠ Fora da área'} • 
            Distância: {Math.round(distance)}m • 
            Raio: {samePlaceRadius}m
          </span>
          {accuracy && (
            <span style={{ marginLeft: 10, opacity: 0.7 }}>
              Precisão: ±{Math.round(accuracy)}m
            </span>
          )}
        </div>
      )}

      {/* Mapa */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: 300, 
          borderRadius: 12, 
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }} 
      />
    </div>
  );
}