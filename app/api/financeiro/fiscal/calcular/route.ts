
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  DocumentoFinanceiro, 
  TipoImposto, 
  ImpostoDocumento, 
  ImpostoItem,
  RelatorioFiscal,
  PeriodoRelatorio 
} from '@/src/types/financeiro';

// Tabelas de alíquotas por estado/município
interface TabelaAliquotas {
  icms: Record<string, number>; // Por UF
  iss: Record<string, number>;  // Por código município
  pis: number;
  cofins: number;
  ipi: Record<string, number>;  // Por NCM
  simples: Record<string, number[]>; // Por faixa de faturamento
}

const TABELA_ALIQUOTAS: TabelaAliquotas = {
  icms: {
    'SP': 18, 'RJ': 20, 'MG': 18, 'RS': 17, 'PR': 18,
    'SC': 17, 'BA': 18, 'GO': 17, 'PE': 18, 'CE': 18
  },
  iss: {
    '3550308': 5, // São Paulo
    '3304557': 5, // Rio de Janeiro
    '3106200': 5, // Belo Horizonte
    '4314902': 5, // Porto Alegre
  },
  pis: 1.65,
  cofins: 7.6,
  ipi: {
    '22071000': 0,    // Água
    '17011100': 0,    // Açúcar
    '24020000': 150,  // Cigarros
    '22030000': 10,   // Cerveja
  },
  simples: {
    'comercio': [4, 7.3, 9.5, 10.7, 14.3, 19, 24, 35],
    'industria': [4.5, 7.8, 10, 11.2, 14.7, 30, 30, 30],
    'servicos': [6, 11.2, 13.5, 16, 21, 33, 33, 33]
  }
};

// Calculadora de ICMS
class CalculadoraICMS {
  static calcular(
    valor: number, 
    ufOrigem: string, 
    ufDestino: string, 
    operacao: 'interna' | 'interestadual'
  ): ImpostoItem {
    let aliquota = 0;
    let baseCalculo = valor;

    if (operacao === 'interna') {
      aliquota = TABELA_ALIQUOTAS.icms[ufDestino] || 18;
    } else {
      // Operação interestadual
      if (['SP', 'RJ', 'MG', 'RS', 'PR', 'SC'].includes(ufOrigem)) {
        aliquota = 12;
      } else {
        aliquota = 7;
      }
    }

    const valorIcms = (baseCalculo * aliquota) / 100;

    return {
      tipo: 'ICMS',
      baseCalculo,
      aliquota,
      valor: valorIcms,
      cst: operacao === 'interna' ? '00' : '10'
    };
  }

  static calcularDifal(
    valor: number,
    ufOrigem: string,
    ufDestino: string
  ): { icmsDifal: ImpostoItem; fcp: ImpostoItem } {
    const aliquotaInterna = TABELA_ALIQUOTAS.icms[ufDestino] || 18;
    const aliquotaInterestadual = ['SP', 'RJ', 'MG', 'RS'].includes(ufOrigem) ? 12 : 7;
    const aliquotaFcp = 1; // Fundo de Combate à Pobreza (varia por UF)

    const baseCalculo = valor;
    const valorDifal = (baseCalculo * (aliquotaInterna - aliquotaInterestadual)) / 100;
    const valorFcp = (baseCalculo * aliquotaFcp) / 100;

    return {
      icmsDifal: {
        tipo: 'ICMS_DIFAL',
        baseCalculo,
        aliquota: aliquotaInterna - aliquotaInterestadual,
        valor: valorDifal,
        cst: '10'
      },
      fcp: {
        tipo: 'FCP',
        baseCalculo,
        aliquota: aliquotaFcp,
        valor: valorFcp,
        cst: '10'
      }
    };
  }
}

// Calculadora de PIS/COFINS
class CalculadoraPisCofins {
  static calcularCumulativo(valor: number): { pis: ImpostoItem; cofins: ImpostoItem } {
    const baseCalculo = valor;
    const valorPis = (baseCalculo * TABELA_ALIQUOTAS.pis) / 100;
    const valorCofins = (baseCalculo * TABELA_ALIQUOTAS.cofins) / 100;

    return {
      pis: {
        tipo: 'PIS',
        baseCalculo,
        aliquota: TABELA_ALIQUOTAS.pis,
        valor: valorPis,
        cst: '01'
      },
      cofins: {
        tipo: 'COFINS',
        baseCalculo,
        aliquota: TABELA_ALIQUOTAS.cofins,
        valor: valorCofins,
        cst: '01'
      }
    };
  }

