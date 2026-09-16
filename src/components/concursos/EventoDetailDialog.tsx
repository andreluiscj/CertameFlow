import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import type { EventoComConcurso } from '@/types/database';

interface EventoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: EventoComConcurso | null;
  onToggleConcluido: (id: string, concluido: boolean) => void;
  onEdit?: (evento: EventoComConcurso) => void;
  isUpdating?: boolean;
}

export function EventoDetailDialog({
  open, onOpenChange, evento, onToggleConcluido, onEdit, isUpdating = false,
}: EventoDetailDialogProps) {
  if (!evento) return null;
  const concurso = evento.concurso_cadastros;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn('text-xl', evento.concluido && 'line-through text-muted-foreground')}>
            {evento.titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {concurso && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="h-5 w-5 rounded-full flex-shrink-0" style={{ backgroundColor: concurso.cor }} />
              <span className="font-medium">{concurso.concurso_id} - {concurso.cidade}</span>
            </div>
          )}
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">Data</p>
            <p className="text-lg font-medium">
              {format(parseISO(evento.data), 'dd/MM/yyyy')}
              {evento.hora && ` às ${evento.hora.slice(0, 5)}`}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="concluido"
                checked={evento.concluido || false}
                onCheckedChange={() => onToggleConcluido(evento.id, evento.concluido || false)}
                disabled={isUpdating}
              />
              <label htmlFor="concluido" className={cn('cursor-pointer font-medium', evento.concluido && 'text-muted-foreground')}>
                {evento.concluido ? 'Evento concluído' : 'Marcar como concluído'}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {onEdit && (
              <Button variant="outline" onClick={() => { onOpenChange(false); onEdit(evento); }}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
