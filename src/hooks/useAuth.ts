'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserData, UserPermissions } from '@/src/lib/types';
import { AuthClaims, SecureUser } from '@/lib/securityHelpers';

// Redefine AuthContextType to include the new profile structure and claims
interface AuthContextType {
  user: User | null;
  profile: SessionProfile | null; // Changed from userData
  loading: boolean;
  // Keep existing methods or adapt them if necessary
  hasPermission: (system: keyof UserPermissions) => boolean;
  isRole: (role: string | string[]) => boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>; // May need to be renamed or adapted to refreshProfile
}

// Define the new SessionProfile type
export type SessionProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  role?: 'superadmin' | 'admin' | 'gestor' | 'colaborador' | 'adminmaster';
  empresaId?: string;
  sistemasAtivos?: string[];
  claims?: AuthClaims; // New field for custom claims
};

// New helper functions (as provided in the edited snippet)
export function isAdminMaster(profile: SessionProfile | null): boolean {
  return profile?.role === 'adminmaster' ||
         profile?.role === 'superadmin' ||
         profile?.claims?.bootstrapAdmin === true;
}

export function hasAdminAccess(profile: SessionProfile | null): boolean {
  return ['adminmaster', 'superadmin', 'admin', 'gestor'].includes(profile?.role || '');
}

// Create the AuthContext with the new type
const AuthContext = createContext<AuthContextType | null>(null);

// Existing useAuth hook, modified to return profile instead of userData
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

// New hook to manage session profile
export const useSessionProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // Obter claims customizados do token
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims as AuthClaims;

        // Obter dados do usuário do Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() as UserData : {}; // Cast to UserData if necessary

        setProfile({
          uid: user.uid,
          email: user.email || undefined,
          displayName: user.displayName || userData.displayName,
          role: claims.role || userData.role || 'colaborador',
          empresaId: claims.empresaId || userData.empresaId,
          sistemasAtivos: claims.sistemasAtivos || userData.sistemasAtivos || [],
          claims
        });
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);

        // Fallback básico
        setProfile({
          uid: user.uid,
          email: user.email || undefined,
          displayName: user.displayName || undefined,
          role: 'colaborador', // Default role
          claims: {} // Default empty claims
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { loading, profile };
};

// The AuthProvider component needs to be updated to use useSessionProfile and provide the new context
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userEmail: string): Promise<UserData | null> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as UserData;
        return data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      return null;
    }
  };

  const refreshUserData = async () => {
    if (user?.email) {
      setLoading(true);
      const data = await loadUserData(user.email);
      setProfile(prev => prev ? { ...prev, ...data } : data); // Merge with existing profile if available
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const claims = tokenResult.claims as AuthClaims;

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() as UserData : {};

          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            displayName: firebaseUser.displayName || userData.displayName,
            role: claims.role || userData.role || 'colaborador',
            empresaId: claims.empresaId || userData.empresaId,
            sistemasAtivos: claims.sistemasAtivos || userData.sistemasAtivos || [],
            claims
          });
        } catch (error) {
          console.error('Erro ao carregar perfil no AuthProvider:', error);
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            displayName: firebaseUser.displayName || undefined,
            role: 'colaborador',
            claims: {}
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (system: keyof UserPermissions): boolean => {
    if (!profile || !profile.claims?.permissions) return false;
    return profile.claims.permissions[system] === true;
  };

  const isRole = (role: string | string[]): boolean => {
    if (!profile) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(profile.role?.toLowerCase() || '');
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    hasPermission,
    isRole,
    signOut,
    refreshUserData, // This method might need refactoring to refreshProfile based on new structure
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};