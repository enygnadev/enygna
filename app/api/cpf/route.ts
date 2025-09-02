
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

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Erro na consulta da API CPF:', data);
      
      // Se for erro de API key ou autenticação, retornar como CPF válido mas sem dados
      if (response.status === 401 || response.status === 403) {
        return Response.json({
          success: true,
          validFormat: true,
          nome: null,
          message: 'CPF válido, mas consulta indisponível no momento'
        });
      }

      return Response.json({
        success: false,
        error: data?.message || 'Erro ao consultar CPF',
        code: data?.code || response.status
      }, { status: response.status });
    }

    if (data && data.code === 200 && data.data) {
      return Response.json({
        success: true,
        nome: data.data.nome,
        genero: data.data.genero,
        nascimento: data.data.data_nascimento,
        cpf: data.data.cpf
      });
    } else {
      return Response.json({
        success: true,
        validFormat: true,
        nome: null,
        message: 'CPF válido, mas sem dados disponíveis'
      });
    }
  } catch (error) {
    console.error('Erro interno ao consultar CPF:', error);
    
    // Em caso de erro de rede, retornar como CPF válido mas sem dados
    return Response.json({
      success: true,
      validFormat: true,
      nome: null,
      message: 'CPF válido, mas consulta indisponível no momento'
    });
  }
}
