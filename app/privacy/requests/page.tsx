'use client';

import { useState } from 'react';

export default function DataRequests() {
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [requestType, setRequestType] = useState('');

  const content = {
    pt: {
      title: 'Solicitações de Dados',
      subtitle: 'Exercite seus direitos de privacidade',
      types: {
        access: 'Acesso aos dados',
        rectification: 'Retificação',
        deletion: 'Exclusão',
        portability: 'Portabilidade',
        objection: 'Oposição ao processamento'
      },
      form: {
        type: 'Tipo de Solicitação',
        name: 'Nome Completo',
        email: 'Email',
        description: 'Descrição da Solicitação',
        submit: 'Enviar Solicitação',
        processing: 'TODO: Implementar envio de solicitação'
      }
    },
    en: {
      title: 'Data Requests',
      subtitle: 'Exercise your privacy rights',
      types: {
        access: 'Data access',
        rectification: 'Rectification',
        deletion: 'Deletion',
        portability: 'Portability',
        objection: 'Objection to processing'
      },
      form: {
        type: 'Request Type',
        name: 'Full Name',
        email: 'Email',
        description: 'Request Description',
        submit: 'Submit Request',
        processing: 'TODO: Implement request submission'
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(content[lang].form.processing);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {content[lang].title}
            </h1>
            <p className="text-gray-600 mt-2">{content[lang].subtitle}</p>
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {content[lang].form.type}
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select...</option>
              {Object.entries(content[lang].types).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {content[lang].form.name}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {content[lang].form.email}
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {content[lang].form.description}
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            {content[lang].form.submit}
          </button>
        </form>
      </div>
    </div>
  );
}