
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DocumentoFinanceiro, ClassificacaoContabil, TipoImposto } from '@/src/types/financeiro';

// Interface para regras de classificação
interface RegraClassificacao {
  id: string;
  nome: string;
  condicoes: CondicaoClassificacao[];
  classificacao: ClassificacaoContabil;
  prioridade: number;
  ativa: boolean;
  empresaId?: string; // null = regra global
}

interface CondicaoClassificacao {
  campo: string; // ex: 'emitente.cnpj', 'valores.valorTotal', 'descricao'
  operador: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greater' | 'less' | 'between';
  valor: any;
  valorFim?: any; // para operador 'between'
}

// Regras predefinidas do sistema
const REGRAS_PADRAO: RegraClassificacao[] = [
  {
    id: 'combustivel',
    nome: 'Combustível',
    condicoes: [
      {
        campo: 'itens.descricao',
        operador: 'contains',
        valor: 'GASOLINA|DIESEL|ETANOL|GNV'
      }
    ],
    classificacao: {
      planoContas: '3.1.1.01',
      contaDebito: '3.1.1.01.001',
      contaCredito: '1.1.1.01.001',
      centroCusto: 'FROTA',
      historico: 'Aquisição de combustível',
      tipoLancamento: 'despesa'
    },
    prioridade: 10,
    ativa: true
  },
  {
    id: 'energia_eletrica',
    nome: 'Energia Elétrica',
    condicoes: [
      {
        campo: 'emitente.razaoSocial',
        operador: 'contains',
        valor: 'ELETROPAULO|CEMIG|COPEL|CELPE'
      }
    ],
    classificacao: {
      planoContas: '3.1.2.05',
      contaDebito: '3.1.2.05.001',
      contaCredito: '1.1.1.01.001',
      centroCusto: 'ADMIN',
      historico: 'Pagamento de energia elétrica',
      tipoLancamento: 'despesa'
    },
    prioridade: 8,
    ativa: true
  },
  {
    id: 'telefonia',
    nome: 'Telefonia',
    condicoes: [
      {
        campo: 'emitente.razaoSocial',
        operador: 'contains',
        valor: 'VIVO|TIM|CLARO|OI|TELEFONICA'
      }
    ],
    classificacao: {
      planoContas: '3.1.2.08',
      contaDebito: '3.1.2.08.001',
      contaCredito: '1.1.1.01.001',
      centroCusto: 'ADMIN',
      historico: 'Serviços de telefonia',
      tipoLancamento: 'despesa'
    },
    prioridade: 8,
    ativa: true
  },
  {
    id: 'venda_produtos',
    nome: 'Venda de Produtos',
    condicoes: [
      {
        campo: 'tipo',
        operador: 'equals',
        valor: 'nfe'
      },
      {
        campo: 'valores.valorTotal',
        operador: 'greater',
        valor: 0
      }
    ],
    classificacao: {
      planoContas: '4.1.1.01',
      contaDebito: '1.1.1.01.001',
      contaCredito: '4.1.1.01.001',
      historico: 'Venda de produtos',
      tipoLancamento: 'receita'
    },
    prioridade: 5,
    ativa: true
  },
  {
    id: 'prestacao_servicos',
    nome: 'Prestação de Serviços',
    condicoes: [
      {
        campo: 'tipo',
        operador: 'equals',
        valor: 'nfse'
      }
    ],
    classificacao: {
      planoContas: '4.1.2.01',
      contaDebito: '1.1.1.01.001',
      contaCredito: '4.1.2.01.001',
      historico: 'Prestação de serviços',
      tipoLancamento: 'receita'
    },
    prioridade: 7,
    ativa: true
  },
  {
    id: 'material_escritorio',
    nome: 'Material de Escritório',
    condicoes: [
      {
        campo: 'itens.descricao',
        operador: 'contains',
        valor: 'PAPEL|CANETA|LAPIS|GRAMPEADOR|TONER|CARTUCHO'
      }
    ],
    classificacao: {
      planoContas: '3.1.2.02',
      contaDebito: '3.1.2.02.001',
      contaCredito: '1.1.1.01.001',
      centroCusto: 'ADMIN',
      historico: 'Material de escritório',
      tipoLancamento: 'despesa'
    },
    prioridade: 6,
    ativa: true
  }
];

// Sistema de machine learning simulado
class ClassificadorML {
  private modelos: Map<string, any> = new Map();

  constructor() {
    // Simular modelos treinados
    this.modelos.set('tipo_documento', {
      accuracy: 0.94,
      lastTrained: '2024-01-15T10:00:00Z'
    });
    
    this.modelos.set('categoria_despesa', {
      accuracy: 0.89,
      lastTrained: '2024-01-15T10:00:00Z'
    });
  }

