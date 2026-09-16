import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLogsAtividades, type ModuloLogs } from '@/hooks/useLogsAtividades';
import { SearchableSelect } from '@/components/ui/searchable-select';

const TODOS = '__todos__';

/** Nome de cada ação na tela e a cor do selo. */
const ACOES: Record<string, { rotulo: string; classe: string }> = {
  criou: { rotulo: 'Criação', classe: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  importou: { rotulo: 'Importação', classe: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
  alterou: { rotulo: 'Alteração', classe: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  excluiu: { rotulo: 'Exclusão', classe: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  concluiu: { rotulo: 'Conclusão', classe: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  desconcluiu: { rotulo: 'Conclusão desfeita', classe: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  finalizou: { rotulo: 'Finalização', classe: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  vinculou: { rotulo: 'Vínculo', classe: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  desvinculou: { rotulo: 'Vínculo removido', classe: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  encerrou: { rotulo: 'Encerramento', classe: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  reabriu: { rotulo: 'Reabertura', classe: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
  emitiu: { rotulo: 'Emissão', classe: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
};

const rotuloDaAcao = (acao: string) => ACOES[acao]?.rotulo ?? acao;

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  modulo: ModuloLogs;
}

/** Tela de registros de atividade (quem fez o quê e quando) de um módulo. */
export function LogsAtividadesContent({ modulo }: Props) {
  const { data: logs = [], isLoading, isFetching, refetch } = useLogsAtividades(modulo);
  const [busca, setBusca] = useState('');
  const [acao, setAcao] = useState(TODOS);
  const [usuario, setUsuario] = useState(TODOS);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const acoesPresentes = useMemo(
    () => [...new Set(logs.map((l) => l.acao))].sort((a, b) => rotuloDaAcao(a).localeCompare(rotuloDaAcao(b), 'pt-BR')),
    [logs],
  );
  const usuariosPresentes = useMemo(
    () =>
      [...new Set(logs.map((l) => l.usuario_nome ?? 'Sistema'))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [logs],
  );

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    return logs.filter((l) => {
      if (acao !== TODOS && l.acao !== acao) return false;
      if (usuario !== TODOS && (l.usuario_nome ?? 'Sistema') !== usuario) return false;
      // created_at vem em UTC; o dia é comparado no fuso de quem está vendo.
      const dia = format(parseISO(l.created_at), 'yyyy-MM-dd');
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;
      return !termo || semAcento(l.descricao).includes(termo);
    });
  }, [logs, busca, acao, usuario, de, ate]);

  const temFiltro = busca || acao !== TODOS || usuario !== TODOS || de || ate;

  const limparFiltros = () => {
    setBusca('');
    setAcao(TODOS);
    setUsuario(TODOS);
    setDe('');
    setAte('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Logs</h1>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_11rem_13rem_9.5rem_9.5rem]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar na descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <SearchableSelect
          aria-label="Filtrar por ação"
          value={acao}
          onValueChange={setAcao}
          options={[
            { value: TODOS, label: 'Todas as ações' },
            ...acoesPresentes.map((a) => ({ value: a, label: rotuloDaAcao(a) })),
          ]}
          searchPlaceholder="Pesquisar ação..."
        />
        <SearchableSelect
          aria-label="Filtrar por usuário"
          value={usuario}
          onValueChange={setUsuario}
          options={[
            { value: TODOS, label: 'Todos os usuários' },
            ...usuariosPresentes.map((u) => ({ value: u, label: u })),
          ]}
          searchPlaceholder="Pesquisar usuário..."
        />
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-label="De" title="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" title="Até" />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filtrados.length} {filtrados.length === 1 ? 'registro' : 'registros'}
          {temFiltro ? ` de ${logs.length}` : ''}
        </span>
        {temFiltro && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={limparFiltros}>
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Data e hora</TableHead>
              <TableHead className="w-48">Usuário</TableHead>
              <TableHead className="w-40">Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  {logs.length === 0 ? 'Nenhuma atividade registrada ainda.' : 'Nenhum registro com esses filtros.'}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {format(parseISO(l.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.usuario_nome ?? <span className="text-muted-foreground">Sistema</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('font-medium', ACOES[l.acao]?.classe)}>
                      {rotuloDaAcao(l.acao)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.descricao}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
