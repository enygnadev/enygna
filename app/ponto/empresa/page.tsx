
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
  where
} from "firebase/firestore";
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";
import ExportButtons from "@/src/components/ExportButtons";
import LocationMap from "@/src/components/LocationMap";
import ScheduleImporter from "@/src/components/ScheduleImporter";
import PayrollExporter from "@/src/components/PayrollExporter";
import ElectronicSignature from "@/src/components/ElectronicSignature";
import Tutorial from "@/src/components/Tutorial";
import { pontoEmpresaTutorialSteps } from "@/src/lib/tutorialSteps";

/** =============================================================
 * ÍCONES SVG MINIMALISTAS
 * ============================================================= */
function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const icons: Record<string, ReactNode> = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="3" width="7" height="9" rx="2" fill="currentColor" opacity="0.8"/>
        <rect x="14" y="3" width="7" height="5" rx="2" fill="currentColor" opacity="0.6"/>
        <rect x="14" y="12" width="7" height="9" rx="2" fill="currentColor" opacity="0.9"/>
        <rect x="3" y="16" width="7" height="5" rx="2" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    analytics: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
        <path d="M9 9l1.5-1.5L16 13l5-5" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="20,6 9,17 4,12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    x: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    filter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
        <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    menu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    bell: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2"/>
        <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    chevronDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  };

  return icons[name] || <div style={{ width: size, height: size }} />;
}

/** =============================================================
 * COMPONENTES UI MODERNOS E ELEGANTES
 * ============================================================= */
