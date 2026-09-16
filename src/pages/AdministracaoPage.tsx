import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Bell, FileSignature, FileText, History, KeyRound, Loader2, Mail, Pencil, Plus, Search, Send,
  ShieldCheck, Trash2, Trophy, Users, type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogsAtividadesContent } from '@/components/logs/LogsAtividadesContent';
import { useAuth } from '@/contexts/AuthContext';
import { MODULOS, NIVEL_ADMINISTRACAO, type ModuleKey } from '@/hooks/useAccessLevel';
import {
  useAtualizarUsuario, useCriarUsuario, useEnviarNotificacoes, useExcluirUsuario, useRedefinirSenha,
  useSituacaoNotificacoes, useUsuarios, type UsuarioAdministrado,
} from '@/hooks/useAdministracao';
import { cn } from '@/lib/utils';

const TAMANHO_MINIMO_SENHA = 8;

/** Mesmos ícones e cores da tela de seleção de módulos. */
const ESTILO_MODULO: Record<ModuleKey, { icone: LucideIcon; classe: string }> = {
  contratos: { icone: FileSignature, classe: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  concursos: { icone: Trophy, classe: 'bg-primary/10 text-primary' },
  provas: { icone: FileText, classe: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
};

const CLASSE_ADMINISTRADOR = 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300';

const TODOS_OS_MODULOS = MODULOS.map((m) => m.key);

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "4 - Administrador", os módulos liberados ou "Sem acesso". */
function BadgesDeAcesso({ usuario }: { usuario: UsuarioAdministrado }) {
  if (usuario.nivel_acesso === NIVEL_ADMINISTRACAO) {
    return (
      <Badge variant="secondary" className={cn('gap-1 whitespace-nowrap', CLASSE_ADMINISTRADOR)}>
        <ShieldCheck className="h-3 w-3" />
        Administrador
      </Badge>
    );
  }

  const modulos = MODULOS.filter((m) => usuario.modulos?.includes(m.key));
  if (modulos.length === 0) {
    return (
      <Badge variant="secondary" className="whitespace-nowrap bg-slate-500/15 text-slate-700 dark:text-slate-300">
        Sem acesso
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {modulos.map(({ key, rotulo }) => {
        const { icone: Icone, classe } = ESTILO_MODULO[key];
        return (
          <Badge key={key} variant="secondary" className={cn('gap-1 whitespace-nowrap', classe)}>
            <Icone className="h-3 w-3" />
            {rotulo}
          </Badge>
        );
      })}
    </div>
  );
}

// ===================== Usuários =====================

function UsuariosTab() {
  const { user } = useAuth();
  const { data: usuarios = [], isLoading } = useUsuarios();
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();
  const redefinirSenha = useRedefinirSenha();
  const excluir = useExcluirUsuario();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdministrado | null>(null);
  const [senhaDe, setSenhaDe] = useState<UsuarioAdministrado | null>(null);
  const [excluindo, setExcluindo] = useState<UsuarioAdministrado | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [setor, setSetor] = useState('');
  const [senha, setSenha] = useState('');
  const [administrador, setAdministrador] = useState(false);
  const [modulos, setModulos] = useState<ModuleKey[]>([]);
  const [novaSenha, setNovaSenha] = useState('');

  const filtrados = useMemo(() => {
    const termo = semAcento(busca.trim());
    if (!termo) return usuarios;
    return usuarios.filter((u) => semAcento(`${u.nome ?? ''} ${u.email} ${u.setor ?? ''}`).includes(termo));
  }, [usuarios, busca]);

  const abrirNovo = () => {
    setEditando(null);
    setNome(''); setEmail(''); setSetor(''); setSenha('');
    setAdministrador(false); setModulos([]);
    setDialogAberto(true);
  };

  const abrirEdicao = (u: UsuarioAdministrado) => {
    setEditando(u);
    setNome(u.nome ?? ''); setEmail(u.email); setSetor(u.setor ?? ''); setSenha('');
    setAdministrador(u.nivel_acesso === NIVEL_ADMINISTRACAO);
    setModulos(TODOS_OS_MODULOS.filter((m) => u.modulos?.includes(m)));
    setDialogAberto(true);
  };

  const alternarModulo = (modulo: ModuleKey, marcado: boolean) =>
    setModulos((atuais) => (marcado ? [...atuais, modulo] : atuais.filter((m) => m !== modulo)));

  const editandoASiMesmo = editando?.id === user?.id;
  const podeSalvar = editando
    ? nome.trim().length > 0
    : nome.trim().length > 0 && email.trim().length > 0 && senha.length >= TAMANHO_MINIMO_SENHA;

  const salvar = async () => {
    if (!podeSalvar) return;
    // O administrador acessa tudo: a API grava a lista completa de módulos.
    const acesso = {
      nivel_acesso: administrador ? NIVEL_ADMINISTRACAO : 0,
      modulos: administrador ? TODOS_OS_MODULOS : TODOS_OS_MODULOS.filter((m) => modulos.includes(m)),
    };
    if (editando) {
      await atualizar.mutateAsync({ id: editando.id, nome: nome.trim(), setor: setor.trim(), ...acesso });
    } else {
      await criar.mutateAsync({ nome: nome.trim(), email: email.trim(), setor: setor.trim(), senha, ...acesso });
    }
    setDialogAberto(false);
  };

  const salvarSenha = async () => {
    if (!senhaDe || novaSenha.length < TAMANHO_MINIMO_SENHA) return;
    await redefinirSenha.mutateAsync({ id: senhaDe.id, senha: novaSenha });
    setSenhaDe(null);
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    await excluir.mutateAsync(excluindo.id);
    setExcluindo(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail ou setor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead className="w-28 text-center">Notificações</TableHead>
              <TableHead className="w-36 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
            ) : (
              filtrados.map((u) => {
                const souEu = u.id === user?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.nome || '-'}
                      {souEu && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.setor || '-'}</TableCell>
                    <TableCell><BadgesDeAcesso usuario={u} /></TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={u.receber_notificacoes}
                        onCheckedChange={(v) => atualizar.mutate({ id: u.id, receber_notificacoes: v })}
                        aria-label={`Notificações por e-mail de ${u.nome || u.email}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => abrirEdicao(u)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setNovaSenha(''); setSenhaDe(u); }} title="Redefinir senha">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setExcluindo(u)}
                          disabled={souEu}
                          title={souEu ? 'Você não pode excluir o seu próprio usuário' : 'Excluir'}
                          className="text-destructive hover:text-destructive"
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
            {!editando && (
              <DialogDescription>
                O usuário entra com o e-mail e a senha definidos aqui e pode trocar a senha depois, pelo menu do perfil.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="usuario-nome">Nome</Label>
              <Input id="usuario-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuario-email">E-mail</Label>
              <Input
                id="usuario-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editando}
                title={editando ? 'O e-mail de login não pode ser alterado' : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuario-setor">Setor</Label>
              <Input id="usuario-setor" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Opcional" />
            </div>
            {!editando && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="usuario-senha">Senha inicial</Label>
                <Input id="usuario-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
                <p className="text-xs text-muted-foreground">Mínimo de {TAMANHO_MINIMO_SENHA} caracteres.</p>
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Acesso</Label>
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent',
                  administrador && 'border-sky-500/40 bg-sky-500/5',
                  editandoASiMesmo && 'cursor-not-allowed opacity-70 hover:bg-transparent',
                )}
              >
                <Checkbox
                  checked={administrador}
                  onCheckedChange={(v) => setAdministrador(!!v)}
                  disabled={editandoASiMesmo}
                  className="mt-0.5"
                />
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-sky-500" />
                    Administrador
                  </p>
                  <p className="text-xs text-muted-foreground">Acessa todos os módulos e a Administração.</p>
                </div>
              </label>
              {editandoASiMesmo && (
                <p className="text-xs text-muted-foreground">Você não pode remover o seu próprio acesso de administrador.</p>
              )}

              <p className="pt-1 text-xs text-muted-foreground">
                {administrador ? 'O administrador acessa todos os módulos.' : 'Módulos que aparecem para o usuário:'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MODULOS.map(({ key, rotulo }) => {
                  const { icone: Icone } = ESTILO_MODULO[key];
                  return (
                    <label
                      key={key}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
                        administrador && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                      )}
                    >
                      <Checkbox
                        checked={administrador || modulos.includes(key)}
                        onCheckedChange={(v) => alternarModulo(key, !!v)}
                        disabled={administrador}
                      />
                      <Icone className="h-4 w-4 text-muted-foreground" />
                      {rotulo}
                    </label>
                  );
                })}
              </div>
              {!administrador && modulos.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Sem nenhum módulo marcado, o usuário entra no sistema, mas não vê nenhum módulo.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!podeSalvar || criar.isPending || atualizar.isPending}>
              {(criar.isPending || atualizar.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!senhaDe} onOpenChange={(o) => !o && setSenhaDe(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Nova senha de <strong>{senhaDe?.nome || senhaDe?.email}</strong>. Informe a senha ao usuário por um canal seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input id="nova-senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" autoFocus />
            <p className="text-xs text-muted-foreground">Mínimo de {TAMANHO_MINIMO_SENHA} caracteres.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSenhaDe(null)}>Cancelar</Button>
            <Button onClick={salvarSenha} disabled={novaSenha.length < TAMANHO_MINIMO_SENHA || redefinirSenha.isPending}>
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{excluindo?.nome || excluindo?.email}</strong> perderá o acesso ao sistema. Os registros de atividade
              dele continuam nos logs. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================== Notificações =====================

function NotificacoesTab() {
  const { data: situacao, isLoading } = useSituacaoNotificacoes();
  const { data: usuarios = [] } = useUsuarios();
  const enviar = useEnviarNotificacoes();

  // Recebem o resumo os administradores e quem tem Contratos (parcelas) ou Concursos (tarefas).
  const ativos = usuarios.filter(
    (u) =>
      u.receber_notificacoes &&
      (u.nivel_acesso === NIVEL_ADMINISTRACAO || u.modulos?.some((m) => m === 'contratos' || m === 'concursos')),
  ).length;

  if (isLoading || !situacao) {
    return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Resumo diário de atrasos</h2>
          </div>
          {situacao.configurado ? (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Ativo</Badge>
          ) : (
            <Badge variant="destructive">Não configurado</Badge>
          )}
          <p className="text-sm text-muted-foreground">
            Todo dia, a partir das {situacao.hora}h ({situacao.fusoHorario}), cada usuário com notificações ativas recebe um
            e-mail com as pendências dos módulos que pode ver: parcelas atrasadas (módulo Contratos) e tarefas atrasadas
            (módulo Concursos). O administrador recebe as duas. Quem não tem nada atrasado não recebe e-mail.
          </p>
          {!situacao.configurado && (
            <p className="text-sm text-destructive">
              Defina SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM no arquivo server/.env e reinicie a API.
            </p>
          )}
          <p className="text-sm">
            <strong>{ativos}</strong> {ativos === 1 ? 'usuário recebe' : 'usuários recebem'} as notificações.
            Ative ou desative por usuário na aba Usuários.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Envio</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Último envio automático:{' '}
            {situacao.ultimoEnvio
              ? `${format(parseISO(situacao.ultimoEnvio.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}, para ${situacao.ultimoEnvio.destinatarios} usuário(s)`
              : 'nenhum até agora'}
            .
          </p>
          <p className="text-sm text-muted-foreground">
            O botão abaixo envia o resumo de hoje imediatamente, sem esperar o horário. Não substitui o envio automático.
          </p>
          <Button onClick={() => enviar.mutate()} disabled={!situacao.configurado || enviar.isPending}>
            {enviar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar agora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Página =====================

export default function AdministracaoPage() {
  const navigate = useNavigate();
  const [aba, setAba] = useState('usuarios');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Voltar à seleção de módulos">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
            <ShieldCheck className="h-5 w-5 text-sky-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          </div>
        </div>

        <Tabs value={aba} onValueChange={setAba}>
          <TabsList>
            <TabsTrigger value="usuarios" className="gap-2"><Users className="h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="notificacoes" className="gap-2"><Bell className="h-4 w-4" />Notificações</TabsTrigger>
            <TabsTrigger value="logs" className="gap-2"><History className="h-4 w-4" />Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios" className="mt-4"><UsuariosTab /></TabsContent>
          <TabsContent value="notificacoes" className="mt-4"><NotificacoesTab /></TabsContent>
          <TabsContent value="logs" className="mt-4"><LogsAtividadesContent modulo="administracao" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
