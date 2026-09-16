import { useState } from 'react';
import { useConcursos, useDeleteConcurso, useUpdateConcurso } from '@/hooks/useConcursos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Trash2, Archive, ExternalLink, ArrowUp, ArrowDown, Trophy, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ConcursosListContentProps {
  /** Whether to show the action buttons (Novo, Finalizados). Default true. */
  showActions?: boolean;
  /** Whether to show the "Código do Projeto" column (Provas module). Default false. */
  showCodigoProjeto?: boolean;
  /** Whether to include contests with status "Finalizado". Default false. */
  includeFinalizados?: boolean;
}

export function ConcursosListContent({ showActions = true, showCodigoProjeto = false, includeFinalizados = false }: ConcursosListContentProps) {
  const { data: concursos = [], isLoading } = useConcursos();
  const deleteConcurso = useDeleteConcurso();
  const updateConcurso = useUpdateConcurso();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [idFilter, setIdFilter] = useState('');
  const [idSortOrder, setIdSortOrder] = useState<'desc' | 'asc'>('desc');
  const [editingCodigoId, setEditingCodigoId] = useState<string | null>(null);
  const [codigoInput, setCodigoInput] = useState('');

  const filteredConcursos = concursos
    .filter((c) => includeFinalizados || c.status !== 'Finalizado')
    .filter(
      (c) =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.cidade.toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => !idFilter || c.concurso_id.toLowerCase().includes(idFilter.toLowerCase()))
    .sort((a, b) => {
      const idA = parseInt(a.concurso_id.replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(b.concurso_id.replace(/\D/g, ''), 10) || 0;
      return idSortOrder === 'desc' ? idB - idA : idA - idB;
    });

  const finalizadosCount = concursos.filter((c) => c.status === 'Finalizado').length;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConcurso.mutateAsync(deleteId);
      toast.success('Concurso excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir concurso');
    }
    setDeleteId(null);
  };

  const openCodigoEditor = (id: string, current: string | null) => {
    setEditingCodigoId(id);
    setCodigoInput(current ?? '');
  };

  const saveCodigo = async (id: string) => {
    try {
      await updateConcurso.mutateAsync({ id, cod_projeto: codigoInput.trim() || null });
      toast.success('Código do projeto salvo!');
      setEditingCodigoId(null);
    } catch (error) {
      toast.error('Erro ao salvar código do projeto');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Concursos</h1>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to="/concursos/finalizados">
                  <Archive className="mr-2 h-4 w-4" />
                  Finalizados {finalizadosCount > 0 && `(${finalizadosCount})`}
                </Link>
              </Button>
              <Button asChild>
                <Link to="/concursos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Concurso
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Input placeholder="Buscar ID" value={idFilter} onChange={e => setIdFilter(e.target.value)} className="w-28" />
        </div>

        {isLoading ? <p className="text-muted-foreground">Carregando...</p> : filteredConcursos.length === 0 ? <p className="text-muted-foreground">Nenhum concurso encontrado</p> : <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => setIdSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  >
                    <span className="inline-flex items-center gap-1">
                      ID
                      {idSortOrder === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    </span>
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  {showCodigoProjeto && (
                    <TableHead className="text-center">
                      <span className="inline-flex items-center gap-1">
                        Código do Projeto
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Código do projeto extraído do sistema Conveniar.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    </TableHead>
                  )}
                  {showActions && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConcursos.map(concurso => <TableRow key={concurso.id}>
                    <TableCell>
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: concurso.cor }} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{concurso.concurso_id}</TableCell>
                    <TableCell className="font-medium">{concurso.nome}</TableCell>
                    <TableCell className="text-center">
                      <a
                        href={`https://cotec-fadenor.selecao.net.br/informacoes/${concurso.concurso_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="inline-flex w-28 items-center justify-center gap-1 cursor-pointer hover:bg-accent transition-colors">
                          {concurso.tipo}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </Badge>
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {concurso.cidade} - {concurso.uf}
                    </TableCell>
                    {showCodigoProjeto && (
                      <TableCell className="text-center">
                        <Popover
                          open={editingCodigoId === concurso.id}
                          onOpenChange={(open) => {
                            if (open) openCodigoEditor(concurso.id, concurso.cod_projeto ?? null);
                            else setEditingCodigoId(null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            {concurso.cod_projeto ? (
                              <Button variant="ghost" size="sm" className="font-mono text-sm h-7 px-2">
                                {concurso.cod_projeto}
                              </Button>
                            ) : (
                              <Button size="sm" className="h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="mr-1 h-3 w-3" />
                                Adicionar CÓD
                              </Button>
                            )}
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="center">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Código do Projeto (Conveniar)
                              </label>
                              <Input
                                value={codigoInput}
                                onChange={(e) => setCodigoInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCodigo(concurso.id);
                                }}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCodigoId(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => saveCodigo(concurso.id)}
                                  disabled={updateConcurso.isPending}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    )}
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/concursos/${concurso.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/concursos/${concurso.id}/editar`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(concurso.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os eventos e tarefas
              vinculados a este concurso também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
