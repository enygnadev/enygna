
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  startAt,
  endAt,
  Timestamp
} from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface ProductivityMetrics {
  averageHoursPerDay: number;
  totalHoursWorked: number;
  productivityScore: number; // 0-100
  consistencyScore: number; // 0-100
  punctualityScore: number; // 0-100
  overtimeHours: number;
  absentDays: number;
}

interface CompanyInsights {
  totalEmployees: number;
  activeEmployees: number;
  totalHoursThisMonth: number;
  averageProductivity: number;
  topPerformers: Array<{
    employeeId: string;
    name: string;
    score: number;
    hoursWorked: number;
  }>;
  costAnalysis: {
    totalLaborCost: number;
    averageCostPerHour: number;
    overtimeCosts: number;
  };
  trends: {
    productivityTrend: 'up' | 'down' | 'stable';
    attendanceTrend: 'up' | 'down' | 'stable';
    costTrend: 'up' | 'down' | 'stable';
  };
}

interface TimePattern {
  dayOfWeek: string;
  hour: number;
  punchCount: number;
  averageDuration: number;
}

class AdvancedAnalytics {
  // Calcular métricas de produtividade de um funcionário
  async calculateEmployeeProductivity(
    companyId: string, 
    employeeId: string, 
    period: { start: Date; end: Date }
  ): Promise<ProductivityMetrics> {
    try {
      const sessionsQuery = query(
        collection(db, 'companies', companyId, 'employees', employeeId, 'sessions'),
        where('start', '>=', Timestamp.fromDate(period.start)),
        where('start', '<=', Timestamp.fromDate(period.end)),
        orderBy('start', 'asc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{
        id: string;
        start?: any;
        end?: any;
        durationSec?: number;
        earnings?: number;
        status?: string;
        [key: string]: any;
      }>;

      // Calcular métricas
      const totalHours = sessions.reduce((sum, session) => {
        return sum + ((session.durationSec || 0) / 3600);
      }, 0);

      const workingDays = this.getWorkingDaysBetween(period.start, period.end);
      const averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

      // Score de produtividade baseado em horas trabalhadas vs esperado (8h/dia)
      const expectedHours = workingDays * 8;
      const productivityScore = Math.min(100, (totalHours / expectedHours) * 100);

      // Score de consistência baseado na variação diária
      const dailyHours = this.groupSessionsByDay(sessions);
      const consistencyScore = this.calculateConsistencyScore(dailyHours);

      // Score de pontualidade baseado em atrasos
      const punctualityScore = this.calculatePunctualityScore(sessions);

      // Horas extras (acima de 8h por dia)
      const overtimeHours = Math.max(0, totalHours - expectedHours);

      // Dias de ausência
      const daysWithSessions = new Set(sessions.map(s => 
        s.start?.toDate ? format(s.start.toDate(), 'yyyy-MM-dd') : ''
      )).size;
      const absentDays = Math.max(0, workingDays - daysWithSessions);

      return {
        averageHoursPerDay,
        totalHoursWorked: totalHours,
        productivityScore: Math.round(productivityScore),
        consistencyScore: Math.round(consistencyScore),
        punctualityScore: Math.round(punctualityScore),
        overtimeHours,
        absentDays
      };
    } catch (error) {
      console.error('Erro ao calcular métricas de produtividade:', error);
      throw error;
    }
  }

  // Gerar insights da empresa
  async generateCompanyInsights(companyId: string, month?: Date): Promise<CompanyInsights> {
    const targetMonth = month || new Date();
    const startDate = startOfMonth(targetMonth);
    const endDate = endOfMonth(targetMonth);

    try {
      // Buscar todos os funcionários
      const employeesSnapshot = await getDocs(
        collection(db, 'companies', companyId, 'employees')
      );
      
      const employees = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{
        id: string;
        email?: string;
        displayName?: string;
        effectiveHourlyRate?: number;
        monthlySalary?: number;
        role?: string;
        [key: string]: any;
      }>;

      const insights: CompanyInsights = {
        totalEmployees: employees.length,
        activeEmployees: 0,
        totalHoursThisMonth: 0,
        averageProductivity: 0,
        topPerformers: [],
        costAnalysis: {
          totalLaborCost: 0,
          averageCostPerHour: 0,
          overtimeCosts: 0
        },
        trends: {
          productivityTrend: 'stable',
          attendanceTrend: 'stable',
          costTrend: 'stable'
        }
      };

      const employeeMetrics = [];

      // Calcular métricas para cada funcionário
      for (const employee of employees) {
        try {
          const metrics = await this.calculateEmployeeProductivity(
            companyId,
            employee.id,
            { start: startDate, end: endDate }
          );

          if (metrics.totalHoursWorked > 0) {
            insights.activeEmployees++;
            insights.totalHoursThisMonth += metrics.totalHoursWorked;

            // Calcular custos
            const hourlyRate = employee.effectiveHourlyRate || 0;
            const regularHours = Math.min(metrics.totalHoursWorked, metrics.totalHoursWorked - metrics.overtimeHours);
            const regularCost = regularHours * hourlyRate;
            const overtimeCost = metrics.overtimeHours * hourlyRate * 1.5; // 50% adicional

            insights.costAnalysis.totalLaborCost += regularCost + overtimeCost;
            insights.costAnalysis.overtimeCosts += overtimeCost;

            employeeMetrics.push({
              employeeId: employee.id,
              name: employee.displayName || employee.email,
              score: (metrics.productivityScore + metrics.consistencyScore + metrics.punctualityScore) / 3,
              hoursWorked: metrics.totalHoursWorked,
              metrics
            });
          }
        } catch (error) {
          console.warn(`Erro ao calcular métricas do funcionário ${employee.id}:`, error);
        }
      }

      // Top performers
      insights.topPerformers = employeeMetrics
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(emp => ({
          employeeId: emp.employeeId,
          name: emp.name || 'Usuário sem nome',
          score: Math.round(emp.score),
          hoursWorked: Math.round(emp.hoursWorked * 100) / 100
        }));

      // Produtividade média
      insights.averageProductivity = employeeMetrics.length > 0
        ? Math.round(employeeMetrics.reduce((sum, emp) => sum + emp.score, 0) / employeeMetrics.length)
        : 0;

      // Custo médio por hora
      insights.costAnalysis.averageCostPerHour = insights.totalHoursThisMonth > 0
        ? insights.costAnalysis.totalLaborCost / insights.totalHoursThisMonth
        : 0;

      // Calcular trends comparando com mês anterior
      const previousMonth = subMonths(targetMonth, 1);
      const previousInsights = await this.generateCompanyInsights(companyId, previousMonth);
      
      insights.trends = this.calculateTrends(insights, previousInsights);

      return insights;
    } catch (error) {
      console.error('Erro ao gerar insights da empresa:', error);
      throw error;
    }
  }

  // Analisar padrões de horário
  async analyzeTimePatterns(companyId: string, employeeId: string): Promise<TimePattern[]> {
    try {
      const sessionsQuery = query(
        collection(db, 'companies', companyId, 'employees', employeeId, 'sessions'),
        orderBy('start', 'desc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => doc.data()) as Array<{
        start?: any;
        end?: any;
        durationSec?: number;
        [key: string]: any;
      }>;

      const patterns: Map<string, TimePattern> = new Map();

      sessions.forEach(session => {
        if (session.start?.toDate) {
          const date = session.start.toDate();
          const dayOfWeek = format(date, 'EEEE');
          const hour = date.getHours();
          const key = `${dayOfWeek}-${hour}`;

          if (patterns.has(key)) {
            const pattern = patterns.get(key)!;
            pattern.punchCount++;
            pattern.averageDuration = (pattern.averageDuration + (session.durationSec || 0)) / 2;
          } else {
            patterns.set(key, {
              dayOfWeek,
              hour,
              punchCount: 1,
              averageDuration: session.durationSec || 0
            });
          }
        }
      });

      return Array.from(patterns.values())
        .sort((a, b) => b.punchCount - a.punchCount);
    } catch (error) {
      console.error('Erro ao analisar padrões de horário:', error);
      return [];
    }
  }

  // Métodos auxiliares
  private getWorkingDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  private groupSessionsByDay(sessions: any[]) {
    const dailyHours: Map<string, number> = new Map();
    
    sessions.forEach(session => {
      if (session.start?.toDate) {
        const day = format(session.start.toDate(), 'yyyy-MM-dd');
        const hours = (session.durationSec || 0) / 3600;
        dailyHours.set(day, (dailyHours.get(day) || 0) + hours);
      }
    });
    
    return Array.from(dailyHours.values());
  }

  private calculateConsistencyScore(dailyHours: number[]): number {
    if (dailyHours.length === 0) return 0;
    
    const average = dailyHours.reduce((sum, hours) => sum + hours, 0) / dailyHours.length;
    const variance = dailyHours.reduce((sum, hours) => sum + Math.pow(hours - average, 2), 0) / dailyHours.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Menor desvio padrão = maior consistência
    return Math.max(0, 100 - (standardDeviation * 10));
  }

  private calculatePunctualityScore(sessions: any[]): number {
    // Simplificado: assume que sessions com start exato no horário são pontuais
    // Em uma implementação real, você compararia com os horários programados
    const totalSessions = sessions.length;
    if (totalSessions === 0) return 100;
    
    const punctualSessions = sessions.filter(session => {
      if (session.start?.toDate) {
        const minutes = session.start.toDate().getMinutes();
        return minutes === 0; // Considera pontual se bater ponto na hora exata
      }
      return false;
    }).length;
    
    return (punctualSessions / totalSessions) * 100;
  }

  private calculateTrends(current: CompanyInsights, previous: CompanyInsights) {
    const productivityChange = current.averageProductivity - previous.averageProductivity;
    const attendanceChange = current.activeEmployees - previous.activeEmployees;
    const costChange = current.costAnalysis.totalLaborCost - previous.costAnalysis.totalLaborCost;
    
    return {
      productivityTrend: productivityChange > 5 ? 'up' : productivityChange < -5 ? 'down' : 'stable',
      attendanceTrend: attendanceChange > 0 ? 'up' : attendanceChange < 0 ? 'down' : 'stable',
      costTrend: costChange > 1000 ? 'up' : costChange < -1000 ? 'down' : 'stable'
    } as const;
  }
}

export const advancedAnalytics = new AdvancedAnalytics();

export type {
  ProductivityMetrics,
  CompanyInsights,
  TimePattern
};
