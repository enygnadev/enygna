
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// React Leaflet (SSR off)
const MapContainer: any = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(m => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(m => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(m => m.Popup),
  { ssr: false }
);

type Props = {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
};

export default function SimpleLocationMap({ 
  lat, 
  lng, 
  label = "Localização", 
  height = 200 
}: Props) {
  const [mapInstance, setMapInstance] = React.useState<any>(null);
  const mapKey = React.useMemo(() => `simple-map-${Date.now()}-${Math.random()}`, []);

  // Cleanup effect
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

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return (
      <div 
        style={{ 
          height, 
          width: '100%', 
          background: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 8,
          border: '1px solid #ddd'
        }}
      >
        <p style={{ color: '#666', margin: 0 }}>Coordenadas inválidas</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <MapContainer
        key={mapKey}
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ 
          height: '100%', 
          width: '100%', 
          borderRadius: 8,
          border: '1px solid #ddd'
        }}
        whenCreated={(map) => {
          setMapInstance(map);
          // Garantir que o mapa seja redimensionado corretamente
          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 100);
        }}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <Marker position={[lat, lng]}>
          <Popup>
            {label}
            <br />
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
