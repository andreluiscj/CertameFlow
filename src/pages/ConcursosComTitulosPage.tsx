import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useConcursos } from '@/hooks/useConcursos';
import { useNotasTitulos, useUpsertNotaTitulo, useDeleteNotaTitulo } from '@/hooks/useNotasTitulos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getErrorMessage } from '@/lib/errors';
import {
  Award,
  Loader2,
  Pencil,
  Trash2,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Plus,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  differenceInCalendarDays,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Concurso, NotaTitulo } from '@/types/database';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SELECIONE } from '@/components/ui/searchable-select';

interface RowItem {
  concurso: Concurso;
  nota: NotaTitulo;
}

export default function ConcursosComTitulosPage() {
  const { data: concursos, isLoading: loadingConcursos } = useConcursos();
  const { data: notas, isLoading: loadingNotas } = useNotasTitulos();
  const { toast } = useToast();
  const upsert = useUpsertNotaTitulo();
  const remover = useDeleteNotaTitulo();

  const [tab, setTab] = useState('andamento');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaTitulo | null>(null);
  const [selectedConcursoId, setSelectedConcursoId] = useState<string>('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [juntoInscricoes, setJuntoInscricoes] = useState<'sim' | 'nao'>('nao');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');

  const hoje = useMemo(() => startOfDay(new Date()), []);

  const concursosComTitulo = useMemo(
    () => (concursos || []).filter((c) => c.nota_titulo === true),
    [concursos]
  );

  // Concursos elegíveis para o seletor (com nota_titulo, ainda não cadastrados - exceto o que está sendo editado)
  const concursosDisponiveis = useMemo(() => {
    const jaCadastrados = new Set((notas || []).map((n) => n.concurso_id));
    return concursosComTitulo
      .filter((c) => !jaCadastrados.has(c.id) || c.id === editingNota?.concurso_id)
      .sort((a, b) =>
        a.concurso_id.localeCompare(b.concurso_id, undefined, { numeric: true })
      );
  }, [concursosComTitulo, notas, editingNota]);

  const rows = useMemo<RowItem[]>(() => {
    if (!concursos || !notas) return [];
    const concursoMap = new Map(concursos.map((c) => [c.id, c]));
    return notas
      .map((n) => {
        const concurso = concursoMap.get(n.concurso_id);
        if (!concurso || !concurso.nota_titulo) return null;
        return { concurso, nota: n } as RowItem;
      })
      .filter((r): r is RowItem => r !== null);
  }, [concursos, notas]);

  const proximos = useMemo(
    () =>
      rows
        .filter((r) => {
          if (!r.nota.data_inicio) return false;
          return isAfter(parseISO(r.nota.data_inicio), hoje);
        })
        .sort((a, b) => (a.nota.data_inicio || '').localeCompare(b.nota.data_inicio || '')),
    [rows, hoje]
  );

  const emAndamento = useMemo(
    () =>
      rows
        .filter((r) => {
          if (!r.nota.data_inicio) return false;
          const ini = parseISO(r.nota.data_inicio);
          if (isAfter(ini, hoje)) return false;
          if (r.nota.data_termino && isBefore(parseISO(r.nota.data_termino), hoje)) return false;
          return true;
        })
        .sort((a, b) => (a.nota.data_termino || '9999').localeCompare(b.nota.data_termino || '9999')),
    [rows, hoje]
  );

  const encerrados = useMemo(
    () =>
      rows
        .filter((r) => {
          if (!r.nota.data_termino) return false;
          return isBefore(parseISO(r.nota.data_termino), hoje);
        })
        .sort((a, b) => (b.nota.data_termino || '').localeCompare(a.nota.data_termino || '')),
    [rows, hoje]
  );

  const isLoading = loadingConcursos || loadingNotas;

  const openNew = () => {
    setEditingNota(null);
    setSelectedConcursoId('');
    setJuntoInscricoes('nao');
    setDataInicio('');
    setDataTermino('');
    setDialogOpen(true);
  };

  const openEdit = (row: RowItem) => {
    setEditingNota(row.nota);
    setSelectedConcursoId(row.concurso.id);
    setJuntoInscricoes(row.nota.junto_inscricoes ? 'sim' : 'nao');
    setDataInicio(row.nota.data_inicio || '');
    setDataTermino(row.nota.data_termino || '');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingNota(null);
    setSelectedConcursoId('');
    setDataInicio('');
    setDataTermino('');
    setJuntoInscricoes('nao');
  };

  const handleSave = async () => {
    if (!selectedConcursoId) {
      toast({ title: 'Selecione um concurso', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        concurso_id: selectedConcursoId,
        junto_inscricoes: juntoInscricoes === 'sim',
        data_inicio: dataInicio || null,
        data_termino: dataTermino || null,
      });
      toast({ title: 'Salvo', description: 'Configuração de título salva com sucesso.' });
      closeDialog();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleDelete = async (row: RowItem) => {
    try {
      await remover.mutateAsync(row.nota.id);
      toast({ title: 'Removido', description: 'Configuração de título removida.' });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const concursoSelecionado = concursosComTitulo.find((c) => c.id === selectedConcursoId);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Títulos</h1>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Configurar Título
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="andamento" className="gap-2">
                <CalendarCheck className="h-4 w-4" />
                Em Andamento ({emAndamento.length})
              </TabsTrigger>
              <TabsTrigger value="proximos" className="gap-2">
                <CalendarClock className="h-4 w-4" />
                Próximos ({proximos.length})
              </TabsTrigger>
              <TabsTrigger value="encerrados" className="gap-2">
                <CalendarX className="h-4 w-4" />
                Encerrados ({encerrados.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="andamento">
              {emAndamento.length === 0 ? (
                <EmptyState message="Nenhum período de títulos em andamento." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {emAndamento.map((r) => (
                    <TituloCard
                      key={r.nota.id}
                      row={r}
                      hoje={hoje}
                      variant="andamento"
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="proximos">
              {proximos.length === 0 ? (
                <EmptyState message="Nenhum período de títulos futuro." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {proximos.map((r) => (
                    <TituloCard
                      key={r.nota.id}
                      row={r}
                      hoje={hoje}
                      variant="proximo"
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="encerrados">
              {encerrados.length === 0 ? (
                <EmptyState message="Nenhum período de títulos encerrado." />
              ) : (
                <div className="flex flex-wrap gap-4">
                  {encerrados.map((r) => (
                    <TituloCard
                      key={r.nota.id}
                      row={r}
                      hoje={hoje}
                      variant="encerrado"
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNota ? 'Editar Título' : 'Configurar Título'}</DialogTitle>
              <DialogDescription>
                Configure o período de envio de títulos do concurso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Concurso</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between font-normal"
                      disabled={!!editingNota}
                    >
                      {concursoSelecionado
                        ? `${concursoSelecionado.concurso_id} - ${concursoSelecionado.cidade}/${concursoSelecionado.uf}`
                        : SELECIONE}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar concurso..." />
                      <CommandList>
                        <CommandEmpty>
                          {concursosComTitulo.length === 0
                            ? 'Nenhum concurso com nota de título cadastrado.'
                            : 'Nenhum concurso disponível.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {concursosDisponiveis.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.concurso_id} ${c.nome} ${c.cidade} ${c.uf}`}
                              onSelect={() => {
                                setSelectedConcursoId(c.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedConcursoId === c.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: c.cor }}
                                />
                                <span className="truncate">
                                  {c.concurso_id} - {c.cidade}/{c.uf} - {c.nome}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Junto com inscrições?</Label>
                <SearchableSelect
                  value={juntoInscricoes}
                  onValueChange={(v) => setJuntoInscricoes(v as 'sim' | 'nao')}
                  options={[
                    { value: 'sim', label: 'Sim' },
                    { value: 'nao', label: 'Não' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de início</Label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de término</Label>
                  <Input
                    type="date"
                    value={dataTermino}
                    onChange={(e) => setDataTermino(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

function TituloCard({
  row,
  hoje,
  variant,
  onEdit,
  onDelete,
}: {
  row: RowItem;
  hoje: Date;
  variant: 'andamento' | 'proximo' | 'encerrado';
  onEdit: (r: RowItem) => void;
  onDelete: (r: RowItem) => void;
}) {
  const { concurso, nota } = row;

  const diasRestantes = nota.data_termino
    ? differenceInCalendarDays(parseISO(nota.data_termino), hoje)
    : null;
  const diasParaAbrir = nota.data_inicio
    ? differenceInCalendarDays(parseISO(nota.data_inicio), hoje)
    : null;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md w-full sm:w-[320px] lg:w-[340px]">
      <div className="h-1.5" style={{ backgroundColor: concurso.cor }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="h-3.5 w-3.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: concurso.cor }}
            />
            <span className="font-semibold text-foreground truncate">
              {concurso.concurso_id} - {concurso.cidade}/{concurso.uf}
            </span>
          </div>
          {variant === 'andamento' ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/15 flex-shrink-0">
              Em andamento
            </Badge>
          ) : variant === 'proximo' ? (
            <Badge variant="secondary" className="flex-shrink-0">
              Em breve
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex-shrink-0">
              Encerrado
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {nota.junto_inscricoes ? (
            <Badge variant="outline" className="text-xs">Junto com inscrições</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">Período separado</Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-x-4 gap-y-0.5 flex-wrap">
            <span className="font-medium text-foreground text-xs uppercase tracking-wide">
              Período
            </span>
            <span>
              {nota.data_inicio ? format(parseISO(nota.data_inicio), 'dd/MM/yyyy') : '-'}
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span>
              {nota.data_termino ? format(parseISO(nota.data_termino), 'dd/MM/yyyy') : '-'}
            </span>
          </div>

          {variant === 'andamento' && diasRestantes !== null && (
            <p className="text-xs font-medium text-amber-600 mt-1">
              {diasRestantes === 0
                ? 'Encerra hoje!'
                : diasRestantes === 1
                ? 'Encerra amanhã'
                : `Encerra em ${diasRestantes} dias`}
            </p>
          )}
          {variant === 'proximo' && diasParaAbrir !== null && (
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {diasParaAbrir === 1 ? 'Abre amanhã' : `Abre em ${diasParaAbrir} dias`}
            </p>
          )}
          {variant === 'encerrado' && diasRestantes !== null && (
            <p className="text-xs font-medium text-muted-foreground mt-1">
              Encerrado há {Math.abs(diasRestantes)}{' '}
              {Math.abs(diasRestantes) === 1 ? 'dia' : 'dias'}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(row)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(row)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Award className="h-12 w-12 text-muted-foreground/40 mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
