
'use client';

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
  type CSSProperties,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  User,
  getIdToken,
  getIdTokenResult
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  orderBy, 
  query,
  updateDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";
import ExportButtons from "@/components/ExportButtons";
import LocationMap from "@/components/LocationMap";
import ScheduleImporter from "@/components/ScheduleImporter";
import PayrollExporter from "@/components/PayrollExporter";
import ElectronicSignature from "@/components/ElectronicSignature";
import Tutorial from "@/components/Tutorial"; // Import Tutorial component

/** =============================================================
 * ÍCONES INLINE (sem libs externas)
 * ============================================================= */
function Icon({
  name,
  size = 18,
  style,
}: {
  name:
    | "admin"
    | "back"
    | "check"
    | "x"
    | "calendar"
    | "clock"
    | "money"
    | "status"
    | "search"
    | "download"
    | "approveAll"
    | "rejectAll"
    | "edit"
    | "plus"
    | "refresh"
    | "filter"
    | "sort"
    | "user"
    | "users"
    | "shield"
    | "trash"
    | "mapPin"
    | "dashboard"
    | "dollarSign"
    | "fileText";
  size?: number;
  style?: CSSProperties;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as any;
  const paths: Record<string, ReactNode> = {
    admin: (<g><circle cx="12" cy="7" r="4" /><path d="M2 21a10 10 0 0 1 20 0" /></g>),
    back: (<g><path d="M15 18l-6-6 6-6" /><path d="M9 12h12" /></g>),
    check: (<g><path d="M20 6 9 17l-5-5" /></g>),
    x: (<g><path d="M18 6 6 18" /><path d="M6 6l12 12" /></g>),
    calendar: (<g><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></g>),
    clock: (<g><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></g>),
    money: (<g><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></g>),
    status: (<g><circle cx="12" cy="12" r="9" /><path d="M9 12h6" /></g>),
    search: (<g><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></g>),
    download: (<g><path d="M12 3v12" /><path d="m7 12 5 5 5-5" /><path d="M5 21h14" /></g>),
    approveAll: (<g><path d="M20 6 9 17l-5-5" /><rect x="3" y="3" width="18" height="18" rx="2" /></g>),
    rejectAll: (<g><path d="M18 6 6 18" /><path d="M6 6l12 12" /><rect x="3" y="3" width="18" height="18" rx="2" /></g>),
    edit: (<g><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></g>),
    plus: (<g><path d="M12 5v14" /><path d="M5 12h14" /></g>),
    refresh: (<g><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></g>),
    filter: (<g><path d="M22 3H2l8 9v7l4 2v-9l8-9z" /></g>),
    sort: (<g><path d="M3 6h11" /><path d="M3 12h7" /><path d="M3 18h3" /><path d="M17 3v18" /><path d="m21 15-4 4-4-4" /></g>),
    user: (<g><circle cx="12" cy="8" r="4" /><path d="M6 20a6 6 0 0 1 12 0" /></g>),
    users: (<g><circle cx="8" cy="8" r="3.5" /><circle cx="17" cy="9" r="3" /><path d="M2 20a6 6 0 0 1 12 0" /><path d="M13 20a5 5 0 0 1 10 0" /></g>),
    shield: (<g><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z" /></g>),
    trash: (<g><path d="M3 6h18" /><path d="M8 6V4h8v2" /><rect x="6" y="6" width="12" height="14" rx="2" /></g>),
    mapPin: (<g><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></g>),
    dashboard: (<g><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="9"/><rect x="7" y="12" width="5" height="4"/><rect x="12" y="12" width="5" height="4"/></g>),
    dollarSign: (<g><path d="M12 1v22"/><path d="M22 7.868a6 6 0 0 0-6.727-4.848L10 10.156a6 6 0 0 0-6.727 4.848M14 18.156a6 6 0 0 1 6.727 4.848L10 23.472a6 6 0 0 1-6.727-4.848"/></g>),
    fileText: (<g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 3v5h5M10 13v-3M10 17v-3M10 10h6" /></g>),
  };
  return (
    <svg {...common} style={style}>
      {paths[name]}
    </svg>
  );
}

/** TAG / BADGE */
function Tag({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const map = {
    neutral: { bg: "rgba(255,255,255,.06)", br: "rgba(255,255,255,.12)" },
    success: { bg: "rgba(16,185,129,.15)", br: "rgba(16,185,129,.35)" },
    warning: { bg: "rgba(245,158,11,.15)", br: "rgba(245,158,11,.35)" },
    danger: { bg: "rgba(239,68,68,.15)", br: "rgba(239,68,68,.35)" },
    info: { bg: "rgba(59,130,246,.15)", br: "rgba(59,130,246,.35)" },
  } as const;
  const t = map[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        border: `1px solid ${t.br}`,
        background: t.bg,
        borderRadius: 999,
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

/** KPI CARD */
function Kpi({
  title,
  value,
  hint,
  tone = "neutral",
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const glow =
    tone === "success"
      ? "rgba(16,185,129,.18)"
      : tone === "warning"
      ? "rgba(245,158,11,.18)"
      : tone === "danger"
      ? "rgba(239,68,68,.18)"
      : tone === "info"
      ? "rgba(59,130,246,.18)"
      : "rgba(255,255,255,.06)";
  return (
    <div
      className="card"
      style={{
        padding: 16,
        boxShadow: `0 10px 30px ${glow}`,
        borderColor: "var(--border)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {hint && (
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

/** Helpers de data */
function toDateSafe(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
  if (x instanceof Timestamp) return x.toDate();
  if (typeof x === "string") {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof x === "object") {
    if (typeof (x as any).toDate === "function") {
      try {
        const d = (x as any).toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
      } catch {}
    }
    if (typeof (x as any).seconds === "number") {
      const ms =
        (x as any).seconds * 1000 +
        (typeof (x as any).nanoseconds === "number"
          ? Math.floor((x as any).nanoseconds / 1e6)
          : 0);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** Tipos */
type Geo = { lat: number; lng: number; acc?: number; label?: string };

type U = {
  id: string;
  email: string;
  displayName?: string;
  effectiveHourlyRate?: number;
  monthlySalary?: number;
  role?: "superadmin" | "admin" | "gestor" | "colaborador";
};

type S = {
  id: string;
  uid: string;
  start?: Timestamp | string | Date | null;
  end?: Timestamp | string | Date | null;
  durationSec?: number | null;
  earnings?: number | null;
  status?: "pending" | "approved" | "rejected" | string;
  approvedAt?: Timestamp | null;
  approvedBy?: string | null;
  rejectedAt?: Timestamp | null;
  rejectedBy?: string | null;

  liveLocation?: Geo | null;
  locationStart?: Geo | null;
  locationEnd?: Geo | null;
};

/** =============================================================
 * Dashboard da Empresa (multitenant) - COMPONENTE INTERNO
 * ============================================================= */
function EmpresaDashboard() {
  const params = useSearchParams();

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<U["role"] | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);

  const [users, setUsers] = useState<U[]>([]);
  const [selectedUser, setSelectedUser] = useState<U | null>(null);

  const [sessions, setSessions] = useState<S[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(""); // yyyy-MM-dd
  const [dateTo, setDateTo] = useState<string>("");

  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modais
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [locSession, setLocSession] = useState<S | null>(null);

  // Forms
  const [editForm, setEditForm] = useState<Partial<U>>({});
  const [addForm, setAddForm] = useState<{
    email: string;
    displayName?: string;
    password?: string;
    effectiveHourlyRate?: number;
    monthlySalary?: number;
    dailyRate?: number;
    workingDaysPerMonth?: number;
    paymentType?: "hourly" | "monthly" | "daily";
    role?: U["role"];
  }>({
    email: "",
    role: "colaborador",
    password: "",
    workingDaysPerMonth: 22,
    paymentType: "monthly"
  });

  // Ordenação
  const [sortBy, setSortBy] = useState<
    "start" | "end" | "duration" | "earnings" | "status"
  >("start");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Toast simples
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  function showToast(t: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // Novos estados e funções para funcionalidades adicionais
  const [companyLocation, setCompanyLocation] = useState<{lat: number; lng: number; radius: number} | null>(null);
  const [showGeofencing, setShowGeofencing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [windowWidth, setWindowWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // --- Estados para o modal de adicionar colaborador ---
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserWorkDays, setNewUserWorkDays] = useState(22);
  const [newUserSalaryType, setNewUserSalaryType] = useState<'hourly' | 'daily' | 'monthly'>('monthly');
  const [newUserHourlyRate, setNewUserHourlyRate] = useState('');
  const [newUserDailyRate, setNewUserDailyRate] = useState('');
  const [newUserMonthlyRate, setNewUserMonthlyRate] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  // --- Fim dos estados do modal ---


  // Handle window resize and initial mount
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: "dashboard" },
    { id: "sessions", label: "Sessões", icon: "clock" },
    { id: "users", label: "Colaboradores", icon: "users" },
    { id: "schedule", label: "Escalas", icon: "calendar" },
    { id: "geofencing", label: "Geofencing", icon: "mapPin" },
    { id: "payroll", label: "Folha", icon: "dollarSign" },
    { id: "reports", label: "Relatórios", icon: "fileText" }
  ] as const;

  /** -----------------------------------------------------------
   * Autorização básica / leitura de claims
   * ----------------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setCurrentUser(u); // Atualiza o currentUser

      try {
        const tk = await getIdTokenResult(u, true);
        const claims = tk.claims as any;
        const role = (claims.role || "colaborador") as U["role"];
        const empIdFromClaims = (claims.empresaId || null) as string | null;

        // Debug info
        console.log("User claims:", { role, empIdFromClaims, uid: u.uid });

        // Permite acesso para superadmin, admin e gestor
        if (!["superadmin", "admin", "gestor"].includes(role || "")) {
          // Tenta buscar dados do Firestore como fallback
          try {
            // Verifica se o usuário já existe no 'users' e se tem permissão
            const userDocRef = doc(db, "users", u.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as any;
              console.log("Dados do usuário encontrados:", userData);
              
              // Verifica se o usuário tem role de admin/gestor OU se tem sistema ponto ativo
              const hasAdminRole = ["superadmin", "admin", "gestor"].includes(userData.role);
              const hasPontoAccess = userData.sistemasAtivos?.includes('ponto');
              const isEmpresaType = userData.tipo === 'empresa';
              
              console.log("Verificação de acesso:", {
                hasAdminRole,
                hasPontoAccess,
                isEmpresaType,
                role: userData.role,
                sistemasAtivos: userData.sistemasAtivos,
                tipo: userData.tipo,
                empresaId: userData.empresaId
              });
              
              if (hasAdminRole || hasPontoAccess || isEmpresaType) {
                setMeRole(userData.role || 'admin');
                
                // Priorizar empresaId da URL se existir
                const fromQS = params.get("empresaId");
                if (fromQS) {
                  setEmpresaId(fromQS);
                } else {
                  setEmpresaId(userData.empresaId);
                }
                
                // Carrega a configuração de geofencing da empresa
                const empresaIdToUse = fromQS || userData.empresaId;
                if (empresaIdToUse) {
                  try {
                    const companyDoc = await getDoc(doc(db, "empresas", empresaIdToUse));
                    if (companyDoc.exists()) {
                      const companyData = companyDoc.data() as any;
                      if (companyData.geofencing) {
                        setCompanyLocation(companyData.geofencing);
                      }
                      
                      // Verificar se a empresa realmente tem sistema ponto ativo
                      const sistemasAtivos = companyData.sistemasAtivos || [];
                      if (!sistemasAtivos.includes('ponto')) {
                        console.log("Empresa não tem sistema de ponto ativo");
                        alert("Esta empresa não tem permissão para acessar o sistema de ponto.");
                        window.location.href = "/sistemas";
                        return;
                      }
                    }
                  } catch (companyError) {
                    console.error("Erro ao carregar dados da empresa:", companyError);
                  }
                }
              } else {
                console.log("Acesso negado - critérios não atendidos");
                alert("Acesso negado. Usuário não tem permissão para acessar o sistema de ponto.");
                window.location.href = "/ponto/colaborador";
                return;
              }
            } else {
              console.log("Usuário não encontrado na coleção users");
              // Se o usuário não existe no 'users', verifica se foi criado via admin para empresa
              // Busca pelo email na coleção de empresas para verificar se é uma empresa do sistema de ponto
              try {
                console.log("Buscando empresa por email:", u.email);
                
                // Buscar empresa por email
                const empresasQuery = query(
                  collection(db, "empresas"), 
                  where("email", "==", u.email)
                );
                const empresasSnap = await getDocs(empresasQuery);
                
                if (!empresasSnap.empty) {
                  const empresaDoc = empresasSnap.docs[0];
                  const empresaData = empresaDoc.data();
                  
                  console.log("Empresa encontrada:", empresaDoc.id, empresaData);
                  
                  // Verificar se tem sistema ponto nos sistemas ativos
                  const sistemasAtivos = empresaData.sistemasAtivos || [];
                  if (!sistemasAtivos.includes('ponto')) {
                    console.log("Empresa não tem sistema de ponto ativo");
                    alert("Esta empresa não tem permissão para acessar o sistema de ponto.");
                    window.location.href = "/sistemas";
                    return;
                  }
                  
                  // Cria documento do usuário
                  await setDoc(userDocRef, {
                    email: u.email,
                    displayName: u.displayName || empresaData.nome || u.email,
                    role: 'admin',
                    tipo: 'empresa',
                    empresaId: empresaDoc.id,
                    sistemasAtivos: sistemasAtivos,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                  });
                  
                  setMeRole('admin');
                  
                  // Priorizar empresaId da URL se existir
                  const fromQS = params.get("empresaId");
                  setEmpresaId(fromQS || empresaDoc.id);
                  
                  // Carrega configuração de geofencing
                  if (empresaData.geofencing) {
                    setCompanyLocation(empresaData.geofencing);
                  }
                } else {
                  console.log("Empresa não encontrada no sistema");
                  alert("Acesso negado. Empresa não encontrada no sistema ou não possui sistema de ponto ativo.");
                  window.location.href = "/sistemas";
                  return;
                }
              } catch (searchError) {
                console.error("Erro ao buscar empresa:", searchError);
                alert("Erro ao verificar permissões da empresa.");
                window.location.href = "/sistemas";
                return;
              }
            }
          } catch (error) {
            console.error("Erro ao verificar permissões:", error);
            alert("Erro ao verificar permissões. Redirecionando...");
            window.location.href = "/sistemas";
            return;
          }
        } else {
          setMeRole(role);

          // 1) Prioriza ?empresaId= da URL
          const fromQS = params.get("empresaId");
          if (fromQS) {
            setEmpresaId(fromQS);
             // Carrega a configuração de geofencing da empresa
             try {
               const companyDoc = await getDoc(doc(db, "empresas", fromQS));
               if (companyDoc.exists()) {
                 const companyData = companyDoc.data() as any;
                 if (companyData.geofencing) {
                   setCompanyLocation(companyData.geofencing);
                 }
               }
             } catch (error) {
               console.error("Erro ao carregar dados da empresa:", error);
             }
          } else {
            // 2) Usa empresaId dos claims (se houver)
            setEmpresaId(empIdFromClaims);
            if (empIdFromClaims) {
              // Carrega a configuração de geofencing da empresa
              try {
                const companyDoc = await getDoc(doc(db, "empresas", empIdFromClaims));
                if (companyDoc.exists()) {
                  const companyData = companyDoc.data() as any;
                  if (companyData.geofencing) {
                    setCompanyLocation(companyData.geofencing);
                  }
                }
              } catch (error) {
                console.error("Erro ao carregar dados da empresa:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao obter claims:", error);
        alert("Erro de autenticação. Tentando novamente...");
        window.location.href = "/dashboard";
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** -----------------------------------------------------------
   * Carrega lista de EMPRESAS para superadmin (para poder selecionar)
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (meRole === "superadmin") {
      (async () => {
        const snap = await getDocs(collection(db, "empresas"));
        const list = snap.docs.map((d) => ({
          id: d.id,
          nome: ((d.data() as any).nome as string) || d.id,
        }));
        list.sort((a, b) => a.nome.localeCompare(b.nome));
        setEmpresas(list);
      })();
    }
  }, [meRole]);

  /** -----------------------------------------------------------
   * Carregar colaboradores SEMPRE que houver empresaId
   * (funciona para admin/gestor e para superadmin após selecionar)
   * ----------------------------------------------------------- */
  useEffect(() => {
    loadUsers(); // Chama a função loadUsers para carregar colaboradores
  }, [empresaId]);

  // Função para carregar usuários (colaboradores) da empresa selecionada
  const loadUsers = async () => {
    if (!empresaId) {
      setUsers([]); // Limpa usuários se a empresa for desmarcada
      return;
    };
    // reset seleção de usuário/sessions ao trocar empresa
    setSelectedUser(null);
    setSessions([]);
    setLoading(true);
    try {
      const snap = await getDocs(
        collection(db, "empresas", empresaId, "colaboradores")
      );
      const list: U[] = snap.docs.map((d) => {
        const v = d.data() as any;
        return {
          id: d.id,
          email: v.email,
          displayName: v.displayName,
          effectiveHourlyRate: v.effectiveHourlyRate,
          monthlySalary: v.monthlySalary,
          role: (v.role || "colaborador") as U["role"],
        };
      });
      list.sort((a, b) =>
        (a.displayName || a.email).localeCompare(b.displayName || b.email)
      );
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  async function loadSessions(u: U) {
    if (!empresaId) return;
    setSelectedUser(u);
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const qy = query(
        collection(db, "empresas", empresaId, "colaboradores", u.id, "sessions"),
        orderBy("start", "desc")
      );
      const snap = await getDocs(qy);
      setSessions(
        snap.docs.map((d) => ({ id: d.id, uid: u.id, ...(d.data() as any) }))
      );
    } finally {
      setLoading(false);
    }
  }

  /** -----------------------------------------------------------
   * Edição / Criação de colaborador (escopo empresa)
   * ----------------------------------------------------------- */
  function openEditModal() {
    if (!selectedUser) return;
    setEditForm({
      id: selectedUser.id,
      email: selectedUser.email,
      displayName: selectedUser.displayName || "",
      effectiveHourlyRate: selectedUser.effectiveHourlyRate ?? 0,
      monthlySalary: selectedUser.monthlySalary ?? 0,
      role: selectedUser.role || "colaborador",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editForm?.id || !empresaId) return;
    const ref = doc(db, "empresas", empresaId, "colaboradores", editForm.id);
    const payload: Partial<U> = {
      email: editForm.email ?? "",
      displayName: editForm.displayName ?? "",
      effectiveHourlyRate: Number(editForm.effectiveHourlyRate) || 0,
      monthlySalary: Number(editForm.monthlySalary) || 0,
      role: (editForm.role as U["role"]) || "colaborador",
    };
    await setDoc(ref, payload, { merge: true });
    setUsers((prev) =>
      prev.map((u) => (u.id === editForm.id ? { ...u, ...payload } : u))
    );
    if (selectedUser?.id === editForm.id)
      setSelectedUser({ ...selectedUser, ...payload });
    setEditOpen(false);
    showToast("Colaborador atualizado!");
  }

  // Função para adicionar colaborador (apenas Firestore)
  async function handleAddColaborador() {
    if (!newUserEmail.trim()) {
      alert("Email é obrigatório");
      return;
    }

    // Validar pelo menos um tipo de salário
    const hasHourly = newUserSalaryType === 'hourly' && newUserHourlyRate.trim();
    const hasDaily = newUserSalaryType === 'daily' && newUserDailyRate.trim();
    const hasMonthly = newUserSalaryType === 'monthly' && newUserMonthlyRate.trim();

    if (!hasHourly && !hasDaily && !hasMonthly) {
      alert("Preencha pelo menos um valor de salário");
      return;
    }

    setIsAddingUser(true);
    try {
      // Gerar um ID único para o colaborador
      const colaboradorId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar perfil no Firestore (sem Auth)
      await setDoc(doc(db, "empresas", empresaId!, "colaboradores", colaboradorId), {
        email: newUserEmail,
        displayName: newUserName || '',
        role: 'colaborador',
        empresaId: empresaId,
        workDaysPerMonth: newUserWorkDays || 22,
        salaryType: newUserSalaryType,
        hourlyRate: newUserSalaryType === 'hourly' ? Number(newUserHourlyRate) || 0 : 0,
        dailyRate: newUserSalaryType === 'daily' ? Number(newUserDailyRate) || 0 : 0,
        monthlyRate: newUserSalaryType === 'monthly' ? Number(newUserMonthlyRate) || 0 : 0,
        monthlySalary: Number(newUserMonthlyRate) || 0,
        monthlyBaseHours: 220,
        toleranceMinutes: 0,
        lunchBreakMinutes: 0,
        lunchThresholdMinutes: 360,
        isAuthUser: false, // Indica que é colaborador sem conta Auth
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("Colaborador adicionado com sucesso!");
      setNewUserEmail("");
      setNewUserPassword(""); // Senha não é mais necessária no frontend para este modal
      setNewUserName("");
      setNewUserWorkDays(22);
      setNewUserSalaryType('monthly');
      setNewUserHourlyRate('');
      setNewUserDailyRate('');
      setNewUserMonthlyRate('');
      setShowAddUserModal(false);

      // Recarregar lista de usuários
      loadUsers();

    } catch (error: any) {
      console.error("Erro ao adicionar colaborador:", error);
      alert("Erro ao adicionar colaborador: " + error.message);
    } finally {
      setIsAddingUser(false);
    }
  }


  /** -----------------------------------------------------------
   * Filtros, ordenação e métricas
   * ----------------------------------------------------------- */
  const filtered = useMemo(() => {
    const base = (sessions || []).filter((s) => {
      if (statusFilter !== "all") {
        if ((s.status || "pending") !== statusFilter) return false;
      }
      const sDate = toDateSafe(s.start);
      const eDate = s.end ? toDateSafe(s.end) : null;
      const startStr = sDate ? format(sDate, "dd/MM/yyyy HH:mm") : "";
      const endStr = eDate ? format(eDate, "dd/MM/yyyy HH:mm") : "";
      const hay = (startStr + " " + endStr).toLowerCase();
      if (search.trim() && !hay.includes(search.trim().toLowerCase()))
        return false;

      if (sDate) {
        if (dateFrom) {
          const from = startOfDay(parseISO(dateFrom));
          if (isBefore(sDate, from)) return false;
        }
        if (dateTo) {
          const to = endOfDay(parseISO(dateTo));
          if (isAfter(sDate, to)) return false;
        }
      } else {
        if (dateFrom || dateTo) return false;
      }
      return true;
    });

    const sorted = [...base].sort((a, b) => {
      const ad = toDateSafe(a.start);
      const bd = toDateSafe(b.start);
      if (sortBy === "start") {
        const av = ad?.getTime() ?? 0;
        const bv = bd?.getTime() ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (sortBy === "end") {
        const av = (a.end ? toDateSafe(a.end)?.getTime() : 0) ?? 0;
        const bv = (b.end ? toDateSafe(b.end)?.getTime() : 0) ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      if (sortBy === "duration") {
        const as = a.durationSec ?? 0;
        const bs = b.durationSec ?? 0;
        return sortDir === "asc" ? as - bs : bs - as;
      }
      if (sortBy === "earnings") {
        const ae = a.earnings ?? 0;
        const be = b.earnings ?? 0;
        return sortDir === "asc" ? ae - be : be - ae;
      }
      if (sortBy === "status") {
        const av = (a.status || "pending").localeCompare(b.status || "pending");
        return sortDir === "asc" ? av : -av;
      }
      return 0;
    });

    return sorted;
  }, [sessions, statusFilter, search, dateFrom, dateTo, sortBy, sortDir]);

  const kpis = useMemo(() => {
    const totalSec = filtered.reduce((acc, s) => acc + (s.durationSec || 0), 0);
    const totalEarn = filtered.reduce((acc, s) => acc + (s.earnings || 0), 0);
    const approved = filtered.filter((s) => s.status === "approved").length;
    const pending = filtered.filter(
      (s) => (s.status || "pending") === "pending"
    ).length;
    const rejected = filtered.filter((s) => s.status === "rejected").length;
    const hh = Math.floor(totalSec / 3600);
    const mm = Math.floor((totalSec % 3600) / 60);
    return {
      totalTime: `${hh}h ${mm}m`,
      totalEarn: `R$ ${totalEarn.toFixed(2)}`,
      approved,
      pending,
      rejected,
    };
  }, [filtered]);

  /** Seleção */
  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllCurrentPage(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  /** Ações em massa (status) */
  async function bulkSetStatus(status: "approved" | "rejected") {
    if (!selectedUser || !empresaId) return;
    if (selectedIds.size === 0)
      return alert("Selecione pelo menos um registro.");
    if (
      !confirm(
        `Confirmar marcar ${selectedIds.size} registro(s) como ${
          status === "approved" ? "APROVADO" : "REJEITADO"
        }?`
      )
    )
      return;
    setLoading(true);
    try {
      const ops = Array.from(selectedIds).map((id) =>
        updateDoc(
          doc(
            db,
            "empresas",
            empresaId,
            "colaboradores",
            selectedUser.id,
            "sessions",
            id
          ),
          { status }
        )
      );
      await Promise.all(ops);
      await loadSessions(selectedUser);
      setSelectedIds(new Set());
      showToast(
        status === "approved" ? "Registros aprovados!" : "Registros rejeitados!"
      );
    } finally {
      setLoading(false);
    }
  }

  /** Fechamento automático de todos os pontos pendentes */
  async function autoCloseAllPending() {
    if (!selectedUser || !empresaId) return;

    const pendingSessions = sessions.filter(s => (s.status || "pending") === "pending");

    if (pendingSessions.length === 0) {
      showToast("Nenhuma sessão pendente encontrada.");
      return;
    }

    if (!confirm(
      `Fechar automaticamente ${pendingSessions.length} sessão(s) pendente(s)?\n\n` +
      `• Sessões com menos de 1 hora serão REJEITADAS\n` +
      `• Sessões válidas serão APROVADAS\n` +
      `• Sessões abertas serão FECHADAS automaticamente`
    )) return;

    setLoading(true);
    let approved = 0;
    let rejected = 0;
    let closed = 0;

    try {
      const now = new Date();
      const batch = writeBatch(db);

      for (const session of pendingSessions) {
        const sessionRef = doc(db, "empresas", empresaId, "colaboradores", selectedUser.id, "sessions", session.id);

        const startDate = toDateSafe(session.start);
        let endDate = session.end ? toDateSafe(session.end) : null;

        // Se não tem fim, fecha automaticamente
        if (!endDate && startDate) {
          endDate = now;
          closed++;
        }

        if (startDate && endDate) {
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          // Rejeita sessões muito curtas (menos de 1 hora) ou muito longas (mais de 16 horas)
          if (durationHours < 1 || durationHours > 16) {
            batch.update(sessionRef, {
              status: "rejected",
              rejectedAt: serverTimestamp(),
              rejectedBy: currentUser?.uid,
              autoClosedReason: durationHours < 1 ? "Sessão muito curta" : "Sessão muito longa"
            });
            rejected++;
          } else {
            // Aprova sessões válidas
            const durationSec = Math.floor(durationMs / 1000);
            const hourlyRate = selectedUser.effectiveHourlyRate || 0;
            const earnings = (durationSec / 3600) * hourlyRate;

            batch.update(sessionRef, {
              status: "approved",
              approvedAt: serverTimestamp(),
              approvedBy: currentUser?.uid,
              end: endDate,
              durationSec,
              earnings,
              autoClosedReason: "Fechamento automático"
            });
            approved++;
          }
        }
      }

      await batch.commit();
      await loadSessions(selectedUser);
      showToast(`Fechamento concluído! ${approved} aprovadas, ${rejected} rejeitadas, ${closed} fechadas.`);
    } catch (error) {
      console.error("Erro no fechamento automático:", error);
      showToast("Erro no fechamento automático.");
    } finally {
      setLoading(false);
    }
  }

  /** Fechamento inteligente baseado em padrões */
  async function smartAutoClose() {
    if (!selectedUser || !empresaId) return;

    const pendingSessions = sessions.filter(s => (s.status || "pending") === "pending");

    if (pendingSessions.length === 0) {
      showToast("Nenhuma sessão pendente encontrada.");
      return;
    }

    // Analisa padrões das sessões aprovadas
    const approvedSessions = sessions.filter(s => s.status === "approved");
    let avgDuration = 8 * 3600; // 8 horas padrão

    if (approvedSessions.length > 0) {
      const totalDuration = approvedSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
      avgDuration = totalDuration / approvedSessions.length;
    }

    const minDuration = avgDuration * 0.5; // 50% da média
    const maxDuration = avgDuration * 1.5; // 150% da média

    if (!confirm(
      `Fechamento inteligente baseado em padrões:\n\n` +
      `• Duração média detectada: ${Math.round(avgDuration / 3600)}h\n` +
      `• Aprovará sessões entre ${Math.round(minDuration / 3600)}h e ${Math.round(maxDuration / 3600)}h\n` +
      `• ${pendingSessions.length} sessão(s) serão processadas\n\n` +
      `Continuar?`
    )) return;

    setLoading(true);
    let approved = 0;
    let rejected = 0;
    let closed = 0;

    try {
      const now = new Date();
      const batch = writeBatch(db);

      for (const session of pendingSessions) {
        const sessionRef = doc(db, "empresas", empresaId, "colaboradores", selectedUser.id, "sessions", session.id);

        const startDate = toDateSafe(session.start);
        let endDate = session.end ? toDateSafe(session.end) : null;

        // Fecha automaticamente se não tem fim
        if (!endDate && startDate) {
          // Estima fim baseado na duração média
          endDate = new Date(startDate.getTime() + avgDuration * 1000);
          closed++;
        }

        if (startDate && endDate) {
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationSec = Math.floor(durationMs / 1000);

          // Aprova se estiver dentro dos padrões detectados
          if (durationSec >= minDuration && durationSec <= maxDuration) {
            const hourlyRate = selectedUser.effectiveHourlyRate || 0;
            const earnings = (durationSec / 3600) * hourlyRate;

            batch.update(sessionRef, {
              status: "approved",
              approvedAt: serverTimestamp(),
              approvedBy: currentUser?.uid,
              end: endDate,
              durationSec,
              earnings,
              autoClosedReason: "Fechamento inteligente - padrão detectado"
            });
            approved++;
          } else {
            batch.update(sessionRef, {
              status: "rejected",
              rejectedAt: serverTimestamp(),
              rejectedBy: currentUser?.uid,
              autoClosedReason: "Fora do padrão esperado"
            });
            rejected++;
          }
        }
      }

      await batch.commit();
      await loadSessions(selectedUser);
      showToast(`Fechamento inteligente concluído! ${approved} aprovadas, ${rejected} rejeitadas, ${closed} fechadas.`);
    } catch (error) {
      console.error("Erro no fechamento inteligente:", error);
      showToast("Erro no fechamento inteligente.");
    } finally {
      setLoading(false);
    }
  }

  /** Selecionar todos os pontos pendentes */
  function selectAllPending() {
    if (!selectedUser) return;

    const pendingIds = sessions
      .filter(s => (s.status || "pending") === "pending")
      .map(s => s.id);

    setSelectedIds(new Set(pendingIds));
    showToast(`${pendingIds.length} sessão(s) pendente(s) selecionada(s).`);
  }

  /** Export */
  const exportRows = filtered.map((s) => {
    const sDate = toDateSafe(s.start);
    const eDate = s.end ? toDateSafe(s.end) : null;
    return {
      start: sDate ? format(sDate, "dd/MM/yyyy HH:mm") : "",
      end: eDate ? format(eDate, "dd/MM/yyyy HH:mm") : "",
      durationSec: s.durationSec ?? 0,
      earnings: s.earnings ?? 0,
      status: s.status || "pending",
    };
  });

  /** Paginação */
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [filtered.length]);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const currentIds = pageRows.map((r) => r.id);

  /** UI helpers */
  function HeaderStep({
    n,
    title,
    done = false,
  }: {
    n: number;
    title: string;
    done?: boolean;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: done ? "#16a34a" : "rgba(255,255,255,.08)",
            color: done ? "#fff" : "#ccc",
            border: `1px solid ${
              done ? "rgba(22,163,74,.6)" : "rgba(255,255,255,.15)"
            }`,
            fontWeight: 700,
          }}
        >
          {done ? <Icon name="check" size={16} /> : n}
        </div>
        <div style={{ opacity: 0.9 }}>{title}</div>
      </div>
    );
  }

  function SortableTh({
    keyName,
    label,
  }: {
    keyName: typeof sortBy;
    label: string;
  }) {
    const active = sortBy === keyName;
    return (
      <th
        onClick={() => {
          if (active) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          setSortBy(keyName);
        }}
        style={{ cursor: "pointer", userSelect: "none" }}
        title="Clique para ordenar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{label}</span>
          {active && <Icon name="sort" size={16} />}
        </div>
      </th>
    );
  }

  /** NOVO: abrir/fechar modal de localização */
  function openLocModal(s: S) {
    const initial = s.liveLocation || s.locationEnd || s.locationStart;
    if (
      !initial ||
      typeof initial.lat !== "number" ||
      typeof initial.lng !== "number"
    ) {
      alert("Este registro não possui coordenadas salvas.");
      return;
    }
    setLocSession(s);
    setLocOpen(true);
  }
  function closeLocModal() {
    setLocOpen(false);
    setLocSession(null);
  }

  /** -----------------------------------------------------------
   * Nova lógica para Geofencing
   * ----------------------------------------------------------- */
  const handleApprove = async (sessionId: string, userId: string) => {
    if (!empresaId) return;
    await updateDoc(doc(db, "empresas", empresaId, "colaboradores", userId, "sessions", sessionId), {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: currentUser?.uid,
    });
    if (selectedUser) loadSessions(selectedUser);
  };

  const handleReject = async (sessionId: string, userId: string) => {
    if (!empresaId) return;
    await updateDoc(doc(db, "empresas", empresaId, "colaboradores", userId, "sessions", sessionId), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      rejectedBy: currentUser?.uid,
    });
    if (selectedUser) loadSessions(selectedUser);
  };

  const saveGeofencing = async () => {
    if (!companyLocation || !empresaId) return;

    try {
      await updateDoc(doc(db, "empresas", empresaId), {
        geofencing: companyLocation,
        updatedAt: serverTimestamp()
      });
      alert("Configuração de geofencing salva com sucesso!");
      // Tenta recarregar a configuração para garantir que a state está atualizada
      const companyDoc = await getDoc(doc(db, "empresas", empresaId));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data() as any;
        if (companyData.geofencing) {
          setCompanyLocation(companyData.geofencing);
        }
      }
    } catch (error) {
      console.error("Erro ao salvar geofencing:", error);
      alert("Erro ao salvar configuração.");
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCompanyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            radius: companyLocation?.radius || 100 // Mantém o raio existente ou usa padrão
          });
        },
        (error) => {
          alert("Erro ao obter localização: " + error.message);
        }
      );
    } else {
      alert("Geolocalização não suportada pelo navegador.");
    }
  };

  // Definição dos passos do tutorial para o dashboard da empresa
  const empresaTutorialSteps = [
    {
      id: "select-collaborator",
      title: "Selecione um Colaborador",
      content: "Escolha um funcionário da lista para visualizar suas sessões de ponto.",
      target: '[aria-label="Selecionar colaborador"]',
      placement: "bottom" as const,
    },
    {
      id: "filter-by-date",
      title: "Filtre por Data",
      content: "Use o campo de busca para filtrar por datas ou horários.",
      target: 'input[placeholder="Buscar por data (ex: 12/05)"]',
      placement: "bottom" as const,
    },
    {
      id: "filter-by-status",
      title: "Filtre por Status",
      content: "Visualize apenas pontos pendentes, aprovados ou rejeitados.",
      target: 'select[value="all"]',
      placement: "bottom" as const,
    },
    {
      id: "bulk-actions",
      title: "Ações em Massa",
      content: "Selecione vários pontos e aprove ou rejeite todos de uma vez.",
      target: 'button:has(svg[name="approveAll"])',
      placement: "right" as const,
    },
    {
      id: "export-data",
      title: "Exportar Dados",
      content: "Exporte os dados filtrados para planilhas.",
      target: 'button:has(svg[name="download"])',
      placement: "right" as const,
    },
    {
      id: "add-collaborator",
      title: "Adicionar Colaborador",
      content: "Cadastre novos membros na sua equipe.",
      target: 'button:has(svg[name="plus"])',
      placement: "left" as const,
    },
    {
      id: "geofencing",
      title: "Geofencing",
      content: "Configure a área permitida para registro de ponto.",
      target: 'button:has(svg[name="mapPin"])',
      placement: "top" as const,
    },
  ];

  return (
    <div className="container" style={{ paddingBottom: 88 }}>
      <Tutorial
        steps={empresaTutorialSteps}
        tutorialKey="empresa-dashboard"
        onComplete={() => console.log('Tutorial empresa completado')}
        onSkip={() => console.log('Tutorial empresa pulado')}
      />
      {/* TOP BAR */}
      <div
        className="card"
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          background:
            "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))",
        }}
      >
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <Tag tone="info">
              <Icon name="shield" /> Empresa • {meRole || "—"}
            </Tag>
            <h1 className="h1" style={{ margin: 0 }}>
              Painel de Ponto – Empresa
            </h1>
          </div>
          <button
            className="button button-ghost"
            onClick={() => {
              signOut(auth).then(() => {
                window.location.href = "/";
              }).catch((error) => {
                console.error("Erro ao fazer logout:", error);
                window.location.href = "/";
              });
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="back" /> Sair do painel
          </button>
        </div>

        {/* Fluxo de trabalho */}
        <div className="row" style={{ gap: 18, marginTop: 12, flexWrap: "wrap" }}>
          <HeaderStep n={1} title="Selecionar colaborador" done={!!selectedUser} />
          <HeaderStep n={2} title="Ajustar filtros e ordem" done={true} />
          <HeaderStep n={3} title="Revisar registros" done={filtered.length > 0} />
          <HeaderStep n={4} title="Aprovar / Rejeitar" done={false} />
          <HeaderStep n={5} title="Exportar e arquivar" done={false} />
        </div>
      </div>

      {/* Seletor de empresa para SUPERADMIN */}
      {meRole === "superadmin" && !empresaId && (
        <div className="card" style={{ marginTop: 14, padding: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Selecionar empresa (SuperAdmin)
          </div>
          <select
            className="input"
            onChange={(e) => {
              const val = e.target.value;
              setEmpresaId(val || null);
              // Ao selecionar uma empresa, reseta os dados e carrega config.
              if (val) {
                setSelectedUser(null);
                setSessions([]);
                const companyDoc = doc(db, "empresas", val);
                getDoc(companyDoc).then(snap => {
                  if (snap.exists()) {
                    const companyData = snap.data() as any;
                    if (companyData.geofencing) {
                      setCompanyLocation(companyData.geofencing);
                    } else {
                      setCompanyLocation(null); // Limpa se não houver config.
                    }
                  }
                });
              } else {
                setCompanyLocation(null); // Limpa se desmarcar empresa
              }
            }}
          >
            <option value="">— escolha uma empresa —</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome} ({e.id})
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
            Dica: também funciona acessar <code>/empresa/dashboard?empresaId=&lt;id&gt;</code>
          </div>
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO - Responsivas */}
      <div className="card" style={{
        marginTop: 14,
        padding: "clamp(12px, 3vw, 16px)",
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="row" style={{
          gap: "clamp(6px, 1.5vw, 12px)",
          flexWrap: isMounted && windowWidth < 768 ? 'wrap' : 'nowrap',
          justifyContent: isMounted && windowWidth < 640 ? 'center' : 'flex-start'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`button ${activeTab === tab.id ? 'button-primary' : 'button-ghost'}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "clamp(4px, 1vw, 6px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                minWidth: isMounted && windowWidth < 640 ? "auto" : "120px",
                whiteSpace: "nowrap"
              }}
            >
              <Icon name={tab.icon} size={isMounted && windowWidth < 768 ? 14 : 16} />
              {(!isMounted || windowWidth >= 480) && ` ${tab.label}`}
            </button>
          ))}
        </div>
      </div>

      {/* CONTROLES SUPERIORES (VISÃO GERAL) */}
      {activeTab === "overview" && (
        <div className="card" style={{ marginTop: 14, padding: 16 }}>
          <div className="row" style={{
            gap: "clamp(8px, 2vw, 12px)",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMounted && windowWidth < 768 ? "center" : "flex-start"
          }}>
            <select
              className="input"
              style={{
                maxWidth: isMounted && windowWidth < 768 ? "100%" : 360,
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px)"
              }}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                if (u) {
                  loadSessions(u);
                  if (isMounted && windowWidth < 768) {
                    showToast(`Carregando sessões de ${u.displayName || u.email}...`);
                  }
                }
              }}
              disabled={!empresaId}
              aria-label="Selecionar colaborador"
            >
              <option value="">
                {!empresaId ? "Selecione uma empresa" : "Selecione um colaborador"}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email}
                  {u.role && u.role !== "colaborador" ? ` (${u.role})` : ""}
                </option>
              ))}
            </select>

            <button
              className="button"
              disabled={!selectedUser}
              onClick={openEditModal}
              title="Editar dados do colaborador"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "clamp(4px, 1vw, 6px)",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)"
              }}
            >
              <Icon name="edit" size={isMounted && windowWidth < 768 ? 14 : 16} />
              {(!isMounted || windowWidth >= 640) && " Editar colaborador"}
            </button>

            <div
              className="input"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(6px, 1.5vw, 8px)",
                maxWidth: isMounted && windowWidth < 768 ? "100%" : 280,
                minWidth: isMounted && windowWidth < 768 ? "250px" : "auto"
              }}
            >
              <Icon name="search" size={isMounted && windowWidth < 768 ? 14 : 16} />
              <input
                className="input"
                style={{
                  border: "none",
                  flex: 1,
                  fontSize: "clamp(12px, 2.5vw, 14px)"
                }}
                placeholder="Buscar por data (ex: 12/05)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              style={{
                maxWidth: isMounted && windowWidth < 768 ? "100%" : 180,
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px)"
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Status: Todos</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Rejeitados</option>
            </select>

            <div className="row" style={{
              gap: "clamp(6px, 1.5vw, 8px)",
              flexWrap: "wrap",
              width: isMounted && windowWidth < 768 ? "100%" : "auto"
            }}>
              <div className="input" style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(6px, 1.5vw, 8px)",
                maxWidth: isMounted && windowWidth < 768 ? "calc(50% - 4px)" : 180,
                minWidth: isMounted && windowWidth < 768 ? "140px" : "auto"
              }}>
                <Icon name="calendar" size={isMounted && windowWidth < 768 ? 14 : 16} />
                <input
                  className="input"
                  style={{
                    border: "none",
                    flex: 1,
                    fontSize: "clamp(12px, 2.5vw, 14px)"
                  }}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="input" style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(6px, 1.5vw, 8px)",
                maxWidth: isMounted && windowWidth < 768 ? "calc(50% - 4px)" : 180,
                minWidth: isMounted && windowWidth < 768 ? "140px" : "auto"
              }}>
                <Icon name="calendar" size={isMounted && windowWidth < 768 ? 14 : 16} />
                <input
                  className="input"
                  style={{
                    border: "none",
                    flex: 1,
                    fontSize: "clamp(12px, 2.5vw, 14px)"
                  }}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <button
              className="button button-ghost"
              onClick={() => selectedUser && loadSessions(selectedUser)}
              title="Recarregar"
              disabled={!empresaId}
              style={{
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                display: "flex",
                alignItems: "center",
                gap: "clamp(4px, 1vw, 6px)"
              }}
            >
              <Icon name="refresh" size={isMounted && windowWidth < 768 ? 14 : 16} />
              {(!isMounted || windowWidth >= 640) && " Atualizar"}
            </button>

            {selectedUser && (
              <div className="row" style={{
                gap: "clamp(6px, 1.5vw, 8px)",
                flexWrap: "wrap",
                marginLeft: isMounted && windowWidth < 768 ? "0" : "auto",
                width: isMounted && windowWidth < 768 ? "100%" : "auto",
                justifyContent: isMounted && windowWidth < 768 ? "center" : "flex-start"
              }}>
                <ExportButtons
                  rows={exportRows}
                  filenameBase={`pontos_${selectedUser.displayName || selectedUser.email}`}
                />
              </div>
            )}
          </div>

          {/* KPIs */}
          <div className="grid" style={{ marginTop: 10 }}>
            <Kpi title="Total de horas (filtrado)" value={kpis.totalTime} />
            <Kpi title="A receber (filtrado)" value={kpis.totalEarn} tone="success" />
            <Kpi title="Pendentes" value={String(kpis.pending)} tone="warning" />
            <Kpi title="Aprovados" value={String(kpis.approved)} tone="success" />
            <Kpi title="Rejeitados" value={String(kpis.rejected)} tone="danger" />
          </div>

          {/* Ações em massa - Responsivo */}
          <div className="row" style={{
            gap: "clamp(6px, 1.5vw, 8px)",
            flexWrap: "wrap",
            marginTop: "clamp(8px, 2vw, 10px)",
            justifyContent: isMounted && windowWidth < 768 ? "center" : "flex-start"
          }}>
            <button
              className="button"
              onClick={() => bulkSetStatus("approved")}
              disabled={!selectedUser || selectedIds.size === 0}
              title="Aprovar selecionados"
              style={{
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                display: "flex",
                alignItems: "center",
                gap: "clamp(4px, 1vw, 6px)"
              }}
            >
              <Icon name="approveAll" size={isMounted && windowWidth < 768 ? 14 : 16} />
              {(!isMounted || windowWidth >= 640) ? " Aprovar selecionados" : " Aprovar"}
            </button>
            <button
              className="button"
              onClick={() => bulkSetStatus("rejected")}
              disabled={!selectedUser || selectedIds.size === 0}
              title="Rejeitar selecionados"
              style={{
                fontSize: "clamp(12px, 2.5vw, 14px)",
                padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
                display: "flex",
                alignItems: "center",
                gap: "clamp(4px, 1vw, 6px)"
              }}
            >
              <Icon name="rejectAll" size={isMounted && windowWidth < 768 ? 14 : 16} />
              {(!isMounted || windowWidth >= 640) ? " Rejeitar selecionados" : " Rejeitar"}
            </button>

            {/* Fechamento Automático Avançado */}
            <div className="row" style={{
              gap: "clamp(6px, 1.5vw, 8px)",
              padding: "clamp(8px, 2vw, 12px)",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "clamp(8px, 2vw, 12px)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <div style={{
                fontSize: "clamp(11px, 2.5vw, 13px)",
                fontWeight: "600",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <Icon name="clock" size={14} />
                Fechamento Automático:
              </div>

              <button
                className="button"
                onClick={autoCloseAllPending}
                disabled={!selectedUser || loading}
                title="Fechamento automático de todos os pontos pendentes"
                style={{
                  fontSize: "clamp(11px, 2.5vw, 13px)",
                  padding: "clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)",
                  background: "linear-gradient(45deg, #16a34a, #15803d)",
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(4px, 1vw, 6px)",
                  border: "1px solid rgba(22, 163, 74, 0.5)"
                }}
              >
                <Icon name="check" size={isMounted && windowWidth < 768 ? 12 : 14} />
                {(!isMounted || windowWidth >= 640) ? "Fechar Todos Pendentes" : "Fechar Todos"}
              </button>

              <button
                className="button"
                onClick={smartAutoClose}
                disabled={!selectedUser || loading}
                title="Fechamento inteligente baseado em padrões"
                style={{
                  fontSize: "clamp(11px, 2.5vw, 13px)",
                  padding: "clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)",
                  background: "linear-gradient(45deg, #8b5cf6, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(4px, 1vw, 6px)",
                  border: "1px solid rgba(139, 92, 246, 0.5)"
                }}
              >
                <Icon name="shield" size={isMounted && windowWidth < 768 ? 12 : 14} />
                {(!isMounted || windowWidth >= 640) ? "Fechamento Inteligente" : "Inteligente"}
              </button>

              <button
                className="button button-ghost"
                onClick={selectAllPending}
                disabled={!selectedUser}
                title="Selecionar todos os pontos pendentes"
                style={{
                  fontSize: "clamp(11px, 2.5vw, 13px)",
                  padding: "clamp(6px, 1.5vw, 8px) clamp(10px, 2.5vw, 14px)",
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(4px, 1vw, 6px)",
                  border: "1px solid rgba(245, 158, 11, 0.5)"
                }}
              >
                <Icon name="filter" size={isMounted && windowWidth < 768 ? 12 : 14} />
                {(!isMounted || windowWidth >= 640) ? "Selecionar Pendentes" : "Selecionar"}
              </button>
            </div>

            <Tag>
              <Icon name="status" size={isMounted && windowWidth < 768 ? 14 : 16} />
              {selectedIds.size} selecionado(s)
            </Tag>
          </div>
        </div>
      )}

      {/* TABELA DE SESSÕES */}
      {activeTab === "sessions" && (
        <div className="card" style={{ marginTop: 14, padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos da página"
                      checked={(() => {
                        const ids = pageRows.map((r) => r.id);
                        return ids.every((id) => selectedIds.has(id)) && ids.length > 0;
                      })()}
                      onChange={(e) => {
                        const ids = pageRows.map((r) => r.id);
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          ids.forEach((id) =>
                            e.currentTarget.checked ? next.add(id) : next.delete(id)
                          );
                          return next;
                        });
                      }}
                    />
                  </th>
                  <SortableTh keyName="start" label="Início" />
                  <SortableTh keyName="end" label="Fim" />
                  <SortableTh keyName="duration" label="Duração" />
                  <SortableTh keyName="earnings" label="Ganhos" />
                  <SortableTh keyName="status" label="Status" />
                  <th style={{ minWidth: 360 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: 18, opacity: 0.7 }}>
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 18, opacity: 0.7 }}>
                      Nenhum registro com os filtros atuais.
                    </td>
                  </tr>
                )}
                {!loading &&
                  pageRows.map((s) => {
                    const startD = toDateSafe(s.start);
                    const endD = s.end ? toDateSafe(s.end) : null;
                    const sec =
                      s.durationSec ??
                      (startD && endD
                        ? Math.max(0, Math.floor((endD.getTime() - startD.getTime()) / 1000))
                        : 0);
                    const dur = `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
                    const tone =
                      (s.status || "pending") === "approved"
                        ? "success"
                        : (s.status || "pending") === "rejected"
                        ? "danger"
                        : "warning";
                    return (
                      <tr key={s.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label="Selecionar registro"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleOne(s.id)}
                          />
                        </td>
                        <td>{startD ? format(startD, "dd/MM/yyyy HH:mm") : "—"}</td>
                        <td>{endD ? format(endD, "dd/MM/yyyy HH:mm") : "—"}</td>
                        <td>{dur}</td>
                        <td>{(s.earnings ?? 0).toFixed(2)}</td>
                        <td>
                          <Tag tone={tone as any}>
                            {(s.status || "pending") === "approved" ? (
                              <>Aprovado</>
                            ) : (s.status || "pending") === "rejected" ? (
                              <>Rejeitado</>
                            ) : (
                              <>Pendente</>
                            )}
                          </Tag>
                        </td>
                        <td className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="button button-ghost"
                            onClick={() => handleApprove(s.id, s.uid)}
                          >
                            <Icon name="check" /> Aprovar
                          </button>
                          <button
                            className="button button-ghost"
                            onClick={() => handleReject(s.id, s.uid)}
                          >
                            <Icon name="x" /> Rejeitar
                          </button>

                          {/* Ver localização */}
                          <button
                            className="button button-ghost"
                            title="Ver localização"
                            onClick={() => openLocModal(s)}
                          >
                            <Icon name="mapPin" /> Ver localização
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              padding: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Página {page} de {totalPages} — {filtered.length} registro(s) no filtro
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                className="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABELA DE COLABORADORES */}
      {activeTab === "users" && (
        <div className="card" style={{ marginTop: 14, padding: 16 }}>
          <div className="row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              className="button"
              onClick={() => setShowAddUserModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="plus" /> Adicionar colaborador
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Papel</th>
                  <th>Valor/Hora</th>
                  <th>Salário Mensal</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, opacity: 0.7 }}>
                      Carregando colaboradores...
                    </td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, opacity: 0.7 }}>
                      Nenhum colaborador encontrado para esta empresa.
                    </td>
                  </tr>
                )}
                {!loading && users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>{u.displayName || "—"}</td>
                    <td style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>{u.email}</td>
                    <td><Tag tone={(u.role === 'admin' ? 'info' : u.role === 'gestor' ? 'success' : 'neutral') as any}>{u.role || 'colaborador'}</Tag></td>
                    <td style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>R$ {u.effectiveHourlyRate?.toFixed(2) || "0.00"}/h</td>
                    <td style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}>R$ {u.monthlySalary?.toFixed(2) || "0.00"}</td>
                    <td>
                      <div style={{
                        display: "flex",
                        gap: "clamp(4px, 1vw, 8px)",
                        flexWrap: isMounted && windowWidth < 768 ? "wrap" : "nowrap",
                        justifyContent: isMounted && windowWidth < 768 ? "center" : "flex-start"
                      }}>
                        <button
                          className="button button-ghost"
                          onClick={() => {
                            loadSessions(u);
                            setActiveTab("sessions");
                            showToast(`Carregando sessões de ${u.displayName || u.email}...`);
                          }}
                          title="Ver sessões"
                          style={{
                            fontSize: "clamp(11px, 2vw, 13px)",
                            padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
                            minWidth: isMounted && windowWidth < 768 ? "auto" : "100px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Icon name="clock" size={isMounted && windowWidth < 768 ? 14 : 16} />
                          {(!isMounted || windowWidth >= 640) && " Ver sessões"}
                        </button>
                        <button
                          className="button button-ghost"
                          onClick={() => {
                            setEditForm({
                              id: u.id,
                              email: u.email,
                              displayName: u.displayName || "",
                              effectiveHourlyRate: u.effectiveHourlyRate ?? 0,
                              monthlySalary: u.monthlySalary ?? 0,
                              role: u.role || "colaborador",
                            });
                            setEditOpen(true);
                          }}
                          title="Editar colaborador"
                          style={{
                            fontSize: "clamp(11px, 2vw, 13px)",
                            padding: "clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 12px)",
                            minWidth: isMounted && windowWidth < 768 ? "auto" : "100px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <Icon name="edit" size={isMounted && windowWidth < 768 ? 14 : 16} />
                          {(!isMounted || windowWidth >= 640) && " Editar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA ESCALAS */}
      {activeTab === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              padding: "2rem",
              borderRadius: "25px",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
            }}
          >
            <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
              📅 Gestão de Escalas
            </h2>

            <ScheduleImporter
              companyId={empresaId || ""}
              onImportComplete={(results) => {
                if (results.errors.length > 0) {
                  alert(`Importação concluída com ${results.success} sucessos e ${results.errors.length} erros.`);
                } else {
                  alert(`${results.success} escalas importadas com sucesso!`);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ABA GEOFENCING */}
      {activeTab === "geofencing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              padding: "2rem",
              borderRadius: "25px",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
            }}
          >
            <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
              📍 Configuração de Geofencing
            </h2>

            <p style={{ marginBottom: "1rem", opacity: 0.8 }}>
              Configure a área permitida para registro de ponto. Colaboradores só poderão bater ponto dentro do raio definido.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                  Latitude da Empresa:
                </label>
                <input
                  type="number"
                  step="any"
                  value={companyLocation?.lat || ""}
                  onChange={(e) => setCompanyLocation(prev => prev ?
                    { ...prev, lat: parseFloat(e.target.value) || 0 } :
                    { lat: parseFloat(e.target.value) || 0, lng: 0, radius: 100 }
                  )}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    color: "white"
                  }}
                  placeholder="-23.550520"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                  Longitude da Empresa:
                </label>
                <input
                  type="number"
                  step="any"
                  value={companyLocation?.lng || ""}
                  onChange={(e) => setCompanyLocation(prev => prev ?
                    { ...prev, lng: parseFloat(e.target.value) || 0 } :
                    { lat: 0, lng: parseFloat(e.target.value) || 0, radius: 100 }
                  )}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    color: "white"
                  }}
                  placeholder="-46.633308"
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                  Raio Permitido (metros):
                </label>
                <input
                  type="number"
                  value={companyLocation?.radius || 100}
                  onChange={(e) => setCompanyLocation(prev => prev ?
                    { ...prev, radius: parseInt(e.target.value) || 100 } :
                    { lat: 0, lng: 0, radius: parseInt(e.target.value) || 100 }
                  )}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "8px",
                    color: "white"
                  }}
                  placeholder="100"
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  onClick={getCurrentLocation}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "rgba(59, 130, 246, 0.8)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  📍 Usar Localização Atual
                </button>

                <button
                  onClick={saveGeofencing}
                  disabled={!companyLocation}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: companyLocation ? "#16a34a" : "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: companyLocation ? "pointer" : "not-allowed"
                  }}
                >
                  💾 Salvar Configuração
                </button>
              </div>
            </div>

            {companyLocation && (
              <div style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px"
              }}>
                <h4 style={{ margin: "0 0 0.5rem 0", color: "#6ee7b7" }}>✅ Configuração Atual:</h4>
                <p style={{ margin: "0.25rem 0", fontSize: "14px" }}>
                  <strong>Coordenadas:</strong> {companyLocation.lat.toFixed(6)}, {companyLocation.lng.toFixed(6)}
                </p>
                <p style={{ margin: "0.25rem 0", fontSize: "14px" }}>
                  <strong>Raio:</strong> {companyLocation.radius} metros
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA FOLHA DE PAGAMENTO */}
      {activeTab === "payroll" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              padding: "2rem",
              borderRadius: "25px",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
            }}
          >
            <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
              💰 Integração de Folha de Pagamento
            </h2>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px" }}>
                Mês de Referência:
              </label>
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                style={{
                  padding: "0.75rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "16px"
                }}
              />
            </div>

            <PayrollExporter
              companyId={empresaId || ""}
              month={currentMonth}
            />
          </div>
        </div>
      )}

      {/* ABA RELATÓRIOS */}
      {activeTab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              padding: "2rem",
              borderRadius: "25px",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
            }}
          >
              <h2 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "1rem" }}>
                📊 Relatórios e Assinatura Eletrônica
              </h2>

              <ElectronicSignature
                reportId={`monthly_${empresaId}_${currentMonth}`}
                reportType="monthly"
                signerName={currentUser?.displayName || currentUser?.email || ""}
                signerEmail={currentUser?.email || ""}
                signerRole="Gestor da Empresa"
                onSignatureComplete={(signature) => {
                  console.log("Relatório assinado:", signature);
                  alert("Assinatura salva com sucesso!");
                }}
              />
            </div>
          </div>
      )}

      {/* FAB (adicionar colaborador) - Responsivo */}
      {activeTab === "users" && ["superadmin", "admin", "gestor"].includes(meRole || "") && (
        <div style={{
          position: "fixed",
          right: "clamp(16px, 4vw, 22px)",
          bottom: "clamp(80px, 15vh, 100px)",
          zIndex: 60
        }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowAddUserModal(true)}
              aria-label="Adicionar colaborador"
              style={{
                width: "clamp(48px, 12vw, 58px)",
                height: "clamp(48px, 12vw, 58px)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                boxShadow: "0 14px 36px rgba(34,197,94,.35)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: "clamp(14px, 3vw, 16px)"
              }}
              title="Adicionar colaborador/admin/gestor"
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <Icon name="plus" size={isMounted && windowWidth < 768 ? 20 : 26} />
            </button>
          </div>
        </div>
      )}

      {/* TOAST - Responsivo */}
      {toast && (
        <div
          style={{
            position: "fixed",
            right: "clamp(10px, 4vw, 20px)",
            bottom: "clamp(70px, 15vh, 92px)",
            left: isMounted && windowWidth < 640 ? "clamp(10px, 4vw, 20px)" : "auto",
            background: "rgba(17,17,17,.92)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10,
            padding: "clamp(8px, 2vw, 14px)",
            boxShadow: "0 10px 30px rgba(0,0,0,.5)",
            zIndex: 80,
            fontSize: "clamp(12px, 3vw, 14px)",
            textAlign: "center",
            maxWidth: isMounted && windowWidth < 640 ? "calc(100vw - 40px)" : "300px",
            wordWrap: "break-word"
          }}
        >
          {toast}
        </div>
      )}

      {/* MODAL: Editar colaborador */}
      {editOpen && (
        <div style={backdropStyle}>
          <div style={modalStyle}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                <Icon name="user" /> Editar colaborador
              </h3>
              <button className="button button-ghost" onClick={() => setEditOpen(false)}>
                <Icon name="x" /> Fechar
              </button>
            </div>
            <div className="stack" style={{ marginTop: 12, gap: 10 }}>
              <label className="stack">
                <span>Email</span>
                <input
                  className="input"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm((v) => ({ ...v, email: e.target.value }))}
                />
              </label>
              <label className="stack">
                <span>Nome</span>
                <input
                  className="input"
                  value={editForm.displayName || ""}
                  onChange={(e) => setEditForm((v) => ({ ...v, displayName: e.target.value }))}
                />
              </label>
              <div className="row" style={{ gap: 10 }}>
                <label className="stack" style={{ flex: 1 }}>
                  <span>Valor hora (R$)</span>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={editForm.effectiveHourlyRate ?? 0}
                    onChange={(e) =>
                      setEditForm((v) => ({ ...v, effectiveHourlyRate: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="stack" style={{ flex: 1 }}>
                  <span>Salário mensal (R$)</span>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={editForm.monthlySalary ?? 0}
                    onChange={(e) =>
                      setEditForm((v) => ({ ...v, monthlySalary: Number(e.target.value) }))
                    }
                  />
                </label>
              </div>

              <label className="stack">
                <span>Papel</span>
                <select
                  className="input"
                  value={editForm.role || "colaborador"}
                  onChange={(e) => setEditForm((v) => ({ ...v, role: e.target.value as U["role"] }))}
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="button button-ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </button>
              <button className="button" onClick={saveEdit}>
                <Icon name="check" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar colaborador/admin/gestor */}
      {showAddUserModal && (
        <div style={backdropStyle}>
          <div style={modalStyle}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                <Icon name="users" /> Adicionar colaborador
              </h3>
              <button className="button button-ghost" onClick={() => setShowAddUserModal(false)}>
                <Icon name="x" /> Fechar
              </button>
            </div>
            <div className="stack" style={{ marginTop: 12, gap: 10 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nome Completo:</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nome do colaborador"
                  />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dias trabalhados/mês:</label>
                  <input
                    type="number"
                    value={newUserWorkDays}
                    onChange={(e) => setNewUserWorkDays(Number(e.target.value))}
                    min="1"
                    max="31"
                    placeholder="22"
                  />
                </div>
                <div className="form-group">
                  <label>Tipo de remuneração:</label>
                  <select
                    value={newUserSalaryType}
                    onChange={(e) => {
                      const paymentType = e.target.value as 'hourly' | 'daily' | 'monthly';
                      setNewUserSalaryType(paymentType);
                      // Limpa outros campos ao mudar o tipo de salário para evitar confusão
                      if (paymentType !== 'hourly') setNewUserHourlyRate('');
                      if (paymentType !== 'daily') setNewUserDailyRate('');
                      if (paymentType !== 'monthly') setNewUserMonthlyRate('');
                    }}
                  >
                    <option value="monthly">Salário Mensal</option>
                    <option value="daily">Valor Diário</option>
                    <option value="hourly">Valor por Hora</option>
                  </select>
                </div>
              </div>

              <div className="salary-input-section">
                {newUserSalaryType === 'hourly' && (
                  <div className="form-group salary-highlight">
                    <label>💰 Valor por hora (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newUserHourlyRate}
                      onChange={(e) => setNewUserHourlyRate(e.target.value)}
                      placeholder="15.00"
                      className="salary-input"
                    />
                    <small>Exemplo: R$ 15,00/hora</small>
                  </div>
                )}

                {newUserSalaryType === 'daily' && (
                  <div className="form-group salary-highlight">
                    <label>💰 Valor por dia (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newUserDailyRate}
                      onChange={(e) => setNewUserDailyRate(e.target.value)}
                      placeholder="120.00"
                      className="salary-input"
                    />
                    <small>Exemplo: R$ 120,00/dia</small>
                  </div>
                )}

                {newUserSalaryType === 'monthly' && (
                  <div className="form-group salary-highlight">
                    <label>💰 Salário mensal (R$):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newUserMonthlyRate}
                      onChange={(e) => setNewUserMonthlyRate(e.target.value)}
                      placeholder="2500.00"
                      className="salary-input"
                    />
                    <small>Exemplo: R$ 2.500,00/mês</small>
                  </div>
                )}
              </div>

              <div className="button-group">
                <button
                  className="button primary"
                  onClick={handleAddColaborador}
                  disabled={isAddingUser}
                >
                  {isAddingUser ? "Adicionando..." : "💾 Adicionar Colaborador"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setShowAddUserModal(false)}
                  disabled={isAddingUser}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ver localização */}
      {locOpen && locSession && (
        <div style={backdropStyle}>
          <div style={{ ...modalStyle, width: "min(860px, 96vw)" }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                <Icon name="mapPin" /> Localização da sessão
              </h3>
              <button className="button button-ghost" onClick={() => setLocOpen(false)}>
                <Icon name="x" /> Fechar
              </button>
            </div>

            <div className="stack" style={{ marginTop: 12, gap: 12 }}>
              {(() => {
                const s = locSession!;
                const initial = (s.liveLocation as Geo) || (s.locationEnd as Geo) || (s.locationStart as Geo);
                const compare =
                  (s.locationStart as Geo) || (s.locationEnd as Geo) || (s.liveLocation as Geo);

                if (!initial || typeof initial.lat !== "number" || typeof initial.lng !== "number") {
                  return <div className="card" style={{ padding: 12 }}>Sem coordenadas para exibir.</div>;
                }

                return (
                  <LocationMap
                    lat={Number(initial.lat)}
                    lng={Number(initial.lng)}
                    accuracy={typeof initial.acc === "number" ? Number(initial.acc) : undefined}
                    label={initial.label || "Registro"}
                    compareTo={
                      compare && typeof compare.lat === "number" && typeof compare.lng === "number"
                        ? { lat: Number(compare.lat), lng: Number(compare.lng), label: "Âncora" }
                        : undefined
                    }
                    samePlaceRadius={120}
                    autoRefreshMs={300000} // 5m
                    docPath={
                      empresaId
                        ? `empresas/${empresaId}/colaboradores/${s.uid}/sessions/${s.id}`
                        : undefined
                    }
                    useGeoWatch={false}
                    autoRecenter
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** =============================================================
 * COMPONENTE PRINCIPAL COM SUSPENSE
 * ============================================================= */
export default function EmpresaDashboardPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <EmpresaDashboard />
    </Suspense>
  );
}

/** Estilos responsivos de modal */
const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
  padding: "clamp(10px, 4vw, 20px)",
};
const modalStyle: CSSProperties = {
  width: "min(760px, 100%)",
  maxWidth: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "var(--bg, #111)",
  color: "var(--fg, #fff)",
  border: "1px solid var(--border, rgba(255,255,255,.12))",
  borderRadius: "clamp(8px, 2vw, 12px)",
  padding: "clamp(12px, 3vw, 16px)",
  boxShadow: "0 30px 80px rgba(0,0,0,.5)",
};
