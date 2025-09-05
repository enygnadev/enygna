'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updateProfile, getIdTokenResult } from 'firebase/auth'; // ← NOVO: getIdTokenResult
import { collection, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where, serverTimestamp } from 'firebase/firestore'; // ← NOVO: serverTimestamp
import PunchButton from '@/components/PunchButton';
import EarningsSummary from '@/components/EarningsSummary';

/** =============================================================
 * ÍCONES INLINE (sem libs externas)
 * ============================================================= */
function Icon({ name, size = 18, style }: { name:
  | 'user' | 'mail' | 'clock' | 'money' | 'calendar' | 'shield'
  | 'signout' | 'admin' | 'rules' | 'lunch' | 'tolerance'
  | 'rate' | 'hours' | 'salary' | 'dashboard' | 'save'
  | 'wifi' | 'wifiOff' | 'gps' | 'check' | 'x' | 'spark' | 'download' | 'refresh' | 'warning';
  size?: number; style?: React.CSSProperties }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as any;
  const paths: Record<string, JSX.Element> = {
    user: (<g><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></g>),
    mail: (<g><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m22 6-10 7L2 6"/></g>),
    clock: (<g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></g>),
    money:(<g><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M17 14h.01"/><circle cx="12" cy="12" r="2.5"/></g>),
    calendar:(<g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>),
    shield:(<g><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></g>),
    signout:(<g><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></g>),
    admin:(<g><circle cx="12" cy="7" r="4"/><path d="M2 21a10 10 0 0 1 20 0"/></g>),
    rules:(<g><path d="M6 2h9l3 3v15a2 2 0 0 1-2 2H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></g>),
    lunch:(<g><path d="M4 3v18M10 3v18M16 3v18"/><path d="M20 8c0 2-2 3-4 3s-4-1-4-3 2-3 4-3 4 1 4 3z"/></g>),
    tolerance:(<g><circle cx="12" cy="12" r="9"/><path d="M12 12l6-3"/><path d="M12 7v5"/></g>),
    rate:(<g><path d="M3 12h18M7 8h1M7 16h1M10 6h2M10 18h2M14 8h1M14 16h1"/></g>),
    hours:(<g><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></g>),
    salary:(<g><path d="M12 1v22"/><path d="M17 5a5 5 0 0 0-5-2 5 5 0 0 0 0 10 5 5 0 0 1 0 10 5 5 0 0 1-5-2"/></g>),
    dashboard:(<g><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></g>),
    save:(<g><path d="M19 21H5a2 2 0 0 1-2-2V5h11l5 5v9a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></g>),
    wifi:(<g><path d="M5 12a14 14 0 0 1 14 0"/><path d="M8.5 15.5a8 8 0 0 1 7 0"/><path d="M12 19h.01"/></g>),
    wifiOff:(<g><path d="M1 1l22 22"/><path d="M16.72 11.06a10.94 10.94 0 0 0-11.31 0"/><path d="M9.17 14.17a6 6 0 0 1 5.66 0"/></g>),
    gps:(<g><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></g>),
    check:(<g><path d="M20 6 9 17l-5-5"/></g>),
    x:(<g><path d="M18 6 6 18"/><path d="M6 6l12 12"/></g>),
    spark:(<g><path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6"/></g>),
    download:(<g><path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></g>),
    refresh:(<g><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></g>),
    warning:(<g><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></g>),
  };
  return <svg {...common} style={style}>{paths[name]}</svg>;
}

/** Badge/Tag simples */
function Tag({ children, tone='neutral' }: { children: React.ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'info' }) {
  const map = {
    neutral: { bg: 'rgba(255,255,255,.06)', br: 'rgba(255,255,255,.12)' },
    success: { bg: 'rgba(16,185,129,.15)', br: 'rgba(16,185,129,.35)' },
    warning: { bg: 'rgba(245,158,11,.15)', br: 'rgba(245,158,11,.35)' },
    danger:  { bg: 'rgba(239,68,68,.15)', br: 'rgba(239,68,68,.35)' },
    info:    { bg: 'rgba(59,130,246,.15)', br: 'rgba(59,130,246,.35)' },
  } as const;
  const t = map[tone];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px', border:`1px solid ${t.br}`, borderRadius:999, fontSize:12, background:t.bg }}>{children}</span>
  );
}

/** Skeleton simples */
function Skeleton({h=14, w='100%'}:{h?:number; w?:number|string}){
  return <div style={{height:h, width:w, borderRadius:8, background:'linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.1), rgba(255,255,255,.06))', backgroundSize:'200% 100%', animation:'sk 1.4s ease-in-out infinite'}}/>;
}

/** Hook de abas estável (sem loop) + persistência */
function useTabsStable<T extends string>(initial: T, all: readonly T[], storageKey='dash.tab') {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [value, setValue] = useState<T>(initial);

  // carregar do localStorage 1x
  const loaded = useRef(false);
  useEffect(() => {
    if (!mounted || loaded.current) return;
    loaded.current = true;
    try {
      const saved = localStorage.getItem(storageKey) as T | null;
      if (saved && all.includes(saved)) setValue(saved);
    } catch {}
  }, [mounted, storageKey]); // intencionalmente sem "all"

  // persistir
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(storageKey, value); } catch {}
  }, [mounted, storageKey, value]);

  const idx = useMemo(() => all.indexOf(value), [all, value]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % all.length;
    if (e.key === 'ArrowLeft')  next = (idx - 1 + all.length) % all.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End')  next = all.length - 1;
    if (next !== idx) {
      setValue(all[next]);
      const el = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next];
      el?.focus();
      e.preventDefault();
    }
  }
  return { value, setValue, idx, onKeyDown } as const;
}

