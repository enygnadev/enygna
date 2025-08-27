
'use client';

export interface OCRResult {
  text: string;
  confidence: number;
  fields: Record<string, any>;
  documentType?: string;
}

class OCRService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY || '';
  }

  async processDocument(file: File, documentType?: string): Promise<OCRResult> {
    try {
      // Simular processamento OCR por enquanto
      const text = await this.extractTextFromImage(file);
      
      return {
        text,
        confidence: 0.95,
        fields: this.parseDocumentFields(text, documentType),
        documentType: documentType || this.detectDocumentType(text)
      };
    } catch (error) {
      console.error('Erro no OCR:', error);
      throw new Error('Falha ao processar documento');
    }
  }

  private async extractTextFromImage(file: File): Promise<string> {
    // Implementar integração com API de OCR real
    // Por enquanto, retorna texto simulado
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Simular extração de texto
        resolve(`Documento processado: ${file.name}\nTipo: ${file.type}\nTamanho: ${file.size} bytes`);
      };
      reader.readAsDataURL(file);
    });
  }

  private parseDocumentFields(text: string, documentType?: string): Record<string, any> {
    const fields: Record<string, any> = {};

    // Parsers específicos por tipo de documento
    switch (documentType) {
      case 'requerimento':
        fields.requerente = this.extractField(text, /requerente[:\s]*(.*)/i);
        fields.objeto = this.extractField(text, /objeto[:\s]*(.*)/i);
        fields.data = this.extractField(text, /data[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
        break;
      
      case 'contrato':
        fields.contratante = this.extractField(text, /contratante[:\s]*(.*)/i);
        fields.contratado = this.extractField(text, /contratado[:\s]*(.*)/i);
        fields.valor = this.extractField(text, /valor[:\s]*R?\$?\s*([\d.,]+)/i);
        break;
      
      case 'ata':
        fields.reuniao = this.extractField(text, /reuni[aã]o[:\s]*(.*)/i);
        fields.data = this.extractField(text, /data[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
        fields.participantes = this.extractParticipants(text);
        break;
      
      default:
        // Campos genéricos
        fields.data = this.extractField(text, /(\d{2}\/\d{2}\/\d{4})/);
        fields.nome = this.extractField(text, /nome[:\s]*(.*)/i);
        fields.cpf = this.extractField(text, /cpf[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
    }

    return fields;
  }

  private extractField(text: string, regex: RegExp): string | null {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractParticipants(text: string): string[] {
    const participants: string[] = [];
    const lines = text.split('\n');
    
    let inParticipantSection = false;
    for (const line of lines) {
      if (line.toLowerCase().includes('participantes') || line.toLowerCase().includes('presentes')) {
        inParticipantSection = true;
        continue;
      }
      
      if (inParticipantSection && line.trim() && !line.toLowerCase().includes('ausentes')) {
        participants.push(line.trim());
      }
      
      if (line.toLowerCase().includes('ausentes') || line.toLowerCase().includes('pauta')) {
        inParticipantSection = false;
      }
    }
    
    return participants;
  }

  private detectDocumentType(text: string): string {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('requer') || textLower.includes('requerimento')) {
      return 'requerimento';
    }
    if (textLower.includes('contrato') || textLower.includes('acordo')) {
      return 'contrato';
    }
    if (textLower.includes('ata') || textLower.includes('reunião')) {
      return 'ata';
    }
    if (textLower.includes('declaração')) {
      return 'declaracao';
    }
    if (textLower.includes('procuração')) {
      return 'procuracao';
    }
    
    return 'documento';
  }

  async generateDocument(template: string, data: Record<string, any>): Promise<string> {
    let document = template;
    
    // Substituir placeholders pelos dados
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      document = document.replace(placeholder, String(value || ''));
    }
    
    return document;
  }

  validateDocument(text: string, requiredFields: string[]): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!text.toLowerCase().includes(field.toLowerCase())) {
        missingFields.push(field);
      }
    }
    
    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }
}

export const ocrService = new OCRService();
export default OCRService;
