# 🔒 Sistema de Segurança - ENY-GNA Lab

## Visão Geral

Este documento descreve as medidas de segurança implementadas no sistema ENY-GNA Lab, um sistema enterprise de gestão com Next.js e Firebase.

## Recursos de Segurança Implementados

### 1. Headers de Segurança
- **CSP (Content Security Policy)**: Previne XSS e injeção de código
- **HSTS**: Força uso de HTTPS
- **X-Frame-Options**: Previne clickjacking
- **X-Content-Type-Options**: Previne MIME sniffing
- **Referrer-Policy**: Controla informações do referrer

### 2. Autenticação e Sessões
- **Cookies HTTPOnly**: Sessões seguras sem exposição ao JavaScript
- **Firebase Admin SDK**: Validação server-side
- **Session Cookies**: Expiração de 7 dias
- **CSRF Protection**: Tokens para prevenir ataques CSRF

### 3. Rate Limiting
- **Login**: 5 tentativas por minuto por IP
- **APIs Sensíveis**: Limites configuráveis
- **Cooldown Progressivo**: Aumenta tempo de espera após múltiplas tentativas

### 4. Sistema Honeypot
- **Endpoints Falsos**: `/api/__debug` e `/api/admin/__old`
- **Detecção de Invasão**: Registra tentativas suspeitas
- **Alertas Automáticos**: Notificações para administradores

### 5. Firebase Security Rules
- **Multi-tenant**: Isolamento por empresa
- **RBAC**: Controle baseado em roles
- **Validação de Claims**: Verificação server-side
- **Limites de Upload**: 20MB para arquivos gerais

### 6. Auditoria e Logging
- **Eventos de Segurança**: Login, logout, acessos negados
- **Logs Imutáveis**: Não podem ser editados ou deletados
- **Rastreamento de IP**: Para análise forense

## Como Usar

### Verificar Autenticação em Páginas

```tsx
// Página protegida
import { useRequireAuth } from '@/contexts/AuthContext';

export default function ProtectedPage() {
  const { user, loading } = useRequireAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return <div>Conteúdo protegido para {user?.email}</div>;
}
```

### Verificar Roles

```tsx
// Página admin
import { useRequireRole } from '@/contexts/AuthContext';

export default function AdminPage() {
  const { authorized, loading } = useRequireRole(['admin', 'adminmaster']);
  
  if (loading) return <div>Verificando permissões...</div>;
  if (!authorized) return <div>Acesso negado</div>;
  
  return <div>Painel Admin</div>;
}
```

### Fazer Chamadas de API Seguras

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { csrfToken } = useAuth();
  
  const handleSubmit = async () => {
    const response = await fetch('/api/protected', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken || '',
      },
      body: JSON.stringify({ data: 'example' }),
    });
  };
}
```

## Configuração de Ambiente

### Variáveis Necessárias

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Servidor)
FIREBASE_SERVICE_ACCOUNT_KEY= # JSON completo do service account
# OU
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

## Deploy das Rules

Para aplicar as regras de segurança no Firebase:

```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules  
firebase deploy --only storage:rules
```

## Monitoramento

### Verificar Logs de Auditoria

No Firebase Console:
1. Acesse Firestore
2. Navegue para `Auditoria > Logs > Events`
3. Filtre por `severity: 'high'` ou `severity: 'critical'`

### Verificar Honeypot

Monitore acessos suspeitos em:
- `Auditoria > Honeypot > Hits`
- `Auditoria > Honeypot > AdminTrap`

## Roles e Permissões

### Hierarquia
1. **superadmin/adminmaster**: Acesso total
2. **admin**: Gerenciamento da empresa
3. **gestor**: Acesso a módulos específicos
4. **colaborador**: Acesso básico
5. **viewer**: Somente leitura

### Matriz de Permissões

| Módulo | Colaborador | Gestor | Admin | AdminMaster |
|--------|------------|---------|--------|-------------|
| Ponto | ✅ Próprio | ✅ Todos | ✅ | ✅ |
| Chamados | ✅ | ✅ | ✅ | ✅ |
| CRM | Leitura | ✅ | ✅ | ✅ |
| Financeiro | ❌ | ✅ | ✅ | ✅ |
| Frota | Leitura | ✅ | ✅ | ✅ |
| Admin | ❌ | ❌ | ✅ | ✅ |

## Melhores Práticas

1. **Nunca** exponha tokens ou segredos no código
2. **Sempre** valide dados no servidor
3. **Use** rate limiting em todas as APIs públicas
4. **Monitore** logs de auditoria regularmente
5. **Atualize** dependências regularmente
6. **Teste** as regras de segurança antes do deploy

## Resposta a Incidentes

### Em caso de atividade suspeita:

1. **Detectar**: Verificar logs de auditoria e honeypot
2. **Conter**: Bloquear IPs suspeitos
3. **Erradicar**: Revogar sessões comprometidas
4. **Recuperar**: Restaurar de backups se necessário
5. **Aprender**: Atualizar regras de segurança

## Contato de Segurança

Para reportar vulnerabilidades:
- Email: security@enygna.com
- Resposta em até 24 horas

---

**Última atualização**: Janeiro 2025