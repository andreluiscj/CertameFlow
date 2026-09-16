import { useMemo } from 'react';
import { Trophy, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Concurso, EventoComConcurso } from '@/types/database';
import { useStatusConcurso } from '@/hooks/useOpcoes';
import { isEventoPausado } from '@/lib/utils';

interface StatsCardsProps {
  concursos: Concurso[];
  eventos: EventoComConcurso[];
}

export function StatsCards({ concursos, eventos }: StatsCardsProps) {
  const { data: statusList = [] } = useStatusConcurso();

  const stats = useMemo(() => {
    // Considera "ativo" qualquer status que não seja o último da ordem (normalmente "Finalizado")
    const finalizedStatus = statusList.length > 0 ? statusList[statusList.length - 1].nome : 'Finalizado';
    const ativos = concursos.filter(c => c.status !== finalizedStatus).length;
    const pendentes = eventos.filter(e => !e.concluido).length;
    const hoje = new Date().toISOString().split('T')[0];
    // Tarefas de concursos pausados nunca contam como atrasadas
    const atrasadas = eventos.filter(e => !e.concluido && e.data < hoje && !isEventoPausado(e)).length;
    const total = eventos.length;
    const concluidas = eventos.filter(e => e.concluido).length;
    const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return [
      { label: 'Concursos Ativos', value: ativos, icon: Trophy, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Tarefas Pendentes', value: pendentes, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'Tarefas Atrasadas', value: atrasadas, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
      { label: 'Taxa de Conclusão', value: `${taxa}%`, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];
  }, [concursos, eventos, statusList]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg} flex-shrink-0`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
