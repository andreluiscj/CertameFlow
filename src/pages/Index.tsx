import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TodayTasks } from '@/components/dashboard/TodayTasks';
import { WeekOverview } from '@/components/dashboard/WeekOverview';
import { ConcursoProgress } from '@/components/dashboard/ConcursoProgress';
import { ConcursoFilterSelect } from '@/components/concursos/ConcursoFilterSelect';
import { useConcursos } from '@/hooks/useConcursos';
import { useEventos } from '@/hooks/useEventos';
import { LayoutDashboard } from 'lucide-react';

const Index = () => {
  const { data: concursos = [] } = useConcursos();
  const { data: eventos = [] } = useEventos();
  const [filtro, setFiltro] = useState('all');

  const eventosFiltrados = useMemo(() => {
    if (filtro === 'all') return eventos;
    return eventos.filter(e => e.concurso_id === filtro);
  }, [eventos, filtro]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <ConcursoFilterSelect value={filtro} onValueChange={setFiltro} concursos={concursos} />
        </div>

        <TodayTasks eventos={eventosFiltrados} />
        <WeekOverview eventos={eventosFiltrados} />
        <ConcursoProgress concursos={concursos} eventos={eventosFiltrados} />
      </div>
    </Layout>
  );
};

export default Index;
