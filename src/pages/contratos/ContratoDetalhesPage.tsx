import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import {
  ArrowLeft, FileText, Building2, Calendar, CreditCard, Landmark,
  CheckCircle2, Clock, Trophy, MapPin, User, Wallet, Link as LinkIcon,
  UserCog, Mail, Phone, Plus, Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatTelefone } from '@/lib/masks';
import {
  useContrato,
  useContratoParcelaStatus,
  useUpdateParcela,
  useUpdateContratoConcurso,
} from '@/hooks/useContratos';
import { useConcursos } from '@/hooks/useConcursos';
import { useContratoResponsaveis } from '@/hooks/useContratoResponsaveis';
import {
  useResponsaveisDoContrato,
  useVincularResponsavelContrato,
  useDesvincularResponsavelContrato,
} from '@/hooks/useContratoCadastroResponsaveis';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtDate = (s: string | null | undefined) =>
  s ? format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }) : '-';
const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const truncate = (s: string, max = 55) => (s.length > max ? s.slice(0, max - 1) + '…' : s);

export default function ContratoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContrato(id);
  const { data: parcelaStatusList = [] } = useContratoParcelaStatus();
  const { data: concursos = [] } = useConcursos();
  const { data: responsaveisDoCliente = [] } = useContratoResponsaveis(contrato?.cliente_id);
  const { data: vinculos = [] } = useResponsaveisDoContrato(id);
  const updateParcela = useUpdateParcela();
  const updateConcurso = useUpdateContratoConcurso();
  const vincularResponsavel = useVincularResponsavelContrato();
  const desvincularResponsavel = useDesvincularResponsavelContrato();
  const [vincularAberto, setVincularAberto] = useState(false);
  const [buscaVinculo, setBuscaVinculo] = useState('');

  const responsaveis = vinculos.flatMap((v) => (v.responsavel ? [v.responsavel] : []));
  const naoVinculados = responsaveisDoCliente.filter(
    (r) => !vinculos.some((v) => v.responsavel_id === r.id),
  );
  const vinculaveisFiltrados = naoVinculados.filter((r) =>
    `${r.nome} ${r.cargo ?? ''}`.toLowerCase().includes(buscaVinculo.trim().toLowerCase()),
  );
  const alterandoVinculo = vincularResponsavel.isPending || desvincularResponsavel.isPending;

  const concursoOptions = useMemo(
    () =>
      concursos.map(c => ({
        value: c.id,
        label: truncate(`${c.concurso_id} - ${c.nome} (${c.cidade}/${c.uf})`, 60),
      })),
    [concursos],
  );

  const totals = useMemo(() => {
    if (!contrato?.parcelas) return { pagas: 0, pendentes: 0, valorPago: 0, valorPendente: 0 };
    const total = Number(contrato.valor_total ?? 0);
    return contrato.parcelas.reduce(
      (acc, p) => {
        const valor = (total * Number(p.percentual)) / 100;
        if (p.pago) { acc.pagas += 1; acc.valorPago += valor; }
        else { acc.pendentes += 1; acc.valorPendente += valor; }
        return acc;
      },
      { pagas: 0, pendentes: 0, valorPago: 0, valorPendente: 0 },
    );
  }, [contrato]);

  if (isLoading) {
    return (
      <ContratosLayout>
        <p className="text-sm text-muted-foreground">Carregando contrato...</p>
      </ContratosLayout>
    );
  }

  if (!contrato) {
    return (
      <ContratosLayout>
        <div className="rounded-xl border border-dashed bg-card py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Contrato não encontrado.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/contratos/lista')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </ContratosLayout>
    );
  }

  const valorTotal = Number(contrato.valor_total ?? 0);

  return (
    <ContratosLayout>
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/contratos/lista')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {contrato.cliente?.descricao ?? 'Contrato'}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {contrato.cliente?.cidade}/{contrato.cliente?.uf}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">{contrato.status?.descricao ?? '-'}</Badge>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Wallet className="h-4 w-4" />}
            label="Valor Total"
            value={fmtMoney(valorTotal)}
            tone="primary"
          />
          <SummaryCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={`Pago (${totals.pagas}/${contrato.parcelas?.length ?? 0})`}
            value={fmtMoney(totals.valorPago)}
            tone="success"
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            label={`Pendente (${totals.pendentes})`}
            value={fmtMoney(totals.valorPendente)}
            tone="warning"
          />
          <SummaryCard
            icon={<Calendar className="h-4 w-4" />}
            label="Vigência"
            value={fmtDate(contrato.data_vigencia)}
            tone="muted"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Coluna esquerda: dados */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <SectionTitle icon={<User className="h-4 w-4" />}>Cliente</SectionTitle>
                <Field label="Descrição" value={contrato.cliente?.descricao} />
                <Field label="Cidade/UF" value={`${contrato.cliente?.cidade ?? '-'} / ${contrato.cliente?.uf ?? '-'}`} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <SectionTitle icon={<Building2 className="h-4 w-4" />}>Contrato</SectionTitle>
                <Field label="Tipo de Processo" value={contrato.tipo_processo?.descricao} />
                <Field label="Status" value={contrato.status?.descricao} />
                <Field label="Data de Vigência" value={fmtDate(contrato.data_vigencia)} />
                <Field label="Valor Total" value={fmtMoney(valorTotal)} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <SectionTitle icon={<Landmark className="h-4 w-4" />}>Conta de Recebimento</SectionTitle>
                <Field label="Banco" value={contrato.conta_recebimento?.banco} />
                <Field label="Convênio" value={contrato.conta_recebimento?.convenio} />
                <Field label="Agência" value={contrato.conta_recebimento?.agencia} />
                <Field label="Conta" value={contrato.conta_recebimento?.conta} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <SectionTitle icon={<UserCog className="h-4 w-4" />}>
                    Responsáveis ({responsaveis.length})
                  </SectionTitle>
                  <div className="flex items-center gap-1">
                    <Popover open={vincularAberto} onOpenChange={(o) => { setVincularAberto(o); if (!o) setBuscaVinculo(''); }}>
                      <PopoverTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Vincular responsável"
                          aria-label="Vincular responsável"
                          disabled={alterandoVinculo}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-1" align="end">
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          Vincular responsável
                        </p>
                        {naoVinculados.length === 0 ? (
                          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            {responsaveisDoCliente.length === 0
                              ? 'Nenhum responsável cadastrado para este cliente.'
                              : 'Todos os responsáveis do cliente já estão vinculados.'}
                          </p>
                        ) : (
                          <>
                          <div className="flex items-center border-b px-2 pb-1.5">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <Input
                              placeholder="Pesquisar responsável..."
                              value={buscaVinculo}
                              onChange={(e) => setBuscaVinculo(e.target.value)}
                              className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto overscroll-contain">
                            {vinculaveisFiltrados.length === 0 && (
                              <p className="py-3 text-center text-xs text-muted-foreground">Nenhum resultado</p>
                            )}
                            {vinculaveisFiltrados.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                className="flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                                onClick={() => {
                                  vincularResponsavel.mutate({ contratoId: contrato.id, responsavelId: r.id });
                                  setVincularAberto(false);
                                }}
                              >
                                <span className="text-sm truncate w-full">{r.nome}</span>
                                {r.cargo && (
                                  <span className="text-xs text-muted-foreground truncate w-full">{r.cargo}</span>
                                )}
                              </button>
                            ))}
                          </div>
                          </>
                        )}
                      </PopoverContent>
                    </Popover>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => navigate('/contratos/responsaveis')}
                    >
                      Gerenciar
                    </Button>
                  </div>
                </div>
                {responsaveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum responsável vinculado a este contrato.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {responsaveis.map((r) => (
                      <div key={r.id} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm truncate">{r.nome}</p>
                          {r.cargo && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {r.cargo}
                            </Badge>
                          )}
                        </div>
                        {r.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" /> {r.email}
                          </p>
                        )}
                        {r.telefone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" /> {formatTelefone(r.telefone)}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={alterandoVinculo}
                            onClick={() =>
                              desvincularResponsavel.mutate({ contratoId: contrato.id, responsavelId: r.id })
                            }
                          >
                            Desvincular
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita: concurso vinculado + parcelas */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle icon={<Trophy className="h-4 w-4" />}>Concurso Vinculado</SectionTitle>
                  {contrato.concurso && (
                    <Badge variant="outline" className="gap-1.5">
                      <LinkIcon className="h-3 w-3" /> Vinculado
                    </Badge>
                  )}
                </div>

                {contrato.concurso ? (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5">
                    <p className="font-semibold text-foreground">{contrato.concurso.nome}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {contrato.concurso.cidade}/{contrato.concurso.uf}
                      <span className="text-muted-foreground/50">•</span>
                      ID: {contrato.concurso.concurso_id}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum concurso vinculado a este contrato.</p>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {contrato.concurso ? 'Alterar concurso' : 'Selecionar concurso'}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        value={contrato.concurso_id ?? ''}
                        onValueChange={(v) =>
                          updateConcurso.mutate({ id: contrato.id, concurso_id: v || null })
                        }
                        options={concursoOptions}
                        searchPlaceholder="Pesquisar concurso..."
                      />
                    </div>
                    {contrato.concurso_id && (
                      <Button
                        variant="outline"
                        onClick={() => updateConcurso.mutate({ id: contrato.id, concurso_id: null })}
                      >
                        Desvincular
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-4">
                <SectionTitle icon={<CreditCard className="h-4 w-4" />}>
                  Parcelas ({contrato.parcelas?.length ?? 0})
                </SectionTitle>

                {contrato.parcelas && contrato.parcelas.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead className="w-20">%</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="w-44">Status</TableHead>
                          <TableHead className="w-20 text-center">Pago</TableHead>
                          <TableHead className="w-44">Data Pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contrato.parcelas.map((p) => {
                          const valor = (valorTotal * Number(p.percentual)) / 100;
                          return (
                            <TableRow key={p.id} className={p.pago ? 'bg-primary/5' : ''}>
                              <TableCell className="font-medium text-muted-foreground">{p.ordem}</TableCell>
                              <TableCell>{Number(p.percentual).toFixed(2)}%</TableCell>
                              <TableCell className="font-medium">{fmtMoney(valor)}</TableCell>
                              <TableCell className="text-muted-foreground">{fmtDate(p.data_pagamento)}</TableCell>
                              <TableCell>
                                <SearchableSelect
                                  value={p.status_id ?? ''}
                                  onValueChange={(v) =>
                                    updateParcela.mutate({ id: p.id, status_id: v || null })
                                  }
                                  options={parcelaStatusList.map(s => ({ value: s.id, label: s.descricao }))}
                                  clearValue=""
                                  searchPlaceholder="Pesquisar..."
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={!!p.pago}
                                  onCheckedChange={(v) =>
                                    updateParcela.mutate({
                                      id: p.id,
                                      pago: v,
                                      data_pagamento_efetivo: v
                                        ? (p.data_pagamento_efetivo ?? format(new Date(), 'yyyy-MM-dd'))
                                        : null,
                                    })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={p.data_pagamento_efetivo ?? ''}
                                  onChange={(e) =>
                                    updateParcela.mutate({
                                      id: p.id,
                                      data_pagamento_efetivo: e.target.value || null,
                                    })
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma parcela cadastrada.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ContratosLayout>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon} {children}
    </h3>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}

function SummaryCard({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-base font-semibold text-foreground truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
