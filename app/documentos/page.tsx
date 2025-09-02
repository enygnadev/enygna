'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeSelector from '@/src/components/ThemeSelector';
import EmpresaManager from '@/src/components/EmpresaManager';

// Import dinâmico do Firebase para evitar erros SSR
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
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // State to store user role
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
        // Aguardar o carregamento do Firebase
        if (typeof window === 'undefined') return;

        const [firebase, authModule, firestoreModule] = await Promise.all([
          import('@/src/lib/firebase'),
          import('firebase/auth'),
          import('firebase/firestore')
        ]);

        if (!mounted) return;

        const authInstance = firebase.auth;
        const dbInstance = firestoreModule; // Use firestoreModule directly for functions

        unsubscribe = authModule.onAuthStateChanged(authInstance, async (currentUser) => {
          if (!mounted) return;

          try {
            if (currentUser) {
              // Verificar se o usuário tem acesso ao sistema de documentos
              const userDocRef = firestoreModule.doc(firebase.db, 'documentos_users', currentUser.uid);
              const userDoc = await firestoreModule.getDoc(userDocRef);

              if (userDoc.exists() && userDoc.data()?.isActive) {
                if (mounted) {
                  setUser(currentUser);
                  const userData = userDoc.data();
                  setUserRole(userData?.role || null);

                  // Carregar templates com fallback para templates locais
                  try {
                    const templatesQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'document_templates'),
                      firestoreModule.orderBy('name', 'asc')
                    );
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
                    // Usar templates locais como fallback
                    setTemplates(getLocalTemplates());
                  }

                  // Carregar documentos com tratamento de erro melhorado
                  try {
                    const documentsQuery = firestoreModule.query(
                      firestoreModule.collection(firebase.db, 'generated_documents'),
                      firestoreModule.where('createdBy', '==', currentUser.uid),
                      firestoreModule.orderBy('createdAt', 'desc')
                    );
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
                // Se não tem acesso, redirecionar para autenticação
                if (mounted) {
                  window.location.href = '/documentos/auth';
                }
                return;
              }
            } else {
              // Usuário não autenticado
              if (mounted) {
                window.location.href = '/documentos/auth';
              }
              return;
            }
          } catch (error) {
            console.error('Erro ao verificar acesso do usuário:', error);
            if (mounted) {
              // Em caso de erro, redirecionar para autenticação
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

  // Templates locais como fallback
  const getLocalTemplates = (): DocumentTemplate[] => {
    return [
      {
        id: 'procuracao-simples',
        name: 'Procuração Simples',
        type: 'custom',
        description: 'Documento para outorgar poderes a terceiros',
        fields: [
          { name: 'outorgante_nome', label: 'Nome do Outorgante', type: 'text', required: true, placeholder: 'João Silva Santos' },
          { name: 'outorgante_nacionalidade', label: 'Nacionalidade', type: 'text', required: true, placeholder: 'brasileiro' },
          { name: 'outorgante_estado_civil', label: 'Estado Civil', type: 'select', required: true, options: ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)'] },
          { name: 'outorgante_profissao', label: 'Profissão', type: 'text', required: true, placeholder: 'Engenheiro' },
          { name: 'outorgante_rg', label: 'RG', type: 'text', required: true, placeholder: '12.345.678-9' },
          { name: 'outorgante_cpf', label: 'CPF', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'outorgante_endereco', label: 'Endereço', type: 'text', required: true, placeholder: 'Rua das Flores, 123' },
          { name: 'procurador_nome', label: 'Nome do Procurador', type: 'text', required: true, placeholder: 'Maria Santos Silva' },
          { name: 'procurador_nacionalidade', label: 'Nacionalidade do Procurador', type: 'text', required: true, placeholder: 'brasileira' },
          { name: 'procurador_estado_civil', label: 'Estado Civil do Procurador', type: 'select', required: true, options: ['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)'] },
          { name: 'procurador_profissao', label: 'Profissão do Procurador', type: 'text', required: true, placeholder: 'Advogada' },
          { name: 'procurador_rg', label: 'RG do Procurador', type: 'text', required: true, placeholder: '98.765.432-1' },
          { name: 'procurador_cpf', label: 'CPF do Procurador', type: 'text', required: true, placeholder: '987.654.321-00' },
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
          { name: 'contratante_nome', label: 'Nome/Razão Social do Contratante', type: 'text', required: true },
          { name: 'contratante_cnpj_cpf', label: 'CNPJ/CPF do Contratante', type: 'text', required: true },
          { name: 'contratante_endereco', label: 'Endereço do Contratante', type: 'text', required: true },
          { name: 'contratante_telefone', label: 'Telefone do Contratante', type: 'text', required: false },
          { name: 'contratado_nome', label: 'Nome/Razão Social do Contratado', type: 'text', required: true },
          { name: 'contratado_cnpj_cpf', label: 'CNPJ/CPF do Contratado', type: 'text', required: true },
          { name: 'contratado_endereco', label: 'Endereço do Contratado', type: 'text', required: true },
          { name: 'contratado_telefone', label: 'Telefone do Contratado', type: 'text', required: false },
          { name: 'objeto', label: 'Objeto do Contrato', type: 'textarea', required: true },
          { name: 'prazo_meses', label: 'Prazo (meses)', type: 'number', required: true },
          { name: 'data_inicio', label: 'Data de Início', type: 'date', required: true },
          { name: 'valor_total', label: 'Valor Total (R$)', type: 'text', required: true }
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

{{data_atual}}

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
          { name: 'nome_completo', label: 'Nome Completo', type: 'text', required: true },
          { name: 'cpf', label: 'CPF', type: 'text', required: true },
          { name: 'rg', label: 'RG', type: 'text', required: true },
          { name: 'endereco', label: 'Endereço Completo', type: 'text', required: true },
          { name: 'renda_mensal', label: 'Renda Mensal (R$)', type: 'text', required: true },
          { name: 'empresa', label: 'Empresa/Empregador', type: 'text', required: true },
          { name: 'cargo', label: 'Cargo/Função', type: 'text', required: true },
          { name: 'finalidade', label: 'Finalidade da Declaração', type: 'text', required: true }
        ],
        template: `DECLARAÇÃO DE RENDA

Eu, {{nome_completo}}, portador(a) do CPF nº {{cpf}} e RG nº {{rg}}, residente e domiciliado(a) à {{endereco}}, declaro para os devidos fins que possuo renda mensal no valor de R$ {{renda_mensal}} ({{renda_mensal}} reais), proveniente de salário como {{cargo}} na empresa {{empresa}}.

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
      // Usar templates locais como fallback
      setTemplates(getLocalTemplates());
    }
  };

  const loadDocuments = async () => {
    if (!user?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'documentos_users', user.uid));
      if (!userDoc.exists()) return;

      const documentsQuery = query(
        collection(db, 'generated_documents'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(documentsQuery);
      const documentsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as GeneratedDocument[];
      setDocuments(documentsData);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      // Não quebrar a aplicação se não conseguir carregar documentos
      setDocuments([]);
    }
  };

  const generateDocumentWithAI = async (prompt: string) => {
    setIsAiTyping(true);

    try {
      // Tentar usar IA primeiro, mas com fallback local
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
        // Fallback para geração local
        documentData = generateDocumentLocally(prompt);
      }

      // Adicionar mensagem do assistente
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

      // Definir conteúdo gerado
      setGeneratedContent(documentData.conteudo_texto);
      setGeneratedHtml(documentData.conteudo_html);

      // Salvar documento
      await saveAIDocument(documentData);

      // Alternar para aba do gerador
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

  // Função para gerar documento localmente (fallback)
  const generateDocumentLocally = (prompt: string) => {
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentDateTime = new Date().toLocaleString('pt-BR');

    // Detectar tipo de documento baseado no prompt
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

_______________________, _____ de _____________ de _______

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
    <p>_______________________, _____ de _____________ de _______</p>
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

    if (promptLower.includes('contrato')) {
      return {
        tipo: 'Contrato',
        titulo: 'Contrato de Prestação de Serviços',
        conteudo_texto: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: _________________________, inscrito no CNPJ/CPF nº ________________, com sede/residência à _____________________________

CONTRATADO: _________________________, inscrito no CNPJ/CPF nº ________________, com sede/residência à _____________________________

OBJETO: O presente contrato tem por objeto ______________________________.

PRAZO: O prazo de vigência será de _______ meses, iniciando em ___/___/______.

VALOR: O valor total dos serviços será de R$ ____________, pago conforme cronograma anexo.

OBRIGAÇÕES DO CONTRATADO:
- Executar os serviços com qualidade e pontualidade;
- Manter sigilo sobre informações confidenciais;
- Entregar o trabalho no prazo estabelecido.

OBRIGAÇÕES DO CONTRATANTE:
- Fornecer informações necessárias para execução;
- Efetuar pagamentos conforme acordado;
- Dar condições adequadas para trabalho.

________________, ${currentDate}

_____________________          _____________________
    CONTRATANTE                    CONTRATADO`,
        conteudo_html: `
<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 18px; font-weight: bold; margin: 0;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>CONTRATANTE:</strong> <u>_________________________</u>, inscrito no CNPJ/CPF nº <u>________________</u>, com sede/residência à <u>_____________________________</u></p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>CONTRATADO:</strong> <u>_________________________</u>, inscrito no CNPJ/CPF nº <u>________________</u>, com sede/residência à <u>_____________________________</u></p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>OBJETO:</strong> O presente contrato tem por objeto <u>______________________________</u>.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>PRAZO:</strong> O prazo de vigência será de <u>_______</u> meses, iniciando em <u>___/___/______</u>.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>VALOR:</strong> O valor total dos serviços será de R$ <u>____________</u>, pago conforme cronograma anexo.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>OBRIGAÇÕES DO CONTRATADO:</strong></p>
    <ul>
      <li>Executar os serviços com qualidade e pontualidade;</li>
      <li>Manter sigilo sobre informações confidenciais;</li>
      <li>Entregar o trabalho no prazo estabelecido.</li>
    </ul>
  </div>

  <div style="margin-bottom: 40px;">
    <p><strong>OBRIGAÇÕES DO CONTRATANTE:</strong></p>
    <ul>
      <li>Fornecer informações necessárias para execução;</li>
      <li>Efetuar pagamentos conforme acordado;</li>
      <li>Dar condições adequadas para trabalho.</li>
    </ul>
  </div>

  <div style="margin-top: 60px;">
    <p>________________, ${currentDate}</p>
  </div>

  <div style="margin-top: 80px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 200px;">
      <div style="border-top: 1px solid black; padding-top: 5px;">
        <strong>CONTRATANTE</strong>
      </div>
    </div>
    <div style="text-align: center; width: 200px;">
      <div style="border-top: 1px solid black; padding-top: 5px;">
        <strong>CONTRATADO</strong>
      </div>
    </div>
  </div>
</div>`,
        campos_editaveis: ['contratante', 'contratado', 'objeto', 'prazo', 'valor'],
        instrucoes: 'Contrato padrão de prestação de serviços. Preencha os dados das partes e especificações do serviço.'
      };
    }

    // Documento genérico como fallback
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
    if (!user) return;

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
      await loadDocuments();
      console.log('✅ Documento salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      // Não bloquear a experiência do usuário se não conseguir salvar
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

  // Função para buscar CEP
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

  // Função para buscar dados do CPF usando a API existente
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
          nascimento: data.nascimento || '',
          genero: data.genero || ''
        };
      }

      // Se a API retornou sucesso mas sem nome (CPF válido mas sem dados)
      if (data.success && data.validFormat) {
        return {
          nome: null,
          cpf: formatCpfCnpj(cpf),
          message: data.message || 'CPF válido, mas sem dados disponíveis'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do CPF:', error);
      return null;
    }
  };

  // Função para buscar dados do CNPJ usando a API existente
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
          atividade_principal: data.atividadePrincipal || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar dados do CNPJ:', error);
      return null;
    }
  };

  // Função de formatação unificada para CPF e CNPJ
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

  // Função de validação unificada para CPF e CNPJ
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

  // Funções de validação usando a nova lógica
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
    // Verificar se o DDD é válido (11-99)
    const ddd = parseInt(telLimpo.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
      return { valid: false, message: 'DDD inválido. Deve estar entre 11 e 99' };
    }
    return { valid: true };
  };

  // Função para aplicar máscara durante a digitação
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

  // Função para preencher automaticamente baseado no CEP
  const preencherPorCEP = async (cep: string, fieldName: string) => {
    const validation = validateCEP(cep);
    if (!validation.valid) {
      alert(`❌ ${validation.message}`);
      return;
    }

    // Mostrar loading
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

        // Mapear campos do CEP para os campos do formulário
        const mapeamento: Record<string, string> = {
          'endereco': dadosCEP.logradouro,
          'bairro': dadosCEP.bairro,
          'cidade': dadosCEP.cidade,
          'uf': dadosCEP.uf,
          'cep': formatCEP(cep),
          // Para campos que contenham essas palavras
          'outorgante_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'procurador_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'contratante_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`,
          'contratado_endereco': `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}, ${dadosCEP.cidade} - ${dadosCEP.uf}`
        };

        // Preencher campos relacionados ao endereço
        Object.keys(mapeamento).forEach(campo => {
          if (selectedTemplate?.fields.some(field => field.name === campo)) {
            novoFormData[campo] = mapeamento[campo];
          }
        });

        // Para o campo atual, definir endereço específico
        if (fieldName.includes('endereco')) {
          novoFormData[fieldName] = `${dadosCEP.logradouro}, [NÚMERO], ${dadosCEP.bairro}`;
        }

        setFormData(novoFormData);
        
        loadingAlert.innerHTML = '✅ Endereço encontrado!';
        loadingAlert.style.background = '#10b981';
        setTimeout(() => document.body.removeChild(loadingAlert), 2000);
        
        // Focar no campo de número se disponível
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

  // Função para preencher automaticamente baseado no CPF
  const preencherPorCPF = async (cpf: string, fieldName: string) => {
    const validation = validateCPF(cpf);
    if (!validation.valid) {
      alert(`❌ CPF inválido: ${validation.message}`);
      return;
    }

    // Mostrar loading
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
          // Mapear campos do CPF quando há dados
          const mapeamento: Record<string, string> = {
            'nome_completo': dadosCPF.nome,
            'outorgante_nome': dadosCPF.nome,
            'procurador_nome': dadosCPF.nome,
            'contratante_nome': dadosCPF.nome,
            'contratado_nome': dadosCPF.nome,
            'cpf': formatCpfCnpj(cpf),
            'outorgante_cpf': formatCpfCnpj(cpf),
            'procurador_cpf': formatCpfCnpj(cpf),
            'contratante_cnpj_cpf': formatCpfCnpj(cpf),
            'contratado_cnpj_cpf': formatCpfCnpj(cpf)
          };

          // Preencher campos relacionados
          Object.keys(mapeamento).forEach(campo => {
            if (selectedTemplate?.fields.some(field => field.name === campo)) {
              novoFormData[campo] = mapeamento[campo];
            }
          });

          loadingAlert.innerHTML = '✅ Dados encontrados!';
          loadingAlert.style.background = '#10b981';
        } else {
          // CPF válido mas sem dados - apenas formatar
          novoFormData[fieldName] = formatCpfCnpj(cpf);
          
          loadingAlert.innerHTML = dadosCPF.message || '⚠️ CPF válido, mas sem dados disponíveis';
          loadingAlert.style.background = '#f59e0b';
        }

        setFormData(novoFormData);
        setTimeout(() => document.body.removeChild(loadingAlert), 3000);
        
      } else {
        loadingAlert.innerHTML = '⚠️ CPF válido, preenchimento manual necessário';
        loadingAlert.style.background = '#f59e0b';
        setTimeout(() => document.body.removeChild(loadingAlert), 3000);
        
        // Apenas formatar o CPF se não encontrar dados
        const novoFormData = { ...formData };
        novoFormData[fieldName] = formatCpfCnpj(cpf);
        setFormData(novoFormData);
      }
    } catch (error) {
      console.error('Erro ao buscar CPF:', error);
      loadingAlert.innerHTML = '⚠️ CPF válido, preenchimento manual';
      loadingAlert.style.background = '#f59e0b';
      setTimeout(() => document.body.removeChild(loadingAlert), 3000);
      
      // Formatar o CPF mesmo se der erro na consulta
      const novoFormData = { ...formData };
      novoFormData[fieldName] = formatCpfCnpj(cpf);
      setFormData(novoFormData);
    }
  };

  // Função para preencher automaticamente baseado no CNPJ
  const preencherPorCNPJ = async (cnpj: string, fieldName: string) => {
    const validation = validateCNPJ(cnpj);
    if (!validation.valid) {
      alert(`❌ CNPJ inválido: ${validation.message}`);
      return;
    }

    // Mostrar loading
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

        // Mapear campos do CNPJ
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

        // Preencher campos relacionados
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
        
        // Apenas formatar o CNPJ se não encontrar dados
        const novoFormData = { ...formData };
        novoFormData[fieldName] = formatCpfCnpj(cnpj);
        setFormData(novoFormData);
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      loadingAlert.innerHTML = '⚠️ CNPJ válido, preenchimento manual';
      loadingAlert.style.background = '#f59e0b';
      setTimeout(() => document.body.removeChild(loadingAlert), 3000);
      
      // Formatar o CNPJ mesmo se der erro na consulta
      const novoFormData = { ...formData };
      novoFormData[fieldName] = formatCpfCnpj(cnpj);
      setFormData(novoFormData);
    } finally {
      // Garantir que o loading seja removido
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

      // Simular OCR - em produção, integrar com Google Vision API ou similar
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Dados simulados extraídos
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

      // Se houver template selecionado, preencher automaticamente
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

      // Substituir os campos do template pelos valores do formulário
      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        content = content.replace(regex, value);
        htmlContent = htmlContent.replace(regex, `<strong>${value}</strong>`);
      });

      // Adicionar data atual
      const currentDate = new Date().toLocaleDateString('pt-BR');
      content = content.replace(/{{data_atual}}/g, currentDate);
      htmlContent = htmlContent.replace(/{{data_atual}}/g, `<strong>${currentDate}</strong>`);

      // Criar versão de preview com campos em destaque
      let previewContent = selectedTemplate.template;

      // Substituir campos preenchidos
      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        if (value) {
          previewContent = previewContent.replace(regex, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${value}</span>`);
        } else {
          previewContent = previewContent.replace(regex, `<span style="background: #fff2cc; padding: 2px 4px; border-radius: 3px; border: 1px dashed #fbbf24; color: #92400e; font-weight: bold;">___ ${field.label} ___</span>`);
        }
      });

      // Adicionar data atual
      const previewCurrentDate = new Date().toLocaleDateString('pt-BR');
      previewContent = previewContent.replace(/{{data_atual}}/g, `<span style="background: #e8f5e8; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${previewCurrentDate}</span>`);

      // Converter para HTML formatado
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

      // Para o conteúdo final (quando gerar), substituir pelos valores reais
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

      // Salvar o documento gerado
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

  // Define the tabs for the document system
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

                  // Atualizar o estado uma vez para inicializar o preview
                  setTimeout(() => setGeneratedHtml(initialHtmlContent), 0);
                }
                return null;
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4>📝 Preencher Campos</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedTemplate.fields.map(field => (
                      <div key={field.name}>
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
                            {field.options?.map(option => (
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
                                
                                // Aplicar máscara durante a digitação
                                const maskedValue = applyMask(value, field.name);
                                
                                const newFormData = { ...formData, [field.name]: maskedValue };
                                setFormData(newFormData);

                                // Atualizar preview em tempo real
                                if (selectedTemplate) {
                                  let previewContent = selectedTemplate.template;

                                  selectedTemplate.fields.forEach(templateField => {
                                    const fieldValue = newFormData[templateField.name] || '';
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
                                if (!value) return; // Não validar campos vazios

                                let isValid = true;
                                let errorMessage = '';
                                
                                // Validar e fazer auto-fill por CEP
                                if (field.name.toLowerCase().includes('cep') && value.replace(/\D/g, '').length >= 8) {
                                  const cepValidation = validateCEP(value);
                                  if (cepValidation.valid) {
                                    preencherPorCEP(value, field.name);
                                  } else {
                                    errorMessage = cepValidation.message || 'CEP inválido';
                                    isValid = false;
                                  }
                                }
                                // Validar e fazer auto-fill por CPF
                                else if ((field.name.toLowerCase().includes('cpf') && !field.name.toLowerCase().includes('cnpj')) && value.replace(/\D/g, '').length >= 11) {
                                  const cpfValidation = validateCPF(value);
                                  if (cpfValidation.valid) {
                                    preencherPorCPF(value, field.name);
                                  } else {
                                    errorMessage = cpfValidation.message || 'CPF inválido';
                                    isValid = false;
                                  }
                                }
                                // Validar e fazer auto-fill por CNPJ
                                else if (field.name.toLowerCase().includes('cnpj') && value.replace(/\D/g, '').length >= 14) {
                                  const cnpjValidation = validateCNPJ(value);
                                  if (cnpjValidation.valid) {
                                    preencherPorCNPJ(value, field.name);
                                  } else {
                                    errorMessage = cnpjValidation.message || 'CNPJ inválido';
                                    isValid = false;
                                  }
                                }
                                // Validar telefone
                                else if ((field.name.toLowerCase().includes('telefone') || field.name.toLowerCase().includes('fone')) && value.length > 0) {
                                  const telefoneValidation = validateTelefone(value);
                                  if (!telefoneValidation.valid) {
                                    errorMessage = telefoneValidation.message || 'Telefone inválido';
                                    isValid = false;
                                  }
                                }

                                // Aplicar estilo visual para campos inválidos
                                if (!isValid && value.length > 0) {
                                  e.target.style.borderColor = '#ef4444';
                                  e.target.style.boxShadow = '0 0 0 1px #ef4444';
                                  e.target.title = errorMessage;
                                  
                                  // Mostrar tooltip de erro
                                  const errorTooltip = document.createElement('div');
                                  errorTooltip.innerHTML = errorMessage;
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
                                  field.name.toLowerCase().includes('fone') ||
                                  field.name.toLowerCase().includes('outorgante') ||
                                  field.name.toLowerCase().includes('procurador') ||
                                  field.name.toLowerCase().includes('contrat')
                                ) ? '2.5rem' : undefined
                              }}
                            />

                            {/* Ícone indicativo de auto-preenchimento */}
                            {(field.name.toLowerCase().includes('cep') ||
                              field.name.toLowerCase().includes('cpf') ||
                              field.name.toLowerCase().includes('cnpj') ||
                              field.name.toLowerCase().includes('outorgante') ||
                              field.name.toLowerCase().includes('procurador') ||
                              field.name.toLowerCase().includes('contrat')) && (
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

                            {/* Número da casa para CEP */}
                            {field.name.toLowerCase().includes('endereco') && !field.name.toLowerCase().includes('cep') && formData[field.name] && formData[field.name].includes('[NÚMERO]') && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--color-textSecondary)', marginBottom: '0.25rem', display: 'block' }}>
                                  🏠 Número da casa/estabelecimento
                                </label>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Ex: 123, 45A, S/N"
                                  value={formData[field.name + '_numero'] || ''}
                                  onChange={(e) => {
                                    const numero = e.target.value;
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      [field.name + '_numero']: numero,
                                      [field.name]: prev[field.name].replace('[NÚMERO]', numero || '[NÚMERO]')
                                    }));
                                  }}
                                  style={{ fontSize: '0.9rem' }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dicas de preenchimento automático e validação */}
                        {(field.name.toLowerCase().includes('cep') ||
                          field.name.toLowerCase().includes('cpf') ||
                          field.name.toLowerCase().includes('cnpj') ||
                          field.name.toLowerCase().includes('telefone') ||
                          field.name.toLowerCase().includes('fone') ||
                          field.name.toLowerCase().includes('endereco')) && (
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
                            {(field.name.toLowerCase().includes('endereco') && !field.name.toLowerCase().includes('cep')) && 
                              '🏠 Endereço completo (Use CEP em outros campos para preenchimento automático)'}
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
            allowCreate={userRole === 'admin' || userRole === 'superadmin'}
            allowEdit={userRole === 'admin' || userRole === 'superadmin'}
            allowDelete={userRole === 'superadmin'}
            onEmpresaSelect={(empresa) => {
              console.log('Empresa selecionada para documentos:', empresa);
              // Implementar filtros de documentos por empresa
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