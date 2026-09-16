import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingDescricoes: string[];
}

interface ParsedRow {
  descricao: string;
}

export function ImportAreasDialog({ open, onOpenChange, existingDescricoes }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName('');
    setRows([]);
    setDuplicates([]);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    setError('');
    setRows([]);
    setDuplicates([]);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: false,
      });

      const existingSet = new Set(existingDescricoes.map((d) => d.trim().toLowerCase()));
      const seen = new Set<string>();
      const valid: ParsedRow[] = [];
      const dup: string[] = [];

      for (const row of data) {
        const keys = Object.keys(row);
        const descKey =
          keys.find((k) => k.trim().toLowerCase().startsWith('descri')) ?? keys[1];
        if (!descKey) continue;
        const descricao = String(row[descKey] ?? '').trim();
        if (!descricao) continue;
        const lower = descricao.toLowerCase();
        if (existingSet.has(lower) || seen.has(lower)) {
          dup.push(descricao);
          continue;
        }
        seen.add(lower);
        valid.push({ descricao });
      }

      if (valid.length === 0 && dup.length === 0) {
        setError('Nenhuma linha válida encontrada. Verifique se o arquivo possui a coluna DESCRIÇÃO.');
        return;
      }
      setRows(valid);
      setDuplicates(dup);
    } catch (e) {
      setError(`Erro ao ler arquivo: ${(e as Error).message}`);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      await api.post('/api/provas/areas-importacoes', {
        descricoes: rows.map((r) => r.descricao),
      });
      toast.success(`${rows.length} ${rows.length === 1 ? 'área importada' : 'áreas importadas'}`);
      qc.invalidateQueries({ queryKey: ['provas-areas-atuacao'] });
      handleClose(false);
    } catch (e) {
      toast.error(`Erro ao importar: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Áreas</DialogTitle>
          <DialogDescription>
            Selecione um arquivo Excel (.xlsx) com cabeçalho na 1ª linha e colunas: <strong>CÓD</strong> | <strong>DESCRIÇÃO</strong>. O código será gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition hover:border-primary hover:bg-primary/5"
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName || 'Clique para selecionar um arquivo .xlsx'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {(rows.length > 0 || duplicates.length > 0) && (
            <div className="space-y-2">
              {rows.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{rows.length}</strong> {rows.length === 1 ? 'área pronta' : 'áreas prontas'} para importar
                  </span>
                </div>
              )}
              {duplicates.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {duplicates.length} {duplicates.length === 1 ? 'duplicada será ignorada' : 'duplicadas serão ignoradas'}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                    {duplicates.slice(0, 5).join(', ')}
                    {duplicates.length > 5 && ` e mais ${duplicates.length - 5}...`}
                  </p>
                </div>
              )}
              {rows.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  <ul className="space-y-1 text-xs">
                    {rows.slice(0, 50).map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                        {r.descricao}
                      </li>
                    ))}
                    {rows.length > 50 && (
                      <li className="text-muted-foreground italic">+ {rows.length - 50} restantes...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {importing ? 'Importando...' : `Importar ${rows.length || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
