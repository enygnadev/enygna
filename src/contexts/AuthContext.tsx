'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  IdTokenResult
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateCSRFToken } from '@/lib/csrf';
import { logAuditEvent, AuditEventType } from '@/lib/audit';

// Interface para o contexto de autenticação
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  claims: CustomClaims | null;
  claimsLoaded: boolean;
  loading: boolean;
  error: string | null;
  csrfToken: string | null;
  
  // Métodos de autenticação
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshClaims: () => Promise<void>;
  verifyEmail: () => Promise<void>;
  
  // Verificações de permissão
  hasRole: (roles: string[]) => boolean;
  belongsToCompany: (empresaId: string) => boolean;
  isEmailVerified: () => boolean;
}

// Interface para o perfil do usuário
interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'superadmin' | 'adminmaster' | 'admin' | 'gestor' | 'colaborador' | 'viewer';
  empresaId?: string;
  empresaNome?: string;
  createdAt?: any;
  lastLogin?: any;
}

// Interface para custom claims
interface CustomClaims {
  role?: string;
  empresaId?: string;
  permissions?: string[];
  [key: string]: any;
}

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider do contexto de autenticação
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claims, setClaims] = useState<CustomClaims | null>(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Carregar perfil do usuário do Firestore
  const loadUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL,
          role: data.role || 'colaborador',
          empresaId: data.empresaId,
          empresaNome: data.empresaNome,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
        };
      }
      
      // Se não existir, criar perfil básico
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'colaborador',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'users', user.uid), newProfile);
      return newProfile;
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Carregar custom claims do token
  const loadCustomClaims = async (user: User): Promise<CustomClaims> => {
    try {
      const idTokenResult = await user.getIdTokenResult(true);
      const customClaims = idTokenResult.claims;
      
      // Extrair apenas custom claims (não incluir claims padrão do Firebase)
      const { 
        iss, sub, aud, exp, iat, auth_time, 
        user_id, firebase, email, email_verified,
        ...actualCustomClaims 
      } = customClaims;
      
      return actualCustomClaims as CustomClaims;
    } catch (error) {
      console.error('Error loading custom claims:', error);
      return {};
    }
  };

  // Criar sessão segura no servidor
  const createServerSession = async (user: User): Promise<void> => {
    try {
      const idToken = await user.getIdToken(true);
      
      // Obter token CSRF
      const newCsrfToken = generateCSRFToken();
      setCsrfToken(newCsrfToken);
      
      // Criar sessão no servidor
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': newCsrfToken,
        },
        body: JSON.stringify({ idToken }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      
      const data = await response.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      
    } catch (error) {
      console.error('Failed to create server session:', error);
      throw error;
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      
      // Criar sessão no servidor
      await createServerSession(credential.user);
      
      // Log de auditoria
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_SUCCESS,
        userId: credential.user.uid,
        userEmail: credential.user.email || undefined,
        severity: 'low',
        details: { method: 'email/password' }
      });
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      
      // Log de tentativa falha
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILED,
        userEmail: email,
        severity: 'medium',
        details: { error: error.code }
      });
      
      throw error;
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil
      await updateProfile(credential.user, { displayName });
      
      // Enviar email de verificação
      await sendEmailVerification(credential.user);
      
      // Criar perfil no Firestore
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName,
        role: 'colaborador',
        createdAt: serverTimestamp(),
        emailVerified: false,
      });
      
      // Criar sessão
      await createServerSession(credential.user);
      
    } catch (error: any) {
      console.error('Sign up error:', error);
      setError(error.message || 'Failed to create account');
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Limpar sessão no servidor
      await fetch('/api/session', {
        method: 'DELETE',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      
      // Log de auditoria
      if (user) {
        await logAuditEvent({
          eventType: AuditEventType.LOGOUT,
          userId: user.uid,
          userEmail: user.email || undefined,
          severity: 'low',
        });
      }
      
      // Sign out do Firebase
      await firebaseSignOut(auth);
      
      // Limpar estados
      setUser(null);
      setProfile(null);
      setClaims(null);
      setClaimsLoaded(false);
      setCsrfToken(null);
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(error.message || 'Failed to send password reset email');
      throw error;
    }
  };

  // Refresh claims
  const refreshClaims = async () => {
    if (!user) return;
    
    try {
      const newClaims = await loadCustomClaims(user);
      setClaims(newClaims);
      setClaimsLoaded(true);
    } catch (error) {
      console.error('Failed to refresh claims:', error);
    }
  };

  // Verify email
  const verifyEmail = async () => {
    if (!user) throw new Error('No user logged in');
    
    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Failed to send verification email');
      throw error;
    }
  };

  // Verificações de permissão
  const hasRole = (roles: string[]): boolean => {
    if (!profile || !profile.role) return false;
    return roles.includes(profile.role);
  };

  const belongsToCompany = (empresaId: string): boolean => {
    if (!profile) return false;
    return profile.empresaId === empresaId;
  };

  const isEmailVerified = (): boolean => {
    return user?.emailVerified || false;
  };

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Carregar perfil e claims em paralelo
        const [profileData, claimsData] = await Promise.all([
          loadUserProfile(firebaseUser),
          loadCustomClaims(firebaseUser),
        ]);
        
        setProfile(profileData);
        setClaims(claimsData);
        setClaimsLoaded(true);
        
        // Atualizar último login
        if (profileData) {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            { lastLogin: serverTimestamp() },
            { merge: true }
          );
        }
      } else {
        setUser(null);
        setProfile(null);
        setClaims(null);
        setClaimsLoaded(false);
        setCsrfToken(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    claims,
    claimsLoaded,
    loading,
    error,
    csrfToken,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshClaims,
    verifyEmail,
    hasRole,
    belongsToCompany,
    isEmailVerified,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook para verificar se o usuário está autenticado
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);
  
  return { user, loading };
}

// Hook para verificar permissões
export function useRequireRole(roles: string[], redirectTo = '/unauthorized') {
  const { profile, loading, hasRole } = useAuth();
  
  useEffect(() => {
    if (!loading && profile && !hasRole(roles)) {
      window.location.href = redirectTo;
    }
  }, [profile, loading, hasRole, roles, redirectTo]);
  
  return { authorized: hasRole(roles), loading };
}