import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useMarcarEventoConcluido } from '@/hooks/useEventos';
import { format, parseISO, isToday } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';
import { cn, isEventoPausado } from '@/lib/utils';
import { CalendarCheck, ListChecks } from 'lucide-react';

interface TodayTasksProps {
  eventos: EventoComConcurso[];
}

export function TodayTasks({ eventos }: TodayTasksProps) {
  const marcarConcluido = useMarcarEventoConcluido();
  const [expanded, setExpanded] = useState(false);

  const tarefasHoje = eventos
    .filter(e => isToday(parseISO(e.data)))
    .sort((a, b) => {
      const idA = a.concurso_cadastros ? Number(a.concurso_cadastros.concurso_id) : Infinity;
      const idB = b.concurso_cadastros ? Number(b.concurso_cadastros.concurso_id) : Infinity;
      return idA - idB;
    });

  const pendentes = tarefasHoje.filter(e => !e.concluido).length;
  const total = tarefasHoje.length;
  const MAX_VISIBLE = 3;
  const visibleTasks = expanded ? tarefasHoje : tarefasHoje.slice(0, MAX_VISIBLE);
  const hasMore = tarefasHoje.length > MAX_VISIBLE;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg leading-normal">Tarefas de Hoje <span className="text-sm text-muted-foreground font-normal">- {format(new Date(), 'dd/MM/yyyy')}</span></CardTitle>
          </div>
          <span className="text-sm text-muted-foreground">
            {pendentes} de {total} pendente{pendentes !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {tarefasHoje.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <CalendarCheck className="h-8 w-8" />
            <p className="text-sm">Nenhuma tarefa para hoje</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map((evento) => {
              const pausado = isEventoPausado(evento);
              return (
              <label
                key={evento.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                  pausado && "bg-muted/40 border-dashed"
                )}
              >
                <Checkbox
                  checked={evento.concluido}
                  onCheckedChange={(checked) => {
                    marcarConcluido.mutate({ id: evento.id, concluido: !!checked });
                  }}
                />
                {evento.concurso_cadastros && (
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: evento.concurso_cadastros.cor }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  {pausado && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      ⏸ Concurso Pausado
                    </p>
                  )}
                  <p className={cn(
                    "font-medium truncate",
                    evento.concluido && "line-through text-muted-foreground",
                    pausado && "text-muted-foreground"
                  )}>
                    {evento.titulo}
                  </p>
                  {evento.concurso_cadastros && (
                    <p className="text-xs text-muted-foreground truncate">
                      {evento.concurso_cadastros.concurso_id} - {evento.concurso_cadastros.cidade}/{evento.concurso_cadastros.uf}
                    </p>
                  )}
                </div>
                {evento.hora && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {evento.hora.slice(0, 5)}
                  </span>
                )}
              </label>
              );
            })}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Ver menos' : `Ver mais (${tarefasHoje.length - MAX_VISIBLE})`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
