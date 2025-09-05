'use client';

import { useState } from 'react';

export default function TermsOfService() {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');

  const content = {
    pt: {
      title: 'Termos de Serviço',
      lastUpdate: 'Última atualização: Janeiro 2025',
      sections: [
        {
          title: '1. Aceitação dos Termos',
          content: 'TODO: Condições de aceitação e idade mínima'
        },
        {
          title: '2. Descrição do Serviço',
          content: 'TODO: Descrever os serviços oferecidos pela plataforma'
        },
        {
          title: '3. Conta de Usuário',
          content: 'TODO: Responsabilidades do usuário com a conta'
        },
        {
          title: '4. Uso Aceitável',
          content: 'TODO: Regras de uso e proibições'
        },
        {
          title: '5. Propriedade Intelectual',
          content: 'TODO: Direitos sobre conteúdo e marca'
        },
        {
          title: '6. Pagamento e Assinatura',
          content: 'TODO: Termos de pagamento, reembolso e cancelamento'
        },
        {
          title: '7. Limitação de Responsabilidade',
          content: 'TODO: Limitações e isenções de responsabilidade'
        },
        {
          title: '8. Modificações',
          content: 'TODO: Como e quando os termos podem ser alterados'
        },
        {
          title: '9. Lei Aplicável',
          content: 'TODO: Jurisdição e resolução de disputas'
        }
      ]
    },
    en: {
      title: 'Terms of Service',
      lastUpdate: 'Last updated: January 2025',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'TODO: Acceptance conditions and minimum age'
        },
        {
          title: '2. Service Description',
          content: 'TODO: Describe platform services'
        },
        {
          title: '3. User Account',
          content: 'TODO: User account responsibilities'
        },
        {
          title: '4. Acceptable Use',
          content: 'TODO: Usage rules and prohibitions'
        },
        {
          title: '5. Intellectual Property',
          content: 'TODO: Content and trademark rights'
        },
        {
          title: '6. Payment and Subscription',
          content: 'TODO: Payment, refund and cancellation terms'
        },
        {
          title: '7. Limitation of Liability',
          content: 'TODO: Limitations and liability disclaimers'
        },
        {
          title: '8. Modifications',
          content: 'TODO: How and when terms may change'
        },
        {
          title: '9. Governing Law',
          content: 'TODO: Jurisdiction and dispute resolution'
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {content[lang].title}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('pt')}
              className={`px-4 py-2 rounded ${lang === 'pt' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              PT
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 rounded ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              EN
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-8">{content[lang].lastUpdate}</p>
        
        <div className="space-y-6">
          {content[lang].sections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-xl font-semibold mb-2">{section.title}</h2>
              <p className="text-gray-700">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}