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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AreaAtuacao, Elaborador } from '@/types/database';
import { useBancos } from '@/hooks/useBancos';
import { useSexos } from '@/hooks/useSexos';
import { TIPOS_CONTA } from '@/types/database';
import { downloadXlsx, type ExportRow } from '@/lib/xlsx-export';
import { unmask } from '@/lib/masks';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  areas: AreaAtuacao[];
  existingElaboradores: Elaborador[];
}

interface ParsedRow {
  codigo: number;
  nome: string;
  area_id: string | null;
  email: string | null;
  celular: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  pis: string | null;
  sexo_id: string | null;
  banco_id: string | null;
  tipo_conta: string | null;
  agencia: string | null;
  conta: string | null;
}

interface InvalidRow {
  linha: number;
  motivo: string;
}

const findKey = (keys: string[], ...candidates: string[]) => {
  return keys.find((k) => {
    const norm = k.trim().toLowerCase();
    return candidates.some((c) => norm === c || norm.startsWith(c));
  });
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

// Converte data BR (DD/MM/AAAA), ISO (AAAA-MM-DD) ou serial Excel para 'AAAA-MM-DD'.
function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  // Serial Excel (número)
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      const m = String(d.m).padStart(2, '0');
      const day = String(d.d).padStart(2, '0');
      return `${d.y}-${m}-${day}`;
    }
  }
  const s = String(value).trim();
  if (!s) return null;
  // ISO
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // BR
  const br = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export function ImportElaboradoresDialog({
  open,
  onOpenChange,
  areas,
  existingElaboradores,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { data: bancos = [] } = useBancos();
  const { data: sexos = [] } = useSexos();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [invalid, setInvalid] = useState<InvalidRow[]>([]);
  const [duplicateCodes, setDuplicateCodes] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName('');
    setRows([]);
    setInvalid([]);
    setDuplicateCodes([]);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleDownloadTemplate = () => {
    const exemploArea = areas[0]?.descricao ?? 'Língua Portuguesa';
    const exemploBanco = bancos[0]?.numero ?? 1;
    const exemploTipoConta = TIPOS_CONTA[0] ?? 'Corrente';
    const sample: ExportRow[] = [
      {
        'CÓD': 1,
        'NOME': 'João da Silva',
        'ÁREA': exemploArea,
        'EMAIL': 'joao@exemplo.com',
        'CELULAR': '(38) 99999-0000',
        'CPF': '000.000.000-00',
        'DATA DE NASCIMENTO': '01/01/1980',
        'PIS': '000.00000.00/0',
        'SEXO': sexos[0]?.nome ?? 'Masculino',
        'BANCO': exemploBanco,
        'TIPO DE CONTA': exemploTipoConta,
        'AGÊNCIA': '0001',
        'CONTA': '12345-6',
      },
    ];
    downloadXlsx(
      sample,
      [
        'CÓD',
        'NOME',
        'ÁREA',
        'EMAIL',
        'CELULAR',
        'CPF',
        'DATA DE NASCIMENTO',
        'PIS',
        'SEXO',
        'BANCO',
        'TIPO DE CONTA',
        'AGÊNCIA',
        'CONTA',
      ],
      'modelo_elaboradores.xlsx',
    );
  };

  const handleFile = async (file: File) => {
    setError('');
    setRows([]);
    setInvalid([]);
    setDuplicateCodes([]);
    setFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      // XLSX.read auto-detecta CSV e XLSX.
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: true,
      });

      if (data.length === 0) {
        setError('Planilha vazia.');
        return;
      }

      const areaByName = new Map(areas.map((a) => [norm(a.descricao), a.id]));
      const areaByCode = new Map(areas.map((a) => [a.codigo, a.id]));
      const bancoByNumero = new Map(bancos.map((b) => [b.numero, b.id]));
      const tiposContaNorm = new Map(TIPOS_CONTA.map((t) => [norm(t), t]));
      const sexoByNome = new Map(sexos.map((s) => [norm(s.nome), s.id]));
      const existingCodes = new Set(existingElaboradores.map((e) => e.codigo));
      const seenCodes = new Set<number>();

      const valid: ParsedRow[] = [];
      const invalidRows: InvalidRow[] = [];
      const dupCodes: number[] = [];

      const keys = Object.keys(data[0]);
      const codKey = findKey(keys, 'cod', 'codigo', 'código') ?? keys[0];
      const nomeKey = findKey(keys, 'nome') ?? keys[1];
      const areaKey = findKey(keys, 'area', 'área') ?? keys[2];
      const emailKey = findKey(keys, 'email', 'e-mail');
      const celKey = findKey(keys, 'celular', 'cel', 'telefone', 'fone');
      const cpfKey = findKey(keys, 'cpf');
      const dataNascKey = findKey(keys, 'data de nascimento', 'data nascimento', 'nascimento');
      const pisKey = findKey(keys, 'pis', 'pasep', 'pis/pasep');
      const sexoKey = findKey(keys, 'sexo', 'genero', 'gênero');
      const bancoKey = findKey(keys, 'banco');
      const tipoContaKey = findKey(keys, 'tipo de conta', 'tipo conta');
      const agenciaKey = findKey(keys, 'agencia', 'agência', 'ag');
      const contaKey = findKey(keys, 'conta');

      data.forEach((row, idx) => {
        const linha = idx + 2;
        const get = (k: string | undefined) =>
          k ? String(row[k] ?? '').trim() : '';

        const codRaw = get(codKey);
        const nome = get(nomeKey);
        const areaRaw = get(areaKey);
        const email = get(emailKey);
        const celular = get(celKey);
        const cpfRaw = get(cpfKey);
        const dataNascRaw = dataNascKey ? row[dataNascKey] : '';
        const pisRaw = get(pisKey);
        const sexoRaw = get(sexoKey);
        const bancoRaw = get(bancoKey);
        const tipoContaRaw = get(tipoContaKey);
        const agencia = get(agenciaKey);
        const conta = get(contaKey);

        if (!codRaw && !nome && !areaRaw) return;

        const codigo = parseInt(codRaw.replace(/\D/g, ''), 10);
        if (!Number.isFinite(codigo) || codigo <= 0) {
          invalidRows.push({ linha, motivo: `Cód inválido: "${codRaw}"` });
          return;
        }
        if (!nome) {
          invalidRows.push({ linha, motivo: 'Nome vazio' });
          return;
        }
        let area_id: string | undefined;
        if (areaRaw) {
          const asNum = parseInt(areaRaw.replace(/\D/g, ''), 10);
          if (Number.isFinite(asNum) && areaByCode.has(asNum)) {
            area_id = areaByCode.get(asNum);
          } else {
            area_id = areaByName.get(norm(areaRaw));
          }
          if (!area_id) {
            invalidRows.push({ linha, motivo: `Área não encontrada: "${areaRaw}"` });
            return;
          }
        }
        if (existingCodes.has(codigo) || seenCodes.has(codigo)) {
          dupCodes.push(codigo);
          return;
        }

        // Banco: aceita número
        let banco_id: string | null = null;
        if (bancoRaw) {
          const bnum = parseInt(bancoRaw.replace(/\D/g, ''), 10);
          if (Number.isFinite(bnum) && bancoByNumero.has(bnum)) {
            banco_id = bancoByNumero.get(bnum) ?? null;
          }
        }

        // Tipo de conta normalizado
        const tipo_conta = tipoContaRaw ? tiposContaNorm.get(norm(tipoContaRaw)) ?? null : null;

        // Sexo: aceita "Masculino"/"Feminino" (case/acento insensitive)
        const sexo_id = sexoRaw ? sexoByNome.get(norm(sexoRaw)) ?? null : null;

        seenCodes.add(codigo);
        valid.push({
          codigo,
          nome,
          area_id: area_id ?? null,
          email: email || null,
          celular: celular || null,
          cpf: cpfRaw ? unmask(cpfRaw) : null,
          data_nascimento: parseDate(dataNascRaw),
          pis: pisRaw ? unmask(pisRaw) : null,
          sexo_id,
          banco_id,
          tipo_conta,
          agencia: agencia || null,
          conta: conta || null,
        });
      });

      if (valid.length === 0 && invalidRows.length === 0 && dupCodes.length === 0) {
        setError(
          'Nenhuma linha válida encontrada. Verifique as colunas obrigatórias: CÓD | NOME | ÁREA.',
        );
        return;
      }

      setRows(valid);
      setInvalid(invalidRows);
      setDuplicateCodes(dupCodes);
    } catch (e) {
      setError(`Erro ao ler arquivo: ${(e as Error).message}`);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      // A API grava os elaboradores e liga as áreas numa única transação.
      await api.post('/api/provas/elaboradores-importacoes', {
        elaboradores: rows.map((r) => ({
          codigo: r.codigo,
          nome: r.nome,
          area_id: r.area_id,
          email: r.email,
          celular: r.celular,
          cpf: r.cpf,
          data_nascimento: r.data_nascimento,
          pis: r.pis,
          sexo_id: r.sexo_id,
          banco_id: r.banco_id,
          tipo_conta: r.tipo_conta,
          agencia: r.agencia,
          conta: r.conta,
        })),
      });
      toast.success(
        `${rows.length} ${rows.length === 1 ? 'elaborador importado' : 'elaboradores importados'}`,
      );
      qc.invalidateQueries({ queryKey: ['provas-elaboradores'] });
      qc.invalidateQueries({ queryKey: ['provas-elaboradores-count-by-area'] });
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
          <DialogTitle>Importar Elaboradores</DialogTitle>
          <DialogDescription>
            Excel (.xlsx) ou CSV (.csv) com cabeçalho na 1ª linha. Colunas obrigatórias:{' '}
            <strong>CÓD | NOME | ÁREA</strong>. Opcionais: EMAIL, CELULAR, CPF, DATA DE NASCIMENTO,
            PIS, SEXO, BANCO (número), TIPO DE CONTA, AGÊNCIA, CONTA.
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

          {(rows.length > 0 || invalid.length > 0 || duplicateCodes.length > 0) && (
            <div className="space-y-2">
              {rows.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{rows.length}</strong>{' '}
                    {rows.length === 1 ? 'elaborador pronto' : 'elaboradores prontos'} para importar
                  </span>
                </div>
              )}

              {duplicateCodes.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {duplicateCodes.length} código(s) duplicado(s) - serão ignorados
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {duplicateCodes.slice(0, 10).join(', ')}
                    {duplicateCodes.length > 10 && `, +${duplicateCodes.length - 10}`}
                  </p>
                </div>
              )}

              {invalid.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {invalid.length} linha(s) inválida(s) - serão ignoradas
                  </div>
                  <ul className="mt-1 max-h-24 overflow-y-auto text-xs text-muted-foreground">
                    {invalid.slice(0, 10).map((r, i) => (
                      <li key={i}>
                        Linha {r.linha}: {r.motivo}
                      </li>
                    ))}
                    {invalid.length > 10 && <li>+ {invalid.length - 10} restantes...</li>}
                  </ul>
                </div>
              )}

              {rows.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                  <ul className="space-y-1 text-xs">
                    {rows.slice(0, 50).map((r, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{r.codigo}</span>
                        <span>-</span>
                        <span>{r.nome}</span>
                      </li>
                    ))}
                    {rows.length > 50 && (
                      <li className="italic text-muted-foreground">
                        + {rows.length - 50} restantes...
                      </li>
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
