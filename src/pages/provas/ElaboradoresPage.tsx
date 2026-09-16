import { useMemo, useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { Users, Plus, Pencil, Trash2, Search, Upload, Download, X, Check } from 'lucide-react';
import { ImportElaboradoresDialog } from '@/components/provas/ImportElaboradoresDialog';
import { downloadXlsx } from '@/lib/xlsx-export';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAreasAtuacao } from '@/hooks/useAreasAtuacao';
import {
  useElaboradores,
  useCreateElaborador,
  useUpdateElaborador,
  useDeleteElaborador,
  type ElaboradorComAreas,
} from '@/hooks/useElaboradores';
import { useBancos } from '@/hooks/useBancos';
import { useSexos } from '@/hooks/useSexos';
import { SearchableSelect, SELECIONE } from '@/components/ui/searchable-select';
import { TIPOS_CONTA } from '@/types/database';
import { cn } from '@/lib/utils';
import { formatCPF, formatTelefone, maskCPF, maskPIS, maskTelefone, unmask } from '@/lib/masks';


type FormState = {
  nome: string;
  area_ids: string[];
  email: string;
  celular: string;
  cpf: string;
  data_nascimento: string;
  pis: string;
  sexo_id: string;
  banco_id: string;
  tipo_conta: string;
  agencia: string;
  conta: string;
};

const emptyForm: FormState = {
  nome: '',
  area_ids: [],
  email: '',
  celular: '',
  cpf: '',
  data_nascimento: '',
  pis: '',
  sexo_id: '',
  banco_id: '',
  tipo_conta: '',
  agencia: '',
  conta: '',
};

