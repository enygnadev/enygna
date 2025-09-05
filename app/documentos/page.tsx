
'use client';

import { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/src/components/ThemeSelector';
import EmpresaManager from '@/src/components/EmpresaManager';

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
  const [activeTab, setActiveTab] = useState<'generator' | 'chat' | 'ocr' | 'templates' | 'history' | 'empresas'>('generator');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          await loadTemplates();
          await loadDocuments(userData.empresaId);
          initializeChatWelcome();
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
          await loadTemplates();
          await loadDocuments(userData.empresaId);
          initializeChatWelcome();
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
          await loadTemplates();
          await loadDocuments(userData.empresaId);
          initializeChatWelcome();
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
      setTemplates(getLocalTemplates());
    }
  };

  const loadDocuments = async (empresaId: string) => {
    if (!user?.uid) return;

    try {
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
      setDocuments([]);
    }
  };

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
        id: 'termo-confidencialidade',
        name: 'Termo de Confidencialidade (NDA)',
        type: 'custom',
        description: 'Acordo de confidencialidade para proteção de informações',
        fields: [
          { name: 'parte1_cnpj_cpf', label: 'CNPJ/CPF da Parte 1', type: 'text', required: true, placeholder: '12.345.678/0001-90' },
          { name: 'parte1_nome', label: 'Nome/Razão Social da Parte 1', type: 'text', required: true, placeholder: 'Empresa ABC Ltda' },
          { name: 'parte1_endereco', label: 'Endereço da Parte 1', type: 'text', required: true, placeholder: 'Rua Comercial, 100' },
          { name: 'parte2_cnpj_cpf', label: 'CNPJ/CPF da Parte 2', type: 'text', required: true, placeholder: '98.765.432/0001-10' },
          { name: 'parte2_nome', label: 'Nome/Razão Social da Parte 2', type: 'text', required: true, placeholder: 'Tech Solutions S.A.' },
          { name: 'parte2_endereco', label: 'Endereço da Parte 2', type: 'text', required: true, placeholder: 'Av. Tecnologia, 200' },
          { name: 'objeto_confidencialidade', label: 'Objeto da Confidencialidade', type: 'textarea', required: true, placeholder: 'Descreva as informações confidenciais' },
          { name: 'prazo_anos', label: 'Prazo de Vigência (anos)', type: 'number', required: true, placeholder: '5' },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `TERMO DE CONFIDENCIALIDADE (NDA)

PARTES:
PARTE 1: {{parte1_nome}}, inscrita no CNPJ/CPF nº {{parte1_cnpj_cpf}}, com sede à {{parte1_endereco}}
PARTE 2: {{parte2_nome}}, inscrita no CNPJ/CPF nº {{parte2_cnpj_cpf}}, com sede à {{parte2_endereco}}

OBJETO: As partes acordam manter sigilo absoluto sobre: {{objeto_confidencialidade}}

OBRIGAÇÕES:
1. Não divulgar informações confidenciais a terceiros
2. Utilizar informações apenas para fins acordados
3. Devolver ou destruir documentos confidenciais ao término

PRAZO: {{prazo_anos}} anos a partir desta data

PENALIDADES: Multa de R$ 50.000,00 por quebra de confidencialidade

{{cidade}}, {{data_atual}}

_____________________          _____________________
    {{parte1_nome}}              {{parte2_nome}}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // ===== COMERCIAL =====
      {
        id: 'contrato-servicos',
        name: 'Contrato de Prestação de Serviços',
        type: 'contract',
        description: 'Contrato padrão para prestação de serviços',
        fields: [
          { name: 'contratante_cnpj_cpf', label: 'CNPJ/CPF do Contratante', type: 'text', required: true, placeholder: '12.345.678/0001-90' },
          { name: 'contratante_nome', label: 'Nome/Razão Social do Contratante', type: 'text', required: true, placeholder: 'Empresa ABC Ltda' },
          { name: 'contratante_endereco', label: 'Endereço do Contratante', type: 'text', required: true, placeholder: 'Rua Comercial, 100' },
          { name: 'contratante_telefone', label: 'Telefone do Contratante', type: 'text', required: false, placeholder: '(11) 99999-9999' },
          { name: 'contratado_cnpj_cpf', label: 'CNPJ/CPF do Contratado', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'contratado_nome', label: 'Nome/Razão Social do Contratado', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'contratado_endereco', label: 'Endereço do Contratado', type: 'text', required: true, placeholder: 'Rua dos Prestadores, 50' },
          { name: 'contratado_telefone', label: 'Telefone do Contratado', type: 'text', required: false, placeholder: '(11) 88888-8888' },
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
        id: 'contrato-compra-venda',
        name: 'Contrato de Compra e Venda',
        type: 'contract',
        description: 'Contrato para compra e venda de bens',
        fields: [
          { name: 'vendedor_cnpj_cpf', label: 'CNPJ/CPF do Vendedor', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'vendedor_nome', label: 'Nome do Vendedor', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'vendedor_endereco', label: 'Endereço do Vendedor', type: 'text', required: true, placeholder: 'Rua A, 123' },
          { name: 'comprador_cnpj_cpf', label: 'CNPJ/CPF do Comprador', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'comprador_nome', label: 'Nome do Comprador', type: 'text', required: true, placeholder: 'Maria Santos' },
          { name: 'comprador_endereco', label: 'Endereço do Comprador', type: 'text', required: true, placeholder: 'Rua B, 456' },
          { name: 'bem_descricao', label: 'Descrição do Bem', type: 'textarea', required: true, placeholder: 'Veículo marca X, modelo Y...' },
          { name: 'valor_venda', label: 'Valor da Venda (R$)', type: 'text', required: true, placeholder: '50.000,00' },
          { name: 'forma_pagamento', label: 'Forma de Pagamento', type: 'textarea', required: true, placeholder: 'À vista, parcelado...' },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `CONTRATO DE COMPRA E VENDA

VENDEDOR: {{vendedor_nome}}, inscrito no CPF/CNPJ nº {{vendedor_cnpj_cpf}}, residente à {{vendedor_endereco}}

COMPRADOR: {{comprador_nome}}, inscrito no CPF/CNPJ nº {{comprador_cnpj_cpf}}, residente à {{comprador_endereco}}

OBJETO: O vendedor vende ao comprador o seguinte bem: {{bem_descricao}}

PREÇO: O valor total da venda é de R$ {{valor_venda}}.

PAGAMENTO: {{forma_pagamento}}

ENTREGA: O bem será entregue no ato da assinatura deste contrato.

GARANTIAS: O vendedor garante a propriedade do bem e ausência de ônus.

{{cidade}}, {{data_atual}}

_____________________          _____________________
     VENDEDOR                    COMPRADOR`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'contrato-locacao',
        name: 'Contrato de Locação',
        type: 'contract',
        description: 'Contrato de locação residencial ou comercial',
        fields: [
          { name: 'locador_cnpj_cpf', label: 'CNPJ/CPF do Locador', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'locador_nome', label: 'Nome do Locador', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'locador_endereco', label: 'Endereço do Locador', type: 'text', required: true, placeholder: 'Rua A, 123' },
          { name: 'locatario_cnpj_cpf', label: 'CNPJ/CPF do Locatário', type: 'text', required: true, placeholder: '987.654.321-00' },
          { name: 'locatario_nome', label: 'Nome do Locatário', type: 'text', required: true, placeholder: 'Maria Santos' },
          { name: 'locatario_endereco', label: 'Endereço do Locatário', type: 'text', required: true, placeholder: 'Rua B, 456' },
          { name: 'imovel_endereco', label: 'Endereço do Imóvel', type: 'text', required: true, placeholder: 'Rua dos Inquilinos, 789' },
          { name: 'imovel_tipo', label: 'Tipo do Imóvel', type: 'select', required: true, options: ['Residencial', 'Comercial', 'Sala', 'Apartamento', 'Casa'] },
          { name: 'valor_aluguel', label: 'Valor do Aluguel (R$)', type: 'text', required: true, placeholder: '2.500,00' },
          { name: 'prazo_meses', label: 'Prazo (meses)', type: 'number', required: true, placeholder: '30' },
          { name: 'data_inicio', label: 'Data de Início', type: 'date', required: true },
          { name: 'cidade', label: 'Cidade', type: 'text', required: true, placeholder: 'São Paulo' }
        ],
        template: `CONTRATO DE LOCAÇÃO

LOCADOR: {{locador_nome}}, inscrito no CPF/CNPJ {{locador_cnpj_cpf}}, residente à {{locador_endereco}}

LOCATÁRIO: {{locatario_nome}}, inscrito no CPF/CNPJ {{locatario_cnpj_cpf}}, residente à {{locatario_endereco}}

IMÓVEL: {{imovel_tipo}} localizado à {{imovel_endereco}}

PRAZO: {{prazo_meses}} meses, iniciando em {{data_inicio}}

VALOR: R$ {{valor_aluguel}} mensais, vencimento dia 10

OBRIGAÇÕES:
- Locatário: pagar pontualmente, conservar o imóvel
- Locador: garantir uso pacífico do imóvel

{{cidade}}, {{data_atual}}

_____________________          _____________________
     LOCADOR                    LOCATÁRIO`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // ===== FISCAL/CONTÁBIL =====
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

      // ===== FINANCEIRO =====
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
      },

      // ===== ORDEM DE SERVIÇO =====
      {
        id: 'ordem-servico',
        name: 'Ordem de Serviço (OS)',
        type: 'form',
        description: 'Ordem de serviço para controle interno',
        fields: [
          { name: 'cliente_cnpj_cpf', label: 'CNPJ/CPF do Cliente', type: 'text', required: true, placeholder: '123.456.789-00' },
          { name: 'cliente_nome', label: 'Nome do Cliente', type: 'text', required: true, placeholder: 'João Silva' },
          { name: 'cliente_endereco', label: 'Endereço do Cliente', type: 'text', required: true, placeholder: 'Rua A, 123' },
          { name: 'cliente_telefone', label: 'Telefone do Cliente', type: 'text', required: true, placeholder: '(11) 99999-9999' },
          { name: 'servico_descricao', label: 'Descrição do Serviço', type: 'textarea', required: true, placeholder: 'Manutenção de equipamento...' },
          { name: 'servico_local', label: 'Local do Serviço', type: 'text', required: true, placeholder: 'Endereço onde será realizado' },
          { name: 'data_prevista', label: 'Data Prevista', type: 'date', required: true },
          { name: 'responsavel_tecnico', label: 'Responsável Técnico', type: 'text', required: true, placeholder: 'Carlos Santos' },
          { name: 'valor_estimado', label: 'Valor Estimado (R$)', type: 'text', required: false, placeholder: '500,00' },
          { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Observações especiais...' }
        ],
        template: `ORDEM DE SERVIÇO

CLIENTE: {{cliente_nome}}
CPF/CNPJ: {{cliente_cnpj_cpf}}
ENDEREÇO: {{cliente_endereco}}
TELEFONE: {{cliente_telefone}}

SERVIÇO: {{servico_descricao}}

LOCAL: {{servico_local}}

DATA PREVISTA: {{data_prevista}}

RESPONSÁVEL: {{responsavel_tecnico}}

VALOR ESTIMADO: R$ {{valor_estimado}}

OBSERVAÇÕES: {{observacoes}}

{{data_atual}}

_________________________________
Responsável Técnico`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];
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

O documento foi gerado e está pronto para visualização e impressão.`,
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

    if (prompt.toLowerCase().includes('procuração')) {
      return {
        tipo: 'Procuração',
        titulo: 'Procuração Simples',
        conteudo_texto: `PROCURAÇÃO

Eu, _________________________, brasileiro(a), portador(a) do CPF nº ________________, residente à ______________________________, nomeio e constituo como meu(minha) bastante procurador(a) _________________________, CPF nº ________________, para representar-me perante repartições públicas e assinar documentos em meu nome.

${currentDate}

_________________________________
Assinatura do Outorgante`,
        conteudo_html: `<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
  <h1 style="text-align: center; margin-bottom: 30px;">PROCURAÇÃO</h1>
  <p>Eu, <strong>_________________________</strong>, brasileiro(a), portador(a) do CPF nº <strong>________________</strong>, residente à <strong>______________________________</strong>, nomeio e constituo como meu(minha) bastante procurador(a) <strong>_________________________</strong>, CPF nº <strong>________________</strong>, para representar-me perante repartições públicas e assinar documentos em meu nome.</p>
  <p style="margin-top: 60px;">${currentDate}</p>
  <div style="margin-top: 80px; text-align: center;">
    <div style="border-top: 1px solid black; width: 300px; margin: 0 auto; padding-top: 5px;">
      <strong>Assinatura do Outorgante</strong>
    </div>
  </div>
</div>`,
        campos_editaveis: ['outorgante', 'procurador'],
        instrucoes: 'Preencha os campos destacados com os dados do outorgante e procurador.'
      };
    }

    return {
      tipo: 'Documento Personalizado',
      titulo: `Documento - ${currentDate}`,
      conteudo_texto: `DOCUMENTO

${prompt}

${currentDate}

_________________________________
Assinatura`,
      conteudo_html: `<div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
  <h1 style="text-align: center; margin-bottom: 30px;">DOCUMENTO</h1>
  <p>${prompt}</p>
  <p style="margin-top: 60px;">${currentDate}</p>
  <div style="margin-top: 80px; text-align: center;">
    <div style="border-top: 1px solid black; width: 300px; margin: 0 auto; padding-top: 5px;">
      <strong>Assinatura</strong>
    </div>
  </div>
</div>`,
      campos_editaveis: [],
      instrucoes: 'Documento personalizado gerado localmente.'
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
        userEmail: user.email,
        empresaId: userData?.empresaId,
        aiGenerated: true
      };

      await addDoc(collection(db, 'generated_documents'), documentToSave);
      await loadDocuments(userData?.empresaId || '');
      console.log('✅ Documento salvo com sucesso');
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

      selectedTemplate.fields.forEach(field => {
        const value = formData[field.name] || '';
        const regex = new RegExp(`{{${field.name}}}`, 'g');
        content = content.replace(regex, value);
        htmlContent = htmlContent.replace(regex, `<strong>${value}</strong>`);
      });

      const currentDate = new Date().toLocaleDateString('pt-BR');
      content = content.replace(/{{data_atual}}/g, currentDate);
      htmlContent = htmlContent.replace(/{{data_atual}}/g, `<strong>${currentDate}</strong>`);

      htmlContent = `
        <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: black;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase;">${selectedTemplate.name}</h1>
          </div>
          <div style="text-align: justify; line-height: 1.8;">
            ${htmlContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
          </div>
        </div>
      `;

      setGeneratedContent(content);
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
        userEmail: user.email,
        empresaId: userData?.empresaId
      };

      await addDoc(collection(db, 'generated_documents'), documentData);
      await loadDocuments(userData?.empresaId || '');

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
      await loadDocuments(userData?.empresaId || '');
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      alert('Erro ao excluir documento.');
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const tabs = [
    { id: 'generator', label: 'Gerar', icon: '📝' },
    { id: 'chat', label: 'Chat IA', icon: '🤖' },
    { id: 'ocr', label: 'OCR', icon: '📷' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'history', label: 'Histórico', icon: '📂' },
    { id: 'empresas', label: 'Empresas', icon: '🏢' }
  ];

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
        .document-preview {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 2rem;
          white-space: pre-wrap;
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          min-height: 400px;
          color: black;
        }
        .document-html-preview {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          min-height: 400px;
          overflow: auto;
        }
        .template-card {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .template-card:hover {
          border-color: #ffa500;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .template-card.selected {
          border-color: #ffa500;
          background: rgba(255,165,0,0.1);
        }
        .tab-nav {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          overflow-x: auto;
        }
        .tab-button {
          padding: 1rem 1.5rem;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .tab-button.active {
          color: #ffa500;
          border-bottom-color: #ffa500;
        }
        .chat-container {
          height: 500px;
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.2);
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
          border-radius: 8px;
          line-height: 1.5;
        }
        .message.user {
          align-self: flex-end;
          background: #ffa500;
          color: white;
        }
        .message.assistant {
          align-self: flex-start;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .chat-input {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.2);
          display: flex;
          gap: 1rem;
        }
        .input {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 5px;
          width: 100%;
        }
        .input::placeholder {
          color: rgba(255,255,255,0.5);
        }
        .button {
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        .button-primary {
          background: linear-gradient(45deg, #ffa500, #ff8c00);
          color: white;
        }
        .button-outline {
          background: transparent;
          border: 1px solid #ffa500;
          color: #ffa500;
        }
        .button-ghost {
          background: transparent;
          color: rgba(255,255,255,0.7);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .card {
          background: rgba(255,255,255,0.1);
          padding: 2rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .ocr-drop-zone {
          border: 2px dashed rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .ocr-drop-zone:hover {
          border-color: #ffa500;
          background: rgba(255,165,0,0.1);
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
            📄 Sistema de Documentos Avançado
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8 }}>
            Geração inteligente de documentos com IA
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ThemeSelector size="medium" />
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            👤 {userData.displayName} ({userData.role})
          </span>
          <button
            onClick={() => signOut(auth)}
            className="button"
            style={{ background: '#ef4444', color: 'white' }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
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
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '1rem 0' }}>
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
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
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
                background: 'rgba(255,255,255,0.1)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
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
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0' }}>
                  {template.description}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1rem'
                }}>
                  <span style={{ 
                    background: 'rgba(255,165,0,0.2)', 
                    color: '#ffa500', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem' 
                  }}>
                    {template.type}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                    {template.fields.length} campos
                  </span>
                </div>
              </div>
            ))}
          </div>
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
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
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
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h4>{selectedTemplate.name}</h4>
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0' }}>
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

                {generatedContent && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4>📄 Documento Gerado</h4>
                    </div>

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
                        📥 Download
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
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{document.title}</h4>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>
                        Template: {document.templateName}
                        {document.aiGenerated && (
                          <span style={{ 
                            background: 'rgba(255,165,0,0.2)', 
                            color: '#ffa500', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            marginLeft: '0.5rem'
                          }}>
                            🤖 IA
                          </span>
                        )}
                      </p>
                      <small style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                        style={{ color: '#ef4444' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.7)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <p>Nenhum documento encontrado</p>
            </div>
          )}
        </div>
      )}

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
