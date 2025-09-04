
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
    home: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    bell: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    user: (
      <svg {...iconStyle} className={`${className} ${animationClass}`} viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  };

  return icons[name] || <div style={iconStyle} />;
}

/** =============================================================
 * COMPONENTES UI MODERNOS E ELEGANTES
 * ============================================================= */
function GlassCard({
  children,
  className = "",
  hover = false,
  glow = false,
  padding = "p-6"
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  padding?: string;
}) {
  return (
    <div
      className={`
        backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent
        border border-white/20 rounded-3xl
        shadow-2xl shadow-black/10
        ${hover ? 'transition-all duration-500 hover:bg-gradient-to-br hover:from-white/20 hover:via-white/10 hover:to-white/5 hover:border-white/30 hover:shadow-3xl hover:shadow-blue-500/20 hover:-translate-y-2 hover:scale-[1.02]' : ''}
        ${glow ? 'ring-1 ring-blue-500/30 shadow-blue-500/20' : ''}
        ${padding}
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
  color = "blue",
  large = false
}: {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "indigo" | "cyan";
  large?: boolean;
}) {
  const colorClasses = {
    blue: "from-blue-500/30 to-cyan-500/30 border-blue-400/40 text-blue-300",
    green: "from-green-500/30 to-emerald-500/30 border-green-400/40 text-green-300",
    yellow: "from-yellow-500/30 to-orange-500/30 border-yellow-400/40 text-yellow-300",
    red: "from-red-500/30 to-pink-500/30 border-red-400/40 text-red-300",
    purple: "from-purple-500/30 to-indigo-500/30 border-purple-400/40 text-purple-300",
    indigo: "from-indigo-500/30 to-blue-500/30 border-indigo-400/40 text-indigo-300",
    cyan: "from-cyan-500/30 to-teal-500/30 border-cyan-400/40 text-cyan-300"
  };

  const trendIcon = trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-gradient-to-br ${colorClasses[color]} border-2 backdrop-blur-xl
        transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-${color}-500/30
        group cursor-pointer
        ${large ? 'col-span-2' : ''}
      `}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} shadow-lg group-hover:scale-110 transition-all duration-300`}>
            <ModernIcon name={icon} size={large ? 32 : 24} className="text-white" />
          </div>
          {trend && (
            <div className={`text-sm font-bold ${trendColor} bg-black/20 px-3 py-1 rounded-full`}>
              {trendIcon}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{title}</p>
          <p className={`font-black ${large ? 'text-4xl' : 'text-3xl'} text-white leading-none`}>{value}</p>
          {subtitle && (
            <p className="text-white/60 text-xs font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
    </div>
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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105",
    secondary: "bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 text-white border border-gray-600 hover:border-gray-400 shadow-xl hover:shadow-gray-500/40",
    ghost: "text-white/80 hover:text-white hover:bg-white/10 border border-white/20 hover:border-white/40 backdrop-blur-sm",
    danger: "bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 hover:scale-105",
    success: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-2xl shadow-green-500/40 hover:shadow-green-500/60 hover:scale-105"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-3 font-bold rounded-2xl
        transition-all duration-300 transform-gpu
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-4 focus:ring-white/20
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading && (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
    <GlassCard padding="p-2" className="mb-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-3 px-6 py-3 rounded-2xl font-bold
              transition-all duration-300 whitespace-nowrap group
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-xl shadow-blue-500/30 scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
              }
            `}
          >
            <ModernIcon name={tab.icon} size={18} animated={activeTab === tab.id} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`
                px-3 py-1 rounded-full text-xs font-black
                ${activeTab === tab.id 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-500/80 text-white group-hover:bg-blue-500'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </GlassCard>
  );
}

/** =============================================================
 * COMPONENTE D3 MELHORADO PARA VISUALIZAÇÕES
 * ============================================================= */
function D3Chart({ data, type = "bar", title }: { data: any[]; type?: "bar" | "line" | "pie"; title?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = svgRef.current;
    svg.innerHTML = '';

    if (type === "bar") {
      const maxValue = Math.max(...data.map(d => d.value || 0));
      const barWidth = (320 - 40) / data.length - 8;

      data.forEach((d, i) => {
        const barHeight = maxValue > 0 ? (d.value / maxValue) * 140 : 0;
        const hue = 200 + i * 25;

        // Background bar
        const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bgRect.setAttribute("x", (i * (barWidth + 8) + 20).toString());
        bgRect.setAttribute("y", "20");
        bgRect.setAttribute("width", barWidth.toString());
        bgRect.setAttribute("height", "140");
        bgRect.setAttribute("fill", `hsla(${hue}, 50%, 50%, 0.1)`);
        bgRect.setAttribute("rx", "8");
        svg.appendChild(bgRect);

        // Animated bar
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (i * (barWidth + 8) + 20).toString());
        rect.setAttribute("y", (160 - barHeight).toString());
        rect.setAttribute("width", barWidth.toString());
        rect.setAttribute("height", barHeight.toString());
        rect.setAttribute("fill", `url(#gradient-${i})`);
        rect.setAttribute("rx", "8");

        // Gradient definition
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", `gradient-${i}`);
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("x2", "0%");
        gradient.setAttribute("y2", "100%");

        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", `hsl(${hue}, 70%, 60%)`);
        
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", `hsl(${hue}, 70%, 40%)`);

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Animation
        rect.style.transform = `scaleY(0)`;
        rect.style.transformOrigin = 'bottom';
        rect.style.transition = `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)`;

        svg.appendChild(rect);

        // Trigger animation
        setTimeout(() => {
          rect.style.transform = `scaleY(1)`;
        }, i * 150);

        // Value label
        if (barHeight > 20) {
          const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          valueText.setAttribute("x", (i * (barWidth + 8) + 20 + barWidth/2).toString());
          valueText.setAttribute("y", (160 - barHeight + 16).toString());
          valueText.setAttribute("text-anchor", "middle");
          valueText.setAttribute("fill", "white");
          valueText.setAttribute("font-size", "12");
          valueText.setAttribute("font-weight", "bold");
          valueText.textContent = d.value?.toString() || "0";
          svg.appendChild(valueText);
        }

        // Label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (i * (barWidth + 8) + 20 + barWidth/2).toString());
        text.setAttribute("y", "180");
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "white");
        text.setAttribute("font-size", "11");
        text.setAttribute("font-weight", "600");
        text.textContent = d.label || "";
        svg.appendChild(text);
      });
    }
  }, [data, type]);

  return (
    <GlassCard className="p-6">
      {title && (
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <ModernIcon name="analytics" size={20} />
          {title}
        </h3>
      )}
      <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-2xl bg-black/20">
        <svg ref={svgRef} width="320" height="200" className="overflow-visible" />
      </div>
    </GlassCard>
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
 * COMPONENTE PRINCIPAL COMPLETAMENTE REDESENHADO
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
    { id: "overview", label: "Dashboard", icon: "dashboard", count: sessions.length },
    { id: "sessions", label: "Sessões", icon: "clock", count: sessions.filter(s => s.status === "pending").length },
    { id: "users", label: "Colaboradores", icon: "users", count: users.length },
    { id: "analytics", label: "Analytics", icon: "analytics" },
    { id: "geofencing", label: "Localização", icon: "map" },
    { id: "payroll", label: "Folha", icon: "money" },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 via-purple-900 to-slate-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-2/3 right-1/4 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 gap-4 h-full">
          {Array.from({ length: 120 }, (_, i) => (
            <div key={i} className="border border-white/10 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-20 p-6 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <GlassCard padding="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-110"
                >
                  <ModernIcon name="menu" size={24} />
                </button>
                <div>
                  <h1 className="text-3xl font-black text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    Dashboard Empresarial
                  </h1>
                  <p className="text-white/60 font-medium">Sistema Avançado de Controle de Ponto</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <GlassCard padding="px-4 py-2" glow>
                  <div className="flex items-center gap-3 text-white/90">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                    <span className="font-bold">Sistema Online</span>
                  </div>
                </GlassCard>

                <ModernButton onClick={() => window.location.href = "/sistemas"} variant="ghost" size="md">
                  <ModernIcon name="home" size={18} />
                  Sistemas
                </ModernButton>

                <ModernButton onClick={handleSignOut} variant="danger" size="md">
                  Sair
                </ModernButton>
              </div>
            </div>
          </GlassCard>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'} transition-all duration-500 lg:w-80 flex-shrink-0`}>
            <div className="space-y-6 sticky top-6">
              {/* User Selector */}
              <GlassCard glow>
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    <ModernIcon name="user" size={20} />
                    Selecionar Colaborador
                  </h3>
                  <select
                    className="w-full p-4 bg-gradient-to-r from-white/10 to-white/5 border border-white/30 rounded-2xl text-white text-sm font-medium backdrop-blur-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                    onChange={(e) => {
                      const u = users.find(x => x.id === e.target.value);
                      if (u) loadSessions(u);
                    }}
                  >
                    <option value="" className="text-black bg-gray-800">Escolha um colaborador</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="text-black bg-gray-800">
                        {u.displayName || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </GlassCard>

              {/* Quick Stats */}
              <GlassCard>
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-3">
                  <ModernIcon name="analytics" size={20} />
                  Resumo Executivo
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-400/30">
                    <span className="text-white/80 font-medium">Colaboradores</span>
                    <span className="text-white font-black text-xl">{users.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-400/30">
                    <span className="text-white/80 font-medium">Sessões Hoje</span>
                    <span className="text-white font-black text-xl">{metrics.sessionsToday}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-400/30">
                    <span className="text-white/80 font-medium">Pendentes</span>
                    <span className="text-white font-black text-xl">{metrics.pendingCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl border border-purple-400/30">
                    <span className="text-white/80 font-medium">Total Aprovadas</span>
                    <span className="text-white font-black text-xl">{metrics.approvedCount}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-8">
            {/* Tab Navigation */}
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-8">
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
                    icon="money"
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

                {/* Charts and Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <D3Chart 
                    data={chartData} 
                    type="bar" 
                    title="Atividade dos Últimos 7 Dias"
                  />

                  <GlassCard className="p-8">
                    <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-3">
                      <ModernIcon name="trending" size={22} />
                      Status das Sessões
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl border border-green-400/30">
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-white font-bold">Aprovadas</span>
                        </div>
                        <span className="text-white font-black text-xl">{metrics.approvedCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-2xl border border-yellow-400/30">
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                          <span className="text-white font-bold">Pendentes</span>
                        </div>
                        <span className="text-white font-black text-xl">{metrics.pendingCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-500/30 to-pink-500/30 rounded-2xl border border-red-400/30">
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 bg-red-400 rounded-full animate-pulse"></div>
                          <span className="text-white font-bold">Rejeitadas</span>
                        </div>
                        <span className="text-white font-black text-xl">
                          {filteredSessions.filter(s => s.status === "rejected").length}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Action Buttons */}
                <GlassCard className="p-8">
                  <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-3">
                    <ModernIcon name="settings" size={22} />
                    Ações Rápidas
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <ModernButton variant="primary" size="lg">
                      <ModernIcon name="check" size={20} />
                      Aprovar Sessões Pendentes
                    </ModernButton>
                    <ModernButton variant="secondary" size="lg">
                      <ModernIcon name="download" size={20} />
                      Gerar Relatório Completo
                    </ModernButton>
                    <ModernButton variant="success" size="lg">
                      <ModernIcon name="plus" size={20} />
                      Adicionar Colaborador
                    </ModernButton>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === "sessions" && selectedUser && (
              <div className="space-y-8">
                {/* Filters */}
                <GlassCard className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/20">
                      <ModernIcon name="search" size={18} className="text-white/60" />
                      <input
                        type="text"
                        placeholder="Buscar sessões..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-white placeholder-white/50 flex-1 font-medium"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-white/10 border border-white/30 rounded-2xl px-4 py-3 text-white font-medium backdrop-blur-xl focus:border-blue-400"
                    >
                      <option value="all" className="text-black bg-gray-800">📋 Todos</option>
                      <option value="pending" className="text-black bg-gray-800">⏳ Pendentes</option>
                      <option value="approved" className="text-black bg-gray-800">✅ Aprovados</option>
                      <option value="rejected" className="text-black bg-gray-800">❌ Rejeitados</option>
                    </select>

                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white/10 border border-white/30 rounded-2xl px-4 py-3 text-white font-medium backdrop-blur-xl focus:border-blue-400"
                    />

                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white/10 border border-white/30 rounded-2xl px-4 py-3 text-white font-medium backdrop-blur-xl focus:border-blue-400"
                    />

                    <ModernButton variant="primary" size="md">
                      <ModernIcon name="filter" size={16} />
                      Filtrar
                    </ModernButton>
                  </div>
                </GlassCard>

                {/* Sessions Table */}
                <GlassCard className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10">
                          <th className="text-left p-6 text-white font-bold uppercase tracking-wider">Data & Hora</th>
                          <th className="text-left p-6 text-white font-bold uppercase tracking-wider">Duração</th>
                          <th className="text-left p-6 text-white font-bold uppercase tracking-wider">Ganhos</th>
                          <th className="text-left p-6 text-white font-bold uppercase tracking-wider">Status</th>
                          <th className="text-left p-6 text-white font-bold uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="text-center p-12 text-white/70">
                              <div className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"></div>
                                <span className="font-bold text-lg">Carregando sessões...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredSessions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center p-12 text-white/70">
                              <div className="space-y-3">
                                <ModernIcon name="search" size={48} className="mx-auto text-white/30" />
                                <p className="font-bold text-lg">Nenhuma sessão encontrada</p>
                                <p className="text-sm">Tente ajustar os filtros de busca</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredSessions.map((session, index) => {
                            const startDate = toDateSafe(session.start);
                            const endDate = session.end ? toDateSafe(session.end) : null;
                            const duration = session.durationSec ? Math.floor(session.durationSec / 60) : 0;

                            return (
                              <tr 
                                key={session.id} 
                                className="border-b border-white/5 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 transition-all duration-300 group"
                                style={{ animationDelay: `${index * 0.1}s` }}
                              >
                                <td className="p-6">
                                  <div className="space-y-1">
                                    <div className="text-white font-bold text-lg">
                                      {startDate ? format(startDate, "dd/MM/yyyy") : "—"}
                                    </div>
                                    <div className="text-white/70 font-medium">
                                      {startDate ? format(startDate, "HH:mm") : "—"} - {endDate ? format(endDate, "HH:mm") : "Em andamento"}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-6">
                                  <span className="text-white font-bold text-lg">
                                    {duration > 0 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "—"}
                                  </span>
                                </td>
                                <td className="p-6">
                                  <span className="text-green-400 font-black text-lg">
                                    R$ {(session.earnings || 0).toFixed(2)}
                                  </span>
                                </td>
                                <td className="p-6">
                                  <span className={`
                                    inline-flex px-4 py-2 rounded-full text-sm font-black uppercase tracking-wider
                                    ${(session.status || "pending") === "approved"
                                      ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border border-green-400/30"
                                      : (session.status || "pending") === "rejected"
                                      ? "bg-gradient-to-r from-red-500/30 to-pink-500/30 text-red-300 border border-red-400/30"
                                      : "bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-300 border border-yellow-400/30"
                                    }
                                  `}>
                                    {(session.status || "pending") === "approved" ? "✅ Aprovado" :
                                     (session.status || "pending") === "rejected" ? "❌ Rejeitado" : "⏳ Pendente"}
                                  </span>
                                </td>
                                <td className="p-6">
                                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <ModernButton variant="success" size="sm">
                                      <ModernIcon name="check" size={16} />
                                    </ModernButton>
                                    <ModernButton variant="danger" size="sm">
                                      <ModernIcon name="x" size={16} />
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

            {/* Other tabs placeholder */}
            {activeTab !== "overview" && activeTab !== "sessions" && (
              <GlassCard className="p-12 text-center">
                <div className="space-y-6">
                  <ModernIcon name="settings" size={64} className="text-white/30 mx-auto" />
                  <div className="space-y-3">
                    <h3 className="text-white font-black text-2xl">Seção em Desenvolvimento</h3>
                    <p className="text-white/60 font-medium">Esta funcionalidade está sendo desenvolvida e estará disponível em breve.</p>
                  </div>
                  <ModernButton variant="primary" size="lg">
                    <ModernIcon name="bell" size={20} />
                    Me Notificar Quando Ficar Pronto
                  </ModernButton>
                </div>
              </GlassCard>
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

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        /* Scrollbar customization */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #2563eb, #7c3aed);
        }
      `}</style>
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
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-white font-bold text-xl">Carregando Dashboard...</h2>
            <p className="text-white/60 font-medium">Preparando seu ambiente de trabalho</p>
          </div>
        </div>
      </div>
    }>
      <ModernEmpresaDashboard />
    </Suspense>
  );
}
