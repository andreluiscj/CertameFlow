import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useConcursos, useUpdateConcurso, useDeleteConcurso } from '@/hooks/useConcursos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { Search, Eye, Pencil, Trash2, RotateCcw, ArrowLeft, ExternalLink, ArrowUp, ArrowDown, Archive } from 'lucide-react';
import { toast } from 'sonner';

export default function ConcursosFinalizadosPage() {
  const { data: concursos = [], isLoading } = useConcursos();
  const updateConcurso = useUpdateConcurso();
  const deleteConcurso = useDeleteConcurso();
  const [search, setSearch] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [idSortOrder, setIdSortOrder] = useState<'desc' | 'asc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const finalizados = concursos
    .filter((c) => c.status === 'Finalizado')
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

  const handleReativar = async (id: string) => {
    try {
      await updateConcurso.mutateAsync({ id, status: 'Em andamento' });
      toast.success('Concurso reativado!');
    } catch (error) {
      toast.error('Erro ao reativar concurso');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/concursos">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Archive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Concursos Finalizados</h1>
                <p className="text-muted-foreground">
                  {finalizados.length} concurso(s) finalizado(s)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input placeholder="Buscar ID" value={idFilter} onChange={e => setIdFilter(e.target.value)} className="w-28" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : finalizados.length === 0 ? (
          <p className="text-muted-foreground">Nenhum concurso finalizado</p>
        ) : (
          <div className="rounded-lg border">
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalizados.map((concurso) => (
                  <TableRow key={concurso.id} className="opacity-75">
                    <TableCell>
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: concurso.cor }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {concurso.concurso_id}
                    </TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReativar(concurso.id)}
                          title="Reativar concurso"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(concurso.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
