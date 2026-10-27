import { Copy, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEnviarSenhaProvisoria } from '@/hooks/useAdministracao';

export interface SenhaGerada {
  usuarioId: string;
  nome: string;
  senha: string;
}

/**
 * Mostra a senha provisória uma única vez. A senha vive só nas props (estado do
 * pai) e some quando o pai limpa `gerada`; nunca vai para storage, cache ou log.
 */
export function SenhaProvisoriaDialog({ gerada, onClose }: { gerada: SenhaGerada | null; onClose: () => void }) {
  const enviar = useEnviarSenhaProvisoria();

  const fechar = () => {
    enviar.reset();
    onClose();
  };

  const copiar = async () => {
    if (!gerada) return;
    try {
      await navigator.clipboard.writeText(gerada.senha);
      toast.success('Senha copiada.');
    } catch {
      // Sem HTTPS/permissão o clipboard falha: o texto abaixo continua selecionável.
      toast.error('Não foi possível copiar. Selecione a senha e copie manualmente.');
    }
  };

  return (
    <Dialog open={!!gerada} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Senha provisória</DialogTitle>
          <DialogDescription>
            Senha de <strong>{gerada?.nome}</strong>. Ela aparece só desta vez: copie ou envie agora. No primeiro acesso, o
            usuário define a própria senha.
          </DialogDescription>
        </DialogHeader>
        <p
          data-testid="senha-provisoria"
          className="select-all rounded-lg border bg-muted px-4 py-3 text-center font-mono text-lg tracking-wide"
        >
          {gerada?.senha}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={copiar}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button
            variant="outline"
            disabled={enviar.isPending}
            onClick={() => gerada && enviar.mutate({ id: gerada.usuarioId, senha_provisoria: gerada.senha })}
          >
            {enviar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar senha via e-mail
          </Button>
          <Button onClick={fechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
