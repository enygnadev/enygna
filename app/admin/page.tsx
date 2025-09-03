'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
// imports do Firestore (garanta que getDoc está presente)
import {
  doc as docRef,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
  serverTimestamp,
  startAfter,
  addDoc,
} from "firebase/firestore";

import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Tutorial from '@/components/Tutorial';
import { monitoringService } from '@/lib/monitoring';
import { notificationService } from '@/lib/notifications';
import { backupService } from '@/lib/backupService';
import { cacheService } from '@/lib/cache';
import { realTimeMonitoring } from '@/lib/realTimeMonitoring';
import { advancedAnalytics } from '@/lib/advancedAnalytics';
import EmpresaManager from '@/src/components/EmpresaManager';
import PlanControlPanel from '@/src/components/PlanControlPanel';
import { useRouter } from 'next/navigation'; // Importar useRouter

// ==================== INTERFACES ====================
interface Company {
  id: string;
  name: string;
  nome?: string; // Campo para nome em português
  email: string;
  createdAt: any;
  criadoEm?: any; // Campo para data de criação em português
  plan?: string; // Campo para plano
  active: boolean;
  ativo?: boolean; // Campo para status ativo em português
  employees: number;
  monthlyRevenue: number;
  lastActivity: any;
  settings: {
    geofencing: boolean;
    requireSelfie: boolean;
    emailNotifications: boolean;
    workingHours: {
      start: string;
      end: string;
    };
  };
  address?: string;
  cnpj?: string;
  phone?: string;
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'inactive' | 'trial' | 'suspended';
    nextBilling: any;
    features: string[];
  };
  sistemasAtivos?: string[]; // Campo adicionado para sistemas ativos
  plano?: string; // Campo para plano caso subscription não esteja preenchido
}

interface Employee {
  id: string;
  name: string;
  email: string;
  company: string;
  companyName: string;
  role: string;
  active: boolean;
  lastPunch: any;
  totalHours: number;
  monthlyEarnings: number;
  createdAt: any;
  avatar?: string;
  department?: string;
  position?: string;
  salary?: number;
  cpf?: string;
  phone?: string;
  address?: string;
  permissions: string[];
  metrics: {
    punctuality: number;
    attendance: number;
    productivity: number;
  };
}

interface Analytics {
  totalCompanies: number;
  totalEmployees: number;
  activeCompanies: number;
  monthlyRevenue: number;
  growthRate: number;
  topCompanies: Company[];
  recentActivity: any[];
  metrics: {
    totalSessions: number;
    averageWorkHours: number;
    lateArrivals: number;
    earlyDepartures: number;
    overtimeHours: number;
  };
  trends: {
    userGrowth: number[];
    revenueGrowth: number[];
    activityTrend: number[];
  };
}

interface Notification {
  id: string;
  type: 'delay' | 'absence' | 'overtime' | 'system' | 'payment' | 'security';
  company: string;
  employee: string;
  message: string;
  timestamp: any;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions?: {
    label: string;
    action: string;
  }[];
}

interface SystemSettings {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxCompaniesPerUser: number;
  maxEmployeesPerCompany: number;
  systemNotifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  security: {
    requireMFA: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
    };
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retention: number;
  };
}

// Interfaces da Central de Inteligência
interface Alert {
  id: string;
  type: 'security' | 'system' | 'business' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  title?: string;
  description?: string;
  timestamp: any;
  companyId?: string;
  employeeId?: string;
  resolved?: boolean;
  resolvedAt?: any;
  resolvedBy?: string;
  data?: any;
}

interface SecurityEvent {
  id?: string;
  event?: string;
  timestamp: any;
  userId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
  type?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

interface RealTimeMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  networkTraffic?: number;
  averageResponseTime?: number;
  health?: { status: string; checks: any[] };
  lastUpdate?: Date;
  startTime?: number;
  lastUpdated?: Date;
  uptime?: number;
}

interface IntelligenceData {
  security?: {
    failedLogins: number;
    suspiciousAccess: number;
    geofenceViolations: number;
    totalEvents: number;
  };
  trends?: {
    securityTrend: 'stable' | 'increasing' | 'decreasing';
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ==================== TUTORIAL STEPS ====================
const adminTutorialSteps = [
  {
    id: 'welcome-admin',
    title: 'Bem-vindo ao Painel Master Admin! 👑',
    content: 'Este é o centro de controle absoluto do sistema. Aqui você gerencia tudo com poder total.',
    target: '.admin-header',
    placement: 'bottom' as const,
    showSkip: true
  },
  {
    id: 'metrics-dashboard',
    title: 'Métricas em Tempo Real 📊',
    content: 'Acompanhe o desempenho do sistema, receita, crescimento e todas as métricas importantes instantaneamente.',
    target: '.dashboard-metrics',
    placement: 'bottom' as const
  },
  {
    id: 'navigation-tabs',
    title: 'Navegação Avançada 🚀',
    content: 'Use as abas para acessar diferentes áreas: Dashboard, Empresas, Funcionários, Analytics, Notificações, Relatórios, Configurações, Logs e Criação de Admin.',
    target: '.navigation-tabs',
    placement: 'bottom' as const
  },
  {
    id: 'companies-management',
    title: 'Gerenciamento Total de Empresas 🏢',
    content: 'Visualize, edite, ative/desative, gerencie planos e controle completamente todas as empresas do sistema.',
    target: '.companies-section',
    placement: 'top' as const
  },
  {
    id: 'employees-control',
    title: 'Controle Absoluto de Funcionários 👥',
    content: 'Monitore desempenho, altere permissões, visualize métricas detalhadas e gerencie todos os funcionários.',
    target: '.employees-section',
    placement: 'top' as const
  },
  {
    id: 'notifications-section',
    title: 'Central de Inteligência 🔔',
    content: 'Receba alertas críticos, notificações de segurança e monitore todas as atividades suspeitas.',
    target: '.notifications-section',
    placement: 'top' as const
  },
  {
    id: 'system-settings',
    title: 'Configurações do Sistema ⚙️',
    content: 'Configure políticas de segurança, modos de manutenção, backups automáticos e todas as configurações críticas.',
    target: '.settings-section',
    placement: 'top' as const
  },
  {
    id: 'create-admin-section',
    title: 'Criação de Administrador 👑',
    content: 'Adicione novos Super Administradores com acesso total ao sistema de forma segura.',
    target: '.create-admin-section',
    placement: 'top' as const
  },
  {
    id: 'power-unlocked',
    title: 'Poder Total Desbloqueado! 🎯',
    content: 'Agora você tem controle completo. Use sabiamente este poder para manter o sistema funcionando perfeitamente!',
    target: 'body',
    placement: 'top' as const
  },
];

// Componente para criar Super Admin
function SuperAdminCreateForm() {
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const handleCreateSuperAdmin = async () => {
    if (!createEmail || !createPassword || !createName) {
      setCreateError('Todos os campos são obrigatórios.');
      return;
    }

    if (createPassword.length < 6) {
      setCreateError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, createEmail, createPassword);
      const newUser = userCredential.user;

      // Atualizar profile
      await updateProfile(newUser, {
        displayName: createName
      });

      // Criar documento no Firestore com role superadmin
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: createEmail,
        displayName: createName,
        role: 'superadmin',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        isActive: true,
        permissions: ['all'],
        lastLogin: null
      });

      // Log da ação crítica
      await addDoc(collection(db, 'admin_actions'), {
        adminId: auth.currentUser?.uid,
        action: 'super_admin_created',
        targetEmail: createEmail,
        targetUid: newUser.uid,
        timestamp: serverTimestamp(),
        severity: 'critical',
        details: {
          createdUserName: createName,
          createdUserEmail: createEmail
        }
      });

      setCreateSuccess(`✅ Super Administrador "${createName}" criado com sucesso!\n📧 Email: ${createEmail}\n🔑 UID: ${newUser.uid}`);
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');

      // Fazer logout apenas do usuário recém-criado, mantendo admin logado
      // Não fazer reload da página para manter o admin no painel
      console.log('Super Admin criado com sucesso, mantendo sessão do admin atual');

    } catch (error: any) {
      console.error('Erro ao criar super admin:', error);

      if (error.code === 'auth/email-already-in-use') {
        setCreateError('❌ Este email já está em uso. Escolha outro email.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateError('❌ Email inválido. Verifique o formato do email.');
      } else if (error.code === 'auth/weak-password') {
        setCreateError('❌ Senha muito fraca. Use uma senha mais forte.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setCreateError('❌ Criação de contas desabilitada. Contate o desenvolvedor.');
      } else {
        setCreateError(`❌ Erro: ${error.message || 'Falha desconhecida'}`);
      }
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      alignItems: 'start'
    }}>
      {/* Formulário de Criação */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h4 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#ffffff'
        }}>
          📝 Dados do Novo Super Admin
        </h4>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)'
            }}>
              👤 Nome Completo:
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ex: João Silva"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                backdropFilter: 'blur(10px)'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)'
            }}>
              📧 Email:
            </label>
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="admin@empresa.com"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                backdropFilter: 'blur(10px)'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)'
            }}>
              🔑 Senha:
            </label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                backdropFilter: 'blur(10px)'
              }}
            />
          </div>

          {createError && (
            <div style={{
              padding: '1rem',
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.9rem',
              whiteSpace: 'pre-line'
            }}>
              {createError}
            </div>
          )}

          {createSuccess && (
            <div style={{
              padding: '1rem',
              background: 'rgba(16,185,129,0.2)',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: '8px',
              color: '#6ee7b7',
              fontSize: '0.9rem',
              whiteSpace: 'pre-line'
            }}>
              {createSuccess}
            </div>
          )}

          <button
            onClick={handleCreateSuperAdmin}
            disabled={createLoading || !createEmail || !createPassword || !createName}
            style={{
              padding: '1rem 2rem',
              background: createLoading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: createLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              opacity: (!createEmail || !createPassword || !createName) ? 0.5 : 1
            }}
          >
            {createLoading ? '🔄 Criando Super Admin...' : '👑 Criar Super Administrador'}
          </button>
        </div>
      </div>

      {/* Informações e Guia */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h4 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.3rem',
          fontWeight: '700',
          color: '#ffffff'
        }}>
          ℹ️ Informações Importantes
        </h4>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          fontSize: '0.9rem',
          lineHeight: '1.5'
        }}>
          <div style={{
            padding: '1rem',
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '8px',
            color: '#93c5fd'
          }}>
            <strong>🎯 Permissões do Super Admin:</strong><br/>
            • Acesso total a todas as empresas<br/>
            • Gerenciamento de funcionários<br/>
            • Configurações críticas do sistema<br/>
            • Criação de outros administradores<br/>
            • Acesso a logs e relatórios completos
          </div>

          <div style={{
            padding: '1rem',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '8px',
            color: '#fbbf24'
          }}>
            <strong>⚠️ Segurança:</strong><br/>
            • Use emails corporativos confiáveis<br/>
            • Senhas devem ser complexas<br/>
            • Registre quem tem acesso<br/>
            • Monitore atividades regularmente
          </div>

          <div style={{
            padding: '1rem',
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '8px',
            color: '#6ee7b7'
          }}>
            <strong>✅ Processo:</strong><br/>
            1. Preencha todos os campos<br/>
            2. Clique em "Criar Super Administrador"<br/>
            3. Sistema criará e configurará automaticamente<br/>
            4. Informe as credenciais ao novo admin<br/>
            5. Primeiro login em /admin
          </div>

          <div style={{
            padding: '1rem',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '8px',
            color: '#c4b5fd'
          }}>
            <strong>🔗 Links de Acesso:</strong><br/>
            • Painel Admin: <code>/admin</code><br/>
            • Criar Admin: <code>/create-admin</code><br/>
            • Promoção: <code>/promote-superadmin</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Principal do Painel Admin
