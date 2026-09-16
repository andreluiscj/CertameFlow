import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { EditEventoDialog } from '@/components/concursos/EditEventoDialog';
import { useEventos, useMarcarEventoConcluido, useDeleteEvento } from '@/hooks/useEventos';
import { useConcursos } from '@/hooks/useConcursos';
import { useObservacoesDoMes, useAdicionarObservacao, useExcluirObservacao } from '@/hooks/useObservacoes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EventoDetailDialog } from '@/components/concursos/EventoDetailDialog';
import { ConcursoFilterSelect } from '@/components/concursos/ConcursoFilterSelect';
import { AddEventoAgendaDialog } from '@/components/concursos/AddEventoAgendaDialog';
import { DayEventsDialog } from '@/components/concursos/DayEventsDialog';
import { useSearchParams } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  subDays,
  isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Trash2, Search, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, iniciaisDoNome, isEventoPausado, primeiroNome } from '@/lib/utils';
import { toast } from 'sonner';
import type { EventoComConcurso, ObservacaoAgenda } from '@/types/database';

type ViewMode = 'month' | 'week' | 'day';

export default function AgendaPage() {
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEvento, setSelectedEvento] = useState<EventoComConcurso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editEvento, setEditEvento] = useState<EventoComConcurso | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filterConcurso, setFilterConcurso] = useState('all');
  
  const { data: eventos = [] } = useEventos();
  const { data: concursos = [] } = useConcursos();
  const marcarConcluido = useMarcarEventoConcluido();
  const deleteEvento = useDeleteEvento();

  const ano = currentDate.getFullYear();
  const mes = currentDate.getMonth() + 1;
  const { data: observacoes = [] } = useObservacoesDoMes(ano, mes);
  const adicionarObservacao = useAdicionarObservacao();
  const excluirObservacao = useExcluirObservacao();

  // Rascunho do comentário. É por mês: ao trocar de mês, o texto não segue junto.
  const [obsTexto, setObsTexto] = useState('');
  const [obsParaExcluir, setObsParaExcluir] = useState<ObservacaoAgenda | null>(null);
  useEffect(() => {
    setObsTexto('');
  }, [ano, mes]);

  // Lê os parâmetros da URL para abrir uma data específica vinda do dashboard
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      const parsedDate = parseISO(dataParam);
      setCurrentDate(parsedDate);
      setSelectedDate(parsedDate);
      setDayDialogOpen(true);
    }
  }, []);

  // Calcula o intervalo de datas de acordo com o modo de visualização
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return { start: startOfWeek(monthStart, { weekStartsOn: 0 }), end: endOfWeek(monthEnd, { weekStartsOn: 0 }) };
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      return { start: weekStart, end: addDays(weekStart, 6) };
    } else {
      return { start: currentDate, end: currentDate };
    }
  }, [currentDate, viewMode]);

  // Filtra os concursos que têm eventos no intervalo de datas atual
  const concursosComEventos = useMemo(() => {
    const concursoIds = new Set(
      eventos
        .filter((e) => {
          const eventoDate = parseISO(e.data);
          if (!isWithinInterval(eventoDate, { start: dateRange.start, end: dateRange.end })) return false;
          if (filterConcurso !== 'all' && e.concurso_id !== filterConcurso) return false;
          return true;
        })
        .map((e) => e.concurso_id)
        .filter(Boolean)
    );

    return concursos.filter((c) => concursoIds.has(c.id)).sort((a, b) => Number(a.concurso_id) - Number(b.concurso_id));
  }, [eventos, concursos, dateRange, filterConcurso]);

  const handleAdicionarObservacao = async () => {
    const conteudo = obsTexto.trim();
    if (!conteudo) return;
    try {
      await adicionarObservacao.mutateAsync({ ano, mes, conteudo });
      setObsTexto('');
      toast.success('Observação adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar observação');
    }
  };

  const handleExcluirObservacao = async () => {
    if (!obsParaExcluir) return;
    try {
      await excluirObservacao.mutateAsync({ id: obsParaExcluir.id, ano: obsParaExcluir.ano, mes: obsParaExcluir.mes });
      toast.success('Observação excluída!');
    } catch (error) {
      toast.error('Erro ao excluir observação');
    } finally {
      setObsParaExcluir(null);
    }
  };

  const navigatePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const getEventosForDate = (date: Date) => {
    return eventos
      .filter((e) => {
        if (!isSameDay(parseISO(e.data), date)) return false;
        if (searchText && !e.titulo.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (filterConcurso !== 'all' && e.concurso_id !== filterConcurso) return false;
        return true;
      })
      .sort((a, b) => {
        const concA = a.concluido ? 1 : 0;
        const concB = b.concluido ? 1 : 0;
        if (concA !== concB) return concA - concB;
        const idA = Number(a.concurso_cadastros?.concurso_id ?? Infinity);
        const idB = Number(b.concurso_cadastros?.concurso_id ?? Infinity);
        return idA - idB;
      });
  };

  const handleEditEvento = (evento: EventoComConcurso) => {
    setEditEvento(evento);
    setEditOpen(true);
  };

  const handleEventoClick = (evento: EventoComConcurso) => {
    setSelectedEvento(evento);
    setDayDialogOpen(false);
    setDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayDialogOpen(true);
  };

  const handleDeleteEvento = (id: string) => {
    deleteEvento.mutate(id);
  };

  const handleToggleConcluido = async (id: string, currentConcluido: boolean) => {
    try {
      await marcarConcluido.mutateAsync({ id, concluido: !currentConcluido });
      // Atualiza o evento selecionado para refletir a mudança
      if (selectedEvento && selectedEvento.id === id) {
        setSelectedEvento({ ...selectedEvento, concluido: !currentConcluido });
      }
      toast.success(currentConcluido ? 'Evento reaberto!' : 'Evento concluído!');
    } catch (error) {
      toast.error('Erro ao atualizar evento');
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          const dayEventos = getEventosForDate(d);
          const isCurrentMonth = isSameMonth(d, currentDate);
          const isToday = isSameDay(d, new Date());

          return (
            <div
              key={i}
              onClick={() => handleDayClick(d)}
              className={cn(
                'min-h-24 rounded-lg border p-1 cursor-pointer hover:bg-muted/30 transition-colors',
                !isCurrentMonth && 'bg-muted/30 opacity-50',
                isToday && 'border-primary'
              )}
            >
              <div
                className={cn(
                  'text-right text-sm',
                  isToday && 'font-bold text-primary'
                )}
              >
                {format(d, 'd')}
              </div>
              <div className="space-y-1">
                {dayEventos.slice(0, 3).map((evento) => {
                  const pausado = isEventoPausado(evento);
                  return (
                    <div
                      key={evento.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventoClick(evento);
                      }}
                      title={pausado ? 'Concurso Pausado' : undefined}
                      className={cn(
                        'truncate rounded px-1 text-xs cursor-pointer hover:opacity-80 transition-opacity',
                        pausado ? 'text-muted-foreground border border-dashed' : 'text-white',
                        evento.concluido && 'opacity-50 line-through'
                      )}
                      style={{ backgroundColor: pausado ? 'hsl(0, 0%, 90%)' : (evento.concurso_cadastros?.cor || evento.cor || '#3B82F6') }}
                    >
                      {pausado && <span className="font-semibold mr-1">⏸ Concurso Pausado -</span>}
                      {evento.titulo}
                    </div>
                  );
                })}
                {dayEventos.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEventos.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dayEventos = getEventosForDate(d);
          const isToday = isSameDay(d, new Date());

          return (
            <div
              key={d.toISOString()}
              className={cn('min-h-48 rounded-lg border p-2', isToday && 'border-primary')}
            >
              <div className={cn('mb-2 text-center', isToday && 'font-bold text-primary')}>
                <div className="text-sm">{format(d, 'EEE', { locale: ptBR })}</div>
                <div className="text-lg">{format(d, 'd')}</div>
              </div>
              <div className="space-y-1">
                {dayEventos.map((evento) => {
                  const pausado = isEventoPausado(evento);
                  return (
                    <div
                      key={evento.id}
                      onClick={() => handleEventoClick(evento)}
                      title={pausado ? 'Concurso Pausado' : undefined}
                      className={cn(
                        'rounded p-1 text-xs cursor-pointer hover:opacity-80 transition-opacity',
                        pausado ? 'text-muted-foreground border border-dashed' : 'text-white',
                        evento.concluido && 'opacity-50 line-through'
                      )}
                      style={{ backgroundColor: pausado ? 'hsl(0, 0%, 90%)' : (evento.concurso_cadastros?.cor || evento.cor || '#3B82F6') }}
                    >
                      {evento.hora && <span className="font-medium">{evento.hora.slice(0, 5)} </span>}
                      {pausado && <span className="font-semibold mr-1">⏸ Concurso Pausado -</span>}
                      {evento.titulo}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEventos = getEventosForDate(currentDate);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</CardTitle>
        </CardHeader>
        <CardContent>
          {dayEventos.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento neste dia</p>
          ) : (
            <div className="space-y-2">
              {dayEventos.map((evento) => {
                const pausado = isEventoPausado(evento);
                return (
                  <div
                    key={evento.id}
                    onClick={() => handleEventoClick(evento)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                      pausado && 'bg-muted/40 border-dashed'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={evento.concluido}
                        onCheckedChange={() => {
                          handleToggleConcluido(evento.id, evento.concluido || false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: pausado ? 'hsl(0, 0%, 75%)' : (evento.concurso_cadastros?.cor || evento.cor || '#3B82F6') }}
                      />
                      <div>
                        {pausado && (
                          <span className="inline-block mb-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                            ⏸ Concurso Pausado
                          </span>
                        )}
                        <p
                          className={cn(
                            'font-medium',
                            pausado && 'text-muted-foreground',
                            evento.concluido && 'line-through text-muted-foreground'
                          )}
                        >
                          {evento.titulo}
                        </p>
                        {evento.hora && (
                          <p className="text-sm text-muted-foreground">{evento.hora.slice(0, 5)}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEvento.mutate(evento.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-muted-foreground">
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar evento..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 w-48 h-9"
              />
            </div>
            <ConcursoFilterSelect
              value={filterConcurso}
              onValueChange={setFilterConcurso}
              concursos={concursos}
            />
            <AddEventoAgendaDialog />
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2 flex rounded-lg border">
              {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                >
                  {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Legenda</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {concursosComEventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum concurso com eventos neste período</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {concursosComEventos.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.cor }}
                        />
                        <span className="text-sm">
                          {c.concurso_id} - {c.cidade} / {c.uf}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  Observações - {format(currentDate, 'MMM yyyy', { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-2">
                {observacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma observação neste mês.</p>
                ) : (
                  <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {observacoes.map((obs) => (
                      <li key={obs.id} className="flex items-start gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                          title={obs.usuario_nome ?? 'Usuário removido'}
                          aria-hidden="true"
                        >
                          {iniciaisDoNome(obs.usuario_nome)}
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg bg-muted/50 px-3 py-1.5">
                          <p className="whitespace-pre-wrap break-words text-sm">
                            <span className="font-semibold">{primeiroNome(obs.usuario_nome) || 'Usuário'}:</span>{' '}
                            {obs.conteudo}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(obs.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setObsParaExcluir(obs)}
                          aria-label="Excluir observação"
                          title="Excluir observação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicione uma observação para este mês..."
                    value={obsTexto}
                    onChange={(e) => setObsTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAdicionarObservacao();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleAdicionarObservacao}
                    disabled={adicionarObservacao.isPending || !obsTexto.trim()}
                    className="self-stretch"
                  >
                    {adicionarObservacao.isPending ? 'Enviando...' : 'Adicionar'}
                  </Button>
                </div>

                <AlertDialog open={!!obsParaExcluir} onOpenChange={(o) => !o && setObsParaExcluir(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir observação?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A observação será removida permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleExcluirObservacao} disabled={excluirObservacao.isPending}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DayEventsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDate}
        eventos={eventos}
        onEventoClick={handleEventoClick}
        onToggleConcluido={handleToggleConcluido}
        onDelete={handleDeleteEvento}
        onEdit={handleEditEvento}
        isUpdating={marcarConcluido.isPending}
      />

      <EventoDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        evento={selectedEvento}
        onToggleConcluido={handleToggleConcluido}
        onEdit={handleEditEvento}
        isUpdating={marcarConcluido.isPending}
      />

      <EditEventoDialog open={editOpen} onOpenChange={setEditOpen} evento={editEvento} />
    </Layout>
  );
}
