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

// -------- Tipos --------
type LatLng = { lat: number; lng: number; acc?: number; label?: string };

type Props = {
  /** Posição inicial (fallback/âncora) */
  lat: number;
  lng: number;
  label?: string;

  /** Precisão (±m) da posição inicial, opcional */
  accuracy?: number;

  /** Ponto de comparação (ex.: local do “início do ponto”) */
  compareTo?: { lat: number; lng: number; label?: string };

  /** Raio (m) para considerar “mesmo local” */
  samePlaceRadius?: number;

  /** Atualização automática (ms). Padrão: 5 min */
  autoRefreshMs?: number;

  /** Caminho do doc no Firestore para ouvir atualizações em tempo real, ex.: "users/<uid>/sessions/<sid>" */
  docPath?: string;

  /** Priorizar geolocalização do usuário (GPS/Wi-Fi) */
  preferClientLocation?: boolean;

  /** Usar GPS do dispositivo (watchPosition) com alta precisão */
  useGeoWatch?: boolean;

  /** Recentrar o mapa ao receber atualização */
  autoRecenter?: boolean;
};

// -------- Util: distância haversine em metros --------
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000; // m
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

/**
 * Helper p/ círculos em metros com Leaflet puro (evita conflito de tipos do <Circle />).
 */
function LeafletCircleMeters({
  map,
  center,
  radius,
  options,
}: {
  map: any;
  center: [number, number];
  radius: number;
  options?: any;
}) {
  const key = JSON.stringify({ center, radius, options });
  React.useEffect(() => {
    if (!map) return;
    let layer: any;
    let active = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!active) return;
      layer = L.circle(center, { radius, ...(options || {}) }).addTo(map);
    })();
    return () => {
      active = false;
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function LocationMap({
  lat,
  lng,
  label,
  accuracy,
  compareTo,
  samePlaceRadius = 120,         // ~1 quadra
  autoRefreshMs = 300000,        // 5 min
  docPath,
  preferClientLocation = true,
  useGeoWatch = true,            // ativa GPS por padrão
  autoRecenter = true,
}: Props) {
  const [leafletMap, setLeafletMap] = React.useState<any>(null);
  const [mapKey, setMapKey] = React.useState<string>(() => `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);

  // Âncora: se não vier compareTo, fixamos a primeira coordenada recebida via props
  const firstLatRef = React.useRef<number>(lat);
  const firstLngRef = React.useRef<number>(lng);
  const anchor = compareTo ?? {
    lat: firstLatRef.current,
    lng: firstLngRef.current,
    label: label || 'Âncora',
  };

  // Estado da posição "atual" mostrada no mapa
  const [pos, setPos] = React.useState<LatLng>({ lat, lng, acc: accuracy, label });
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [source, setSource] = React.useState<'gps' | 'firestore' | 'props' | 'poll'>('props');

  // Força nova instância do mapa se as coordenadas mudarem drasticamente
  React.useEffect(() => {
    const currentLat = pos.lat;
    const currentLng = pos.lng;
    const initialLat = firstLatRef.current;
    const initialLng = firstLngRef.current;

    // Se a mudança de posição for muito grande (mais de 1km), reinicia o mapa
    const distance = distanceMeters(
      { lat: currentLat, lng: currentLng },
      { lat: initialLat, lng: initialLng }
    );

    if (distance > 1000) {
      const newKey = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setMapKey(newKey);
      setLeafletMap(null);
      firstLatRef.current = currentLat;
      firstLngRef.current = currentLng;
    }
  }, [pos.lat, pos.lng]);
  const [perm, setPerm] = React.useState<'granted' | 'prompt' | 'denied' | 'unknown'>('unknown');

  // --- Permissão de geolocalização (Permissions API) ---
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
          const st = await (navigator as any).permissions.query({ name: 'geolocation' as PermissionName });
          if (!mounted) return;
          setPerm(st.state as any);
          st.onchange = () => setPerm(st.state as any);
        } else {
          setPerm('unknown');
        }
      } catch {
        setPerm('unknown');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Recentrar ao atualizar ---
  React.useEffect(() => {
    if (!leafletMap || !autoRecenter) return;
    try {
      leafletMap.setView([pos.lat, pos.lng]);
    } catch {}
  }, [pos.lat, pos.lng, autoRecenter, leafletMap]);

  // --- Geolocalização do dispositivo (alta precisão) ---
  React.useEffect(() => {
    if (!preferClientLocation || !useGeoWatch) return;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    // seed inicial (gatilha prompt)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy,
          label: 'GPS inicial',
        });
        setLastUpdated(new Date());
        setSource('gps');
      },
      () => {
        // silencioso; watch abaixo pode assumir
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    // watchPosition para tempo quase-real
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy,
          label: 'GPS (watch)',
        });
        setLastUpdated(new Date());
        setSource('gps');
      },
      () => {
        // silencioso; polling/Firestore continuam válidos
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [preferClientLocation, useGeoWatch]);

  // --- Firestore em tempo real (opcional) ---
  React.useEffect(() => {
    if (!docPath) return;
    let unsub: undefined | (() => void);
    (async () => {
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, onSnapshot, getDoc } = await import('firebase/firestore');

        const ref = doc(db, docPath);

        // snapshot em tempo real
        unsub = onSnapshot(ref, (snap) => {
          const d: any = snap.data() || {};
          const live = d?.liveLocation || d?.locationEnd || d?.locationStart;
          if (live?.lat && live?.lng) {
            // Se preferimos o GPS do cliente, não sobrescreva um fix "gps" recente (últimos 20s)
            const tooSoon =
              preferClientLocation && source === 'gps' && Date.now() - lastUpdated.getTime() < 20000;
            if (tooSoon) return;

            setPos({
              lat: Number(live.lat),
              lng: Number(live.lng),
              acc: Number(live.acc) || undefined,
              label: 'Firestore',
            });
            setLastUpdated(new Date());
            setSource('firestore');
          }
        });

        // fetch inicial para garantir dado imediato
        const fd = await getDoc(ref);
        const d: any = fd.data() || {};
        const live = d?.liveLocation || d?.locationEnd || d?.locationStart;
        if (live?.lat && live?.lng) {
          const tooSoon =
            preferClientLocation && source === 'gps' && Date.now() - lastUpdated.getTime() < 20000;
          if (!tooSoon) {
            setPos({
              lat: Number(live.lat),
              lng: Number(live.lng),
              acc: Number(live.acc) || undefined,
              label: 'Firestore',
            });
            setLastUpdated(new Date());
            setSource('firestore');
          }
        }
      } catch {
        // ignora; GPS/polling cobrem
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [docPath, preferClientLocation, source, lastUpdated]);

  // --- Polling (backup) a cada X ms ---
  React.useEffect(() => {
    if (!autoRefreshMs) return;
    const timer = setInterval(async () => {
      // 1) tenta Firestore
      if (docPath) {
        try {
          const { db } = await import('@/lib/firebase');
          const { doc, getDoc } = await import('firebase/firestore');
          const d = await getDoc(doc(db, docPath));
          const data: any = d.data() || {};
          const live = data?.liveLocation || data?.locationEnd || data?.locationStart;
          if (live?.lat && live?.lng) {
            const tooSoon =
              preferClientLocation && source === 'gps' && Date.now() - lastUpdated.getTime() < 20000;
            if (!tooSoon) {
              setPos({
                lat: Number(live.lat),
                lng: Number(live.lng),
                acc: Number(live.acc) || undefined,
                label: 'Firestore (poll)',
              });
              setLastUpdated(new Date());
              setSource('poll');
            }
            return;
          }
        } catch {
          // segue para GPS
        }
      }

      // 2) fallback: GPS único
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (p) => {
            setPos({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              acc: p.coords.accuracy,
              label: 'GPS (poll)',
            });
            setLastUpdated(new Date());
            setSource('poll');
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
        );
      }
    }, autoRefreshMs);
    return () => clearInterval(timer);
  }, [autoRefreshMs, docPath, preferClientLocation, source, lastUpdated]);

  // Distância até a âncora
  const dist = React.useMemo(
    () => distanceMeters({ lat: pos.lat, lng: pos.lng }, { lat: anchor.lat, lng: anchor.lng }),
    [pos.lat, pos.lng, anchor.lat, anchor.lng]
  );
  const inside = dist <= samePlaceRadius;

  // Ações manuais
  const doRefreshNow = React.useCallback(async () => {
    // 1) tenta Firestore
    if (docPath) {
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const d = await getDoc(doc(db, docPath));
        const data: any = d.data() || {};
        const live = data?.liveLocation || data?.locationEnd || data?.locationStart;
        if (live?.lat && live?.lng) {
          const tooSoon =
            preferClientLocation && source === 'gps' && Date.now() - lastUpdated.getTime() < 20000;
          if (!tooSoon) {
            setPos({
              lat: Number(live.lat),
              lng: Number(live.lng),
              acc: Number(live.acc) || undefined,
              label: 'Firestore (manual)',
            });
            setLastUpdated(new Date());
            setSource('poll');
            return;
          }
        }
      } catch {}
    }
    // 2) GPS único
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setPos({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            acc: p.coords.accuracy,
            label: 'GPS (manual)',
          });
          setLastUpdated(new Date());
          setSource('poll');
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
      );
    }
  }, [docPath, preferClientLocation, source, lastUpdated]);

  const recenter = React.useCallback(() => {
    if (!leafletMap) return;
    try {
      leafletMap.setView([pos.lat, pos.lng]);
    } catch {}
  }, [leafletMap, pos.lat, pos.lng]);

  const forceMapRecreation = React.useCallback(() => {
    const newKey = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMapKey(newKey);
    setLeafletMap(null);
  }, []);

  // UI de ajuda para permissão negada/pendente
  const showPermHint = perm === 'denied' || perm === 'prompt' || perm === 'unknown';

  return (
    <div style={{ width: '100%' }}>
      {/* Barra de status */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            borderRadius: 999,
            padding: '4px 10px',
            border: `1px solid ${inside ? 'rgba(16,185,129,.35)' : 'rgba(239,68,68,.35)'}`,
            background: inside ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
            fontSize: 12,
          }}
        >
          {inside ? 'Dentro da área' : 'Fora da área'} • dist: {Math.round(dist)}m • raio: {samePlaceRadius}m
        </span>

        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {source === 'gps' ? 'GPS/Wi-Fi' : source === 'firestore' ? 'Firestore' : 'Atualização'} • {lastUpdated.toLocaleTimeString()}
        </span>

        {typeof pos.acc === 'number' && (
          <span style={{ fontSize: 12, opacity: 0.8 }}>precisão: ±{Math.round(pos.acc)}m</span>
        )}

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={doRefreshNow}
            style={{
              borderRadius: 8,
              padding: '6px 10px',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.06)',
              cursor: 'pointer',
              fontSize: 12,
            }}
            title="Buscar agora (Firestore/GPS)"
          >
            Atualizar agora
          </button>

          <button
            onClick={recenter}
            style={{
              borderRadius: 8,
              padding: '6px 10px',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(255,255,255,.06)',
              cursor: 'pointer',
              fontSize: 12,
            }}
            title="Centralizar no colaborador"
          >
            Centralizar
          </button>
        </div>
      </div>

      {showPermHint && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 12,
            opacity: 0.85,
            background: 'rgba(59,130,246,.12)',
            border: '1px solid rgba(59,130,246,.35)',
            padding: '8px 10px',
            borderRadius: 8,
          }}
        >
          Para precisão máxima, permita a localização do dispositivo (HTTPS necessário). No desktop, o navegador usa Wi-Fi/celular quando disponível.
        </div>
      )}

      <div ref={mapContainerRef} key={mapKey}>
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={16}
          scrollWheelZoom
          style={{ height: 300, width: '100%', borderRadius: 12, overflow: 'hidden' }}
          whenCreated={(map) => {
            setLeafletMap(map);
            // Garante que o mapa seja invalidated após criação
            setTimeout(() => {
              if (map) {
                map.invalidateSize();
              }
            }, 100);
          }}
        >
        {/* OSM tiles — string literal (sem erro TS2304) */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Geofence (âncora) */}
        <LeafletCircleMeters
          map={leafletMap}
          center={[anchor.lat, anchor.lng]}
          radius={samePlaceRadius}
          options={{ color: inside ? '#16a34a' : '#ef4444', opacity: 0.8 }}
        />
        <Marker position={[anchor.lat, anchor.lng]}>
          <Popup>
            {anchor.label || 'Âncora'}
            <br />
            {anchor.lat.toFixed(5)}, {anchor.lng.toFixed(5)}
          </Popup>
        </Marker>

        {/* Posição atual + precisão */}
        <Marker position={[pos.lat, pos.lng]}>
          <Popup>
            {pos.label || 'Atual'}
            <br />
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            {typeof pos.acc === 'number' ? (
              <>
                <br />±{Math.round(pos.acc)}m
              </>
            ) : null}
          </Popup>
        </Marker>

        {typeof pos.acc === 'number' && pos.acc > 0 && (
          <LeafletCircleMeters
            map={leafletMap}
            center={[pos.lat, pos.lng]}
            radius={pos.acc}
            options={{ color: '#3b82f6', opacity: 0.4 }}
          />
        )}
        </MapContainer>
      </div>
    </div>
  );
}

// Cleanup effect para prevenir vazamentos de memória
React.useEffect(() => {
  return () => {
    if (leafletMap) {
      try {
        leafletMap.remove();
      } catch (error) {
        // Ignora erros de cleanup
        console.warn('Erro ao limpar mapa:', error);
      }
    }
  };
}, [leafletMap]);