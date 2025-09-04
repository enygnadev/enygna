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

/** =============================================================
 * ÍCONES SVG MODERNOS COM ANIMAÇÕES
 * ============================================================= */
function ModernIcon({
  name,
  size = 20,
  className = "",
  animated = false,
}: {
  name: string;
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  const iconStyle = {
    width: size,
    height: size,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const animationClass = animated ? "animate-pulse" : "";

  const icons: Record<string, ReactNode> = {
    dashboard: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="9" rx="1" fill="currentColor" opacity="0.8"/>
        <rect x="14" y="3" width="7" height="5" rx="1" fill="currentColor" opacity="0.6"/>
        <rect x="14" y="12" width="7" height="9" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="3" y="16" width="7" height="5" rx="1" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
    users: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    clock: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
        {animated && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 12 12;360 12 12"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </svg>
    ),
    analytics: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
        <path d="M9 9l1.5-1.5L16 13l5-5" stroke="currentColor" strokeWidth="2"/>
        <circle cx="9" cy="9" r="2" fill="currentColor"/>
        <circle cx="16" cy="13" r="2" fill="currentColor"/>
      </svg>
    ),
    settings: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m11-7a4 4 0 0 1 0 8 4 4 0 0 1 0-8z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    check: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    x: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    search: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    filter: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    download: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
        <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    map: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6" stroke="currentColor" strokeWidth="2"/>
        <line x1="8" y1="2" x2="8" y2="18" stroke="currentColor" strokeWidth="2"/>
        <line x1="16" y1="6" x2="16" y2="22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    money: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    plus: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5"/>
      </svg>
    ),
    menu: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
        <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    trending: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke="currentColor" strokeWidth="2"/>
        <polyline points="17,6 23,6 23,12" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  };

  return icons[name] || <div style={iconStyle} />;
}

/** =============================================================
 * COMPONENTES UI MODERNOS
 * ============================================================= */
function GlassCard({
  children,
  className = "",
  hover = false,
  glow = false
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={`
        backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
        ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:-translate-y-1' : ''}
        ${glow ? 'shadow-lg shadow-blue-500/10' : ''}
        ${className}
      `}
    >
      {children}
    </div>
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
  const colorClasses = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    yellow: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    red: "from-red-500/20 to-pink-500/20 border-red-500/30",
    purple: "from-purple-500/20 to-indigo-500/20 border-purple-500/30"
  };

  const trendIcon = trend === "up" ? "↗" : trend === "down" ? "↘" : "→";
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <GlassCard className={`p-6 bg-gradient-to-br ${colorClasses[color]} hover group`} hover glow>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all">
          <ModernIcon name={icon} size={24} className={`text-${color}-400`} />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {trendIcon}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-white/70 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-white/50 text-xs">{subtitle}</p>
        )}
      </div>
    </GlassCard>
  );
}

function ModernButton({
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
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40",
    secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
    ghost: "text-white/70 hover:text-white hover:bg-white/10",
    danger: "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
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
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-all duration-200 hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
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
    <GlassCard className="p-2">
      <div className="flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <ModernIcon name={tab.icon} size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

/** =============================================================
 * COMPONENTE D3 PARA VISUALIZAÇÕES
 * ============================================================= */
function D3Chart({ data, type = "bar" }: { data: any[]; type?: "bar" | "line" | "pie" }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Aqui você implementaria as visualizações D3
    // Para este exemplo, vou criar um gráfico simples com SVG nativo
    const svg = svgRef.current;
    svg.innerHTML = '';

    if (type === "bar") {
      const maxValue = Math.max(...data.map(d => d.value));
      const barWidth = 300 / data.length - 10;

      data.forEach((d, i) => {
        const barHeight = (d.value / maxValue) * 150;

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (i * (barWidth + 10) + 10).toString());
        rect.setAttribute("y", (170 - barHeight).toString());
        rect.setAttribute("width", barWidth.toString());
        rect.setAttribute("height", barHeight.toString());
        rect.setAttribute("fill", `hsl(${200 + i * 30}, 70%, 60%)`);
        rect.setAttribute("rx", "4");

        // Animação
        rect.style.transform = `scaleY(0)`;
        rect.style.transformOrigin = 'bottom';
        rect.style.transition = `transform 0.6s ease-out`;

        svg.appendChild(rect);

        // Trigger animation
        setTimeout(() => {
          rect.style.transform = `scaleY(1)`;
        }, i * 100);

        // Label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (i * (barWidth + 10) + 10 + barWidth/2).toString());
        text.setAttribute("y", "190");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("font-size", "12");
        text.textContent = d.label;
        svg.appendChild(text);
      });
    }
  }, [data, type]);

  return (
    <div className="w-full h-48 flex items-center justify-center">
      <svg ref={svgRef} width="320" height="200" className="overflow-visible" />
    </div>
  );
}

