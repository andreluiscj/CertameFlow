import { useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useEventos, useMarcarEventoConcluido } from '@/hooks/useEventos';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { cn, isEventoPausado } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function TarefasSemanaPage() {
  const navigate = useNavigate();
  const { data: eventos = [] } = useEventos();
  const marcarConcluido = useMarcarEventoConcluido();

  const diasDaSemana = useMemo(() => {
    const hoje = new Date();
    const inicio = startOfWeek(hoje, { weekStartsOn: 1 });
    const fim = endOfWeek(hoje, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fim });
  }, []);

  const eventosPorDia = useMemo(() => {
    return diasDaSemana.map(dia => {
      const diaStr = format(dia, 'yyyy-MM-dd');
      const eventosDoDia = eventos
        .filter(e => e.data === diaStr)
        .sort((a, b) => {
          const idA = Number(a.concurso_cadastros?.concurso_id ?? Infinity);
          const idB = Number(b.concurso_cadastros?.concurso_id ?? Infinity);
          return idA - idB;
        });
      return { dia, eventosDoDia };
    });
  }, [diasDaSemana, eventos]);

  const handleToggle = async (id: string, concluido: boolean) => {
    try {
      await marcarConcluido.mutateAsync({ id, concluido: !concluido });
    } catch {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/concursos/tarefas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas da Semana</h1>
        </div>

        <div className="space-y-4">
          {eventosPorDia.map(({ dia, eventosDoDia }) => {
            const hoje = isToday(dia);

            return (
              <div key={dia.toISOString()} className="flex flex-col">
                <div className={cn(
                  'rounded-t-lg px-4 py-2 font-semibold text-sm flex items-center justify-between',
                  hoje
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}>
                  <span className="capitalize">
                    {format(dia, 'EEEE', { locale: ptBR })}
                  </span>
                  <span className={cn('text-xs', hoje ? 'opacity-80' : 'text-muted-foreground')}>
                    {format(dia, 'dd/MM')}
                  </span>
                </div>

                <div className="rounded-b-lg border border-t-0 bg-muted/30 p-3">
                  {eventosDoDia.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sem tarefas</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {eventosDoDia.map(evento => {
                        const pausado = isEventoPausado(evento);
                        return (
                        <Card key={evento.id} className={cn('shadow-sm', pausado && 'bg-muted/40 border-dashed')}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={evento.concluido || false}
                                onCheckedChange={() => handleToggle(evento.id, evento.concluido || false)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                {pausado && (
                                  <span className="inline-block mb-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                    ⏸ Concurso Pausado
                                  </span>
                                )}
                                <p className={cn(
                                  'text-sm font-medium leading-tight',
                                  pausado && 'text-muted-foreground',
                                  evento.concluido && 'line-through text-muted-foreground'
                                )}>
                                  {evento.titulo}
                                </p>
                                {evento.concurso_cadastros && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <div
                                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: pausado ? 'hsl(0, 0%, 75%)' : evento.concurso_cadastros.cor }}
                                    />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {evento.concurso_cadastros.concurso_id} - {evento.concurso_cadastros.cidade}
                                    </span>
                                  </div>
                                )}
                                {evento.hora && evento.hora !== '00:00' && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {evento.hora.substring(0, 5)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