  async classificarTipoDocumento(documento: DocumentoFinanceiro): Promise<{
    tipo: string;
    confidence: number;
    alternativas: { tipo: string; confidence: number }[];
  }> {
    // Simular análise ML
    await new Promise(resolve => setTimeout(resolve, 500));

    const texto = `${documento.emitente.razaoSocial} ${documento.itens.map(i => i.descricao).join(' ')}`;
    
    if (texto.includes('COMBUSTIVEL') || texto.includes('POSTO')) {
      return {
        tipo: 'combustivel',
        confidence: 0.92,
        alternativas: [
          { tipo: 'combustivel', confidence: 0.92 },
          { tipo: 'despesa_veiculo', confidence: 0.76 }
        ]
      };
    }

    if (texto.includes('ENERGIA') || texto.includes('ELETRICA')) {
      return {
        tipo: 'energia_eletrica',
        confidence: 0.88,
        alternativas: [
          { tipo: 'energia_eletrica', confidence: 0.88 },
          { tipo: 'utilidades', confidence: 0.65 }
        ]
      };
    }

    return {
      tipo: 'outros',
      confidence: 0.45,
      alternativas: [
        { tipo: 'outros', confidence: 0.45 },
        { tipo: 'material_escritorio', confidence: 0.32 }
      ]
    };
  }

  async sugerirContaContabil(documento: DocumentoFinanceiro, categoria: string): Promise<{
    conta: string;
    confidence: number;
    historico: string;
  }> {
    // Simular sugestão de conta contábil
    await new Promise(resolve => setTimeout(resolve, 300));

    const sugestoes: Record<string, any> = {
      combustivel: {
        conta: '3.1.1.01.001',
        confidence: 0.91,
        historico: `Aquisição de combustível - ${documento.emitente.razaoSocial}`
      },
      energia_eletrica: {
        conta: '3.1.2.05.001',
        confidence: 0.87,
        historico: `Energia elétrica - ${documento.emitente.razaoSocial}`
      },
      telefonia: {
        conta: '3.1.2.08.001',
        confidence: 0.85,
        historico: `Serviços de telefonia - ${documento.emitente.razaoSocial}`
      }
    };

    return sugestoes[categoria] || {
      conta: '3.1.9.99.999',
      confidence: 0.30,
      historico: `Despesa não classificada - ${documento.emitente.razaoSocial}`
    };
  }
}

// Validador de regras
class ValidadorRegras {
  static validarCondicao(documento: any, condicao: CondicaoClassificacao): boolean {
    const valor = this.obterValorCampo(documento, condicao.campo);
    
    if (valor === undefined || valor === null) {
      return false;
    }

    switch (condicao.operador) {
      case 'equals':
        return valor === condicao.valor;
      
      case 'contains':
        const regex = new RegExp(condicao.valor, 'i');
        return regex.test(String(valor));
      
      case 'startsWith':
        return String(valor).toLowerCase().startsWith(String(condicao.valor).toLowerCase());
      
      case 'endsWith':
        return String(valor).toLowerCase().endsWith(String(condicao.valor).toLowerCase());
      
      case 'greater':
        return Number(valor) > Number(condicao.valor);
      
      case 'less':
        return Number(valor) < Number(condicao.valor);
      
      case 'between':
        const numValor = Number(valor);
        return numValor >= Number(condicao.valor) && numValor <= Number(condicao.valorFim);
      
      default:
        return false;
    }
  }

  private static obterValorCampo(obj: any, caminho: string): any {
    return caminho.split('.').reduce((atual, propriedade) => {
      if (Array.isArray(atual)) {
        // Para arrays, procurar em todos os elementos
        return atual.some(item => 
          item && typeof item === 'object' && propriedade in item
        ) ? atual.map(item => item[propriedade]).filter(v => v !== undefined) : undefined;
      }
      return atual && typeof atual === 'object' ? atual[propriedade] : undefined;
    }, obj);
  }

  static validarRegra(documento: DocumentoFinanceiro, regra: RegraClassificacao): boolean {
    if (!regra.ativa) return false;
    
    return regra.condicoes.every(condicao => 
      this.validarCondicao(documento, condicao)
    );
  }
}

