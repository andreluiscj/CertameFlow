import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useEventos } from '@/hooks/useEventos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardList, FileSearch, FileCheck, Loader2 } from 'lucide-react';
import { format, parseISO, isAfter, startOfDay, differenceInDays } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';

interface ResultadoInfo {
  concursoId: string;
  concursoNome: string;
  concursoCidade: string;
  concursoUf: string;
  concursoCor: string;
  concursoNumId: string;
  dataResultado: string;
  concluido: boolean;
  titulo: string;
}

function buildResultados(eventos: EventoComConcurso[], tipo: 'preliminar' | 'definitivo'): ResultadoInfo[] {
  const results: ResultadoInfo[] = [];
  const hoje = startOfDay(new Date());

  for (const ev of eventos) {
    if (!ev.concurso_cadastros) continue;
    const t = ev.titulo.toLowerCase();
    if (!t.includes('resultado')) continue;
    if (t.includes('recurso')) continue;

    const dataEvento = parseISO(ev.data);
    if (!isAfter(dataEvento, hoje) && startOfDay(dataEvento).getTime() !== hoje.getTime()) continue;

    const isPreliminar = t.includes('preliminar');
    const isDefinitivo = t.includes('definitivo') || t.includes('final');

    if (tipo === 'preliminar' && isPreliminar) {
      results.push({
        concursoId: ev.concurso_cadastros.id,
        concursoNome: ev.concurso_cadastros.nome,
        concursoCidade: ev.concurso_cadastros.cidade,
        concursoUf: ev.concurso_cadastros.uf,
        concursoCor: ev.concurso_cadastros.cor,
        concursoNumId: ev.concurso_cadastros.concurso_id,
        dataResultado: ev.data,
        concluido: ev.concluido || false,
        titulo: ev.titulo,
      });
    } else if (tipo === 'definitivo' && isDefinitivo) {
      results.push({
        concursoId: ev.concurso_cadastros.id,
        concursoNome: ev.concurso_cadastros.nome,
        concursoCidade: ev.concurso_cadastros.cidade,
        concursoUf: ev.concurso_cadastros.uf,
        concursoCor: ev.concurso_cadastros.cor,
        concursoNumId: ev.concurso_cadastros.concurso_id,
        dataResultado: ev.data,
        concluido: ev.concluido || false,
        titulo: ev.titulo,
      });
    }
  }

  return results.sort((a, b) => a.dataResultado.localeCompare(b.dataResultado));
}

export default function ResultadosPage() {
  const { data: eventos, isLoading } = useEventos();
  const [tab, setTab] = useState('preliminar');

  const preliminares = useMemo(() => {
    if (!eventos) return [];
    return buildResultados(eventos, 'preliminar');
  }, [eventos]);

  const definitivos = useMemo(() => {
    if (!eventos) return [];
    return buildResultados(eventos, 'definitivo');
  }, [eventos]);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="preliminar" className="gap-2">
                <FileSearch className="h-4 w-4" />
                Preliminar ({preliminares.length})
              </TabsTrigger>
              <TabsTrigger value="definitivo" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Definitivo ({definitivos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preliminar">
              {preliminares.length === 0 ? (
                <EmptyState message="Nenhum resultado preliminar encontrado." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {preliminares.map((r, i) => (
                    <ResultadoCard key={`${r.concursoId}-${i}`} resultado={r} variant="preliminar" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="definitivo">
              {definitivos.length === 0 ? (
                <EmptyState message="Nenhum resultado definitivo encontrado." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {definitivos.map((r, i) => (
                    <ResultadoCard key={`${r.concursoId}-${i}`} resultado={r} variant="definitivo" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}

function ResultadoCard({
  resultado,
  variant,
}: {
  resultado: ResultadoInfo;
  variant: 'preliminar' | 'definitivo';
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md w-full sm:w-[320px] lg:w-[340px]">
      <div className="h-1.5" style={{ backgroundColor: resultado.concursoCor }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-3.5 w-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: resultado.concursoCor }}
            />
            <span className="font-semibold text-foreground truncate">
              {resultado.concursoNumId} - {resultado.concursoCidade}/{resultado.concursoUf}
            </span>
          </div>
          {variant === 'preliminar' ? (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/15 flex-shrink-0">
              Preliminar
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15 flex-shrink-0">
              Definitivo
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p className="text-xs font-medium text-foreground truncate">{resultado.titulo}</p>
          <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap">
            <span className="font-medium text-foreground text-xs uppercase tracking-wide">Data</span>
            <span>{format(parseISO(resultado.dataResultado), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {resultado.concluido && (
          <Badge variant="secondary" className="text-xs">Publicado</Badge>
        )}

        {(() => {
          const dias = differenceInDays(parseISO(resultado.dataResultado), startOfDay(new Date()));
          if (dias === 0) return <p className="text-xs font-medium text-amber-600">Hoje!</p>;
          if (dias === 1) return <p className="text-xs font-medium text-amber-600">Amanhã</p>;
          if (dias > 1) return <p className="text-xs font-medium text-amber-600">Faltam {dias} dias</p>;
          return null;
        })()}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
