
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cnpj = searchParams.get('cnpj');

  if (!cnpj || typeof cnpj !== 'string') {
    return Response.json({ error: 'CNPJ inválido ou ausente.' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_CNPJA_API_TOKEN;

  if (!token) {
    return Response.json({ error: 'CNPJA_API_TOKEN não configurada no .env.local' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://open.cnpja.com/office/${cnpj}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({
        error: data.message || 'Erro ao consultar CNPJ',
      }, { status: response.status });
    }

    return Response.json({
      nome: data.company?.name || data.alias || 'Nome não encontrado',
      fantasia: data.alias || null,
      fundacao: data.founded || null,
      status: data.status?.text || null,
      atividadePrincipal: data.mainActivity?.text || null,
      endereco: data.address || null,
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return Response.json({ error: 'Erro interno na consulta de CNPJ' }, { status: 500 });
  }
}
