import { Layout } from '@/components/layout/Layout';
import { useConcursos } from '@/hooks/useConcursos';
import { useEventos } from '@/hooks/useEventos';
import { StatsCards } from '@/components/estatisticas/StatsCards';
import { TarefasPorConcursoChart } from '@/components/estatisticas/TarefasPorConcursoChart';

import { EvolucaoMensalChart } from '@/components/estatisticas/EvolucaoMensalChart';

import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EstatisticasPage() {
  const { data: concursos = [], isLoading: loadingConcursos } = useConcursos();
  const { data: eventos = [], isLoading: loadingEventos } = useEventos();

  const isLoading = loadingConcursos || loadingEventos;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estatísticas</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[380px] rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            <StatsCards concursos={concursos} eventos={eventos} />
            <TarefasPorConcursoChart concursos={concursos} eventos={eventos} />
            <EvolucaoMensalChart eventos={eventos} />
          </>
        )}
      </div>
    </Layout>
  );
}
