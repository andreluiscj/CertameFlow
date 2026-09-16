import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateEvento } from '@/hooks/useEventos';
import { CORES_CONCURSO } from '@/types/database';
import type { EventoComConcurso } from '@/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: EventoComConcurso | null;
}

export function EditEventoDialog({ open, onOpenChange, evento }: EditEventoDialogProps) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [cor, setCor] = useState('#3B82F6');
  const updateEvento = useUpdateEvento();

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo);
      setData(evento.data);
      setHora(evento.hora?.slice(0, 5) || '');
      setCor(evento.cor || '#3B82F6');
    }
  }, [evento]);

  if (!evento) return null;

  const handleSave = async () => {
    if (!titulo.trim() || !data) {
      toast.error('Preencha título e data');
      return;
    }
    try {
      await updateEvento.mutateAsync({
        id: evento.id,
        titulo: titulo.trim(),
        data,
        hora: hora || null,
        cor,
      });
      toast.success('Evento atualizado!');
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar evento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {CORES_CONCURSO.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    cor === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setCor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateEvento.isPending}>
              {updateEvento.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
