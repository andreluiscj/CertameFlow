import { useMemo, useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useEventos } from '@/hooks/useEventos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CalendarDays, CalendarClock, CalendarCheck, Loader2 } from 'lucide-react';
import { format, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';

interface ProvaInfo {
  concursoId: string;
  concursoNome: string;
  concursoCidade: string;
  concursoUf: string;
  concursoCor: string;
  concursoNumId: string;
  dataProva: string;
  concluido: boolean;
  tipoProva: string;
}

function isProvaMultiplaEscolha(titulo: string) {
  const t = titulo.toLowerCase();
  return t.includes('aplicação') && t.includes('prova') && t.includes('múltipla escolha');
}

function buildProvas(eventos: EventoComConcurso[]): ProvaInfo[] {
  const provasMap = new Map<string, ProvaInfo>();

  for (const ev of eventos) {
    if (!ev.concurso_cadastros || !isProvaMultiplaEscolha(ev.titulo)) continue;
    const key = ev.concurso_id!;
    if (!provasMap.has(key)) {
      provasMap.set(key, {
        concursoId: ev.concurso_cadastros.id,
        concursoNome: ev.concurso_cadastros.nome,
        concursoCidade: ev.concurso_cadastros.cidade,
        concursoUf: ev.concurso_cadastros.uf,
        concursoCor: ev.concurso_cadastros.cor,
        concursoNumId: ev.concurso_cadastros.concurso_id,
        dataProva: ev.data,
        concluido: ev.concluido || false,
        tipoProva: 'Múltipla Escolha',
      });
    }
  }

  return Array.from(provasMap.values());
}

function filterProximas(provas: ProvaInfo[], hoje: Date) {
  return provas
    .filter((p) => {
      const data = parseISO(p.dataProva);
      return !p.concluido && (isAfter(data, hoje) || differenceInDays(data, hoje) === 0);
    })
    .sort((a, b) => a.dataProva.localeCompare(b.dataProva));
}

function filterRealizadas(provas: ProvaInfo[], hoje: Date) {
  return provas
    .filter((p) => {
      const data = parseISO(p.dataProva);
      return p.concluido || isBefore(data, hoje);
    })
    .sort((a, b) => b.dataProva.localeCompare(a.dataProva));
}

export default function ProvasCalendarioPage() {
  const { data: eventos, isLoading } = useEventos();
  const [tab, setTab] = useState('proximas');

  const hoje = useMemo(() => new Date(), []);

  const provas = useMemo(() => {
    if (!eventos) return [];
    return buildProvas(eventos);
  }, [eventos]);

  const proximas = useMemo(() => filterProximas(provas, hoje), [provas, hoje]);
  const realizadas = useMemo(() => filterRealizadas(provas, hoje), [provas, hoje]);

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="proximas" className="gap-2">
                <CalendarClock className="h-4 w-4" />
                Próximas ({proximas.length})
              </TabsTrigger>
              <TabsTrigger value="realizadas" className="gap-2">
                <CalendarCheck className="h-4 w-4" />
                Realizadas ({realizadas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proximas">
              {proximas.length === 0 ? (
                <EmptyState message="Nenhuma prova próxima encontrada." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {proximas.map((p) => (
                    <ProvaCard key={p.concursoId} prova={p} hoje={hoje} variant="proxima" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="realizadas">
              {realizadas.length === 0 ? (
                <EmptyState message="Nenhuma prova realizada encontrada." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {realizadas.map((p) => (
                    <ProvaCard key={p.concursoId} prova={p} hoje={hoje} variant="realizada" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ProvasLayout>
  );
}

function ProvaCard({
  prova,
  hoje,
  variant,
}: {
  prova: ProvaInfo;
  hoje: Date;
  variant: 'proxima' | 'realizada';
}) {
  const diasRestantes = differenceInDays(parseISO(prova.dataProva), hoje);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md w-full sm:w-[320px] lg:w-[340px]">
      <div className="h-1.5" style={{ backgroundColor: prova.concursoCor }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-3.5 w-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: prova.concursoCor }}
            />
            <span className="font-semibold text-foreground truncate">
              {prova.concursoNumId} - {prova.concursoCidade}/{prova.concursoUf}
            </span>
          </div>
          {variant === 'proxima' ? (
            <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/15 flex-shrink-0">
              Próxima
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-shrink-0">
              Realizada
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap">
            <span className="font-medium text-foreground text-xs uppercase tracking-wide">Data</span>
            <span>{format(parseISO(prova.dataProva), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {variant === 'proxima' && (
          <p className="text-xs font-medium text-amber-600">
            {diasRestantes === 0
              ? 'Hoje!'
              : diasRestantes === 1
              ? 'Amanhã'
              : `Em ${diasRestantes} dias`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
