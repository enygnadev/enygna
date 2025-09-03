'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';
import { 
  DocumentoFinanceiro, 
  FinanceiroUser, 
  ProcessingStatus,
  DocumentoFiscalType 
} from '@/src/types/financeiro';
import { useCallback } from 'react'; 
import EmpresaManager from '@/src/components/EmpresaManager';

interface DashboardStats {
  totalDocumentos: number;
  documentosPendentes: number;
  valorTotalProcessado: number;
  ultimoProcessamento: string;
}

export default function FinanceiroEmpresaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<FinanceiroUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalDocumentos: 0,
    documentosPendentes: 0,
    valorTotalProcessado: 0,
    ultimoProcessamento: 'Nunca'
  });
  const [documentos, setDocumentos] = useState<DocumentoFinanceiro[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documentos' | 'empresas' | 'configuracoes'>('dashboard');
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [recentDocuments, setRecentDocuments] = useState<DocumentoFinanceiro[]>([]); 

  const IntlFormat = Intl;

  const userRole = userData?.userType; // Assuming userType reflects the role

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser.email!);
        await loadDashboardData(); 
      } else {
        router.push('/financeiro/auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUserData = async (email: string) => {
    try {
      const usuariosRef = collection(db, 'financeiro_users');
      const q = query(usuariosRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as FinanceiroUser;
        setUserData(data);

        if (data.userType !== 'empresa') {
          router.push('/financeiro/auth');
          return;
        }
      } else {
        router.push('/financeiro/auth');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      router.push('/financeiro/auth');
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const docsQuery = query(
        collection(db, 'financeiro_documentos'),
        where('userId', '==', user.uid),
        limit(10)
      );

      const docsSnapshot = await getDocs(docsQuery);
      const documentos = docsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DocumentoFinanceiro[];

      documentos.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

      setRecentDocuments(documentos);

      const totalDocumentos = documentos.length;
      const documentosPendentes = documentos.filter(doc => doc.status === 'pending').length;
      const valorTotalProcessado = documentos
        .filter(doc => doc.status === 'completed')
        .reduce((total, doc) => total + (doc.valores?.valorLiquido || 0), 0);

      const ultimoDoc = documentos[0];
      const ultimoProcessamento = ultimoDoc 
        ? new Date(ultimoDoc.createdAt || '').toLocaleDateString('pt-BR')
        : 'Nunca';

      setDashboardStats({
        totalDocumentos,
        documentosPendentes,
        valorTotalProcessado,
        ultimoProcessamento
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]); 

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); 


  const handleUploadDocument = async (file: File, tipo: DocumentoFiscalType) => {
    if (!user || !userData) return;

    setUploading(true);
    try {

      const novoDocumento: DocumentoFinanceiro = {
        tipo,
        numero: `DOC-${Date.now()}`,
        dataEmissao: new Date().toISOString(),
        competencia: new Date().toISOString().substring(0, 7), // YYYY-MM
        emitente: {
          cnpj: '00000000000000',
          razaoSocial: 'Documento Importado',
          endereco: {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            uf: '',
            cep: '',
            pais: 'Brasil'
          }
        },
        destinatario: {
          cnpj: userData?.cnpj || '00000000000000',
          razaoSocial: userData?.razaoSocial || 'Empresa',
          endereco: {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            uf: '',
            cep: '',
            pais: 'Brasil'
          }
        },
        valores: {
          valorBruto: 0,
          valorLiquido: 0,
          valorTotalTributos: 0
        },
        itens: [],
        impostos: [],
        status: 'pending',
        statusAprovacao: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        anexos: [{
          id: `anexo-${Date.now()}`,
          nome: file.name,
          tipo: file.type.includes('pdf') ? 'pdf' : file.type.includes('xml') ? 'xml' : 'other',
          tamanho: file.size,
          url: '',
          hash: '',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid
        }]
      };

      await addDoc(collection(db, 'financeiro_documentos'), novoDocumento);

      await loadDashboardData(); 

      alert('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      alert('Erro ao enviar documento. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/financeiro/auth');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          color: 'white',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '20px' }}>🔄</div>
          Carregando sistema financeiro...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
        <ThemeSelector size="small" showLabels={false} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              💰 Sistema Financeiro - Empresa
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
              Bem-vindo, {userData?.displayName || user?.email}
            </p>
            {userData?.razaoSocial && (
              <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: '14px' }}>
                {userData.razaoSocial} - CNPJ: {userData.cnpj}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'documentos', label: 'Documentos', icon: '📄' },
          { id: 'empresas', label: 'Empresas', icon: '🏢' },
          { id: 'configuracoes', label: 'Configurações', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id 
                ? 'rgba(255,255,255,0.3)' 
                : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>📄 Total de Documentos</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                {dashboardStats.totalDocumentos}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>⏳ Pendentes</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                {dashboardStats.documentosPendentes}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>💰 Valor Processado</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                {IntlFormat.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(dashboardStats.valorTotalProcessado)}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white'
            }}>
              <h3 style={{ margin: '0 0 10px 0' }}>🕒 Último Processamento</h3>
              <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                {dashboardStats.ultimoProcessamento}
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            padding: '20px',
            borderRadius: '15px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white'
          }}>
            <h3 style={{ marginTop: 0 }}>📋 Documentos Recentes</h3>
            {isLoading ? (
              <p>Carregando documentos recentes...</p>
            ) : recentDocuments.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Nenhum documento processado ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentDocuments.slice(0, 5).map(doc => (
                  <div key={doc.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{doc.anexos?.[0]?.nome || doc.numero}</strong>
                      <br />
                      <small style={{ opacity: 0.7 }}>
                        {doc.tipo} • {new Date(doc.createdAt || '').toLocaleDateString('pt-BR')}
                      </small>
                    </div>
                    <div style={{
                      background: doc.status === 'completed' 
                        ? 'rgba(76, 175, 80, 0.3)' 
                        : doc.status === 'pending'
                        ? 'rgba(255, 193, 7, 0.3)'
                        : 'rgba(244, 67, 54, 0.3)',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      fontSize: '12px'
                    }}>
                      {doc.status === 'completed' && '✅ Processado'}
                      {doc.status === 'pending' && '⏳ Pendente'}
                      {doc.status === 'error' && '❌ Erro'}
                      {doc.status === 'processing' && '🔄 Processando'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          borderRadius: '15px',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white'
        }}>
          <h3 style={{ marginTop: 0 }}>📄 Gestão de Documentos</h3>

          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <h4>📤 Enviar Novo Documento</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['nfe', 'nfce', 'nfse', 'recibo', 'boleto'].map(tipo => (
                <label key={tipo} style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <input
                    type="file"
                    accept=".pdf,.xml,.txt,.jpg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadDocument(file, tipo as DocumentoFiscalType);
                      }
                    }}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  {uploading ? '⏳' : '📎'} {tipo.toUpperCase()}
                </label>
              ))}
            </div>
            {uploading && (
              <p style={{ marginTop: '10px', opacity: 0.8 }}>
                🔄 Enviando documento...
              </p>
            )}
          </div>

          <div>
            <h4>📋 Meus Documentos</h4>
            {documentos.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Nenhum documento encontrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documentos.map(doc => (
                  <div key={doc.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <div>
                        <strong>{doc.anexos?.[0]?.nome || doc.numero}</strong>
                        <br />
                        <small style={{ opacity: 0.7 }}>
                          Tipo: {doc.tipo} • Enviado em: {new Date(doc.createdAt || '').toLocaleString('pt-BR')}
                        </small>
                        {doc.valores?.valorLiquido && (
                          <br />
                        )}
                        {doc.valores?.valorLiquido && (
                          <small style={{ opacity: 0.8 }}>
                            Valor: {IntlFormat.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(doc.valores.valorLiquido)}
                          </small>
                        )}
                      </div>
                      <div style={{
                        background: doc.status === 'completed' 
                          ? 'rgba(76, 175, 80, 0.3)' 
                          : doc.status === 'pending'
                          ? 'rgba(255, 193, 7, 0.3)'
                          : 'rgba(244, 67, 54, 0.3)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        fontSize: '12px'
                      }}>
                        {doc.status === 'completed' && '✅ Processado'}
                        {doc.status === 'pending' && '⏳ Pendente'}
                        {doc.status === 'error' && '❌ Erro'}
                        {doc.status === 'processing' && '🔄 Processando'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aba Empresas */}
      {activeTab === 'empresas' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          borderRadius: '15px',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white'
        }}>
          <h3 style={{ marginTop: 0 }}>🏢 Gestão de Empresas</h3>
          <EmpresaManager 
            sistema="financeiro"
            allowCreate={(userRole as any) === 'admin' || (userRole as any) === 'superadmin'}
            allowEdit={(userRole as any) === 'admin' || (userRole as any) === 'superadmin'}
            allowDelete={(userRole as any) === 'superadmin'}
            onEmpresaSelect={(empresa) => {
              console.log('Empresa selecionada para financeiro:', empresa);
              // Implementar filtros financeiros por empresa
            }}
          />
        </div>
      )}

      {/* Aba Configurações */}
      {activeTab === 'configuracoes' && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          padding: '20px',
          borderRadius: '15px',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'white'
        }}>
          <h3 style={{ marginTop: 0 }}>⚙️ Configurações da Empresa</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4>🏢 Dados da Empresa</h4>
              <p><strong>Razão Social:</strong> {userData?.razaoSocial || 'Não informado'}</p>
              <p><strong>CNPJ:</strong> {userData?.cnpj || 'Não informado'}</p>
              <p><strong>Email:</strong> {userData?.email}</p>
              <p><strong>Tipo de Usuário:</strong> {userData?.userType}</p>
            </div>

            <div>
              <h4>🔒 Permissões</h4>
              <ul style={{ paddingLeft: '20px' }}>
                {userData?.permissions?.map(permission => (
                  <li key={permission}>{permission}</li>
                )) || <li>Nenhuma permissão especial</li>}
              </ul>
            </div>

            <div>
              <h4>📊 Estatísticas</h4>
              <p><strong>Documentos Processados:</strong> {userData?.documentsCount || 0}</p>
              <p><strong>Valor Total:</strong> {
                userData?.totalValue 
                  ? IntlFormat.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(userData.totalValue)
                  : 'R$ 0,00'
              }</p>
              <p><strong>Último Acesso:</strong> {
                userData?.lastAccess 
                  ? new Date(userData.lastAccess).toLocaleString('pt-BR')
                  : 'Primeiro acesso'
              }</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}