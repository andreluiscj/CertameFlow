import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Concurso, EventoComConcurso } from '@/types/database';
import { Trophy } from 'lucide-react';
import { useStatusConcurso } from '@/hooks/useOpcoes';

interface ConcursoProgressProps {
  concursos: Concurso[];
  eventos: EventoComConcurso[];
}

export function ConcursoProgress({ concursos, eventos }: ConcursoProgressProps) {
  const { data: statusList = [] } = useStatusConcurso();
  const finalizedStatus = statusList.length > 0 ? statusList[statusList.length - 1].nome : 'Finalizado';

  const ativos = concursos
    .filter(c => c.status !== finalizedStatus)
    .sort((a, b) => Number(a.concurso_id) - Number(b.concurso_id));

  const resumos = ativos.map(concurso => {
    const eventosConcurso = eventos.filter(e => e.concurso_id === concurso.id);
    const total = eventosConcurso.length;
    const concluidos = eventosConcurso.filter(e => e.concluido).length;
    const proximoPendente = eventosConcurso
      .filter(e => !e.concluido)
      .sort((a, b) => a.data.localeCompare(b.data))[0];

    return { concurso, total, concluidos, proximoPendente };
  }).filter(r => r.total === 0 || r.concluidos < r.total);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Resumo por Concurso</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {resumos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum concurso em andamento</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {resumos.map(({ concurso, total, concluidos, proximoPendente }) => {
              const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
              return (
                <Link
                  key={concurso.id}
                  to={`/concursos/${concurso.id}`}
                  className="rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: concurso.cor }}
                    />
                    <span className="font-semibold text-sm truncate">
                      {concurso.concurso_id} - {concurso.cidade}/{concurso.uf}
                    </span>
                  </div>
                  <Progress value={pct} className="h-4 mb-1" showPercentage />
                  <p className="text-xs text-muted-foreground">
                    {concluidos} de {total} tarefa{total !== 1 ? 's' : ''} concluída{concluidos !== 1 ? 's' : ''}
                  </p>
                  {proximoPendente && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Próximo: {proximoPendente.titulo} - {format(parseISO(proximoPendente.data), "dd/MM", { locale: ptBR })}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
