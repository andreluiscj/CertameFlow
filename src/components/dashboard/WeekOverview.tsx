import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, addWeeks, format, isToday, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventoComConcurso } from '@/types/database';
import { cn, isEventoPausado } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayEventsDialog } from '@/components/concursos/DayEventsDialog';
import { EventoDetailDialog } from '@/components/concursos/EventoDetailDialog';
import { useMarcarEventoConcluido, useDeleteEvento } from '@/hooks/useEventos';
import { toast } from 'sonner';

interface WeekOverviewProps {
  eventos: EventoComConcurso[];
}

export function WeekOverview({ eventos }: WeekOverviewProps) {
  const hoje = new Date();
  const marcarConcluido = useMarcarEventoConcluido();
  const deleteEvento = useDeleteEvento();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoComConcurso | null>(null);
  const [eventoDialogOpen, setEventoDialogOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const inicioSemana = addWeeks(startOfWeek(hoje, { weekStartsOn: 1 }), weekOffset);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const dia = addDays(inicioSemana, i);
    const pendentes = eventos.filter(
      e => !e.concluido && isSameDay(parseISO(e.data), dia)
    ).length;
    return { date: dia, pendentes };
  });

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayDialogOpen(true);
  };

  const handleEventoClick = (evento: EventoComConcurso) => {
    setSelectedEvento(evento);
    setDayDialogOpen(false);
    setEventoDialogOpen(true);
  };

  const handleToggleConcluido = async (id: string, currentConcluido: boolean) => {
    try {
      await marcarConcluido.mutateAsync({ id, concluido: !currentConcluido });
      if (selectedEvento && selectedEvento.id === id) {
        setSelectedEvento({ ...selectedEvento, concluido: !currentConcluido });
      }
      toast.success(currentConcluido ? 'Evento reaberto!' : 'Evento concluído!');
    } catch {
      toast.error('Erro ao atualizar evento');
    }
  };

  const handleDelete = (id: string) => {
    deleteEvento.mutate(id);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Semana Atual - <span className="text-muted-foreground font-normal capitalize">{format(inicioSemana, 'MMMM', { locale: ptBR })}</span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setWeekOffset(0)}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dias.map(({ date, pendentes }) => {
              const ehHoje = isToday(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "flex flex-col items-center rounded-lg border p-2 transition-colors hover:bg-accent",
                    ehHoje && "border-primary bg-primary/5"
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(date, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={cn(
                    "text-lg font-bold",
                    ehHoje && "text-primary"
                  )}>
                    {format(date, 'd')}
                  </span>
                  {pendentes > 0 && (
                    <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground whitespace-nowrap">
                      {pendentes} {pendentes === 1 ? 'Tarefa' : 'Tarefas'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DayEventsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDate}
        eventos={eventos}
        onEventoClick={handleEventoClick}
        onToggleConcluido={handleToggleConcluido}
        onDelete={handleDelete}
        isUpdating={marcarConcluido.isPending}
      />

      {selectedEvento && (
        <EventoDetailDialog
          open={eventoDialogOpen}
          onOpenChange={setEventoDialogOpen}
          evento={selectedEvento}
          onToggleConcluido={handleToggleConcluido}
        />
      )}
    </>
  );
}