export default function AdminMasterPage() {
  const router = useRouter(); // Inicializa o router
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);


  // Estados dos dados
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Estados da Central de Inteligência
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>({});
  const [systemHealth, setSystemHealth] = useState<{ status: string; checks: any[] }>({ status: '', checks: [] });
  const [intelligenceData, setIntelligenceData] = useState<IntelligenceData>({});
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

  // Estados para métricas de segurança
  const [securityMetrics, setSecurityMetrics] = useState({
    failedLogins: 0,
    suspiciousActivities: 0,
    securityAlerts: 0,
    blockedIPs: 0,
    lastUpdated: new Date()
  });

  // Estados de controle
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Estados de modais
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showEmpresaModal, setShowEmpresaModal] = useState(false); // Estado para o modal de criação de empresa
  const [selectedSistema, setSelectedSistema] = useState<string>(''); // Estado para sistema selecionado no modal
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Estados para login de admin (sempre declarados para manter ordem dos hooks)
  const [loginEmail, setLoginEmail] = useState('enygna@enygna.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [createAdminEmail, setCreateAdminEmail] = useState('');
  const [createAdminPassword, setCreateAdminPassword] = useState('');
  const [createAdminLoading, setCreateAdminLoading] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');
  const [createAdminSuccess, setCreateAdminSuccess] = useState('');

  // Estados para criação de empresa
  const [createEmpresaLoading, setCreateEmpresaLoading] = useState(false);
  const [createEmpresaError, setCreateEmpresaError] = useState('');
  const [createEmpresaSuccess, setCreateEmpresaSuccess] = useState('');
  const [empresas, setEmpresas] = useState<Company[]>([]);

  // Hook para carregar dados iniciais e configurar o listener de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user); // Define o usuário logado

        try {
          // 1. Verificar se o usuário é uma empresa (e bloquear acesso)
          const empresasRef = collection(db, 'empresas');
          const empresaQuery = query(empresasRef, where('email', '==', user.email));
          const empresaSnapshot = await getDocs(empresaQuery);

          if (!empresaSnapshot.empty) {
            // Verificar se é um admin tentando criar empresa
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            let isAdminUser = false;

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              isAdminUser = userData.role === 'superadmin' || userData.role === 'adminmaster' || userData.bootstrapAdmin;
            } else if (user.email === 'enygnadev@gmail.com' || user.email === 'enygna@enygna.com') {
              isAdminUser = true;
            }

            // Se for admin, permitir acesso ao painel admin
            if (isAdminUser) {
              console.log('Admin detectado, mantendo acesso ao painel');
            } else {
              // É uma empresa, bloquear acesso ao admin
              setTimeout(() => {
                const empresaData = empresaSnapshot.docs[0].data();
                const sistemasAtivos = empresaData.sistemasAtivos || [];

                // Redirecionar para o primeiro sistema ativo da empresa
                if (sistemasAtivos.includes('frota')) {
                  window.location.href = '/frota';
                } else if (sistemasAtivos.includes('chamados')) {
                  window.location.href = '/chamados';
                } else if (sistemasAtivos.includes('financeiro')) {
                  window.location.href = '/financeiro';
                } else if (sistemasAtivos.includes('documentos')) {
                  window.location.href = '/documentos';
                } else if (sistemasAtivos.includes('ponto')) {
                  window.location.href = '/empresa/dashboard';
                } else {
                  window.location.href = '/sistemas';
                }
              }, 1000);
              setLoading(false);
              return;
            }
          }

          // 2. Verificar se é um admin/superadmin (usuário do sistema)
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          let isAdminAccess = false;

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as any;
            if (userData.role === 'superadmin' || userData.role === 'adminmaster' || userData.bootstrapAdmin) {
              isAdminAccess = true;
            }
          } else {
            // Se o usuário não existe em 'users', verificar se é um email de desenvolvimento
            if (user.email === 'enygnadev@gmail.com' || user.email === 'enygna@enygna.com') {
              isAdminAccess = true;
              // Criar o documento do usuário se não existir
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0],
                role: 'superadmin',
                bootstrapAdmin: true,
                createdAt: serverTimestamp(),
                isActive: true,
                permissions: ['all'],
                masterAccess: true,
                systemOwner: true,
                totalControl: true
              });
            }
          }

          setIsSuperAdmin(isAdminAccess);

          if (isAdminAccess) {
            await loadAllData();
            initializeIntelligenceCenter(); // Centralizar inicialização
          } else {
            // Redirecionar para página de login se não for admin
            router.push('/admin/auth');
          }

          // Verifica status do tutorial
          try {
            const tutorialSnap = await getDoc(
              docRef(db, "userTutorialStatus", user.uid)
            );

            if (
              !tutorialSnap.exists() ||
              !tutorialSnap.data()?.adminDashboardCompleted
            ) {
              setShowTutorial(true);
            }
          } catch (tutorialError) {
            console.log('Erro ao carregar tutorial, continuando...');
            setShowTutorial(true);
          }

        } catch (error: any) {
          console.error('Erro ao verificar permissões:', error);
          if (error?.code === 'permission-denied') {
            console.warn('Permissão negada ao verificar acesso inicial.');
            // Redirecionar para página de login em caso de erro de permissão
            router.push('/admin/auth');
          } else {
            router.push('/admin/auth');
          }
        }
      } else {
        setUser(null);
        setIsSuperAdmin(false);
        // Redirecionar para página de login se não estiver autenticado
        router.push('/admin/auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);


  // Função para carregar todos os dados necessários
  const loadAllData = async () => {
    try {
      await Promise.all([
        loadEmpresas(), // Renomeado de loadCompanies para loadEmpresas
        loadEmployees(),
        loadAnalytics(),
        loadNotifications(),
        loadSystemSettings(),
        loadSystemLogs(),
        loadReports()
      ]);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);

      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar dados globais.');
        // Você pode optar por definir estados padrão ou exibir uma mensagem de erro mais específica
        setError('Permissão negada para carregar dados essenciais.');
        // Resetar estados de dados para evitar exibir dados incorretos
        setCompanies([]);
        setEmployees([]);
        setAnalytics(null);
        setNotifications([]);
      } else {
        setError('Erro ao carregar dados do sistema');
      }
    }
  };

  // Carregar dados de empresas (renomeado de loadCompanies)
  const loadEmpresas = async () => {
    try {
      console.log('Carregando empresas...');

      // Tentar carregar de múltiplas coleções
      const collections = ['empresas', 'companies', 'chamados_empresas'];
      let empresasList: any[] = [];

      for (const collectionName of collections) {
        try {
          const q = query(collection(db, collectionName), limit(20));
          const snapshot = await getDocs(q);
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            source: collectionName
          }));
          empresasList = empresasList.concat(docs);
        } catch (err: any) {
          console.log(`Erro ao carregar ${collectionName}:`, err);
          // Se for erro de permissão, não é crítico - continuamos
          if (err?.code === 'permission-denied') {
            console.warn(`Permissão negada para ${collectionName}, mas continuando...`);
          }
        }
      }

      // Remover duplicatas
      const uniqueEmpresas = empresasList.filter((empresa, index, self) =>
        index === self.findIndex((e) => e.id === empresa.id)
      );

      // Adicionar empresas demo se a lista estiver vazia ou se tivermos poucos dados
      if (uniqueEmpresas.length === 0) {
        console.log('Criando empresas demo devido à falta de dados...');
        setEmpresas([
          {
            id: 'demo-empresa-1',
            name: 'Empresa Demo 1',
            nome: 'Empresa Demo 1',
            email: 'contato@demo1.com',
            createdAt: new Date(),
            criadoEm: new Date(),
            plan: 'basic',
            active: true,
            ativo: true,
            employees: 10,
            monthlyRevenue: 15000,
            lastActivity: new Date(),
            settings: {
              geofencing: false,
              requireSelfie: false,
              emailNotifications: true,
              workingHours: { start: '09:00', end: '18:00' }
            },
            subscription: {
              plan: 'basic',
              status: 'active',
              nextBilling: new Date(),
              features: []
            },
            sistemasAtivos: ['chamados', 'financeiro'],
            plano: 'basic'
          },
          {
            id: 'demo-empresa-2',
            name: 'Empresa Demo 2',
            nome: 'Empresa Demo 2',
            email: 'contato@demo2.com',
            createdAt: new Date(),
            criadoEm: new Date(),
            plan: 'premium',
            active: true,
            ativo: true,
            employees: 25,
            monthlyRevenue: 35000,
            lastActivity: new Date(),
            settings: {
              geofencing: true,
              requireSelfie: true,
              emailNotifications: true,
              workingHours: { start: '08:00', end: '17:00' }
            },
            subscription: {
              plan: 'premium',
              status: 'active',
              nextBilling: new Date(),
              features: ['advanced_reports', 'api_access']
            },
            sistemasAtivos: ['chamados', 'ponto', 'frota'],
            plano: 'premium'
          }
        ]);
      } else {
        setEmpresas(uniqueEmpresas);
      }

    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      // Em caso de erro completo, usar dados demo
      setEmpresas([
        {
          id: 'error-fallback',
          name: 'Sistema Demo',
          nome: 'Sistema Demo',
          email: 'demo@sistema.com',
          createdAt: new Date(),
          criadoEm: new Date(),
          plan: 'demo',
          active: true,
          ativo: true,
          employees: 1,
          monthlyRevenue: 0,
          lastActivity: new Date(),
          settings: {
            geofencing: false,
            requireSelfie: false,
            emailNotifications: false,
            workingHours: { start: '09:00', end: '18:00' }
          },
          subscription: {
            plan: 'demo',
            status: 'active',
            nextBilling: new Date(),
            features: []
          },
          sistemasAtivos: ['demo'],
          plano: 'demo'
        }
      ]);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar empresas.');
      }
    }
  };

  // Carregar dados de funcionários
  const loadEmployees = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const employeesData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();

          if (data.role === 'superadmin') return null;

          let companyName = 'Empresa não encontrada';
          if (data.company) {
            try {
              const companyDoc = await getDoc(docRef(db, "companies", data.company));
              if (companyDoc.exists()) {
                companyName = companyDoc.data().name || 'Empresa sem nome';
              }
            } catch (error: any) {
              console.error("Error fetching user document:", error);
              if (error?.code === 'permission-denied') {
                console.warn('Permissão negada ao buscar dados da empresa do funcionário.');
              }
            }
          }

          const startMonth = startOfMonth(selectedPeriod);
          const endMonth = endOfMonth(selectedPeriod);

          let totalHours = 0;
          let monthlyEarnings = 0;
          let punctualityScore = 100;
          let attendanceScore = 100;

          if (data.company) {
            try {
              const sessionsRef = collection(db, 'users', doc.id, 'sessions');
              const sessionsQuery = query(
                sessionsRef,
                where('start', '>=', startMonth),
                where('start', '<=', endMonth)
              );
              const sessionsSnapshot = await getDocs(sessionsQuery);

              sessionsSnapshot.docs.forEach((sessionDoc) => {
                const session = sessionDoc.data();
                if (session.durationSec) {
                  totalHours += session.durationSec / 3600;
                }
                if (session.earnings) {
                  monthlyEarnings += session.earnings;
                }
              });

              punctualityScore = Math.max(60, 100 - (Math.random() * 40));
              attendanceScore = Math.max(70, 100 - (Math.random() * 30));
            } catch (error: any) {
              console.error('Erro ao calcular métricas:', error);
              if (error?.code === 'permission-denied') {
                console.warn('Permissão negada ao calcular métricas de funcionário.');
              }
            }
          }

          return {
            id: doc.id,
            name: data.name || 'Usuário sem nome',
            email: data.email || '',
            company: data.company || '',
            companyName,
            role: data.role || 'colaborador',
            active: data.active !== false,
            lastPunch: data.lastPunch,
            totalHours: Math.round(totalHours * 100) / 100,
            monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
            createdAt: data.createdAt,
            avatar: data.avatar,
            department: data.department,
            position: data.position,
            salary: data.salary,
            cpf: data.cpf,
            phone: data.phone,
            address: data.address,
            permissions: data.permissions || [],
            metrics: {
              punctuality: Math.round(punctualityScore),
              attendance: Math.round(attendanceScore),
              productivity: Math.round((punctualityScore + attendanceScore) / 2)
            }
          } as Employee;
        })
      );

      setEmployees(employeesData.filter(Boolean) as Employee[]);
    } catch (error: any) {
      console.error('Erro ao carregar funcionários:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar funcionários.');
      }
    }
  };

  // Carregar dados de analytics
  const loadAnalytics = async () => {
    try {
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.active).length;
      const totalEmployees = employees.length;
      const monthlyRevenue = companies.reduce((sum, c) => sum + c.monthlyRevenue, 0);

      const lastMonthRevenue = monthlyRevenue * (0.8 + Math.random() * 0.4);
      const growthRate = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100);

      const topCompanies = companies
        .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
        .slice(0, 5);

      // Simular métricas adicionais
      const totalSessions = Math.floor(totalEmployees * 22 * (0.8 + Math.random() * 0.4));
      const averageWorkHours = 8.2 + (Math.random() * 1.6);
      const lateArrivals = Math.floor(totalSessions * (0.05 + Math.random() * 0.1));
      const earlyDepartures = Math.floor(totalSessions * (0.03 + Math.random() * 0.07));
      const overtimeHours = Math.floor(totalSessions * 0.5 + Math.random() * 100);

      setAnalytics({
        totalCompanies,
        totalEmployees,
        activeCompanies,
        monthlyRevenue,
        growthRate,
        topCompanies,
        recentActivity: [],
        metrics: {
          totalSessions,
          averageWorkHours,
          lateArrivals,
          earlyDepartures,
          overtimeHours
        },
        trends: {
          userGrowth: Array.from({length: 12}, () => Math.floor(Math.random() * 100)),
          revenueGrowth: Array.from({length: 12}, () => Math.floor(Math.random() * 50000)),
          activityTrend: Array.from({length: 7}, () => Math.floor(Math.random() * 1000))
        }
      });
    } catch (error: any) {
      console.error('Erro ao calcular analytics:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao calcular analytics.');
      }
    }
  };

  // Carregar notificações
  const loadNotifications = async () => {
    try {
      const notificationsRef = collection(db, 'admin_notifications');
      const q = query(notificationsRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);

      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Adicionar notificações simuladas se não houver
      if (notificationsData.length === 0) {
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'security',
            company: 'Sistema',
            employee: 'Sistema',
            message: 'Tentativa de acesso não autorizado detectada',
            timestamp: new Date(),
            read: false,
            priority: 'critical',
            actions: [
              { label: 'Investigar', action: 'investigate' },
              { label: 'Bloquear IP', action: 'block' }
            ]
          },
          {
            id: '2',
            type: 'payment',
            company: 'TechCorp',
            employee: 'Sistema de Pagamento',
            message: 'Falha no processamento do pagamento mensal',
            timestamp: new Date(Date.now() - 3600000),
            read: false,
            priority: 'high',
            actions: [
              { label: 'Reprocessar', action: 'retry_payment' }
            ]
          },
          {
            id: '3',
            type: 'system',
            company: 'Sistema',
            employee: 'Monitor',
            message: 'Uso de CPU acima de 85% por mais de 10 minutos',
            timestamp: new Date(Date.now() - 7200000),
            read: true,
            priority: 'medium'
          }
        ];
        setNotifications(mockNotifications);
      } else {
        setNotifications(notificationsData);
      }
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar notificações.');
      }
    }
  };

  // Carregar configurações do sistema
  const loadSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(docRef(db, 'system_settings', 'default'));
      const defaultSettings: SystemSettings = {
        maintenanceMode: false,
        allowNewRegistrations: true,
        maxCompaniesPerUser: 5,
        maxEmployeesPerCompany: 1000,
        systemNotifications: {
          email: true,
          sms: false,
          push: true
        },
        security: {
          requireMFA: false,
          sessionTimeout: 8 * 60 * 60 * 1000,
          passwordPolicy: {
            minLength: 8,
            requireSpecialChars: true,
            requireNumbers: true
          }
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          retention: 30
        }
      };

      if (settingsDoc.exists()) {
        setSystemSettings({ ...defaultSettings, ...settingsDoc.data() });
      } else {
        setSystemSettings(defaultSettings);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar configurações.');
      }
    }
  };

  // Carregar logs do sistema
  const loadSystemLogs = async () => {
    try {
      const logsRef = collection(db, 'system_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);

      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSystemLogs(logsData);
    } catch (error: any) {
      console.error('Erro ao carregar logs:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar logs.');
      }
    }
  };

  // Carregar relatórios
  const loadReports = async () => {
    try {
      const reportsRef = collection(db, 'system_reports');
      const q = query(reportsRef, orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);

      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setReports(reportsData);
    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar relatórios.');
      }
    }
  };

  // ===== FUNÇÕES DA CENTRAL DE INTELIGÊNCIA =====

  // Inicializar Central de Inteligência
  const initializeIntelligenceCenter = async () => {
    try {
      // Carregar alertas em tempo real
      await loadRealTimeAlerts();

      // Iniciar monitoramento contínuo
      startRealTimeMonitoring();

      // Carregar métricas de segurança
      await loadSecurityMetrics();

      // Carregar dados de auditoria
      await loadAuditTrail();

    } catch (error: any) {
      console.error('Erro ao inicializar Central de Inteligência:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao inicializar Central de Inteligência.');
      }
    }
  };

  // Carregar alertas em tempo real
  const loadRealTimeAlerts = async () => {
    try {
      // Alertas críticos de segurança
      const securityAlerts = await getDocs(query(
        collection(db, 'security_alerts'),
        where('resolved', '==', false),
        orderBy('timestamp', 'desc'),
        limit(50)
      ));

      // Alertas de sistema
      const systemAlerts = await getDocs(query(
        collection(db, 'system_alerts'),
        where('active', '==', true),
        orderBy('severity', 'desc'),
        limit(30)
      ));

      // Alertas de negócio
      const businessAlerts = await getDocs(query(
        collection(db, 'business_alerts'),
        where('status', '==', 'active'),
        orderBy('priority', 'desc'),
        limit(20)
      ));

      const allAlerts = [
        ...securityAlerts.docs.map(doc => ({
          id: doc.id,
          type: 'security' as const,
          severity: doc.data().severity || 'medium' as const,
          timestamp: doc.data().timestamp || new Date(),
          ...doc.data()
        })),
        ...systemAlerts.docs.map(doc => ({
          id: doc.id,
          type: 'system' as const,
          severity: doc.data().severity || 'medium' as const,
          timestamp: doc.data().timestamp || new Date(),
          ...doc.data()
        })),
        ...businessAlerts.docs.map(doc => ({
          id: doc.id,
          type: 'business' as const,
          severity: doc.data().severity || 'medium' as const,
          timestamp: doc.data().timestamp || new Date(),
          ...doc.data()
        }))
      ];

      setAlerts(allAlerts);

      // Determinar nível de ameaça baseado nos alertas
      const criticalCount = allAlerts.filter(a => a.severity === 'critical').length;
      const highCount = allAlerts.filter(a => a.severity === 'high').length;

      if (criticalCount > 0) {
        setThreatLevel('critical');
      } else if (highCount > 3) {
        setThreatLevel('high');
      } else if (highCount > 0) {
        setThreatLevel('medium');
      } else {
        setThreatLevel('low');
      }

    } catch (error: any) {
      console.error('Erro ao carregar alertas:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar alertas.');
      }
    }
  };

  // Iniciar monitoramento em tempo real
  const startRealTimeMonitoring = () => {
    // Métricas de sistema
    const metricsInterval = setInterval(async () => {
      try {
        // Atualizar métricas de sistema
        const systemMetrics = await realTimeMonitoring.getSystemMetrics();
        const healthCheck = await monitoringService.getHealthCheckResults();

        setRealTimeMetrics(prev => ({
          ...prev,
          ...systemMetrics,
          health: healthCheck,
          lastUpdate: new Date()
        }));

        setSystemHealth(healthCheck);

      } catch (error: any) {
        console.error('Erro ao atualizar métricas:', error);
        if (error?.code === 'permission-denied') {
          console.warn('Permissão negada ao atualizar métricas.');
        }
      }
    }, 30000);

    // Eventos de segurança - consulta mais simples
    const securityInterval = setInterval(async () => {
      try {
        // Buscar apenas eventos recentes sem filtros complexos
        const recentEvents = await getDocs(query(
          collection(db, 'security_events'),
          limit(5)
        ));

        if (!recentEvents.empty) {
          const events = recentEvents.docs.map(doc => ({
            id: doc.id,
            userId: doc.data().userId || '',
            type: doc.data().type || 'info',
            severity: doc.data().severity || 'low',
            description: doc.data().description || '',
            ipAddress: doc.data().ipAddress || '',
            userAgent: doc.data().userAgent || '',
            timestamp: doc.data().timestamp || new Date(),
            metadata: doc.data().metadata || {},
            ...doc.data()
          } as SecurityEvent));

          setSecurityEvents(prev => {
            const newEvents = events.filter(event =>
              !prev.some(existingEvent => existingEvent.id === event.id)
            );
            return [...newEvents, ...prev.slice(0, 20)];
          });
        }

      } catch (error: any) {
        console.error('Erro ao monitorar segurança:', error);
        if (error?.code === 'permission-denied') {
          console.warn('Permissão negada ao monitorar segurança.');
        }
      }
    }, 60000);

    // Cleanup intervals on unmount
    return () => {
      clearInterval(metricsInterval);
      clearInterval(securityInterval);
    };
  };

  // Carregar métricas de segurança - versão simplificada
  const loadSecurityMetrics = async () => {
    try {
      // Usar consultas simples sem filtros complexos
      const allEvents = await getDocs(query(
        collection(db, 'security_events'),
        limit(100)
      ));

      if (!allEvents.empty) {
        const events = allEvents.docs.map(doc => doc.data());
        const last24Hours = Date.now() - (24 * 60 * 60 * 1000);

        // Filtrar no cliente para evitar índices complexos
        const recentEvents = events.filter(event => {
          const eventTime = event.timestamp?.toDate?.()?.getTime?.() ||
                           event.timestamp?.getTime?.() ||
                           Date.now();
          return eventTime > last24Hours;
        });

        const failedLogins = recentEvents.filter(e => e.type === 'login_attempt').length;
        const suspiciousActivities = recentEvents.filter(e => e.type === 'suspicious_activity').length;
        const securityAlerts = recentEvents.filter(e => e.severity === 'critical').length;

        setSecurityMetrics({
          failedLogins,
          suspiciousActivities,
          securityAlerts,
          blockedIPs: 0,
          lastUpdated: new Date()
        });
      } else {
        // Valores padrão se não há eventos
        setSecurityMetrics({
          failedLogins: 0,
          suspiciousActivities: 0,
          securityAlerts: 0,
          blockedIPs: 0,
          lastUpdated: new Date()
        });
      }

    } catch (error: any) {
      console.error('Erro ao carregar métricas de segurança:', error);
      // Definir valores padrão em caso de erro
      setSecurityMetrics({
        failedLogins: 0,
        suspiciousActivities: 0,
        securityAlerts: 0,
        blockedIPs: 0,
        lastUpdated: new Date()
      });
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar métricas de segurança.');
      }
    }
  };

  // Carregar trilha de auditoria
  const loadAuditTrail = async () => {
    try {
      const auditQuery = query(
        collection(db, 'audit_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const auditSnapshot = await getDocs(auditQuery);
      const auditData = auditSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      setAuditTrail(auditData);

    } catch (error: any) {
      console.error('Erro ao carregar trilha de auditoria:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao carregar trilha de auditoria.');
      }
    }
  };

  // Resolver alerta
  const resolveAlert = async (alertId: string, type: string) => {
    try {
      const collectionName = `${type}_alerts`;
      await updateDoc(doc(db, collectionName, alertId), {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: user?.uid
      });

      // Remover da lista local
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    } catch (error: any) {
      console.error('Erro ao resolver alerta:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao resolver alerta.');
      }
    }
  };

  // Funções de ação
  const toggleCompanyStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        active: !currentStatus,
        lastModified: serverTimestamp()
      });
      await loadEmpresas(); // Usar loadEmpresas

      // Log da ação
      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: !currentStatus ? 'company_activated' : 'company_deactivated',
        targetId: companyId,
        timestamp: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Erro ao alterar status da empresa:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao alterar status da empresa.');
      }
    }
  };

  const deleteCompany = async (companyId: string) => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá excluir PERMANENTEMENTE a empresa e TODOS os seus dados, incluindo funcionários, sessões e relatórios. Esta ação é IRREVERSÍVEL. Tem certeza absoluta?')) {
      return;
    }

    const confirmText = prompt('Para confirmar, digite "EXCLUIR PERMANENTEMENTE":');
    if (confirmText !== 'EXCLUIR PERMANENTEMENTE') {
      alert('Operação cancelada. Texto de confirmação não confere.');
      return;
    }

    try {
      const batch = writeBatch(db);

      // Deletar todos os funcionários da empresa
      const employeesQuery = query(
        collection(db, 'users'),
        where('company', '==', companyId)
      );
      const employeesSnapshot = await getDocs(employeesQuery);

      employeesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Deletar a empresa
      batch.delete(doc(db, 'companies', companyId));

      await batch.commit();

      // Log da ação crítica
      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: 'company_deleted',
        targetId: companyId,
        timestamp: serverTimestamp(),
        severity: 'critical'
      });

      await loadAllData();
      alert('✅ Empresa excluída permanentemente com sucesso.');
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      alert('❌ Erro ao excluir empresa. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao excluir empresa.');
      }
    }
  };

  const promoteToAdmin = async (employeeId: string) => {
    if (!confirm('Tem certeza que deseja promover este usuário a Administrador?')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', employeeId), {
        role: 'admin',
        lastModified: serverTimestamp()
      });

      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: 'user_promoted_to_admin',
        targetId: employeeId,
        timestamp: serverTimestamp()
      });

      await loadEmployees();
      alert('✅ Usuário promovido a Administrador com sucesso!');
    } catch (error: any) {
      console.error('Erro ao promover usuário:', error);
      alert('❌ Erro ao promover usuário. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao promover usuário.');
      }
    }
  };

  const suspendEmployee = async (employeeId: string) => {
    if (!confirm('Tem certeza que deseja suspender este funcionário?')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', employeeId), {
        active: false,
        suspendedAt: serverTimestamp(),
        suspendedBy: user?.uid
      });

      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: 'employee_suspended',
        targetId: employeeId,
        timestamp: serverTimestamp()
      });

      await loadEmployees();
      alert('✅ Funcionário suspenso com sucesso!');
    } catch (error: any) {
      console.error('Erro ao suspender funcionário:', error);
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao suspender funcionário.');
      }
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      const reportData = {
        type: reportType,
        generatedBy: user?.uid,
        createdAt: serverTimestamp(),
        status: 'processing',
        data: {}
      };

      switch (reportType) {
        case 'companies':
          reportData.data = {
            totalCompanies: companies.length,
            activeCompanies: companies.filter(c => c.active).length,
            monthlyRevenue: companies.reduce((sum, c) => sum + c.monthlyRevenue, 0),
            companies: companies.map(c => ({
              name: c.name,
              employees: c.employees,
              revenue: c.monthlyRevenue,
              plan: c.subscription.plan
            }))
          };
          break;
        case 'employees':
          reportData.data = {
            totalEmployees: employees.length,
            activeEmployees: employees.filter(e => e.active).length,
            averageProductivity: employees.length > 0 ? employees.reduce((sum, e) => sum + e.metrics.productivity, 0) / employees.length : 0,
            employees: employees.map(e => ({
              name: e.name,
              company: e.companyName,
              role: e.role,
              productivity: e.metrics.productivity
            }))
          };
          break;
        case 'financial':
          reportData.data = {
            totalRevenue: analytics?.monthlyRevenue || 0,
            growthRate: analytics?.growthRate || 0,
            topCompanies: analytics?.topCompanies || []
          };
          break;
        case 'crm':
          // Relatório específico do sistema CRM
          const empresasCrm = companies.filter(c => c.sistemasAtivos?.includes('crm'));
          reportData.data = {
            totalEmpresas: empresasCrm.length,
            empresasAtivas: empresasCrm.filter(c => c.active || c.ativo).length,
            totalClientes: 0, // Será implementado com consulta real ao Firestore
            clientesAtivos: 0,
            vendasFechadas: 0,
            faturamentoTotal: 0,
            ticketMedio: 0,
            taxaConversao: 0,
            empresas: empresasCrm.map(c => ({
              id: c.id,
              nome: c.name || c.nome,
              email: c.email,
              plano: c.subscription?.plan || c.plano,
              ativo: c.active || c.ativo,
              receita: c.monthlyRevenue,
              criadoEm: c.createdAt || c.criadoEm
            })),
            periodo: {
              inicio: startOfMonth(new Date()),
              fim: endOfMonth(new Date())
            }
          };
          break;
        case 'chamados':
          // Relatório específico do sistema de chamados
          const empresasChamados = empresas.filter(e => e.sistemasAtivos?.includes('chamados'));
          reportData.data = {
            totalEmpresas: empresasChamados.length,
            empresasAtivas: empresasChamados.filter(e => e.ativo).length,
            totalTickets: 0, // Será implementado com consulta real
            ticketsAbertos: 0,
            ticketsResolvidos: 0,
            tempoMedioResolucao: 0,
            empresas: empresasChamados.map(e => ({
              id: e.id,
              nome: e.nome,
              email: e.email,
              plano: e.plano,
              ativo: e.ativo,
              criadoEm: e.criadoEm
            })),
            periodo: {
              inicio: startOfMonth(new Date()),
              fim: endOfMonth(new Date())
            }
          };
          break;
      }

      const reportRef = await addDoc(collection(db, 'system_reports'), reportData);

      // Atualizar status para concluído
      await updateDoc(reportRef, { status: 'completed' });

      await loadReports();
      alert(`✅ Relatório de ${reportType} gerado com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      alert('❌ Erro ao gerar relatório. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao gerar relatório.');
      }
    }
  };

  const updateSystemSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      await setDoc(doc(db, 'system_settings', 'default'), {
        ...systemSettings,
        ...newSettings,
        lastModified: serverTimestamp(),
        modifiedBy: user?.uid
      }, { merge: true });

      setSystemSettings(prev => ({ ...prev, ...newSettings } as SystemSettings));

      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: 'system_settings_updated',
        changes: newSettings,
        timestamp: serverTimestamp()
      });

      alert('✅ Configurações atualizadas com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      alert('❌ Erro ao atualizar configurações. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao atualizar configurações.');
      }
    }
  };

  const exportData = async (dataType: string) => {
    try {
      let data: any = {};
      let filename = '';

      switch (dataType) {
        case 'companies':
          data = companies;
          filename = 'empresas.json';
          break;
        case 'employees':
          data = employees;
          filename = 'funcionarios.json';
          break;
        case 'analytics':
          data = analytics;
          filename = 'analytics.json';
          break;
        case 'logs':
          data = systemLogs;
          filename = 'system_logs.json';
          break;
        case 'reports':
          data = reports;
          filename = 'relatorios.json';
          break;
        case 'chamados':
          // Exportar dados específicos do sistema de chamados
          const empresasChamados = empresas.filter(e => e.sistemasAtivos?.includes('chamados'));
          data = {
            empresas: empresasChamados,
            estatisticas: {
              totalEmpresas: empresasChamados.length,
              empresasAtivas: empresasChamados.filter(e => e.ativo).length,
              totalTickets: 0, // Implementar consulta real
              dataExportacao: new Date().toISOString()
            },
            configuracoes: {
              sistema: 'chamados',
              versao: '1.0.0',
              exportadoPor: user?.email || 'admin'
            }
          };
          filename = 'sistema_chamados_dados.json';
          break;
        case 'crm':
          const empresasCrm = companies.filter(c => c.sistemasAtivos?.includes('crm'));
          data = {
            empresas: empresasCrm.map(c => ({
              id: c.id,
              nome: c.name || c.nome,
              email: c.email,
              plano: c.subscription?.plan || c.plano,
              ativo: c.active || c.ativo,
              receita: c.monthlyRevenue,
            })),
            estatisticas: {
              totalEmpresas: empresasCrm.length,
              empresasComCRMAtivo: empresasCrm.filter(c => c.active || c.ativo).length,
              receitaTotalCRM: empresasCrm.reduce((sum, c) => sum + c.monthlyRevenue, 0),
              dataExportacao: new Date().toISOString()
            },
            configuracoes: {
              sistema: 'crm',
              versao: '1.0.0',
              exportadoPor: user?.email || 'admin'
            }
          };
          filename = 'sistema_crm_dados.json';
          break;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      alert(`✅ Dados de ${dataType} exportados com sucesso!`);
    } catch (error: any) {
      console.error('Erro ao exportar dados:', error);
      alert('❌ Erro ao exportar dados. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao exportar dados.');
      }
    }
  };

  // Filtros e ordenação
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && company.active) ||
                         (filterStatus === 'inactive' && !company.active);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * modifier;
    if (sortBy === 'employees') return (a.employees - b.employees) * modifier;
    if (sortBy === 'revenue') return (a.monthlyRevenue - b.monthlyRevenue) * modifier;
    return 0;
  });

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && employee.active) ||
                         (filterStatus === 'inactive' && !employee.active);
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * modifier;
    if (sortBy === 'company') return a.companyName.localeCompare(b.companyName) * modifier;
    if (sortBy === 'productivity') return (a.metrics.productivity - b.metrics.productivity) * modifier;
    return 0;
  });

  // Paginação
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + itemsPerPage);

  const handleTutorialComplete = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'userTutorialStatus', user.uid), {
          adminDashboardCompleted: true,
        });
      } catch (error: any) {
        console.error('Erro ao marcar tutorial como completo:', error);
        if (error?.code === 'permission-denied') {
          console.warn('Permissão negada ao marcar tutorial como completo.');
        }
      }
    }
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
  };

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair do painel admin?')) {
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (error: any) {
        console.error('Erro ao fazer logout:', error);
        if (error?.code === 'permission-denied') {
          console.warn('Permissão negada ao fazer logout.');
        }
      }
    }
  };

  // Verificação de acesso (mantida para consistência, mas a lógica principal está no useEffect inicial)
  const checkSuperAdminAccess = async () => {
    if (user) {
      try {
        // Verificar documento do usuário
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        let hasAccess = false;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          hasAccess = userData.bootstrapAdmin === true ||
                     userData.role === 'superadmin' ||
                     userData.role === 'adminmaster';
        }

        // Emails de desenvolvimento têm acesso automático
        if (user.email === 'enygnadev@gmail.com' || user.email === 'enygna@enygna.com') {
          hasAccess = true;
        }

        setIsSuperAdmin(hasAccess);
      } catch (error: any) {
        console.error('Erro ao verificar acesso super admin:', error);
        setIsSuperAdmin(false);
        if (error?.code === 'permission-denied') {
          console.warn('Permissão negada ao verificar acesso super admin.');
        }
      }
    }
  };

  // Lógica de inicialização e carregamento
  useEffect(() => {
    // Esta função de verificação de acesso já está integrada no useEffect principal acima.
    // Mantido aqui apenas para referência, mas a lógica ativa está no `onAuthStateChanged`.
    // checkSuperAdminAccess();
    // if (isSuperAdmin) {
    //   loadAllData();
    //   initializeIntelligenceCenter();
    // }
  }, [user, isSuperAdmin]); // Dependências mantidas, mas o efeito primário está no hook de autenticação.

  // Função para login de admin
  const handleAdminLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Email e senha são obrigatórios.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      // O onAuthStateChanged irá lidar com o redirecionamento
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/user-not-found') {
        setLoginError('Usuário não encontrado.');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('Senha incorreta.');
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('Email inválido.');
      } else {
        setLoginError('Erro no login. Tente novamente.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Função para criar admin
  const handleCreateAdmin = async () => {
    if (!createAdminEmail || !createAdminPassword) {
      setCreateAdminError('Email e senha são obrigatórios.');
      return;
    }

    if (createAdminPassword.length < 6) {
      setCreateAdminError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCreateAdminLoading(true);
    setCreateAdminError('');
    setCreateAdminSuccess('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, createAdminEmail, createAdminPassword);
      const newUser = userCredential.user;

      await updateProfile(newUser, {
        displayName: createAdminEmail.split('@')[0]
      });

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: createAdminEmail,
        displayName: createAdminEmail.split('@')[0],
        role: 'superadmin',
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        isActive: true,
        permissions: ['all'],
        lastLogin: null
      });

      await addDoc(collection(db, 'admin_actions'), {
        adminId: user?.uid,
        action: 'admin_created',
        targetEmail: createAdminEmail,
        targetUid: newUser.uid,
        timestamp: serverTimestamp(),
        severity: 'critical'
      });

      setCreateAdminSuccess(`✅ Administrador criado com sucesso!\n📧 Email: ${createAdminEmail}\n🔑 UID: ${newUser.uid}`);
      setCreateAdminEmail('');
      setCreateAdminPassword('');

      // Não fazer signOut do admin atual quando criando empresa
      // O admin deve permanecer logado no painel
      console.log('Admin criado com sucesso, mantendo sessão atual');

    } catch (error: any) {
      console.error('Erro ao criar admin:', error);
      if (error.code === 'auth/email-already-in-use') {
        setCreateAdminError('❌ Este email já está em uso.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateAdminError('❌ Email inválido.');
      } else if (error.code === 'auth/weak-password') {
        setCreateAdminError('❌ Senha muito fraca.');
      } else {
        setCreateAdminError(`❌ Erro: ${error.message}`);
      }
    } finally {
      setCreateAdminLoading(false);
    }
  };

  // Função para buscar usuário
  const searchUser = async () => {
    if (!selectedUserEmail) return;

    setSearchingUser(true);
    setSelectedUser(null); // Limpa o usuário anterior

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', selectedUserEmail));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        setSelectedUser({
          uid: snapshot.docs[0].id,
          ...userData
        });
      } else {
        alert('Usuário não encontrado.');
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuário:', error);
      alert('Erro ao buscar usuário. Tente novamente.');
      if (error?.code === 'permission-denied') {
        console.warn('Permissão negada ao buscar usuário.');
      }
    } finally {
      setSearchingUser(false);
    }
  };

  // --- RENDERIZAÇÃO CONDICIONAL ---

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0b3c 0%, #1e1b4b 15%, #3730a3 30%, #4338ca 45%, #4f46e5 60%, #6366f1 75%, #8b5cf6 90%, #a855f7 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '2rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(45deg, #8b5cf6, #06b6d4)',
          borderRadius: '50%',
          opacity: 0.1,
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(45deg, #f59e0b, #ef4444)',
          borderRadius: '50%',
          opacity: 0.1,
          animation: 'float 8s ease-in-out infinite reverse'
        }}></div>

        {error ? (
          // Mostrar mensagem de erro quando acesso negado
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'rgba(239,68,68,0.1)',
            borderRadius: '32px',
            backdropFilter: 'blur(30px)',
            border: '2px solid rgba(239,68,68,0.3)',
            maxWidth: '600px'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '800',
              marginBottom: '1rem',
              color: '#fca5a5'
            }}>
              ACESSO NEGADO
            </h2>
            <p style={{ opacity: 0.9, fontSize: '1.2rem', fontWeight: '500', marginBottom: '2rem' }}>
              {error}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  background: '#fca5a5',
                  borderRadius: '50%',
                  animation: `pulse 1.5s infinite ${i * 0.3}s`
                }}></div>
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
              Redirecionando automaticamente...
            </p>
          </div>
        ) : (
          // Loading normal
          <>
            <div style={{
              width: '120px',
              height: '120px',
              border: '8px solid rgba(255,255,255,0.1)',
              borderTop: '8px solid #ffffff',
              borderRadius: '50%',
              animation: 'luxurySpin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))'
            }}></div>

            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '32px',
              backdropFilter: 'blur(30px)',
              border: '2px solid rgba(255,255,255,0.1)',
              maxWidth: '500px'
            }}>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                marginBottom: '1rem',
                background: 'linear-gradient(45deg, #ffffff, #e0e7ff, #c7d2fe)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              }}>
                👑 Inicializando Painel Master
              </h2>
              <p style={{ opacity: 0.9, fontSize: '1.2rem', fontWeight: '500' }}>
                Preparando controle administrativo supremo...
              </p>
              <div style={{
                marginTop: '2rem',
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '12px',
                    height: '12px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '50%',
                    animation: `pulse 2s infinite ${i * 0.2}s`
                  }}></div>
                ))}
              </div>
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes luxurySpin {
            0% { transform: rotate(0deg) scale(1); opacity: 1; }
            50% { transform: rotate(180deg) scale(1.2); opacity: 0.8; }
            100% { transform: rotate(360deg) scale(1); opacity: 1; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  // Se o usuário não for super admin, mostrar tela de login/acesso restrito
  if (!isSuperAdmin) {
    return (
      <>
        <div
          style={{
            minHeight: '100vh',
            background:
              'linear-gradient(135deg, #dc2626 0%, #991b1b 25%, #7f1d1d 50%, #450a0a 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            position: 'relative',
          }}
        >
          {/* overlay decorativo */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 50%, rgba(239,68,68,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(220,38,38,0.3) 0%, transparent 50%)',
              animation: 'pulse 4s ease-in-out infinite alternate',
            }}
          />

          {/* card principal */}
          <div
            style={{
              textAlign: 'center',
              padding: '4rem',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '32px',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.1)',
              maxWidth: '600px',
              position: 'relative',
              zIndex: 10,
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                fontSize: '5rem',
                marginBottom: '2rem',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            >
              🚫
            </div>

            <h1
              style={{
                fontSize: '3rem',
                fontWeight: '900',
                marginBottom: '1.5rem',
                background: 'linear-gradient(45deg, #ffffff, #fecaca)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}
            >
              ACESSO RESTRITO
            </h1>

            <div
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: '2px solid rgba(239,68,68,0.4)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
              }}
            >
              <p
                style={{
                  opacity: 0.95,
                  marginBottom: '1rem',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                }}
              >
                🛡️ ZONA DE SEGURANÇA MÁXIMA
              </p>
              <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>
                Apenas <strong>Super Administradores</strong> autorizados podem
                acessar este painel de controle mestre.
              </p>
            </div>

            {/* Se ainda não abriu o login, mostra CTA */}
            {!showLoginForm ? (
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => (window.location.href = '/')}
                    style={{
                      padding: '1.2rem 2.5rem',
                      background:
                        'linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
                      color: 'white',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.2))';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 10px 20px rgba(0,0,0,0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))';
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    🏠 Voltar ao Início
                  </button>

                  <button
                    onClick={() =>
                      (window.location.href = '/promote-superadmin')
                    }
                    style={{
                      padding: '1.2rem 2.5rem',
                      background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #f59e0b, #d97706)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 10px 25px rgba(245,158,11,0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #fbbf24, #f59e0b)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 15px rgba(245,158,11,0.4)';
                    }}
                  >
                    👑 Solicitar Acesso
                  </button>
                </div>

                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                  }}
                >
                  <p
                    style={{
                      marginBottom: '1rem',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      opacity: 0.9,
                    }}
                  >
                    🔐 Já possui acesso de administrador?
                  </p>
                  <button
                    onClick={() => setShowLoginForm(true)}
                    style={{
                      padding: '1rem 2rem',
                      background:
                        'linear-gradient(45deg, #3b82f6, #1e40af)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #1e40af, #1e3a8a)';
                      e.currentTarget.style.transform =
                        'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 8px 20px rgba(59,130,246,0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #3b82f6, #1e40af)';
                      e.currentTarget.style.transform =
                        'translateY(0px)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 15px rgba(59,130,246,0.4)';
                    }}
                  >
                    📧 Fazer Login como Admin
                  </button>
                </div>
              </div>
            ) : (
              // Formulário de login do admin
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '2rem',
                  marginBottom: '2rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    marginBottom: '2rem',
                    color: '#ffffff',
                  }}
                >
                  🔐 Login de Administrador
                </h2>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      📧 Email de Administrador:
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="admin@exemplo.com"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      🔑 Senha:
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </div>

                  {loginError && (
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        fontSize: '0.9rem',
                      }}
                    >
                      ⚠️ {loginError}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() => setShowLoginForm(false)}
                      style={{
                        padding: '1rem 2rem',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      ❌ Cancelar
                    </button>

                    <button
                      onClick={handleAdminLogin}
                      disabled={loginLoading || !loginEmail || !loginPassword}
                      style={{
                        padding: '1rem 2rem',
                        background: loginLoading
                          ? 'rgba(59,130,246,0.5)'
                          : 'linear-gradient(45deg, #3b82f6, #1e40af)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: loginLoading ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        opacity:
                          !loginEmail || !loginPassword ? 0.5 : 1,
                      }}
                    >
                      {loginLoading
                        ? '🔄 Entrando...'
                        : '🚀 Entrar como Admin'}
                    </button>
                  </div>

                  <div
                    style={{
                      textAlign: 'center',
                      marginTop: '1rem',
                      padding: '1rem',
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: '12px',
                    }}
                  >
                    <p
                      style={{
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        opacity: 0.9,
                      }}
                    >
                      Dica: Use as credenciais que você criou em
                      {' '}/bootstrap-admin
                    </p>
                    <button
                      onClick={() =>
                        (window.location.href = '/bootstrap-admin')
                      }
                      style={{
                        padding: '0.75rem 1.5rem',
                        background:
                          'linear-gradient(45deg, #f59e0b, #d97706)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Ir para Bootstrap Admin
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      setShowCreateAdminForm(!showCreateAdminForm)
                    }
                    style={{
                      padding: '1rem 2rem',
                      background:
                        'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      transform: 'scale(1)',
                      boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #7c3aed, #6d28d9)';
                      e.currentTarget.style.transform =
                        'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow =
                        '0 8px 25px rgba(139,92,246,0.6)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(45deg, #8b5cf6, #7c3aed)';
                      e.currentTarget.style.transform =
                        'translateY(0px) scale(1)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 15px rgba(139,92,246,0.4)';
                    }}
                  >
                    👑 Criar Novo Admin
                  </button>
                </div>
              </div>
            )}

            {/* Formulário de criação de admin (condicional) */}
            {showCreateAdminForm && (
              <div
                style={{
                  marginTop: '2rem',
                  background: 'rgba(139,92,246,0.1)',
                  border: '2px solid rgba(139,92,246,0.3)',
                  borderRadius: '20px',
                  padding: '2rem',
                  animation: 'slideDown 0.3s ease-out',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    marginBottom: '1.5rem',
                    color: '#ffffff',
                    textAlign: 'center',
                  }}
                >
                  👑 Criar Novo Administrador
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      📧 Email do novo admin:
                    </label>
                    <input
                      type="email"
                      value={createAdminEmail}
                      onChange={(e) => setCreateAdminEmail(e.target.value)}
                      placeholder="admin@exemplo.com"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.9)',
                      }}
                    >
                      🔑 Senha (mínimo 6 caracteres):
                    </label>
                    <input
                      type="password"
                      value={createAdminPassword}
                      onChange={(e) =>
                        setCreateAdminPassword(e.target.value)
                      }
                      placeholder="••••••••"
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </div>

                  {createAdminError && (
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        fontSize: '0.9rem',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {createAdminError}
                    </div>
                  )}

                  {createAdminSuccess && (
                    <div
                      style={{
                        padding: '1rem',
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.4)',
                        borderRadius: '8px',
                        color: '#6ee7b7',
                        fontSize: '0.9rem',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {createAdminSuccess}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowCreateAdminForm(false);
                        setCreateAdminEmail('');
                        setCreateAdminPassword('');
                        setCreateAdminError('');
                        setCreateAdminSuccess('');
                      }}
                      style={{
                        padding: '1rem 2rem',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      ❌ Cancelar
                    </button>

                    <button
                      onClick={handleCreateAdmin}
                      disabled={
                        createAdminLoading ||
                        !createAdminEmail ||
                        !createAdminPassword
                      }
                      style={{
                        padding: '1rem 2rem',
                        background: createAdminLoading
                          ? 'rgba(139,92,246,0.5)'
                          : 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: createAdminLoading
                          ? 'not-allowed'
                          : 'pointer',
                        fontSize: '1rem',
                        fontWeight: 700,
                        transition: 'all 0.3s ease',
                        opacity:
                          !createAdminEmail || !createAdminPassword ? 0.5 : 1,
                      }}
                    >
                      {createAdminLoading
                        ? '🔄 Criando...'
                        : '👑 Criar Administrador'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            from {
              transform: scale(1);
              opacity: 0.8;
            }
            to {
              transform: scale(1.02);
              opacity: 1;
            }
          }
        `}</style>
      </>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL DO PAINEL ADMIN ---
  // Se o usuário for super admin, renderiza o painel
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0b3c 0%, #1e1b4b 15%, #3730a3 30%, #4338ca 45%, #4f46e5 60%, #6366f1 75%, #8b5cf6 90%, #a855f7 100%)',
      color: 'white'
    }}>
      {showTutorial && (
        <Tutorial
          steps={adminTutorialSteps}
          tutorialKey="admin-dashboard"
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* Header Premium */}
      <div className="admin-header" style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(30px)',
        borderBottom: '2px solid rgba(255,255,255,0.1)',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '900',
            margin: 0,
            background: 'linear-gradient(45deg, #ffffff, #e0e7ff, #c7d2fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
          }}>
            👑 PAINEL MASTER ADMIN
          </h1>
          <p style={{
            opacity: 0.9,
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#c7d2fe'
          }}>
            Controle Supremo do Sistema
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowNotificationCenter(true)}
            style={{
              padding: '0.75rem',
              background: 'rgba(239,68,68,0.2)',
              border: '2px solid rgba(239,68,68,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              position: 'relative',
              fontSize: '1.2rem',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🔔
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ef4444',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                animation: 'pulse 2s infinite'
              }}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>

          <div style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Logado como</div>
            <div style={{ fontWeight: '600' }}>{user?.email}</div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(45deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #dc2626, #b91c1c)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Navigation Tabs Premium */}
      <div className="navigation-tabs" style={{
        background: 'rgba(0,0,0,0.2)',
        padding: '1rem 2rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'companies', label: 'Empresas', icon: '🏢' },
          { id: 'employees', label: 'Funcionários', icon: '👥' },
          { id: 'analytics', label: 'Analytics', icon: '📈' },
          { id: 'notifications', label: 'Notificações', icon: '🔔' },
          { id: 'reports', label: 'Relatórios', icon: '📋' },
          { id: 'settings', label: 'Configurações', icon: '⚙️' },
          { id: 'logs', label: 'Logs', icon: '📄' },
          { id: 'create-admin', label: 'Criar Admin', icon: '👑' },
          { id: 'sistema-chamados', label: 'Sistema Chamados', icon: '🎫' },
          { id: 'sistema-frota', label: 'Sistema Frota', icon: '🚗' },
          { id: 'sistema-financeiro', label: 'Sistema Financeiro', icon: '💰' },
          { id: 'sistema-documentos', label: 'Sistema Documentos', icon: '📁' },
          { id: 'sistema-crm', label: 'Sistema CRM', icon: '🎯' },
          { id: 'cria-contas', label: 'Cria Contas', icon: '➕' },
          { id: 'controle-planos', label: '🎛️ Controle Planos', icon: '💳' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === tab.id
                ? 'linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1))'
                : 'rgba(255,255,255,0.05)',
              border: activeTab === tab.id
                ? '2px solid rgba(255,255,255,0.3)'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? '700' : '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: activeTab === tab.id ? '0 4px 15px rgba(255,255,255,0.1)' : 'none'
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.transform = 'translateY(0px)';
              }
            }}
          >
            <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'dashboard' && analytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="dashboard-metrics">

            {/* Banner especial para Bootstrap Admin */}
            {user && (
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 50%, #5b21b6 100%)',
                padding: '2rem',
                borderRadius: '24px',
                border: '3px solid #ffffff20',
                textAlign: 'center',
                boxShadow: '0 25px 50px rgba(139,92,246,0.3)',
                animation: 'pulse 3s infinite'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👑</div>
                <h2 style={{
                  fontSize: '2rem',
                  fontWeight: '900',
                  marginBottom: '1rem',
                  background: 'linear-gradient(45deg, #ffffff, #ffd700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  CONTROLE ABSOLUTO ATIVADO
                </h2>
                <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '1rem' }}>
                  Você possui acesso TOTAL a todos os dados empresariais e colaboradores
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginTop: '1.5rem'
                }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>∞</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Empresas</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>∞</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Funcionários</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>∞</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Dados</div>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>100%</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Controle</div>
                  </div>
                </div>
              </div>
            )}
            {/* Métricas Principais Premium */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {[
                {
                  icon: '🏢',
                  title: 'Empresas Total',
                  value: analytics.totalCompanies,
                  subtitle: `${analytics.activeCompanies} ativas`,
                  color: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                  change: '+12%'
                },
                {
                  icon: '👥',
                  title: 'Funcionários',
                  value: analytics.totalEmployees,
                  subtitle: `${analytics.activeCompanies} empresas`,
                  color: 'linear-gradient(135deg, #10b981, #059669)',
                  change: '+8%'
                },
                {
                  icon: '💰',
                  title: 'Receita Mensal',
                  value: `R$ ${analytics.monthlyRevenue.toLocaleString('pt-BR')}`,
                  subtitle: `+${analytics.growthRate.toFixed(1)}% vs mês anterior`,
                  color: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  change: `+${analytics.growthRate.toFixed(1)}%`
                },
                {
                  icon: '⚡',
                  title: 'Sessões Ativas',
                  value: analytics.metrics.totalSessions,
                  subtitle: `${analytics.metrics.averageWorkHours.toFixed(1)}h média`,
                  color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  change: '+15%'
                }
              ].map((metric, index) => (
                <div key={index} style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(30px)',
                  padding: '2rem',
                  borderRadius: '24px',
                  border: '2px solid rgba(255,255,255,0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: metric.color,
                    borderRadius: '50%',
                    opacity: 0.1,
                    transform: 'translate(30px, -30px)'
                  }}></div>

                  <div style={{ fontSize: '3rem', marginBottom: '1rem', zIndex: 1, position: 'relative' }}>
                    {metric.icon}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem', zIndex: 1, position: 'relative' }}>
                    {metric.value}
                  </div>
                  <div style={{ opacity: 0.8, marginBottom: '1rem', zIndex: 1, position: 'relative' }}>
                    {metric.title}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#10b981',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    zIndex: 1,
                    position: 'relative'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: 'rgba(16,185,129,0.2)',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {metric.change}
                    </span>
                    {metric.subtitle}
                  </div>
                </div>
              ))}
            </div>

            {/* Ações Rápidas Premium */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              padding: '2rem',
              borderRadius: '24px',
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🚀 Ações de Controle Total
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {[
                  {
                    label: 'Exportar TUDO',
                    action: () => {
                      exportData('companies');
                      exportData('employees');
                      exportData('analytics');
                      exportData('logs');
                      alert('🚀 Exportação completa iniciada!');
                    },
                    color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                    icon: '📦'
                  },
                  {
                    label: 'Controle Financeiro Total',
                    action: () => setActiveTab('analytics'),
                    color: 'linear-gradient(45deg, #10b981, #059669)',
                    icon: '💰'
                  },
                  {
                    label: 'Supervisão Empresas',
                    action: () => setActiveTab('companies'),
                    color: 'linear-gradient(45deg, #3b82f6, #1e40af)',
                    icon: '🏢'
                  },
                  {
                    label: 'Gestão de Pessoal',
                    action: () => setActiveTab('employees'),
                    color: 'linear-gradient(45deg, #f59e0b, #d97706)',
                    icon: '👥'
                  },
                  {
                    label: 'Central de Inteligência',
                    action: () => setActiveTab('notifications'),
                    color: 'linear-gradient(45deg, #ef4444, #dc2626)',
                    icon: '🧠'
                  },
                  {
                    label: 'Logs do Sistema',
                    action: () => setActiveTab('logs'),
                    color: 'linear-gradient(45deg, #6b7280, #4b5563)',
                    icon: '📄'
                  }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    style={{
                      padding: '1.5rem',
                      background: action.color,
                      border: 'none',
                      borderRadius: '16px',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', zIndex: 9999 }} className="companies-section">

            {/* Gestão Unificada de Empresas */}
            <EmpresaManager
              sistema="ponto"
              allowCreate={true}
              allowEdit={true}
              allowDelete={isSuperAdmin}
              onEmpresaSelect={(empresa) => {
                console.log('Empresa selecionada:', empresa);
                // Implementar navegação ou ações específicas
              }}
            />
            {/* Controles Premium */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              padding: '1.5rem',
              borderRadius: '20px',
              border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <input
                type="text"
                placeholder="🔍 Buscar empresas por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  minWidth: '300px',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <option value="all">🏢 Todas as Empresas</option>
                <option value="active">✅ Ativas</option>
                <option value="inactive">❌ Inativas</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <option value="name">📝 Ordenar por Nome</option>
                <option value="employees">👥 Por Funcionários</option>
                <option value="revenue">💰 Por Receita</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {sortOrder === 'asc' ? '⬆️' : '⬇️'}
              </button>
              <div style={{ marginLeft: 'auto', fontSize: '0.9rem', opacity: 0.8 }}>
                <strong>{filteredCompanies.length}</strong> de <strong>{companies.length}</strong> empresas
              </div>
            </div>

            {/* Lista de Empresas Premium */}
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(30px)",
                  borderRadius: "20px",
                  border: "2px solid rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
              <div style={{
                padding: '1.5rem',
                borderBottom: '2px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🏢 Gestão Total de Empresas
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => exportData('companies')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(45deg, #10b981, #059669)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    📥 Exportar
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        🏢 Empresa
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        👥 Equipe
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        💰 Receita/Mês
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        📊 Plano
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        ⚡ Status
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem' }}>
                        🎛️ Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompanies.map((company) => (
                      <tr
                        key={company.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '12px',
                              background: 'linear-gradient(45deg, #8b5cf6, #06b6d4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                              fontWeight: '900',
                              color: 'white'
                            }}>
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                                {company.name}
                              </div>
                              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                {company.email}
                              </div>
                              {company.cnpj && (
                                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                  CNPJ: {company.cnpj}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            background: company.subscription.plan === 'enterprise'
                              ? 'linear-gradient(45deg, #8b5cf6, #7c3aed)'
                              : company.subscription.plan === 'premium'
                              ? 'linear-gradient(45deg, #f59e0b, #d97706)'
                              : 'linear-gradient(45deg, #6b7280, #4b5563)',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {company.subscription.plan.toUpperCase()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: '700', color: '#10b981', fontSize: '1.2rem' }}>
                            R$ {company.monthlyRevenue.toLocaleString('pt-BR')}
                          </div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            R$ {(company.monthlyRevenue / (company.employees || 1)).toFixed(2)}/funcionário
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              background: company.subscription?.plan === 'enterprise'
                                ? 'linear-gradient(45deg, #8b5cf6, #7c3aed)'
                                : company.subscription?.plan === 'premium'
                                ? 'linear-gradient(45deg, #f59e0b, #d97706)'
                                : 'linear-gradient(45deg, #6b7280, #4b5563)',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              {(company.subscription?.plan || company.plano || 'básico').toUpperCase()}
                            </div>
                            {(company.sistemasAtivos || []).length > 0 && (
                              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                🎯 {(company.sistemasAtivos || []).length} sistemas ativos
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            background: company.active
                              ? 'linear-gradient(45deg, #10b981, #059669)'
                              : 'linear-gradient(45deg, #ef4444, #dc2626)',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {company.active ? '✅ ATIVA' : '❌ INATIVA'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setSelectedCompany(company);
                                setShowCompanyModal(true);
                              }}
                              style={{
                                padding: '0.5rem',
                                background: 'linear-gradient(45deg, #3b82f6, #1e40af)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                              title="Ver detalhes completos"
                            >
                              👁️
                            </button>
                            <button
                              onClick={() => toggleCompanyStatus(company.id, company.active)}
                              style={{
                                padding: '0.5rem',
                                background: company.active
                                  ? 'linear-gradient(45deg, #ef4444, #dc2626)'
                                  : 'linear-gradient(45deg, #10b981, #059669)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                              title={company.active ? 'Desativar empresa' : 'Ativar empresa'}
                            >
                              {company.active ? '⏸️' : '▶️'}
                            </button>
                            <button
                              onClick={() => deleteCompany(company.id)}
                              style={{
                                padding: '0.5rem',
                                background: 'linear-gradient(45deg, #dc2626, #991b1b)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease'
                              }}
                              title="⚠️ EXCLUIR PERMANENTEMENTE"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação Premium */}
              {totalPages > 1 && (
                <div style={{
                  padding: '1rem',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    ← Anterior
                  </button>

                  <span style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    opacity: 0.8
                  }}>
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '0.5rem 1rem',
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1
                    }}
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="employees-section">
            {/* Controles e Lista de Funcionários */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              padding: '1.5rem',
              borderRadius: '20px',
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                👥 Gestão de Funcionários
              </h3>
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome, email ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    minWidth: '300px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <option value="all">👥 Todos os Funcionários</option>
                  <option value="active">✅ Ativos</option>
                  <option value="inactive">❌ Inativos</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <option value="name">📝 Ordenar por Nome</option>
                  <option value="company">🏢 Por Empresa</option>
                  <option value="productivity">🚀 Por Produtividade</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                </button>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(30px)',
                borderRadius: '20px',
                border: '2px solid rgba(255,255,255,0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '2px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
                    👥 Lista de Funcionários
                  </h4>
                  <button
                    onClick={() => exportData('employees')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(45deg, #10b981, #059669)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    📥 Exportar
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>👤 Nome</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>🏢 Empresa</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                          🎯 Produtividade
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                          ⏰ Último Ponto
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                          ⚡ Status
                        </th>
                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem' }}>
                          🎛️ Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {employee.avatar ? (
                                <img src={employee.avatar} alt={employee.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                              ) : (
                                <div style={{
                                  width: '40px', height: '40px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold'
                                }}>
                                  {employee.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: '700' }}>{employee.name}</div>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{employee.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: '600' }}>{employee.companyName}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '700'
                            }}>
                              {employee.metrics.productivity}%
                              {employee.metrics.productivity > 80 ? '🚀' : employee.metrics.productivity > 60 ? '👍' : '⚠️'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {employee.lastPunch ? format(employee.lastPunch.toDate(), 'HH:mm dd/MM', { locale: ptBR }) : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              background: employee.active
                                ? 'linear-gradient(45deg, #10b981, #059669)'
                                : 'linear-gradient(45deg, #ef4444, #dc2626)',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              {employee.active ? '✅ ATIVO' : '❌ INATIVO'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => { setSelectedEmployee(employee); setShowEmployeeModal(true); }}
                                style={{ padding: '0.5rem', background: 'linear-gradient(45deg, #3b82f6, #1e40af)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => suspendEmployee(employee.id)}
                                style={{ padding: '0.5rem', background: 'linear-gradient(45deg, #f59e0b, #d97706)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
                              >
                                ⏸️
                              </button>
                              <button
                                onClick={() => promoteToAdmin(employee.id)}
                                style={{ padding: '0.5rem', background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
                              >
                                👑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Gráficos de Tendência e Crescimento */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Histórico de Usuários */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(30px)',
                padding: '2rem',
                borderRadius: '24px',
                border: '2px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                  📈 Histórico de Novos Usuários
                </h3>
                {/* Placeholder para gráfico */}
                <div style={{ height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}></div>
              </div>

              {/* Histórico de Receita */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(30px)',
                padding: '2rem',
                borderRadius: '24px',
                border: '2px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                  💰 Histórico de Receita
                </h3>
                {/* Placeholder para gráfico */}
                <div style={{ height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}></div>
              </div>
            </div>

            {/* Detalhes de Métricas */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              padding: '2rem',
              borderRadius: '24px',
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                ⚙️ Detalhes de Métricas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {[
                  { label: 'Total de Sessões', value: analytics.metrics.totalSessions, icon: '⏱️' },
                  { label: 'Horas Médias/Dia', value: analytics.metrics.averageWorkHours.toFixed(1) + 'h', icon: '📈' },
                  { label: 'Atrasos', value: analytics.metrics.lateArrivals, icon: '⏰' },
                  { label: 'Saídas Antecipadas', value: analytics.metrics.earlyDepartures, icon: '🚪' },
                  { label: 'Horas Extras', value: analytics.metrics.overtimeHours + 'h', icon: '⚡' }
                ].map((metric, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.5rem' }}>
                      {metric.value}
                    </div>
                    <div style={{ fontSize: '1rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {metric.icon} {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-section" style={{ padding: '30px' }}>
            {/* Header da Central de Inteligência */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{ margin: 0, color: 'white', fontSize: '28px' }}>🧠 Central de Inteligência e Alertas</h2>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: threatLevel === 'critical' ? 'rgba(239,68,68,0.3)' :
                             threatLevel === 'high' ? 'rgba(245,158,11,0.3)' :
                             threatLevel === 'medium' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)',
                  color: threatLevel === 'critical' ? '#fca5a5' :
                        threatLevel === 'high' ? '#fbbf24' :
                        threatLevel === 'medium' ? '#93c5fd' : '#6ee7b7',
                  border: `2px solid ${
                    threatLevel === 'critical' ? '#ef4444' :
                    threatLevel === 'high' ? '#f59e0b' :
                    threatLevel === 'medium' ? '#3b82f6' : '#10b981'
                  }`
                }}>
                  🚨 Nível de Ameaça: {threatLevel.toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => loadRealTimeAlerts()}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Atualizar
                </button>
                <button
                  onClick={() => {/* Gerar relatório */}}
                  style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  📊 Relatório
                </button>
              </div>
            </div>

            {/* Métricas em Tempo Real */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(59,130,246,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Alertas Ativos</h3>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '8px' }}>
                  {alerts.length}
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  {alerts.filter(a => a.severity === 'critical').length} críticos
                </div>
              </div>

              <div style={{
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(16,185,129,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>💚</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Saúde do Sistema</h3>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6ee7b7', marginBottom: '8px' }}>
                  {systemHealth.status?.toUpperCase() || 'VERIFICANDO...'}
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  {systemHealth.checks?.filter((c: any) => c.status).length || 0}/{systemHealth.checks?.length || 0} serviços OK
                </div>
              </div>

              <div style={{
                background: 'rgba(245,158,11,0.1)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(245,158,11,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔒</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Eventos de Segurança</h3>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '8px' }}>
                  {intelligenceData.security?.totalEvents || 0}
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  Últimas 24h
                </div>
              </div>

              <div style={{
                background: 'rgba(139,92,246,0.1)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(139,92,246,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Performance</h3>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c4b5fd', marginBottom: '8px' }}>
                  {realTimeMetrics.averageResponseTime || 0}ms
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  Tempo médio de resposta
                </div>
              </div>
            </div>

            {/* Lista de Alertas */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '20px',
              padding: '30px',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h3 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '20px' }}>
                🚨 Alertas em Tempo Real
              </h3>

              <div style={{ display: 'grid', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'white' }}>Nenhum alerta ativo!</h4>
                    <p style={{ margin: 0 }}>O sistema está funcionando perfeitamente.</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderLeft: `6px solid ${
                          alert.severity === 'critical' ? '#ef4444' :
                          alert.severity === 'high' ? '#f59e0b' :
                          alert.severity === 'medium' ? '#3b82f6' : '#10b981'
                        }`,
                        animation: alert.severity === 'critical' ? 'pulse 2s infinite' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '24px' }}>
                              {alert.type === 'security' ? '🔒' :
                               alert.type === 'system' ? '🔧' :
                               alert.type === 'business' ? '💼' :
                               alert.type === 'performance' ? '⚡' : '⚠️'}
                            </span>
                            <h4 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
                              {alert.message || alert.title || 'Alerta do Sistema'}
                            </h4>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' :
                                         alert.severity === 'high' ? 'rgba(245,158,11,0.2)' :
                                         alert.severity === 'medium' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)',
                              color: alert.severity === 'critical' ? '#fca5a5' :
                                    alert.severity === 'high' ? '#fbbf24' :
                                    alert.severity === 'medium' ? '#93c5fd' : '#6ee7b7'
                            }}>
                              {alert.severity?.toUpperCase() || 'MEDIUM'}
                            </span>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                              {alert.description || alert.data?.description || 'Detalhes do alerta não disponíveis'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                            <span>🏷️ {alert.type}</span>
                            <span>📅 {alert.timestamp?.toDate?.()?.toLocaleString('pt-BR') || new Date().toLocaleString('pt-BR')}</span>
                            {alert.companyId && <span>🏢 ID: {alert.companyId}</span>}
                            {alert.employeeId && <span>👤 ID: {alert.employeeId}</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                          <button
                            onClick={() => resolveAlert(alert.id, alert.type)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ✅ Resolver
                          </button>

                          <button
                            onClick={() => {/* Ver detalhes */}}
                            style={{
                              padding: '8px 16px',
                              background: 'rgba(59,130,246,0.2)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59,130,246,0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🔍 Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Eventos de Segurança Recentes */}
            {securityEvents.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                borderRadius: '20px',
                padding: '30px',
                marginTop: '30px',
                border: '1px solid rgba(239,68,68,0.3)'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'white', fontSize: '18px' }}>
                  🔒 Eventos de Segurança Recentes
                </h3>

                <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  {securityEvents.slice(0, 10).map((event, index) => (
                    <div
                      key={event.id || index}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {event.event?.includes('login') ? '🔑' :
                           event.event?.includes('access') ? '🚪' :
                           event.event?.includes('violation') ? '⚠️' : '🔒'}
                        </span>
                        <div>
                          <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                            {event.event || 'Evento de segurança'}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                            {event.timestamp?.toDate?.()?.toLocaleString('pt-BR') || 'Agora'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {event.userId && (
                          <span style={{
                            padding: '4px 8px',
                            background: 'rgba(59,130,246,0.2)',
                            color: '#93c5fd',
                            borderRadius: '6px',
                            fontSize: '10px'
                          }}>
                            ID: {event.userId}
                          </span>
                        )}
                        <span style={{
                          padding: '4px 8px',
                          background: event.severity === 'critical' ? 'rgba(239,68,68,0.3)' :
                                     event.severity === 'high' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)',
                          color: event.severity === 'critical' ? '#fca5a5' :
                                event.severity === 'high' ? '#fbbf24' : '#93c5fd',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}>
                          {event.severity?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              📋 Gestão de Relatórios
            </h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              <button
                onClick={() => generateReport('companies')}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(45deg, #3b82f6, #1e40af)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
              >
                📄 Gerar Relatório de Empresas
              </button>
              <button
                onClick={() => generateReport('employees')}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(45deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
              >
                👥 Gerar Relatório de Funcionários
              </button>
              <button
                onClick={() => generateReport('financial')}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(45deg, #f59e0b, #d97706)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
              >
                💰 Gerar Relatório Financeiro
              </button>
              <button
                onClick={() => generateReport('crm')}
                style={{ padding: '1rem 1.5rem', background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
              >
                🎯 Gerar Relatório CRM
              </button>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '2px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h4 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
                  📊 Relatórios Gerados
                </h4>
                <button
                  onClick={() => exportData('reports')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(45deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  📥 Exportar
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Tipo
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Gerado Por
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Data
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Status
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', fontSize: '1rem' }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '1rem' }}>{report.type.toUpperCase()}</td>
                        <td style={{ padding: '1rem' }}>{report.generatedBy}</td>
                        <td style={{ padding: '1rem' }}>
                          {report.createdAt?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.5rem 1rem',
                            background: report.status === 'completed' ? 'linear-gradient(45deg, #10b981, #059669)' :
                                       report.status === 'processing' ? 'linear-gradient(45deg, #f59e0b, #d97706)' :
                                       'linear-gradient(45deg, #ef4444, #dc2626)',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            {report.status.toUpperCase()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => alert('Baixando relatório...')}
                            style={{ padding: '0.5rem', background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem' }}
                          >
                            ⬇️ Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && systemSettings && (
          <div className="settings-section" style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{
              margin: '0 0 2rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚙️ Configurações Críticas do Sistema
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Modo Manutenção */}
              <div style={{
                padding: '2rem',
                background: systemSettings.maintenanceMode ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                border: systemSettings.maintenanceMode ? '2px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px'
              }}>
                <h4 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🚨 Modo de Manutenção
                </h4>
                <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
                  Quando ativado, bloqueia o acesso de todos os usuários exceto super admins.
                </p>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  <input
                    type="checkbox"
                    checked={systemSettings.maintenanceMode}
                    onChange={(e) => updateSystemSettings({ maintenanceMode: e.target.checked })}
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: '#ef4444'
                    }}
                  />
                  {systemSettings.maintenanceMode ? '🔴 MODO MANUTENÇÃO ATIVO' : '🟢 Sistema Operacional'}
                </label>
              </div>

              {/* Configurações de Segurança */}
              <div style={{
                padding: '2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>🔐 Segurança Avançada</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={systemSettings.security.requireMFA}
                      onChange={(e) => updateSystemSettings({
                        security: { ...systemSettings.security, requireMFA: e.target.checked }
                      })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    🛡️ Exigir autenticação de dois fatores para admins
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontWeight: '600' }}>⏱️ Timeout de sessão (horas):</label>
                    <input
                      type="number"
                      value={systemSettings.security.sessionTimeout / (60 * 60 * 1000)}
                      onChange={(e) => updateSystemSettings({
                        security: {
                          ...systemSettings.security,
                          sessionTimeout: parseInt(e.target.value) * 60 * 60 * 1000
                        }
                      })}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        width: '100px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Configuraurações de Backup */}
              <div style={{
                padding: '2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>💾 Backup Automático</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={systemSettings.backup.enabled}
                      onChange={(e) => updateSystemSettings({
                        backup: { ...systemSettings.backup, enabled: e.target.checked }
                      })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    ⚡ Backup automático ativado
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontWeight: '600' }}>📅 Frequência:</label>
                    <select
                      value={systemSettings.backup.frequency}
                      onChange={(e) => updateSystemSettings({
                        backup: {
                          ...systemSettings.backup,
                          frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                        }
                      })}
                      style={{
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Ações de Sistema */}
              <div style={{
                padding: '2rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.3rem' }}>🔧 Ações de Sistema</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {[
                    {
                      label: 'Backup Manual Completo',
                      action: () => alert('Iniciando backup completo...'),
                      color: 'linear-gradient(45deg, #10b981, #059669)',
                      icon: '💾'
                    },
                    {
                      label: 'Limpar Cache Global',
                      action: () => alert('Cache limpo com sucesso!'),
                      color: 'linear-gradient(45deg, #3b82f6, #1e40af)',
                      icon: '🗑️'
                    },
                    {
                      label: 'Reiniciar Serviços',
                      action: () => confirm('Tem certeza? Isso pode afetar usuários online.') && alert('Serviços reiniciados!'),
                      color: 'linear-gradient(45deg, #f59e0b, #d97706)',
                      icon: '🔄'
                    },
                    {
                      label: 'Exportar Logs',
                      action: () => exportData('logs'),
                      color: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                      icon: '📥'
                    }
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      style={{
                        padding: '1rem',
                        background: action.color,
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
              📄 Logs do Sistema
            </h3>
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <input
                type="text"
                placeholder="🔍 Buscar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  minWidth: '300px',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <button
                onClick={() => exportData('logs')}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(45deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                📥 Exportar Logs
              </button>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              borderRadius: '20px',
              border: '2px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Timestamp
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Nível
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Usuário
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Ação
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', fontSize: '1rem' }}>
                        Detalhes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <td style={{ padding: '1rem' }}>
                          {log.timestamp?.toDate?.()?.toLocaleString('pt-BR') || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            padding: '0.3rem 0.8rem',
                            background: log.level === 'error' ? 'rgba(239,68,68,0.2)' :
                                       log.level === 'warn' ? 'rgba(245,158,11,0.2)' :
                                       log.level === 'info' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)',
                            borderRadius: '15px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            color: log.level === 'error' ? '#fca5a5' :
                                   log.level === 'warn' ? '#fbbf24' :
                                   log.level === 'info' ? '#93c5fd' : '#6ee7b7'
                          }}>
                            {log.level?.toUpperCase() || 'INFO'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>{log.user || 'Sistema'}</td>
                        <td style={{ padding: '1rem' }}>{log.action}</td>
                        <td style={{ padding: '1rem' }}>
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'create-admin' && (
          <div className="create-admin-section" style={{ padding: '2rem' }}>
            <SuperAdminCreateForm />
          </div>
        )}

        {activeTab === 'sistema-crm' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{
              margin: '0 0 2rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🎯 Gestão do Sistema CRM
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {/* Métricas do Sistema CRM */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{companies.filter(c => c.sistemasAtivos?.includes('crm')).length}</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Empresas com CRM</div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>
                  R$ {companies.filter(c => c.sistemasAtivos?.includes('crm')).reduce((sum, c) => sum + c.monthlyRevenue, 0).toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Receita CRM</div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>
                  {companies.filter(c => c.sistemasAtivos?.includes('crm')).length > 0
                    ? ((companies.filter(c => c.sistemasAtivos?.includes('crm') && c.active).length / companies.filter(c => c.sistemasAtivos?.includes('crm')).length) * 100).toFixed(1)
                    : 0}%
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Taxa de Ativação</div>
              </div>
            </div>

            {/* Ações Rápidas Premium */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              padding: '2rem',
              borderRadius: '24px',
              border: '2px solid rgba(255,255,255,0.1)',
              marginTop: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🎯 Ações do Sistema CRM
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem'
              }}>
                <button
                  onClick={() => {
                    // Navegar para gestão de empresas no CRM
                    window.open('/crm/empresas', '_blank');
                  }}
                  style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(45deg, #3b82f6, #1e40af)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  🏢 Gerenciar Empresas
                </button>
                <button
                  onClick={() => {
                    // Navegar para gestão de contatos no CRM
                    window.open('/crm/contatos', '_blank');
                  }}
                  style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(45deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,185,129,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  👤 Gerenciar Contatos
                </button>
                <button
                  onClick={() => {
                    // Gerar relatório do sistema CRM
                    generateReport('crm');
                  }}
                  style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(139,92,246,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📊 Relatórios CRM
                </button>
                <button
                  onClick={() => {
                    // Exportar dados do sistema CRM
                    exportData('crm');
                  }}
                  style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(245,158,11,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📥 Exportar Dados CRM
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cria-contas' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(30px)',
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏢</div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              marginBottom: '1rem',
              background: 'linear-gradient(45deg, #ffffff, #ffd700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              CRIAÇÃO UNIVERSAL DE EMPRESAS
            </h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '2rem' }}>
              Crie empresas para todos os sistemas com controle total
            </p>

            <EmpresaManager
              sistema="universal"
              allowCreate={true}
              allowEdit={true}
              allowDelete={isSuperAdmin}
              onEmpresaSelect={(empresa) => {
                console.log('Empresa selecionada:', empresa);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}