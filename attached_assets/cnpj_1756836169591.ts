import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { cnpj } = req.query;

  if (!cnpj || typeof cnpj !== 'string') {
    return res.status(400).json({ error: 'CNPJ inválido ou ausente.' });
  }

  const token = process.env.CNPJA_API_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'CNPJA_API_TOKEN não configurada no .env.local' });
  }

  try {
    const response = await fetch(`https://open.cnpja.com/office/${cnpj}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Erro ao consultar CNPJ',
      });
    }

    return res.status(200).json({
      nome: data.company?.name || data.alias || 'Nome não encontrado',
      fantasia: data.alias || null,
      fundacao: data.founded || null,
      status: data.status?.text || null,
      atividadePrincipal: data.mainActivity?.text || null,
      endereco: data.address || null,
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return res.status(500).json({ error: 'Erro interno na consulta de CNPJ' });
  }
}
