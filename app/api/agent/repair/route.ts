
import { NextResponse } from 'next/server';
import { GPTFixer, FixProgress, FixReport } from '@/src/lib/agent/fixer';
import { runTSC } from '@/src/lib/tsc/tscRunner';

function createSSEMessage(type: string, data: any): Uint8Array {
  const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(message);
}

export async function GET() {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Validate OpenAI API key
        if (!process.env.OPENAI_API_KEY) {
          controller.enqueue(createSSEMessage('log', {
            message: '❌ OPENAI_API_KEY não encontrada no ambiente',
            type: 'error'
          }));
          controller.enqueue(createSSEMessage('done', { success: false }));
          controller.close();
          return;
        }

        // Send initial log
        controller.enqueue(createSSEMessage('log', {
          message: '🔍 Analisando projeto...',
          type: 'info'
        }));

        // Run initial analysis
        const initialResult = runTSC();
        
        if (initialResult.ok) {
          controller.enqueue(createSSEMessage('log', {
            message: '✅ Nenhum erro encontrado!',
            type: 'success'
          }));
          controller.enqueue(createSSEMessage('done', { success: true, finalErrors: 0 }));
          controller.close();
          return;
        }

        const totalErrors = initialResult.errors.length;
        const totalFiles = Object.keys(initialResult.groupedByFile).length;

        controller.enqueue(createSSEMessage('log', {
          message: `📊 Encontrados ${totalErrors} erros em ${totalFiles} arquivos`,
          type: 'info'
        }));

        // Initialize GPT fixer
        controller.enqueue(createSSEMessage('log', {
          message: '🤖 Inicializando corretor GPT...',
          type: 'info'
        }));

        const fixer = new GPTFixer();

        // Start fixing
        const reports: FixReport[] = [];

        try {
          const allReports = await fixer.fixFilesWithGPT(
            initialResult.groupedByFile,
            5, // max files per pass
            5, // max passes
            (progress: FixProgress, report: FixReport) => {
              // Check if controller is still open before enqueueing
              if (controller.desiredSize === null) {
                return; // Controller is closed
              }
              
              // Progress update
              controller.enqueue(createSSEMessage('progress', progress));
              
              // File update
              if (report.changed) {
                const aiUsed = report.notes?.includes('Gemini') ? '🤖 Gemini' : '🧠 OpenAI';
                controller.enqueue(createSSEMessage('log', {
                  message: `📝 ${report.file} - ${report.notes || 'Corrigido'}`,
                  type: 'success'
                }));
              } else {
                const errors = report.errors || ['Erro não especificado'];
                const errorMsg = errors.join('; ');
                
                // Check for quota exceeded error
                if (errorMsg.includes('429') || errorMsg.includes('quota')) {
                  controller.enqueue(createSSEMessage('log', {
                    message: `🔄 ${report.file} - Cota da OpenAI excedida, tentando Gemini...`,
                    type: 'warning'
                  }));
                } else if (errorMsg.includes('Erro desconhecido') || errorMsg === 'undefined') {
                  controller.enqueue(createSSEMessage('log', {
                    message: `❌ ${report.file} - Falha na correção (detalhes não disponíveis)`,
                    type: 'error'
                  }));
                } else {
                  controller.enqueue(createSSEMessage('log', {
                    message: `❌ ${report.file} - ${errorMsg}`,
                    type: 'error'
                  }));
                }
              }

              // Backup notification
              if (report.backupPath) {
                controller.enqueue(createSSEMessage('log', {
                  message: `💾 Backup criado: ${report.backupPath}`,
                  type: 'info'
                }));
              }

              reports.push(report);
            }
          );
        } catch (quotaError) {
          if (quotaError instanceof Error && quotaError.message.includes('429')) {
            controller.enqueue(createSSEMessage('log', {
              message: `💳 Cota da OpenAI excedida. Verifique sua conta em platform.openai.com`,
              type: 'error'
            }));
            controller.enqueue(createSSEMessage('done', { success: false, error: 'quota_exceeded' }));
            controller.close();
            return;
          }
          throw quotaError;
        }

        // Final analysis
        controller.enqueue(createSSEMessage('log', {
          message: '🔍 Executando análise final...',
          type: 'info'
        }));

        const finalResult = runTSC();
        const finalErrors = finalResult.ok ? 0 : finalResult.errors.length;
        const errorsFixed = totalErrors - finalErrors;
        const filesChanged = reports.filter(r => r.changed).length;

        // Send summary
        const summary = {
          initialErrors: totalErrors,
          finalErrors,
          errorsFixed,
          filesChanged,
          backupsCreated: reports.filter(r => r.backupPath).length
        };

        controller.enqueue(createSSEMessage('summary', summary));

        controller.enqueue(createSSEMessage('log', {
          message: `📊 Resumo: ${errorsFixed} erros corrigidos, ${filesChanged} arquivos alterados`,
          type: 'success'
        }));

        if (finalErrors === 0) {
          controller.enqueue(createSSEMessage('log', {
            message: '🎉 Todos os erros foram corrigidos!',
            type: 'success'
          }));
        } else {
          controller.enqueue(createSSEMessage('log', {
            message: `⚠️ Ainda restam ${finalErrors} erros`,
            type: 'warning'
          }));
        }

        // Send completion
        controller.enqueue(createSSEMessage('done', { 
          success: true, 
          finalErrors,
          errorsFixed 
        }));

      } catch (error) {
        console.error('Erro durante o reparo:', error);
        controller.enqueue(createSSEMessage('log', {
          message: `💥 Erro durante o reparo: ${error}`,
          type: 'error'
        }));
        controller.enqueue(createSSEMessage('done', { success: false }));
      }
      
      // Always close the stream
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
