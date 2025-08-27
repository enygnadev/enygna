'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp, // 👈 para detectar Timestamp
} from 'firebase/firestore';
import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import dynamic from 'next/dynamic';
import ExportButtons from './ExportButtons';

const LocationMap = dynamic(() => import('./LocationMap'), { ssr: false });

/** =========================
 * Tipos
 * ========================= */
type Geo = { lat: number; lng: number; acc?: number };

type Row = {
  id: string;
  start: Timestamp | string | Date;
  end?: Timestamp | string | Date | null;
  durationSec?: number | null;
  earnings?: number | null;
  status?: string;
  locationStart?: Geo;
  locationEnd?: Geo;
};

type FilterPreset = 'today' | 'thisMonth' | 'custom';

/** =========================
 * Helpers de data
 * ========================= */
function toDateSafe(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
  if (x instanceof Timestamp) return x.toDate();
  if (typeof x === 'string') {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  // Suporte a {seconds, nanoseconds} ou objetos com toDate()
  if (typeof x === 'object') {
    if (typeof x.toDate === 'function') {
      try {
        const d = x.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
      } catch {
        /* ignore */
      }
    }
    if (typeof x.seconds === 'number') {
      const ms =
        x.seconds * 1000 +
        (typeof x.nanoseconds === 'number'
          ? Math.floor(x.nanoseconds / 1e6)
          : 0);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

/** =========================
 * Componente
 * ========================= */
export default function EarningsSummary({ uid }: { uid: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [preset, setPreset] = useState<FilterPreset>('today');
  const [start, setStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [end, setEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selected, setSelected] = useState<Row | null>(null);

  // Stream das sessões (ordenadas por start desc)
  useEffect(() => {
    const q = query(
      collection(db, 'users', uid, 'sessions'),
      orderBy('start', 'desc')
    );
    const unsub = onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
    );
    return () => unsub();
  }, [uid]);

  // Presets de data
  useEffect(() => {
    if (preset === 'today') {
      const now = new Date();
      setStart(format(now, 'yyyy-MM-dd'));
      setEnd(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'thisMonth') {
      const now = new Date();
      setStart(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEnd(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  }, [preset]);

  // Filtra por intervalo (seguro para datas de vários formatos)
  const filtered = useMemo(() => {
    const s = startOfDay(new Date(start));
    const e = endOfDay(new Date(end));
    return rows.filter((r) => {
      const d = toDateSafe(r.start);
      if (!d) return false;
      return !isBefore(d, s) && !isAfter(d, e);
    });
  }, [rows, start, end]);

  // Totais (usa durationSec se presente; senão, calcula)
  const totals = useMemo(() => {
    let sec = 0;
    let earn = 0;
    filtered.forEach((r) => {
      const startD = toDateSafe(r.start);
      const endD = r.end ? toDateSafe(r.end) : null;
      const duration =
        r.durationSec ??
        (startD && endD
          ? Math.max(0, Math.floor((endD.getTime() - startD.getTime()) / 1000))
          : 0);
      sec += duration;
      earn += r.earnings ?? 0;
    });
    return { fmt: fmtDuration, sec, earn };
  }, [filtered]);

  // Dados para exportação (com datas seguras)
  const exportRows = useMemo(
    () =>
      filtered.map((r) => {
        const s = toDateSafe(r.start);
        const e = r.end ? toDateSafe(r.end) : null;
        return {
          start: s ? format(s, 'dd/MM/yyyy HH:mm') : '',
          end: e ? format(e, 'dd/MM/yyyy HH:mm') : '',
          durationSec: r.durationSec ?? 0,
          earnings: r.earnings ?? 0,
        };
      }),
    [filtered]
  );

  return (
    <div className="stack">
      <div className="row">
        <div className="chips">
          <button className="button button-ghost" onClick={() => setPreset('today')}>
            Hoje
          </button>
          <button className="button button-ghost" onClick={() => setPreset('thisMonth')}>
            Este mês
          </button>
          <button className="button button-ghost" onClick={() => setPreset('custom')}>
            Personalizado
          </button>
        </div>
        {preset === 'custom' && (
          <div className="row">
            <input
              className="input"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <input
              className="input"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="kpi">
        <div className="item">
          <div className="label">Horas</div>
          <div className="value">{totals.fmt(totals.sec)}</div>
        </div>
        <div className="item">
          <div className="label">Ganhos (R$)</div>
          <div className="value">{totals.earn.toFixed(2)}</div>
        </div>
        <div className="item">
          <div className="label">Registros</div>
          <div className="value">{filtered.length}</div>
        </div>
      </div>

      <ExportButtons rows={exportRows} />

      <table className="table">
        <thead>
          <tr>
            <th>Início</th>
            <th>Fim</th>
            <th>Duração</th>
            <th>Ganhos</th>
            <th>Status</th>
            <th>Local</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const startD = toDateSafe(r.start);
            const endD = r.end ? toDateSafe(r.end) : null;
            const sec =
              r.durationSec ??
              (startD && endD
                ? Math.max(0, Math.floor((endD.getTime() - startD.getTime()) / 1000))
                : 0);
            const dur = fmtDuration(sec);
            const label = r.locationStart
              ? `${r.locationStart.lat.toFixed(4)},${r.locationStart.lng.toFixed(
                  4
                )}`
              : '—';

            return (
              <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                <td>{startD ? format(startD, 'dd/MM/yyyy HH:mm') : '—'}</td>
                <td>{endD ? format(endD, 'dd/MM/yyyy HH:mm') : '—'}</td>
                <td>{dur}</td>
                <td>{(r.earnings ?? 0).toFixed(2)}</td>
                <td>{r.status || 'pending'}</td>
                <td>{label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="badge">Localização do registro</div>
              <div className="h2">Clique em Fechar</div>
            </div>
            <button className="button button-ghost" onClick={() => setSelected(null)}>
              Fechar
            </button>
          </div>

          {selected.locationStart && (
            <div style={{ marginTop: 12 }}>
              <LocationMap
                lat={selected.locationStart.lat}
                lng={selected.locationStart.lng}
                label="Início"
              />
            </div>
          )}
          {selected.locationEnd && (
            <div style={{ marginTop: 12 }}>
              <LocationMap
                lat={selected.locationEnd.lat}
                lng={selected.locationEnd.lng}
                label="Fim"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
