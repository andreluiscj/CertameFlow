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
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { downloadXlsx, type ExportRow } from '@/lib/xlsx-export';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  concursoId: string;
}

interface ParsedRow {
  cargo: string;
  nivelDescricao: string;
  prova: number;
  tipo: string;
  disciplina: string;
  questoes: number;
  totalQuestoes: number;
}

const NIVEL_ALIAS: Record<string, string> = {
  'medio': 'Ensino Médio',
  'médio': 'Ensino Médio',
  'ensino medio': 'Ensino Médio',
  'ensino médio': 'Ensino Médio',
  'tecnico': 'Nível Técnico',
  'técnico': 'Nível Técnico',
  'nivel tecnico': 'Nível Técnico',
  'nível técnico': 'Nível Técnico',
  'superior': 'Ensino Superior',
  'ensino superior': 'Ensino Superior',
  'fundamental incompleto': 'Fundamental Incompleto',
  'fundamental completo': 'Fundamental Completo',
  'alfabetizado': 'Alfabetizado',
};

function normalizeNivel(s: string): string {
  return NIVEL_ALIAS[s.trim().toLowerCase()] ?? s.trim();
}

function findKey(keys: string[], ...candidates: string[]) {
  return keys.find((k) =>
    candidates.some((c) => k.trim().toLowerCase() === c.toLowerCase())
  );
}

