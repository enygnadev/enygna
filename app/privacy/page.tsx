
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            🔒 Política de Privacidade
          </h1>
          <p style={{ color: '#6b7280' }}>
            Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018
          </p>
          <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div style={{ lineHeight: '1.6', color: '#374151' }}>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              1. Informações Gerais
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              A <strong>Cartão Ponto Web</strong>, inscrita no CNPJ 00.000.000/0001-00, com sede em Tubarão, Santa Catarina, 
              está comprometida com a proteção da privacidade e dos dados pessoais de seus usuários, em conformidade com a 
              Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
            </p>
            <p>
              Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              2. Dados Coletados
            </h2>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              2.1 Dados Pessoais Identificáveis
            </h3>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>CPF (quando necessário)</li>
              <li>Dados de localização (GPS) para registro de ponto</li>
              <li>Endereço IP</li>
              <li>Informações do dispositivo e navegador</li>
            </ul>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              2.2 Dados de Uso
            </h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Registros de ponto (entrada, saída, intervalos)</li>
              <li>Logs de acesso ao sistema</li>
              <li>Interações com a plataforma</li>
              <li>Dados de performance e analytics</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              3. Finalidades do Tratamento
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Utilizamos seus dados pessoais para as seguintes finalidades:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Controle de ponto eletrônico:</strong> Registro e gestão de horários de trabalho</li>
              <li><strong>Relatórios gerenciais:</strong> Geração de relatórios para RH e gestão</li>
              <li><strong>Segurança:</strong> Prevenção de fraudes e atividades suspeitas</li>
              <li><strong>Conformidade legal:</strong> Cumprimento de obrigações trabalhistas</li>
              <li><strong>Melhoria do serviço:</strong> Analytics e otimização da plataforma</li>
              <li><strong>Comunicação:</strong> Notificações importantes sobre o serviço</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              4. Base Legal
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              O tratamento de seus dados pessoais é realizado com base nas seguintes hipóteses legais:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Consentimento:</strong> Para funcionalidades opcionais e marketing</li>
              <li><strong>Execução de contrato:</strong> Para prestação do serviço contratado</li>
              <li><strong>Cumprimento de obrigação legal:</strong> Legislação trabalhista</li>
              <li><strong>Legítimo interesse:</strong> Segurança e melhoria do serviço</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              5. Compartilhamento de Dados
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Seus dados pessoais podem ser compartilhados nas seguintes situações:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Com sua empresa empregadora (dados de ponto e relatórios)</li>
              <li>Com autoridades competentes quando exigido por lei</li>
              <li>Com fornecedores de serviços técnicos (sob contrato de confidencialidade)</li>
              <li>Em caso de fusão, aquisição ou venda de ativos (com notificação prévia)</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              6. Armazenamento e Segurança
            </h2>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              6.1 Localização dos Dados
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              Seus dados são armazenados em servidores seguros localizados no Brasil, 
              em conformidade com a legislação nacional.
            </p>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              6.2 Medidas de Segurança
            </h3>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Autenticação multifator</li>
              <li>Monitoramento e logs de segurança</li>
              <li>Backups seguros e regulares</li>
              <li>Auditoria e testes de segurança regulares</li>
            </ul>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              6.3 Retenção de Dados
            </h3>
            <p>
              Mantemos seus dados pessoais pelo período necessário para as finalidades descritas, 
              ou conforme exigido por lei (mínimo de 5 anos para dados trabalhistas).
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              7. Seus Direitos (LGPD)
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Você possui os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li><strong>Acesso:</strong> Consultar seus dados tratados</li>
              <li><strong>Correção:</strong> Corrigir dados incompletos ou inexatos</li>
              <li><strong>Anonimização/Bloqueio:</strong> Solicitar anonimização ou bloqueio</li>
              <li><strong>Eliminação:</strong> Excluir dados desnecessários ou tratados incorretamente</li>
              <li><strong>Portabilidade:</strong> Transferir dados para outro fornecedor</li>
              <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> Conhecer entidades com quem compartilhamos dados</li>
              <li><strong>Oposição:</strong> Opor-se ao tratamento em certas situações</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              8. Cookies e Tecnologias Similares
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
              <li>Manter sua sessão ativa</li>
              <li>Lembrar suas preferências</li>
              <li>Analisar o uso da plataforma</li>
              <li>Personalizar sua experiência</li>
            </ul>
            <p>
              Você pode gerenciar suas preferências de cookies nas configurações do seu navegador 
              ou através do nosso painel de privacidade.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              9. Menores de Idade
            </h2>
            <p>
              Nossa plataforma não é destinada a menores de 18 anos. Caso identifiquemos 
              dados de menores coletados sem autorização, tomaremos medidas para excluí-los imediatamente.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              10. Alterações na Política
            </h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre alterações 
              significativas através do e-mail cadastrado ou avisos na plataforma.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              11. Contato e DPO
            </h2>
            <div style={{
              background: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '1rem' }}>
                📧 Encarregado de Proteção de Dados (DPO)
              </h3>
              <p><strong>Nome:</strong> [Nome do DPO]</p>
              <p><strong>E-mail:</strong> dpo@cartaopontoweb.com.br</p>
              <p><strong>Telefone:</strong> (48) 99999-9999</p>
              <p><strong>Endereço:</strong> Tubarão, Santa Catarina, Brasil</p>
              
              <h3 style={{ fontSize: '1.1rem', fontWeight: '500', margin: '1rem 0' }}>
                🏛️ Autoridade de Controle
              </h3>
              <p>
                Para reclamações sobre o tratamento de dados pessoais, você pode contatar a 
                Autoridade Nacional de Proteção de Dados (ANPD):
              </p>
              <p><strong>Site:</strong> www.gov.br/anpd</p>
              <p><strong>E-mail:</strong> comunicacao@anpd.gov.br</p>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
              12. Legislação Aplicável
            </h2>
            <p>
              Esta política é regida pela legislação brasileira, especialmente:
            </p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</li>
              <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
              <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
              <li>Constituição Federal de 1988</li>
            </ul>
          </section>
        </div>

        <div style={{ 
          marginTop: '3rem', 
          paddingTop: '2rem', 
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '1rem 2rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            ← Voltar
          </button>
          
          <a
            href="/privacy-settings"
            style={{
              padding: '1rem 2rem',
              background: '#22c55e',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '500',
              display: 'inline-block'
            }}
          >
            ⚙️ Gerenciar Privacidade
          </a>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: '#f3f4f6', 
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>
            🔒 <strong>Seus dados são protegidos por criptografia de nível bancário</strong><br/>
            Esta política de privacidade está em conformidade com a LGPD e é atualizada regularmente.
          </p>
        </div>
      </div>
    </div>
  );
}
