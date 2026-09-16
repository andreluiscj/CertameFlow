import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  Eye,
} from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { useContratoClientes } from '@/hooks/useContratoClientes';
import { parseISO, format, differenceInCalendarDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string | null | undefined) =>
  s ? format(parseISO(s), 'dd/MM/yyyy', { locale: ptBR }) : '-';

export default function ContratosDashboardPage() {
  const navigate = useNavigate();
  const { data: contratos = [], isLoading } = useContratos();
  const { data: clientes = [] } = useContratoClientes();

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    let valorTotal = 0;
    let valorPago = 0;
    let valorPendente = 0;
    let parcelasPagas = 0;
    let parcelasPendentes = 0;
    let parcelasAtrasadas = 0;
    const statusMap = new Map<string, number>();
    const proximas: Array<{
      contratoId: string;
      cliente: string;
      ordem: number;
      valor: number;
      vencimento: string;
      dias: number;
    }> = [];
    const atrasadas: typeof proximas = [];

    for (const c of contratos) {
      const total = Number(c.valor_total ?? 0);
      valorTotal += total;
      const statusLabel = c.status?.descricao ?? 'Sem status';
      statusMap.set(statusLabel, (statusMap.get(statusLabel) ?? 0) + 1);

      for (const p of c.parcelas ?? []) {
        const valor = (total * Number(p.percentual)) / 100;
        if (p.pago) {
          valorPago += valor;
          parcelasPagas += 1;
        } else {
          valorPendente += valor;
          parcelasPendentes += 1;
          if (p.data_pagamento) {
            const venc = parseISO(p.data_pagamento);
            const dias = differenceInCalendarDays(venc, today);
            const item = {
              contratoId: c.id,
              cliente: c.cliente?.descricao ?? '-',
              ordem: p.ordem,
              valor,
              vencimento: p.data_pagamento,
              dias,
            };
            if (isBefore(venc, today)) {
              parcelasAtrasadas += 1;
              atrasadas.push(item);
            } else if (dias <= 30) {
              proximas.push(item);
            }
          }
        }
      }
    }

    proximas.sort((a, b) => a.dias - b.dias);
    atrasadas.sort((a, b) => a.dias - b.dias);

    const statusList = Array.from(statusMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      valorTotal,
      valorPago,
      valorPendente,
      parcelasPagas,
      parcelasPendentes,
      parcelasAtrasadas,
      statusList,
      proximas: proximas.slice(0, 6),
      atrasadas: atrasadas.slice(0, 6),
    };
  }, [contratos]);

  return (
    <ContratosLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={<FileText className="h-4 w-4" />}
                label="Contratos"
                value={String(contratos.length)}
                tone="primary"
              />
              <KpiCard
                icon={<Users className="h-4 w-4" />}
                label="Clientes"
                value={String(clientes.length)}
                tone="muted"
              />
              <KpiCard
                icon={<Wallet className="h-4 w-4" />}
                label="Valor Total"
                value={fmtMoney(stats.valorTotal)}
                tone="primary"
              />
              <KpiCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label={`Parcelas em atraso`}
                value={String(stats.parcelasAtrasadas)}
                tone="danger"
              />
              <KpiCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label={`Pago (${stats.parcelasPagas})`}
                value={fmtMoney(stats.valorPago)}
                tone="success"
              />
              <KpiCard
                icon={<Clock className="h-4 w-4" />}
                label={`Pendente (${stats.parcelasPendentes})`}
                value={fmtMoney(stats.valorPendente)}
                tone="warning"
              />
              <KpiCard
                icon={<Calendar className="h-4 w-4" />}
                label="Próximas (30d)"
                value={String(stats.proximas.length)}
                tone="muted"
              />
              <KpiCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="% Recebido"
                value={
                  stats.valorTotal > 0
                    ? `${((stats.valorPago / stats.valorTotal) * 100).toFixed(1)}%`
                    : '0%'
                }
                tone="success"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Status */}
              <Card className="lg:col-span-1">
                <CardContent className="p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contratos por Status
                  </h3>
                  {stats.statusList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.statusList.map((s) => {
                        const pct = contratos.length > 0 ? (s.count / contratos.length) * 100 : 0;
                        return (
                          <div key={s.label} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground truncate">{s.label}</span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                {s.count} • {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Atrasadas */}
              <Card className="lg:col-span-2">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Parcelas em Atraso
                    </h3>
                    <Badge variant="destructive">{stats.parcelasAtrasadas}</Badge>
                  </div>
                  {stats.atrasadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma parcela em atraso.</p>
                  ) : (
                    <div className="divide-y">
                      {stats.atrasadas.map((p) => (
                        <ParcelaRow
                          key={`${p.contratoId}-${p.ordem}`}
                          parcela={p}
                          tone="danger"
                          onClick={() => navigate(`/contratos/lista/${p.contratoId}`)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Próximas */}
              <Card className="lg:col-span-3">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Próximas Parcelas (30 dias)
                    </h3>
                    <Badge variant="secondary">{stats.proximas.length}</Badge>
                  </div>
                  {stats.proximas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem parcelas previstas para os próximos 30 dias.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {stats.proximas.map((p) => (
                        <button
                          key={`${p.contratoId}-${p.ordem}`}
                          onClick={() => navigate(`/contratos/lista/${p.contratoId}`)}
                          className="text-left rounded-lg border bg-card hover:bg-accent transition-colors p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {p.cliente}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {p.dias === 0 ? 'Hoje' : `${p.dias}d`}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Parcela {p.ordem} • {fmtDate(p.vencimento)}
                          </p>
                          <p className="text-sm font-medium text-foreground">{fmtMoney(p.valor)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => navigate('/contratos/lista')}>
                <Eye className="mr-2 h-4 w-4" /> Ver todos os contratos
              </Button>
            </div>
          </>
        )}
      </div>
    </ContratosLayout>
  );
}

function ParcelaRow({
  parcela,
  tone,
  onClick,
}: {
  parcela: { contratoId: string; cliente: string; ordem: number; valor: number; vencimento: string; dias: number };
  tone: 'danger' | 'warning';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-2.5 hover:bg-accent/40 -mx-2 px-2 rounded-md transition-colors"
    >
      <div className="min-w-0 text-left">
        <p className="text-sm font-medium text-foreground truncate">{parcela.cliente}</p>
        <p className="text-xs text-muted-foreground">
          Parcela {parcela.ordem} • Venc. {fmtDate(parcela.vencimento)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">{fmtMoney(parcela.valor)}</p>
        <Badge variant={tone === 'danger' ? 'destructive' : 'secondary'} className="text-[10px]">
          {Math.abs(parcela.dias)} {Math.abs(parcela.dias) === 1 ? 'dia' : 'dias'}{' '}
          {tone === 'danger' ? 'atraso' : ''}
        </Badge>
      </div>
    </button>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
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
