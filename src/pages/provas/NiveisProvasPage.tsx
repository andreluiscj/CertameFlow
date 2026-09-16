import { useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react';
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
  useNiveisProvas,
  useCreateNivelProva,
  useUpdateNivelProva,
  useDeleteNivelProva,
  type NivelProva,
} from '@/hooks/useNiveisProvas';

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseValor(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function NiveisProvasPage() {
  const { data: niveis = [], isLoading } = useNiveisProvas();
  const createNivel = useCreateNivelProva();
  const updateNivel = useUpdateNivelProva();
  const deleteNivel = useDeleteNivelProva();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NivelProva | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<NivelProva | null>(null);

  const openNew = () => {
    setEditing(null);
    setDescricao('');
    setValor('');
    setDialogOpen(true);
  };

  const openEdit = (n: NivelProva) => {
    setEditing(n);
    setDescricao(n.descricao);
    setValor(n.valor_questao.toFixed(2).replace('.', ','));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const desc = descricao.trim();
    const v = parseValor(valor);
    if (!desc || v <= 0) return;
    if (editing) {
      await updateNivel.mutateAsync({ id: editing.id, descricao: desc, valor_questao: v });
    } else {
      await createNivel.mutateAsync({ descricao: desc, valor_questao: v });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteNivel.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Níveis de Provas</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Nível
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Cód</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-48">Valor da Questão</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : niveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum nível cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                niveis.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-sm">{n.codigo}</TableCell>
                    <TableCell className="font-medium">{n.descricao}</TableCell>
                    <TableCell className="font-mono">{formatBRL(n.valor_questao)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(n)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(n)}
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
            <DialogTitle>{editing ? 'Editar Nível' : 'Novo Nível'}</DialogTitle>
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
            <div className="space-y-2">
              <Label htmlFor="valor">Valor da Questão (R$)</Label>
              <Input
                id="valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
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
                parseValor(valor) <= 0 ||
                createNivel.isPending ||
                updateNivel.isPending
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
            <AlertDialogTitle>Excluir nível?</AlertDialogTitle>
            <AlertDialogDescription>
              O nível <strong>{confirmDelete?.descricao}</strong> será removido. Esta ação não pode ser desfeita.
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
