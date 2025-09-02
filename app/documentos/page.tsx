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

                  // Carregar templates e documentos
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
                    setTemplates(templatesData as DocumentTemplate[]);

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
                    console.error('Erro ao carregar dados:', error);
                    setTemplates([]);
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
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      // Não quebrar a aplicação se não conseguir carregar templates
      setTemplates([]);
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
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em geração de documentos profissionais. Sua tarefa é criar documentos completos, formatados e prontos para impressão baseados nas solicitações do usuário.

INSTRUÇÕES:
1. Analise o tipo de documento solicitado
2. Gere um documento completo e profissional
3. Use formatação adequada com cabeçalhos, parágrafos e espaçamentos
4. Inclua campos preenchíveis quando necessário
5. Adicione data atual automaticamente
6. Retorne tanto versão texto quanto HTML formatada

FORMATO DE RESPOSTA:
{
  "tipo": "tipo do documento",
  "titulo": "título do documento",
  "conteudo_texto": "versão em texto simples",
  "conteudo_html": "versão formatada em HTML",
  "campos_editaveis": ["lista de campos que podem ser editados"],
  "instrucoes": "instruções de uso do documento"
}`
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

        // Tentar parsear JSON se possível
        let documentData;
        try {
          documentData = JSON.parse(aiResponse);
        } catch {
          // Se não for JSON, usar como texto simples
          documentData = {
            tipo: 'Documento Personalizado',
            titulo: 'Documento Gerado por IA',
            conteudo_texto: aiResponse,
            conteudo_html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">${aiResponse.replace(/\n/g, '<br>')}</div>`,
            campos_editaveis: [],
            instrucoes: 'Documento gerado automaticamente pela IA'
          };
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

      } else {
        throw new Error('Resposta inválida da IA');
      }

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
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
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

      // Converter para HTML formatado
      htmlContent = `
        <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${selectedTemplate.name}</h1>
          </div>
          <div style="white-space: pre-line; text-align: justify;">
            ${htmlContent.replace(/\n/g, '<br><br>')}
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
                  onClick={() => setSelectedTemplate(null)}
                >
                  🔄 Trocar Template
                </button>
              </div>

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

                {generatedContent && (
                  <div>
                    <h4>📄 Documento Gerado</h4>
                    <div className="document-html-preview">
                      <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button className="button button-primary" onClick={printDocument}>
                        🖨️ Imprimir
                      </button>
                      <button 
                        className="button button-outline" 
                        onClick={() => downloadDocument(generatedContent, selectedTemplate.name)}
                      >
                        📄 Download TXT
                      </button>
                      <button 
                        className="button button-outline" 
                        onClick={() => downloadDocument(generatedContent, selectedTemplate.name, 'html')}
                      >
                        🌐 Download HTML
                      </button>
                    </div>
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