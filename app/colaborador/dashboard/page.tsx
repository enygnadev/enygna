'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, updateProfile, getIdTokenResult } from 'firebase/auth'; // ← NOVO: getIdTokenResult
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, orderBy } from 'firebase/firestore';
import PunchButton from '@/components/PunchButton';
import EarningsSummary from '@/components/EarningsSummary';
import Tutorial from '@/components/Tutorial';
import { colaboradorTutorialSteps } from '@/src/lib/tutorialSteps';
import { SessionDoc } from '@/src/lib/types';

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
  useEffect(()=>{ setMounted(true); },[]);

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

  // Estados básicos do usuário
  const [user, setUser] = useState<any>(null); // Armazena o objeto do usuário do Firebase Auth
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [monthlyBaseHours, setMonthlyBaseHours] = useState<number>(220);
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(0);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState<number>(0);
  const [lunchThresholdMinutes, setLunchThresholdMinutes] = useState<number>(360);
  const [isAdmin, setIsAdmin] = useState(false); // Flag para admin geral (pode ser removido ou mantido para contexto)

  // NOVO: claims e dados de colaborador/empresa
  const [claimRole, setClaimRole] = useState<string | null>(null);      // 'colaborador' | 'admin' | 'gestor' | 'superadmin' | null
  const [empresaId, setEmpresaId] = useState<string>(''); // ID da empresa ou 'pessoal'
  const [colaboradorId, setColaboradorId] = useState<string>(''); // ID do colaborador ou UID do usuário
  const [error, setError] = useState<string | null>(null); // Estado para armazenar mensagens de erro

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Rede / GPS
  const [online, setOnline] = useState<boolean | null>(null);
  const [gpsOk, setGpsOk] = useState<boolean|undefined>(undefined);

  // Abas
  const tabs = useMemo(() => (['ponto','remuneracao','regras','perfil'] as const), []);
  const t = useTabsStable<'ponto'|'remuneracao'|'regras'|'perfil'>('ponto', tabs);

  const { show, node: toast } = useToast();

  // Estados para controle de ponto
  const [currentSession, setCurrentSession] = useState<any>(null); // Sessão atualmente ativa
  const [isPunching, setIsPunching] = useState(false); // Indica se uma operação de ponto está em andamento
  const [currentLocation, setCurrentLocation] = useState<any>(null); // Localização atual do usuário

  // Sessões do dia (base do banco + as que estão ativas em tempo real)
  const [todayBaseSec, setTodayBaseSec] = useState<number>(0);   // somatório fechado do Firestore
  const [todayBaseEarn, setTodayBaseEarn] = useState<number>(0); // ganhos fechados do Firestore
  const [activeStartsMs, setActiveStartsMs] = useState<number[]>([]); // sessões sem "end"
  const [sessions, setSessions] = useState<any[]>([]); // Lista completa de sessões

  // Ticker para cronômetro ao vivo (1s)
  const [, forceTick] = useState(0);

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

  // Carregamento de dados do usuário e sessões
  useEffect(() => {
    if (!mounted) return;

    const unlistenAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u); // Armazena o objeto do usuário
      if (!u) {
        window.location.href = '/'; // Redireciona para o login se não estiver autenticado
        return;
      }

      // NOVO: ler claims e aplicar guard do papel
      try {
        const tk = await getIdTokenResult(u, true);
        const role = (tk.claims?.role as string | undefined) || null;
        setClaimRole(role);

        // Se o usuário tiver um papel definido e não for 'colaborador', redireciona para o painel de empresa
        if (role && role !== 'colaborador') {
          window.location.href = '/empresa';
          return;
        }
      } catch (e) {
        console.error("Erro ao obter claims:", e);
        // Se falhar ao obter claims, tenta continuar para carregar do Firestore
      }

      setEmail(u.email || '');
      setDisplayName(u.displayName || '');

      // Carrega os dados do usuário do Firestore
      const userDocRef = doc(db, 'users', u.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Cria o documento do usuário se não existir
        await setDoc(userDocRef, {
          email: u.email,
          displayName: u.displayName || '',
          isPessoal: true, // Marca como conta pessoal por padrão
          hourlyRate: 0,
          monthlySalary: 0,
          monthlyBaseHours: 220,
          toleranceMinutes: 0,
          lunchBreakMinutes: 0,
          lunchThresholdMinutes: 360,
          isAdmin: false, // Admin geral, pode ser reavaliado com base em claims
          createdAt: new Date().toISOString()
        });
        setEmpresaId('pessoal'); // Define como pessoal
        setColaboradorId(u.uid);   // Usa o UID do usuário como ID do colaborador
        loadSessionsForColaborador('pessoal', u.uid); // Carrega sessões pessoais
      } else {
        // Se o usuário já existe, carrega seus dados
        const userData = userDocSnap.data();
        setHourlyRate(Number(userData.hourlyRate || 0));
        setMonthlySalary(Number(userData.monthlySalary || 0));
        setMonthlyBaseHours(Number(userData.monthlyBaseHours || 220));
        setToleranceMinutes(Number(userData.toleranceMinutes || 0));
        setLunchBreakMinutes(Number(userData.lunchBreakMinutes || 0));
        setLunchThresholdMinutes(Number(userData.lunchThresholdMinutes || 360));

        // Define isAdmin baseado nas claims OU no Firestore, priorizando claims
        const claimSaysAdmin = claimRole === 'admin' || claimRole === 'gestor' || claimRole === 'superadmin';
        setIsAdmin(claimSaysAdmin || !!userData.isAdmin);

        // Decide se é conta pessoal ou vinculada a empresa
        if (userData.isPessoal) {
          setEmpresaId('pessoal');
          setColaboradorId(u.uid);
          loadSessionsForColaborador('pessoal', u.uid);
        } else if (userData.empresaId && userData.colaboradorId) {
          setEmpresaId(userData.empresaId);
          setColaboradorId(userData.colaboradorId);
          loadSessionsForColaborador(userData.empresaId, userData.colaboradorId);
        } else {
          // Se não for pessoal e não tiver empresa/colaboradorId definidos, tenta buscar
          loadColaboradorData();
        }
      }

      // Atualiza o estado de loading aqui, após obter os dados básicos do usuário
      // O listener de sessões irá controlar o loading final
      setLoading(false);
    });

    // Limpa os listeners quando o componente é desmontado
    return () => {
      unlistenAuth();
    };
  }, [mounted, claimRole]); // Depende de claimRole para atualizar isAdmin

  // Efeito para buscar dados do colaborador e sessões, caso necessário
  useEffect(() => {
    if (!user) return; // Só executa se o usuário já foi carregado

    // Se empresaId ou colaboradorId não foram definidos (e não é pessoal), tenta buscar
    if (!empresaId && !colaboradorId && email) {
      loadColaboradorData();
    } else if (empresaId && colaboradorId && !sessions.length && !loading) {
      // Se já temos os IDs e as sessões ainda não foram carregadas
      loadSessionsForColaborador(empresaId, colaboradorId);
    }
  }, [user, empresaId, colaboradorId, email, sessions.length, loading]);

  // Função principal para buscar dados do colaborador
  async function loadColaboradorData() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Primeiro verifica se é uma conta pessoal
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Se for conta pessoal, usa os dados do próprio usuário
        if (userData.isPessoal) {
          setEmpresaId('pessoal');
          setColaboradorId(user.uid);
          loadSessionsForColaborador('pessoal', user.uid);
          return;
        }
      }

      // Busca em todas as empresas pelos dados do colaborador
      const empresasSnap = await getDocs(collection(db, 'empresas'));

      for (const empresaDoc of empresasSnap.docs) {
        const currentEmpresaId = empresaDoc.id;

        // Busca o colaborador na empresa atual
        const colaboradoresSnap = await getDocs(
          query(
            collection(db, 'empresas', currentEmpresaId, 'colaboradores'),
            where('email', '==', user.email)
          )
        );

        if (!colaboradoresSnap.empty) {
          const colaboradorDoc = colaboradoresSnap.docs[0];
          const colaboradorData = colaboradorDoc.data();

          // Atualiza os estados com os dados encontrados
          setEmpresaId(currentEmpresaId);
          setColaboradorId(colaboradorDoc.id);

          // Carrega os dados da empresa para exibir informações
          const empresaData = empresaDoc.data();

          // Agora carrega as sessões usando os IDs encontrados
          loadSessionsForColaborador(currentEmpresaId, colaboradorDoc.id);
          return; // Sai da função assim que encontrar o colaborador
        }
      }

      // Se o loop terminar sem encontrar o colaborador
      throw new Error('Dados do colaborador não encontrados em nenhuma empresa.');
    } catch (error: any) {
      console.error('Erro ao buscar dados do colaborador:', error);
      setError(error.message || 'Erro ao carregar dados do colaborador.');
      setLoading(false); // Garante que o loading seja desativado em caso de erro
    }
  }

  // Função para carregar sessões para um colaborador específico
  async function loadSessionsForColaborador(empId: string, colabId: string) {
    try {
      let sessionsSnap;

      if (empId === 'pessoal') {
        // Para contas pessoais, busca nas sessões do usuário
        sessionsSnap = await getDocs(
          query(
            collection(db, 'users', colabId, 'sessions'),
            orderBy('start', 'desc')
          )
        );
      } else {
        // Para empresas, busca nas sessões da empresa/colaborador
        sessionsSnap = await getDocs(
          query(
            collection(db, 'empresas', empId, 'colaboradores', colabId, 'sessions'),
            orderBy('start', 'desc')
          )
        );
      }

      const loadedSessions = sessionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (SessionDoc & { id: string })[];

      setSessions(loadedSessions);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar sessões:', error);
      setError(error.message || 'Erro ao carregar sessões.');
      setLoading(false);
    }
  }

  // Ticker para cronômetro ao vivo (1s)
  useEffect(() => {
    const id = setInterval(() => { forceTick(x => (x+1) % 1e9); }, 1000);
    return () => clearInterval(id);
  }, []);

  const effectiveHourlyRate = useMemo(() => {
    if (monthlySalary && monthlyBaseHours) return Number((monthlySalary / monthlyBaseHours).toFixed(2));
    return Number(hourlyRate || 0);
  }, [hourlyRate, monthlySalary, monthlyBaseHours]);

  async function saveProfile() {
    if (!user?.uid) return;
    try {
      setSaving(true);
      const name = displayName.trim();

      // Atualiza o nome de exibição no Firebase Auth se o nome foi alterado
      if (name && auth.currentUser && auth.currentUser.displayName !== name) {
        await updateProfile(auth.currentUser, { displayName: name });
      }

      // Atualiza os dados no Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        hourlyRate: Number(hourlyRate || 0),
        monthlySalary: Number(monthlySalary || 0),
        monthlyBaseHours: Number(monthlyBaseHours || 220),
        toleranceMinutes: Number(toleranceMinutes || 0),
        lunchBreakMinutes: Number(lunchBreakMinutes || 0),
        lunchThresholdMinutes: Number(lunchThresholdMinutes || 360)
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
      (pos)=>{
        setCurrentLocation(pos.coords); // Salva a localização atual
        setGpsOk(true);
        show('GPS OK! Sua localização foi atualizada.');
      },
      (err)=>{
        setGpsOk(false);
        show(`Erro de GPS: ${err.message}. Permita o acesso.`);
      },
      { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
    );
  }

  // Funções de Punch In/Out
  async function handlePunchIn() {
    if (!empresaId || !colaboradorId) {
      alert('Dados do colaborador não encontrados!');
      return;
    }

    try {
      setIsPunching(true);

      let sessionsRef;
      if (empresaId === 'pessoal') {
        sessionsRef = collection(db, 'users', colaboradorId, 'sessions');
      } else {
        sessionsRef = collection(db, 'empresas', empresaId, 'colaboradores', colaboradorId, 'sessions');
      }

      const newSessionRef = doc(sessionsRef);

      await setDoc(newSessionRef, {
        start: new Date().toISOString(),
        end: null,
        locationStart: currentLocation || undefined,
      });

      setCurrentSession({
        id: newSessionRef.id,
        start: new Date().toISOString(),
        end: null,
        locationStart: currentLocation || undefined,
      });

      show('Ponto de entrada registrado!');
    } catch (error: any) {
      console.error('Erro ao registrar entrada:', error);
      alert('Erro ao registrar entrada: ' + error.message);
    } finally {
      setIsPunching(false);
    }
  }

  async function handlePunchOut() {
    if (!currentSession || !empresaId || !colaboradorId) {
      alert('Nenhuma sessão ativa encontrada!');
      return;
    }

    try {
      setIsPunching(true);

      const endTime = new Date().toISOString();
      let sessionRef;

      if (empresaId === 'pessoal') {
        sessionRef = doc(db, 'users', colaboradorId, 'sessions', currentSession.id);
      } else {
        sessionRef = doc(db, 'empresas', empresaId, 'colaboradores', colaboradorId, 'sessions', currentSession.id);
      }

      await setDoc(sessionRef, {
        end: endTime,
        locationEnd: currentLocation || undefined,
      }, { merge: true });

      setCurrentSession(null);
      show('Ponto de saída registrado!');

      // Recarrega as sessões
      loadSessionsForColaborador(empresaId, colaboradorId);
    } catch (error: any) {
      console.error('Erro ao registrar saída:', error);
      alert('Erro ao registrar saída: ' + error.message);
    } finally {
      setIsPunching(false);
    }
  }

  // Cálculo ao vivo: acrescenta segundos das sessões ativas
  const activeExtraSec = useMemo(() => {
    const now = Date.now();
    // Calcula a duração das sessões ativas
    return activeStartsMs.reduce((acc, s) => acc + Math.max(0, Math.floor((now - s)/1000)), 0);
  }, [activeStartsMs, forceTick]); // o tick 1s força re-render sem recalcular pesado

  // Calcula o tempo total e ganhos do dia
  const liveSec  = todayBaseSec + activeExtraSec;
  const liveEarn = todayBaseEarn + (effectiveHourlyRate * activeExtraSec) / 3600;

  const hh = Math.floor(liveSec/3600);
  const mm = Math.floor((liveSec%3600)/60);
  const ss = Math.floor(liveSec%60);

  // Evita mismatch: até montar, renderiza um shell mínimo
  if (!mounted || loading) {
    return (
      <div className="container" style={{ paddingBottom: 80 }}>
        {error && <div className="error-message" style={{color:'red', padding: '10px', marginBottom: '10px'}}>{error}</div>}
        <div className="card" style={{ marginTop: 16, padding: 18, borderRadius: 14 }}>
          <Skeleton h={24} w={180} />
          <div className="grid" style={{ marginTop: 12 }}>
            <Skeleton h={56} /><Skeleton h={56} /><Skeleton h={56} />
          </div>
        </div>
      </div>
    );
  }

  // Renderização principal do dashboard
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
            {/* NOVO: info de claims/empresa/pessoal */}
            <div className="row" style={{ gap:8, flexWrap:'wrap', marginTop:6 }}>
              {claimRole && <Tag tone="info"><Icon name="shield" /> Papel: {claimRole}</Tag>}
              {empresaId && <Tag><Icon name="calendar" /> {empresaId === 'pessoal' ? 'Conta Pessoal' : `Empresa: ${empresaId}`}</Tag>}
              {colaboradorId && <Tag><Icon name="user" /> ID: {colaboradorId.substring(0, 6)}...</Tag>}
            </div>
          </div>
          <div className="row" style={{ gap:10, flexWrap:'wrap' }}>
            <Tag tone={online ? 'success' : 'danger'}>
              {online ? <Icon name="wifi" /> : <Icon name="wifiOff" />} {online ? 'Online' : 'Offline'}
            </Tag>
            <button className="button button-ghost" onClick={()=>location.reload()} title="Recarregar"><Icon name="refresh" /> Atualizar</button>
            {(isAdmin || claimRole === 'admin' || claimRole === 'gestor' || claimRole === 'superadmin') && (
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
              <Icon name="clock" /> Horas hoje {currentSession && <Tag tone="info"><Icon name="spark" /> ao vivo</Tag>}
            </div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>
              {`${hh}h ${mm}m ${ss}s`}
            </div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:6 }}><Icon name="money" /> Ganhos hoje</div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>
              R$ {liveEarn.toFixed(2)}
            </div>
          </div>
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12, opacity:.8, display:'flex', alignItems:'center', gap:6 }}><Icon name="gps" /> GPS</div>
            <div style={{ fontSize:26, fontWeight:700, marginTop:6 }}>
              {gpsOk===undefined? 'Verificando...' : gpsOk ? 'OK' : 'Bloqueado'}
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
      {error && <div className="error-message" style={{color:'red', padding: '10px', marginBottom: '10px'}}>{error}</div>}
      {user && (
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
                {/* O PunchButton precisa receber o ID correto e os dados de empresa/colaborador */}
                <div className="punch-skin">
                  <PunchButton
                    uid={user.uid}
                    effectiveHourlyRate={effectiveHourlyRate}
                    rules={{ toleranceMinutes, lunchBreakMinutes, lunchThresholdMinutes }}
                  />
                </div>

                <button className="button button-ghost" onClick={testGPS}><Icon name="gps" /> Testar GPS</button>
                <a className="button button-ghost" href="#export"><Icon name="download" /> Exportar dados</a>
              </div>

              <div id="export" style={{ marginTop:16 }}>
                {/* O EarningsSummary precisa receber os dados de sessão corretos */}
                <EarningsSummary uid={colaboradorId} />
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

        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}