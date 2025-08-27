
import { NextResponse } from 'next/server';
import { runTSC, getTotalErrorCount, getFileErrorCount } from '@/src/lib/tsc/tscRunner';

export async function GET() {
  try {
    const result = runTSC();
    
    const response = {
      ok: result.ok,
      totalErrors: getTotalErrorCount(result),
      totalFiles: getFileErrorCount(result),
      byFile: Object.entries(result.groupedByFile).map(([file, errors]) => ({
        file,
        errorCount: errors.length,
        errors: errors.map(e => ({
          line: e.line,
          column: e.column,
          code: e.code,
          message: e.message
        }))
      })),
      timestamp: new Date().toISOString(),
      rawOutput: result.output
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro na análise:', error);
    return NextResponse.json({
      error: 'Erro interno na análise',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
