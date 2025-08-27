'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';

export default function FinanceiroAuthAdminPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [userType, setUserType] = useState<'colaborador' | 'empresa' | 'contador' | 'adminmaster'>('colaborador');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    empresaId: '',
    telefone: '',
    cargo: '',
    cnpj: '',
    razaoSocial: '',
    crc: '',
    cpf: ''
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
      const usuariosRef = collection(db, 'financeiro_users');
      const q = query(usuariosRef, where('email', '==', userEmail));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as { userType: string; permissions?: string[] };
        const userType = userData.userType;

        // Redirecionar baseado no tipo de usuário
        if (userType === 'contador' || userData.permissions?.includes('full_access')) {
          router.push('/financeiro/contador');
        } else if (userType === 'empresa') {
          router.push('/financeiro/empresa');
        } else if (userType === 'colaborador') {
          router.push('/financeiro/colaborador');
        } else if (userType === 'cliente') {
          router.push('/financeiro/cliente');
        } else {
          router.push('/financeiro/dashboard');
        }
      } else {
        setError('Usuário não encontrado no sistema financeiro');
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

    // Validações específicas por tipo
    if (userType === 'empresa' && !formData.cnpj) {
      setError('CNPJ é obrigatório para empresas');
      return;
    }

    if (userType === 'contador' && !formData.crc) {
      setError('CRC é obrigatório para contadores');
      return;
    }

    if (userType === 'colaborador' && !formData.empresaId) {
      setError('ID da empresa é obrigatório para colaboradores');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Determinar permissões baseado no tipo de usuário
      let permissions: string[] = [];
      let empresaId = formData.empresaId;

      switch (userType) {
        case 'colaborador':
          permissions = ['view_own_documents', 'create_receipts'];
          break;
        case 'empresa':
          permissions = ['manage_employees', 'view_reports', 'export_data', 'ocr_processing'];
          // Gerar ID automaticamente para empresas
          empresaId = `fin_emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          break;
        case 'contador':
          permissions = ['full_access', 'audit_trail', 'tax_calculations', 'compliance_reports'];
          break;
        case 'adminmaster':
          permissions = ['full_access', 'admin_master', 'system_config'];
          empresaId = ''; // Changed to empty string instead of null
          break;
      }

      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.nome,
        userType: userType,
        telefone: formData.telefone || '',
        cargo: formData.cargo || '',
        cnpj: formData.cnpj || null,
        cpf: formData.cpf || null,
        crc: formData.crc || null,
        razaoSocial: formData.razaoSocial || null,
        empresaId: empresaId,
        isActive: true,
        permissions: permissions,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        settings: {
          notifications: true,
          emailReports: true,
          theme: 'system'
        }
      };

      // Salvar no Firestore
      await setDoc(doc(db, 'financeiro_users', userCredential.user.uid), userData);

      // Mostrar ID da empresa gerado se for empresa
      if (userType === 'empresa') {
        alert(`Conta criada com sucesso!\n\nID da sua empresa: ${empresaId}\n\nGuarde este ID para que seus colaboradores possam se cadastrar.`);
      }

      // Redirecionar baseado no tipo
      switch (userType) {
        case 'empresa':
          router.push('/financeiro/empresa');
          break;
        case 'contador':
          router.push('/financeiro/contador');
          break;
        case 'colaborador':
          router.push('/financeiro/colaborador');
          break;
        case 'adminmaster':
          router.push('/financeiro/admin');
          break;
        default:
          router.push('/financeiro/dashboard');
      }
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

  const getErrorMessage = (errorCode: string) => {
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
        {/* ... (rest of the code remains unchanged) */}
      </div>
    );
  }

  return (
    <div className="container">
      {/* ... (rest of the code remains unchanged) */}
    </div>
  );
}