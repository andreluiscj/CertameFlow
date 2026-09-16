import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Concurso, EventoComConcurso } from '@/types/database';
import { useStatusConcurso } from '@/hooks/useOpcoes';

interface Props {
  concursos: Concurso[];
  eventos: EventoComConcurso[];
}

const chartConfig = {
  concluidas: { label: 'Concluídas', color: 'hsl(220, 70%, 28%)' },
  pendentes: { label: 'Pendentes', color: 'hsl(220, 55%, 50%)' },
  total: { label: 'Total', color: 'hsl(220, 70%, 38%)' },
} satisfies ChartConfig;

export function TarefasPorConcursoChart({ concursos, eventos }: Props) {
  const { data: statusList = [] } = useStatusConcurso();
  const finalizedStatus = statusList.length > 0 ? statusList[statusList.length - 1].nome : 'Finalizado';

  const data = useMemo(() => {
    return concursos
      .filter(c => c.status !== finalizedStatus)
      .map(c => {
        const evts = eventos.filter(e => e.concurso_id === c.id);
        return {
          nome: `${c.concurso_id} - ${c.cidade}`,
          numId: Number(c.concurso_id),
          concluidas: evts.filter(e => e.concluido).length,
          pendentes: evts.filter(e => !e.concluido).length,
          total: evts.length,
        };
      })
      .filter(d => d.total > 0 && d.pendentes > 0)
      .sort((a, b) => {
        const diff = (b.concluidas + b.pendentes) - (a.concluidas + a.pendentes);
        if (diff !== 0) return diff;
        return a.numId - b.numId;
      });
  }, [concursos, eventos, finalizedStatus]);

  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Tarefas por Concursos Vigente</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Nenhum dado disponível
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tarefas por Concursos Vigente</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis type="number" allowDecimals={false} className="fill-muted-foreground" />
            <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={120} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const config = chartConfig[name as keyof typeof chartConfig];
                    return (
                      <div className="flex items-center justify-between gap-8">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: config?.color }} />
                          <span className="text-muted-foreground">{config?.label}</span>
                        </div>
                        <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
                      </div>
                    );
                  }}
                  labelFormatter={(label, items) => {
                    if (!items?.[0]) return label;
                    const total = items[0].payload?.total;
                    return (
                      <div>
                        <div className="font-medium">{label}</div>
                        {total !== undefined && (
                          <div className="text-muted-foreground mt-1 pt-1 border-t border-border/50 flex justify-between gap-8">
                            <span>Total</span>
                            <span className="font-mono font-medium tabular-nums text-foreground">{total}</span>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="concluidas" stackId="a" fill="var(--color-concluidas)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pendentes" stackId="a" fill="var(--color-pendentes)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
