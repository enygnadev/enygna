'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeSelector from '@/src/components/ThemeSelector';
import EmpresaManager from '@/src/components/EmpresaManager';

// Import dinâmlico do Firebase para evitar erros SSR
let auth: any, db: any;
let onAuthStateChanged: any, doc: any, getDoc: any, addDoc: any, collection: any, query: any, where: any, getDocs: any, orderBy: any, deleteDoc: any, updateDoc: any;

if (typeof window !== 'undefined') {
  Promise.all([
    import('@/src/lib/firebase'),
    import('firebase/auth'),
    import('firebase/firestore')
  ]).then(([firebase, authModule, firestoreModule]) => {
    auth = firebase.auth;
    db = firebase.db;
    onAuthStateChanged = authModule.onAuthStateChanged;
    doc = firestoreModule.doc;
    getDoc = firestoreModule.getDoc;
    addDoc = firestoreModule.addDoc;
    collection = firestoreModule.collection;
    query = firestoreModule.query;
    where = firestoreModule.where;
    getDocs = firestoreModule.getDocs;
    orderBy = firestoreModule.orderBy;
    deleteDoc = firestoreModule.deleteDoc;
    updateDoc = firestoreModule.updateDoc;
  }).catch(error => {
    console.error('Erro ao carregar Firebase:', error);
  });
}

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'contract' | 'report' | 'certificate' | 'letter' | 'form' | 'custom';
  description: string;
  fields: DocumentField[];
  template: string;
  createdAt: number;
  updatedAt: number;
}

interface DocumentField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  content: string;
  data: Record<string, any>;
  createdAt: number;
  createdBy: string;
  empresaId: string;
  htmlContent?: string;
  aiGenerated?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UserData {
  uid: string;
  email: string;
  role: string;
  empresaId: string;
  sistemasAtivos: string[];
  ativo: boolean;
  nome: string;
  permissions?: {
    isEmpresa?: boolean;
    canAccessSystems?: string[];
  };
}

