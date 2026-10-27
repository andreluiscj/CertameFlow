import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { TAMANHO_MINIMO_SENHA } from '@/lib/senha';
import { esquecerSenhaDoLogin, senhaDoLogin } from '@/lib/senhaDoLogin';
import { supabase } from '@/lib/supabase';

/** Única tela liberada enquanto o usuário usa a senha provisória (ADR 0002). */
export default function DefinirNovaSenhaPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < TAMANHO_MINIMO_SENHA) return setErro(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    if (senha !== confirmacao) return setErro('As senhas não conferem.');

    if (senha === senhaDoLogin()) return setErro('A nova senha precisa ser diferente da senha provisória.');

    setErro('');
    setSalvando(true);
    try {
      await api.put<void>('/api/usuarios/eu/senha', { senha });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a senha.');
      setSalvando(false);
      return;
    }

    esquecerSenhaDoLogin();
    // O servidor encerra todas as sessões ao trocar a senha: é preciso entrar de novo.
    const { error } = await supabase.auth.signInWithPassword({ email: user?.email ?? '', password: senha });
    if (error) {
      await signOut();
      toast.info('Senha definida. Entre com a nova senha.');
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>Defina sua nova senha</CardTitle>
          <CardDescription>
            Você entrou com uma senha provisória. Defina a sua própria senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <div aria-live="assertive">
              {erro && (
                <Alert variant="destructive">
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
                aria-describedby="nova-senha-ajuda"
              />
              <p id="nova-senha-ajuda" className="text-xs text-muted-foreground">
                Mínimo de {TAMANHO_MINIMO_SENHA} caracteres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Salvando" /> : 'Salvar'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => { esquecerSenhaDoLogin(); void signOut(); }} disabled={salvando}>
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
