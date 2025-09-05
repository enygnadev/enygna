'use client';
import { saveAs } from './fileUtils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type Row = { start: string; end?: string | null; durationSec?: number | null; earnings?: number | null; };

function toCSV(rows: Row[]) {
  const header = ['Início','Fim','Duração (min)','Ganhos (R$)'];
  const lines = [header.join(',')];
  rows.forEach(r => {
    const mins = r.durationSec ? Math.round(r.durationSec/60) : '';
    lines.push([r.start, r.end || '', mins, (r.earnings ?? 0).toFixed(2)].join(','));
  });
  return lines.join('\n');
}

export default function ExportButtons({ rows, filenameBase='ponto' }: { rows: Row[]; filenameBase?: string; }) {
  function exportCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filenameBase}_${new Date().toISOString().slice(0,10)}.csv`);
  }
  function exportPDF() {
    const doc = new jsPDF();
    (doc as any).autoTable({
      head: [['Início','Fim','Duração (min)','Ganhos (R$)']],
      body: rows.map(r => [r.start, r.end || '', r.durationSec ? Math.round(r.durationSec/60) : '', (r.earnings ?? 0).toFixed(2)]),
      styles: { fontSize: 9 }
    });
    doc.save(`${filenameBase}_${new Date().toISOString().slice(0,10)}.pdf`);
  }
  return (
    <div className="row">
      <button className="button button-ghost" onClick={exportCSV}>Exportar CSV</button>
      <button className="button button-ghost" onClick={exportPDF}>Exportar PDF</button>
    </div>
  );
}
