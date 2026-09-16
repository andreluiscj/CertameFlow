import { useNavigate, useParams } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComprovanteParcela } from '@/components/contratos/ComprovanteParcela';
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import {
  useContrato,
  useContratoParcelaStatus,
  useUpdateParcela,
} from '@/hooks/useContratos';
import { parseISO, format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const fmtDate = (s: string | null | undefined) =>
  s ? format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }) : '-';
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContratoAcompanhamentoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contrato, isLoading } = useContrato(id);
  const { data: parcelaStatusList = [] } = useContratoParcelaStatus();
  const updateParcela = useUpdateParcela();

  if (isLoading) {
    return (
      <ContratosLayout>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </ContratosLayout>
    );
  }

  if (!contrato) {
    return (
      <ContratosLayout>
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Contrato não encontrado.
          </CardContent>
        </Card>
      </ContratosLayout>
    );
  }

  const parcelas = contrato.parcelas ?? [];
  const valorTotal = Number(contrato.valor_total) || 0;
  const today = new Date();
  const atrasado = parcelas.some(
    p => !p.pago && p.data_pagamento && differenceInCalendarDays(parseISO(p.data_pagamento), today) < 0,
  );
  const pagas = parcelas.filter(p => p.pago).length;

  return (
    <ContratosLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contratos/acompanhar')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Activity className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Acompanhamento</h1>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">
                  {contrato.cliente?.descricao ?? 'Contrato'}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {contrato.cliente?.cidade ?? '-'}/{contrato.cliente?.uf ?? '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {atrasado ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> Atrasado
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Regular
                  </Badge>
                )}
                <Badge variant="outline">
                  {pagas}/{parcelas.length} pagas
                </Badge>
                <Badge variant="outline">{fmtMoney(valorTotal)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {parcelas.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Sem parcelas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="text-right w-20">%</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-48">Status</TableHead>
                    <TableHead className="w-16 text-center">Pago</TableHead>
                    <TableHead className="w-44">Pago em</TableHead>
                    <TableHead className="w-56">Comprovante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map(p => {
                    const overdue =
                      !p.pago &&
                      p.data_pagamento &&
                      differenceInCalendarDays(parseISO(p.data_pagamento), today) < 0;
                    return (
                      <TableRow
                        key={p.id}
                        className={cn(p.pago && 'bg-primary/5', overdue && 'bg-destructive/5')}
                      >
                        <TableCell className="font-medium">{p.ordem}</TableCell>
                        <TableCell className="text-right">{Number(p.percentual).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">
                          {fmtMoney((valorTotal * Number(p.percentual)) / 100)}
                        </TableCell>
                        <TableCell className={overdue ? 'text-destructive font-medium' : ''}>
                          {fmtDate(p.data_pagamento)}
                        </TableCell>
                        <TableCell>
                          <SearchableSelect
                            value={p.status_id ?? ''}
                            onValueChange={v =>
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
                            onCheckedChange={v =>
                              updateParcela.mutate({
                                id: p.id,
                                pago: v,
                                data_pagamento_efetivo: v
                                  ? p.data_pagamento_efetivo ?? format(new Date(), 'yyyy-MM-dd')
                                  : null,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={p.data_pagamento_efetivo ?? ''}
                            onChange={e =>
                              updateParcela.mutate({
                                id: p.id,
                                data_pagamento_efetivo: e.target.value || null,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <ComprovanteParcela parcela={p} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ContratosLayout>
  );
}
