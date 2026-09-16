import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, FileSpreadsheet } from 'lucide-react';
import { useProvasCadastroResumoFinanceiro } from '@/hooks/useProvasCadastro';
import { useConcursos } from '@/hooks/useConcursos';
import { useElaboradores } from '@/hooks/useElaboradores';
import { cn } from '@/lib/utils';
import { ExportRpaDialog } from '@/components/provas/ExportRpaDialog';

const REVISOR_PCT = 0.15;

interface DisciplinaRow {
  id: string;
  prova_id: string;
  disciplina: string;
}
interface DnRow {
  id: string;
  disciplina_id: string;
  nivel_id: string | null;
  qtd: number;
  contabilizar: boolean;
  provas_niveis: { descricao: string; valor_questao: number } | null;
}

interface LinhaResumo {
  nivelId: string;
  nivelDescricao: string;
  valorQuestao: number;
  disciplina: string;
  qtd: number;
  valorCheio: number;
  valorTotal: number; // Valor Bruto = Líquido / 0,86 (2 casas)
}

const BRUTO_DIVISOR = 0.86;
const round2 = (v: number) => Math.round(v * 100) / 100;
const toBruto = (liquido: number) => round2(liquido / BRUTO_DIVISOR);

const fmtMoney = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ResumoQuestoesConcursoPage() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const navigate = useNavigate();
  const { data: concursos } = useConcursos();
  const concurso = concursos?.find((c) => c.id === concursoId);
  const { data: elaboradores = [] } = useElaboradores();
  const revisorId = concursoId ? localStorage.getItem(`revisor:${concursoId}`) : null;
  const revisor = revisorId
    ? elaboradores.find((e) => e.id === revisorId) ?? null
    : null;
  const [rpaOpen, setRpaOpen] = useState(false);

  const { data: provasFull = [] } = useProvasCadastroResumoFinanceiro(concursoId);

  const { disciplinas, dnRows } = useMemo(() => {
    const discs: DisciplinaRow[] = [];
    const dns: DnRow[] = [];
    for (const prova of provasFull) {
      for (const disc of prova.provas_disciplinas ?? []) {
        discs.push({ id: disc.id, prova_id: disc.prova_id, disciplina: disc.disciplina });
        for (const dn of disc.provas_disciplina_niveis ?? []) {
          dns.push({ ...dn, disciplina_id: disc.id });
        }
      }
    }
    return { disciplinas: discs, dnRows: dns };
  }, [provasFull]);

  const { grupos, totais } = useMemo(() => {
    // Agrupar por nivel_id + nome da disciplina (consolidando entre cadernos)
    const map = new Map<string, LinhaResumo>();
    const discById = new Map(disciplinas.map((d) => [d.id, d]));

    for (const dn of dnRows) {
      if (!dn.contabilizar) continue;
      if (!dn.nivel_id || !dn.provas_niveis) continue;
      const disc = discById.get(dn.disciplina_id);
      if (!disc) continue;

      const key = `${dn.nivel_id}|${disc.disciplina.trim().toLowerCase()}`;
      const existing = map.get(key);
      const valorQ = Number(dn.provas_niveis.valor_questao) || 0;
      const qtd = Number(dn.qtd) || 0;

      if (existing) {
        existing.qtd += qtd;
        existing.valorCheio = existing.qtd * existing.valorQuestao;
        existing.valorTotal = toBruto(existing.valorCheio);
      } else {
        const valorCheio = qtd * valorQ;
        map.set(key, {
          nivelId: dn.nivel_id,
          nivelDescricao: dn.provas_niveis.descricao,
          valorQuestao: valorQ,
          disciplina: disc.disciplina,
          qtd,
          valorCheio,
          valorTotal: toBruto(valorCheio),
        });
      }
    }

    // Agrupar por nivel
    const porNivel = new Map<
      string,
      { nivelDescricao: string; valorQuestao: number; linhas: LinhaResumo[] }
    >();
    for (const linha of map.values()) {
      const g = porNivel.get(linha.nivelId);
      if (g) g.linhas.push(linha);
      else
        porNivel.set(linha.nivelId, {
          nivelDescricao: linha.nivelDescricao,
          valorQuestao: linha.valorQuestao,
          linhas: [linha],
        });
    }

    const grupos = Array.from(porNivel.entries())
      .map(([nivelId, g]) => ({
        nivelId,
        ...g,
        linhas: g.linhas.sort((a, b) => a.disciplina.localeCompare(b.disciplina)),
        subQtd: g.linhas.reduce((s, l) => s + l.qtd, 0),
        subCheio: g.linhas.reduce((s, l) => s + l.valorCheio, 0),
        subTotal: g.linhas.reduce((s, l) => s + l.valorTotal, 0),
      }))
      .sort((a, b) => a.nivelDescricao.localeCompare(b.nivelDescricao));

    const totais = grupos.reduce(
      (acc, g) => ({
        qtd: acc.qtd + g.subQtd,
        cheio: acc.cheio + g.subCheio,
        total: acc.total + g.subTotal,
      }),
      { qtd: 0, cheio: 0, total: 0 }
    );

    return { grupos, totais };
  }, [dnRows, disciplinas]);

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/provas/pedidos/${concursoId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground truncate flex-1 min-w-0">
            Resumo financeiro
            {concurso && (
              <span className="text-muted-foreground font-normal">
                {' '}
                - {concurso.concurso_id} - {concurso.cidade}/{concurso.uf}
              </span>
            )}
          </h1>
          <Button
            onClick={() => setRpaOpen(true)}
            disabled={grupos.length === 0}
            className="gap-2 flex-shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar RPA
          </Button>
        </div>

        {concursoId && (
          <ExportRpaDialog
            open={rpaOpen}
            onOpenChange={setRpaOpen}
            concursoId={concursoId}
            codProjeto={concurso?.cod_projeto ?? null}
          />
        )}

        {grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">
              Nenhuma disciplina marcada como “Contabilizar” foi encontrada.
            </p>
            <p className="mt-1 text-xs">
              Marque a coluna <strong>Contabilizar</strong> nas provas para incluí-las no resumo.
            </p>
          </div>
        ) : (
          <>
            {(() => {
              const revCheio = revisor ? totais.cheio * REVISOR_PCT : 0;
              const revBruto = revisor ? toBruto(revCheio) : 0;
              const grandCheio = totais.cheio + revCheio;
              const grandTotal = totais.total + revBruto;
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ResumoCard label="Total de questões" value={String(totais.qtd)} />
                    <ResumoCard label="Valor líquido (com revisor)" value={fmtMoney(grandCheio)} />
                    <ResumoCard
                      label="Valor bruto (com revisor)"
                      value={fmtMoney(grandTotal)}
                      highlight
                    />
                  </div>

                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/60 text-foreground">
                            <Th>Nível</Th>
                            <Th>Disciplina</Th>
                            <Th className="w-24 text-right">Valor/Q</Th>
                            <Th className="w-20 text-center">Qtd</Th>
                            <Th className="w-36 text-right">VALOR LÍQUIDO</Th>
                            <Th className="w-36 text-right">VALOR BRUTO</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupos.map((g) => (
                            <GrupoNivel key={g.nivelId} grupo={g} />
                          ))}
                          <tr className="border-t-2 border-primary/30 bg-primary/5 font-semibold">
                            <Td colSpan={3} className="text-right">
                              Total de Questões
                            </Td>
                            <Td className="text-center font-mono">{totais.qtd}</Td>
                            <Td className="text-right font-mono">{fmtMoney(totais.cheio)}</Td>
                            <Td className="text-right font-mono">{fmtMoney(totais.total)}</Td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/40 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Revisor (15% sobre o valor total)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-muted/60 text-foreground">
                            <Th>Revisor</Th>
                            <Th className="w-20 text-center">%</Th>
                            <Th className="w-36 text-right">VALOR LÍQUIDO</Th>
                            <Th className="w-36 text-right">VALOR BRUTO</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {revisor ? (
                            <tr className="border-t hover:bg-muted/20">
                              <Td>
                                <span className="font-medium">{revisor.codigo}</span> - {revisor.nome}
                              </Td>
                              <Td className="text-center font-mono">15%</Td>
                              <Td className="text-right font-mono">{fmtMoney(revCheio)}</Td>
                              <Td className="text-right font-mono">{fmtMoney(revBruto)}</Td>
                            </tr>
                          ) : (
                            <tr className="border-t">
                              <Td colSpan={4} className="text-center text-muted-foreground py-4">
                                Nenhum revisor cadastrado para este concurso.
                              </Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </ProvasLayout>
  );
}

function GrupoNivel({
  grupo,
}: {
  grupo: {
    nivelDescricao: string;
    valorQuestao: number;
    linhas: LinhaResumo[];
    subQtd: number;
    subCheio: number;
    subTotal: number;
  };
}) {
  return (
    <>
      {grupo.linhas.map((l, i) => (
        <tr key={`${grupo.nivelDescricao}-${l.disciplina}`} className="border-t hover:bg-muted/20">
          {i === 0 && (
            <Td
              rowSpan={grupo.linhas.length}
              className="align-middle font-medium bg-muted/20"
            >
              {grupo.nivelDescricao}
            </Td>
          )}
          <Td>{l.disciplina}</Td>
          <Td className="text-right font-mono text-muted-foreground">
            {fmtMoney(l.valorQuestao)}
          </Td>
          <Td className="text-center font-mono">{l.qtd}</Td>
          <Td className="text-right font-mono">{fmtMoney(l.valorCheio)}</Td>
          <Td className="text-right font-mono">{fmtMoney(l.valorTotal)}</Td>
        </tr>
      ))}
      <tr className="border-t bg-muted/30 text-xs font-medium">
        <Td colSpan={3} className="text-right text-muted-foreground">
          Subtotal - {grupo.nivelDescricao}
        </Td>
        <Td className="text-center font-mono">{grupo.subQtd}</Td>
        <Td className="text-right font-mono">{fmtMoney(grupo.subCheio)}</Td>
        <Td className="text-right font-mono">{fmtMoney(grupo.subTotal)}</Td>
      </tr>
    </>
  );
}

function ResumoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4',
        highlight && 'border-primary/40 bg-primary/5'
      )}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 text-2xl font-bold text-foreground',
          highlight && 'text-primary'
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-border',
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      className={cn('px-3 py-2 border-r last:border-r-0', className)}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}
