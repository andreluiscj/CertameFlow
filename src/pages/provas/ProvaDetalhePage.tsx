import { useEffect, useMemo, useState } from 'react';

function PrazoInput({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (v: string | null) => void;
}) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => {
    setLocal(value ?? '');
  }, [value]);
  return (
    <Input
      type="date"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const next = local || null;
        if (next !== (value ?? null)) onCommit(next);
      }}
      className="h-8 text-xs"
    />
  );
}

import { useNavigate, useParams } from 'react-router-dom';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { ArrowLeft, FileText, Check, ChevronsUpDown, Trash2, Eye } from 'lucide-react';
import { useElaboradores } from '@/hooks/useElaboradores';
import { useStatusProvas } from '@/hooks/useStatusProvas';
import { useNiveisProvas } from '@/hooks/useNiveisProvas';
import { useProvaFull, useDeleteProva } from '@/hooks/useProvasCadastro';
import {
  useDisciplinaNiveis,
  useUpdateDisciplinaNivel,
  type DisciplinaNivelRow,
} from '@/hooks/useProvasDisciplinaNiveis';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { SearchableSelect, SELECIONE } from '@/components/ui/searchable-select';

export default function ProvaDetalhePage() {
  const { concursoId, provaId } = useParams<{ concursoId: string; provaId: string }>();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cargosDialogOpen, setCargosDialogOpen] = useState(false);

  const { data: provaFull } = useProvaFull(provaId);

  const prova = provaFull
    ? { id: provaFull.id, codigo: provaFull.codigo, concurso_id: provaFull.concurso_id }
    : undefined;
  const cargos = provaFull?.provas_cargos ?? [];
  const disciplinas = provaFull?.provas_disciplinas ?? [];


  const disciplinaIds = disciplinas.map((d) => d.id);

  const { data: dnRows = [] } = useDisciplinaNiveis(provaId, disciplinaIds);
  const updateDisciplinaNivel = useUpdateDisciplinaNivel(concursoId);
  const deleteProva = useDeleteProva();

  const { data: elaboradores = [] } = useElaboradores();
  const { data: statusList = [] } = useStatusProvas();
  const { data: niveis = [] } = useNiveisProvas();

  const cargoLabel =
    cargos.length === 0 ? '-' : cargos.length === 1 ? cargos[0].descricao : 'Vários';

  const niveisDistintos = Array.from(
    new Set(dnRows.map((dn) => dn.provas_niveis?.descricao).filter(Boolean) as string[])
  );
  const nivelLabel =
    niveisDistintos.length === 1 ? niveisDistintos[0] : niveisDistintos.length > 1 ? 'Vários níveis' : '';

  const grupos = useMemo(() => {
    return disciplinas.map((d) => {
      const linhas = dnRows
        .filter((dn) => dn.disciplina_id === d.id)
        .sort((a, b) =>
          (a.provas_niveis?.descricao ?? '').localeCompare(b.provas_niveis?.descricao ?? '')
        );
      return { disciplina: d, linhas };
    });
  }, [disciplinas, dnRows]);

  const updateDn = (id: string, patch: Partial<DisciplinaNivelRow>) => {
    updateDisciplinaNivel.mutate({ id, patch });
  };

  const handleDelete = async () => {
    if (!provaId) return;
    try {
      await deleteProva.mutateAsync({
        provaId,
        concursoId,
        disciplinaIds: disciplinas.map((d) => d.id),
      });
      toast.success('Prova excluída');
      navigate(`/provas/pedidos/${concursoId}`);
    } catch (error) {
      console.error('Erro ao excluir prova:', error);
      toast.error(`Erro ao excluir prova: ${getErrorMessage(error, 'desconhecido')}`);
    }
  };

  return (
    <ProvasLayout>
      <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/provas/pedidos/${concursoId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Prova {prova?.codigo ?? ''}
            {nivelLabel && (
              <span className="text-muted-foreground font-normal"> - {nivelLabel}</span>
            )}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir prova
            </Button>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-sm">Sem disciplinas cadastradas para esta prova.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden p-8 min-h-[calc(100vh-12rem)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/60 text-foreground">
                    <Th>Cargo</Th>
                    <Th>Disciplina</Th>
                    <Th className="w-52">Nível da Questão</Th>
                    <Th className="w-16 text-center">QTD</Th>
                    <Th className="w-56">Elaborador</Th>
                    <Th className="w-44">Status</Th>
                    <Th className="w-24 text-center">Contabilizar</Th>
                    <Th className="w-40">Prazo de Entrega</Th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map(({ disciplina, linhas }, gi) => {
                    const totalLinhas = grupos.reduce(
                      (s, g) => s + Math.max(1, g.linhas.length),
                      0
                    );
                    if (linhas.length === 0) {
                      return (
                        <tr key={disciplina.id} className="border-t">
                          {gi === 0 && (
                            <Td
                              rowSpan={totalLinhas}
                              className="align-middle text-center font-medium bg-muted/20"
                            >
                              <div className="flex flex-col items-center gap-2">
                                {cargoLabel}
                                {cargos.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCargosDialogOpen(true)}
                                    className="h-7 px-2 text-xs gap-1 text-primary"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Ver cargos
                                  </Button>
                                )}
                              </div>
                            </Td>
                          )}
                          <Td className="align-middle font-medium">{disciplina.disciplina}</Td>
                          <Td colSpan={6} className="text-muted-foreground">
                            Sem níveis
                          </Td>
                        </tr>
                      );
                    }
                    return linhas.map((dn, li) => (
                      <tr key={dn.id} className="border-t hover:bg-muted/20">
                        {gi === 0 && li === 0 && (
                          <Td
                            rowSpan={totalLinhas}
                            className="align-middle text-center font-medium bg-muted/20"
                          >
                            <div className="flex flex-col items-center gap-2">
                              {cargoLabel}
                              {cargos.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCargosDialogOpen(true)}
                                  className="h-7 px-2 text-xs gap-1 text-primary"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Ver cargos
                                </Button>
                              )}
                            </div>
                          </Td>
                        )}
                        {li === 0 && (
                          <Td
                            rowSpan={linhas.length}
                            className="align-middle font-medium bg-muted/10"
                          >
                            {disciplina.disciplina}
                          </Td>
                        )}
                        <Td>
                          <SearchableSelect
                            className="h-8 text-xs"
                            value={dn.nivel_id ?? ''}
                            onValueChange={(v) => {
                              const nivelId = v || null;
                              const nivelObj = niveis.find((n) => n.id === nivelId);
                              updateDn(dn.id, {
                                nivel_id: nivelId,
                                provas_niveis: nivelObj
                                  ? { descricao: nivelObj.descricao }
                                  : null,
                              });
                            }}
                            options={[...niveis]
                              .sort((a, b) =>
                                a.descricao.localeCompare(b.descricao, 'pt-BR', {
                                  sensitivity: 'base',
                                })
                              )
                              .map((n) => ({ value: n.id, label: n.descricao }))}
                            clearValue=""
                          />
                        </Td>
                        <Td className="text-center font-mono">{dn.qtd}</Td>
                        <Td>
                          <ElaboradorPicker
                            value={dn.elaborador_id}
                            elaboradores={elaboradores}
                            onChange={(v) => updateDn(dn.id, { elaborador_id: v })}
                          />
                        </Td>
                        <Td>
                          <SearchableSelect
                            className="h-8 text-xs"
                            value={dn.contrato_status_id ?? ''}
                            onValueChange={(v) =>
                              updateDn(dn.id, {
                                contrato_status_id: v || null,
                              })
                            }
                            options={[...statusList]
                              .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR', { sensitivity: 'base' }))
                              .map((s) => ({ value: s.id, label: s.descricao }))}
                            clearValue=""
                          />
                        </Td>
                        <Td className="text-center">
                          <Checkbox
                            checked={!!dn.contabilizar}
                            onCheckedChange={(v) =>
                              updateDn(dn.id, { contabilizar: !!v })
                            }
                          />
                        </Td>
                        <Td>
                          <PrazoInput
                            value={dn.prazo_entrega}
                            onCommit={(v) => updateDn(dn.id, { prazo_entrega: v })}
                          />
                        </Td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prova {prova?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a prova e todos os cargos, disciplinas e dados relacionados.
              Não é possível desfazer.
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

      <AlertDialog open={cargosDialogOpen} onOpenChange={setCargosDialogOpen}>
        <AlertDialogContent className="max-w-2xl w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Cargos da Prova {prova?.codigo}</AlertDialogTitle>
            <AlertDialogDescription>
              {cargos.length} cargo(s) vinculado(s) a esta prova.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border divide-y">
            {cargos.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-foreground font-medium">{c.descricao}</span>
                {c.provas_niveis?.descricao && (
                  <Badge variant="outline" className="font-normal text-sm shrink-0">
                    {c.provas_niveis.descricao}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProvasLayout>
  );
}

function ElaboradorPicker({
  value,
  elaboradores,
  onChange,
}: {
  value: string | null;
  elaboradores: { id: string; nome: string }[];
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = elaboradores.find((e) => e.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-8 w-full justify-between text-xs font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.nome ?? SELECIONE}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar elaborador..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum encontrado.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')}
                />
                <span className="text-muted-foreground">{SELECIONE}</span>
              </CommandItem>
              {[...elaboradores]
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                .map((e) => (
                <CommandItem
                  key={e.id}
                  value={e.nome}
                  onSelect={() => {
                    onChange(e.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === e.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {e.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-4 py-5 text-left text-xs font-semibold uppercase tracking-wide border-b border-border',
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      className={cn('px-4 py-5 border-r last:border-r-0', className)}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}