  static calcularNaoCumulativo(
    valor: number,
    custos: number = 0
  ): { pis: ImpostoItem; cofins: ImpostoItem } {
    const baseCalculo = valor - custos; // Base = receita - custos dedutíveis
    const aliquotaPis = 1.65;
    const aliquotaCofins = 7.6;
    
    const valorPis = (baseCalculo * aliquotaPis) / 100;
    const valorCofins = (baseCalculo * aliquotaCofins) / 100;

    return {
      pis: {
        tipo: 'PIS',
        baseCalculo,
        aliquota: aliquotaPis,
        valor: valorPis,
        cst: '02'
      },
      cofins: {
        tipo: 'COFINS',
        baseCalculo,
        aliquota: aliquotaCofins,
        valor: valorCofins,
        cst: '02'
      }
    };
  }
}

// Calculadora de ISS
class CalculadoraISS {
  static calcular(valor: number, codigoMunicipio: string, codigoServico: string): ImpostoItem {
    let aliquota = TABELA_ALIQUOTAS.iss[codigoMunicipio] || 5;
    
    // Alíquotas específicas por tipo de serviço
    const servicosEspeciais: Record<string, number> = {
      '14.01': 2,   // Advocacia
      '17.14': 2,   // Medicina
      '16.01': 3,   // Engenharia
    };

    if (servicosEspeciais[codigoServico]) {
      aliquota = servicosEspeciais[codigoServico];
    }

    const baseCalculo = valor;
    const valorIss = (baseCalculo * aliquota) / 100;

    return {
      tipo: 'ISS',
      baseCalculo,
      aliquota,
      valor: valorIss
    };
  }
}

// Calculadora do Simples Nacional
class CalculadoraSimplesNacional {
  static calcular(
    faturamento12Meses: number,
    faturamentoMes: number,
    atividade: 'comercio' | 'industria' | 'servicos'
  ): ImpostoItem[] {
    const faixas = [
      180000, 360000, 720000, 1800000, 3600000, 4800000, 7200000, 16000000
    ];
    
    let faixa = 0;
    for (let i = 0; i < faixas.length; i++) {
      if (faturamento12Meses <= faixas[i]) {
        faixa = i;
        break;
      }
    }

    const aliquota = TABELA_ALIQUOTAS.simples[atividade][faixa];
    const valorTotal = (faturamentoMes * aliquota) / 100;

    // Distribuição aproximada dos impostos no Simples
    const distribuicao = {
      comercio: { irpj: 0.25, csll: 0.15, pis: 0.15, cofins: 0.15, icms: 0.30 },
      industria: { irpj: 0.25, csll: 0.15, pis: 0.15, cofins: 0.15, icms: 0.20, ipi: 0.10 },
      servicos: { irpj: 0.25, csll: 0.15, pis: 0.15, cofins: 0.15, iss: 0.30 }
    };

    const dist = distribuicao[atividade];
    const impostos: ImpostoItem[] = [];

    for (const [imposto, percentual] of Object.entries(dist)) {
      impostos.push({
        tipo: imposto.toUpperCase() as TipoImposto,
        baseCalculo: faturamentoMes,
        aliquota: aliquota * percentual,
        valor: valorTotal * percentual,
        csosn: '101' // Simples Nacional
      });
    }

    return impostos;
  }

  static calcularProjecao(
    faturamentoAtual: number,
    metasProjecao: number
  ): { 
    faixaAtual: number; 
    faixaProjetada: number; 
    economiaSublimite: number;
    alertaLimite: boolean;
  } {
    const faixas = [180000, 360000, 720000, 1800000, 3600000, 4800000, 7200000, 16000000];
    
    let faixaAtual = 0;
    let faixaProjetada = 0;
    
    for (let i = 0; i < faixas.length; i++) {
      if (faturamentoAtual <= faixas[i]) {
        faixaAtual = i;
        break;
      }
    }
    
    for (let i = 0; i < faixas.length; i++) {
      if (metasProjecao <= faixas[i]) {
        faixaProjetada = i;
        break;
      }
    }

    const economiaSublimite = Math.max(0, faixas[faixaAtual] - faturamentoAtual);
    const alertaLimite = metasProjecao > faixas[faixaAtual];

    return {
      faixaAtual,
      faixaProjetada,
      economiaSublimite,
      alertaLimite
    };
  }
}

