
'use client';

import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MarkdownView({ content, className = '', style = {} }: MarkdownViewProps) {
  // Função simples para converter markdown básico em HTML seguro
  const parseMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="markdown-h3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="markdown-h2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="markdown-h1">$1</h1>')
      
      // Bold e Italic
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      
      // Code
      .replace(/`([^`]+)`/g, '<code class="markdown-code">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="markdown-link">$1</a>')
      
      // Listas
      .replace(/^\* (.+$)/gim, '<li class="markdown-li">$1</li>')
      .replace(/^- (.+$)/gim, '<li class="markdown-li">$1</li>')
      .replace(/^\d+\. (.+$)/gim, '<li class="markdown-li-numbered">$1</li>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="markdown-p">')
      .replace(/\n/g, '<br />');
  };

  const htmlContent = parseMarkdown(content);
  
  // Wrap em parágrafo se não começar com tag HTML
  const finalContent = htmlContent.startsWith('<') 
    ? htmlContent 
    : `<p class="markdown-p">${htmlContent}</p>`;

  return (
    <div 
      className={`markdown-view ${className}`}
      style={{
        lineHeight: '1.6',
        color: 'var(--color-text)',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: finalContent }}
    />
  );
}