function Card({ 
  children, 
  className = "", 
  hover = false,
  padding = true 
}: { 
  children: ReactNode; 
  className?: string; 
  hover?: boolean;
  padding?: boolean;
}) {
  return (
    <div className={`
      bg-white rounded-xl border border-gray-200 shadow-sm
      ${hover ? 'hover:shadow-md transition-shadow duration-200' : ''}
      ${padding ? 'p-6' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = ""
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border-gray-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 border-red-600"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg border
        transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  color = "blue"
}: {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    yellow: "text-yellow-600 bg-yellow-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50"
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-gray-500"
  };

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div>
          <div className={`inline-flex p-3 rounded-lg ${colors[color]}`}>
            <Icon name={icon} size={24} />
          </div>
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}

function TabNavigation({
  tabs,
  activeTab,
  onTabChange
}: {
  tabs: Array<{ id: string; label: string; icon: string; count?: number }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}) {
  return (
    <Card padding={false} className="mb-6">
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Icon name={tab.icon} size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                ml-2 px-2 py-0.5 rounded-full text-xs font-medium
                ${activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };

  const labels = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado"
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${styles[status as keyof typeof styles] || styles.pending}
    `}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

/** =============================================================
 * TIPOS E HELPERS (mantendo a lógica existente)
 * ============================================================= */
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
      const ms = (x as any).seconds * 1000 + (typeof (x as any).nanoseconds === "number" ? Math.floor((x as any).nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** =============================================================
 * COMPONENTE PRINCIPAL REDESENHADO
 * ============================================================= */
function ModernEmpresaDashboard() {
  const params = useSearchParams();

  // Estados principais
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<U["role"] | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Estados de dados
  const [users, setUsers] = useState<U[]>([]);
  const [selectedUser, setSelectedUser] = useState<U | null>(null);
  const [sessions, setSessions] = useState<S[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Estados UI
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Tabs configuration
  const tabs = [
    { id: "overview", label: "Dashboard", icon: "dashboard", count: sessions.length },
    { id: "sessions", label: "Sessões", icon: "clock", count: sessions.filter(s => s.status === "pending").length },
    { id: "users", label: "Colaboradores", icon: "users", count: users.length },
    { id: "analytics", label: "Analytics", icon: "analytics" },
  ];

  // Authentication and data loading logic (mantendo a lógica existente)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setCurrentUser(u);

      try {
        const tk = await getIdTokenResult(u, true);
        const claims = tk.claims as any;
        const role = (claims.role || "colaborador") as U["role"];

        if (!["superadmin", "admin", "gestor"].includes(role || "")) {
          try {
            const userDocRef = doc(db, "users", u.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as any;
              const hasAdminRole = ["superadmin", "admin", "gestor"].includes(userData.role);
              const hasPontoAccess = userData.sistemasAtivos?.includes('ponto');
              const isEmpresaType = userData.tipo === 'empresa';

              if (hasAdminRole || hasPontoAccess || isEmpresaType) {
                setMeRole(userData.role || 'admin');
                const fromQS = params.get("empresaId");
                setEmpresaId(fromQS || userData.empresaId);
              } else {
                alert("Acesso negado. Usuário não tem permissão para acessar o sistema de ponto.");
                window.location.href = "/ponto/colaborador";
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
          const fromQS = params.get("empresaId");
          setEmpresaId(fromQS);
        }
      } catch (error) {
        console.error("Erro ao obter claims:", error);
        window.location.href = "/sistemas";
      }
    });
    return () => unsub();
  }, [params]);

  // Load users when empresaId changes
  useEffect(() => {
    if (empresaId) {
      loadUsers();
    }
  }, [empresaId]);

  const loadUsers = async () => {
    if (!empresaId) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "empresas", empresaId, "colaboradores"));
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
      list.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async (u: U) => {
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
      setSessions(snap.docs.map((d) => ({ id: d.id, uid: u.id, ...(d.data() as any) })));
    } finally {
      setLoading(false);
    }
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter !== "all" && (s.status || "pending") !== statusFilter) return false;

      const sDate = toDateSafe(s.start);
      if (search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        const startStr = sDate ? format(sDate, "dd/MM/yyyy HH:mm") : "";
        if (!startStr.toLowerCase().includes(searchTerm)) return false;
      }

      if (dateFrom && sDate && isBefore(sDate, startOfDay(parseISO(dateFrom)))) return false;
      if (dateTo && sDate && isAfter(sDate, endOfDay(parseISO(dateTo)))) return false;

      return true;
    });
  }, [sessions, statusFilter, search, dateFrom, dateTo]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalHours = filteredSessions.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 3600;
    const totalEarnings = filteredSessions.reduce((acc, s) => acc + (s.earnings || 0), 0);
    const pendingCount = filteredSessions.filter(s => (s.status || "pending") === "pending").length;
    const approvedCount = filteredSessions.filter(s => s.status === "approved").length;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalEarnings: totalEarnings,
      pendingCount,
      approvedCount,
      activeUsers: users.length,
      sessionsToday: sessions.filter(s => {
        const date = toDateSafe(s.start);
        return date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      }).length
    };
  }, [filteredSessions, users.length, sessions]);

  const handleSignOut = () => {
    signOut(auth).then(() => {
      window.location.href = "/";
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                <Icon name="menu" size={20} />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Dashboard Empresarial</h1>
                <p className="text-sm text-gray-500">Sistema de Controle de Ponto</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Online</span>
              </div>

              <Button onClick={() => window.location.href = "/sistemas"} variant="ghost" size="sm">
                <Icon name="home" size={16} />
                Sistemas
              </Button>

              <Button onClick={handleSignOut} variant="ghost" size="sm">
                <Icon name="logout" size={16} />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-80 flex-shrink-0`}>
            <div className="space-y-6 sticky top-24">
              {/* User Selector */}
              <Card>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Icon name="users" size={20} />
                    Colaboradores
                  </h3>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      const u = users.find(x => x.id === e.target.value);
                      if (u) loadSessions(u);
                    }}
                  >
                    <option value="">Selecione um colaborador</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Quick Stats */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Icon name="analytics" size={20} />
                  Resumo
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Colaboradores</span>
                    <span className="text-lg font-semibold text-gray-900">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sessões Hoje</span>
                    <span className="text-lg font-semibold text-gray-900">{metrics.sessionsToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pendentes</span>
                    <span className="text-lg font-semibold text-yellow-600">{metrics.pendingCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Aprovadas</span>
                    <span className="text-lg font-semibold text-green-600">{metrics.approvedCount}</span>
                  </div>
                </div>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Tab Navigation */}
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    icon="clock"
                    title="Horas Trabalhadas"
                    value={`${Math.floor(metrics.totalHours)}h ${Math.floor((metrics.totalHours % 1) * 60)}m`}
                    subtitle="Total do período"
                    trend="up"
                    color="blue"
                  />
                  <MetricCard
                    icon="bell"
                    title="Valor Total"
                    value={`R$ ${metrics.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="A pagar/receber"
                    trend="up"
                    color="green"
                  />
                  <MetricCard
                    icon="users"
                    title="Colaboradores"
                    value={metrics.activeUsers.toString()}
                    subtitle="Ativos no sistema"
                    trend="stable"
                    color="purple"
                  />
                  <MetricCard
                    icon="bell"
                    title="Pendências"
                    value={metrics.pendingCount.toString()}
                    subtitle="Precisam aprovação"
                    trend={metrics.pendingCount > 0 ? "up" : "stable"}
                    color="yellow"
                  />
                </div>

                {/* Action Buttons */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">
                      <Icon name="check" size={16} />
                      Aprovar Pendentes
                    </Button>
                    <Button variant="secondary">
                      <Icon name="download" size={16} />
                      Gerar Relatório
                    </Button>
                    <Button variant="secondary">
                      <Icon name="plus" size={16} />
                      Adicionar Colaborador
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && selectedUser && (
              <div className="space-y-6">
                {/* Filters */}
                <Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="relative">
                      <Icon name="search" size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar sessões..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Pendentes</option>
                      <option value="approved">Aprovados</option>
                      <option value="rejected">Rejeitados</option>
                    </select>

                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <Button variant="secondary">
                      <Icon name="filter" size={16} />
                      Filtrar
                    </Button>
                  </div>
                </Card>

                {/* Sessions Table */}
                <Card padding={false}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left p-4 text-sm font-medium text-gray-900">Data & Hora</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-900">Duração</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-900">Ganhos</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-900">Status</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="text-center p-8 text-gray-500">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                                <span>Carregando sessões...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredSessions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center p-8 text-gray-500">
                              <div className="space-y-2">
                                <Icon name="search" size={32} className="mx-auto text-gray-300" />
                                <p>Nenhuma sessão encontrada</p>
                                <p className="text-sm">Tente ajustar os filtros de busca</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredSessions.map((session) => {
                            const startDate = toDateSafe(session.start);
                            const endDate = session.end ? toDateSafe(session.end) : null;
                            const duration = session.durationSec ? Math.floor(session.durationSec / 60) : 0;

                            return (
                              <tr key={session.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {startDate ? format(startDate, "dd/MM/yyyy") : "—"}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {startDate ? format(startDate, "HH:mm") : "—"} - {endDate ? format(endDate, "HH:mm") : "Em andamento"}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-gray-900">
                                  {duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "—"}
                                </td>
                                <td className="p-4 text-sm font-medium text-green-600">
                                  R$ {(session.earnings || 0).toFixed(2)}
                                </td>
                                <td className="p-4">
                                  <StatusBadge status={session.status || "pending"} />
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button className="p-1 text-green-600 hover:bg-green-50 rounded">
                                      <Icon name="check" size={16} />
                                    </button>
                                    <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                                      <Icon name="x" size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Other tabs placeholder */}
            {(activeTab === "users" || activeTab === "analytics") && (
              <Card className="text-center py-12">
                <div className="space-y-4">
                  <Icon name="settings" size={48} className="mx-auto text-gray-300" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Seção em Desenvolvimento</h3>
                    <p className="text-gray-500 mt-1">Esta funcionalidade está sendo desenvolvida e estará disponível em breve.</p>
                  </div>
                  <Button variant="primary">
                    <Icon name="bell" size={16} />
                    Me Notificar Quando Ficar Pronto
                  </Button>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Tutorial Component */}
      <Tutorial
        steps={pontoEmpresaTutorialSteps}
        tutorialKey="empresa-dashboard-modern"
        onComplete={() => console.log('Tutorial completado')}
        onSkip={() => console.log('Tutorial pulado')}
      />
    </div>
  );
}

/** =============================================================
 * COMPONENTE WRAPPER COM SUSPENSE
 * ============================================================= */
export default function EmpresaDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">Carregando Dashboard...</h2>
            <p className="text-gray-500">Preparando seu ambiente de trabalho</p>
          </div>
        </div>
      </div>
    }>
      <ModernEmpresaDashboard />
    </Suspense>
  );
}