/** =============================================================
 * TIPOS E HELPERS
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
 * COMPONENTE PRINCIPAL MODERNIZADO
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Tabs configuration
  const tabs = [
    { id: "overview", label: "Visão Geral", icon: "dashboard", count: sessions.length },
    { id: "sessions", label: "Sessões", icon: "clock", count: sessions.filter(s => s.status === "pending").length },
    { id: "users", label: "Colaboradores", icon: "users", count: users.length },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "geofencing", label: "Localização", icon: "map" },
    { id: "payroll", label: "Folha", icon: "money" },
  ];

  // Authentication and data loading logic (keeping existing logic)
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
      list.sort((a, b) => (a.displayName || b.email).localeCompare(b.displayName || b.email));
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
      totalHours: `${Math.floor(totalHours)}h ${Math.floor((totalHours % 1) * 60)}m`,
      totalEarnings: `R$ ${totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      pendingCount,
      approvedCount,
      activeUsers: users.length,
      sessionsToday: sessions.filter(s => {
        const date = toDateSafe(s.start);
        return date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      }).length
    };
  }, [filteredSessions, users.length, sessions]);

  // Chart data for D3
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        label: format(date, 'dd/MM'),
        value: sessions.filter(s => {
          const sDate = toDateSafe(s.start);
          return sDate && format(sDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        }).length
      };
    }).reverse();

    return last7Days;
  }, [sessions]);

  const handleSignOut = () => {
    signOut(auth).then(() => {
      window.location.href = "/";
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all lg:hidden"
            >
              <ModernIcon name="menu" size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard Empresarial</h1>
              <p className="text-white/60 text-sm">Sistema de Controle de Ponto</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassCard className="px-3 py-2">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Online</span>
              </div>
            </GlassCard>

            <ModernButton onClick={handleSignOut} variant="ghost" size="sm">
              Sair
            </ModernButton>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto p-6 gap-6">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 lg:w-64 flex-shrink-0`}>
          <div className="space-y-6">
            {/* User Selector */}
            <GlassCard className="p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <ModernIcon name="users" size={16} />
                Colaborador
              </h3>
              <select
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                onChange={(e) => {
                  const u = users.find(x => x.id === e.target.value);
                  if (u) loadSessions(u);
                }}
              >
                <option value="">Selecione um colaborador</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="text-black">
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-4">
              <h3 className="text-white font-medium mb-3">Resumo Rápido</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Colaboradores</span>
                  <span className="text-white font-medium">{users.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Sessões Hoje</span>
                  <span className="text-white font-medium">{metrics.sessionsToday}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Pendentes</span>
                  <span className="text-yellow-400 font-medium">{metrics.pendingCount}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
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
                  title="Total de Horas"
                  value={metrics.totalHours}
                  subtitle="Este período"
                  trend="up"
                  color="blue"
                />
                <MetricCard
                  icon="money"
                  title="Total a Receber"
                  value={metrics.totalEarnings}
                  subtitle="Valores calculados"
                  trend="up"
                  color="green"
                />
                <MetricCard
                  icon="users"
                  title="Colaboradores Ativos"
                  value={metrics.activeUsers.toString()}
                  subtitle="Total cadastrados"
                  trend="stable"
                  color="purple"
                />
                <MetricCard
                  icon="trending"
                  title="Sessões Pendentes"
                  value={metrics.pendingCount.toString()}
                  subtitle="Aguardando aprovação"
                  trend={metrics.pendingCount > 0 ? "up" : "stable"}
                  color="yellow"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <ModernIcon name="analytics" size={16} />
                    Sessões por Dia (7 dias)
                  </h3>
                  <D3Chart data={chartData} type="bar" />
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-white font-medium mb-4">Status das Sessões</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-white/80">Aprovadas</span>
                      </div>
                      <span className="text-white font-medium">{metrics.approvedCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-white/80">Pendentes</span>
                      </div>
                      <span className="text-white font-medium">{metrics.pendingCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span className="text-white/80">Rejeitadas</span>
                      </div>
                      <span className="text-white font-medium">
                        {filteredSessions.filter(s => s.status === "rejected").length}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Actions Section */}
              <GlassCard className="p-6">
                <h3 className="text-white font-medium mb-4">Ações Rápidas</h3>
                <div className="flex flex-wrap gap-3">
                  <ModernButton variant="primary">
                    <ModernIcon name="check" size={16} />
                    Aprovar Pendentes
                  </ModernButton>
                  <ModernButton variant="secondary">
                    <ModernIcon name="download" size={16} />
                    Exportar Relatório
                  </ModernButton>
                  <ModernButton variant="secondary">
                    <ModernIcon name="plus" size={16} />
                    Adicionar Colaborador
                  </ModernButton>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === "sessions" && selectedUser && (
            <div className="space-y-6">
              {/* Filters */}
              <GlassCard className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <ModernIcon name="search" size={16} className="text-white/60" />
                    <input
                      type="text"
                      placeholder="Buscar sessões..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-white placeholder-white/40 flex-1"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                  >
                    <option value="all" className="text-black">Todos</option>
                    <option value="pending" className="text-black">Pendentes</option>
                    <option value="approved" className="text-black">Aprovados</option>
                    <option value="rejected" className="text-black">Rejeitados</option>
                  </select>

                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                  />

                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white text-sm"
                  />
                </div>
              </GlassCard>

              {/* Sessions Table */}
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="text-left p-4 text-white/80 font-medium">Data/Hora</th>
                        <th className="text-left p-4 text-white/80 font-medium">Duração</th>
                        <th className="text-left p-4 text-white/80 font-medium">Ganhos</th>
                        <th className="text-left p-4 text-white/80 font-medium">Status</th>
                        <th className="text-left p-4 text-white/80 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-white/60">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
                              Carregando...
                            </div>
                          </td>
                        </tr>
                      ) : filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center p-8 text-white/60">
                            Nenhuma sessão encontrada
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((session) => {
                          const startDate = toDateSafe(session.start);
                          const endDate = session.end ? toDateSafe(session.end) : null;
                          const duration = session.durationSec ? Math.floor(session.durationSec / 60) : 0;

                          return (
                            <tr key={session.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <div className="text-white font-medium">
                                  {startDate ? format(startDate, "dd/MM/yyyy") : "—"}
                                </div>
                                <div className="text-white/60 text-sm">
                                  {startDate ? format(startDate, "HH:mm") : "—"} - {endDate ? format(endDate, "HH:mm") : "Em andamento"}
                                </div>
                              </td>
                              <td className="p-4 text-white">
                                {duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "—"}
                              </td>
                              <td className="p-4 text-white font-medium">
                                R$ {(session.earnings || 0).toFixed(2)}
                              </td>
                              <td className="p-4">
                                <span className={`
                                  inline-flex px-2 py-1 rounded-full text-xs font-medium
                                  ${(session.status || "pending") === "approved"
                                    ? "bg-green-400/20 text-green-400"
                                    : (session.status || "pending") === "rejected"
                                    ? "bg-red-400/20 text-red-400"
                                    : "bg-yellow-400/20 text-yellow-400"
                                  }
                                `}>
                                  {(session.status || "pending") === "approved" ? "Aprovado" :
                                   (session.status || "pending") === "rejected" ? "Rejeitado" : "Pendente"}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <ModernButton variant="ghost" size="sm">
                                    <ModernIcon name="check" size={14} />
                                  </ModernButton>
                                  <ModernButton variant="ghost" size="sm">
                                    <ModernIcon name="x" size={14} />
                                  </ModernButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Other tabs content would go here */}
          {activeTab !== "overview" && activeTab !== "sessions" && (
            <GlassCard className="p-8 text-center">
              <ModernIcon name="settings" size={48} className="text-white/40 mx-auto mb-4" />
              <h3 className="text-white font-medium text-lg mb-2">Em Desenvolvimento</h3>
              <p className="text-white/60">Esta seção está sendo desenvolvida.</p>
            </GlassCard>
          )}
        </main>
      </div>

      {/* Tutorial Component */}
      <Tutorial
        steps={[]}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto"></div>
          <p className="text-white/60">Carregando dashboard...</p>
        </div>
      </div>
    }>
      <ModernEmpresaDashboard />
    </Suspense>
  );
}