import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProvasEncerramentos } from '@/hooks/useProvasEncerramentos';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useEventos } from '@/hooks/useEventos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardList, FileText, Loader2, CalendarClock, History, ArrowLeft, Calculator, Info } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';
import instrucaoCaminho from '@/assets/instrucao-importacao-1.png';
import instrucaoColunas from '@/assets/instrucao-importacao-2.png';

interface ConcursoProvaCard {
  concursoId: string;
  concursoNumId: string;
  concursoNome: string;
  concursoCidade: string;
  concursoUf: string;
  concursoCor: string;
  dataProva: string;
}

function isProvaMultiplaEscolha(titulo: string) {
  const t = titulo.toLowerCase();
  return t.includes('aplicação') && t.includes('prova') && t.includes('múltipla escolha');
}

function buildCards(eventos: EventoComConcurso[]): ConcursoProvaCard[] {
  const map = new Map<string, ConcursoProvaCard>();
  for (const ev of eventos) {
    if (!ev.concurso_cadastros || !ev.concurso_id) continue;
    if (!isProvaMultiplaEscolha(ev.titulo)) continue;
    if (map.has(ev.concurso_id)) continue;
    map.set(ev.concurso_id, {
      concursoId: ev.concurso_cadastros.id,
      concursoNumId: ev.concurso_cadastros.concurso_id,
      concursoNome: ev.concurso_cadastros.nome,
      concursoCidade: ev.concurso_cadastros.cidade,
      concursoUf: ev.concurso_cadastros.uf,
      concursoCor: ev.concurso_cadastros.cor,
      dataProva: ev.data,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.dataProva.localeCompare(b.dataProva));
}

export default function PedidosQuestoesPage() {
  const { data: eventos, isLoading } = useEventos();
  const navigate = useNavigate();
  const [showAnteriores, setShowAnteriores] = useState(false);
  const [instrucaoOpen, setInstrucaoOpen] = useState(false);

  const hoje = useMemo(() => new Date(), []);
  const allCards = useMemo(() => (eventos ? buildCards(eventos) : []), [eventos]);

  const { data: encerramentos = [] } = useProvasEncerramentos();
  const encerradosSet = useMemo(
    () => new Set(encerramentos.map((e) => e.concurso_id)),
    [encerramentos]
  );

  const proximos = useMemo(
    () => allCards.filter((c) => !encerradosSet.has(c.concursoId)),
    [allCards, encerradosSet]
  );
  const anteriores = useMemo(
    () =>
      allCards
        .filter((c) => encerradosSet.has(c.concursoId))
        .sort((a, b) => b.dataProva.localeCompare(a.dataProva)),
    [allCards, encerradosSet]
  );

  const cards = showAnteriores ? anteriores : proximos;

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {showAnteriores ? 'Concursos Anteriores' : 'Pedidos de Questões'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setInstrucaoOpen(true)}>
              <Info className="h-4 w-4" />
              Instrução de Importação
            </Button>
            {showAnteriores ? (
              <Button variant="outline" className="gap-2" onClick={() => setShowAnteriores(false)}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            ) : (
              <Button variant="outline" className="gap-2" onClick={() => setShowAnteriores(true)}>
                <History className="h-4 w-4" />
                Concursos Anteriores
                {anteriores.length > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium">
                    {anteriores.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">
              {showAnteriores
                ? 'Nenhum concurso anterior encontrado.'
                : 'Nenhum concurso com prova futura cadastrada.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {cards.map((c) => {
              const dias = differenceInCalendarDays(parseISO(c.dataProva), hoje);
              return (
                <Card
                  key={c.concursoId}
                  className="overflow-hidden transition-shadow hover:shadow-md h-full"
                >
                  <div className="h-2" style={{ backgroundColor: c.concursoCor }} />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.concursoCor }}
                      />
                      <span className="font-semibold text-foreground truncate text-base">
                        {c.concursoNumId} - {c.concursoCidade}/{c.concursoUf}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        <span>Prova: {format(parseISO(c.dataProva), 'dd/MM/yyyy')}</span>
                      </div>
                      {dias >= 0 ? (
                        <p className="text-sm font-medium text-amber-600">
                          {dias === 0
                            ? 'Hoje!'
                            : dias === 1
                            ? 'Faltam 1 dia'
                            : `Faltam ${dias} dias`}
                        </p>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">
                          Realizada há {Math.abs(dias)} {Math.abs(dias) === 1 ? 'dia' : 'dias'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => navigate(`/provas/pedidos/${c.concursoId}`)}
                      >
                        <FileText className="h-4 w-4" />
                        Provas
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => navigate(`/provas/pedidos/${c.concursoId}/resumo`)}
                      >
                        <Calculator className="h-4 w-4" />
                        Resumo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={instrucaoOpen} onOpenChange={setInstrucaoOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instrução de Importação</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Comece escolhendo o concurso que deseja, após isso abaixe até encontrar{' '}
                <strong>"Conferência"</strong> e selecione <strong>"Provas"</strong> após isso é só
                exportar o CSV.
              </p>
              <div className="rounded-lg border bg-muted/30 p-3">
                <img
                  src={instrucaoCaminho}
                  alt="Caminho: Conferência > Provas"
                  className="mx-auto rounded border"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Trate o arquivo deixando as colunas de:
              </p>
              <ul className="list-disc pl-6 text-sm text-foreground space-y-1">
                <li>Cargo</li>
                <li>Nível</li>
                <li>Prova</li>
                <li>Tipo</li>
                <li>Disciplina</li>
                <li>Questões</li>
                <li>Total Questões Prova</li>
              </ul>
              <div className="rounded-lg border bg-muted/30 p-3">
                <img
                  src={instrucaoColunas}
                  alt="Colunas necessárias do CSV"
                  className="mx-auto w-full rounded border"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ProvasLayout>
  );
}
