'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeSelector from '@/src/components/ThemeSelector';
import EmpresaManager from '@/src/components/EmpresaManager';
import { useAuthData } from '@/src/hooks/useAuth';

// Import dinâmico do Firebase para evitar erros SSR
let auth: any, db: any;
let onAuthStateChanged: any, doc: any, getDoc: any, addDoc: any, collection: any, query: any, where: any, getDocs: any, orderBy: any, deleteDoc: any, updateDoc: any, serverTimestamp: any;

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
    serverTimestamp = firestoreModule.serverTimestamp;
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
  htmlContent?: string;
  aiGenerated?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function DocumentosPage() {
  const { user, profile, loading: authLoading } = useAuthData();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const [activeTab, setActiveTab] = useState<'generator' | 'chat' | 'ocr' | 'templates' | 'history' | 'empresas'>('generator');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
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

  // Verificação de acesso aprimorada
  const checkDocumentosAccess = (userProfile: any): boolean => {
    if (!userProfile) {
      console.log('❌ Perfil do usuário não disponível');
      return false;
    }

    console.log('🔍 Verificando acesso ao sistema documentos para:', userProfile.email);
    console.log('📊 Dados para verificação:', {
      sistemasAtivos: userProfile.sistemasAtivos,
      claimsSistemas: userProfile.claims?.sistemasAtivos,
      canAccessSystems: userProfile.claims?.permissions?.canAccessSystems,
      role: userProfile.role,
      empresaId: userProfile.empresaId
    });

    // Super admins sempre têm acesso
    if (['superadmin', 'adminmaster'].includes(userProfile.role)) {
      console.log('👑 Super admin detectado - acesso total');
      return true;
    }

    // Verificar claims do bootstrap admin
    if (userProfile.claims?.bootstrapAdmin) {
      console.log('🔧 Bootstrap admin detectado - acesso total');
      return true;
    }

    // Verificar sistemas ativos do usuário
    if (userProfile.sistemasAtivos?.includes('documentos')) {
      console.log('✅ Sistema documentos encontrado em sistemasAtivos');
      return true;
    }

    // Verificar claims do token
    if (userProfile.claims?.sistemasAtivos?.includes('documentos')) {
      console.log('✅ Sistema documentos encontrado em claims.sistemasAtivos');
      return true;
    }

    // Verificar permissões específicas
    if (userProfile.claims?.permissions?.canAccessSystems?.includes('documentos')) {
      console.log('✅ Sistema documentos encontrado em permissions.canAccessSystems');
      return true;
    }

    // Verificar se é admin/gestor com acesso geral e tem empresa
    if (['admin', 'gestor', 'empresa'].includes(userProfile.role) && userProfile.empresaId) {
      console.log(`👔 Role ${userProfile.role} com empresaId - assumindo acesso`);
      return true;
    }

    console.log('❌ Sem acesso ao sistema documentos');
    return false;
  };

  // Efeito principal para verificação de acesso
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        console.log('🔍 Iniciando verificação de acesso ao sistema documentos...');
        console.log('📊 Loading:', authLoading, 'User:', !!user, 'Profile:', !!profile);

        if (authLoading) {
          console.log('⏳ Ainda carregando dados de autenticação...');
          return;
        }

        if (!user || !profile) {
          console.log('❌ Usuário não autenticado ou perfil indisponível, redirecionando para auth');
          if (mounted) {
            window.location.href = '/documentos/auth';
          }
          return;
        }

        const hasDocumentosAccess = checkDocumentosAccess(profile);

        if (!hasDocumentosAccess) {
          console.log('❌ Usuário sem acesso ao sistema documentos, redirecionando para auth');
          if (mounted) {
            window.location.href = '/documentos/auth';
          }
          return;
        }

        console.log('✅ Acesso liberado ao sistema documentos');

        if (mounted) {
          setHasAccess(true);
          setUserRole(profile.role || null);

          // Inicializar dados do sistema
          try {
            await loadTemplates();
            // Chama loadDocuments apenas se houver um empresaId válido
            if (profile.empresaId) {
              await loadDocuments(profile.empresaId);
            } else {
              console.log("ℹ️ EmpresaId não encontrado no perfil, pulando loadDocuments.");
            }
            initializeChatWelcome();
          } catch (error) {
            console.error('Erro ao carregar dados do sistema:', error);
            // Não bloquear o acesso se houver erro ao carregar dados
          }
        }

      } catch (error) {
        console.error('Erro na verificação de acesso:', error);
        if (mounted) {
          setHasAccess(false);
          // Em caso de erro, redirecionar para auth
          window.location.href = '/documentos/auth';
        }
      } finally {
        if (mounted) {
          setIsCheckingAccess(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, [authLoading, user, profile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const initializeChatWelcome = () => {
    setChatMessages([{
      id: '1',
      role: 'assistant',
      content: `👋 Olá! Sou seu assistente inteligente para geração de documentos.

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
      }
    ];
  };

  const loadTemplates = async () => {
    try {
      if (!db || !collection || !query || !orderBy || !getDocs) {
        console.log('Firebase ainda não carregado, usando templates locais');
        setTemplates(getLocalTemplates());
        return;
      }

      const templatesQuery = query(
        collection(db, 'document_templates'),
        orderBy('name', 'asc')
      );
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

  const loadDocuments = async (companyId: string) => {
    if (!companyId) return;

    setLoadingDocs(true);
    try {
      console.log("📄 Carregando documentos para empresa:", companyId);

      // Tentar carregar de múltiplas coleções possíveis
      let docs: any[] = [];

      try {
        // Primeira tentativa: coleção estruturada
        const docsRef = collection(db, `documentos_empresas/${companyId}/documentos`);
        const querySnapshot = await getDocs(docsRef);
        docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        }));

        console.log("✅ Documentos carregados da estrutura empresas:", docs.length);
      } catch (error1) {
        console.log("Tentativa 1 falhou, tentando coleção direta...");

        try {
          // Segunda tentativa: coleção direta com filtro
          const docsRef = collection(db, 'documentos');
          const docsQuery = query(docsRef, where('empresaId', '==', companyId));
          const querySnapshot = await getDocs(docsQuery);
          docs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
          }));

          console.log("✅ Documentos carregados da coleção direta:", docs.length);
        } catch (error2) {
          console.error("Erro em ambas as tentativas:", error2);
          throw new Error("Não foi possível carregar os documentos");
        }
      }

      setDocuments(docs);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
      alert(`Erro ao carregar documentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingDocs(false);
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
    if (!user || !db || !addDoc || !collection) return;

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
        aiGenerated: true
      };

      await addDoc(collection(db, 'generated_documents'), documentToSave);
      await loadDocuments(profile?.empresaId || ''); // Use empresaId from profile
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
    if (!selectedTemplate || !user) return;

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
      setGeneratedContent(content);
      setGeneratedHtml(htmlContent);

      if (db && addDoc && collection && profile?.empresaId) {
        const documentData = {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          title: `${selectedTemplate.name} - ${currentDate}`,
          content,
          htmlContent,
          data: formData,
          createdAt: Date.now(),
          createdBy: user.uid
        };

        await saveDocument(documentData);
        await loadDocuments(profile.empresaId);
      }

    } catch (error) {
      console.error('Erro ao gerar documento:', error);
      alert('Erro ao gerar documento. Tente novamente.');
    }
    setIsGenerating(false);
  };

  const saveDocument = async (documentData: any) => {
    if (!profile?.empresaId || !user) return;

    const empresaId = profile.empresaId;

    try {
      const docData = {
        ...documentData,
        empresaId,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'ativo'
      };

      let docRef;

      try {
        // Primeira tentativa: estrutura de empresa
        docRef = await addDoc(
          collection(db, `documentos_empresas/${empresaId}/documentos`),
          docData
        );
        console.log("✅ Documento salvo na estrutura empresa:", docRef.id);
      } catch (error1) {
        console.log("Tentando salvar na coleção direta...");

        // Segunda tentativa: coleção direta
        docRef = await addDoc(
          collection(db, 'documentos'),
          docData
        );
        console.log("✅ Documento salvo na coleção direta:", docRef.id);
      }

      await loadDocuments(empresaId);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      throw error;
    }
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
    if (!profile?.empresaId) return;

    try {
      if (db && deleteDoc && doc) {
        // Tentar deletar da estrutura empresa primeiro
        try {
          await deleteDoc(doc(db, `documentos_empresas/${profile.empresaId}/documentos`, documentId));
        } catch (error1) {
          // Se falhar, tentar da coleção direta
          await deleteDoc(doc(db, 'documentos', documentId));
        }
        await loadDocuments(profile.empresaId);
      }
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

  // Loading state
  if (authLoading || isCheckingAccess) {
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
          <p>Verificando acesso ao sistema...</p>
        </div>
      </div>
    );
  }

  // Access denied or user not logged in
  if (hasAccess === false || !user || !profile) {
    return (
      <div className="container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h1 style={{ marginBottom: '1rem' }}>Acesso Negado</h1>
          <p style={{ marginBottom: '2rem', maxWidth: '500px' }}>
            Você não tem permissão para acessar o sistema de documentos ou precisa estar logado.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/documentos/auth" className="button button-primary">
              Fazer Login
            </Link>
            <Link href="/sistemas" className="button button-outline">
              Voltar aos Sistemas
            </Link>
          </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {templates.map(template => (
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

          {templates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-textSecondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p>Nenhum template disponível</p>
            </div>
          )}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4>📝 Preencher Campos</h4>

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
                        <input
                          type={field.type}
                          className="input"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}

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
            allowCreate={userRole === 'admin' || userRole === 'superadmin'}
            allowEdit={userRole === 'admin' || userRole === 'superadmin'}
            allowDelete={userRole === 'superadmin'}
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

          {loadingDocs ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--color-border)',
                borderTop: '4px solid var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <p>Carregando documentos...</p>
            </div>
          ) : documents.length > 0 ? (
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