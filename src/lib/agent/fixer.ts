import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TSCError } from '../tsc/tscRunner';

export interface FixReport {
  file: string;
  changed: boolean;
  backupPath?: string;
  notes?: string;
  errors?: string[];
}

export interface FixProgress {
  pass: number;
  totalPasses: number;
  currentFile: string;
  filesInPass: number;
  totalFiles: number;
}

const SYSTEM_PROMPT = `Você é um agente de refatoração TypeScript para projetos Next.js.
Objetivo: corrigir erros de compilação (tsc) sem quebrar a lógica.
Regras:

1. Preserve imports, JSX e tipos existentes quando possível.
2. Prefira narrowing de tipos, ?., fallbacks e alias de imports.
3. Para Firestore: use 'as ShapeEsperado' local.
4. Para unknown: type guards simples.
5. Se o problema for named export ausente: corrija import ou crie alias no módulo.
6. Nunca remova funcionalidade existente.
7. Foque apenas nos erros TypeScript apresentados.

Saída APENAS nos blocos:
\`\`\`FILE <relative/path>
<arquivo completo corrigido>
\`\`\`

Não adicione explicações fora dos blocos de código.`;

export class GPTFixer {
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não encontrada no ambiente');
    }

    this.openai = new OpenAI({ apiKey });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não encontrada no ambiente');
    }
    this.gemini = new GoogleGenerativeAI(geminiApiKey);
  }

  async fixFilesWithGPT(
    groupedErrors: { [file: string]: TSCError[] },
    maxFilesPerPass: number = 5,
    maxPasses: number = 5,
    onProgress?: (progress: FixProgress, report: FixReport) => void
  ): Promise<FixReport[]> {
    const allReports: FixReport[] = [];
    const fileList = Object.keys(groupedErrors);
    const totalFiles = fileList.length;

    for (let pass = 1; pass <= maxPasses && fileList.length > 0; pass++) {
      const filesInThisPass = fileList.splice(0, maxFilesPerPass);

      for (let i = 0; i < filesInThisPass.length; i++) {
        const file = filesInThisPass[i];
        const errors = groupedErrors[file];

        const progress: FixProgress = {
          pass,
          totalPasses: maxPasses,
          currentFile: file,
          filesInPass: i + 1,
          totalFiles
        };

        try {
          const report = await this.fixSingleFile(file, errors);
          allReports.push(report);

          if (onProgress) {
            onProgress(progress, report);
          }
        } catch (error) {
          const report: FixReport = {
            file,
            changed: false,
            errors: [`Erro ao processar: ${error}`]
          };
          allReports.push(report);

          if (onProgress) {
            onProgress(progress, report);
          }
        }
      }

      // Se processamos menos arquivos que o máximo, não há mais arquivos
      if (filesInThisPass.length < maxFilesPerPass) {
        break;
      }
    }

    return allReports;
  }

  private async fixSingleFile(file: string, errors: TSCError[]): Promise<FixReport> {
    const filePath = path.resolve(process.cwd(), file);

    if (!fs.existsSync(filePath)) {
      return {
        file,
        changed: false,
        errors: ['Arquivo não encontrado']
      };
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    const errorMessages = errors.map(e => `Linha ${e.line}, Coluna ${e.column}: ${e.code} - ${e.message}`);

    const prompt = `Arquivo: ${file}

Erros TypeScript a corrigir:
${errorMessages.join('\n')}

Conteúdo atual:
\`\`\`typescript
${originalContent}
\`\`\`

Corrija os erros mantendo a funcionalidade existente.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return {
          file,
          changed: false,
          errors: ['OpenAI não retornou conteúdo de resposta']
        };
      }

      // Extract code from FILE blocks
      const fileMatch = content.match(/```FILE\s+[^\n]*\n([\s\S]*?)```/);
      if (!fileMatch) {
        return {
          file,
          changed: false,
          errors: ['OpenAI não retornou formato de código válido']
        };
      }

      const newContent = fileMatch[1].trim();

      // Create backup
      const backupPath = `${filePath}.bak.${Date.now()}`;
      fs.writeFileSync(backupPath, originalContent, 'utf8');

      // Write fixed content
      fs.writeFileSync(filePath, newContent, 'utf8');

      return {
        file,
        changed: true,
        backupPath,
        notes: `Corrigidos ${errors.length} erros com OpenAI`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Se for erro de cota ou outro erro que impede o uso do OpenAI, tenta com Gemini
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        console.log('OpenAI quota or availability issue, switching to Gemini...');
        try {
          const geminiResult = await this.fixWithGeminiFile(file, originalContent, errorMessages);
          return geminiResult;
        } catch (geminiError) {
          const geminiErrorMsg = geminiError instanceof Error ? geminiError.message : 'Erro desconhecido no Gemini';
          console.error('Erro ao corrigir com Gemini após falha do OpenAI:', geminiError);
          return {
            file,
            changed: false,
            errors: [`OpenAI: ${errorMessage}`, `Gemini: ${geminiErrorMsg}`]
          };
        }
      }
      
      console.error('Erro ao corrigir com GPT:', error);
      return {
        file,
        changed: false,
        errors: [`OpenAI: ${errorMessage}`]
      };
    }
  }

  async fixWithGemini(content: string, errors: string[], file: string): Promise<string> {
    const prompt = `Você é um especialista em TypeScript e React. Corrija APENAS os erros TypeScript listados no código fornecido.

IMPORTANTE: Retorne APENAS o código TypeScript corrigido, sem explicações, sem formatação markdown, sem blocos de código. Apenas o código puro.

Arquivo: ${file}

Erros a corrigir:
${errors.join('\n')}

Código atual:
${content}

Retorne o código corrigido:`;

    try {
      const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const geminiContent = response.text();

      if (!geminiContent) {
        console.error('Gemini não retornou conteúdo. Retornando conteúdo original.');
        return content;
      }

      // Try multiple extraction patterns
      let newContent = '';
      
      // Pattern 1: FILE block
      const fileMatch = geminiContent.match(/```FILE\s+[^\n]*\n([\s\S]*?)```/);
      if (fileMatch) {
        newContent = fileMatch[1].trim();
      }
      
      // Pattern 2: TypeScript/JavaScript code block
      if (!newContent) {
        const codeMatch = geminiContent.match(/```(?:typescript|tsx|javascript|jsx)?\s*\n([\s\S]*?)```/);
        if (codeMatch) {
          newContent = codeMatch[1].trim();
        }
      }
      
      // Pattern 3: Any code block
      if (!newContent) {
        const anyCodeMatch = geminiContent.match(/```\s*\n([\s\S]*?)```/);
        if (anyCodeMatch) {
          newContent = anyCodeMatch[1].trim();
        }
      }
      
      // Pattern 4: Use entire response if it looks like code
      if (!newContent && geminiContent.includes('import') && geminiContent.includes('export')) {
        newContent = geminiContent.trim();
      }

      if (!newContent) {
        console.error('Gemini não retornou código válido. Retornando conteúdo original.');
        return content;
      }

      // Validate that the content looks like valid TypeScript
      if (!newContent.includes('export') && !newContent.includes('function') && !newContent.includes('const')) {
        console.error('Resposta do Gemini não parece ser código TypeScript válido. Retornando conteúdo original.');
        return content;
      }

      return newContent;
    } catch (error) {
      console.error('Erro ao corrigir com Gemini:', error);
      throw error;
    }
  }

  private async fixWithGeminiFile(file: string, originalContent: string, errorMessages: string[]): Promise<FixReport> {
    const filePath = path.resolve(process.cwd(), file);
    
    const prompt = `Você é um especialista em TypeScript e React. Corrija APENAS os erros TypeScript listados no código fornecido.

IMPORTANTE: Retorne APENAS o código TypeScript corrigido, sem explicações, sem formatação markdown, sem blocos de código. Apenas o código puro.

Arquivo: ${file}

Erros a corrigir:
${errorMessages.join('\n')}

Código atual:
${originalContent}

Retorne o código corrigido:`;

    try {
      const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const geminiContent = response.text();

      if (!geminiContent) {
        return {
          file,
          changed: false,
          errors: ['Gemini não retornou conteúdo de resposta']
        };
      }

      // Try multiple extraction patterns
      let newContent = '';
      
      // Pattern 1: FILE block
      const fileMatch = geminiContent.match(/```FILE\s+[^\n]*\n([\s\S]*?)```/);
      if (fileMatch) {
        newContent = fileMatch[1].trim();
      }
      
      // Pattern 2: TypeScript/JavaScript code block
      if (!newContent) {
        const codeMatch = geminiContent.match(/```(?:typescript|tsx|javascript|jsx)?\s*\n([\s\S]*?)```/);
        if (codeMatch) {
          newContent = codeMatch[1].trim();
        }
      }
      
      // Pattern 3: Any code block
      if (!newContent) {
        const anyCodeMatch = geminiContent.match(/```\s*\n([\s\S]*?)```/);
        if (anyCodeMatch) {
          newContent = anyCodeMatch[1].trim();
        }
      }
      
      // Pattern 4: Use entire response if it looks like code
      if (!newContent && geminiContent.includes('import') && geminiContent.includes('export')) {
        newContent = geminiContent.trim();
      }

      if (!newContent) {
        return {
          file,
          changed: false,
          errors: ['Gemini não retornou código válido em formato reconhecível']
        };
      }

      // Validate that the content looks like valid TypeScript
      if (!newContent.includes('export') && !newContent.includes('function') && !newContent.includes('const')) {
        return {
          file,
          changed: false,
          errors: ['Resposta do Gemini não parece ser código TypeScript válido']
        };
      }

      // Create backup
      const backupPath = `${filePath}.bak.${Date.now()}`;
      fs.writeFileSync(backupPath, originalContent, 'utf8');

      // Write fixed content
      fs.writeFileSync(filePath, newContent, 'utf8');

      return {
        file,
        changed: true,
        backupPath,
        notes: `Corrigidos ${errorMessages.length} erros com Gemini`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no Gemini';
      console.error('Erro ao corrigir com Gemini:', error);
      return {
        file,
        changed: false,
        errors: [`Gemini: ${errorMessage}`]
      };
    }
  }

  async fixWithGPT(content: string, errors: string[]): Promise<string> {
    const prompt = `Você é um especialista em TypeScript e React. Analise o código a seguir e corrija APENAS os erros TypeScript listados. Mantenha a funcionalidade original e retorne apenas o código corrigido sem explicações:

CÓDIGO:
\`\`\`typescript
${content}
\`\`\`

ERROS A CORRIGIR:
${errors.map(error => `- ${error}`).join('\n')}

Responda apenas com o código TypeScript corrigido:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em correção de código TypeScript. Retorne apenas o código corrigido, sem explicações ou formatação markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      return response.choices[0]?.message?.content || content;
    } catch (error) {
      // Se for erro de cota, tenta com Gemini
      if (error instanceof Error && error.message.includes('429')) {
        console.log('OpenAI quota exceeded, switching to Gemini...');
        return this.fixWithGemini(content, errors, ''); // Pass empty file name for this specific call
      }
      console.error('Erro ao corrigir com GPT:', error);
      throw error;
    }
  }
}