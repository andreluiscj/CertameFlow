import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { FileText, Plus, Eye, Trash2, Calendar, Building2, CreditCard, UserCog, Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { SearchableSelect, SELECIONE } from '@/components/ui/searchable-select';
import { useContratoClientes } from '@/hooks/useContratoClientes';
import {
  useContratos,
  useCreateContrato,
  useDeleteContrato,
  useContratoTiposProcesso,
  useContratoStatusList,
  type ContratoCadastro,
} from '@/hooks/useContratos';
import { useContasRecebimento } from '@/hooks/useContasRecebimento';
import { useContratoResponsaveis } from '@/hooks/useContratoResponsaveis';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const fmtDate = (s: string | null) => (s ? format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }) : '-');
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const STATUS_PADRAO = 'em andamento';

/** "33,33" -> 33.33 */
const parsePercentual = (v: string) => parseFloat(v.replace(',', '.')) || 0;
/** 33.33 -> "33,33" */
const fmtPercentual = (n: number) => n.toFixed(2).replace('.', ',');

/** Aceita só números com até 2 casas decimais (vírgula ou ponto). */
function sanitizarPercentual(v: string) {
  const limpo = v.replace(/[^\d.,]/g, '').replace(/\./g, ',');
  const [inteiro = '', ...resto] = limpo.split(',');
  const decimais = resto.join('').slice(0, 2);
  return limpo.includes(',') ? `${inteiro.slice(0, 3)},${decimais}` : inteiro.slice(0, 3);
}

/**
 * Divide 100% em partes iguais com 2 casas. Quando a divisão não é exata
 * (p.ex. 3x = 33,33 + 33,33 + 33,34), a diferença vai para a última parcela.
 */
function distribuirPercentuais(qtd: number) {
  const base = Math.floor(10000 / qtd) / 100;
  const ultima = (10000 - Math.round(base * 100) * (qtd - 1)) / 100;
  return Array.from({ length: qtd }, (_, i) => fmtPercentual(i === qtd - 1 ? ultima : base));
}

