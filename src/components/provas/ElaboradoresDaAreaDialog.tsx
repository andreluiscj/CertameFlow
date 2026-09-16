import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useElaboradores } from '@/hooks/useElaboradores';
import { useDesvincularElaboradorArea, useVincularElaboradorArea } from '@/hooks/useAreasAtuacao';
import type { AreaAtuacao } from '@/types/database';

interface Props {
  area: AreaAtuacao | null;
  onClose: () => void;
}

/** Gerencia quais elaboradores pertencem a uma área de atuação. */
export function ElaboradoresDaAreaDialog({ area, onClose }: Props) {
  const { data: elaboradores = [], isLoading } = useElaboradores();
  const vincular = useVincularElaboradorArea();
  const desvincular = useDesvincularElaboradorArea();
  const [selecionado, setSelecionado] = useState('');

  const ordenarPorNome = (a: { nome: string }, b: { nome: string }) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

  const { daArea, foraDaArea } = useMemo(() => {
    const pertence = (e: (typeof elaboradores)[number]) => e.areas.some((a) => a.id === area?.id);
    return {
      daArea: elaboradores.filter(pertence).sort(ordenarPorNome),
      foraDaArea: elaboradores.filter((e) => !pertence(e)).sort(ordenarPorNome),
    };
  }, [elaboradores, area]);

  const ocupado = vincular.isPending || desvincular.isPending;

  const adicionar = () => {
    if (!area || !selecionado) return;
    vincular.mutate(
      { areaId: area.id, elaboradorId: selecionado },
      { onSuccess: () => setSelecionado('') },
    );
  };

  return (
    <Dialog
      open={!!area}
      onOpenChange={(aberto) => {
        if (!aberto) {
          setSelecionado('');
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Elaboradores da área
          </DialogTitle>
          <DialogDescription>{area?.descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Adicionar elaborador</label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <SearchableSelect
                value={selecionado}
                onValueChange={setSelecionado}
                options={foraDaArea.map((e) => ({ value: e.id, label: `${e.codigo} - ${e.nome}` }))}
                placeholder={
                  foraDaArea.length === 0 && !isLoading
                    ? 'Todos os elaboradores já estão na área'
                    : undefined
                }
                searchPlaceholder="Pesquisar elaborador..."
                disabled={foraDaArea.length === 0 || ocupado}
              />
            </div>
            <Button onClick={adicionar} disabled={!selecionado || ocupado} title="Adicionar">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Na área ({daArea.length})
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : daArea.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Nenhum elaborador nesta área.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {daArea.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Cód. {e.codigo}
                      {e.email ? ` • ${e.email}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={ocupado}
                    onClick={() => area && desvincular.mutate({ areaId: area.id, elaboradorId: e.id })}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
