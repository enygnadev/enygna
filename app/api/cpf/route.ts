
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cpf = searchParams.get('cpf');

  if (!cpf || typeof cpf !== 'string' || !/^\d{11}$/.test(cpf)) {
    return Response.json({ 
      success: false,
      error: 'CPF inválido. Deve conter exatamente 11 dígitos numéricos.' 
    }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_APICPF_TOKEN;
  if (!apiKey) {
    return Response.json({ 
      success: false,
      error: 'Token da API do apicpf.com não configurado no ambiente' 
    }, { status: 500 });
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

      return Response.json({
        success: false,
        error: errorData.message || 'Erro ao consultar CPF',
        code: errorData.code || response.status
      }, { status: response.status });
    }

    const data = await response.json();

    if (data.code === 200 && data.data) {
      return Response.json({
        success: true,
        nome: data.data.nome,
        genero: data.data.genero,
        nascimento: data.data.data_nascimento,
        cpf: data.data.cpf
      });
    } else {
      return Response.json({
        success: false,
        error: 'CPF não encontrado'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Erro interno ao consultar CPF:', error);
    return Response.json({ 
      success: false,
      error: 'Erro interno ao consultar CPF', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}
