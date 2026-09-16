import { useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { CircleDot, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useStatusProvas,
  useCreateStatusProva,
  useUpdateStatusProva,
  useDeleteStatusProva,
  type StatusProva,
} from '@/hooks/useStatusProvas';

export default function StatusProvasPage() {
  const { data: statusList = [], isLoading } = useStatusProvas();
  const createStatus = useCreateStatusProva();
  const updateStatus = useUpdateStatusProva();
  const deleteStatus = useDeleteStatusProva();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StatusProva | null>(null);
  const [descricao, setDescricao] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<StatusProva | null>(null);

  const openNew = () => {
    setEditing(null);
    setDescricao('');
    setDialogOpen(true);
  };

  const openEdit = (s: StatusProva) => {
    setEditing(s);
    setDescricao(s.descricao);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const desc = descricao.trim();
    if (!desc) return;
    if (editing) {
      await updateStatus.mutateAsync({ id: editing.id, descricao: desc });
    } else {
      await createStatus.mutateAsync({ descricao: desc });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteStatus.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CircleDot className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Status da Prova</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Status
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Cód</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : statusList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum status cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                statusList.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
                    <TableCell className="font-medium">{s.descricao}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(s)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Status' : 'Novo Status'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !descricao.trim() ||
                createStatus.isPending ||
                updateStatus.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir status?</AlertDialogTitle>
            <AlertDialogDescription>
              O status <strong>{confirmDelete?.descricao}</strong> será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProvasLayout>
  );
}
