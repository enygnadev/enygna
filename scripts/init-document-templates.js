
// Script para inicializar templates de documentos
// Execute: node scripts/init-document-templates.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin (você precisa configurar as credenciais)
if (!admin.apps.length) {
  admin.initializeApp({
    // Adicione suas credenciais aqui
  });
}

const db = admin.firestore();

// Templates profissionais expandidos
const templatesData = [
  {
    name: "Contrato de Prestação de Serviços",
    type: "contract",
    description: "Template completo para contratos de prestação de serviços",
    fields: [
      { name: "contratante_nome", label: "Nome do Contratante", type: "text", required: true, placeholder: "Nome da empresa contratante" },
      { name: "contratante_cnpj", label: "CNPJ do Contratante", type: "text", required: true, placeholder: "00.000.000/0000-00" },
      { name: "contratante_endereco", label: "Endereço do Contratante", type: "text", required: true, placeholder: "Endereço completo" },
      { name: "contratado_nome", label: "Nome do Contratado", type: "text", required: true, placeholder: "Nome do prestador" },
      { name: "contratado_cpf", label: "CPF do Contratado", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "contratado_endereco", label: "Endereço do Contratado", type: "text", required: true, placeholder: "Endereço completo" },
      { name: "servico_descricao", label: "Descrição do Serviço", type: "textarea", required: true, placeholder: "Descreva detalhadamente os serviços" },
      { name: "valor", label: "Valor Total", type: "text", required: true, placeholder: "R$ 0,00" },
      { name: "forma_pagamento", label: "Forma de Pagamento", type: "select", required: true, options: ["À vista", "30 dias", "60 dias", "90 dias", "Parcelado"] },
      { name: "prazo", label: "Prazo de Execução", type: "text", required: true, placeholder: "30 dias" },
      { name: "cidade", label: "Cidade", type: "text", required: true, placeholder: "São Paulo" },
      { name: "estado", label: "Estado", type: "text", required: true, placeholder: "SP" }
    ],
    template: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{contratante_nome}}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº {{contratante_cnpj}}, com sede na {{contratante_endereco}}.

CONTRATADO: {{contratado_nome}}, inscrito no CPF sob nº {{contratado_cpf}}, residente e domiciliado na {{contratado_endereco}}.

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços: {{servico_descricao}}.

CLÁUSULA 2ª - DO VALOR E FORMA DE PAGAMENTO
O valor total dos serviços é de {{valor}}, a ser pago da seguinte forma: {{forma_pagamento}}.

CLÁUSULA 3ª - DO PRAZO
O prazo para execução dos serviços é de {{prazo}}, contados a partir da assinatura deste contrato.

CLÁUSULA 4ª - DAS OBRIGAÇÕES
O CONTRATADO se obriga a executar os serviços com qualidade e dentro do prazo estabelecido.
O CONTRATANTE se obriga a fornecer todas as informações necessárias e efetuar o pagamento conforme acordado.

CLÁUSULA 5ª - DA RESCISÃO
Este contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio de 30 dias.

E por estarem assim justos e contratados, firmam o presente instrumento em duas vias de igual teor.

{{cidade}}, {{estado}}, {{data_atual}}.

_____________________                    _____________________
    CONTRATANTE                             CONTRATADO`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: "Declaração de Trabalho",
    type: "certificate",
    description: "Declaração confirmando vínculo empregatício",
    fields: [
      { name: "empresa_nome", label: "Nome da Empresa", type: "text", required: true, placeholder: "Razão social da empresa" },
      { name: "empresa_cnpj", label: "CNPJ da Empresa", type: "text", required: true, placeholder: "00.000.000/0000-00" },
      { name: "empresa_endereco", label: "Endereço da Empresa", type: "text", required: true, placeholder: "Endereço completo" },
      { name: "funcionario_nome", label: "Nome do Funcionário", type: "text", required: true, placeholder: "Nome completo" },
      { name: "funcionario_cpf", label: "CPF do Funcionário", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "cargo", label: "Cargo", type: "text", required: true, placeholder: "Função exercida" },
      { name: "data_admissao", label: "Data de Admissão", type: "date", required: true },
      { name: "salario", label: "Salário", type: "text", required: true, placeholder: "R$ 0,00" },
      { name: "finalidade", label: "Finalidade", type: "text", required: false, placeholder: "Para fins de..." },
      { name: "responsavel_nome", label: "Nome do Responsável", type: "text", required: true, placeholder: "Quem assina a declaração" },
      { name: "responsavel_cargo", label: "Cargo do Responsável", type: "text", required: true, placeholder: "Ex: Gerente de RH" }
    ],
    template: `DECLARAÇÃO DE VÍNCULO EMPREGATÍCIO

A empresa {{empresa_nome}}, inscrita no CNPJ {{empresa_cnpj}}, com sede na {{empresa_endereco}}, declara para os devidos fins que {{funcionario_nome}}, portador do CPF {{funcionario_cpf}}, trabalha em nossa empresa no cargo de {{cargo}}.

O funcionário foi admitido em {{data_admissao}} e atualmente recebe salário no valor de {{salario}}.

Esta declaração é emitida {{finalidade}} e para que produza os efeitos legais necessários.

{{data_atual}}

_____________________
{{responsavel_nome}}
{{responsavel_cargo}}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: "Procuração Simples",
    type: "letter",
    description: "Procuração para representação legal simples",
    fields: [
      { name: "outorgante_nome", label: "Nome do Outorgante", type: "text", required: true, placeholder: "Quem outorga" },
      { name: "outorgante_cpf", label: "CPF do Outorgante", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "outorgante_rg", label: "RG do Outorgante", type: "text", required: true, placeholder: "00.000.000-0" },
      { name: "outorgante_endereco", label: "Endereço do Outorgante", type: "text", required: true, placeholder: "Endereço completo" },
      { name: "outorgado_nome", label: "Nome do Outorgado", type: "text", required: true, placeholder: "Quem recebe os poderes" },
      { name: "outorgado_cpf", label: "CPF do Outorgado", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "outorgado_rg", label: "RG do Outorgado", type: "text", required: true, placeholder: "00.000.000-0" },
      { name: "poderes", label: "Poderes Concedidos", type: "textarea", required: true, placeholder: "Descreva os poderes" },
      { name: "cidade", label: "Cidade", type: "text", required: true, placeholder: "São Paulo" },
      { name: "estado", label: "Estado", type: "text", required: true, placeholder: "SP" }
    ],
    template: `PROCURAÇÃO

Pelo presente instrumento particular de procuração, eu, {{outorgante_nome}}, portador do CPF {{outorgante_cpf}} e RG {{outorgante_rg}}, residente e domiciliado na {{outorgante_endereco}}, nomeio e constituo como meu bastante procurador {{outorgado_nome}}, portador do CPF {{outorgado_cpf}} e RG {{outorgado_rg}}, a quem confiro poderes para:

{{poderes}}

Fica autorizado o substabelecimento desta procuração, no todo ou em parte, com ou sem reserva de poderes.

{{cidade}}, {{estado}}, {{data_atual}}.

_____________________
{{outorgante_nome}}
OUTORGANTE`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: "Relatório de Atividades Mensal",
    type: "report",
    description: "Template para relatórios mensais detalhados",
    fields: [
      { name: "periodo", label: "Período", type: "text", required: true, placeholder: "Janeiro/2024" },
      { name: "responsavel", label: "Responsável", type: "text", required: true, placeholder: "Nome do responsável" },
      { name: "setor", label: "Setor/Departamento", type: "text", required: true, placeholder: "Departamento" },
      { name: "empresa", label: "Empresa", type: "text", required: true, placeholder: "Nome da empresa" },
      { name: "atividades", label: "Principais Atividades", type: "textarea", required: true, placeholder: "Liste as principais atividades realizadas" },
      { name: "resultados", label: "Resultados Alcançados", type: "textarea", required: true, placeholder: "Descreva os resultados obtidos" },
      { name: "metas", label: "Metas Atingidas", type: "textarea", required: false, placeholder: "Metas e indicadores" },
      { name: "desafios", label: "Principais Desafios", type: "textarea", required: false, placeholder: "Dificuldades encontradas" },
      { name: "proximos_passos", label: "Próximos Passos", type: "textarea", required: false, placeholder: "Planejamento para o próximo período" },
      { name: "observacoes", label: "Observações", type: "textarea", required: false, placeholder: "Observações adicionais" }
    ],
    template: `RELATÓRIO DE ATIVIDADES - {{periodo}}

EMPRESA: {{empresa}}
SETOR: {{setor}}
RESPONSÁVEL: {{responsavel}}
DATA: {{data_atual}}

1. PRINCIPAIS ATIVIDADES REALIZADAS
{{atividades}}

2. RESULTADOS ALCANÇADOS
{{resultados}}

3. METAS ATINGIDAS
{{metas}}

4. PRINCIPAIS DESAFIOS
{{desafios}}

5. PRÓXIMOS PASSOS
{{proximos_passos}}

6. OBSERVAÇÕES
{{observacoes}}

_____________________
{{responsavel}}
Responsável pelo Relatório`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: "Contrato de Locação Residencial",
    type: "contract",
    description: "Contrato completo para locação de imóveis residenciais",
    fields: [
      { name: "locador_nome", label: "Nome do Locador", type: "text", required: true, placeholder: "Proprietário" },
      { name: "locador_cpf", label: "CPF do Locador", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "locatario_nome", label: "Nome do Locatário", type: "text", required: true, placeholder: "Inquilino" },
      { name: "locatario_cpf", label: "CPF do Locatário", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "imovel_endereco", label: "Endereço do Imóvel", type: "text", required: true, placeholder: "Endereço completo" },
      { name: "valor_aluguel", label: "Valor do Aluguel", type: "text", required: true, placeholder: "R$ 0,00" },
      { name: "dia_vencimento", label: "Dia do Vencimento", type: "number", required: true, placeholder: "5" },
      { name: "prazo_contrato", label: "Prazo do Contrato", type: "text", required: true, placeholder: "12 meses" },
      { name: "finalidade", label: "Finalidade", type: "select", required: true, options: ["Residencial", "Comercial", "Mista"] },
      { name: "valor_caucao", label: "Valor da Caução", type: "text", required: false, placeholder: "R$ 0,00" }
    ],
    template: `CONTRATO DE LOCAÇÃO {{finalidade}}

LOCADOR: {{locador_nome}}, inscrito no CPF {{locador_cpf}}.
LOCATÁRIO: {{locatario_nome}}, inscrito no CPF {{locatario_cpf}}.

CLÁUSULA 1ª - DO OBJETO
O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado na {{imovel_endereco}}, para fins {{finalidade}}.

CLÁUSULA 2ª - DO PRAZO
O prazo da locação é de {{prazo_contrato}}, iniciando-se em {{data_atual}}.

CLÁUSULA 3ª - DO ALUGUEL
O valor mensal do aluguel é de {{valor_aluguel}}, vencível todo dia {{dia_vencimento}} de cada mês.

CLÁUSULA 4ª - DA CAUÇÃO
O LOCATÁRIO deposita a título de caução o valor de {{valor_caucao}}.

CLÁUSULA 5ª - DAS OBRIGAÇÕES
São obrigações do LOCATÁRIO: pagar pontualmente o aluguel, conservar o imóvel e restituí-lo nas mesmas condições.

{{data_atual}}

_____________________        _____________________
     LOCADOR                    LOCATÁRIO`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    name: "Atestado Médico",
    type: "certificate",
    description: "Template para atestados médicos",
    fields: [
      { name: "medico_nome", label: "Nome do Médico", type: "text", required: true, placeholder: "Dr. Nome Completo" },
      { name: "medico_crm", label: "CRM do Médico", type: "text", required: true, placeholder: "CRM 000000" },
      { name: "medico_especialidade", label: "Especialidade", type: "text", required: true, placeholder: "Clínico Geral" },
      { name: "paciente_nome", label: "Nome do Paciente", type: "text", required: true, placeholder: "Nome completo" },
      { name: "paciente_cpf", label: "CPF do Paciente", type: "text", required: true, placeholder: "000.000.000-00" },
      { name: "dias_afastamento", label: "Dias de Afastamento", type: "number", required: true, placeholder: "3" },
      { name: "cid", label: "CID (opcional)", type: "text", required: false, placeholder: "A00.0" },
      { name: "observacoes", label: "Observações", type: "textarea", required: false, placeholder: "Observações médicas" }
    ],
    template: `ATESTADO MÉDICO

Atesto para os devidos fins que o(a) Sr(a). {{paciente_nome}}, portador(a) do CPF {{paciente_cpf}}, esteve sob meus cuidados médicos e deverá afastar-se de suas atividades laborais pelo período de {{dias_afastamento}} dias, a contar de {{data_atual}}.

{{#if cid}}CID: {{cid}}{{/if}}

{{#if observacoes}}
Observações: {{observacoes}}
{{/if}}

Este atestado é emitido em cumprimento ao dispositivo legal vigente.

{{data_atual}}

_____________________
{{medico_nome}}
{{medico_especialidade}}
{{medico_crm}}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

async function initializeTemplates() {
  try {
    // Verificar se já existem templates
    const existingTemplates = await db.collection('document_templates').get();
    
    if (!existingTemplates.empty) {
      console.log('Templates já existem. Atualizando...');
      
      // Opcional: limpar templates existentes
      const batch = db.batch();
      existingTemplates.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Criar novos templates
    for (const template of templatesData) {
      await db.collection('document_templates').add(template);
      console.log(`✅ Template "${template.name}" criado com sucesso!`);
    }
    
    console.log(`🎉 Todos os ${templatesData.length} templates foram inicializados!`);
    
  } catch (error) {
    console.error('❌ Erro ao criar templates:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  initializeTemplates().then(() => {
    console.log('✅ Processo concluído!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
}

module.exports = { initializeTemplates, templatesData };
