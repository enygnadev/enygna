'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';

export default function FrotaAuthAdminPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'colaborador' | 'empresa' | 'adminmaster'>('colaborador');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    empresaId: '',
    telefone: '',
    cargo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário já logado, verificar permissões
        await checkUserPermissions(user.email!);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUserPermissions = async (userEmail: string) => {
    try {
      const usuariosRef = collection(db, 'users');
      const q = query(usuariosRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const role = userData.role?.toLowerCase();
        
        // Redirecionar baseado no papel do usuário
        if (role === 'superadmin' || role === 'admin' || role === 'gestor') {
          router.push('/frota');
        } else if (role === 'colaborador') {
          // Colaboradores vão direto para a área do motorista
          router.push('/frota/colaborador');
        } else {
          setError('Você não tem permissão para acessar o sistema de frota');
        }
      } else {
        setError('Usuário não encontrado no sistema');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setError('Erro ao verificar permissões do usuário');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      await checkUserPermissions(userCredential.user.email!);
    } catch (error: any) {
      console.error('Erro no login:', error);
      const errorMessage = getErrorMessage(error.code);
      setError(errorMessage);
      
      // Notificação adicional para credenciais inválidas
      if (error.code === 'auth/invalid-credential') {
        setTimeout(() => {
          setError('💡 Dica: Verifique se você digitou o email e a senha corretamente. Se esqueceu sua senha, use a opção "Esqueci minha senha".');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.nome) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Determinar role baseado no tipo de usuário
      let role = 'colaborador';
      let empresaId = formData.empresaId;
      
      if (userType === 'empresa') {
        role = 'admin';
        // Gerar ID automaticamente para empresas
        empresaId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Criar documento da empresa
        await setDoc(doc(db, 'empresas', empresaId), {
          id: empresaId,
          nome: formData.nome,
          email: formData.email,
          adminId: userCredential.user.uid,
          ativo: true,
          dataCriacao: new Date().toISOString(),
          configuracoes: {
            geofencing: null,
            toleranciaMinutos: 15,
            horasTrabalhoDia: 8,
            diasTrabalhoMes: 22
          }
        });
      } else if (userType === 'adminmaster') {
        role = 'superadmin';
        empresaId = '';
      }

      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        nome: formData.nome,
        telefone: formData.telefone || '',
        cargo: formData.cargo || '',
        role: role,
        tipo: userType,
        empresaId: empresaId,
        ativo: true,
        dataCriacao: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        permissions: {
          frota: true,
          ponto: userType !== 'colaborador',
          chamados: true,
          documentos: userType !== 'colaborador'
        }
      };

      await addDoc(collection(db, 'users'), userData);
      
      // Mostrar ID da empresa gerado se for empresa
      if (userType === 'empresa') {
        alert(`Conta criada com sucesso!\n\nID da sua empresa: ${empresaId}\n\nGuarde este ID para que seus colaboradores possam se cadastrar.`);
      }
      
      router.push('/frota');
    } catch (error: any) {
      console.error('Erro no registro:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Digite seu email');
      return;
    }

    setResetLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (error: any) {
      setError(getErrorMessage(error.code));
    } finally {
      setResetLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuário não encontrado';
      case 'auth/wrong-password':
        return 'Senha incorreta';
      case 'auth/invalid-credential':
        return '🚫 Credenciais inválidas. Verifique seu email e senha.';
      case 'auth/email-already-in-use':
        return 'Este email já está em uso';
      case 'auth/weak-password':
        return 'Senha muito fraca';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/too-many-requests':
        return '⚠️ Muitas tentativas de login. Tente novamente mais tarde.';
      default:
        return 'Erro no sistema. Tente novamente.';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (showForgotPassword) {
    return (
      <div className="container">
        {/* ... (rest of the JSX remains unchanged) ... */}
      </div>
    );
  }

  return (
    <div className="container">
      {/* ... (rest of the JSX remains unchanged) ... */}
    </div>
  );
}