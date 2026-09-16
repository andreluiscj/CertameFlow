import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useEventos } from '@/hooks/useEventos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserPen, CalendarClock, CalendarCheck, CalendarX, Loader2 } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO, isAfter, subDays, setHours } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';

interface PeriodoInscricao {
  concursoId: string;
  concursoNome: string;
  concursoCidade: string;
  concursoUf: string;
  concursoCor: string;
  concursoNumId: string;
  inscricaoInicio: string | null;
  inscricaoFim: string | null;
  isencaoInicio: string | null;
  isencaoFim: string | null;
}

function isEventoInscricao(titulo: string) {
  return titulo.toLowerCase().includes('inscri');
}

function isInicio(titulo: string) {
  return titulo.toLowerCase().startsWith('início') || titulo.toLowerCase().startsWith('inicio');
}

function isFim(titulo: string) {
  return titulo.toLowerCase().startsWith('fim');
}

function isPreInscricao(titulo: string) {
  const t = titulo.toLowerCase();
  return t.includes('pré-inscri') || t.includes('pre-inscri');
}

function isInscricaoPrincipal(titulo: string) {
  const t = titulo.toLowerCase();
  // Deve conter "inscrições"/"inscrição", mas NÃO ser pré-inscrição nem "pagamento da taxa de inscrição"
  if (isPreInscricao(titulo)) return false;
  if (t.includes('pagamento da taxa de inscri')) return false;
  return t.includes('inscri');
}

function buildPeriodos(eventos: EventoComConcurso[]): PeriodoInscricao[] {
  const inscricaoEventos = eventos.filter(
    (e) => e.concurso_cadastros && isEventoInscricao(e.titulo)
  );

  const groups = new Map<string, {
    inscricaoInicio: string | null;
    inscricaoFim: string | null;
    isencaoInicio: string | null;
    isencaoFim: string | null;
    ref: EventoComConcurso;
  }>();

  for (const ev of inscricaoEventos) {
    const key = ev.concurso_id;
    if (!groups.has(key)) {
      groups.set(key, { inscricaoInicio: null, inscricaoFim: null, isencaoInicio: null, isencaoFim: null, ref: ev });
    }
    const g = groups.get(key)!;

    if (isPreInscricao(ev.titulo)) {
      if (isInicio(ev.titulo)) g.isencaoInicio = ev.data;
      else if (isFim(ev.titulo)) g.isencaoFim = ev.data;
    } else if (isInscricaoPrincipal(ev.titulo)) {
      if (isInicio(ev.titulo)) g.inscricaoInicio = ev.data;
      else if (isFim(ev.titulo)) g.inscricaoFim = ev.data;
    }
    // Eventos como "Pagamento da taxa de inscrição (indeferimento da isenção)" são ignorados
  }

  const periodos: PeriodoInscricao[] = [];

  for (const [, { inscricaoInicio, inscricaoFim, isencaoInicio, isencaoFim, ref }] of groups) {
    if (!ref.concurso_cadastros) continue;
    periodos.push({
      concursoId: ref.concurso_cadastros.id,
      concursoNome: ref.concurso_cadastros.nome,
      concursoCidade: ref.concurso_cadastros.cidade,
      concursoUf: ref.concurso_cadastros.uf,
      concursoCor: ref.concurso_cadastros.cor,
      concursoNumId: ref.concurso_cadastros.concurso_id,
      inscricaoInicio,
      inscricaoFim,
      isencaoInicio,
      isencaoFim,
    });
  }

  return periodos;
}