// Calculadora de retenções
class CalculadoraRetencoes {
  static calcularIRRF(valor: number, tipoServico: string): ImpostoItem | null {
    const tabelaIRRF: Record<string, number> = {
      'servicos_profissionais': 1.5,
      'servicos_terceirizados': 11,
      'alugueis': 27.5,
      'royalties': 15
    };

    const aliquota = tabelaIRRF[tipoServico];
    if (!aliquota) return null;

    const baseCalculo = valor;
    const valorIrrf = (baseCalculo * aliquota) / 100;

    return {
      tipo: 'IRRF',
      baseCalculo,
      aliquota,
      valor: valorIrrf
    };
  }

  static calcularINSS(valor: number, tipoServico: string): ImpostoItem | null {
    const aliquotasINSS: Record<string, number> = {
      'servicos_terceirizados': 11,
      'cooperativas': 15
    };

    const aliquota = aliquotasINSS[tipoServico];
    if (!aliquota) return null;

    const baseCalculo = valor;
    const valorInss = (baseCalculo * aliquota) / 100;

    return {
      tipo: 'INSS',
      baseCalculo,
      aliquota,
      valor: valorInss
    };
  }
}

// Processador principal de cálculos
async function calcularImpostosDocumento(
  documento: DocumentoFinanceiro,
  configuracoes: any = {}
): Promise<{
  impostos: ImpostoDocumento[];
  totalTributos: number;
  economia?: number;
  alertas: string[];
  detalhamento: any;
}> {
  const impostos: ImpostoDocumento[] = [];
  const alertas: string[] = [];
  let totalTributos = 0;

  try {
    // Processar cada item do documento
    for (const item of documento.itens) {
      const impostosItem: ImpostoItem[] = [];

      // ICMS
      if (configuracoes.calcularICMS !== false) {
        const icms = CalculadoraICMS.calcular(
          item.valorTotal,
          documento.emitente.endereco.uf,
          documento.destinatario.endereco?.uf || documento.emitente.endereco.uf,
          documento.emitente.endereco.uf === documento.destinatario.endereco?.uf ? 'interna' : 'interestadual'
        );
        impostosItem.push(icms);
      }

      // PIS/COFINS
      if (configuracoes.calcularPisCofins !== false) {
        const { pis, cofins } = configuracoes.regimeCumulativo ? 
          CalculadoraPisCofins.calcularCumulativo(item.valorTotal) :
          CalculadoraPisCofins.calcularNaoCumulativo(item.valorTotal, configuracoes.custosDedutiveis || 0);
        
        impostosItem.push(pis, cofins);
      }

      // IPI (se aplicável)
      if (item.ncm && TABELA_ALIQUOTAS.ipi[item.ncm]) {
        const aliquotaIpi = TABELA_ALIQUOTAS.ipi[item.ncm];
        const valorIpi = (item.valorTotal * aliquotaIpi) / 100;
        
        impostosItem.push({
          tipo: 'IPI',
          baseCalculo: item.valorTotal,
          aliquota: aliquotaIpi,
          valor: valorIpi
        });
      }

      // Agrupar impostos por tipo
      impostosItem.forEach(impostoItem => {
        const impostoExistente = impostos.find(i => i.tipo === impostoItem.tipo);
        
        if (impostoExistente) {
          impostoExistente.valorTotal += impostoItem.valor;
          impostoExistente.detalhes.push(impostoItem);
        } else {
          impostos.push({
            tipo: impostoItem.tipo,
            valorTotal: impostoItem.valor,
            detalhes: [impostoItem]
          });
        }
        
        totalTributos += impostoItem.valor;
      });
    }

    // ISS para documentos de serviço
    if (documento.tipo === 'nfse') {
      // Mapear cidade/UF para código do município
      const getMunicipalityCode = (cidade?: string, uf?: string): string => {
        const cityMap: Record<string, string> = {
          'São Paulo-SP': '3550308',
          'Rio de Janeiro-RJ': '3304557',
          'Belo Horizonte-MG': '3106200',
          'Porto Alegre-RS': '4314902'
        };
        
        const cityKey = `${cidade}-${uf}`;
        return cityMap[cityKey] || '3550308'; // Default São Paulo
      };
      
      const codigoMunicipio = getMunicipalityCode(
        documento.destinatario.endereco?.cidade,
        documento.destinatario.endereco?.uf
      );
      
      const iss = CalculadoraISS.calcular(
        documento.valores.valorLiquido,
        codigoMunicipio,
        configuracoes.codigoServico || '16.01'
      );
      
      impostos.push({
        tipo: 'ISS',
        valorTotal: iss.valor,
        detalhes: [iss]
      });
      
      totalTributos += iss.valor;
    }

    // Retenções (se aplicável)
    if (configuracoes.calcularRetencoes) {
      const irrf = CalculadoraRetencoes.calcularIRRF(
        documento.valores.valorLiquido,
        configuracoes.tipoServico || 'servicos_profissionais'
      );
      
      if (irrf) {
        impostos.push({
          tipo: 'IRRF',
          valorTotal: irrf.valor,
          detalhes: [irrf]
        });
        totalTributos += irrf.valor;
      }

      const inss = CalculadoraRetencoes.calcularINSS(
        documento.valores.valorLiquido,
        configuracoes.tipoServico || 'servicos_terceirizados'
      );
      
      if (inss) {
        impostos.push({
          tipo: 'INSS',
          valorTotal: inss.valor,
          detalhes: [inss]
        });
        totalTributos += inss.valor;
      }
    }

    // Cálculo do Simples Nacional (se aplicável)
    if (configuracoes.regimeTributario === 'simples_nacional') {
      const impostosSimples = CalculadoraSimplesNacional.calcular(
        configuracoes.faturamento12Meses || 1000000,
        documento.valores.valorLiquido,
        configuracoes.tipoAtividade || 'comercio'
      );
      
      impostosSimples.forEach(impostoSimples => {
        const impostoExistente = impostos.find(i => i.tipo === impostoSimples.tipo);
        
        if (impostoExistente) {
          impostoExistente.valorTotal = impostoSimples.valor; // Substituir pelo Simples
          impostoExistente.detalhes = [impostoSimples];
        } else {
          impostos.push({
            tipo: impostoSimples.tipo,
            valorTotal: impostoSimples.valor,
            detalhes: [impostoSimples]
          });
        }
      });
      
      // Recalcular total para Simples
      totalTributos = impostos.reduce((total, imp) => total + imp.valorTotal, 0);
      
      alertas.push('Cálculo baseado no Simples Nacional');
    }

    // Validações e alertas
    const cargaTributaria = (totalTributos / documento.valores.valorLiquido) * 100;
    
    if (cargaTributaria > 35) {
      alertas.push(`Carga tributária alta: ${cargaTributaria.toFixed(2)}%`);
    }
    
    if (documento.valores.valorLiquido > 10000 && !configuracoes.regimeTributario) {
      alertas.push('Considere verificar o regime tributário para otimização');
    }

    return {
      impostos,
      totalTributos,
      alertas,
      detalhamento: {
        cargaTributaria,
        valorLiquido: documento.valores.valorLiquido,
        valorTributos: totalTributos,
        percentualTributos: cargaTributaria
      }
    };

  } catch (error) {
    console.error('Erro no cálculo de impostos:', error);
    throw new Error('Falha no cálculo de impostos');
  }
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
    const { documento, configuracoes = {} } = body;

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento não fornecido' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Calcular impostos
    const resultado = await calcularImpostosDocumento(documento, configuracoes);
    
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        ...resultado,
        metadata: {
          processingTime,
          calculatedAt: new Date().toISOString(),
          version: '1.0.0',
          engine: 'fiscal_calculator'
        }
      }
    });

  } catch (error) {
    console.error('Erro no cálculo fiscal:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint para simulações e projeções
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
    const tipo = url.searchParams.get('tipo');
    const faturamento = Number(url.searchParams.get('faturamento')) || 1000000;
    const projecao = Number(url.searchParams.get('projecao')) || faturamento * 1.2;

    if (tipo === 'simples_projecao') {
      const resultado = CalculadoraSimplesNacional.calcularProjecao(faturamento, projecao);
      
      return NextResponse.json({
        success: true,
        data: {
          faturamentoAtual: faturamento,
          projecao: projecao,
          ...resultado,
          recomendacoes: resultado.alertaLimite ? 
            ['Considere estratégias para não ultrapassar o limite do Simples Nacional'] :
            ['Faturamento dentro dos limites do Simples Nacional']
        }
      });
    }

    // Outras simulações podem ser adicionadas aqui

    return NextResponse.json({
      success: false,
      error: 'Tipo de simulação não suportado'
    }, { status: 400 });

  } catch (error) {
    console.error('Erro na simulação fiscal:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
