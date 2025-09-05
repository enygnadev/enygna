
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/src/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '@/src/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  url: string;
  tamanho: number;
  empresaId: string;
  uploadedBy: string;
  uploadedAt: any;
  categoria: string;
  descricao?: string;
  tags?: string[];
}

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  empresaId: string;
  sistemasAtivos: string[];
  claims?: any;
}

export default function DocumentosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const categorias = [
    'todos',
    'contratos',
    'faturas',
    'certificados',
    'relatorios',
    'juridico',
    'rh',
    'fiscal',
    'outros'
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await checkUserPermissions(user.email!, user.uid);
      } else {
        console.log('❌ Usuário não logado, redirecionando para login...');
        router.push('/documentos/auth');
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUserPermissions = async (userEmail: string, userUid: string) => {
    try {
      console.log('🔍 Verificando acesso ao sistema documentos para:', userEmail);
      
      // Verificar claims primeiro
      const idToken = await auth.currentUser?.getIdToken(true);
      if (idToken) {
        const decodedToken = await auth.currentUser?.getIdTokenResult();
        const claims = decodedToken?.claims;
        console.log('🎫 Claims do usuário:', claims);

        if (claims?.sistemasAtivos?.includes('documentos')) {
          console.log('✅ Acesso encontrado nos claims');
          setUser(auth.currentUser);
          const userData: UserData = {
            uid: userUid,
            email: userEmail,
            displayName: claims.displayName || userEmail,
            role: claims.role || 'colaborador',
            empresaId: claims.empresaId || '',
            sistemasAtivos: claims.sistemasAtivos || [],
            claims: claims
          };
          setUserData(userData);
          setLoading(false);
          await loadDocumentos(userData.empresaId);
          return;
        }
      }

      // Se não encontrou nos claims, verificar no documento do usuário
      const userDoc = await getDoc(doc(db, 'users', userUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('📊 Dados do usuário encontrados:', data);

        if (data.sistemasAtivos?.includes('documentos')) {
          console.log('✅ Acesso encontrado no documento do usuário');
          setUser(auth.currentUser);
          const userData: UserData = {
            uid: userUid,
            email: userEmail,
            displayName: data.displayName || userEmail,
            role: data.role || 'colaborador',
            empresaId: data.empresaId || '',
            sistemasAtivos: data.sistemasAtivos || [],
            claims: data
          };
          setUserData(userData);
          setLoading(false);
          await loadDocumentos(userData.empresaId);
          return;
        }
      }

      // Verificar se é empresa diretamente
      const empresasRef = collection(db, 'empresas');
      const empresaQuery = query(empresasRef, where('email', '==', userEmail));
      const empresaSnapshot = await getDocs(empresaQuery);

      if (!empresaSnapshot.empty) {
        const empresaDoc = empresaSnapshot.docs[0];
        const empresaData = empresaDoc.data();
        
        if (empresaData.sistemasAtivos?.includes('documentos')) {
          console.log('✅ Empresa tem acesso ao sistema de documentos');
          setUser(auth.currentUser);
          const userData: UserData = {
            uid: userUid,
            email: userEmail,
            displayName: empresaData.nome || userEmail,
            role: 'empresa',
            empresaId: empresaDoc.id,
            sistemasAtivos: empresaData.sistemasAtivos || [],
            claims: empresaData
          };
          setUserData(userData);
          setLoading(false);
          await loadDocumentos(userData.empresaId);
          return;
        }
      }

      console.log('❌ Usuário não tem acesso ao sistema de documentos');
      setError('Você não tem permissão para acessar o sistema de documentos.');
      setLoading(false);

    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
      setError('Erro ao verificar permissões do usuário.');
      setLoading(false);
    }
  };

  const loadDocumentos = async (empresaId: string) => {
    try {
      const documentosRef = collection(db, 'documentos');
      const q = query(
        documentosRef, 
        where('empresaId', '==', empresaId),
        orderBy('uploadedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const docs: Documento[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Documento);
      });
      
      setDocumentos(docs);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setError('Erro ao carregar documentos');
    }
  };

  const handleFileUpload = async (file: File, categoria: string, descricao?: string) => {
    if (!userData) return;

    setUploading(true);
    setError(null);

    try {
      // Upload do arquivo
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `documentos/${userData.empresaId}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Salvar no Firestore
      await addDoc(collection(db, 'documentos'), {
        nome: file.name,
        tipo: file.type,
        url: downloadURL,
        tamanho: file.size,
        categoria,
        descricao: descricao || '',
        empresaId: userData.empresaId,
        uploadedBy: userData.email,
        uploadedAt: serverTimestamp(),
        tags: []
      });

      // Recarregar documentos
      await loadDocumentos(userData.empresaId);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      setError('Erro ao fazer upload do documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocumento = async (documento: Documento) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      // Excluir arquivo do Storage
      const storageRef = ref(storage, documento.url);
      await deleteObject(storageRef);

      // Excluir do Firestore
      await deleteDoc(doc(db, 'documentos', documento.id));

      // Recarregar documentos
      await loadDocumentos(userData!.empresaId);
      
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      setError('Erro ao excluir documento');
    }
  };

  const filteredDocumentos = documentos.filter(doc => {
    const matchCategoria = filterCategoria === 'todos' || doc.categoria === filterCategoria;
    const matchSearch = doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       doc.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategoria && matchSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid rgba(255,165,0,0.3)',
            borderTop: '3px solid #ffa500',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Verificando acesso ao sistema de documentos...</p>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2rem',
          borderRadius: '10px',
          textAlign: 'center',
          maxWidth: '500px',
          border: '1px solid rgba(255,107,107,0.3)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#ff6b6b', marginBottom: '1rem' }}>Acesso Negado</h2>
          <p style={{ color: 'white', marginBottom: '2rem' }}>
            {error || 'Você não tem permissão para acessar o sistema de documentos.'}
          </p>
          <Link href="/sistemas" style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'linear-gradient(45deg, #ffa500, #ff8c00)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
            ← Voltar aos Sistemas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 25%, #2d1b69 50%, #1a1a3e 75%, #0f0f23 100%)',
      color: 'white',
      padding: '2rem'
    }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .upload-area {
          border: 2px dashed rgba(255,165,0,0.5);
          padding: 2rem;
          text-align: center;
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .upload-area:hover {
          border-color: #ffa500;
          background: rgba(255,165,0,0.1);
        }
        .doc-card {
          background: rgba(255,255,255,0.1);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
        }
        .doc-card:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .filter-select, .search-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 5px;
          margin-right: 10px;
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        .btn-primary {
          background: linear-gradient(45deg, #ffa500, #ff8c00);
          color: white;
        }
        .btn-danger {
          background: linear-gradient(45deg, #ff6b6b, #ff5252);
          color: white;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '10px'
      }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            📄 Sistema de Documentos
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
            Gerenciamento de documentos empresariais
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            👤 {userData.displayName} ({userData.role})
          </span>
          <button
            onClick={() => signOut(auth)}
            className="btn btn-danger"
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '2rem',
        borderRadius: '10px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginTop: 0 }}>📤 Upload de Documentos</h3>
        
        <div className="upload-area">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
          <p>Arraste arquivos aqui ou clique para selecionar</p>
          <input
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach(file => {
                const categoria = prompt('Categoria do documento:', 'outros') || 'outros';
                const descricao = prompt('Descrição (opcional):');
                handleFileUpload(file, categoria, descricao || undefined);
              });
            }}
            style={{ display: 'none' }}
            id="file-upload"
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {uploading ? '⏳ Enviando...' : '📎 Selecionar Arquivos'}
          </label>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '10px',
        marginBottom: '2rem',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <label>Categoria:</label>
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="filter-select"
        >
          {categorias.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        <label>Buscar:</label>
        <input
          type="text"
          placeholder="Nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <span style={{ marginLeft: 'auto', opacity: 0.8 }}>
          {filteredDocumentos.length} documento(s)
        </span>
      </div>

      {/* Documents List */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '2rem',
        borderRadius: '10px'
      }}>
        <h3 style={{ marginTop: 0 }}>📋 Documentos</h3>

        {filteredDocumentos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p>Nenhum documento encontrado</p>
          </div>
        ) : (
          <div>
            {filteredDocumentos.map((documento) => (
              <div key={documento.id} className="doc-card">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#ffa500' }}>
                      📎 {documento.nome}
                    </h4>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>
                      <span>📂 {documento.categoria}</span>
                      <span style={{ margin: '0 10px' }}>•</span>
                      <span>📏 {formatFileSize(documento.tamanho)}</span>
                      <span style={{ margin: '0 10px' }}>•</span>
                      <span>👤 {documento.uploadedBy}</span>
                      <span style={{ margin: '0 10px' }}>•</span>
                      <span>📅 {documento.uploadedAt?.toDate?.()?.toLocaleString('pt-BR') || 'Data não disponível'}</span>
                    </div>
                    {documento.descricao && (
                      <p style={{ margin: '5px 0', opacity: 0.9 }}>
                        {documento.descricao}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                      href={documento.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      👁️ Ver
                    </a>
                    <button
                      onClick={() => handleDeleteDocumento(documento)}
                      className="btn btn-danger"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link
          href="/sistemas"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'linear-gradient(45deg, #6c63ff, #5a52d3)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}
        >
          ← Voltar aos Sistemas
        </Link>
      </div>
    </div>
  );
}
