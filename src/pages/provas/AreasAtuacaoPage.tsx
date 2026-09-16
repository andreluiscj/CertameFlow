import { useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { Tags, Plus, Pencil, Trash2, Upload, Download, Users } from 'lucide-react';
import { ImportAreasDialog } from '@/components/provas/ImportAreasDialog';
import { ElaboradoresDaAreaDialog } from '@/components/provas/ElaboradoresDaAreaDialog';
import { downloadXlsx } from '@/lib/xlsx-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useAreasAtuacao,
  useAreaElaboradoresCount,
  useCreateAreaAtuacao,
  useUpdateAreaAtuacao,
  useDeleteAreaAtuacao,
} from '@/hooks/useAreasAtuacao';
import type { AreaAtuacao } from '@/types/database';

export default function AreasAtuacaoPage() {
  const { data: areas = [], isLoading } = useAreasAtuacao();
  const { data: counts = {} } = useAreaElaboradoresCount();
  const createArea = useCreateAreaAtuacao();
  const updateArea = useUpdateAreaAtuacao();
  const deleteArea = useDeleteAreaAtuacao();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<AreaAtuacao | null>(null);
  const [descricao, setDescricao] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AreaAtuacao | null>(null);
  const [gerenciando, setGerenciando] = useState<AreaAtuacao | null>(null);

  const openNew = () => {
    setEditing(null);
    setDescricao('');
    setDialogOpen(true);
  };

  const openEdit = (area: AreaAtuacao) => {
    setEditing(area);
    setDescricao(area.descricao);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const value = descricao.trim();
    if (!value) return;
    if (editing) {
      await updateArea.mutateAsync({ id: editing.id, descricao: value });
    } else {
      await createArea.mutateAsync({ descricao: value });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteArea.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Tags className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Áreas de Atuação</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                downloadXlsx(
                  areas.map((a) => ({ CÓD: a.codigo, DESCRIÇÃO: a.descricao })),
                  ['CÓD', 'DESCRIÇÃO'],
                  'areas-de-atuacao.xlsx',
                )
              }
              variant="outline"
              disabled={areas.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Planilha
            </Button>
            <Button onClick={() => setImportOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar Áreas
            </Button>
            <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Área
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Cód</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-40">Elaboradores</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhuma área cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                areas.map((area) => {
                  const used = counts[area.id] ?? 0;
                  return (
                    <TableRow key={area.id}>
                      <TableCell className="font-mono text-sm">{area.codigo}</TableCell>
                      <TableCell className="font-medium">{area.descricao}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setGerenciando(area)}
                          title="Gerenciar elaboradores"
                        >
                          <Badge variant={used > 0 ? 'default' : 'secondary'} className="cursor-pointer">
                            {used} {used === 1 ? 'elaborador' : 'elaboradores'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setGerenciando(area)}
                            title="Gerenciar elaboradores"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(area)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={used > 0}
                            onClick={() => setConfirmDelete(area)}
                            title={used > 0 ? 'Há elaboradores vinculados' : 'Excluir'}
                            className="text-destructive hover:text-destructive disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Área' : 'Nova Área'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!descricao.trim() || createArea.isPending || updateArea.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir área?</AlertDialogTitle>
            <AlertDialogDescription>
              A área <strong>{confirmDelete?.descricao}</strong> será removida. Esta ação não pode ser desfeita.
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

      <ElaboradoresDaAreaDialog area={gerenciando} onClose={() => setGerenciando(null)} />

      <ImportAreasDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingDescricoes={areas.map((a) => a.descricao)}
      />
    </ProvasLayout>
  );
}