export default function ElaboradoresPage() {
  const { data: elaboradores = [], isLoading } = useElaboradores();
  const { data: areas = [] } = useAreasAtuacao();
  const { data: bancos = [] } = useBancos();
  const { data: sexos = [] } = useSexos();
  const createElab = useCreateElaborador();
  const updateElab = useUpdateElaborador();
  const deleteElab = useDeleteElaborador();

  const [search, setSearch] = useState('');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ElaboradorComAreas | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<ElaboradorComAreas | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [areasPopoverOpen, setAreasPopoverOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return elaboradores.filter((e) => {
      if (filtroArea !== 'todas' && !e.areas.some((a) => a.id === filtroArea)) return false;
      if (!q) return true;
      return (
        e.nome.toLowerCase().includes(q) ||
        String(e.codigo).includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.celular ?? '').toLowerCase().includes(q) ||
        e.areas.some((a) => a.descricao.toLowerCase().includes(q))
      );
    });
  }, [elaboradores, search, filtroArea]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (e: ElaboradorComAreas) => {
    setEditing(e);
    setForm({
      nome: e.nome,
      area_ids: e.areas.map((a) => a.id),
      email: e.email ?? '',
      celular: formatTelefone(e.celular),
      cpf: maskCPF(e.cpf ?? ''),
      data_nascimento: e.data_nascimento ?? '',
      pis: maskPIS(e.pis ?? ''),
      sexo_id: e.sexo_id ?? '',
      banco_id: e.banco_id ?? '',
      tipo_conta: e.tipo_conta ?? '',
      agencia: e.agencia ?? '',
      conta: e.conta ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const nome = form.nome.trim();
    if (!nome) return;
    const payload = {
      nome,
      area_ids: form.area_ids,
      email: form.email.trim() || null,
      celular: form.celular.trim() || null,
      cpf: unmask(form.cpf) || null,
      data_nascimento: form.data_nascimento || null,
      pis: form.pis.trim() || null,
      sexo_id: form.sexo_id || null,
      banco_id: form.banco_id || null,
      tipo_conta: form.tipo_conta || null,
      agencia: form.agencia.trim() || null,
      conta: form.conta.trim() || null,
    };
    if (editing) {
      await updateElab.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createElab.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteElab.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const toggleArea = (id: string) => {
    setForm((f) => ({
      ...f,
      area_ids: f.area_ids.includes(id)
        ? f.area_ids.filter((x) => x !== id)
        : [...f.area_ids, id],
    }));
  };

  const selectedAreas = useMemo(
    () => areas.filter((a) => form.area_ids.includes(a.id)),
    [areas, form.area_ids],
  );

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Elaboradores</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={elaboradores.length === 0}
              onClick={() => {
                const bancoById = new Map(bancos.map((b) => [b.id, b]));
                const sexoById = new Map(sexos.map((s) => [s.id, s]));
                const fmtDate = (d: string | null) => {
                  if (!d) return '';
                  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
                  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
                };
                const rows: import('@/lib/xlsx-export').ExportRow[] = elaboradores.map((e) => ({
                  'CÓD': e.codigo,
                  'NOME': e.nome,
                  'ÁREAS': e.areas.map((a) => a.descricao).join(', '),
                  'EMAIL': e.email ?? '',
                  'CELULAR': formatTelefone(e.celular),
                  'CPF': e.cpf ? formatCPF(e.cpf) : '',
                  'DATA DE NASCIMENTO': fmtDate(e.data_nascimento),
                  'PIS': e.pis ? maskPIS(e.pis) : '',
                  'SEXO': e.sexo_id ? sexoById.get(e.sexo_id)?.nome ?? '' : '',
                  'BANCO': e.banco_id ? bancoById.get(e.banco_id)?.numero ?? '' : '',
                  'TIPO DE CONTA': e.tipo_conta ?? '',
                  'AGÊNCIA': e.agencia ?? '',
                  'CONTA': e.conta ?? '',
                }));
                downloadXlsx(
                  rows,
                  [
                    'CÓD',
                    'NOME',
                    'ÁREAS',
                    'EMAIL',
                    'CELULAR',
                    'CPF',
                    'DATA DE NASCIMENTO',
                    'PIS',
                    'SEXO',
                    'BANCO',
                    'TIPO DE CONTA',
                    'AGÊNCIA',
                    'CONTA',
                  ],
                  'elaboradores.xlsx',
                );
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Elaboradores
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button
              onClick={openNew}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Elaborador
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Busque por um Elaborador..."
              aria-label="Buscar elaborador"
            />
          </div>
          <SearchableSelect
            className="sm:w-64"
            value={filtroArea}
            onValueChange={setFiltroArea}
            options={[
              { value: 'todas', label: 'Todas as áreas' },
              ...areas.map((a) => ({ value: a.id, label: a.descricao })),
            ]}
            searchPlaceholder="Pesquisar área..."
          />
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>PIS</TableHead>
                <TableHead>Data de Nascimento</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {elaboradores.length === 0
                      ? 'Nenhum elaborador cadastrado.'
                      : 'Nenhum resultado para o filtro.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => {
                  const dn = e.data_nascimento
                    ? (() => {
                        const m = e.data_nascimento.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        return m ? `${m[3]}/${m[2]}/${m[1]}` : e.data_nascimento;
                      })()
                    : '-';
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-sm">{e.codigo}</TableCell>
                      <TableCell className="font-medium">{e.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.cpf ? formatCPF(e.cpf) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.pis ? maskPIS(e.pis) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dn}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(e)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(e)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Elaborador' : 'Novo Elaborador'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Áreas</Label>
              <Popover open={areasPopoverOpen} onOpenChange={setAreasPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    {selectedAreas.length === 0
                      ? SELECIONE
                      : `${selectedAreas.length} ${selectedAreas.length === 1 ? 'área selecionada' : 'áreas selecionadas'}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={areaSearch}
                        onChange={(e) => setAreaSearch(e.target.value)}
                        className="h-9 pl-8"
                        autoFocus
                        aria-label="Buscar área"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {(() => {
                      const q = areaSearch.trim().toLowerCase();
                      const list = q
                        ? areas.filter(
                            (a) =>
                              a.descricao.toLowerCase().includes(q) ||
                              String(a.codigo).includes(q),
                          )
                        : areas;
                      if (list.length === 0) {
                        return (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Nenhuma área encontrada
                          </div>
                        );
                      }
                      return list.map((a) => {
                        const checked = form.area_ids.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => toggleArea(a.id)}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                              checked && 'bg-accent/50',
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                checked
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-input',
                              )}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <span className="flex-1">{a.descricao}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedAreas.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedAreas.map((a) => (
                    <Badge
                      key={a.id}
                      variant="secondary"
                      className="cursor-pointer gap-1"
                      onClick={() => toggleArea(a.id)}
                    >
                      {a.descricao}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  value={form.celular}
                  onChange={(e) => setForm((f) => ({ ...f, celular: maskTelefone(e.target.value) }))}
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: maskCPF(e.target.value) }))}
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pis">PIS</Label>
                <Input
                  id="pis"
                  value={form.pis}
                  onChange={(e) => setForm((f) => ({ ...f, pis: maskPIS(e.target.value) }))}
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sexo_id">Sexo</Label>
                <SearchableSelect
                  id="sexo_id"
                  value={form.sexo_id || ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, sexo_id: v }))}
                  options={sexos.map((s) => ({ value: s.id, label: s.nome }))}
                  clearValue=""
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Dados Bancários</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="banco_id">Banco</Label>
                  <SearchableSelect
                    id="banco_id"
                    value={form.banco_id || ''}
                    onValueChange={(v) => setForm((f) => ({ ...f, banco_id: v }))}
                    options={bancos.map((b) => ({
                      value: b.id,
                      label: `${b.numero} - ${b.nome}`,
                    }))}
                    clearValue=""
                    searchPlaceholder="Buscar por código ou nome..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                  <SearchableSelect
                    id="tipo_conta"
                    value={form.tipo_conta || ''}
                    onValueChange={(v) => setForm((f) => ({ ...f, tipo_conta: v }))}
                    options={TIPOS_CONTA.map((t) => ({ value: t, label: t }))}
                    clearValue=""
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={form.agencia}
                    onChange={(e) => setForm((f) => ({ ...f, agencia: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conta">Conta</Label>
                  <Input
                    id="conta"
                    value={form.conta}
                    onChange={(e) => setForm((f) => ({ ...f, conta: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.nome.trim() ||
                createElab.isPending ||
                updateElab.isPending
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
            <AlertDialogTitle>Excluir elaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.nome}</strong> será removido. Esta ação não pode ser desfeita.
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

      <ImportElaboradoresDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        areas={areas}
        existingElaboradores={elaboradores}
      />
    </ProvasLayout>
  );
}
