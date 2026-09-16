import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useEventos, useMarcarEventoConcluido, useDeleteEvento } from '@/hooks/useEventos';
import { useConcursos } from '@/hooks/useConcursos';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Pencil, Search, CheckSquare } from 'lucide-react';
import { cn, isEventoPausado } from '@/lib/utils';
import { toast } from 'sonner';
import { EditEventoDialog } from '@/components/concursos/EditEventoDialog';
import { EventoDetailDialog } from '@/components/concursos/EventoDetailDialog';
import { ConcursoFilterSelect } from '@/components/concursos/ConcursoFilterSelect';
import type { EventoComConcurso } from '@/types/database';
import { SearchableSelect } from '@/components/ui/searchable-select';

type UrgenciaTipo = 'atrasada' | 'urgente' | 'medio' | 'fraco';

const urgenciaConfig = {
  atrasada: { label: 'Atrasadas', sublabel: '', headerClass: 'bg-red-800 text-white' },
  urgente: { label: 'Curto Prazo', sublabel: '(próximos 3 dias)', headerClass: 'bg-destructive text-destructive-foreground' },
  medio: { label: 'Médio Prazo', sublabel: '(próximos 7 dias)', headerClass: 'bg-yellow-500 text-white' },
  fraco: { label: 'Longo Prazo', sublabel: '(próximos 15 dias)', headerClass: 'bg-green-500 text-white' },
};

function calcularUrgencia(data: string, concluido: boolean): UrgenciaTipo | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataEvento = parseISO(data);
  dataEvento.setHours(0, 0, 0, 0);
  const diasRestantes = differenceInDays(dataEvento, hoje);
  if (diasRestantes < 0) return concluido ? null : 'atrasada';
  if (diasRestantes <= 3) return 'urgente';
  if (diasRestantes <= 7) return 'medio';
  if (diasRestantes <= 15) return 'fraco';
  return null;
}

function ordenarEventos(a: EventoComConcurso, b: EventoComConcurso) {
  const dataCompare = a.data.localeCompare(b.data);
  if (dataCompare !== 0) return dataCompare;

  const idA = Number(a.concurso_cadastros?.concurso_id ?? a.concurso_id ?? Infinity);
  const idB = Number(b.concurso_cadastros?.concurso_id ?? b.concurso_id ?? Infinity);
  if (idA !== idB) return idA - idB;

  return a.titulo.localeCompare(b.titulo);
}

