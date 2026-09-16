import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { UserCog, Plus, Pencil, Trash2, FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useContratosDoResponsavel } from '@/hooks/useContratoCadastroResponsaveis';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


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
import { formatTelefone, maskTelefone } from '@/lib/masks';
import { useContratoClientes } from '@/hooks/useContratoClientes';
import {
  useContratoResponsaveis,
  useCreateContratoResponsavel,
  useUpdateContratoResponsavel,
  useDeleteContratoResponsavel,
  type ContratoResponsavel,
} from '@/hooks/useContratoResponsaveis';

export default function ResponsaveisPage() {
  const { data: clientes = [] } = useContratoClientes();
  const [filterCliente, setFilterCliente] = useState<string>('');
  const { data: responsaveis = [], isLoading } = useContratoResponsaveis(filterCliente || undefined);

  const createR = useCreateContratoResponsavel();
  const updateR = useUpdateContratoResponsavel();
  const deleteR = useDeleteContratoResponsavel();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContratoResponsavel | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ContratoResponsavel | null>(null);
  const [contratosResponsavel, setContratosResponsavel] = useState<ContratoResponsavel | null>(null);


  const clienteOptions = useMemo(
    () => clientes.map(c => ({ value: c.id, label: `${c.descricao} - ${c.cidade}/${c.uf}` })),
    [clientes]
  );
  const filterOptions = useMemo(
    () => [{ value: '', label: 'Todos os clientes' }, ...clienteOptions],
    [clienteOptions]
  );

  const reset = () => {
    setClienteId(filterCliente || '');
    setNome('');
    setCargo('');
    setEmail('');
    setTelefone('');
  };

  const openNew = () => {
    setEditing(null);
    reset();
    setDialogOpen(true);
  };

  const openEdit = (r: ContratoResponsavel) => {
    setEditing(r);
    setClienteId(r.cliente_id);
    setNome(r.nome);
    setCargo(r.cargo);
    setEmail(r.email);
    setTelefone(formatTelefone(r.telefone));
    setDialogOpen(true);
  };

  const canSave = clienteId && nome.trim();

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      cliente_id: clienteId,
      nome: nome.trim(),
      cargo: cargo.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
    };
    if (editing) {
      await updateR.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createR.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteR.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ContratosLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Responsáveis</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Novo Responsável
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-80">
            <SearchableSelect
              value={filterCliente}
              onValueChange={setFilterCliente}
              options={filterOptions}
              searchPlaceholder="Pesquisar cliente..."
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : responsaveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum responsável cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                responsaveis.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.cargo || '-'}</TableCell>
                    <TableCell>{r.email || '-'}</TableCell>
                    <TableCell>{formatTelefone(r.telefone) || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.contrato_clientes?.descricao ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setContratosResponsavel(r)}
                          title="Ver contratos participantes"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(r)}
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
            <DialogTitle>{editing ? 'Editar Responsável' : 'Novo Responsável'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cliente">Cliente</Label>
              <SearchableSelect
                id="cliente"
                value={clienteId}
                onValueChange={setClienteId}
                options={clienteOptions}
                searchPlaceholder="Pesquisar cliente..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Gerente Comercial" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={telefone} onChange={(e) => setTelefone(maskTelefone(e.target.value))} inputMode="tel" placeholder="(38) 99999-9999" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || createR.isPending || updateR.isPending}
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
            <AlertDialogTitle>Excluir responsável?</AlertDialogTitle>
            <AlertDialogDescription>
              O responsável <strong>{confirmDelete?.nome}</strong> será removido. Esta ação não pode ser desfeita.
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
      <ContratosDoResponsavelDialog
        responsavel={contratosResponsavel}
        onClose={() => setContratosResponsavel(null)}
      />
    </ContratosLayout>
  );
}

function ContratosDoResponsavelDialog({
  responsavel,
  onClose,
}: {
  responsavel: ContratoResponsavel | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: vinculos = [], isLoading } = useContratosDoResponsavel(responsavel?.id);

  const fmtDate = (s: string | null | undefined) =>
    s ? format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }) : '-';
  const fmtMoney = (n: number) =>
    Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={!!responsavel} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Contratos participantes
          </DialogTitle>
          {responsavel && (
            <p className="text-sm text-muted-foreground">
              {responsavel.nome}
              {responsavel.cargo && ` - ${responsavel.cargo}`}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : vinculos.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                Este responsável ainda não participa de nenhum contrato.
              </p>
            </div>
          ) : (
            vinculos.map((v) => {
              const c = v.contrato;
              if (!c) return null;
              return (
                <div
                  key={v.contrato_id}
                  className="rounded-lg border p-3 flex items-start justify-between gap-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">
                        {c.cliente?.descricao ?? '-'}
                      </span>
                      {c.status?.descricao && (
                        <Badge variant="secondary">{c.status.descricao}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.cliente?.cidade}/{c.cliente?.uf} • Vigência: {fmtDate(c.data_vigencia)} •{' '}
                      {fmtMoney(Number(c.valor_total ?? 0))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onClose();
                      navigate(`/contratos/lista/${c.id}`);
                    }}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    Abrir
                  </Button>
                </div>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

