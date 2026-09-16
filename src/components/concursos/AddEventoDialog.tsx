import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateEvento } from '@/hooks/useEventos';
import { toast } from 'sonner';

interface AddEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concursoId: string;
  concursoCor: string;
}

export function AddEventoDialog({
  open,
  onOpenChange,
  concursoId,
  concursoCor,
}: AddEventoDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const createEvento = useCreateEvento();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !data) {
      toast.error('Preencha título e data');
      return;
    }

    try {
      await createEvento.mutateAsync({
        concurso_id: concursoId,
        titulo,
        data,
        hora: hora || null,
        cor: concursoCor,
      });
      toast.success('Evento adicionado!');
      setTitulo('');
      setData('');
      setHora('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao adicionar evento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Inscrições abertas"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createEvento.isPending}>
              {createEvento.isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