export default function DocumentosPage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generator' | 'chat' | 'ocr' | 'templates' | 'history' | 'empresas'>('generator');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Chat IA
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // OCR
  const [ocrImages, setOcrImages] = useState<File[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;
    let unsubscribe: any;

    const initFirebase = async () => {
      try {
        if (typeof window === 'undefined') return;

        const [firebase, authModule, firestoreModule] = await Promise.all([
          import('@/src/lib/firebase'),
          import('firebase/auth'),
          import('firebase/firestore')
        ]);

        if (!mounted) return;

        const authInstance = firebase.auth;

        unsubscribe = authModule.onAuthStateChanged(authInstance, async (currentUser) => {
          if (!mounted) return;

          try {
            if (currentUser) {
              console.log('🔍 Verificando acesso ao sistema documentos para:', currentUser.email);

              // Buscar dados do usuário
              const userDocRef = firestoreModule.doc(firebase.db, 'users', currentUser.uid);
              const userDoc = await firestoreModule.getDoc(userDocRef);

              if (!userDoc.exists()) {
                console.error('❌ Usuário não encontrado no sistema');
                if (mounted) {
                  window.location.href = '/documentos/auth';
                }
                return;
              }

              const userDataFromDB = userDoc.data() as UserData;
              console.log('📊 Dados do usuário encontrados:', userDataFromDB);

              // Verificar se o usuário está ativo
              if (!userDataFromDB.ativo) {
                console.error('❌ Usuário inativo');
                if (mounted) {
                  window.location.href = '/documentos/auth';
                }
                return;
              }

              // Verificar acesso ao sistema de documentos
              const hasDocumentosAccess = userDataFromDB.sistemasAtivos?.includes('documentos') ||
                                        userDataFromDB.permissions?.canAccessSystems?.includes('documentos') ||
                                        userDataFromDB.role === 'superadmin' ||
                                        userDataFromDB.role === 'adminmaster';

              if (!hasDocumentosAccess) {
                console.error('❌ Usuário sem acesso ao sistema de documentos');
                if (mounted) {
                  window.location.href = '/documentos/auth';
                }
                return;
              }

              console.log('✅ Acesso ao sistema de documentos confirmado');

              // Buscar dados da empresa se existir empresaId
              let empresaInfo = null;
              if (userDataFromDB.empresaId) {
                try {
                  const empresaDocRef = firestoreModule.doc(firebase.db, 'empresas', userDataFromDB.empresaId);
                  const empresaDoc = await firestoreModule.getDoc(empresaDocRef);

                  if (empresaDoc.exists()) {
                    empresaInfo = { id: empresaDoc.id, ...empresaDoc.data() };
                    console.log('🏢 Dados da empresa carregados:', empresaInfo);
                  }
                } catch (error) {
                  console.warn('⚠️ Erro ao carregar dados da empresa:', error);
                }
              }

              if (mounted) {
                setUser(currentUser);
                setUserData(userDataFromDB);
                setEmpresaData(empresaInfo);

                // Carregar templates com fallback para templates locais
                try {
                  let templatesQuery;

                  // Se tem empresaId, buscar templates da empresa
                  if (userDataFromDB.empresaId) {
                    templatesQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'document_templates'),
                      firestoreModule.where('empresaId', '==', userDataFromDB.empresaId),
                      firestoreModule.orderBy('name', 'asc')
                    );
                  } else {
                    // Templates globais
                    templatesQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'document_templates'),
                      firestoreModule.orderBy('name', 'asc')
                    );
                  }

                  const templatesSnapshot = await firestoreModule.getDocs(templatesQuery);
                  const templatesData = templatesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                  }));

                  // Se não há templates no Firestore, usar templates locais
                  if (templatesData.length === 0) {
                    setTemplates(getLocalTemplates());
                  } else {
                    setTemplates(templatesData as DocumentTemplate[]);
                  }
                } catch (error) {
                  console.error('Erro ao carregar templates:', error);
                  setTemplates(getLocalTemplates());
                }

                // Carregar documentos do usuário
                try {
                  let documentsQuery;

                  if (userDataFromDB.empresaId) {
                    // Buscar documentos da empresa
                    documentsQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'generated_documents'),
                      firestoreModule.where('empresaId', '==', userDataFromDB.empresaId),
                      firestoreModule.orderBy('createdAt', 'desc')
                    );
                  } else {
                    // Buscar documentos do usuário
                    documentsQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'generated_documents'),
                      firestoreModule.where('createdBy', '==', currentUser.uid),
                      firestoreModule.orderBy('createdAt', 'desc')
                    );
                  }

                  const documentsSnapshot = await firestoreModule.getDocs(documentsQuery);
                  const documentsData = documentsSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data()
                  }));
                  setDocuments(documentsData as GeneratedDocument[]);
                } catch (error) {
                  console.error('Erro ao carregar documentos:', error);
                  setDocuments([]);
                }

                initializeChatWelcome();
              }
            } else {
              console.log('❌ Usuário não autenticado');
              if (mounted) {
                window.location.href = '/documentos/auth';
              }
              return;
            }
          } catch (error) {
            console.error('Erro ao verificar acesso do usuário:', error);
            if (mounted) {
              window.location.href = '/documentos/auth';
            }
            return;
          }

          if (mounted) {
            setLoading(false);
          }
        });

      } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        if (mounted) {
          setLoading(false);
          window.location.href = '/documentos/auth';
        }
      }
    };

    initFirebase();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const initializeChatWelcome = () => {
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: `👋 Olá${userData?.nome ? `, ${userData.nome}` : ''}! Sou seu assistente inteligente para geração de documentos.

Posso ajudar você a:
• 📝 Criar qualquer tipo de documento
• 🎯 Gerar contratos, relatórios, declarações
• 📊 Preencher formulários automaticamente
• 🔍 Extrair dados de imagens (OCR)
• ✨ Personalizar templates existentes

**Como usar:**
- Digite o tipo de documento que precisa
- Descreva os detalhes necessários
- Eu gero o documento completo para você!

**Exemplos:**
"Crie um contrato de prestação de serviços"
"Preciso de uma declaração de renda"
"Gere um relatório mensal de vendas"

O que posso criar para você hoje?`,
      timestamp: Date.now()
    }]);
  };

  // Templates locais como fallback - Estrutura Universal Completa
  const getLocalTemplates = (): DocumentTemplate[] => {
    return [
      // ===== JURÍDICO =====
      {
        id: 'procuracao-simples',
        name: 'Procuração Simples',
        type: 'custom',
        description: 'Documento para outorgar poderes a terceiros',
        fields: [
          { name: 'outorgante_cpf', label: 'CPF/CNPJ do Outorgante', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'outorgante_nome', label: 'Nome do Outorgante', type: 'text', required: true, placeholder: 'João Silva Santos' },
          { name: 'outorgante_nacionalidade', label: 'Nacionalidade', type: 'text', required: true, placeholder: 'brasileiro' },
          { name: 'outorgante_estado_civil', label: 'Estado Civil', type: 'select', required: true, options: ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)'] },
          { name: 'outorgante_profissao', label: 'Profissão', type: 'text', required: true, placeholder: 'Engenheiro' },
          { name: 'outorgante_rg', label: 'RG', type: 'text', required: true, placeholder: '12.345.678-9' },
          { name: 'outorgante_endereco', label: 'Endereço', type: 'text', required: true, placeholder: 'Rua das Flores, 123' },
          { name: 'procurador_cpf', label: 'CPF do Procurador', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'procurador_nome', label: 'Nome do Procurador', type: 'text', required: true, placeholder: 'Maria Santos Silva' },
          { name: 'procurador_nacionalidade', label: 'Nacionalidade do Procurador', type: 'text', required: true, placeholder: 'brasileira' },
          { name: 'procurador_estado_civil', label: 'Estado Civil do Procurador', type: 'select', required: true, options: ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)'] },
          { name: 'procurador_profissao', label: 'Profissão do Procurador', type: 'text', required: true, placeholder: 'Advogada' },
          { name: 'procurador_rg', label: 'RG do Procurador', type: 'text', required: true, placeholder: '98.765.432-1' },
          { name: 'procurador_endereco', label: 'Endereço do Procurador', type: 'text', required: true, placeholder: 'Avenida Central, 456' },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `PROCURAÇÃO

Eu, {{outorgante_nome}}, {{outorgante_nacionalidade}}, {{outorgante_estado_civil}}, {{outorgante_profissao}}, portador(a) do RG nº {{outorgante_rg}} e CPF nº {{outorgante_cpf}}, residente e domiciliado(a) à {{outorgante_endereco}}, por este instrumento particular, nomeio e constituo como meu(minha) bastante procurador(a) o(a) Sr.(a) {{procurador_nome}}, {{procurador_nacionalidade}}, {{procurador_estado_civil}}, {{procurador_profissao}}, portador(a) do RG nº {{procurador_rg}} e CPF nº {{procurador_cpf}}, residente e domiciliado(a) à {{procurador_endereco}}, para o fim específico de:

- Representar-me perante repartições públicas, empresas e instituições em geral;
- Assinar documentos em meu nome;
- Praticar todos os atos necessários ao bom e fiel cumprimento do presente mandato.

A presente procuração é válida por 90 (noventa) dias a contar desta data.

{{cidade}}, {{data_atual}}

_________________________________
{{outorgante_nome}}
Outorgante

RECONHECIMENTO DE FIRMA
________________________`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'contrato-servicos',
        name: 'Contrato de Prestação de Serviços',
        type: 'contract',
        description: 'Contrato padrão para prestação de serviços',
        fields: [
          { name: 'contratante_cnpj_cpf', label: 'CNPJ/CPF do Contratante', type: 'text', required: true, placeholder: '12.345.678/0001-90' },
          { name: 'contratante_nome', label: 'Nome/Razão Social do Contratante', type: 'text', required: true, placeholder: 'Empresa ABC Ltda' },
          { name: 'contratante_endereco', label: 'Endereço do Contratante', type: 'text', required: true, placeholder: 'Rua Comercial, 100' },
          { name: 'contratado_cnpj_cpf', label: 'CNPJ/CPF do Contratado', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'contratado_nome', label: 'Nome/Razão Social do Contratado', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'contratado_endereco', label: 'Endereço do Contratado', type: 'text', required: true, placeholder: 'Rua dos Prestadores, 50' },
          { name: 'objeto', label: 'Objeto do Contrato', type: 'textarea', required: true, placeholder: 'Prestação de serviços de...' },
          { name: 'prazo_meses', label: 'Prazo (meses)', type: 'number', required: true, placeholder: '12' },
          { name: 'data_inicio', label: 'Data de Início', type: 'date', required: true },
          { name: 'valor_total', label: 'Valor Total (R$)', type: 'text', required: true, placeholder: '10.000,00' },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{contratante_nome}}, inscrito no CNPJ/CPF nº {{contratante_cnpj_cpf}}, com sede/residência à {{contratante_endereco}}

CONTRATADO: {{contratado_nome}}, inscrito no CNPJ/CPF nº {{contratado_cnpj_cpf}}, com sede/residência à {{contratado_endereco}}

OBJETO: O presente contrato tem por objeto {{objeto}}.

PRAZO: O prazo de vigência será de {{prazo_meses}} meses, iniciando em {{data_inicio}}.

VALOR: O valor total dos serviços será de R$ {{valor_total}}, pago conforme cronograma anexo.

OBRIGAÇÕES DO CONTRATADO:
- Executar os serviços com qualidade e pontualidade;
- Manter sigilo sobre informações confidenciais;
- Entregar o trabalho no prazo estabelecido.

OBRIGAÇÕES DO CONTRATANTE:
- Fornecer informações necessárias para execução;
- Efetuar pagamentos conforme acordado;
- Dar condições adequadas para trabalho.

{{cidade}}, {{data_atual}}

_____________________          _____________________
    CONTRATANTE                    CONTRATADO`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'declaracao-renda',
        name: 'Declaração de Renda',
        type: 'certificate',
        description: 'Declaração de renda para fins diversos',
        fields: [
          { name: 'cpf', label: 'CPF', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'nome_completo', label: 'Nome Completo', type: 'text', required: true, placeholder: 'João Silva Santos' },
          { name: 'rg', label: 'RG', type: 'text', required: true, placeholder: '12.345.678-9' },
          { name: 'endereco', label: 'Endereço Completo', type: 'text', required: true, placeholder: 'Rua das Flores, 123' },
          { name: 'empresa', label: 'Empresa/Empregador', type: 'text', required: true, placeholder: 'Tech Solutions Ltda' },
          { name: 'cargo', label: 'Cargo/Função', type: 'text', required: true, placeholder: 'Desenvolvedor' },
          { name: 'renda_mensal', label: 'Renda Mensal (R$)', type: 'text', required: true, placeholder: '5.000,00' },
          { name: 'finalidade', label: 'Finalidade da Declaração', type: 'text', required: true, placeholder: 'Financiamento imobiliário' }
        ],
        template: `DECLARAÇÃO DE RENDA

Eu, {{nome_completo}}, portador(a) do CPF nº {{cpf}} e RG nº {{rg}}, residente e domiciliado(a) à {{endereco}}, declaro para os devidos fins que possuo renda mensal no valor de R$ {{renda_mensal}}, proveniente de salário como {{cargo}} na empresa {{empresa}}.

Esta declaração é feita para fins de {{finalidade}} e é verdadeira em todos os seus termos.

Por ser expressão da verdade, firmo a presente.

{{data_atual}}

_________________________________
{{nome_completo}}
CPF: {{cpf}}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'recibo-pagamento',
        name: 'Recibo de Pagamento',
        type: 'form',
        description: 'Recibo para comprovação de pagamento',
        fields: [
          { name: 'pagador_cnpj_cpf', label: 'CNPJ/CPF do Pagador', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'pagador_nome', label: 'Nome do Pagador', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'recebedor_cnpj_cpf', label: 'CNPJ/CPF do Recebedor', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'recebedor_nome', label: 'Nome do Recebedor', type: 'text', required: true, placeholder: 'Maria Santos' },
          { name: 'valor_pago', label: 'Valor Pago (R$)', type: 'text', required: true, placeholder: '1.500,00' },
          { name: 'referente_pagamento', label: 'Referente ao Pagamento', type: 'textarea', required: true, placeholder: 'Serviços de consultoria...' },
          { name: 'forma_pagamento', label: 'Forma de Pagamento', type: 'select', required: true, options: ['Dinheiro', 'PIX', 'Transferência', 'Cartão', 'Cheque'] },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `RECIBO DE PAGAMENTO

Eu, {{recebedor_nome}}, inscrito no CPF/CNPJ {{recebedor_cnpj_cpf}}, recebi de {{pagador_nome}}, inscrito no CPF/CNPJ {{pagador_cnpj_cpf}}, a quantia de R$ {{valor_pago}}, referente a {{referente_pagamento}}.

Forma de pagamento: {{forma_pagamento}}

Para clareza firmo o presente recibo.

{{cidade}}, {{data_atual}}

_________________________________
{{recebedor_nome}}
Recebedor`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
  };

  const loadTemplates = async () => {
    if (!userData?.empresaId) return;

    try {
      let templatesQuery;

      if (userData.empresaId) {
        templatesQuery = query(
          collection(db, 'document_templates'),
          where('empresaId', '==', userData.empresaId),
          orderBy('name', 'asc')
        );
      } else {
        templatesQuery = query(
          collection(db, 'document_templates'),
          orderBy('name', 'asc')
        );
      }

      const snapshot = await getDocs(templatesQuery);
      const templatesData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as DocumentTemplate[];

      if (templatesData.length === 0) {
        setTemplates(getLocalTemplates());
      } else {
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      setTemplates(getLocalTemplates());
    }
  };

  const loadDocuments = async () => {
    if (!user?.uid || !userData) return;

    try {
      let documentsQuery;

      if (userData.empresaId) {
        documentsQuery = query(
          collection(db, 'generated_documents'),
          where('empresaId', '==', userData.empresaId),
          orderBy('createdAt', 'desc')
        );
      } else {
        documentsQuery = query(
          collection(db, 'generated_documents'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(documentsQuery);
      const documentsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as GeneratedDocument[];
      setDocuments(documentsData);
    } catch (error) {
      console.error('Erro ao carregar documents:', error);
      setDocuments([]);
    }
  };

  const generateDocumentWithAI = async (prompt: string) => {
    setIsAiTyping(true);

    try {
      let documentData;

      try {
        const response = await fetch('/api/ai/assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `Você é um especialista em geração de documentos profissionais. Gere um documento baseado na solicitação do usuário.`
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
          const aiResponse = data.choices[0].message.content;
          try {
            documentData = JSON.parse(aiResponse);
          } catch {
            documentData = {
              tipo: 'Documento Personalizado',
              titulo: 'Documento Gerado por IA',
              conteudo_texto: aiResponse,
              conteudo_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">${aiResponse.replace(/\n/g, '<br>')}</div>`,
              campos_editaveis: [],
              instrucoes: 'Documento gerado automaticamente pela IA'
            };
          }
        } else {
          throw new Error('Resposta inválida da IA');
        }
      } catch (error) {
        console.log('IA indisponível, usando geração local:', error);
        documentData = generateDocumentLocally(prompt);
      }

      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Documento criado com sucesso!**

**Tipo:** ${documentData.tipo}
**Título:** ${documentData.titulo}

${documentData.instrucoes || ''}

O documento foi gerado e está pronto para visualização e impressão. Você pode editá-lo na aba "Gerar Documento" ou fazer o download diretamente.`,
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, assistantMessage]);

      setGeneratedContent(documentData.conteudo_texto);
      setGeneratedHtml(documentData.conteudo_html);

      await saveAIDocument(documentData);

      setActiveTab('generator');

    } catch (error) {
      console.error('Erro ao gerar documento:', error);

      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao gerar o documento. Tente novamente com uma descrição mais específica.',
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, errorMessage]);
    }

    setIsAiTyping(false);
  };

  const generateDocumentLocally = (prompt: string) => {
    const currentDate = new Date().toLocaleDateString('pt-BR');

    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('procuração')) {
      return {
        tipo: 'Procuração',
        titulo: 'Procuração Simples',
        conteudo_texto: `PROCURAÇÃO

Eu, _________________________, brasileiro(a), _______ (estado civil), _______ (profissão), portador(a) do RG nº ______________ e CPF nº ________________, residente e domiciliado(a) à ______________________________, por este instrumento particular, nomeio e constituo como meu(minha) bastante procurador(a) o(a) Sr.(a) _________________________, brasileiro(a), _______ (estado civil), _______ (profissão), portador(a) do RG nº ______________ e CPF nº ________________, residente e domiciliado(a) à ______________________________, para o fim específico de:

- Representar-me perante repartições públicas, empresas e instituições em geral;
- Assinar documentos em meu nome;
- Praticar todos os atos necessários ao bom e fiel cumprimento do presente mandato.

A presente procuração é válida por 90 (noventa) dias a contar desta data.

_______________________, ${currentDate}

_________________________________
Assinatura do Outorgante

RECONHECIMENTO DE FIRMA
________________________`,
        conteudo_html: `
<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">PROCURAÇÃO</h1>
  </div>
  <div style="text-align: justify; margin-bottom: 30px;">
    <p>Eu, <strong>_________________________</strong>, brasileiro(a), <strong>_______</strong> (estado civil), <strong>_______</strong> (profissão), portador(a) do RG nº <strong>______________</strong> e CPF nº <strong>________________</strong>, residente e domiciliado(a) à <strong>______________________________</strong>, por este instrumento particular, nomeio e constituo como meu(minha) bastante procurador(a) o(a) Sr.(a) <strong>_________________________</strong>, brasileiro(a), <strong>_______</strong> (estado civil), <strong>_______</strong> (profissão), portador(a) do RG nº <strong>______________</strong> e CPF nº <strong>________________</strong>, residente e domiciliado(a) à <strong>______________________________</strong>, para o fim específico de:</p>
  </div>
  <div style="margin: 30px 0;">
    <ul style="padding-left: 30px;">
      <li>Representar-me perante repartições públicas, empresas e instituições em geral;</li>
      <li>Assinar documentos em meu nome;</li>
      <li>Praticar todos os atos necessários ao bom e fiel cumprimento do presente mandato.</li>
    </ul>
  </div>
  <div style="margin: 30px 0;">
    <p>A presente procuração é válida por <strong>90 (noventa) dias</strong> a contar desta data.</p>
  </div>
  <div style="margin-top: 60px;">
    <p>_______________________, ${currentDate}</p>
  </div>
  <div style="margin-top: 80px; text-align: center;">
    <div style="display: inline-block; border-top: 1px solid black; width: 300px; padding-top: 5px;">
      <strong>Assinatura do Outorgante</strong>
    </div>
  </div>
  <div style="margin-top: 60px;">
    <p><strong>RECONHECIMENTO DE FIRMA</strong></p>
    <p>________________________</p>
  </div>
</div>`,
        campos_editaveis: ['outorgante', 'procurador', 'finalidade'],
        instrucoes: 'Preencha os campos destacados com os dados do outorgante e procurador. Documento válido por 90 dias.'
      };
    }

    return {
      tipo: 'Documento Personalizado',
      titulo: `Documento - ${currentDate}`,
      conteudo_texto: `DOCUMENTO

Data: ${currentDate}

Assunto: ${prompt}

Prezado(a) Senhor(a),

Por meio deste documento, venho formalizar a seguinte solicitação:

${prompt}

Atenciosamente,

_________________________________
Nome: _________________________
CPF: __________________________
Data: ${currentDate}`,
      conteudo_html: `
<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 18px; font-weight: bold; margin: 0;">DOCUMENTO</h1>
  </div>
  <div style="margin-bottom: 20px;">
    <p><strong>Data:</strong> ${currentDate}</p>
  </div>
  <div style="margin-bottom: 20px;">
    <p><strong>Assunto:</strong> ${prompt}</p>
  </div>
  <div style="margin-bottom: 30px;">
    <p>Prezado(a) Senhor(a),</p>
  </div>
  <div style="margin-bottom: 30px; text-align: justify;">
    <p>Por meio deste documento, venho formalizar a seguinte solicitação:</p>
    <p style="margin-left: 20px; font-style: italic;">${prompt}</p>
  </div>
  <div style="margin-bottom: 30px;">
    <p>Atenciosamente,</p>
  </div>
  <div style="margin-top: 80px;">
    <p>_________________________________</p>
    <p><strong>Nome:</strong> _________________________</p>
    <p><strong>CPF:</strong> __________________________</p>
    <p><strong>Data:</strong> ${currentDate}</p>
  </div>
</div>`,
      campos_editaveis: ['nome', 'cpf', 'assunto'],
      instrucoes: 'Documento personalizado gerado localmente. Preencha os campos necessários.'
    };
  };

  const saveAIDocument = async (documentData: any) => {
    if (!user || !userData) return;

    try {
      const documentToSave = {
        templateId: 'ai-generated',
        templateName: documentData.tipo,
        title: documentData.titulo,
        content: documentData.conteudo_texto,
        htmlContent: documentData.conteudo_html,
        data: {},
        createdAt: Date.now(),
        createdBy: user.uid,
        empresaId: userData.empresaId || '',
        aiGenerated: true
      };

      await addDoc(collection(db, 'generated_documents'), documentToSave);
      await loadDocuments();
      console.log('✅ Documento salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      console.log('⚠️ Documento gerado mas não foi possível salvar no histórico');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');

    await generateDocumentWithAI(currentInput);
  };

  const buscarCEP = async (cep: string) => {
    if (!cep || cep.length < 8) return null;

    try {
      const cepLimpo = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado');
      }

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
        cep: data.cep
      };
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  };

  const buscarDadosCPF = async (cpf: string) => {
    if (!cpf || cpf.length < 11) return null;

    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      const response = await fetch(`/api/cpf?cpf=${cpfLimpo}`);
      const data = await response.json();

      if (data.success && data.nome) {
        return {
          nome: data.nome,
          cpf: formatCpfCnpj(cpf),
          nascimento: data.nascimento || null,
          genero: data.genero || null
        };
      }

      if (data.success && data.validFormat) {
        return {
          nome: null,
          cpf: formatCpfCnpj(cpf),
          nascimento: null,
          genero: null,
          message: data.message || 'CPF válido, mas sem dados disponíveis'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do CPF:', error);
      return null;
    }
  };

  const buscarDadosCNPJ = async (cnpj: string) => {
    if (!cnpj || cnpj.length < 14) return null;

    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const response = await fetch(`/api/cnpj?cnpj=${cnpjLimpo}`);

      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou inválido');
      }

      const data = await response.json();

      if (data.nome) {
        return {
          razao_social: data.nome,
          nome_fantasia: data.fantasia || '',
          cnpj: formatCpfCnpj(cnpj),
          situacao: data.status || '',
          endereco: data.endereco ? `${data.endereco.street || ''}, ${data.endereco.number || ''}` : '',
          bairro: data.endereco?.district || '',
          cidade: data.endereco?.city || '',
          uf: data.endereco?.state || '',
          cep: data.endereco?.zip || '',
          telefone: data.endereco?.phone || '',
          email: data.email,
          atividade_principal: data.atividadePrincipal || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do CNPJ:', error);
      return null;
    }
  };

  const formatCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length <= 11) {
      return cleaned
        .replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, p1, p2, p3, p4) => {
          return [p1, p2, p3].filter(Boolean).join('.') + (p4 ? `-${p4}` : '');
        });
    } else {
      return cleaned
        .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, p1, p2, p3, p4, p5) => {
          return `${p1}.${p2}.${p3}/${p4}-${p5}`;
        });
    }
  };

  const isValidCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return /^\d{11}$/.test(cleaned);
    } else if (cleaned.length === 14) {
      return /^\d{14}$/.test(cleaned);
    }
    return false;
  };

  const formatCEP = (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 0) return '';
    if (cepLimpo.length <= 5) return cepLimpo;
    return cepLimpo.replace(/(\d{5})(\d{1,3})/, '$1-$2').substring(0, 9);
  };

  const formatTelefone = (telefone: string) => {
    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length === 0) return '';
    if (telLimpo.length <= 2) return `(${telLimpo}`;
    if (telLimpo.length <= 6) return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2)}`;
    if (telLimpo.length <= 10) {
      return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 6)}-${telLimpo.substring(6)}`;
    }
    return `(${telLimpo.substring(0, 2)}) ${telLimpo.substring(2, 7)}-${telLimpo.substring(7, 11)}`;
  };

  const validateCPF = (cpf: string): { valid: boolean; message?: string } => {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      return { valid: false, message: 'CPF deve conter exatamente 11 dígitos' };
    }

    if (!isValidCpfCnpj(cpfLimpo)) {
      return { valid: false, message: 'CPF inválido' };
    }

    return { valid: true };
  };

  const validateCNPJ = (cnpj: string): { valid: boolean; message?: string } => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      return { valid: false, message: 'CNPJ deve conter exatamente 14 dígitos' };
    }

    if (!isValidCpfCnpj(cnpjLimpo)) {
      return { valid: false, message: 'CNPJ inválido' };
    }

    return { valid: true };
  };

  const validateCEP = (cep: string): { valid: boolean; message?: string } => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return { valid: false, message: 'CEP deve conter exatamente 8 dígitos' };
    }
    if (!/^\d{8}$/.test(cepLimpo)) {
      return { valid: false, message: 'CEP deve conter apenas números' };
    }
    return { valid: true };
  };

  const validateTelefone = (telefone: string): { valid: boolean; message?: string } => {
    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length < 10) {
      return { valid: false, message: 'Telefone deve ter pelo menos 10 dígitos' };
    }
    if (telLimpo.length > 11) {
      return { valid: false, message: 'Telefone deve ter no máximo 11 dígitos' };
    }
    const ddd = parseInt(telLimpo.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return { valid: false, message: 'DDD inválido. Deve estar entre 11 e 99' };
    }
    return { valid: true };
  };

  const applyMask = (value: string, fieldName: string): string => {
    if (fieldName.toLowerCase().includes('cpf') || fieldName.toLowerCase().includes('cnpj')) {
      return formatCpfCnpj(value);
    } else if (fieldName.toLowerCase().includes('cep')) {
      return formatCEP(value);
    } else if (fieldName.toLowerCase().includes('telefone') || fieldName.toLowerCase().includes('fone')) {
      return formatTelefone(value);
    }
    return value;
  };

  const preencherPorCEP = async (cep: string, fieldName: string) => {
    const validation = validateCEP(cep);
    if (!validation.valid) {
      alert(`❌ ${validation.message}`);
      return;
    }

    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = '🔍 Buscando endereço...';
    loadingAlert.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #3b82f6; color: white; padding: 1rem;
      border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(loadingAlert);

    try {
      const dadosCEP = await buscarCEP(cep);

      if (dadosCEP) {
        const novoFormData = { ...formData };

        const mapeamento: Record<string, string> = {
          'endereco': dadosCEP.logradouro,
          'bairro': dadosCEP.bairro,
          'cidade': dadosCEP.cidade,
          'uf': dadosCEP.uf,
          'cep': formatCEP(cep),
          'outorgante_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'procurador_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'contratante_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'contratado_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`
        };

        Object.keys(mapeamento).forEach(campo => {
          if (selectedTemplate?.fields.some(field => field.name === campo)) {
            novoFormData[campo] = mapeamento[campo];
          }
        });

        if (fieldName.includes('endereco')) {
          novoFormData[fieldName] = `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}`;
        }

        setFormData(novoFormData);

        loadingAlert.innerHTML = '✅ Endereço encontrado!';
        loadingAlert.style.background = '#10b981';
        setTimeout(() => document.body.removeChild(loadingAlert), 2000);

        setTimeout(() => {
          const numeroInput = document.querySelector(`input[placeholder*="Número"]`) as HTMLInputElement;
          if (numeroInput) numeroInput.focus();
        }, 500);

      } else {
        loadingAlert.innerHTML = '❌ CEP não encontrado';
        loadingAlert.style.background = '#ef4444';
        setTimeout(() => document.body.removeChild(loadingAlert), 3000);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      loadingAlert.innerHTML = '❌ Erro ao buscar CEP';
      loadingAlert.style.background = '#ef4444';
      setTimeout(() => document.body.removeChild(loadingAlert), 3000);
    }
  };

  const preencherPorCPF = async (cpf: string, fieldName: string) => {
    const validation = validateCPF(cpf);
    if (!validation.valid) {
      alert(`❌ CPF inválido: ${validation.message}`);
      return;
    }

    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = '🔍 Consultando CPF...';
    loadingAlert.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #3b82f6; color: white; padding: 1rem;
      border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(loadingAlert);

    try {
      const dadosCPF = await buscarDadosCPF(cpf);

      if (dadosCPF) {
        const novoFormData = { ...formData };

        if (dadosCPF.nome) {
          const isOutorgante = fieldName.toLowerCase().includes('outorgante');
          const isProcurador = fieldName.toLowerCase().includes('procurador');
          const isContratante = fieldName.toLowerCase().includes('contratante');
          const isContratado = fieldName.toLowerCase().includes('contratado');

          const mapeamento: Record<string, string> = {
            'nome_completo': dadosCPF.nome,
            'nome': dadosCPF.nome,
            'cpf': formatCpfCnpj(cpf)
          };

          if (isOutorgante) {
            mapeamento['outorgante_nome'] = dadosCPF.nome;
            mapeamento['outorgante_cpf'] = formatCpfCnpj(cpf);

            if (dadosCPF.genero) {
              const generoTexto = dadosCPF.genero === 'M' ? 'masculino' :
                                dadosCPF.genero === 'F' ? 'feminino' : 'não informado';
              mapeamento['outorgante_genero'] = generoTexto;
              mapeamento['genero'] = generoTexto;
            }

            if (dadosCPF.nascimento) {
              const dataNascimento = new Date(dadosCPF.nascimento);
              const nascimentoFormatado = dataNascimento.toLocaleDateString('pt-BR');
              mapeamento['outorgante_nascimento'] = nascimentoFormatado;
              mapeamento['data_nascimento'] = nascimentoFormatado;
              mapeamento['nascimento'] = nascimentoFormatado;
            }
          } else if (isProcurador) {
            mapeamento['procurador_nome'] = dadosCPF.nome;
            mapeamento['procurador_cpf'] = formatCpfCnpj(cpf);

            if (dadosCPF.genero) {
              const generoTexto = dadosCPF.genero === 'M' ? 'masculino' :
                                dadosCPF.genero === 'F' ? 'feminino' : 'não informado';
              mapeamento['procurador_genero'] = generoTexto;
            }

            if (dadosCPF.nascimento) {
              const dataNascimento = new Date(dadosCPF.nascimento);
              const nascimentoFormatado = dataNascimento.toLocaleDateString('pt-BR');
              mapeamento['procurador_nascimento'] = nascimentoFormatado;
            }
          } else if (isContratante) {
            mapeamento['contratante_nome'] = dadosCPF.nome;
            mapeamento['contratante_cnpj_cpf'] = formatCpfCnpj(cpf);

            if (dadosCPF.genero) {
              const generoTexto = dadosCPF.genero === 'M' ? 'masculino' :
                                dadosCPF.genero === 'F' ? 'feminino' : 'não informado';
              mapeamento['contratante_genero'] = generoTexto;
            }

            if (dadosCPF.nascimento) {
              const dataNascimento = new Date(dadosCPF.nascimento);
              const nascimentoFormatado = dataNascimento.toLocaleDateString('pt-BR');
              mapeamento['contratante_nascimento'] = nascimentoFormatado;
            }
          } else if (isContratado) {
            mapeamento['contratado_nome'] = dadosCPF.nome;
            mapeamento['contratado_cnpj_cpf'] = formatCpfCnpj(cpf);

            if (dadosCPF.genero) {
              const generoTexto = dadosCPF.genero === 'M' ? 'masculino' :
                                dadosCPF.genero === 'F' ? 'feminino' : 'não informado';
              mapeamento['contratado_genero'] = generoTexto;
            }

            if (dadosCPF.nascimento) {
              const dataNascimento = new Date(dadosCPF.nascimento);
              const nascimentoFormatado = dataNascimento.toLocaleDateString('pt-BR');
              mapeamento['contratado_nascimento'] = nascimentoFormatado;
            }
          }

          Object.keys(mapeamento).forEach(campo => {
            if (selectedTemplate?.fields.some(field => field.name === campo)) {
              novoFormData[campo] = mapeamento[campo];
            }
          });

          let detalhes = ['Nome: ' + dadosCPF.nome];
          if (dadosCPF.genero) {
            const generoTexto = dadosCPF.genero === 'M' ? 'Masculino' :
                              dadosCPF.genero === 'F' ? 'Feminino' : 'Não informado';
            detalhes.push('Gênero: ' + generoTexto);
          }
          if (dadosCPF.nascimento) {
            const dataNascimento = new Date(dadosCPF.nascimento);
            detalhes.push('Nascimento: ' + dataNascimento.toLocaleDateString('pt-BR'));
          }

          loadingAlert.textContent = '✅ Dados encontrados!';
          const detailsElement = document.createElement('small');
          detailsElement.textContent = detalhes.join(' • ');
          detailsElement.style.display = 'block';
          loadingAlert.appendChild(detailsElement);
          loadingAlert.style.background = '#10b981';
        } else {
          novoFormData[fieldName] = formatCpfCnpj(cpf);

          loadingAlert.textContent = dadosCPF.message || '⚠️ CPF válido, mas sem dados disponíveis';
          loadingAlert.style.background = '#f59e0b';
        }

        setFormData(novoFormData);
        setTimeout(() => document.body.removeChild(loadingAlert), 4000);

      } else {
        loadingAlert.innerHTML = '⚠️ CPF válido, preenchimento manual necessário';
        loadingAlert.style.background = '#f59e0b';
        setTimeout(() => document.body.removeChild(loadingAlert), 3000);

        const novoFormData = { ...formData };
        novoFormData[fieldName] = formatCpfCnpj(cpf);
        setFormData(novoFormData);
      }
    } catch (error) {
      console.error('Erro ao buscar CPF:', error);
      loadingAlert.innerHTML = '⚠️ CPF válido, preenchimento manual';
      loadingAlert.style.background = '#f59e0b';
      setTimeout(() => document.body.removeChild(loadingAlert), 3000);

      const novoFormData = { ...formData };
      novoFormData[fieldName] = formatCpfCnpj(cpf);
      setFormData(novoFormData);
    }
  };

  const preencherPorCNPJ = async (cnpj: string, fieldName: string) => {
    const validation = validateCNPJ(cnpj);
    if (!validation.valid) {
      alert(`❌ CNPJ inválido: ${validation.message}`);
      return;
    }

    const loadingAlert = document.createElement('div');
    loadingAlert.innerHTML = '🔍 Consultando CNPJ...';
    loadingAlert.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: #3b82f6; color: white; padding: 1rem;
      border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(loadingAlert);

    try {
      const dadosCNPJ = await buscarDadosCNPJ(cnpj);

      if (dadosCNPJ && dadosCNPJ.razao_social) {
        const novoFormData = { ...formData };

        const mapeamento: Record<string, string> = {
          'nome_completo': dadosCNPJ.razao_social,
          'razao_social': dadosCNPJ.razao_social,
          'nome_fantasia': dadosCNPJ.nome_fantasia,
          'contratante_nome': dadosCNPJ.razao_social,
          'contratado_nome': dadosCNPJ.razao_social,
          'empresa': dadosCNPJ.razao_social,
          'cnpj': formatCpfCnpj(cnpj),
          'contratante_cnpj_cpf': formatCpfCnpj(cnpj),
          'contratado_cnpj_cpf': formatCpfCnpj(cnpj),
          'endereco': dadosCNPJ.endereco,
          'contratante_endereco': `${dadosCNPJ.endereco}, ${dadosCNPJ.bairro}, ${dadosCNPJ.cidade} - ${dadosCNPJ.uf}`,
          'contratado_endereco': `${dadosCNPJ.endereco}, ${dadosCNPJ.bairro}, ${dadosCNPJ.cidade} - ${dadosCNPJ.uf}`,
          'cidade': dadosCNPJ.cidade,
          'telefone': dadosCNPJ.telefone ? formatTelefone(dadosCNPJ.telefone) : '',
          'email': dadosCNPJ.email,
          'atividade_principal': dadosCNPJ.atividade_principal
        };

        Object.keys(mapeamento).forEach(campo => {
          if (selectedTemplate?.fields.some(field => field.name === campo)) {
            novoFormData[campo] = mapeamento[campo];
          }
        });

        setFormData(novoFormData);

        loadingAlert.innerHTML = '✅ Empresa encontrada!';
        loadingAlert.style.background = '#10b981';
        setTimeout(() => document.body.removeChild(loadingAlert), 2000);

      } else {
        loadingAlert.innerHTML = '⚠️ CNPJ válido, mas sem dados disponíveis';
        loadingAlert.style.background = '#f59e0b';
        setTimeout(() => document.body.removeChild(loadingAlert), 3000);

        const novoFormData = { ...formData };
        novoFormData[fieldName] = formatCpfCnpj(cnpj);
        setFormData(novoFormData);
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      loadingAlert.innerHTML = '⚠️ CNPJ válido, preenchimento manual';
      loadingAlert.style.background = '#f59e0b';
      setTimeout(() => document.body.removeChild(loadingAlert), 3000);

      const novoFormData = { ...formData };
      novoFormData[fieldName] = formatCpfCnpj(cnpj);
      setFormData(novoFormData);
    } finally {
      setTimeout(() => {
        if (document.body.contains(loadingAlert)) {
          document.body.removeChild(loadingAlert);
        }
      }, 5000);
    }
  };

  const processOCR = async () => {
    if (ocrImages.length === 0) return;

    setOcrLoading(true);

    try {
      const ocrFormData = new FormData();
      ocrImages.forEach((file, index) => {
        ocrFormData.append(`image_${index}`, file);
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockExtractedData = {
        nome: 'João Silva Santos',
        cpf: '123.456.789-00',
        rg: '12.345.678-9',
        endereco: 'Rua das Flores, 123',
        cidade: 'São Paulo',
        cep: '01234-567',
        telefone: '(11) 98765-4321',
        email: 'joao.silva@email.com',
        empresa: 'Tech Solutions Ltda',
        cargo: 'Desenvolvedor Senior',
        salario: 'R$ 8.000,00',
        data_nascimento: '15/03/1985'
      };

      setExtractedData(mockExtractedData);

      if (selectedTemplate) {
        const newFormObject = { ...formData };
        selectedTemplate.fields.forEach(field => {
          const extractedValue = mockExtractedData[field.name as keyof typeof mockExtractedData];
          if (extractedValue) {
            newFormObject[field.name] = extractedValue;
          }
        });
        setFormData(newFormObject);
      }

      alert('✅ Dados extraídos com sucesso das imagens!');

    } catch (error) {
      console.error('Erro no OCR:', error);
      alert('❌ Erro ao processar imagens. Tente novamente.');
    }

    setOcrLoading(false);
  };

  const generateDocument = async () => {
    if (!selectedTemplate || !user || !userData) return;

    setIsGenerating(true);
    try {
      let content = selectedTemplate.template;
      let htmlContent = selectedTemplate.template;

      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        content = content.replace(regex, value);
        htmlContent = htmlContent.replace(regex, `<strong>${value}</strong>`);
      });

      const currentDate = new Date().toLocaleDateString('pt-BR');
      content = content.replace(/{{data_atual}}/g, currentDate);
      htmlContent = htmlContent.replace(/{{data_atual}}/g, `<strong>${currentDate}</strong>`);

      let previewContent = selectedTemplate.template;

      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        if (value) {
          previewContent = previewContent.replace(regex, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${value}</span>`);
        } else {
          previewContent = previewContent.replace(regex, `<span style="background: #fff2cc; padding: 2px 4px; border-radius: 3px; border: 1px dashed #fbbf24; color: #92400e; font-weight: bold;">___ ${field.label} ___</span>`);
        }
      });

      const previewCurrentDate = new Date().toLocaleDateString('pt-BR');
      previewContent = previewContent.replace(/{{data_atual}}/g, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${previewCurrentDate}</span>`);

      htmlContent = `
        <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${selectedTemplate.name}</h1>
          </div>
          <div style="text-align: justify; line-height: 1.8;">
            ${previewContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 200px;">
              <div style="border-top: 1px solid black; padding-top: 5px;">
                <small>Assinatura</small>
              </div>
            </div>
            <div style="text-align: center; width: 200px;">
              <div style="border-top: 1px solid black; padding-top: 5px;">
                <small>Data: ${currentDate}</small>
              </div>
            </div>
          </div>
        </div>
      `;

      let finalContent = selectedTemplate.template;
      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        finalContent = finalContent.replace(regex, value);
      });
      finalContent = finalContent.replace(/{{data_atual}}/g, currentDate);

      setGeneratedContent(finalContent);
      setGeneratedHtml(htmlContent);

      const documentData = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        title: `${selectedTemplate.name} - ${currentDate}`,
        content,
        htmlContent,
        data: formData,
        createdAt: Date.now(),
        createdBy: user.uid,
        empresaId: userData.empresaId || ''
      };

      await addDoc(collection(db, 'generated_documents'), documentData);
      await loadDocuments();

    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      alert('Erro ao gerar documento. Tente novamente.');
    }
    setIsGenerating(false);
  };

  const printDocument = () => {
    if (!generatedHtml) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Documento</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          ${generatedHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const downloadDocument = (content: string, title: string, format: 'txt' | 'html' = 'txt') => {
    const element = document.createElement('a');
    const file = new Blob([format === 'html' ? generatedHtml : content], {
      type: format === 'html' ? 'text/html' : 'text/plain'
    });
    element.href = URL.createObjectURL(file);
    element.download = `${title}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return;

    try {
      await deleteDoc(doc(db, 'generated_documents', documentId));
      await loadDocuments();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      alert('Erro ao excluir documento.');
    }
  };

  const tabs = [
    { id: 'generator', label: 'Gerar', icon: '📝' },
    { id: 'chat', label: 'Chat IA', icon: '🤖' },
    { id: 'ocr', label: 'OCR', icon: '📷' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'history', label: 'Histórico', icon: '📂' },
    { id: 'empresas', label: 'Empresas', icon: '🏢' }
  ];

  if (loading) {
    return (
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--color-border)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .document-preview {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 2rem;
          white-space: pre-wrap;
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          min-height: 400px;
          color: black;
        }

        .document-html-preview {
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          min-height: 400px;
          overflow: auto;
        }

        .template-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .template-card:hover {
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-medium);
        }

        .template-card.selected {
          border-color: var(--color-primary);
          background: var(--color-primary)10;
        }

        .tab-nav {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--color-border);
          overflow-x: auto;
        }

        .tab-button {
          padding: 1rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 600;
          color: var(--color-textSecondary);
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .tab-button.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        .chat-container {
          height: 500px;
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .message {
          max-width: 80%;
          padding: 1rem;
          border-radius: var(--radius);
          line-height: 1.5;
        }

        .message.user {
          align-self: flex-end;
          background: var(--color-primary);
          color: white;
        }

        .message.assistant {
          align-self: flex-start;
          background: var(--color-background);
          border: 1px solid var(--color-border);
        }

        .chat-input {
          padding: 1rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          gap: 1rem;
        }

        .ocr-drop-zone {
          border: 2px dashed var(--color-border);
          border-radius: var(--radius);
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ocr-drop-zone:hover {
          border-color: var(--color-primary);
          background: var(--color-primary)05;
        }

        .ocr-drop-zone.dragover {
          border-color: var(--color-primary);
          background: var(--color-primary)10;
        }
      `}</style>

      {/* Header */}
      <div className="responsive-flex" style={{
        marginBottom: 'var(--gap-xl)',
        padding: 'var(--gap-md)',
        background: 'var(--gradient-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)'
      }}>
        <div className="row" style={{ gap: 'var(--gap-md)' }}>
          <Link href="/sistemas" className="button button-ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Voltar aos Sistemas
          </Link>
          <div className="badge">
            📄 Gerador de Documentos v2.0 AI
          </div>
          {userData && (
            <div className="badge">
              👤 {userData.nome} ({userData.role})
            </div>
          )}
          {empresaData && (
            <div className="badge">
              🏢 {empresaData.nome}
            </div>
          )}
        </div>
        <ThemeSelector size="medium" />
      </div>

      {/* Hero */}
      <div className="card" style={{
        textAlign: 'center',
        marginBottom: 'var(--gap-xl)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '3rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖📄</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '1rem' }}>
          Gerador Inteligente de Documentos
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Crie documentos profissionais com IA • Extraia dados de imagens • Chat inteligente
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as 'generator' | 'chat' | 'ocr' | 'templates' | 'history' | 'empresas')}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Chat IA Tab */}
      {activeTab === 'chat' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3>🤖 Assistente IA para Documentos</h3>
            <button
              className="button button-outline"
              onClick={() => {
                setChatMessages([]);
                initializeChatWelcome();
              }}
            >
              🔄 Nova Conversa
            </button>
          </div>

          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.map(message => (
                <div key={message.id} className={`message ${message.role}`}>
                  <div style={{ whiteSpace: 'pre-line' }}>{message.content}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="message assistant">
                  <div>🤖 Gerando documento...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <input
                type="text"
                className="input"
                placeholder="Digite o tipo de documento que precisa..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                disabled={isAiTyping}
              />
              <button
                className="button button-primary"
                onClick={sendChatMessage}
                disabled={isAiTyping || !chatInput.trim()}
              >
                {isAiTyping ? '⏳' : '🚀'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
            <h4>💡 Exemplos de prompts:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
              {[
                'Contrato de prestação de serviços',
                'Declaração de renda',
                'Relatório mensal de vendas',
                'Procuração simples',
                'Atestado médico',
                'Contrato de locação'
              ].map(example => (
                <button
                  key={example}
                  className="button button-ghost"
                  onClick={() => setChatInput(example)}
                  style={{ fontSize: '0.9rem', padding: '0.5rem' }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OCR Tab */}
      {activeTab === 'ocr' && (
        <div className="card">
          <h3>📷 Extração de Dados de Imagens (OCR)</h3>

          <div
            className="ocr-drop-zone"
            onClick={() => document.getElementById('ocr-file-input')?.click()}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📸</div>
            <h4>Arraste imagens aqui ou clique para selecionar</h4>
            <p style={{ color: 'var(--color-textSecondary)', margin: '1rem 0' }}>
              Suporte para: JPG, PNG, PDF • Máximo 10MB por arquivo
            </p>
            <div className="button button-primary">
              📁 Selecionar Imagens
            </div>
          </div>

          <input
            id="ocr-file-input"
            type="file"
            multiple
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setOcrImages(files);
            }}
          />

          {ocrImages.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4>Imagens Selecionadas:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {ocrImages.map((file, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                    <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{file.name}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  className="button button-primary"
                  onClick={processOCR}
                  disabled={ocrLoading || ocrImages.length === 0}
                >
                  {ocrLoading ? '⏳ Processando...' : '🔍 Extrair Dados'}
                </button>
                <button
                  className="button button-outline"
                  onClick={() => setOcrImages([])}
                  disabled={ocrLoading}
                >
                  🗑️ Limpar
                </button>
              </div>
            </div>
          )}

          {Object.keys(extractedData).length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4>✅ Dados Extraídos:</h4>
              <div style={{
                background: 'var(--color-surface)',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="card">
          <h3>📋 Templates de Documentos</h3>

          {(() => {
            const categorias = {
              'Jurídico': templates.filter(t =>
                t.name.toLowerCase().includes('procuração') ||
                t.name.toLowerCase().includes('confidencialidade') ||
                t.name.toLowerCase().includes('nda')
              ),
              'Comercial': templates.filter(t =>
                t.name.toLowerCase().includes('contrato') && (
                  t.name.toLowerCase().includes('serviços') ||
                  t.name.toLowerCase().includes('compra') ||
                  t.name.toLowerCase().includes('venda') ||
                  t.name.toLowerCase().includes('locação') ||
                  t.name.toLowerCase().includes('parceria')
                )
              ),
              'Fiscal/Contábil': templates.filter(t =>
                t.name.toLowerCase().includes('declaração') ||
                t.name.toLowerCase().includes('renda') ||
                t.name.toLowerCase().includes('residência') ||
                t.name.toLowerCase().includes('dependência')
              ),
              'Financeiro': templates.filter(t =>
                t.name.toLowerCase().includes('recibo') ||
                t.name.toLowerCase().includes('pagamento')
              )
            };

            const categoriasComTemplates = Object.entries(categorias).filter(([_, temps]) => temps.length > 0);

            return (
              <div>
                {categoriasComTemplates.map(([categoria, categoryTemplates]) => (
                  <div key={categoria} style={{ marginBottom: '2rem' }}>
                    <h4 style={{
                      margin: '0 0 1rem 0',
                      padding: '1rem',
                      background: 'var(--color-primary)',
                      color: 'white',
                      borderRadius: 'var(--radius)',
                      fontSize: '1.1rem',
                      fontWeight: '700'
                    }}>
                      {categoria === 'Jurídico' && '⚖️'}
                      {categoria === 'Comercial' && '💼'}
                      {categoria === 'Fiscal/Contábil' && '📊'}
                      {categoria === 'Financeiro' && '💰'}
                      {categoria}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                      {categoryTemplates.map(template => (
                        <div
                          key={template.id}
                          className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setActiveTab('generator');
                          }}
                        >
                          <h4>{template.name}</h4>
                          <p style={{ color: 'var(--color-textSecondary)', margin: '0.5rem 0' }}>
                            {template.description}
                          </p>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '1rem'
                          }}>
                            <span className="badge">{template.type}</span>
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
                              {template.fields.length} campos
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-textSecondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <p>Nenhum template disponível</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="card">
          <h3>📝 Gerar Documento</h3>

          {!selectedTemplate ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <h4>Selecione um Template</h4>
              <p style={{ color: 'var(--color-textSecondary)', marginBottom: '2rem' }}>
                Escolha um template na aba "Templates" para começar
              </p>
              <button
                className="button button-primary"
                onClick={() => setActiveTab('templates')}
              >
                📋 Ver Templates
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
                <h4>{selectedTemplate.name}</h4>
                <p style={{ color: 'var(--color-textSecondary)', margin: '0.5rem 0' }}>
                  {selectedTemplate.description}
                </p>
                <button
                  className="button button-ghost"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setGeneratedHtml('');
                    setGeneratedContent('');
                    setFormData({});
                  }}
                >
                  🔄 Trocar Template
                </button>
              </div>

              {/* Inicializar preview do template */}
              {(() => {
                if (!generatedHtml && selectedTemplate) {
                  let previewContent = selectedTemplate.template;

                  selectedTemplate.fields.forEach(field => {
                    const regex = new RegExp(`{{${field.name}}}`, 'g');
                    previewContent = previewContent.replace(regex, `<span style="background: #fff2cc; padding: 2px 4px; border-radius: 3px; border: 1px dashed #fbbf24; color: #92400e; font-weight: bold;">___ ${field.label} ___</span>`);
                  });

                  const currentDate = new Date().toLocaleDateString('pt-BR');
                  previewContent = previewContent.replace(/{{data_atual}}/g, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${currentDate}</span>`);

                  const initialHtmlContent = `
                    <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${selectedTemplate.name}</h1>
                      </div>
                      <div style="text-align: justify; line-height: 1.8;">
                        ${previewContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
                      </div>
                    </div>
                  `;

                  setTimeout(() => setGeneratedHtml(initialHtmlContent), 0);
                }
                return null;
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4>📝 Preencher Campos</h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedTemplate.fields.map(field => (
                      <div key={field.name} style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            className="input"
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            placeholder={field.placeholder}
                            rows={4}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            className="input"
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                          >
                            <option value="">Selecione...</option>
                            {field.options?.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <input
                              type={field.type}
                              className="input"
                              value={formData[field.name] || ''}
                              onChange={(e) => {
                                let value = e.target.value;

                                const maskedValue = applyMask(value, field.name);

                                const newFormData = { ...formData, [field.name]: maskedValue };
                                setFormData(newFormData);

                                if (selectedTemplate) {
                                  let previewContent = selectedTemplate.template;

                                  selectedTemplate.fields.forEach(templateField => {
                                    const fieldValue = (newFormData as Record<string, any>)[templateField.name] || '';
                                    const regex = new RegExp(`{{${templateField.name}}}`, 'g');
                                    if (fieldValue) {
                                      previewContent = previewContent.replace(regex, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${fieldValue}</span>`);
                                    } else {
                                      previewContent = previewContent.replace(regex, `<span style="background: #fff2cc; padding: 2px 4px; border-radius: 3px; border: 1px dashed #fbbf24; color: #92400e; font-weight: bold;">___ ${templateField.label} ___</span>`);
                                    }
                                  });

                                  const previewCurrentDate = new Date().toLocaleDateString('pt-BR');
                                  previewContent = previewContent.replace(/{{data_atual}}/g, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${previewCurrentDate}</span>`);

                                  const updatedHtmlContent = `
                                    <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
                                      <div style="text-align: center; margin-bottom: 30px;">
                                        <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${selectedTemplate.name}</h1>
                                      </div>
                                      <div style="text-align: justify; line-height: 1.8;">
                                        ${previewContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
                                      </div>
                                    </div>
                                  `;

                                  setGeneratedHtml(updatedHtmlContent);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (!value) return;

                                let isValid = true;
                                let errorMessage = '';

                                if (field.name.toLowerCase().includes('cep') && value.replace(/\D/g, '').length >= 8) {
                                  const cepValidation = validateCEP(value);
                                  if (cepValidation.valid) {
                                    preencherPorCEP(value, field.name);
                                  } else {
                                    errorMessage = cepValidation.message || 'CEP inválido';
                                    isValid = false;
                                  }
                                }
                                else if ((field.name.toLowerCase().includes('cpf') && !field.name.toLowerCase().includes('cnpj')) && value.replace(/\D/g, '').length >= 11) {
                                  const cpfValidation = validateCPF(value);
                                  if (cpfValidation.valid) {
                                    preencherPorCPF(value, field.name);
                                  } else {
                                    errorMessage = cpfValidation.message || 'CPF inválido';
                                    isValid = false;
                                  }
                                }
                                else if (field.name.toLowerCase().includes('cnpj') && value.replace(/\D/g, '').length >= 14) {
                                  const cnpjValidation = validateCNPJ(value);
                                  if (cnpjValidation.valid) {
                                    preencherPorCNPJ(value, field.name);
                                  } else {
                                    errorMessage = cnpjValidation.message || 'CNPJ inválido';
                                    isValid = false;
                                  }
                                }
                                else if ((field.name.toLowerCase().includes('telefone') || field.name.toLowerCase().includes('fone')) && value.length > 0) {
                                  const telefoneValidation = validateTelefone(value);
                                  if (!telefoneValidation.valid) {
                                    errorMessage = telefoneValidation.message || 'Telefone inválido';
                                    isValid = false;
                                  }
                                }

                                if (!isValid && value.length > 0) {
                                  e.target.style.borderColor = '#ef4444';
                                  e.target.style.boxShadow = '0 0 0 1px #ef4444';
                                  e.target.title = errorMessage;

                                  const errorTooltip = document.createElement('div');
                                  errorTooltip.textContent = errorMessage;
                                  errorTooltip.style.cssText = `
                                    position: absolute; top: -2.5rem; left: 0; z-index: 1000;
                                    background: #ef4444; color: white; padding: 0.5rem;
                                    border-radius: 0.25rem; font-size: 0.75rem;
                                    white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  `;
                                  e.target.parentElement?.appendChild(errorTooltip);
                                  setTimeout(() => {
                                    if (errorTooltip.parentElement) {
                                      errorTooltip.parentElement.removeChild(errorTooltip);
                                    }
                                  }, 3000);
                                } else {
                                  e.target.style.borderColor = '';
                                  e.target.style.boxShadow = '';
                                  e.target.title = '';
                                }
                              }}
                              placeholder={field.placeholder}
                              style={{
                                paddingRight: (
                                  field.name.toLowerCase().includes('cep') ||
                                  field.name.toLowerCase().includes('cpf') ||
                                  field.name.toLowerCase().includes('cnpj') ||
                                  field.name.toLowerCase().includes('telefone') ||
                                  field.name.toLowerCase().includes('fone')
                                ) ? '2.5rem' : undefined
                              }}
                            />

                            {(field.name.toLowerCase().includes('cep') ||
                              field.name.toLowerCase().includes('cpf') ||
                              field.name.toLowerCase().includes('cnpj')) && (
                              <div style={{
                                position: 'absolute',
                                right: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '1rem',
                                color: 'var(--color-primary)',
                                cursor: 'help'
                              }}
                              title="Campo com preenchimento automático">
                                🔍
                              </div>
                            )}
                          </div>
                        )}

                        {(field.name.toLowerCase().includes('cep') ||
                          field.name.toLowerCase().includes('cpf') ||
                          field.name.toLowerCase().includes('cnpj') ||
                          field.name.toLowerCase().includes('telefone') ||
                          field.name.toLowerCase().includes('fone')) && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-textSecondary)',
                            marginTop: '0.25rem',
                            fontStyle: 'italic',
                            background: 'var(--color-surface)',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            border: '1px solid var(--color-border)'
                          }}>
                            {field.name.toLowerCase().includes('cep') &&
                              '🔍 CEP com preenchimento automático (Ex: 01234-567 ou 01234567)'}
                            {(field.name.toLowerCase().includes('cpf') && !field.name.toLowerCase().includes('cnpj')) &&
                              '🔍 CPF com preenchimento automático (Ex: 123.456.789-09)'}
                            {field.name.toLowerCase().includes('cnpj') &&
                              '🔍 CNPJ com preenchimento automático (Ex: 12.345.678/0001-90)'}
                            {(field.name.toLowerCase().includes('telefone') || field.name.toLowerCase().includes('fone')) &&
                              '📞 Telefone com formatação automática (Ex: (11) 99999-9999)'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    className="button button-primary"
                    onClick={generateDocument}
                    disabled={isGenerating}
                    style={{ marginTop: '2rem', width: '100%' }}
                  >
                    {isGenerating ? '⏳ Gerando...' : '🚀 Gerar Documento'}
                  </button>
                </div>

                {(generatedContent || selectedTemplate) && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4>📄 {generatedContent ? 'Documento Gerado' : 'Preview do Documento'}</h4>
                      {!generatedContent && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-textSecondary)' }}>
                          <span style={{ color: '#92400e' }}>⚠️ Campos em amarelo</span> precisam ser preenchidos
                        </div>
                      )}
                    </div>

                    <div className="document-html-preview">
                      <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                    </div>

                    {generatedContent && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="button button-primary" onClick={printDocument}>
                          🖨️ Imprimir
                        </button>
                        <button
                          className="button button-outline"
                          onClick={() => downloadDocument(generatedContent, selectedTemplate.name)}
                        >
                          📥 Download
                        </button>
                        <button
                          className="button button-outline"
                          onClick={() => downloadDocument(generatedContent, selectedTemplate.name, 'html')}
                        >
                          🌐 Download HTML
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'empresas' && (
        <div className="card">
          <EmpresaManager
            sistema="documentos"
            allowCreate={userData?.role === 'admin' || userData?.role === 'superadmin'}
            allowEdit={userData?.role === 'admin' || userData?.role === 'superadmin'}
            allowDelete={userData?.role === 'superadmin'}
            onEmpresaSelect={(empresa) => {
              console.log('Empresa selecionada para documentos:', empresa);
            }}
          />
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card">
          <h3>📂 Histórico de Documentos</h3>

          {documents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {documents.map((document) => (
                <div
                  key={document.id}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    background: 'var(--color-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{document.title}</h4>
                      <p style={{ margin: '0.5rem 0', color: 'var(--color-textSecondary)' }}>
                        Template: {document.templateName}
                        {document.aiGenerated && <span className="badge" style={{ marginLeft: '0.5rem' }}>🤖 IA</span>}
                      </p>
                      <small style={{ color: 'var(--color-textSecondary)' }}>
                        Criado em: {new Date(document.createdAt).toLocaleString('pt-BR')}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setGeneratedContent(document.content);
                          setGeneratedHtml(document.htmlContent || document.content);
                          setActiveTab('generator');
                        }}
                      >
                        👁️ Ver
                      </button>
                      <button
                        className="button button-outline"
                        onClick={() => downloadDocument(document.content, document.title)}
                      >
                        📥 Download
                      </button>
                      <button
                        className="button button-ghost"
                        onClick={() => deleteDocument(document.id)}
                        style={{ color: 'red' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-textSecondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <p>Nenhum documento encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}