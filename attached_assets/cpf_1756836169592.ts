import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cpf } = req.query;

  if (!cpf || typeof cpf !== 'string' || !/^\d{11}$/.test(cpf)) {
    return res.status(400).json({ 
      success: false,
      error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' 
    });
  }

  const apiKey = process.env.APICPF_TOKEN;
  if (!apiKey) {
    return res.status(500).json({ 
      success: false,
      error: 'Token da API do apicpf.com não configurado no ambiente' 
    });
  }

  const apiUrl = `https://apicpf.com/api/consulta?cpf=${cpf}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na consulta da API CPF:', errorData);

      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Erro ao consultar CPF',
        code: errorData.code || response.status
      });
    }

    const data = await response.json();

    if (data.code === 200 && data.data) {
      return res.status(200).json({
        success: true,
        nome: data.data.nome,
        genero: data.data.genero,
        nascimento: data.data.data_nascimento,
        cpf: data.data.cpf
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'CPF não encontrado'
      });
    }
  } catch (error) {
    console.error('Erro interno ao consultar CPF:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno ao consultar CPF', 
      details: (error as Error).message 
    });
  }
}