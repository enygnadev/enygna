import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    const {
      email,
      password,
      displayName,
      role,
      tipo,
      empresaId,
      sistemasAtivos,
      workDaysPerMonth,
      salaryType,
      hourlyRate,
      dailyRate,
      monthlyRate,
      monthlySalary,
      monthlyBaseHours,
      toleranceMinutes,
      lunchBreakMinutes,
      lunchThresholdMinutes
    } = userData;

    // Validar dados obrigatórios
    if (!email || !password || !displayName || !empresaId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Como não temos Admin SDK, retornar os dados para o frontend criar o usuário
    return NextResponse.json({
      success: true,
      message: 'Dados validados. Use o client SDK para criar o usuário.',
      userData: {
        email,
        password,
        displayName,
        role: role || 'colaborador',
        tipo: tipo || 'colaborador',
        empresaId,
        sistemasAtivos: sistemasAtivos || [],
        permissions: {
          canAccessSystems: sistemasAtivos || []
        },
        hourlyRate: Number(hourlyRate) || 0,
        monthlySalary: Number(monthlySalary) || 0,
        monthlyBaseHours: Number(monthlyBaseHours) || 220,
        toleranceMinutes: Number(toleranceMinutes) || 0,
        lunchBreakMinutes: Number(lunchBreakMinutes) || 0,
        lunchThresholdMinutes: Number(lunchThresholdMinutes) || 360,
        workDaysPerMonth: Number(workDaysPerMonth) || 22,
        salaryType: salaryType || 'monthly',
        dailyRate: Number(dailyRate) || 0,
        monthlyRate: Number(monthlyRate) || 0,
        ativo: true
      }
    });

  } catch (error: any) {
    console.error('Erro ao processar dados do colaborador:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}