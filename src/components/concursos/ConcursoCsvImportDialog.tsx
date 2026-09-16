import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useImportarEventos } from '@/hooks/useEventos';
import { toast } from 'sonner';
import { Upload, FileText } from 'lucide-react';

interface ConcursoCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concursoId: string;
  concursoCor: string;
}

interface CsvRow {
  evento: string;
  dataInicio: string;
  dataFim: string;
}

function parseDate(dateStr: string): { data: string; hora: string | null } {
  if (!dateStr || dateStr.trim() === '') {
    return { data: '', hora: null };
  }
  
  const parts = dateStr.trim().split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || null;
  
  // Converte DD/MM/AAAA para AAAA-MM-DD
  const [day, month, year] = datePart.split('/');
  if (!day || !month || !year) {
    return { data: '', hora: null };
  }

  // Manipulação direta de string para evitar problemas de fuso horário com o objeto Date
  const paddedDay = day.padStart(2, '0');
  const paddedMonth = month.padStart(2, '0');
  const fullYear = year.length === 2 ? `20${year}` : year;

  // Monta a data ISO diretamente, sem usar o objeto Date
  const isoDate = `${fullYear}-${paddedMonth}-${paddedDay}`;
  
  return {
    data: isoDate,
    hora: timePart || null,
  };
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  
  // Pula o cabeçalho
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split(';').map((s) => s.trim());
      const [evento, dataInicio, dataFim] = parts;
      
      return {
        evento: evento || '',
        dataInicio: dataInicio || '',
        dataFim: dataFim || '',
      };
    })
    .filter((row) => row.evento && row.dataInicio);
}

export function ConcursoCsvImportDialog({ 
  open, 
  onOpenChange, 
  concursoId, 
  concursoCor 
}: ConcursoCsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const importarEventos = useImportarEventos();

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Verifica se há caracteres de substituição (problema de codificação)
        if (result.includes('�')) {
          // Tenta ler novamente com codificação ISO-8859-1 (Latin-1)
          const reader2 = new FileReader();
          reader2.onload = (e2) => resolve(e2.target?.result as string);
          reader2.onerror = reject;
          reader2.readAsText(file, 'ISO-8859-1');
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;
      // Tenta UTF-8 primeiro
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (selectedFile) {
      try {
        const text = await readFileAsText(selectedFile);
        const rows = parseCsv(text);
        setPreview(rows.slice(0, 5)); // Mostra as 5 primeiras linhas como prévia
      } catch {
        setPreview([]);
      }
    } else {
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }

    setIsImporting(true);
    try {
      const text = await readFileAsText(file);
      const rows = parseCsv(text);

      if (rows.length === 0) {
        toast.error('Nenhum dado válido no arquivo');
        return;
      }

      // Monta todas as tarefas e envia numa única chamada, para a API gravar
      // de uma vez e registrar quem importou o arquivo.
      let errorCount = 0;
      const eventos: Array<{ titulo: string; data: string; hora: string | null; cor: string }> = [];

      for (const row of rows) {
        const hasDataFim = row.dataFim && row.dataFim.trim() !== '';

        // Interpreta a data de início
        const { data: dataInicio, hora: horaInicio } = parseDate(row.dataInicio);

        if (!dataInicio) {
          errorCount++;
          continue;
        }

        if (hasDataFim) {
          // Se houver data de fim, cria dois eventos separados
          const { data: dataFim, hora: horaFim } = parseDate(row.dataFim);

          eventos.push({ titulo: `Início - ${row.evento}`, data: dataInicio, hora: horaInicio, cor: concursoCor });

          // Cria o evento "Fim - " se a data de fim for válida
          if (dataFim) {
            eventos.push({ titulo: `Fim - ${row.evento}`, data: dataFim, hora: horaFim, cor: concursoCor });
          }
        } else {
          // Evento de data única - sem necessidade de prefixo
          eventos.push({ titulo: row.evento, data: dataInicio, hora: horaInicio, cor: concursoCor });
        }
      }

      let successCount = 0;
      if (eventos.length > 0) {
        const resultado = await importarEventos.mutateAsync({ concursoId, arquivo: file.name, eventos });
        successCount = resultado.importados;
        errorCount += resultado.falhas;
      }

      if (errorCount > 0) {
        toast.warning(`Importado ${successCount} eventos. ${errorCount} falharam.`);
      } else {
        toast.success(`${successCount} eventos importados com sucesso!`);
      }
      
      setFile(null);
      setPreview([]);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao importar arquivo');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Eventos via CSV
          </DialogTitle>
          <DialogDescription>
            Formato esperado: Evento;Data Início;Data Fim
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Arquivo CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Prévia ({preview.length} primeiros registros):</p>
              <div className="space-y-1 text-sm">
                {preview.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{index + 1}.</span>
                    <span className="truncate">{row.evento}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-muted-foreground">{row.dataInicio}</span>
                    {row.dataFim && (
                      <>
                        <span className="text-muted-foreground">até</span>
                        <span className="text-muted-foreground">{row.dataFim}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Formato esperado do CSV:</p>
            <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
{`Evento;Data Início;Data Fim
Publicação do Edital;27/01/2026;
Inscrições;09/04/2026 08:00;11/05/2026 17:00`}
            </pre>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !file}>
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