export default function ContratosPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const { data: clientes = [] } = useContratoClientes();
  const { data: tipos = [] } = useContratoTiposProcesso();
  const { data: statusList = [] } = useContratoStatusList();
  const createContrato = useCreateContrato();
  const deleteContrato = useDeleteContrato();
  const { data: contas = [] } = useContasRecebimento();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ContratoCadastro | null>(null);

  // form
  const [clienteId, setClienteId] = useState('');
  const [tipoProcessoId, setTipoProcessoId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [dataVigencia, setDataVigencia] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState<Array<{ percentual: string; data_pagamento: string }>>([
    { percentual: '100,00', data_pagamento: '' },
  ]);
  const [contaRecebimentoId, setContaRecebimentoId] = useState('');
  const [responsavelIds, setResponsavelIds] = useState<string[]>([]);
  const [buscaResponsavel, setBuscaResponsavel] = useState('');

  const { data: responsaveisCliente = [] } = useContratoResponsaveis(clienteId || undefined);
  const responsaveisFiltrados = useMemo(() => {
    const q = buscaResponsavel.trim().toLowerCase();
    if (!q) return responsaveisCliente;
    return responsaveisCliente.filter((r) => `${r.nome} ${r.cargo ?? ''}`.toLowerCase().includes(q));
  }, [responsaveisCliente, buscaResponsavel]);

  const handleQtdParcelasChange = (n: number) => {
    const qty = Math.max(1, Math.min(120, Math.floor(n) || 1));
    setQtdParcelas(qty);
    setParcelas(distribuirPercentuais(qty).map((percentual) => ({ percentual, data_pagamento: '' })));
  };

  const updateParcelaForm = (idx: number, patch: Partial<{ percentual: string; data_pagamento: string }>) => {
    setParcelas(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const statusPadraoId =
    statusList.find((s) => s.descricao.trim().toLowerCase() === STATUS_PADRAO)?.id ?? '';

  // A lista de status pode chegar depois de o diálogo abrir.
  useEffect(() => {
    if (dialogOpen && !statusId && statusPadraoId) setStatusId(statusPadraoId);
  }, [dialogOpen, statusId, statusPadraoId]);

  const reset = () => {
    setClienteId(''); setTipoProcessoId(''); setStatusId(statusPadraoId);
    setDataVigencia(''); setValorTotal('');
    setQtdParcelas(1);
    setParcelas([{ percentual: '100,00', data_pagamento: '' }]);
    setContaRecebimentoId('');
    setResponsavelIds([]);
  };


  const openNew = () => { reset(); setDialogOpen(true); };

  const valorTotalNum = parseFloat(valorTotal.replace(',', '.')) || 0;
  // Soma em centésimos, para 33,33 + 33,33 + 33,34 dar exatamente 100.
  const somaCentesimos = parcelas.reduce((acc, p) => acc + Math.round(parsePercentual(p.percentual) * 100), 0);
  const somaPercentual = somaCentesimos / 100;
  const percentualOk = somaCentesimos === 10000;

  const canSave = clienteId && tipoProcessoId && statusId && percentualOk;

  const handleSave = async () => {
    if (!canSave) return;
    await createContrato.mutateAsync({
      cliente_id: clienteId,
      tipo_processo_id: tipoProcessoId,
      status_id: statusId,
      data_vigencia: dataVigencia || null,
      valor_total: valorTotalNum,
      conta_recebimento_id: contaRecebimentoId || null,
      responsavel_ids: responsavelIds,
      parcelas: parcelas.map((p, i) => ({
        ordem: i + 1,
        percentual: parsePercentual(p.percentual),
        data_pagamento: p.data_pagamento || null,
      })),
    });
    setDialogOpen(false);
  };


  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteContrato.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const clienteOptions = clientes.map(c => ({ value: c.id, label: `${c.descricao} - ${c.cidade}/${c.uf}` }));
  const tipoOptions = tipos.map(t => ({ value: t.id, label: t.descricao }));
  const statusOptions = statusList.map(s => ({ value: s.id, label: s.descricao }));

  return (
    <ContratosLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar Contrato
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : contratos.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card py-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contratos.map((c) => (
              <Card key={c.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {c.cliente?.descricao ?? '-'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {c.cliente?.cidade}/{c.cliente?.uf}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{c.status?.descricao ?? '-'}</Badge>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.tipo_processo?.descricao ?? '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Vigência: {fmtDate(c.data_vigencia)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {(c.parcelas?.length ?? 0)}x • Total: {fmtMoney(Number(c.valor_total ?? 0))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/contratos/lista/${c.id}`)}>
                      <Eye className="mr-1.5 h-4 w-4" />
                      Visualizar Contrato
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDelete(c)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Cadastro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Contrato</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Dados gerais */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados Gerais</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Cliente</Label>
                  <SearchableSelect
                    value={clienteId}
                    onValueChange={(v) => { setClienteId(v); setResponsavelIds([]); }}
                    options={clienteOptions}
                    searchPlaceholder="Pesquisar cliente..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Processo</Label>
                  <SearchableSelect
                    value={tipoProcessoId}
                    onValueChange={setTipoProcessoId}
                    options={tipoOptions}
                    searchPlaceholder="Pesquisar tipo..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <SearchableSelect
                    value={statusId}
                    onValueChange={setStatusId}
                    options={statusOptions}
                    searchPlaceholder="Pesquisar status..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataVigencia">Data de Vigência</Label>
                  <Input
                    id="dataVigencia"
                    type="date"
                    value={dataVigencia}
                    onChange={(e) => setDataVigencia(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total</Label>
                  <Input
                    id="valorTotal"
                    value={valorTotal}
                    onChange={(e) => setValorTotal(e.target.value)}
                    placeholder="Ex.: 18000,00"
                  />
                </div>
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Forma de Pagamento</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantidade de Parcelas</Label>
                  <SearchableSelect
                    value={String(qtdParcelas)}
                    onValueChange={(v) => handleQtdParcelasChange(Number(v))}
                    options={Array.from({ length: 24 }, (_, i) => ({
                      value: String(i + 1),
                      label: `${i + 1}x`,
                    }))}
                    searchPlaceholder="Pesquisar..."
                  />
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>% do Total</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data de Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((p, idx) => {
                      const pct = parsePercentual(p.percentual);
                      const valor = (valorTotalNum * pct) / 100;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="w-32">
                            <div className="relative">
                              <Input
                                value={p.percentual}
                                onChange={(e) => updateParcelaForm(idx, { percentual: sanitizarPercentual(e.target.value) })}
                                onBlur={() => updateParcelaForm(idx, { percentual: fmtPercentual(parsePercentual(p.percentual)) })}
                                inputMode="decimal"
                                placeholder="0,00"
                                className="pr-7"
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                                %
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fmtMoney(valor)}</TableCell>
                          <TableCell className="w-48">
                            <Input
                              type="date"
                              value={p.data_pagamento}
                              onChange={(e) => updateParcelaForm(idx, { data_pagamento: e.target.value })}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className={percentualOk ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                  Soma: {fmtPercentual(somaPercentual)}% {percentualOk ? '✓' : '(deve ser 100%)'}
                </span>
                <span className="text-muted-foreground">
                  Total distribuído: {fmtMoney((valorTotalNum * somaPercentual) / 100)}
                </span>
              </div>
            </div>

            {/* Conta de Recebimento */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conta de Recebimento</h3>
              <div className="space-y-2">
                <Label>Conta (opcional)</Label>
                <SearchableSelect
                  value={contaRecebimentoId}
                  onValueChange={setContaRecebimentoId}
                  options={contas.map(c => ({
                    value: c.id,
                    label: [c.banco, c.agencia && `Ag. ${c.agencia}`, c.conta && `Cc. ${c.conta}`].filter(Boolean).join(' • '),
                  }))}
                  searchPlaceholder="Pesquisar conta..."
                />
              </div>
            </div>

            {/* Responsáveis */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Responsáveis (opcional)
              </h3>
              {!clienteId ? (
                <p className="text-xs text-muted-foreground">
                  Selecione um cliente para vincular responsáveis cadastrados.
                </p>
              ) : responsaveisCliente.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum responsável cadastrado para este cliente.
                </p>
              ) : (
                <>
                  <Popover onOpenChange={(o) => { if (!o) setBuscaResponsavel(''); }}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate text-muted-foreground">
                          {responsavelIds.length === 0
                            ? SELECIONE
                            : `${responsavelIds.length} selecionado(s)`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="Pesquisar responsável..."
                          value={buscaResponsavel}
                          onChange={(e) => setBuscaResponsavel(e.target.value)}
                          className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto overscroll-contain p-1">
                        {responsaveisFiltrados.length === 0 && (
                          <p className="py-3 text-center text-xs text-muted-foreground">Nenhum resultado</p>
                        )}
                        {responsaveisFiltrados.map((r) => {
                          const checked = responsavelIds.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              className={cn(
                                'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-left',
                                checked && 'bg-accent',
                              )}
                              onClick={() =>
                                setResponsavelIds((prev) =>
                                  prev.includes(r.id)
                                    ? prev.filter((x) => x !== r.id)
                                    : [...prev, r.id],
                                )
                              }
                            >
                              <Check
                                className={cn(
                                  'mt-0.5 h-4 w-4 shrink-0',
                                  checked ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate">{r.nome}</span>
                                {r.cargo && (
                                  <span className="block text-xs text-muted-foreground truncate">
                                    {r.cargo}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {responsavelIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {responsavelIds.map((rid) => {
                        const r = responsaveisCliente.find((x) => x.id === rid);
                        if (!r) return null;
                        return (
                          <Badge key={rid} variant="secondary" className="gap-1.5 pr-1">
                            <UserCog className="h-3 w-3" />
                            <span>{r.nome}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setResponsavelIds((prev) => prev.filter((x) => x !== rid))
                              }
                              className="rounded-full hover:bg-background/60 p-0.5"
                              aria-label="Remover"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>


          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || createContrato.isPending}
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
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato de <strong>{confirmDelete?.cliente?.descricao}</strong> será removido. Esta ação não pode ser desfeita.
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