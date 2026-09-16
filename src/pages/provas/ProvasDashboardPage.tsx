import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useConcursos } from '@/hooks/useConcursos';
import { useElaboradores } from '@/hooks/useElaboradores';
import { useEventos } from '@/hooks/useEventos';
import { useAreasAtuacao } from '@/hooks/useAreasAtuacao';
import { useProvasCadastroCountsPorConcurso } from '@/hooks/useProvasCadastro';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Trophy,
  FileText,
  Users,
  CalendarClock,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  Loader2,
  Tags,
} from 'lucide-react';
import { differenceInCalendarDays, format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function isProvaMultiplaEscolha(titulo: string) {
  const t = titulo.toLowerCase();
  return t.includes('aplicação') && t.includes('prova') && t.includes('múltipla escolha');
}

export default function ProvasDashboardPage() {
  const navigate = useNavigate();
  const { data: concursos = [], isLoading: loadingConcursos } = useConcursos();
  const { data: elaboradores = [], isLoading: loadingElab } = useElaboradores();
  const { data: areas = [] } = useAreasAtuacao();
  const { data: eventos = [], isLoading: loadingEventos } = useEventos();

  const { data: provasCount = [], isLoading: loadingProvas } =
    useProvasCadastroCountsPorConcurso();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const proximasProvas = useMemo(() => {
    const items = (eventos ?? [])
      .filter(
        (e) =>
          e.concurso_cadastros &&
          isProvaMultiplaEscolha(e.titulo) &&
          !e.concluido &&
          isAfter(parseISO(e.data), today),
      )
      .sort((a, b) => a.data.localeCompare(b.data));
    // dedup por concurso (1 por concurso, mais próxima)
    const seen = new Set<string>();
    const out: typeof items = [];
    for (const ev of items) {
      const k = ev.concurso_id!;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }
    return out;
  }, [eventos, today]);

  const totalQuestoes = useMemo(() => {
    return provasCount.reduce((s, p) => s + p.total, 0);
  }, [provasCount]);

  const concursosComProvas = useMemo(() => {
    return provasCount
      .map((pc) => {
        const concurso = concursos.find((c) => c.id === pc.concurso_id);
        return concurso ? { concurso, total: pc.total } : null;
      })
      .filter((x): x is { concurso: typeof concursos[number]; total: number } => !!x)
      .sort((a, b) => b.total - a.total);
  }, [provasCount, concursos]);

  const isLoading = loadingConcursos || loadingElab || loadingProvas || loadingEventos;

  const stats = [
    {
      label: 'Concursos com provas',
      value: concursosComProvas.length,
      icon: Trophy,
      color: 'text-primary',
      bg: 'bg-primary/10',
      onClick: () => navigate('/provas/concursos'),
    },
    {
      label: 'Provas cadastradas',
      value: totalQuestoes,
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
      onClick: () => navigate('/provas/pedidos'),
    },
    {
      label: 'Elaboradores',
      value: elaboradores.length,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
      onClick: () => navigate('/provas/elaboradores'),
    },
    {
      label: 'Áreas de atuação',
      value: areas.length,
      icon: Tags,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
      onClick: () => navigate('/provas/areas'),
    },
  ];

  return (
    <ProvasLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  className="group text-left rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="mt-3 text-3xl font-bold text-foreground tabular-nums">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </button>
              ))}
            </div>

            {/* Main grid */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Próximas Provas */}
              <Card className="lg:col-span-2">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4.5 w-4.5 text-primary" />
                      <h2 className="font-semibold text-foreground">Próximas Provas</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/provas/calendario')}
                      className="text-xs"
                    >
                      Ver todas
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>

                  {proximasProvas.length === 0 ? (
                    <EmptyMini
                      icon={CalendarDays}
                      message="Nenhuma prova agendada."
                    />
                  ) : (
                    <ul className="divide-y">
                      {proximasProvas.slice(0, 6).map((ev) => {
                        const dias = differenceInCalendarDays(parseISO(ev.data), today);
                        const c = ev.concurso_cadastros!;
                        return (
                          <li
                            key={ev.id}
                            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded-md transition"
                            onClick={() => navigate(`/provas/pedidos/${c.id}`)}
                          >
                            <div
                              className="h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ backgroundColor: c.cor }}
                            >
                              {format(parseISO(ev.data), 'dd/MM', { locale: ptBR })}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm text-foreground truncate">
                                {c.concurso_id} - {c.cidade}/{c.uf}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {format(parseISO(ev.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                dias <= 7
                                  ? 'border-amber-500/40 text-amber-700 bg-amber-50 dark:bg-amber-500/10'
                                  : 'border-primary/30 text-primary bg-primary/5'
                              }
                            >
                              {dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias}d`}
                            </Badge>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Top concursos com provas */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4.5 w-4.5 text-primary" />
                      <h2 className="font-semibold text-foreground">Caderno de Prova por Concurso</h2>
                    </div>
                  </div>

                  {concursosComProvas.length === 0 ? (
                    <EmptyMini icon={FileText} message="Sem pedidos cadastrados." />
                  ) : (
                    <ul className="space-y-2">
                      {concursosComProvas.slice(0, 6).map(({ concurso, total }) => (
                        <li
                          key={concurso.id}
                          onClick={() => navigate(`/provas/pedidos/${concurso.id}`)}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-2 rounded-md transition"
                        >
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: concurso.cor }}
                          />
                          <span className="text-sm text-foreground truncate flex-1">
                            {concurso.concurso_id} - {concurso.cidade}/{concurso.uf}
                          </span>
                          <Badge variant="secondary" className="tabular-nums">
                            {total}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

          </>
        )}
      </div>
    </ProvasLayout>
  );
}
function EmptyMini({
  icon: Icon,
  message,
}: {
  icon: typeof CalendarDays;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
