import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useEventos } from '@/hooks/useEventos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Loader2, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { EventoComConcurso } from '@/types/database';

interface ConcursoCargoCard {
  concursoId: string;
  concursoNumId: string;
  concursoCidade: string;
  concursoUf: string;
  concursoCor: string;
  dataProva: string;
}

function isProvaMultiplaEscolha(titulo: string) {
  const t = titulo.toLowerCase();
  return t.includes('aplicação') && t.includes('prova') && t.includes('múltipla escolha');
}

function buildCards(eventos: EventoComConcurso[]): ConcursoCargoCard[] {
  const map = new Map<string, ConcursoCargoCard>();
  for (const ev of eventos) {
    if (!ev.concurso_cadastros || !ev.concurso_id) continue;
    if (!isProvaMultiplaEscolha(ev.titulo)) continue;
    if (map.has(ev.concurso_id)) continue;
    map.set(ev.concurso_id, {
      concursoId: ev.concurso_cadastros.id,
      concursoNumId: ev.concurso_cadastros.concurso_id,
      concursoCidade: ev.concurso_cadastros.cidade,
      concursoUf: ev.concurso_cadastros.uf,
      concursoCor: ev.concurso_cadastros.cor,
      dataProva: ev.data,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.dataProva.localeCompare(b.dataProva));
}

export default function CargosProvasPage() {
  const { data: eventos, isLoading } = useEventos();
  const navigate = useNavigate();

  const cards = useMemo(() => (eventos ? buildCards(eventos) : []), [eventos]);

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cargos</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">Nenhum concurso com prova cadastrada.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {cards.map((c) => (
              <Card
                key={c.concursoId}
                className="overflow-hidden transition-shadow hover:shadow-md w-full sm:w-[340px]"
              >
                <div className="h-1.5" style={{ backgroundColor: c.concursoCor }} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.concursoCor }}
                    />
                    <span className="font-semibold text-foreground truncate">
                      {c.concursoNumId} - {c.concursoCidade}/{c.concursoUf}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4" />
                      <span>Prova: {format(parseISO(c.dataProva), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/provas/cargos/${c.concursoId}`)}
                  >
                    <Briefcase className="h-4 w-4" />
                    Visualizar Cargos
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProvasLayout>
  );
}
