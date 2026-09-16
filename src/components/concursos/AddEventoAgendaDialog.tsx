import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCreateEvento } from '@/hooks/useEventos';
import { useConcursos } from '@/hooks/useConcursos';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SearchableSelect, SELECIONE } from '@/components/ui/searchable-select';

export function AddEventoAgendaDialog() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [concursoId, setConcursoId] = useState('');
  const [data, setData] = useState<Date>();
  const [hora, setHora] = useState('');

  const { data: concursos = [] } = useConcursos();
  const createEvento = useCreateEvento();

  const selectedConcurso = concursos.find((c) => c.id === concursoId);

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast.error('Informe o título do evento');
      return;
    }
    if (!concursoId) {
      toast.error('Selecione um concurso');
      return;
    }
    if (!data) {
      toast.error('Selecione uma data');
      return;
    }

    try {
      await createEvento.mutateAsync({
        titulo: titulo.trim(),
        concurso_id: concursoId,
        data: format(data, 'yyyy-MM-dd'),
        hora: hora || null,
        cor: selectedConcurso?.cor || '#3B82F6',
      });
      toast.success('Evento adicionado!');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao adicionar evento');
    }
  };

  const resetForm = () => {
    setTitulo('');
    setConcursoId('');
    setData(undefined);
    setHora('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              placeholder="Ex: Publicação do Edital"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Concurso</Label>
            <SearchableSelect
              value={concursoId}
              onValueChange={setConcursoId}
              options={[...concursos]
                .sort((a, b) => (a.concurso_id || '').localeCompare(b.concurso_id || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))
                .map((c) => ({ value: c.id, label: `${c.concurso_id} - ${c.cidade} / ${c.uf}`, color: c.cor, keywords: c.nome }))}
              searchPlaceholder="Pesquisar concurso..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !data && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, 'dd/MM/yyyy') : SELECIONE}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    initialFocus
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora">Hora (opcional)</Label>
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createEvento.isPending}>
            {createEvento.isPending ? 'Salvando...' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
