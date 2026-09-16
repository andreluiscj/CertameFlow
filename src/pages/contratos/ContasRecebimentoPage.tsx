import { useState } from 'react';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { Landmark, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  useContasRecebimento, useCreateContaRecebimento, useUpdateContaRecebimento, useDeleteContaRecebimento,
  type ContaRecebimento,
} from '@/hooks/useContasRecebimento';

export default function ContasRecebimentoPage() {
  const { data: contas = [], isLoading } = useContasRecebimento();
  const create = useCreateContaRecebimento();
  const update = useUpdateContaRecebimento();
  const remove = useDeleteContaRecebimento();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaRecebimento | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ContaRecebimento | null>(null);

  const [banco, setBanco] = useState('');
  const [convenio, setConvenio] = useState('');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');

  const reset = () => { setBanco(''); setConvenio(''); setAgencia(''); setConta(''); };

  const openNew = () => { setEditing(null); reset(); setDialogOpen(true); };
  const openEdit = (c: ContaRecebimento) => {
    setEditing(c);
    setBanco(c.banco); setConvenio(c.convenio); setAgencia(c.agencia); setConta(c.conta);
    setDialogOpen(true);
  };

  const canSave = banco.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const payload = { banco: banco.trim(), convenio: convenio.trim(), agencia: agencia.trim(), conta: conta.trim() };
    if (editing) await update.mutateAsync({ id: editing.id, ...payload });
    else await create.mutateAsync(payload);
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await remove.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ContratosLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Landmark className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Contas de Recebimento</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : contas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta cadastrada.</TableCell></TableRow>
              ) : (
                contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.banco || '-'}</TableCell>
                    <TableCell>{c.convenio || '-'}</TableCell>
                    <TableCell className="font-mono">{c.agencia || '-'}</TableCell>
                    <TableCell className="font-mono">{c.conta || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(c)} title="Excluir"
                          className="text-destructive hover:text-destructive">
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta de Recebimento'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex.: Banco do Brasil" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="convenio">Convênio</Label>
              <Input id="convenio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Ex.: 123456" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} placeholder="Ex.: 1234-5" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="conta">Conta</Label>
              <Input id="conta" value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Ex.: 12345-6" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave || create.isPending || update.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta <strong>{confirmDelete?.banco}</strong> será removida. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContratosLayout>
  );
}
