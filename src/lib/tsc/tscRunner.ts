
import { execSync } from 'child_process';
import path from 'path';

export interface TSCError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  fullMessage: string;
}

export interface TSCResult {
  ok: boolean;
  output: string;
  errors: TSCError[];
  groupedByFile: { [file: string]: TSCError[] };
}

export function runTSC(): TSCResult {
  try {
    const output = execSync('npx tsc --noEmit', {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000
    });
    
    return {
      ok: true,
      output,
      errors: [],
      groupedByFile: {}
    };
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message || '';
    const errors = parseTscErrors(output);
    const groupedByFile = groupErrorsByFile(errors);
    
    return {
      ok: false,
      output,
      errors,
      groupedByFile
    };
  }
}

export function parseTscErrors(output: string): TSCError[] {
  const lines = output.split('\n');
  const errors: TSCError[] = [];
  
  for (const line of lines) {
    // Match pattern: file.ts(line,col): error TSxxxx: message
    const match = line.match(/^(.+?\.(?:ts|tsx))\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (match) {
      const [, file, lineStr, colStr, code, message] = match;
      errors.push({
        file: path.relative(process.cwd(), file),
        line: parseInt(lineStr, 10),
        column: parseInt(colStr, 10),
        code,
        message,
        fullMessage: line
      });
    }
  }
  
  return errors;
}

function groupErrorsByFile(errors: TSCError[]): { [file: string]: TSCError[] } {
  const grouped: { [file: string]: TSCError[] } = {};
  
  for (const error of errors) {
    if (!grouped[error.file]) {
      grouped[error.file] = [];
    }
    grouped[error.file].push(error);
  }
  
  return grouped;
}

export function getTotalErrorCount(result: TSCResult): number {
  return result.errors.length;
}

export function getFileErrorCount(result: TSCResult): number {
  return Object.keys(result.groupedByFile).length;
}
