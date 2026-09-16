import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  concursoId: string;
  codProjeto: string | null;
}

// Ordem EXATA das colunas conforme planilha modelo
const HEADERS = [
  'Projeto', 'Valor Bruto', 'Data de Vencimento', 'Data da Competência',
  'Nome', 'CPF', 'Nacionalidade', 'Logradouro', 'Número', 'Complemento',
  'Bairro', 'Cidade', 'Estado', 'CEP', 'Telefone', 'Celular', 'Email',
  'Data de Nascimento', 'Sexo', 'PIS', 'Identidade', 'ÓrgãoExped',
  'Raça/Cor', 'Estado Civil', 'Grau de Instrucao', 'Banco',
  'Tipo de Conta', 'Agencia', 'Conta',
];

const BRUTO_DIVISOR = 0.86;
const REVISOR_PCT = 0.15;
const round2 = (v: number) => Math.round(v * 100) / 100;
const toBruto = (liquido: number) => round2(liquido / BRUTO_DIVISOR);

function formatBR(iso: string): string {
  // iso = YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export function ExportRpaDialog({ open, onOpenChange, concursoId, codProjeto }: Props) {
  const [vencimento, setVencimento] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [loading, setLoading] = useState(false);

  const canExport = useMemo(() => !!vencimento && !!competencia, [vencimento, competencia]);

  const handleExport = async () => {
    if (!canExport) return;
    setLoading(true);
    try {
      // Totais do concurso e linhas de elaboração com o valor por questão
      const base = await api.get<{
        total_provas: number;
        total_disciplinas: number;
        niveis: Array<{
          elaborador_id: string | null;
          qtd: number;
          contabilizar: boolean;
          provas_niveis: { valor_questao: number } | null;
        }>;
      }>(`/api/provas/concursos/${concursoId}/rpa`);
      if (base.total_provas === 0) {
        toast.error('Nenhuma prova encontrada para este concurso.');
        setLoading(false);
        return;
      }

      if (base.total_disciplinas === 0) {
        toast.error('Nenhuma disciplina encontrada.');
        setLoading(false);
        return;
      }

      // Agregar por elaborador
      // Acumula LÍQUIDO por elaborador; converte para BRUTO no final.
      const liquidoPorElab = new Map<string, number>();
      for (const dn of base.niveis) {
        if (!dn.contabilizar || !dn.elaborador_id || !dn.provas_niveis) continue;
        const liq = (Number(dn.qtd) || 0) * (Number(dn.provas_niveis.valor_questao) || 0);
        liquidoPorElab.set(dn.elaborador_id, (liquidoPorElab.get(dn.elaborador_id) ?? 0) + liq);
      }

      const totalPorElab = new Map<string, number>();
      for (const [id, liq] of liquidoPorElab) {
        totalPorElab.set(id, toBruto(liq));
      }

      const elabIds = Array.from(totalPorElab.keys());
      if (elabIds.length === 0) {
        toast.error('Nenhum elaborador com disciplinas marcadas para contabilizar.');
        setLoading(false);
        return;
      }

      // Revisor: 15% sobre o valor total LÍQUIDO, convertido para bruto pela mesma fórmula.
      const revisorId =
        (typeof window !== 'undefined' && localStorage.getItem(`revisor:${concursoId}`)) || null;
      const totalLiquidoGeral = Array.from(liquidoPorElab.values()).reduce((s, v) => s + v, 0);
      const valorRevisor = revisorId ? toBruto(totalLiquidoGeral * REVISOR_PCT) : 0;

      const idsParaBuscar = revisorId && !elabIds.includes(revisorId)
        ? [...elabIds, revisorId]
        : elabIds;

      // Buscar elaboradores com banco
      const elabsTyped = await api.get<Array<{
        id: string;
        nome: string;
        cpf: string | null;
        email: string | null;
        celular: string | null;
        data_nascimento: string | null;
        pis: string | null;
        tipo_conta: string | null;
        agencia: string | null;
        conta: string | null;
        provas_bancos: { numero: number } | null;
        provas_elaboradores_sexo: { nome: string } | null;
      }>>(`/api/provas/elaboradores-rpa?ids=${idsParaBuscar.map(encodeURIComponent).join(',')}`);

      const vencBR = formatBR(vencimento);
      const compBR = formatBR(competencia);

      const buildRow = (e: typeof elabsTyped[number], valorBruto: number) => ({
        'Projeto': codProjeto ?? '',
        'Valor Bruto': Number(valorBruto.toFixed(2)),
        'Data de Vencimento': vencBR,
        'Data da Competência': compBR,
        'Nome': e.nome ?? '',
        'CPF': e.cpf ?? '',
        'Nacionalidade': 'Brasileiro',
        'Logradouro': '',
        'Número': '',
        'Complemento': '',
        'Bairro': '',
        'Cidade': 'Montes Claros',
        'Estado': 'MG',
        'CEP': '',
        'Telefone': '',
        'Celular': e.celular ?? '',
        'Email': e.email ?? '',
        'Data de Nascimento': e.data_nascimento ? formatBR(e.data_nascimento) : '',
        'Sexo': e.provas_elaboradores_sexo?.nome ?? '',
        'PIS': e.pis ?? '',
        'Identidade': '',
        'ÓrgãoExped': '',
        'Raça/Cor': '',
        'Estado Civil': '',
        'Grau de Instrucao': '',
        'Banco': e.provas_bancos?.numero ?? '',
        'Tipo de Conta': e.tipo_conta ?? '',
        'Agencia': e.agencia ?? '',
        'Conta': e.conta ?? '',
      });

      const elaboradorRows = elabsTyped
        .filter((e) => totalPorElab.has(e.id))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((e) => buildRow(e, totalPorElab.get(e.id) ?? 0));

      const revisorObj = revisorId ? elabsTyped.find((e) => e.id === revisorId) : null;
      const rows = [...elaboradorRows];
      if (revisorObj && valorRevisor > 0) {
        rows.push(buildRow(revisorObj, valorRevisor));
      }

      const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });

      // Formatar coluna B (Valor Bruto) como moeda BRL
      for (let i = 2; i <= rows.length + 1; i++) {
        const cell = ws[`B${i}`];
        if (cell) cell.z = 'R$ #,##0.00';
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RPAs');
      XLSX.writeFile(wb, `RPA_${codProjeto || 'concurso'}_${vencimento}.xlsx`);

      const msg = revisorObj && valorRevisor > 0
        ? `Exportado: ${elaboradorRows.length} elaborador(es) + 1 revisor.`
        : `Exportado: ${elaboradorRows.length} elaborador(es).`;
      toast.success(msg);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar RPA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Exportar RPA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!codProjeto && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Este concurso não possui <strong>Código do Projeto</strong> cadastrado. A coluna “Projeto” ficará vazia.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="venc">Data de Vencimento</Label>
            <Input
              id="venc"
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  document.getElementById('comp')?.focus();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comp">Data da Competência</Label>
            <Input
              id="comp"
              type="date"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={!canExport || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
