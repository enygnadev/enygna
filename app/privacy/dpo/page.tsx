'use client';

import { useState } from 'react';

export default function DataProtectionOfficer() {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');

  const content = {
    pt: {
      title: 'Encarregado de Proteção de Dados',
      role: 'DPO - Data Protection Officer',
      intro: 'Nosso Encarregado de Proteção de Dados está disponível para esclarecer dúvidas sobre o tratamento de seus dados pessoais e atender suas solicitações.',
      contact: {
        title: 'Informações de Contato',
        name: 'TODO: Nome do DPO',
        email: 'dpo@enygna.com',
        phone: 'TODO: Telefone de contato',
        address: 'TODO: Endereço completo',
        hours: 'Segunda a Sexta, 9h às 18h (Horário de Brasília)'
      },
      responsibilities: {
        title: 'Responsabilidades do DPO',
        items: [
          'Orientar sobre práticas de proteção de dados',
          'Atender solicitações dos titulares de dados',
          'Cooperar com a Autoridade Nacional de Proteção de Dados (ANPD)',
          'Realizar avaliações de impacto à proteção de dados',
          'Garantir conformidade com LGPD e GDPR'
        ]
      },
      rights: {
        title: 'Seus Direitos',
        items: [
          'Confirmação e acesso aos dados',
          'Correção de dados incompletos ou desatualizados',
          'Anonimização ou eliminação de dados',
          'Portabilidade dos dados',
          'Informação sobre compartilhamento',
          'Revogação do consentimento'
        ]
      }
    },
    en: {
      title: 'Data Protection Officer',
      role: 'DPO - Data Protection Officer',
      intro: 'Our Data Protection Officer is available to answer questions about the processing of your personal data and handle your requests.',
      contact: {
        title: 'Contact Information',
        name: 'TODO: DPO Name',
        email: 'dpo@enygna.com',
        phone: 'TODO: Contact phone',
        address: 'TODO: Full address',
        hours: 'Monday to Friday, 9am to 6pm (Brasília Time)'
      },
      responsibilities: {
        title: 'DPO Responsibilities',
        items: [
          'Guide on data protection practices',
          'Handle data subject requests',
          'Cooperate with Data Protection Authorities',
          'Conduct data protection impact assessments',
          'Ensure LGPD and GDPR compliance'
        ]
      },
      rights: {
        title: 'Your Rights',
        items: [
          'Confirmation and access to data',
          'Correction of incomplete or outdated data',
          'Anonymization or deletion of data',
          'Data portability',
          'Information about sharing',
          'Consent withdrawal'
        ]
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {content[lang].title}
              </h1>
              <p className="text-lg text-gray-600 mt-1">{content[lang].role}</p>
            </div>
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
          
          <p className="text-gray-700 mb-8">{content[lang].intro}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{content[lang].contact.title}</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Nome:</span> {content[lang].contact.name}
              </div>
              <div>
                <span className="font-medium">Email:</span>{' '}
                <a href={`mailto:${content[lang].contact.email}`} className="text-blue-600 hover:underline">
                  {content[lang].contact.email}
                </a>
              </div>
              <div>
                <span className="font-medium">Telefone:</span> {content[lang].contact.phone}
              </div>
              <div>
                <span className="font-medium">Endereço:</span> {content[lang].contact.address}
              </div>
              <div>
                <span className="font-medium">Horário:</span> {content[lang].contact.hours}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{content[lang].responsibilities.title}</h2>
            <ul className="space-y-2">
              {content[lang].responsibilities.items.map((item, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-600 mr-2">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">{content[lang].rights.title}</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {content[lang].rights.items.map((item, idx) => (
              <div key={idx} className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}