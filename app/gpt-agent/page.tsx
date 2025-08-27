
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
  ok: boolean;
  totalErrors: number;
  totalFiles: number;
  byFile: Array<{
    file: string;
    errorCount: number;
    errors: Array<{
      line: number;
      column: number;
      code: string;
      message: string;
    }>;
  }>;
  timestamp: string;
}

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: Date;
}

interface ProgressInfo {
  pass: number;
  totalPasses: number;
  currentFile: string;
  filesInPass: number;
  totalFiles: number;
}

interface SummaryInfo {
  initialErrors: number;
  finalErrors: number;
  errorsFixed: number;
  filesChanged: number;
  backupsCreated: number;
}

export default function GPTAgentPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [summary, setSummary] = useState<SummaryInfo | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date() }]);
  };
  
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);
  
  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    setSummary(null);
    
    try {
      const response = await fetch('/api/agent/analyze');
      const data = await response.json();
      
      if (response.ok) {
        setAnalysis(data);
        addLog(`✅ Análise concluída: ${data.totalErrors} erros em ${data.totalFiles} arquivos`, 'success');
      } else {
        addLog(`❌ Erro na análise: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`💥 Falha na análise: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const startRepair = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setRepairing(true);
    setLogs([]);
    setProgress(null);
    setSummary(null);

    addLog('🚀 Iniciando processo de reparo...', 'info');
    
    const eventSource = new EventSource('/api/agent/repair');
    eventSourceRef.current = eventSource;
    
    eventSource.addEventListener('log', (event: any) => {
      const data = JSON.parse(event.data);
      addLog(data.message, data.type);
    });

    eventSource.addEventListener('progress', (event: any) => {
      const data = JSON.parse(event.data);
      setProgress(data);
    });

    eventSource.addEventListener('summary', (event: any) => {
      const data = JSON.parse(event.data);
      setSummary(data);
    });

    eventSource.addEventListener('done', (event: any) => {
      const data = JSON.parse(event.data);
      setRepairing(false);
      setProgress(null);
      eventSource.close();
      eventSourceRef.current = null;
      
      if (data.success && data.finalErrors === 0) {
        addLog('🎉 Reparo concluído! Executando nova análise...', 'success');
        setTimeout(() => runAnalysis(), 1000);
      }
    });
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setRepairing(false);
      
      if (eventSource.readyState === EventSource.CLOSED) {
        addLog('🔄 Conexão encerrada', 'info');
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        addLog('🔄 Tentando reconectar...', 'warning');
      } else {
        addLog('💥 Erro na conexão com o servidor', 'error');
        eventSource.close();
        eventSourceRef.current = null;
      }
    };

    eventSource.onopen = () => {
      addLog('🔗 Conectado ao servidor', 'info');
    };
  };
  
  const toggleFileExpansion = (file: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(file)) {
      newExpanded.delete(file);
    } else {
      newExpanded.add(file);
    }
    setExpandedFiles(newExpanded);
  };
  
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR');
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>
            🤖 GPT Agent – Correção de Build
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
            Análise e correção automática de erros TypeScript
          </p>
        </div>
        
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e2e8f0',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🏠 Voltar ao Início
        </button>
      </div>
      
      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={runAnalysis}
          disabled={loading || repairing}
          style={{
            padding: '12px 24px',
            backgroundColor: loading ? '#94a3b8' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || repairing ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {loading ? '🔄 Analisando...' : '🔍 Analisar Projeto'}
        </button>
        
        <button
          onClick={startRepair}
          disabled={!analysis || analysis.totalErrors === 0 || repairing}
          style={{
            padding: '12px 24px',
            backgroundColor: (!analysis || analysis.totalErrors === 0 || repairing) ? '#94a3b8' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (!analysis || analysis.totalErrors === 0 || repairing) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {repairing ? '🔧 Reparando...' : '🛠️ Reparar com GPT'}
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Analysis Results */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#1e293b' }}>
            📊 Análise do Projeto
          </h2>
          
          {analysis ? (
            <>
              {/* Summary */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: analysis.totalErrors === 0 ? '#dcfce7' : '#fee2e2',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: analysis.totalErrors === 0 ? '#16a34a' : '#dc2626' }}>
                    {analysis.totalErrors}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Total de Erros</div>
                </div>
                
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#e0f2fe',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1' }}>
                    {analysis.totalFiles}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Arquivos com Erro</div>
                </div>
              </div>
              
              {analysis.totalErrors === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  backgroundColor: '#dcfce7',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#16a34a'
                }}>
                  ✅ Nenhum erro de build encontrado!
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Erros por Arquivo:</h3>
                  {analysis.byFile.map((fileInfo) => (
                    <div key={fileInfo.file} style={{ marginBottom: '8px' }}>
                      <div
                        onClick={() => toggleFileExpansion(fileInfo.file)}
                        style={{
                          padding: '12px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{fileInfo.file}</span>
                        <span style={{ 
                          backgroundColor: '#dc2626',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {fileInfo.errorCount}
                        </span>
                      </div>
                      
                      {expandedFiles.has(fileInfo.file) && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '12px',
                          backgroundColor: '#fef2f2',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          {fileInfo.errors.map((error, i) => (
                            <div key={i} style={{ marginBottom: '4px' }}>
                              <strong>L{error.line},C{error.column}:</strong> {error.code} - {error.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ 
                fontSize: '12px', 
                color: '#64748b', 
                textAlign: 'center',
                marginTop: '16px'
              }}>
                Última análise: {new Date(analysis.timestamp).toLocaleString('pt-BR')}
              </div>
            </>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#64748b' 
            }}>
              Clique em "Analisar Projeto" para começar
            </div>
          )}
        </div>
        
        {/* Console & Progress */}
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#1e293b' }}>
            🖥️ Console ao Vivo
          </h2>
          
          {/* Progress Bar */}
          {progress && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                Passe {progress.pass}/{progress.totalPasses} - {progress.currentFile}
              </div>
              <div style={{ 
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                height: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#3b82f6',
                  height: '100%',
                  width: `${(progress.filesInPass / progress.totalFiles) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
          
          {/* Summary */}
          {summary && (
            <div style={{ 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <div><strong>📊 Resumo Final:</strong></div>
              <div>• Erros iniciais: {summary.initialErrors}</div>
              <div>• Erros finais: {summary.finalErrors}</div>
              <div>• Erros corrigidos: {summary.errorsFixed}</div>
              <div>• Arquivos alterados: {summary.filesChanged}</div>
              <div>• Backups criados: {summary.backupsCreated}</div>
            </div>
          )}
          
          {/* Logs */}
          <div style={{ 
            flex: 1,
            backgroundColor: '#0f172a',
            borderRadius: '8px',
            padding: '16px',
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            lineHeight: '1.5',
            minHeight: '300px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#64748b' }}>Aguardando logs...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ 
                  marginBottom: '4px',
                  color: log.type === 'error' ? '#fca5a5' : 
                        log.type === 'success' ? '#86efac' :
                        log.type === 'warning' ? '#fde047' : '#e2e8f0'
                }}>
                  <span style={{ color: '#64748b' }}>[{formatTimestamp(log.timestamp)}]</span> {log.message}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