export default function InscricoesPage() {
  const { data: eventos, isLoading } = useEventos();
  const [tab, setTab] = useState('abertas');
  const [mostrarTodasEncerradas, setMostrarTodasEncerradas] = useState(false);

  const agora = useMemo(() => new Date(), []);
  const hoje = agora;

  // Uma data só é considerada "passada" após as 17h do dia
  const isDatePassed = (dateStr: string) => {
    const deadline = setHours(parseISO(dateStr), 17);
    return isAfter(agora, deadline);
  };

  const periodos = useMemo(() => {
    if (!eventos) return [];
    return buildPeriodos(eventos);
  }, [eventos]);

  const abertas = useMemo(
    () =>
    periodos.filter((p) => {
      const isActive = (inicio: string | null, fim: string | null) => {
        if (!inicio) return false;
        const ini = parseISO(inicio);
        if (isAfter(ini, hoje)) return false;
        if (fim && isDatePassed(fim)) return false;
        return true;
      };
      return isActive(p.inscricaoInicio, p.inscricaoFim) || isActive(p.isencaoInicio, p.isencaoFim);
    })
    .sort((a, b) => {
      const aFim = a.inscricaoFim || a.isencaoFim || '9999';
      const bFim = b.inscricaoFim || b.isencaoFim || '9999';
      return aFim.localeCompare(bFim);
    }),
    [periodos, hoje]
  );

  const proximas = useMemo(
    () =>
    periodos
    .filter((p) => {
      // É "próxima" se a data de início ainda não chegou e nada está ativo no momento
      const isActive = (inicio: string | null, fim: string | null) => {
        if (!inicio) return false;
        const ini = parseISO(inicio);
        if (isAfter(ini, hoje)) return false;
        if (fim && isDatePassed(fim)) return false;
        return true;
      };
      const anyActive = isActive(p.inscricaoInicio, p.inscricaoFim) || isActive(p.isencaoInicio, p.isencaoFim);
      if (anyActive) return false;
      const hasFuture = (p.inscricaoInicio && isAfter(parseISO(p.inscricaoInicio), hoje)) ||
        (p.isencaoInicio && isAfter(parseISO(p.isencaoInicio), hoje));
      return !!hasFuture;
    })
    .sort((a, b) => {
      const aStart = a.isencaoInicio || a.inscricaoInicio || '9999';
      const bStart = b.isencaoInicio || b.inscricaoInicio || '9999';
      return aStart.localeCompare(bStart);
    }),
    [periodos, hoje]
  );

  const encerradasRecentemente = useMemo(
    () =>
    periodos
    .filter((p) => {
      // Precisa ter uma data de fim de inscrição
      if (!p.inscricaoFim) return false;
      if (!isDatePassed(p.inscricaoFim)) return false;
      const fimDate = parseISO(p.inscricaoFim);
      // Precisa ter encerrado nos últimos 30 dias
      const limite = subDays(hoje, 30);
      return isAfter(fimDate, limite);
    })
    .sort((a, b) => (b.inscricaoFim || '').localeCompare(a.inscricaoFim || '')),
    [periodos, hoje]
  );

  const encerradasTodas = useMemo(
    () =>
      periodos
        .filter((p) => {
          if (!p.inscricaoFim) return false;
          return isDatePassed(p.inscricaoFim);
        })
        .sort((a, b) => (b.inscricaoFim || '').localeCompare(a.inscricaoFim || '')),
    [periodos, hoje]
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserPen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inscrições</h1>
          </div>
        </div>

        {isLoading ?
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div> :

        <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="inline-flex h-auto flex-wrap justify-start gap-2">
              <TabsTrigger value="abertas" className="gap-2">
                <CalendarCheck className="h-4 w-4" />
                Abertas Agora ({abertas.length})
              </TabsTrigger>
              <TabsTrigger value="proximas" className="gap-2">
                <CalendarClock className="h-4 w-4" />
                Próximas ({proximas.length})
              </TabsTrigger>
              <TabsTrigger value="encerradas" className="gap-2">
                <CalendarX className="h-4 w-4" />
                Encerradas ({encerradasRecentemente.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abertas">
              {abertas.length === 0 ?
            <EmptyState message="Nenhuma inscrição aberta no momento." /> :

            <div className="flex flex-wrap gap-4">
                  {abertas.map((p) =>
              <PeriodoCard key={p.concursoId} periodo={p} hoje={hoje} variant="aberta" />
              )}
                </div>
            }
            </TabsContent>

            <TabsContent value="proximas">
              {proximas.length === 0 ?
            <EmptyState message="Nenhuma inscrição futura encontrada." /> :

            <div className="flex flex-wrap gap-4">
                  {proximas.map((p) =>
              <PeriodoCard key={p.concursoId} periodo={p} hoje={hoje} variant="proxima" />
              )}
                </div>
            }
            </TabsContent>

            <TabsContent value="encerradas">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMostrarTodasEncerradas((prev) => !prev)}
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {mostrarTodasEncerradas ? `Mostrar apenas últimos 30 dias` : `Ver todas (${encerradasTodas.length})`}
                  </button>
                </div>

                {(mostrarTodasEncerradas ? encerradasTodas : encerradasRecentemente).length === 0 ?
              <EmptyState message={mostrarTodasEncerradas ? "Nenhuma inscrição encerrada encontrada." : "Nenhuma inscrição encerrada nos últimos 30 dias."} /> :

              <div className="flex flex-wrap gap-4">
                    {(mostrarTodasEncerradas ? encerradasTodas : encerradasRecentemente).map((p) =>
                <PeriodoCard key={p.concursoId} periodo={p} hoje={hoje} variant="encerrada" />
                )}
                  </div>
              }
              </div>
            </TabsContent>
          </Tabs>
        }
      </div>
    </Layout>);

}

function PeriodoCard({
  periodo,
  hoje,
  variant




}: {periodo: PeriodoInscricao;hoje: Date;variant: 'aberta' | 'proxima' | 'encerrada';}) {
  const diasRestantes = periodo.inscricaoFim ?
  differenceInCalendarDays(parseISO(periodo.inscricaoFim), hoje) :
  null;

  const diasParaAbrirInscricao = periodo.inscricaoInicio ?
  differenceInCalendarDays(parseISO(periodo.inscricaoInicio), hoje) :
  null;

  const isencaoEncerrada = periodo.isencaoFim && isAfter(hoje, setHours(parseISO(periodo.isencaoFim), 17));
  const showIsencao = !!(periodo.isencaoInicio || periodo.isencaoFim);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md w-full sm:w-[320px] lg:w-[340px]">
      <div className="h-1.5" style={{ backgroundColor: periodo.concursoCor }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-3.5 w-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: periodo.concursoCor }} />
            <span className="font-semibold text-foreground truncate">
              {periodo.concursoNumId} - {periodo.concursoCidade}
            </span>
          </div>
          {variant === 'aberta' ?
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/15 flex-shrink-0">
              Aberta
            </Badge> :
          variant === 'encerrada' ?
          <Badge variant="destructive" className="flex-shrink-0">
              Encerrada
            </Badge> :
          <Badge variant="secondary" className="flex-shrink-0">
              Em breve
            </Badge>
          }
        </div>

        <div className="text-sm text-muted-foreground">
          {showIsencao && (
            <div>
              <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap">
                <span className="font-medium text-foreground text-xs uppercase tracking-wide">Isenção</span>
                {periodo.isencaoInicio && (
                  <span>{format(parseISO(periodo.isencaoInicio), 'dd/MM/yyyy')}</span>
                )}
                {periodo.isencaoInicio && periodo.isencaoFim && (
                  <span className="text-muted-foreground/50">→</span>
                )}
                {periodo.isencaoFim && (
                  <span>{format(parseISO(periodo.isencaoFim), 'dd/MM/yyyy')}</span>
                )}
              </div>
              {periodo.isencaoFim && (() => {
                const diasIsencao = differenceInCalendarDays(parseISO(periodo.isencaoFim), hoje);
                const corIsencao = isencaoEncerrada || variant !== 'aberta' ? 'text-muted-foreground' : 'text-amber-600';
                if (isencaoEncerrada) {
                  return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Encerrada há {Math.abs(diasIsencao)} {Math.abs(diasIsencao) === 1 ? 'dia' : 'dias'}</p>;
                }
                // Verifica se a isenção ainda não começou
                const isencaoFutura = periodo.isencaoInicio && isAfter(parseISO(periodo.isencaoInicio), hoje);
                if (isencaoFutura) {
                  const diasParaAbrirIsencao = differenceInCalendarDays(parseISO(periodo.isencaoInicio!), hoje);
                  if (diasParaAbrirIsencao === 1) return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Abre amanhã</p>;
                  return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Abre em {diasParaAbrirIsencao} dias</p>;
                }
                if (diasIsencao === 0) return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Encerra hoje!</p>;
                if (diasIsencao === 1) return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Encerra amanhã</p>;
                if (diasIsencao > 0) return <p className={`text-xs font-medium ${corIsencao} mt-0.5`}>Encerra em {diasIsencao} dias</p>;
                return null;
              })()}
            </div>
          )}
          {(periodo.inscricaoInicio || periodo.inscricaoFim) && (
            <div className={showIsencao ? 'mt-1.5 pt-1.5 border-t border-border/50' : ''}>
              <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap">
                <span className="font-medium text-foreground text-xs uppercase tracking-wide">Inscrição</span>
                {periodo.inscricaoInicio && (
                  <span>{format(parseISO(periodo.inscricaoInicio), 'dd/MM/yyyy')}</span>
                )}
                {periodo.inscricaoInicio && periodo.inscricaoFim && (
                  <span className="text-muted-foreground/50">→</span>
                )}
                {periodo.inscricaoFim && (
                  <span>{format(parseISO(periodo.inscricaoFim), 'dd/MM/yyyy')}</span>
                )}
              </div>
              {variant === 'aberta' && diasRestantes !== null &&
                <p className="text-xs font-medium text-amber-600 mt-0.5">
                  {diasRestantes === 0 ? 'Encerra hoje!' : diasRestantes === 1 ? 'Encerra amanhã' : `Encerra em ${diasRestantes} dias`}
                </p>
              }
              {variant === 'proxima' && diasParaAbrirInscricao !== null &&
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {diasParaAbrirInscricao === 1 ? 'Abre amanhã' : `Abre em ${diasParaAbrirInscricao} dias`}
                </p>
              }
              {variant === 'encerrada' && diasRestantes !== null &&
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Encerrada há {Math.abs(diasRestantes)} {Math.abs(diasRestantes) === 1 ? 'dia' : 'dias'}
                </p>
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>);

}
function EmptyState({ message }: {message: string;}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <UserPen className="h-12 w-12 text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>);
}