// Processador principal de classificação
async function classificarDocumento(
  documento: DocumentoFinanceiro,
  empresaId?: string
): Promise<{
  classificacao: ClassificacaoContabil;
  confidence: number;
  regrasAplicadas: string[];
  sugestoesMl: any;
  alternativas: ClassificacaoContabil[];
}> {
  const classificadorML = new ClassificadorML();
  const regrasAplicaveis: RegraClassificacao[] = [];
  
  // Buscar regras aplicáveis (primeiro específicas da empresa, depois globais)
  const todasRegras = [...REGRAS_PADRAO]; // Em produção, buscar do banco
  
  for (const regra of todasRegras) {
    if (regra.empresaId === empresaId || !regra.empresaId) {
      if (ValidadorRegras.validarRegra(documento, regra)) {
        regrasAplicaveis.push(regra);
      }
    }
  }

  // Ordenar por prioridade (maior primeiro)
  regrasAplicaveis.sort((a, b) => b.prioridade - a.prioridade);

  // Usar ML para sugestões adicionais
  const sugestoesMl = await classificadorML.classificarTipoDocumento(documento);
  const contaSugerida = await classificadorML.sugerirContaContabil(documento, sugestoesMl.tipo);

  let classificacaoFinal: ClassificacaoContabil;
  let confidence = 0;
  let regrasAplicadas: string[] = [];

  if (regrasAplicaveis.length > 0) {
    // Usar a regra de maior prioridade
    const melhorRegra = regrasAplicaveis[0];
    classificacaoFinal = {
      ...melhorRegra.classificacao,
      historico: melhorRegra.classificacao.historico.replace(
        '{{emitente}}', 
        documento.emitente.razaoSocial
      )
    };
    confidence = 0.85 + (melhorRegra.prioridade / 100); // Boost por prioridade
    regrasAplicadas = [melhorRegra.nome];
  } else {
    // Usar sugestão do ML
    classificacaoFinal = {
      planoContas: contaSugerida.conta.substring(0, 7),
      contaDebito: contaSugerida.conta,
      contaCredito: '1.1.1.01.001', // Caixa/Bancos padrão
      historico: contaSugerida.historico,
      tipoLancamento: documento.valores.valorLiquido > 0 ? 'receita' : 'despesa'
    };
    confidence = contaSugerida.confidence;
    regrasAplicadas = ['ML_' + sugestoesMl.tipo];
  }

  // Gerar alternativas
  const alternativas: ClassificacaoContabil[] = [];
  
  // Alternativas das outras regras aplicáveis
  regrasAplicaveis.slice(1, 3).forEach(regra => {
    alternativas.push(regra.classificacao);
  });

  // Alternativas do ML
  if (sugestoesMl.alternativas.length > 0) {
    for (const alt of sugestoesMl.alternativas.slice(0, 2)) {
      const contaAlt = await classificadorML.sugerirContaContabil(documento, alt.tipo);
      alternativas.push({
        planoContas: contaAlt.conta.substring(0, 7),
        contaDebito: contaAlt.conta,
        contaCredito: '1.1.1.01.001',
        historico: contaAlt.historico,
        tipoLancamento: documento.valores.valorLiquido > 0 ? 'receita' : 'despesa'
      });
    }
  }

  return {
    classificacao: classificacaoFinal,
    confidence,
    regrasAplicadas,
    sugestoesMl,
    alternativas: alternativas.slice(0, 3) // Máximo 3 alternativas
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documento, empresaId } = body;

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento não fornecido' },
        { status: 400 }
      );
    }

    // Validar estrutura básica do documento
    if (!documento.emitente || !documento.valores) {
      return NextResponse.json(
        { error: 'Documento inválido: faltam dados obrigatórios' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Classificar documento
    const resultado = await classificarDocumento(documento, empresaId);
    
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...resultado,
        metadata: {
          processingTime,
          processedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    });

  } catch (error) {
    console.error('Erro na classificação:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint para gerenciar regras de classificação
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId');
    const incluirGlobais = url.searchParams.get('incluirGlobais') === 'true';

    // Filtrar regras
    let regras = REGRAS_PADRAO.filter(regra => {
      if (empresaId && regra.empresaId === empresaId) return true;
      if (incluirGlobais && !regra.empresaId) return true;
      return false;
    });

    return NextResponse.json({
      success: true,
      data: {
        regras,
        total: regras.length,
        ativas: regras.filter(r => r.ativa).length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar regras:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para criar/atualizar regras
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { regra } = body;

    if (!regra || !regra.nome || !regra.classificacao) {
      return NextResponse.json(
        { error: 'Dados da regra inválidos' },
        { status: 400 }
      );
    }

    // Em produção, salvar no banco de dados
    console.log('Nova regra criada:', regra);

    return NextResponse.json({
      success: true,
      data: {
        id: `custom_${Date.now()}`,
        ...regra,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao criar regra:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
