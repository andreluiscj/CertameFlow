import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useConcursos } from '@/hooks/useConcursos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
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
  useCargosProvas,
  useCreateCargoProva,
  useUpdateCargoProva,
  useDeleteCargoProva,
  type CargoProva,
} from '@/hooks/useCargosProvas';

export default function CargosProvasConcursoPage() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const navigate = useNavigate();
  const { data: concursos } = useConcursos();
  const { data: allCargos = [], isLoading } = useCargosProvas();
  const createCargo = useCreateCargoProva();
  const updateCargo = useUpdateCargoProva();
  const deleteCargo = useDeleteCargoProva();

  const concurso = concursos?.find((c) => c.id === concursoId);

  const cargos = useMemo(
    () => allCargos.filter((c) => c.concurso_id === concursoId),
    [allCargos, concursoId]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CargoProva | null>(null);
  const [descricao, setDescricao] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<CargoProva | null>(null);

  const openNew = () => {
    setEditing(null);
    setDescricao('');
    setDialogOpen(true);
  };

  const openEdit = (c: CargoProva) => {
    setEditing(c);
    setDescricao(c.descricao);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const desc = descricao.trim();
    if (!desc || !concursoId) return;
    if (editing) {
      await updateCargo.mutateAsync({ id: editing.id, descricao: desc });
    } else {
      await createCargo.mutateAsync({ descricao: desc, concurso_id: concursoId });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteCargo.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/provas/cargos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground truncate">
              Cargos {concurso ? `- ${concurso.concurso_id} - ${concurso.cidade}/${concurso.uf}` : ''}
            </h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cargo
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
              ) : cargos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum cargo cadastrado para este concurso.
                  </TableCell>
                </TableRow>
              ) : (
                cargos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.codigo}</TableCell>
                    <TableCell className="font-medium">{c.descricao}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(c)}
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
            <DialogTitle>{editing ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
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
              disabled={!descricao.trim() || createCargo.isPending || updateCargo.isPending}
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
            <AlertDialogTitle>Excluir cargo?</AlertDialogTitle>
            <AlertDialogDescription>
              O cargo <strong>{confirmDelete?.descricao}</strong> será removido. Esta ação não pode ser desfeita.
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
