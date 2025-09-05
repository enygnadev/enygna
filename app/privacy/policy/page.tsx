'use client';

import { useState } from 'react';

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');

  const content = {
    pt: {
      title: 'Política de Privacidade',
      lastUpdate: 'Última atualização: Janeiro 2025',
      sections: [
        {
          title: '1. Informações que Coletamos',
          content: 'TODO: Detalhar tipos de dados coletados (pessoais, uso, dispositivo)'
        },
        {
          title: '2. Como Usamos suas Informações',
          content: 'TODO: Explicar finalidades do processamento de dados'
        },
        {
          title: '3. Compartilhamento de Dados',
          content: 'TODO: Descrever com quem e quando compartilhamos dados'
        },
        {
          title: '4. Segurança',
          content: 'TODO: Detalhar medidas de segurança implementadas'
        },
        {
          title: '5. Seus Direitos',
          content: 'TODO: Listar direitos do titular (LGPD/GDPR)'
        },
        {
          title: '6. Retenção de Dados',
          content: 'TODO: Explicar períodos de retenção'
        },
        {
          title: '7. Cookies',
          content: 'TODO: Política de cookies e tecnologias similares'
        },
        {
          title: '8. Contato',
          content: 'Email: privacidade@enygna.com'
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      lastUpdate: 'Last updated: January 2025',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'TODO: Detail types of data collected (personal, usage, device)'
        },
        {
          title: '2. How We Use Your Information',
          content: 'TODO: Explain data processing purposes'
        },
        {
          title: '3. Data Sharing',
          content: 'TODO: Describe with whom and when we share data'
        },
        {
          title: '4. Security',
          content: 'TODO: Detail implemented security measures'
        },
        {
          title: '5. Your Rights',
          content: 'TODO: List data subject rights (LGPD/GDPR)'
        },
        {
          title: '6. Data Retention',
          content: 'TODO: Explain retention periods'
        },
        {
          title: '7. Cookies',
          content: 'TODO: Cookie policy and similar technologies'
        },
        {
          title: '8. Contact',
          content: 'Email: privacy@enygna.com'
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