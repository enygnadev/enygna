#!/usr/bin/env ts-node

import { runTSC } from '../src/lib/tsc/tscRunner';
import { GPTFixer } from '../src/lib/agent/fixer';

export async function runGptFix(passLimit: number = 5): Promise<void> {
  console.log('🔍 Analisando projeto...');

  const result = runTSC();

  if (result.ok) {
    console.log('✅ Nenhum erro encontrado!');
    return;
  }

  const totalErrors = result.errors.length;
  const totalFiles = Object.keys(result.groupedByFile).length;

  console.log(`📊 Encontrados ${totalErrors} erros em ${totalFiles} arquivos`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não encontrada no ambiente');
    process.exit(1);
  }

  console.log('🤖 Iniciando correção com GPT...');

  const fixer = new GPTFixer();

  const reports = await fixer.fixFilesWithGPT(
    result.groupedByFile,
    5,
    passLimit,
    (progress, report) => {
      console.log(`📁 [${progress.pass}/${progress.totalPasses}] ${report.file} - ${report.changed ? '✅ Corrigido' : '❌ Falha'}`);
    }
  );

  // Análise final
  console.log('🔍 Executando análise final...');
  const finalResult = runTSC();
  const finalErrors = finalResult.ok ? 0 : finalResult.errors.length;
  const errorsFixed = totalErrors - finalErrors;
  const filesChanged = reports.filter(r => r.changed).length;

  console.log(`\n📊 Resumo:`);
  console.log(`   Erros iniciais: ${totalErrors}`);
  console.log(`   Erros finais: ${finalErrors}`);
  console.log(`   Erros corrigidos: ${errorsFixed}`);
  console.log(`   Arquivos alterados: ${filesChanged}`);
  console.log(`   Backups criados: ${reports.filter(r => r.backupPath).length}`);

  if (finalErrors === 0) {
    console.log('🎉 Todos os erros foram corrigidos!');
  } else {
    console.log(`⚠️  Ainda restam ${finalErrors} erros`);
  }
}

// Se executado diretamente
if (require.main === module) {
  const passLimit = parseInt(process.argv[2]) || 5;
  runGptFix(passLimit).catch(console.error);
}