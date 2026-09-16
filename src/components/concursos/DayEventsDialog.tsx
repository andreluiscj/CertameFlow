import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Pencil } from 'lucide-react';
import { cn, isEventoPausado } from '@/lib/utils';
import type { EventoComConcurso } from '@/types/database';

interface DayEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  eventos: EventoComConcurso[];
  onEventoClick: (evento: EventoComConcurso) => void;
  onToggleConcluido: (id: string, currentConcluido: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (evento: EventoComConcurso) => void;
  isUpdating?: boolean;
}

export function DayEventsDialog({
  open, onOpenChange, date, eventos, onEventoClick, onToggleConcluido, onDelete, onEdit, isUpdating,
}: DayEventsDialogProps) {
  if (!date) return null;
  const dayEventos = eventos
    .filter((e) => isSameDay(parseISO(e.data), date))
    .sort((a, b) => {
      const concA = a.concluido ? 1 : 0;
      const concB = b.concluido ? 1 : 0;
      if (concA !== concB) return concA - concB;
      const idA = Number(a.concurso_cadastros?.concurso_id ?? Infinity);
      const idB = Number(b.concurso_cadastros?.concurso_id ?? Infinity);
      return idA - idB;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>{format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {dayEventos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum evento neste dia</p>
          ) : (
            <div className="space-y-2 pr-4">
              {dayEventos.map((evento) => {
                const pausado = isEventoPausado(evento);
                return (
                <div
                  key={evento.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    pausado && 'bg-muted/40 border-dashed'
                  )}
                  onClick={() => onEventoClick(evento)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={evento.concluido}
                      disabled={isUpdating}
                      onCheckedChange={() => onToggleConcluido(evento.id, evento.concluido || false)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: pausado ? 'hsl(0, 0%, 75%)' : (evento.concurso_cadastros?.cor || evento.cor || '#3B82F6') }} />
                    <div className="flex-1 min-w-0">
                      {pausado && (
                        <span className="inline-block mb-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          ⏸ Concurso Pausado
                        </span>
                      )}
                      <p className={cn('font-medium', pausado && 'text-muted-foreground', evento.concluido && 'line-through text-muted-foreground')}>
                        {evento.titulo}
                      </p>
                      {evento.hora && evento.hora !== '00:00:00' && (
                        <p className="text-sm text-muted-foreground">{evento.hora.slice(0, 5)}</p>
                      )}
                      {evento.concurso_cadastros && (
                        <p className="text-xs text-muted-foreground">{evento.concurso_cadastros.concurso_id} - {evento.concurso_cadastros.cidade}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {onEdit && (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(evento); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(evento.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