export default function TarefasPage() {
  const navigate = useNavigate();
  const { data: eventos = [], isLoading } = useEventos();
  const { data: concursos = [] } = useConcursos();
  const marcarConcluido = useMarcarEventoConcluido();
  const deleteEvento = useDeleteEvento();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConcurso, setFilterConcurso] = useState<string>('all');
  const [filterHoje, setFilterHoje] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [editEvento, setEditEvento] = useState<EventoComConcurso | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailEvento, setDetailEvento] = useState<EventoComConcurso | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const eventosComUrgencia = eventos
    .map(e => {
      const urgencia = calcularUrgencia(e.data, e.concluido);
      // Tarefas de concursos pausados nunca aparecem como atrasadas - mostra com a menor urgência
      const pausado = isEventoPausado(e);
      return { ...e, urgencia: pausado && urgencia === 'atrasada' ? 'fraco' : urgencia };
    })
    .filter(e => e.urgencia !== null);

  const filteredEventos = eventosComUrgencia.filter(e => {
    if (filterStatus === 'concluida' && !e.concluido) return false;
    if (filterStatus === 'pendente' && e.concluido) return false;
    if (filterConcurso !== 'all' && e.concurso_id !== filterConcurso) return false;
    if (searchText && !e.titulo.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (filterHoje) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataEvento = parseISO(e.data);
      dataEvento.setHours(0, 0, 0, 0);
      if (dataEvento.getTime() !== hoje.getTime()) return false;
    }
    return true;
  });

  const eventosPorUrgencia = useMemo(() => ({
    atrasada: filteredEventos.filter(e => e.urgencia === 'atrasada').sort(ordenarEventos),
    urgente: filteredEventos.filter(e => e.urgencia === 'urgente').sort(ordenarEventos),
    medio: filteredEventos.filter(e => e.urgencia === 'medio').sort(ordenarEventos),
    fraco: filteredEventos.filter(e => e.urgencia === 'fraco').sort(ordenarEventos),
  }), [filteredEventos]);

  const handleToggleStatus = async (id: string, currentConcluido: boolean) => {
    try {
      await marcarConcluido.mutateAsync({ id, concluido: !currentConcluido });
    } catch {
      toast.error('Erro ao atualizar evento');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvento.mutateAsync(id);
      toast.success('Evento excluído!');
    } catch {
      toast.error('Erro ao excluir evento');
    }
  };

  const handleEdit = (evento: EventoComConcurso) => {
    setEditEvento(evento);
    setEditOpen(true);
  };

  const handleDetailToggle = async (id: string, concluido: boolean) => {
    try {
      await marcarConcluido.mutateAsync({ id, concluido: !concluido });
      if (detailEvento && detailEvento.id === id) {
        setDetailEvento({ ...detailEvento, concluido: !concluido });
      }
      toast.success(!concluido ? 'Evento concluído!' : 'Evento reaberto!');
    } catch {
      toast.error('Erro ao atualizar evento');
    }
  };

  const renderCard = (evento: typeof filteredEventos[0]) => {
    const concurso = evento.concurso_cadastros;
    const isAtrasada = evento.urgencia === 'atrasada';
    const pausado = isEventoPausado(evento);
    return (
      <Card key={evento.id} className={cn('mb-3', pausado && 'bg-muted/40 border-dashed')}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={evento.concluido || false}
              onCheckedChange={() => {
                if (isAtrasada && !evento.concluido) {
                  setDetailEvento(evento);
                  setDetailOpen(true);
                } else {
                  handleToggleStatus(evento.id, evento.concluido || false);
                }
              }}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              {pausado && (
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  ⏸ Concurso Pausado
                </div>
              )}
              <div className={cn('text-sm font-medium leading-tight', evento.concluido && 'line-through text-muted-foreground', pausado && 'text-muted-foreground')}>
                {evento.titulo}
              </div>
              {concurso && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: concurso.cor }} />
                  <span className="truncate">{concurso.concurso_id} - {concurso.cidade}</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {format(parseISO(evento.data), "dd/MM/yyyy (EEEE)", { locale: ptBR })}{evento.hora && evento.hora !== '00:00' ? ` - ${evento.hora.substring(0, 5)}` : ''}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleEdit(evento)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleDelete(evento.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CheckSquare className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar evento..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 w-48"
            />
          </div>

          <Button variant={filterHoje ? 'default' : 'outline'} size="sm" onClick={() => setFilterHoje(!filterHoje)}>
            Hoje
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate('/concursos/tarefas/semana')}>
            Tarefas da Semana
          </Button>

          <SearchableSelect
            className="w-40"
            value={filterStatus}
            onValueChange={setFilterStatus}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'pendente', label: 'Pendentes' },
              { value: 'concluida', label: 'Concluídas' },
            ]}
          />

          <ConcursoFilterSelect value={filterConcurso} onValueChange={setFilterConcurso} concursos={concursos} />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {/* Overdue section */}
            {eventosPorUrgencia.atrasada.length > 0 && (
              <div className="flex flex-col">
                <div className={cn('rounded-t-lg px-4 py-2 font-semibold', urgenciaConfig.atrasada.headerClass)}>
                  <div className="flex items-center justify-between">
                    <span>⚠ {urgenciaConfig.atrasada.label}</span>
                    <span className="text-xs opacity-80">{eventosPorUrgencia.atrasada.length}</span>
                  </div>
                </div>
                <div className="flex-1 rounded-b-lg border border-t-0 bg-destructive/5 p-3 min-h-[120px]">
                  {eventosPorUrgencia.atrasada.map(renderCard)}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {(['urgente', 'medio', 'fraco'] as UrgenciaTipo[]).map(urgencia => (
                <div key={urgencia} className="flex flex-col">
                  <div className={cn('rounded-t-lg px-4 py-2 font-semibold', urgenciaConfig[urgencia].headerClass)}>
                    <div className="flex items-center justify-between">
                      <span>{urgenciaConfig[urgencia].label} <span className="font-normal opacity-80">{urgenciaConfig[urgencia].sublabel}</span></span>
                      <span className="text-xs opacity-80">{eventosPorUrgencia[urgencia].length}</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-b-lg border border-t-0 bg-muted/30 p-3 min-h-[200px]">
                    {eventosPorUrgencia[urgencia].length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
                    ) : (
                      eventosPorUrgencia[urgencia].map(renderCard)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <EditEventoDialog open={editOpen} onOpenChange={setEditOpen} evento={editEvento} />
      <EventoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        evento={detailEvento}
        onToggleConcluido={handleDetailToggle}
        onEdit={(ev) => { setDetailOpen(false); handleEdit(ev); }}
        isUpdating={marcarConcluido.isPending}
      />
    </Layout>
  );
}
