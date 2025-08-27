
'use client';

import { useMemo, useState, useRef } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { applyRules, earningsFromSeconds } from '@/lib/calc';

type Rules = {
  toleranceMinutes?: number;
  lunchBreakMinutes?: number;
  lunchThresholdMinutes?: number;
};

type Props = {
  uid: string;
  effectiveHourlyRate: number;
  rules: Rules;
  /** Precisão mínima do GPS em metros (opcional). Ex.: 100 */
  minGpsAccuracy?: number;
  /** Coordenadas da empresa para geofencing */
  companyLocation?: { lat: number; lng: number; radius: number };
};

type SessionDoc = {
  start: Timestamp | string | Date;
  end: Timestamp | string | Date | null;
  durationSec: number | null;
  earnings: number | null;
  status?: 'pending' | 'approved' | 'rejected';
  locationStart?: any;
  locationEnd?: any;
  selfieStart?: string; // Base64 da selfie
  selfieEnd?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export default function PunchButton({
  uid,
  effectiveHourlyRate,
  rules,
  minGpsAccuracy = 150,
  companyLocation,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const deviceInfo = useMemo(
    () => ({
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      platform:
        typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform : 'unknown',
    }),
    []
  );

  function getLocation(): Promise<{ lat: number; lng: number; acc?: number }> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return reject(new Error('Geolocalização não suportada pelo navegador.'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          // Verificar geofencing se configurado
          if (companyLocation) {
            const distance = calculateDistance(userLat, userLng, companyLocation.lat, companyLocation.lng);
            if (distance > companyLocation.radius) {
              return reject(new Error(`Você está fora da área permitida para bater ponto (${Math.round(distance)}m da empresa). Aproxime-se do local de trabalho.`));
            }
          }

          if (acc && acc > minGpsAccuracy) {
            // Não bloqueia, mas alerta
          }
          resolve({ lat: userLat, lng: userLng, acc });
        },
        (err) => {
          let reason = 'Permita o acesso ao GPS para registrar o ponto.';
          if (err.code === 1) reason = 'Permissão de localização negada. Libere o GPS e tente novamente.';
          if (err.code === 2) reason = 'Sinal de GPS indisponível. Verifique sua conexão e tente novamente.';
          if (err.code === 3) reason = 'Tempo de espera do GPS esgotado. Tente novamente.';
          reject(new Error(reason));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  // Calcular distância entre dois pontos (Haversine formula)
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      setMsg('Erro ao acessar câmera. Permita o acesso para continuar.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  function takeSelfie() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        setSelfieData(dataURL);
        stopCamera();
        setMsg('Selfie capturada! Agora você pode registrar o ponto.');
      }
    }
  }

  function retakeSelfie() {
    setSelfieData(null);
    startCamera();
  }

  // Converte início (Timestamp/ISO/Date) para Date
  function toDate(x: Timestamp | string | Date): Date {
    if (!x) return new Date();
    if (x instanceof Timestamp) return x.toDate();
    if (typeof x === 'string') return new Date(x);
    return x;
  }

  async function handlePunch() {
    if (busy) return;
    
    // Verificar se selfie foi capturada
    if (!selfieData) {
      setMsg('Selfie obrigatória! Capture sua foto antes de registrar o ponto.');
      await startCamera();
      return;
    }

    setBusy(true);
    setMsg(null);

    try {
      // 1) GPS obrigatório
      const loc = await getLocation();

      // 2) Busca as sessões abertas (end == null)
      const openQ = query(
        collection(db, 'users', uid, 'sessions'),
        where('end', '==', null),
        limit(5)
      );
      const openSnap = await getDocs(openQ);

      // Helper para fechar uma sessão
      const closeSession = async (ref: any, session: SessionDoc) => {
        const startDate = toDate(session.start);
        const endDate = new Date();
        let durationSec = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));
        durationSec = applyRules(durationSec, rules || {});
        const earnings = earningsFromSeconds(durationSec, effectiveHourlyRate);

        await updateDoc(ref, {
          end: Timestamp.fromDate(endDate),
          durationSec,
          earnings,
          locationEnd: loc || null,
          selfieEnd: selfieData,
          status: session.status || 'pending',
          updatedAt: serverTimestamp(),
          deviceEnd: deviceInfo,
        });
      };

      if (!openSnap.empty) {
        // 3) Se há sessão aberta, fecha a mais recente
        const openSessions = openSnap.docs.map((d) => ({ ref: d.ref, data: d.data() as SessionDoc }));
        openSessions.sort((a, b) => toDate(b.data.start).getTime() - toDate(a.data.start).getTime());

        await closeSession(openSessions[0].ref, openSessions[0].data);

        // Se houver outras "penduradas", fecha todas também
        if (openSessions.length > 1) {
          await Promise.all(
            openSessions.slice(1).map((s) =>
              updateDoc(s.ref, {
                end: Timestamp.fromDate(new Date()),
                durationSec: 0,
                earnings: 0,
                locationEnd: loc || null,
                selfieEnd: selfieData,
                status: 'pending',
                updatedAt: serverTimestamp(),
                deviceEnd: deviceInfo,
                note: 'Auto-closed to enforce single open session rule.',
              })
            )
          );
        }

        setMsg('Ponto encerrado (aguardando aprovação).');
      } else {
        // 4) Abre nova sessão
        await addDoc(collection(db, 'users', uid, 'sessions'), {
          start: serverTimestamp(),
          end: null,
          durationSec: null,
          earnings: null,
          locationStart: loc || null,
          selfieStart: selfieData,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deviceStart: deviceInfo,
        });

        setMsg('Ponto iniciado!');
      }

      // Limpar selfie após uso
      setSelfieData(null);
    } catch (e: any) {
      setMsg(e?.message || 'Falha ao registrar ponto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {/* Modal da câmera */}
      {showCamera && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <h3 style={{ color: 'white', margin: 0 }}>📸 Capture sua selfie</h3>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              maxWidth: '90vw',
              maxHeight: '60vh',
              borderRadius: '10px'
            }}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="button button-primary"
              onClick={takeSelfie}
              style={{ background: '#16a34a' }}
            >
              📷 Capturar
            </button>
            <button
              className="button button-ghost"
              onClick={() => {
                stopCamera();
                setMsg('Selfie cancelada. Você precisa capturar uma foto para registrar o ponto.');
              }}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Preview da selfie */}
      {selfieData && (
        <div style={{
          border: '2px solid #16a34a',
          borderRadius: '10px',
          padding: '1rem',
          textAlign: 'center',
          background: 'rgba(22, 163, 74, 0.1)'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', color: '#16a34a' }}>
            ✅ Selfie capturada
          </p>
          <img
            src={selfieData}
            alt="Selfie capturada"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #16a34a'
            }}
          />
          <div style={{ marginTop: '0.5rem' }}>
            <button
              className="button button-ghost"
              onClick={retakeSelfie}
              style={{ fontSize: '12px', padding: '0.25rem 0.5rem' }}
            >
              🔄 Refazer foto
            </button>
          </div>
        </div>
      )}

      <button
        className="button button-primary"
        onClick={handlePunch}
        disabled={busy}
        style={{
          background: selfieData ? '#16a34a' : '#6b7280',
          cursor: selfieData ? 'pointer' : 'not-allowed'
        }}
      >
        {busy ? 'Enviando...' : selfieData ? '✅ Marcar Ponto (GPS + Selfie)' : '📸 Capture sua selfie primeiro'}
      </button>

      {!selfieData && (
        <button
          className="button button-ghost"
          onClick={startCamera}
          style={{ fontSize: '14px' }}
        >
          📷 Capturar Selfie
        </button>
      )}

      {msg && (
        <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>
          {msg}
        </div>
      )}

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
