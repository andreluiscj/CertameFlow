import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Activity, MapPin, Trophy, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { useConcursosProgresso } from '@/hooks/useEventos';
import { contratoTemParcelaAtrasada } from '@/hooks/useAtrasadas';

export default function AcompanharContratosPage() {
  const { data: contratos = [], isLoading } = useContratos();
  const navigate = useNavigate();

  const concursoIds = useMemo(
    () => Array.from(new Set(contratos.map(c => c.concurso_id).filter((v): v is string => !!v))),
    [contratos],
  );
  const { data: progressoMap = {} } = useConcursosProgresso(concursoIds);

  const ordenados = useMemo(
    () => [...contratos].sort((a, b) => (a.cliente?.descricao ?? '').localeCompare(b.cliente?.descricao ?? '')),
    [contratos],
  );

  return (
    <ContratosLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Acompanhar Contratos</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : ordenados.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nenhum contrato cadastrado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ordenados.map(contrato => {
              const prog = contrato.concurso_id ? progressoMap[contrato.concurso_id] : undefined;
              const pctConcurso = prog && prog.total > 0 ? Math.round((prog.concluidos / prog.total) * 100) : 0;
              const atrasado = contratoTemParcelaAtrasada(contrato);

              return (
                <Card key={contrato.id} className="overflow-hidden flex flex-col">
                  <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
                    <h2 className="text-base font-semibold leading-tight truncate">
                      {contrato.cliente?.descricao ?? 'Contrato'}
                    </h2>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {contrato.cliente?.cidade ?? '-'}/{contrato.cliente?.uf ?? '-'}
                    </p>

                    <div>
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
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium min-w-0">
                          <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
                          {contrato.concurso ? (
                            <span className="truncate">
                              {contrato.concurso.concurso_id} - {contrato.concurso.cidade}/{contrato.concurso.uf}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem concurso vinculado</span>
                          )}
                        </div>
                        {contrato.concurso && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {prog?.concluidos ?? 0}/{prog?.total ?? 0}
                          </span>
                        )}
                      </div>
                      {contrato.concurso ? (
                        <Progress value={pctConcurso} className="h-3" showPercentage />
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Vincule um concurso na visualização do contrato para acompanhar.
                        </p>
                      )}
                    </div>

                    <div className="flex-1" />

                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => navigate(`/contratos/acompanhar/${contrato.id}`)}
                    >
                      Acompanhar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ContratosLayout>
  );
}
