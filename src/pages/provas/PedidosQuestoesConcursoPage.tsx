import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useConcursos } from '@/hooks/useConcursos';
import { useElaboradores } from '@/hooks/useElaboradores';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { toast } from 'sonner';
import { ArrowLeft, FileText, Upload, ChevronRight, Calculator, UserCheck, Check, ChevronsUpDown, X, Lock, LockOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportProvasDialog } from '@/components/provas/ImportProvasDialog';
import {
  useProvasEncerramentos,
  useEncerrarProvasConcurso,
  useReabrirProvasConcurso,
} from '@/hooks/useProvasEncerramentos';
import { useProvasCadastroCompleto } from '@/hooks/useProvasCadastro';
import { SELECIONE } from '@/components/ui/searchable-select';

export default function PedidosQuestoesConcursoPage() {
  const { concursoId } = useParams<{ concursoId: string }>();
  const navigate = useNavigate();
  const { data: concursos } = useConcursos();
  const [importOpen, setImportOpen] = useState(false);
  const { data: elaboradores = [] } = useElaboradores();
  const [revisorId, setRevisorId] = useState<string>('');
  const [revisorOpen, setRevisorOpen] = useState(false);

  const storageKey = concursoId ? `revisor:${concursoId}` : '';

  useEffect(() => {
    if (storageKey) {
      setRevisorId(localStorage.getItem(storageKey) ?? '');
    }
  }, [storageKey]);

  const { data: encerramentos = [] } = useProvasEncerramentos();
  const encerrarMutation = useEncerrarProvasConcurso();
  const reabrirMutation = useReabrirProvasConcurso();
  const encerrado = encerramentos.some((e) => e.concurso_id === concursoId);

  const [confirmEncerrarOpen, setConfirmEncerrarOpen] = useState(false);
  const [confirmReabrirOpen, setConfirmReabrirOpen] = useState(false);

  const handleEncerrar = () => {
    if (!concursoId) return;
    setConfirmEncerrarOpen(false);
    encerrarMutation.mutate(concursoId, {
      onSuccess: () => {
        toast.success('Concurso encerrado. Movido para "Concursos Anteriores".');
        navigate('/provas/pedidos');
      },
    });
  };

  const handleReabrir = () => {
    if (!concursoId) return;
    setConfirmReabrirOpen(false);
    reabrirMutation.mutate(concursoId, {
      onSuccess: () => {
        toast.success('Concurso reaberto.');
      },
    });
  };

  const [pendingRevisorId, setPendingRevisorId] = useState<string | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const applyRevisor = (id: string) => {
    setRevisorId(id);
    if (storageKey) {
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    }
  };

  const requestSelectRevisor = (id: string) => {
    setRevisorOpen(false);
    setPendingRevisorId(id);
  };

  const confirmSelectRevisor = () => {
    if (pendingRevisorId) {
      applyRevisor(pendingRevisorId);
      toast.success('Revisor confirmado');
    }
    setPendingRevisorId(null);
  };

  const confirmRemoveRevisor = () => {
    applyRevisor('');
    toast.success('Revisor removido');
    setConfirmRemoveOpen(false);
  };

  const revisorSelecionado = elaboradores.find((e) => e.id === revisorId);
  const pendingRevisor = pendingRevisorId
    ? elaboradores.find((e) => e.id === pendingRevisorId)
    : null;
  const concurso = concursos?.find((c) => c.id === concursoId);

  const { data: provasFull = [] } = useProvasCadastroCompleto(concursoId);

  const provasResumo = useMemo(() => {
    return provasFull.map((p) => {
      const cs = p.provas_cargos ?? [];
      const ds = p.provas_disciplinas ?? [];
      const total = ds.reduce((s, d) => s + (d.questoes || 0), 0);
      return { prova: { id: p.id, codigo: p.codigo }, cargos: cs, discs: ds, total };
    });
  }, [provasFull]);

  const provas = provasFull;

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/provas/pedidos')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground truncate">
              Provas {concurso ? `- ${concurso.concurso_id} - ${concurso.cidade}/${concurso.uf}` : ''}
            </h1>
            {encerrado && (
              <Badge variant="secondary" className="gap-1 flex-shrink-0">
                <Lock className="h-3 w-3" />
                Encerrado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/provas/pedidos/${concursoId}/resumo`)}
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              Resumo financeiro
            </Button>
            {encerrado ? (
              <Button
                variant="outline"
                onClick={() => setConfirmReabrirOpen(true)}
                className="gap-2"
              >
                <LockOpen className="h-4 w-4" />
                Reabrir Concurso
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmEncerrarOpen(true)}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Encerrar Concurso
              </Button>
            )}
            <Button
              onClick={() => setImportOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </Button>
          </div>
        </div>

        {provas.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma prova importada para este concurso.</p>
            <p className="mt-1 text-xs">Use "Importar Excel" para começar.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {provasResumo.map(({ prova, cargos: cs, discs, total }) => {
              const cargoLabel =
                cs.length === 0 ? '-' : cs.length === 1 ? cs[0].descricao : `Vários (${cs.length})`;
              const niveisUnicos = Array.from(
                new Set(cs.map((c) => c.provas_niveis?.descricao).filter(Boolean) as string[])
              );
              return (
                <button
                  key={prova.id}
                  type="button"
                  onClick={() =>
                    navigate(`/provas/pedidos/${concursoId}/prova/${prova.id}`)
                  }
                  className="group text-left rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                      {prova.codigo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">Prova {prova.codigo}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground truncate">
                        {cargoLabel}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {niveisUnicos.slice(0, 4).map((n) => (
                      <Badge key={n} variant="outline" className="font-normal text-xs">
                        {n}
                      </Badge>
                    ))}
                    {niveisUnicos.length > 4 && (
                      <Badge variant="outline" className="font-normal text-xs">
                        +{niveisUnicos.length - 4}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                    <span>
                      <strong className="text-foreground">{discs.length}</strong> disciplinas
                    </span>
                    <span>
                      <strong className="text-foreground">{total}</strong> questões
                    </span>
                    <span>
                      <strong className="text-foreground">{cs.length}</strong> cargos
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Revisor (15% sobre o valor total)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 text-foreground">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-border">
                    Revisor
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide border-b border-border w-20">
                    %
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide border-b border-border w-32">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 border-r">
                    <Popover open={revisorOpen} onOpenChange={setRevisorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          role="combobox"
                          aria-expanded={revisorOpen}
                          className="w-full justify-between font-normal h-8 px-2 -mx-2"
                        >
                          <span className="truncate">
                            {revisorSelecionado ? (
                              <>
                                <span className="font-medium">{revisorSelecionado.codigo}</span>
                                <span className="mx-1.5">-</span>
                                {revisorSelecionado.nome}
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                {SELECIONE}
                              </span>
                            )}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[360px]" align="start">
                        <Command
                          filter={(value, search) => {
                            if (!search) return 1;
                            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                          }}
                        >
                          <CommandInput placeholder="Buscar por nome ou ID..." />
                          <CommandList>
                            <CommandEmpty>Nenhum elaborador encontrado.</CommandEmpty>
                            <CommandGroup>
                              {elaboradores.map((e) => {
                                const value = `${e.codigo} ${e.nome}`;
                                return (
                                  <CommandItem
                                    key={e.id}
                                    value={value}
                                    onSelect={() => requestSelectRevisor(e.id)}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        revisorId === e.id ? 'opacity-100' : 'opacity-0'
                                      )}
                                    />
                                    <span className="font-mono text-xs text-muted-foreground mr-2">
                                      {e.codigo}
                                    </span>
                                    {e.nome}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-3 py-2 border-r text-center font-mono">15%</td>
                  <td className="px-3 py-2 text-center">
                    {revisorId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemoveOpen(true)}
                        className="h-7 text-xs gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {concursoId && (
        <ImportProvasDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          concursoId={concursoId}
        />
      )}

      <AlertDialog
        open={!!pendingRevisorId}
        onOpenChange={(open) => !open && setPendingRevisorId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar revisor</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevisor ? (
                <>
                  Deseja definir{' '}
                  <strong className="text-foreground">
                    {pendingRevisor.codigo} - {pendingRevisor.nome}
                  </strong>{' '}
                  como revisor deste concurso? Ele(a) receberá 15% sobre o valor total.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelectRevisor}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover revisor</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover o revisor atual deste concurso?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveRevisor}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEncerrarOpen} onOpenChange={setConfirmEncerrarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar concurso</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja encerrar as provas deste concurso? Ele será movido para{' '}
              <strong className="text-foreground">"Concursos Anteriores"</strong> na tela de
              Pedidos de Questões. Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEncerrar}>
              Confirmar encerramento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReabrirOpen} onOpenChange={setConfirmReabrirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir concurso</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja reabrir este concurso? Ele voltará para a lista principal de Pedidos de
              Questões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReabrir}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProvasLayout>
  );
}
