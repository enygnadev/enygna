
export function buildTicketMessages(input: {
  assunto: string;
  descricao: string;
  impacto?: string;
  urgencia?: string;
  produto?: string;
  ambiente?: string;
  anexos?: string;
}) {
  const system = `Você é um analista de Suporte/Service Desk sênior especializado em ITIL/HDI. Sua missão é estruturar e qualificar chamados de TI de forma profissional, objetiva e técnica em português brasileiro.

TAREFAS PRINCIPAIS:
1. Compreender o problema técnico descrito
2. Identificar informações faltantes críticas
3. Classificar adequadamente (categoria/subcategoria/produto)
4. Priorizar conforme matriz impacto×urgência com SLA apropriado
5. Criar resumo executivo conciso (3-5 linhas)
6. Realizar análise técnica inicial com hipóteses fundamentadas
7. Elaborar checklist de coleta de dados específico
8. Definir passos estruturados (mitigação→diagnóstico→correção)
9. Avaliar riscos de segurança e compliance (LGPD/ISO27001)
10. Estabelecer critérios de aceite mensuráveis

DIRETRIZES:
- Use linguagem técnica precisa, mas acessível
- Baseie-se em boas práticas ITIL v4
- Considere cenários corporativos brasileiros
- Priorize soluções práticas e viáveis
- Mantenha foco na experiência do usuário final

FORMATO DE SAÍDA:
1. Relatório em Markdown estruturado
2. JSON estruturado conforme esquema definido (SEM comentários dentro do JSON)`;

  const schema = `ESQUEMA JSON OBRIGATÓRIO:
{
  "assunto": "string - título refinado do chamado",
  "resumo_executivo": "string - síntese em 3-5 linhas",
  "classificacao": {
    "categoria": "string - categoria principal",
    "subcategoria": "string - subcategoria específica", 
    "produto_sistema": "string - sistema/produto afetado"
  },
  "prioridade": {
    "impacto": "Baixo|Médio|Alto|Crítico",
    "urgencia": "Baixa|Média|Alta|Crítica",
    "prioridade_resultante": "P4|P3|P2|P1",
    "sla_sugerida_horas": "number - SLA em horas"
  },
  "analise_inicial": {
    "hipoteses": ["string - hipóteses técnicas"],
    "possiveis_causas_raiz": ["string - causas raiz prováveis"]
  },
  "perguntas_faltantes": ["string - informações necessárias"],
  "checklist_coleta": [
    "Horário exato do incidente (com fuso horário)",
    "Usuário(s) e área(s) afetada(s)",
    "Hostname/IP do equipamento",
    "Versão do sistema/aplicação",
    "Logs detalhados e IDs de erro",
    "Configuração de rede (VPN/Proxy/Firewall)",
    "Passos exatos para reproduzir",
    "Capturas de tela do erro",
    "Mensagens de erro completas"
  ],
  "passos_sugeridos": {
    "mitigacao_imediata": ["string - ações de contenção"],
    "diagnostico": ["string - passos de investigação"],
    "correcao": ["string - soluções permanentes"]
  },
  "riscos_seguranca": ["string - riscos identificados"],
  "criterios_aceite": ["string - critérios de resolução"]
}`;

  const user = `DADOS DO CHAMADO:

Assunto: ${input.assunto}

Descrição Detalhada:
${input.descricao}

INFORMAÇÕES ADICIONAIS:
- Impacto declarado: ${input.impacto || "(não informado)"}
- Urgência declarada: ${input.urgencia || "(não informada)"}  
- Produto/Sistema: ${input.produto || "(não especificado)"}
- Ambiente: ${input.ambiente || "(não definido)"}
- Anexos/Evidências: ${input.anexos || "(nenhum anexo fornecido)"}

${schema}

INSTRUÇÕES FINAIS:
- Analise tecnicamente o problema descrito
- Forneça primeiro um relatório em Markdown bem estruturado
- Em seguida, forneça o JSON exato conforme o esquema
- Seja específico e prático nas recomendações
- Considere urgência real vs. percebida pelo usuário`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ] as const;
}

export function buildFollowUpPrompt(ticket: any, newInfo: string) {
  const system = `Você é um analista de Service Desk atualizando a análise de um chamado com novas informações. 
Mantenha a estrutura original, mas refine a análise baseada nos dados adicionais.`;

  const user = `CHAMADO ORIGINAL:
${JSON.stringify(ticket, null, 2)}

NOVAS INFORMAÇÕES:
${newInfo}

Atualize a análise mantendo o mesmo formato JSON, refinando hipóteses, passos e prioridade conforme necessário.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ] as const;
}