export function ImportProvasDialog({ open, onOpenChange, concursoId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [missingNiveis, setMissingNiveis] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName('');
    setRows([]);
    setError('');
    setMissingNiveis([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    setError('');
    setRows([]);
    setMissingNiveis([]);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: true,
      });
      if (data.length === 0) {
        setError('Planilha vazia.');
        return;
      }

      const keys = Object.keys(data[0]);
      const kCargo = findKey(keys, 'cargo');
      const kNivel = findKey(keys, 'nível', 'nivel');
      const kProva = findKey(keys, 'prova');
      const kTipo = findKey(keys, 'tipo');
      const kDisc = findKey(keys, 'disciplina');
      const kQ = findKey(keys, 'questões', 'questoes');
      const kTotal = findKey(keys, 'total questões prova', 'total questoes prova', 'total');

      if (!kCargo || !kNivel || !kProva || !kDisc || !kQ) {
        setError(
          'Colunas obrigatórias não encontradas. Esperado: CARGO | NÍVEL | PROVA | TIPO | DISCIPLINA | QUESTÕES | TOTAL QUESTÕES PROVA.'
        );
        return;
      }

      const parsed: ParsedRow[] = [];
      for (const row of data) {
        const cargo = String(row[kCargo] ?? '').trim();
        const nivelRaw = String(row[kNivel] ?? '').trim();
        const provaRaw = row[kProva];
        const disciplina = String(row[kDisc] ?? '').trim();
        const qRaw = row[kQ];
        const tipo = kTipo ? String(row[kTipo] ?? '').trim() : '';
        const totalRaw = kTotal ? row[kTotal] : 0;
        if (!cargo || !nivelRaw || !disciplina) continue;
        const provaNum = Number(provaRaw);
        const questoes = Number(qRaw);
        const total = Number(totalRaw);
        if (!Number.isFinite(provaNum) || !Number.isFinite(questoes)) continue;
        parsed.push({
          cargo,
          nivelDescricao: normalizeNivel(nivelRaw),
          prova: provaNum,
          tipo,
          disciplina,
          questoes,
          totalQuestoes: Number.isFinite(total) ? total : 0,
        });
      }

      if (parsed.length === 0) {
        setError('Nenhuma linha válida encontrada.');
        return;
      }

      const niveisUnicos = Array.from(new Set(parsed.map((p) => p.nivelDescricao)));
      const niveisDb = await api.get<{ descricao: string }[]>('/api/provas/niveis');
      const dbSet = new Set(niveisDb.map((n) => n.descricao));
      const missing = niveisUnicos.filter((n) => !dbSet.has(n));
      setMissingNiveis(missing);
      setRows(parsed);
    } catch (e) {
      setError(`Erro ao ler arquivo: ${(e as Error).message}`);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0 || missingNiveis.length > 0) return;
    setImporting(true);
    try {
      // A API substitui as provas do concurso numa única transação: se algo
      // falhar, as provas que já existiam continuam como estavam.
      const resultado = await api.post<{ provas: number; cargos: number; disciplinas: number }>(
        `/api/provas/concursos/${concursoId}/importacoes`,
        {
          linhas: rows.map((r) => ({
            cargo: r.cargo,
            nivel: r.nivelDescricao,
            prova: r.prova,
            tipo: r.tipo,
            disciplina: r.disciplina,
            questoes: r.questoes,
            total_questoes: r.totalQuestoes,
          })),
        },
      );

      toast.success(
        `Importação concluída: ${resultado.provas} provas, ${resultado.cargos} cargos, ${resultado.disciplinas} disciplinas`
      );
      await qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey?.[0];
          return (
            typeof k === 'string' &&
            (k.startsWith('provas-') || k === 'provas-cadastro-full')
          );
        },
      });
      handleClose(false);
    } catch (e) {
      console.error('Erro ao importar provas:', e);
      const err = e as { message?: string; details?: string; hint?: string; code?: string };
      const msg = [err.message, err.details, err.hint, err.code].filter(Boolean).join(' · ');
      toast.error(`Erro ao importar: ${msg || 'desconhecido'}`);
    } finally {
      setImporting(false);
    }
  };

  const provasCount = new Set(rows.map((r) => r.prova)).size;
  const cargosCount = new Set(rows.map((r) => `${r.prova}::${r.cargo}`)).size;

  const handleDownloadTemplate = () => {
    const sample: ExportRow[] = [
      {
        'CARGO': 'Agente Administrativo',
        'NÍVEL': 'Ensino Médio',
        'PROVA': 1,
        'TIPO': 'Objetiva',
        'DISCIPLINA': 'Língua Portuguesa',
        'QUESTÕES': 10,
        'TOTAL QUESTÕES PROVA': 40,
      },
      {
        'CARGO': 'Agente Administrativo',
        'NÍVEL': 'Ensino Médio',
        'PROVA': 1,
        'TIPO': 'Objetiva',
        'DISCIPLINA': 'Matemática',
        'QUESTÕES': 10,
        'TOTAL QUESTÕES PROVA': 40,
      },
    ];
    downloadXlsx(
      sample,
      ['CARGO', 'NÍVEL', 'PROVA', 'TIPO', 'DISCIPLINA', 'QUESTÕES', 'TOTAL QUESTÕES PROVA'],
      'modelo_pedidos_questoes.xlsx',
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Provas</DialogTitle>
          <DialogDescription>
            Excel (.xlsx) ou CSV (.csv) com colunas:{' '}
            <strong>CARGO | NÍVEL | PROVA | TIPO | DISCIPLINA | QUESTÕES | TOTAL QUESTÕES PROVA</strong>.
            A importação substitui todas as provas, cargos e disciplinas deste concurso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />
            Baixar modelo de planilha
          </Button>

          <div
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition hover:border-primary hover:bg-primary/5"
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName || 'Clique para selecionar um arquivo .xlsx ou .csv'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
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

          {missingNiveis.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                Níveis não cadastrados em "Níveis de Provas"
              </div>
              <p className="mt-1 text-xs text-destructive/90">{missingNiveis.join(', ')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cadastre estes níveis antes de importar.
              </p>
            </div>
          )}

          {rows.length > 0 && missingNiveis.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>
                  <strong>{provasCount}</strong> {provasCount === 1 ? 'prova' : 'provas'},{' '}
                  <strong>{cargosCount}</strong> {cargosCount === 1 ? 'cargo' : 'cargos'},{' '}
                  <strong>{rows.length}</strong> linhas
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                <ul className="space-y-1 text-xs">
                  {rows.slice(0, 80).map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <FileSpreadsheet className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 break-words whitespace-normal leading-snug">
                        P{r.prova} · {r.cargo} · {r.nivelDescricao} · {r.disciplina} ({r.questoes})
                      </span>
                    </li>
                  ))}
                  {rows.length > 80 && (
                    <li className="text-muted-foreground italic">+ {rows.length - 80} linhas...</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={rows.length === 0 || missingNiveis.length > 0 || importing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
