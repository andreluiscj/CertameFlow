import { useState, useEffect } from 'react';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { Users, Plus, Pencil, Trash2, UserPlus, X } from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  useContratoClientes,
  useCreateContratoCliente,
  useUpdateContratoCliente,
  useDeleteContratoCliente,
  type ContratoCliente,
} from '@/hooks/useContratoClientes';
import { useContratoClienteTipos } from '@/hooks/useContratoClienteTipos';
import {
  useContratoResponsaveis,
  useReplaceContratoResponsaveis,
} from '@/hooks/useContratoResponsaveis';
import { UFS } from '@/types/database';
import { formatTelefone, maskTelefone } from '@/lib/masks';

interface ResponsavelDraft {
  /** Ausente em responsável novo; presente nos já gravados, para a API atualizar em vez de recriar. */
  id?: string;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
}

const emptyResp = (): ResponsavelDraft => ({ nome: '', cargo: '', email: '', telefone: '' });

export default function ClientesPage() {
  const { data: clientes = [], isLoading } = useContratoClientes();
  const { data: tipos = [] } = useContratoClienteTipos();
  const createCliente = useCreateContratoCliente();
  const updateCliente = useUpdateContratoCliente();
  const deleteCliente = useDeleteContratoCliente();
  const replaceResp = useReplaceContratoResponsaveis();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoCliente | null>(null);
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsaveis, setResponsaveis] = useState<ResponsavelDraft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<ContratoCliente | null>(null);

  const { data: existingResp, isLoading: carregandoResp } = useContratoResponsaveis(editing?.id);
  // Só preenche depois de carregar: salvar com a lista ainda vazia excluiria os responsáveis.
  const aguardandoResp = !!editing && carregandoResp;
  useEffect(() => {
    if (editing && dialogOpen && existingResp) {
      setResponsaveis(
        existingResp.map(r => ({ id: r.id, nome: r.nome, cargo: r.cargo, email: r.email, telefone: formatTelefone(r.telefone) }))
      );
    }
  }, [existingResp, editing, dialogOpen]);

  const reset = () => {
    setCidade('');
    setUf('');
    setTipoId('');
    setDescricao('');
    setResponsaveis([]);
  };

  const openNew = () => {
    setEditing(null);
    reset();
    setDialogOpen(true);
  };

  const openEdit = (c: ContratoCliente) => {
    setEditing(c);
    setCidade(c.cidade);
    setUf(c.uf);
    setTipoId(c.tipo_id);
    setDescricao(c.descricao);
    setResponsaveis([]);
    setDialogOpen(true);
  };

  const updateResp = (idx: number, patch: Partial<ResponsavelDraft>) => {
    setResponsaveis(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addResp = () => setResponsaveis(prev => [...prev, emptyResp()]);
  const removeResp = (idx: number) => setResponsaveis(prev => prev.filter((_, i) => i !== idx));

  const validResp = responsaveis.filter(r => r.nome.trim());
  const canSave = cidade.trim() && uf && tipoId && descricao.trim();

  const handleSave = async () => {
    if (!canSave || aguardandoResp) return;
    const payload = {
      cidade: cidade.trim(),
      uf,
      tipo_id: tipoId,
      descricao: descricao.trim(),
    };
    let clienteId: string;
    if (editing) {
      const updated = await updateCliente.mutateAsync({ id: editing.id, ...payload });
      clienteId = updated.id;
    } else {
      const created = await createCliente.mutateAsync(payload);
      clienteId = created.id;
    }
    await replaceResp.mutateAsync({
      clienteId,
      responsaveis: validResp.map(r => ({
        id: r.id,
        nome: r.nome.trim(),
        cargo: r.cargo.trim(),
        email: r.email.trim(),
        telefone: r.telefone.trim(),
      })),
    });
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteCliente.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const tipoOptions = tipos.map(t => ({ value: t.id, label: t.nome }));
  const ufOptions = UFS.map(u => ({ value: u, label: u }));

  return (
    <ContratosLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead className="w-20">UF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum cliente cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.cidade}</TableCell>
                    <TableCell className="font-mono">{c.uf}</TableCell>
                    <TableCell>{c.contrato_cliente_tipo?.nome ?? '-'}</TableCell>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          {/* Parte 1: Cliente */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do Cliente</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Prefeitura Municipal de Montes Claros"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex.: Montes Claros"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <SearchableSelect
                  id="uf"
                  value={uf}
                  onValueChange={setUf}
                  options={ufOptions}
                  searchPlaceholder="Pesquisar UF..."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tipo">Tipo</Label>
                <SearchableSelect
                  id="tipo"
                  value={tipoId}
                  onValueChange={setTipoId}
                  options={tipoOptions}
                  searchPlaceholder="Pesquisar tipo..."
                />
              </div>
            </div>
          </div>

          {/* Parte 2: Responsáveis */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Responsáveis</h3>
              <Button type="button" size="sm" variant="outline" onClick={addResp}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            {responsaveis.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed py-6 text-center">
                Nenhum responsável adicionado.
              </p>
            ) : (
              <div className="space-y-3">
                {responsaveis.map((r, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Responsável {idx + 1}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeResp(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={r.nome}
                          onChange={(e) => updateResp(idx, { nome: e.target.value })}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cargo</Label>
                        <Input
                          value={r.cargo}
                          onChange={(e) => updateResp(idx, { cargo: e.target.value })}
                          placeholder="Ex.: Gerente Comercial"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">E-mail</Label>
                        <Input
                          type="email"
                          value={r.email}
                          onChange={(e) => updateResp(idx, { email: e.target.value })}
                          placeholder="email@gmail.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={r.telefone}
                          onChange={(e) => updateResp(idx, { telefone: maskTelefone(e.target.value) })}
                          inputMode="tel"
                          placeholder="(38) 99999-9999"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || aguardandoResp || createCliente.isPending || updateCliente.isPending || replaceResp.isPending}
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{confirmDelete?.descricao}</strong> e todos os seus responsáveis serão removidos. Esta ação não pode ser desfeita.
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
    </ContratosLayout>
  );
}