/** Toast simples */
function useToast() {
  const [msg, setMsg] = useState<string|null>(null);
  const timer = useRef<any>(null);
  const show = (m:string) => { if (timer.current) clearTimeout(timer.current); setMsg(m); timer.current = setTimeout(()=>setMsg(null), 2400); };
  const node = msg ? (
    <div style={{ position:'fixed', right:20, bottom:20, background:'rgba(17,17,17,.92)', color:'#fff', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 14px', boxShadow:'0 10px 30px rgba(0,0,0,.5)', zIndex:80 }}>{msg}</div>
  ) : null;
  return { show, node } as const;
}

export default function DashboardPro(){
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ setMounted(true); },[]);

  // Estados básicos
  const [uid, setUid] = useState<string|null>(null);
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [monthlyBaseHours, setMonthlyBaseHours] = useState<number>(220);
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(0);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState<number>(0);
  const [lunchThresholdMinutes, setLunchThresholdMinutes] = useState<number>(360);
  const [isAdmin, setIsAdmin] = useState(false);

  // NOVO: claims
  const [claimRole, setClaimRole] = useState<string | null>(null);      // 'colaborador' | 'admin' | 'gestor' | 'superadmin' | null
  const [claimEmpresaId, setClaimEmpresaId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Rede / GPS
  const [online, setOnline] = useState<boolean | null>(null);
  const [gpsOk, setGpsOk] = useState<boolean|undefined>(undefined);

  // Abas
  const tabs = useMemo(() => (['ponto','remuneracao','regras','perfil'] as const), []);
  const t = useTabsStable<'ponto'|'remuneracao'|'regras'|'perfil'>('ponto', tabs);

  const { show, node: toast } = useToast();

  // Sessões do dia (base do banco + as que estão ativas em tempo real)
  const [todayBaseSec, setTodayBaseSec] = useState<number>(0);   // somatório fechado do Firestore
  const [todayBaseEarn, setTodayBaseEarn] = useState<number>(0); // ganhos fechados do Firestore
  const [activeStartsMs, setActiveStartsMs] = useState<number[]>([]); // sessões sem "end"

  // Ticker para cronômetro ao vivo (1s)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { forceTick(x => (x+1) % 1e9); }, 1000);
    return () => clearInterval(id);
  }, []);

  // Eventos de rede – só após mount
  useEffect(()=>{
    if (!mounted) return;
    const setFromNav = () => setOnline(navigator.onLine);
    setFromNav();
    const goOnline = ()=>setOnline(true);
    const goOffline= ()=>setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return ()=>{ window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  },[mounted]);

  // Helper para obter o ID da empresa do usuário
  const getUserEmpresaId = (userData: any): string | null => {
    // Prioriza claims, se disponíveis e válidos
    if (claimEmpresaId) return claimEmpresaId;

    // Caso contrário, tenta obter do perfil do usuário (Firestore)
    // Assume que o `userData` passado tem a propriedade `empresaId`
    return userData?.empresaId || null;
  };


  useEffect(() => {
    if (!mounted) return;
    let unAuth: (() => void) | null = null;
    let unDay:  (() => void) | null = null;

    unAuth = onAuthStateChanged(auth, async (u) => {
      // limpa listeners anteriores antes de registrar novos
      if (unDay) { unDay(); unDay = null; }

      if (!u) { window.location.href = '/'; return; }

      // NOVO: ler claims e aplicar guard do papel
      try {
        const tk = await getIdTokenResult(u, true);
        const role = (tk.claims?.role as string | undefined) || null;
        const emp = (tk.claims?.empresaId as string | undefined) || null;
        setClaimRole(role);
        setClaimEmpresaId(emp);

        // se usuário não for colaborador, mandamos para o painel de empresa
        if (role && role !== 'colaborador') {
          // ajuste a rota caso use /empresa/dashboard
          window.location.href = '/empresa';
          return;
        }
      } catch {
        // se falhar, segue fluxo normal e usa Firestore para UI
      }

      setUid(u.uid);
      setEmail(u.email || '');
      setDisplayName(u.displayName || '');

      const docRef = doc(db, 'users', u.uid);
      const snap = await getDoc(docRef);
      let userData: any = {}; // Para guardar os dados do usuário, usado no check de sistemas

      if (!snap.exists()) {
        await setDoc(docRef, {
          email: u.email, displayName: u.displayName || '',
          hourlyRate: 0, monthlySalary: 0, monthlyBaseHours: 220,
          toleranceMinutes: 0, lunchBreakMinutes: 0, lunchThresholdMinutes: 360,
          isAdmin: false, createdAt: new Date().toISOString(),
          // Inicializa sistemasAtivos como um array vazio, a menos que venha das claims
          sistemasAtivos: claimEmpresaId ? ['ponto'] : [],
        });
        userData = { // Cria um objeto inicial para as verificações seguintes
          role: 'colaborador',
          sistemasAtivos: claimEmpresaId ? ['ponto'] : [],
        };
      } else {
        userData = snap.data();
        setHourlyRate(Number(userData.hourlyRate || 0));
        setMonthlySalary(Number(userData.monthlySalary || 0));
        setMonthlyBaseHours(Number(userData.monthlyBaseHours || 220));
        setToleranceMinutes(Number(userData.toleranceMinutes || 0));
        setLunchBreakMinutes(Number(userData.lunchBreakMinutes || 0));
        setLunchThresholdMinutes(Number(userData.lunchThresholdMinutes || 360));
        // NOVO: se claims já dizem que é admin/superadmin, respeita as claims; senão, cai no Firestore
        const claimSaysAdmin = claimRole === 'admin' || claimRole === 'gestor' || claimRole === 'superadmin';
        setIsAdmin(claimSaysAdmin || !!userData.isAdmin);
      }

      // Checagem de acesso ao sistema de ponto
      let userHasAccess = false;
      if (userData.role === 'colaborador') {
        // Prioriza sistemasAtivos no perfil do usuário (se já foram atualizados pela empresa)
        if (userData.sistemasAtivos?.includes('ponto')) {
          userHasAccess = true;
        } else if (claimEmpresaId) {
          // Se não tem no perfil, verifica nas claims (que já podem ter sido sincronizadas)
          userHasAccess = true; // Se chegou aqui com claimEmpresaId, assume acesso ao ponto
          // Atualiza o perfil do usuário com os sistemas da empresa e lastLogin se ainda não foi feito
          const userDocRef = doc(db, 'users', u.uid);
          await updateDoc(userDocRef, {
            sistemasAtivos: userData.sistemasAtivos || ['ponto'], // Garante que 'ponto' esteja presente
            lastLogin: serverTimestamp()
          });
        } else {
           // Se não tem acesso nas claims e não tem no perfil, verifica na empresa (caso de criação mais antiga)
          const userEmpresaId = getUserEmpresaId(userData);
          if (userEmpresaId) {
            try {
              const empresaDoc = await getDoc(doc(db, "empresas", userEmpresaId));
              if (empresaDoc.exists()) {
                const empresaData = empresaDoc.data() as any;
                if ((empresaData.sistemasAtivos || []).includes('ponto')) {
                  userHasAccess = true;
                  // Atualizar o usuário com os sistemas da empresa
                  const userDocRef = doc(db, 'users', u.uid);
                  await updateDoc(userDocRef, {
                    sistemasAtivos: empresaData.sistemasAtivos || ['ponto'],
                    lastLogin: serverTimestamp()
                  });
                } else {
                  console.log(`Sistema de ponto não ativo para a empresa: ${userEmpresaId}`);
                }
              }
            } catch (empresaError) {
              console.error(`Erro ao verificar sistema ativo para empresa ${userEmpresaId}:`, empresaError);
            }
          }
        }
      } else {
        // Se não é colaborador, o acesso é implícito (gerenciado pela rota /empresa)
        userHasAccess = true;
      }

      // Se o usuário não tem acesso ao sistema de ponto, redireciona para a página inicial ou de login
      if (!userHasAccess) {
        show('Você não tem permissão para acessar o sistema de ponto.');
        signOut(auth); // Desloga o usuário
        window.location.href = '/'; // Redireciona
        return;
      }

      // Listener para sessões do dia (fecha ganhos + detecta ativas)
      const startOfDayIso = new Date(); startOfDayIso.setHours(0,0,0,0);
      const qDay = query(collection(db,'users', u.uid, 'sessions'), where('start','>=', startOfDayIso.toISOString()));
      unDay = onSnapshot(qDay, (qs)=>{
        let baseSec=0, baseEarn=0; const act:number[] = [];
        qs.forEach((dSnap:any)=>{
          const data = dSnap.data?.() ?? dSnap.data();
          if (!data) return;
          const hasEnd = !!data.end || typeof data.durationSec === 'number';
          if (hasEnd) {
            // usa durationSec se existir; senão calcula por start/end
            const sec = typeof data.durationSec === 'number'
              ? Number(data.durationSec)
              : Math.max(0, Math.floor((new Date(data.end).getTime() - new Date(data.start).getTime())/1000));
            baseSec += sec;
            baseEarn += Number(data.earnings || 0);
          } else {
            const ms = new Date(data.start).getTime();
            if (!Number.isNaN(ms)) act.push(ms);
          }
        });
        setTodayBaseSec(baseSec);
        setTodayBaseEarn(baseEarn);
        setActiveStartsMs(act);
        setLoading(false);
      });
    });

    return () => {
      if (unDay) unDay();
      if (unAuth) unAuth();
    };
  }, [mounted, claimRole, claimEmpresaId]); // inclui claimRole/EmpresaId para sincronizar quando claims chegarem

  const effectiveHourlyRate = useMemo(() => {
    if (monthlySalary && monthlyBaseHours) return Number((monthlySalary / monthlyBaseHours).toFixed(2));
    return Number(hourlyRate || 0);
  }, [hourlyRate, monthlySalary, monthlyBaseHours]);

  async function saveProfile() {
    if (!uid) return;
    try {
      setSaving(true);
      const name = displayName.trim();
      if (name && auth.currentUser) await updateProfile(auth.currentUser, { displayName: name });
      await updateDoc(doc(db, 'users', uid), {
        displayName: name,
        hourlyRate: Number(hourlyRate || 0),
        monthlySalary: Number(monthlySalary || 0),
        monthlyBaseHours: Number(monthlyBaseHours || 220),
        toleranceMinutes: Number(toleranceMinutes || 0),
        lunchBreakMinutes: Number(lunchBreakMinutes || 0),
        lunchThresholdMinutes: Number(lunchThresholdMinutes || 360),
        // Atualiza sistemasAtivos se for colaborador e tiver um ID de empresa
        ...(claimRole === 'colaborador' && claimEmpresaId && { sistemasAtivos: ['ponto'] }),
        lastLogin: serverTimestamp() // Atualiza lastLogin ao salvar perfil
      });
      show('Perfil salvo com sucesso!');
    } finally { setSaving(false); }
  }

  function resetRules(){
    setToleranceMinutes(0);
    setLunchBreakMinutes(0);
    setLunchThresholdMinutes(360);
    show('Regras resetadas. Não esqueça de salvar.');
  }

  function testGPS(){
    if (!('geolocation' in navigator)) { setGpsOk(false); show('Geolocalização não suportada.'); return; }
    navigator.geolocation.getCurrentPosition(
      ()=>{ setGpsOk(true); show('GPS ok!'); },
      ()=>{ setGpsOk(false); show('Permita o GPS para registrar ponto.'); },
      { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
    );
  }

  // Cálculo ao vivo: acrescenta segundos das sessões ativas
  const activeExtraSec = useMemo(() => {
    const now = Date.now();
    return activeStartsMs.reduce((acc, s) => acc + Math.max(0, Math.floor((now - s)/1000)), 0);
  }, [activeStartsMs]); // o tick 1s força re-render sem recalcular pesado

  const liveSec  = todayBaseSec + activeExtraSec;
  const liveEarn = todayBaseEarn + (effectiveHourlyRate * activeExtraSec) / 3600;

  const hh = Math.floor(liveSec/3600);
  const mm = Math.floor((liveSec%3600)/60);
  const ss = Math.floor(liveSec%60);

  // Evita mismatch: até montar, renderiza um shell mínimo
  if (!mounted) {
    return (
      <div className="container" style={{ paddingBottom: 80 }}>
        <div className="card" style={{ marginTop: 16, padding: 18, borderRadius: 14 }}>
          <Skeleton h={24} w={180} />
          <div className="grid" style={{ marginTop: 12 }}>
            <Skeleton h={56} /><Skeleton h={56} /><Skeleton h={56} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      {/* HEADER */}
      <div className="card" style={{ marginTop: 16, padding: 18, borderRadius: 14, background:'linear-gradient(180deg, rgba(59,130,246,.12), rgba(59,130,246,.05))' }}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="badge" style={{ display:'inline-flex', gap:8, alignItems:'center' }}>
              <Icon name="dashboard" /> Seu painel
            </div>
            <h1 className="h1" style={{ margin:'8px 0' }}>Olá, {displayName || email}</h1>
            <p className="h2" style={{ color:'#8aa2c9' }}>Ponto com GPS · Regras inteligentes · Exportações</p>
            {/* NOVO: info de claims/empresa */}
            <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:6 }}>
              {claimRole && <Tag tone="info"><Icon name="shield" /> Papel: {claimRole}</Tag>}
              {claimEmpresaId && <Tag><Icon name="calendar" /> Empresa: {claimEmpresaId}</Tag>}
            </div>
          </div>
          <div className="row" style={{ gap:10, flexWrap:'wrap' }}>
            <Tag tone={online ? 'success' : 'danger'}>
              {online ? <Icon name="wifi" /> : <Icon name="wifiOff" />} {online ? 'Online' : 'Offline'}
            </Tag>
            <button className="button button-ghost" onClick={()=>location.reload()} title="Recarregar"><Icon name="refresh" /> Atualizar</button>
            {(isAdmin || claimRole === 'admin' || claimRole === 'gestor' || claimRole === 'superadmin' || claimRole === 'adminmaster') && (
              <a className="button" href="/admin" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <Icon name="admin" /> Admin
              </a>
            )}
            <a className="button button-ghost" href="/fechamento" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <Icon name="calendar" /> Fechamento
            </a>
            <button className="button button-ghost" onClick={() => signOut(auth).then(()=>location.href='/')} style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
              <Icon name="signout" /> Sair
            </button>
          </div>
        </div>

        {/* KPIs rápidos do dia */}
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="clock" /> Horas hoje {activeStartsMs.length>0 && <Tag tone="info"><Icon name="spark" /> ao vivo</Tag>}
            </div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>
              {loading ? <Skeleton h={26} w={160}/> : `${hh}h ${mm}m ${ss}s`}
            </div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:6 }}><Icon name="money" /> Ganhos hoje</div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>{loading ? <Skeleton h={26} w={160}/> : `R$ ${liveEarn.toFixed(2)}`}</div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:6 }}><Icon name="gps" /> GPS</div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>
              {gpsOk===undefined? <Skeleton h={26} w={80}/> : gpsOk ? 'OK' : 'Bloqueado'}
            </div>
            <div className="row" style={{ marginTop:8 }}>
              <button className="button button-ghost" onClick={testGPS}><Icon name="gps" /> Testar GPS</button>
            </div>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div role="tablist" aria-label="Seções do painel" onKeyDown={t.onKeyDown} style={{ gap:10, marginTop:16, display:'flex', flexWrap:'wrap' }}>
        {tabs.map((key) => (
          <button key={key} role="tab" aria-selected={t.value===key} aria-controls={`${key}-panel`} id={`${key}-tab`} tabIndex={t.value===key?0:-1}
            onClick={()=>t.setValue(key)} className={t.value===key? 'button' : 'button button-ghost'}>
            {key==='ponto'? <>Ponto & Ganhos</> : key==='remuneracao'? <>Remuneração</> : key==='regras'? <>Regras</> : <>Perfil</>}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      {!loading && uid && (
        <div style={{ marginTop: 16 }}>
          {/* PERFIL */}
          <section id="perfil-panel" role="tabpanel" aria-labelledby="perfil-tab" hidden={t.value!=='perfil'}>
            <div className="card" style={{ padding:16 }}>
              <h3 style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><Icon name="user" /> Dados do Perfil</h3>
              <div className="row" style={{ gap:12, flexWrap:'wrap' }}>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:320 }}>
                  <Icon name="user" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Nome" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
                </div>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:340 }}>
                  <Icon name="mail" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Email" value={email} disabled />
                </div>
                <Tag tone='info'><Icon name="shield" /> UID protegido</Tag>
              </div>
              <div className="row" style={{ gap:8, marginTop:12 }}>
                <button className="button button-primary" disabled={saving} onClick={saveProfile} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  <Icon name="save" /> {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </section>

          {/* REMUNERAÇÃO */}
          <section id="remuneracao-panel" role="tabpanel" aria-labelledby="remuneracao-tab" hidden={t.value!=='remuneracao'}>
            <div className="card" style={{ padding:16 }}>
              <h3 style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><Icon name="money" /> Remuneração</h3>
              <div className="row" style={{ gap:12, flexWrap:'wrap' }}>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:180 }}>
                  <Icon name="rate" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="R$/hora" type="number" step="0.01" value={hourlyRate}
                    onChange={(e)=>setHourlyRate(parseFloat(e.target.value || '0'))} />
                </div>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:210 }}>
                  <Icon name="salary" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Salário mensal" type="number" step="0.01" value={monthlySalary}
                    onChange={(e)=>setMonthlySalary(parseFloat(e.target.value || '0'))} />
                </div>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:180 }}>
                  <Icon name="hours" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Horas/mês" type="number" value={monthlyBaseHours}
                    onChange={(e)=>setMonthlyBaseHours(parseInt(e.target.value || '220'))} />
                </div>
              </div>
              <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:8 }}>
                <Tag tone='success'><Icon name="rate" /> Valor-hora efetivo: <strong>&nbsp;R$ {effectiveHourlyRate.toFixed(2)}</strong></Tag>
                {monthlySalary > 0 && <Tag><Icon name="calendar" /> Base: {monthlyBaseHours} h/mês</Tag>}
                {hourlyRate > 0 && monthlySalary === 0 && <Tag>Modo por hora</Tag>}
                {monthlySalary > 0 && <Tag>Modo mensal</Tag>}
              </div>
              <div className="row" style={{ gap:8, marginTop:12 }}>
                <button className="button" disabled={saving} onClick={saveProfile}><Icon name="save" /> {saving ? 'Salvando...' : 'Salvar remuneração'}</button>
              </div>
            </div>
          </section>

          {/* REGRAS */}
          <section id="regras-panel" role="tabpanel" aria-labelledby="regras-tab" hidden={t.value!=='regras'}>
            <div className="card" style={{ padding:16 }}>
              <h3 style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><Icon name="rules" /> Regras de Cálculo</h3>
              <div className="row" style={{ gap:12, flexWrap:'wrap' }}>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:200 }}>
                  <Icon name="tolerance" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Tolerância (min)" type="number" value={toleranceMinutes}
                    onChange={(e)=>setToleranceMinutes(parseInt(e.target.value || '0'))} />
                </div>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:240 }}>
                  <Icon name="lunch" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Almoço (min a descontar)" type="number" value={lunchBreakMinutes}
                    onChange={(e)=>setLunchBreakMinutes(parseInt(e.target.value || '0'))} />
                </div>
                <div className="input" style={{ display:'flex', alignItems:'center', gap:8, maxWidth:280 }}>
                  <Icon name="clock" />
                  <input className="input" style={{ border:'none', flex:1 }} placeholder="Aplicar almoço se sessão ≥ (min)" type="number" value={lunchThresholdMinutes}
                    onChange={(e)=>setLunchThresholdMinutes(parseInt(e.target.value || '360'))} />
                </div>
              </div>
              <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:8 }}>
                <Tag>Janela de tolerância: {toleranceMinutes} min</Tag>
                <Tag>Desconto almoço: {lunchBreakMinutes} min</Tag>
                <Tag>Limiar almoço: {lunchThresholdMinutes} min</Tag>
              </div>
              <div className="row" style={{ gap:8, marginTop:12, alignItems:'center' }}>
                <button className="button" onClick={resetRules}><Icon name="warning" /> Resetar regras</button>
                <button className="button button-primary" disabled={saving} onClick={saveProfile}><Icon name="save" /> {saving ? 'Salvando...' : 'Salvar regras'}</button>
              </div>
            </div>
          </section>

          {/* PONTO & GANHOS */}
          <section id="ponto-panel" role="tabpanel" aria-labelledby="ponto-tab" hidden={t.value!=='ponto'}>
            <div className="card" style={{ padding:16 }}>
              <h3 style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><Icon name="clock" /> Registro de Ponto & Ganhos</h3>
              <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
                <Tag><Icon name="rate" /> R$ {effectiveHourlyRate.toFixed(2)}/h</Tag>
                <Tag><Icon name="rules" /> Tolerância: {toleranceMinutes} min</Tag>
                {lunchBreakMinutes > 0 && (
                  <Tag><Icon name="lunch" /> Almoço: {lunchBreakMinutes} min (≥ {lunchThresholdMinutes} min)</Tag>
                )}
              </div>

              <div className="row" style={{ gap:12, marginTop:12, alignItems:'center', flexWrap:'wrap' }}>
                {/* Mantido como está: seu PunchButton continua usando users/{uid} */}
                <div className="punch-skin">
                  <PunchButton
                    uid={uid!}
                    effectiveHourlyRate={effectiveHourlyRate}
                    rules={{ toleranceMinutes, lunchBreakMinutes, lunchThresholdMinutes }}
                  />
                </div>

                <button className="button button-ghost" onClick={testGPS}><Icon name="gps" /> Testar GPS</button>
                <a className="button button-ghost" href="#export"><Icon name="download" /> Exportar dados</a>
              </div>

              <div id="export" style={{ marginTop:16 }}>
                <EarningsSummary uid={uid!} />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Toast */}
      {toast}

      <style jsx global>{`
        @keyframes sk { 0%{background-position:0% 0} 100%{background-position:200% 0} }

        /* Botões verde/vermelho (caso queira usar diretamente) */
        .button-success { background:#16a34a !important; color:#fff !important; border-color:#12823c !important; }
        .button-success:hover { filter:brightness(0.95); }
        .button-danger  { background:#dc2626 !important; color:#fff !important; border-color:#b91c1c !important; }
        .button-danger:hover { filter:brightness(0.95); }

        /* "Skin" para o PunchButton:
           - Se ele renderizar 2 botões, pinta o 1º (iniciar) de verde e o 2º (finalizar) de vermelho.
           - Se o componente usar classes próprias (ex: .punch-start / .punch-stop), também cobrimos. */
        .punch-skin button:first-of-type,
        .punch-start { background:#16a34a !important; color:#fff !important; border-color:#12823c !important; }
        .punch-skin button:first-of-type:hover,
        .punch-start:hover { filter:brightness(0.95); }
        .punch-skin button:nth-of-type(2),
        .punch-stop  { background:#dc2626 !important; color:#fff !important; border-color:#b91c1c !important; }
        .punch-skin button:nth-of-type(2):hover,
        .punch-stop:hover { filter:brightness(0.95); }
      `}</style>
    </div>
  );
}