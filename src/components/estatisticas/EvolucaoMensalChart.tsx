import { useMemo } from 'react';
import { AreaChart, Area, XAxis, CartesianGrid, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventoComConcurso } from '@/types/database';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  eventos: EventoComConcurso[];
}

const chartConfig = {
  concluidas: { label: 'Concluídas', color: 'hsl(220, 70%, 28%)' },
} satisfies ChartConfig;

export function EvolucaoMensalChart({ eventos }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; concluidas: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      const key = format(d, 'yyyy-MM');
      months.push({
        key,
        label: format(d, 'MMM/yy', { locale: ptBR }),
        concluidas: 0,
      });
    }

    eventos.filter(e => e.concluido).forEach(e => {
      const key = e.data.slice(0, 7);
      const month = months.find(m => m.key === key);
      if (month) month.concluidas++;
    });

    return months;
  }, [eventos]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Evolução Mensal de Conclusões</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="gradientConcluidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(220, 70%, 28%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(220, 70%, 28%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="concluidas"
              stroke="hsl(220, 70%, 28%)"
              strokeWidth={2.5}
              fill="url(#gradientConcluidas)"
              dot={{ r: 5, fill: 'hsl(220, 70%, 28%)', stroke: 'hsl(0, 0%, 100%)', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: 'hsl(220, 70%, 28%)', stroke: 'hsl(0, 0%, 100%)', strokeWidth: 2 }}
            >
              <LabelList dataKey="concluidas" position="top" offset={12} className="fill-foreground" fontSize={12} fontWeight={600} />
            </Area>
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
