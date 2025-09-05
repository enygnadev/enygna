'use client';
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type S = { id:string; start:string; end?:string|null; durationSec?:number|null; earnings?:number|null; status?:string; };
type U = { displayName?:string; email?:string; monthlySalary?:number; monthlyBaseHours?:number; hourlyRate?:number; };

export default function Fechamento() {
  const [uid, setUid] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<U>({});
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [rows, setRows] = useState<S[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { window.location.href = '/'; return; }
      setUid(u.uid);
      const snap = await getDoc(doc(db,'users',u.uid));
      if (snap.exists()) setUserDoc(snap.data() as any);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function load() {
      if (!uid) return;
      const [y,m] = month.split('-').map(n => parseInt(n));
      const start = startOfMonth(new Date(y, m-1, 1));
      const end = endOfMonth(start);
      const q = query(collection(db,'users',uid,'sessions'), orderBy('start','asc'));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id:d.id, ...(d.data() as any) }));
      const list = all.filter(s => {
        const d = new Date(s.start);
        return d >= start && d <= end && (s.status === 'approved' || s.status === 'pending'); // incluir pendentes opcionalmente
      });
      setRows(list);
    }
    load();
  }, [uid, month]);

  const totals = useMemo(() => {
    let sec = 0, earn = 0;
    rows.forEach(r => { sec += r.durationSec ?? 0; earn += r.earnings ?? 0; });
    return { sec, earn, hours: (sec/3600) };
  }, [rows]);

  function gerarHolerite() {
    const doc = new jsPDF();
    const nome = userDoc.displayName || userDoc.email || 'Colaborador';
    doc.text(`Holerite - ${format(new Date(month+'-01'), 'MM/yyyy')}`, 14, 16);
    doc.text(`Colaborador: ${nome}`, 14, 24);
    (doc as any).autoTable({
      head: [['Início','Fim','Duração (min)','Ganhos (R$)','Status']],
      body: rows.map(r => [
        r.start ? format(new Date(r.start),"dd/MM/yyyy HH:mm") : '',
        r.end ? format(new Date(r.end),"dd/MM/yyyy HH:mm") : '',
        r.durationSec ? Math.round(r.durationSec/60) : '',
        (r.earnings ?? 0).toFixed(2),
        r.status || ''
      ]),
      startY: 30,
      styles: { fontSize: 9 }
    });
    const resumoY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total horas: ${(totals.hours).toFixed(2)}h`, 14, resumoY);
    doc.text(`Total ganhos (R$): ${totals.earn.toFixed(2)}`, 14, resumoY+6);
    doc.save(`holerite_${format(new Date(month+'-01'), 'yyyy_MM')}.pdf`);
  }

  return (
    <div className="container">
      <div className="card" style={{marginTop:20}}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div><div className="badge">Fechamento</div><h1 className="h1">Holerite Mensal</h1></div>
          <a className="button button-ghost" href="/dashboard">Voltar</a>
        </div>

        <div className="row" style={{marginTop:12}}>
          <input className="input" type="month" value={month} onChange={(e)=>setMonth(e.target.value)} />
          <button className="button button-ghost" onClick={gerarHolerite}>Gerar Holerite (PDF)</button>
        </div>

        <table className="table" style={{marginTop:12}}>
          <thead><tr><th>Início</th><th>Fim</th><th>Duração</th><th>Ganhos</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(r => {
              const sec = r.durationSec ?? 0;
              const dur = `${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`;
              return (
                <tr key={r.id}>
                  <td>{r.start ? format(new Date(r.start),"dd/MM/yyyy HH:mm") : ''}</td>
                  <td>{r.end ? format(new Date(r.end),"dd/MM/yyyy HH:mm") : ''}</td>
                  <td>{dur}</td>
                  <td>{(r.earnings ?? 0).toFixed(2)}</td>
                  <td>{r.status || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
