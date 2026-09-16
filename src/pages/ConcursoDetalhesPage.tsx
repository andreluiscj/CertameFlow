import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useConcurso, useDeleteConcurso, useUpdateConcurso } from '@/hooks/useConcursos';
import {
  useEventosByConcurso,
  useDeleteEvento,
  useDeleteEventosByConcurso,
  useSalvarEventosConcluidos,
} from '@/hooks/useEventos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Pencil, Trash2, Upload, Calendar, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ConcursoCsvImportDialog } from '@/components/concursos/ConcursoCsvImportDialog';
import { AddEventoDialog } from '@/components/concursos/AddEventoDialog';
import { EditEventoDialog } from '@/components/concursos/EditEventoDialog';
import type { EventoComConcurso } from '@/types/database';

export default function ConcursoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: concurso, isLoading } = useConcurso(id);
  const { data: eventos = [] } = useEventosByConcurso(id);
  const deleteConcurso = useDeleteConcurso();
  const deleteEvento = useDeleteEvento();
  const deleteEventosByConcurso = useDeleteEventosByConcurso();
  const salvarEventosConcluidos = useSalvarEventosConcluidos();
  const updateConcurso = useUpdateConcurso();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const [showAddEvento, setShowAddEvento] = useState(false);
  const [deleteEventoId, setDeleteEventoId] = useState<string | null>(null);
  const [editEvento, setEditEvento] = useState<EventoComConcurso | null>(null);
  
  // Estado local das mudanças pendentes nos checkboxes (eventoId -> novo valor de concluido)
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());
  const [isSaving, setIsSaving] = useState(false);

  const hasPendingChanges = pendingChanges.size > 0;

  const handleDeleteConcurso = async () => {
    if (!id) return;
    try {
      await deleteConcurso.mutateAsync(id);
      toast.success('Concurso excluído com sucesso!');
      navigate('/concursos');
    } catch (error) {
      toast.error('Erro ao excluir concurso');
    }
  };

  const handleDeleteAllEventos = async () => {
    if (!id) return;
    try {
      await deleteEventosByConcurso.mutateAsync(id);
      toast.success('Todas as tarefas foram excluídas!');
    } catch (error) {
      toast.error('Erro ao excluir tarefas');
    }
    setShowDeleteAllDialog(false);
  };

  const handleToggleEvento = (eventoId: string, currentConcluido: boolean) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const originalValue = eventos.find((e) => e.id === eventoId)?.concluido;
      const newValue = !currentConcluido;
      // Se voltar ao valor original, remove da lista de pendências
      if (newValue === originalValue) {
        next.delete(eventoId);
      } else {
        next.set(eventoId, newValue);
      }
      return next;
    });
  };

  const handleToggleAll = (checked: boolean) => {
    setPendingChanges(() => {
      const next = new Map<string, boolean>();
      for (const evento of eventos) {
        if (evento.concluido !== checked) {
          next.set(evento.id, checked);
        }
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) return;
    setIsSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(([eventoId, concluido]) => ({
        id: eventoId,
        concluido,
      }));
      await salvarEventosConcluidos.mutateAsync(updates);

      // Verifica se o concurso deve ser finalizado automaticamente
      if (id) {
        const allEvents = eventos.map((e) => ({
          ...e,
          concluido: pendingChanges.has(e.id) ? pendingChanges.get(e.id)! : e.concluido,
        }));
        const allDone = allEvents.length > 0 && allEvents.every((e) => e.concluido);
        if (allDone) {
          await updateConcurso.mutateAsync({ id, status: 'Finalizado', cor: 'hsl(0, 0%, 0%)' });
          toast.success(`Concurso "${concurso?.nome ?? ''}" finalizado automaticamente! Todas as tarefas foram concluídas.`);
        }
      }

      setPendingChanges(new Map());
      toast.success('Alterações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    }
    setIsSaving(false);
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
  };

  const handleDeleteEvento = async () => {
    if (!deleteEventoId) return;
    try {
      await deleteEvento.mutateAsync(deleteEventoId);
      toast.success('Evento excluído!');
    } catch (error) {
      toast.error('Erro ao excluir evento');
    }
    setDeleteEventoId(null);
  };

  // Obtém o estado atual de concluido, considerando as mudanças pendentes
  const getEffectiveConcluido = (eventoId: string, original: boolean) => {
    return pendingChanges.has(eventoId) ? pendingChanges.get(eventoId)! : original;
  };

  const sortedEventos = [...eventos].sort((a, b) => 
    new Date(a.data).getTime() - new Date(b.data).getTime()
  );
  
  const todasConcluidas = eventos.length > 0 && eventos.every(e => getEffectiveConcluido(e.id, e.concluido));

  if (isLoading) {
    return (
      <Layout>
        <p className="text-muted-foreground">Carregando...</p>
      </Layout>
    );
  }

  if (!concurso) {
    return (
      <Layout>
        <p className="text-muted-foreground">Concurso não encontrado</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/concursos">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: concurso.cor }}
              />
              <div>
                <h1 className="text-2xl font-bold">{concurso.nome}</h1>
                <p className="text-muted-foreground">
                  {concurso.cidade} - {concurso.uf} | {concurso.tipo} | ID: {concurso.concurso_id}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/concursos/${id}/editar`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tarefas do Concurso</h2>
            <Badge variant="secondary">{eventos.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCsvDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setShowAddEvento(true)}>
              Adicionar Tarefa
            </Button>
          </div>
        </div>

        {/* Events Table */}
        {sortedEventos.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma tarefa cadastrada</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Importe um arquivo CSV ou adicione tarefas manualmente.
            </p>
            <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setShowCsvDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={() => setShowAddEvento(true)}>
              Adicionar Tarefa
            </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={todasConcluidas}
                      onCheckedChange={(checked) => handleToggleAll(!!checked)}
                      disabled={eventos.length === 0}
                    />
                  </TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead className="w-40">Data</TableHead>
                  <TableHead className="w-24">Hora</TableHead>
                  <TableHead className="w-28 text-right">
                    <div className="flex items-center justify-end gap-1">
                      Ações
                      {eventos.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setShowDeleteAllDialog(true)}
                          title="Excluir todas as tarefas"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEventos.map((evento) => (
                  <TableRow key={evento.id}>
                    <TableCell>
                      <Checkbox
                        checked={getEffectiveConcluido(evento.id, evento.concluido)}
                        onCheckedChange={() =>
                          handleToggleEvento(evento.id, getEffectiveConcluido(evento.id, evento.concluido))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-medium',
                          getEffectiveConcluido(evento.id, evento.concluido) && 'line-through text-muted-foreground'
                        )}
                      >
                        {evento.titulo}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(evento.data), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-center">
                      {evento.hora && !evento.hora.startsWith('00:00') ? evento.hora.slice(0, 5) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditEvento(evento as EventoComConcurso)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteEventoId(evento.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Save Bar */}
        {hasPendingChanges && (
          <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-lg border bg-card p-4 shadow-lg">
            <span className="text-sm text-muted-foreground mr-auto">
              {pendingChanges.size} alteração(ões) pendente(s)
            </span>
            <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
              Descartar
            </Button>
            <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Concurso Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os eventos vinculados
              serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConcurso}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tarefa Dialog */}
      <AlertDialog open={!!deleteEventoId} onOpenChange={() => setDeleteEventoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvento}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Tarefas Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as tarefas</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as {eventos.length} tarefas deste concurso serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllEventos}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <ConcursoCsvImportDialog
        open={showCsvDialog}
        onOpenChange={setShowCsvDialog}
        concursoId={id!}
        concursoCor={concurso.cor}
      />

      {/* Add Evento Dialog */}
      <AddEventoDialog
        open={showAddEvento}
        onOpenChange={setShowAddEvento}
        concursoId={id!}
        concursoCor={concurso.cor}
      />

      {/* Edit Evento Dialog */}
      <EditEventoDialog
        open={!!editEvento}
        onOpenChange={(open) => !open && setEditEvento(null)}
        evento={editEvento}
      />
    </Layout>
  );
}
