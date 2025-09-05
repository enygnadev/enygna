
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserData, UserPermissions } from '@/src/lib/types';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  hasPermission: (system: keyof UserData['permissions']) => boolean;
  isRole: (role: string | string[]) => boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const useAuthData = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
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
      setUserData(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser?.email) {
        const data = await loadUserData(firebaseUser.email);
        setUserData(data);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (system: keyof UserPermissions): boolean => {
    if (!userData || !userData.permissions) return false;
    return userData.permissions[system] === true;
  };

  const isRole = (role: string | string[]): boolean => {
    if (!userData) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(userData.role.toLowerCase());
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
  };

  return {
    user,
    userData,
    loading,
    hasPermission,
    isRole,
    signOut,
    refreshUserData
  };
};

export { AuthContext };
