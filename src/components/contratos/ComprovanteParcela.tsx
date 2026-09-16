import { useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, Paperclip, RefreshCw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  abrirComprovante, TAMANHO_MAXIMO_COMPROVANTE, TIPOS_COMPROVANTE, useEnviarComprovante, useRemoverComprovante,
  type ContratoParcela,
} from '@/hooks/useContratos';

const tamanhoLegivel = (bytes: number | null) => {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  parcela: ContratoParcela;
}

/** Anexar, abrir, substituir ou remover o comprovante de pagamento (PDF ou foto) de uma parcela. */
export function ComprovanteParcela({ parcela }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarComprovante();
  const remover = useRemoverComprovante();
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  const selecionar = () => entrada.current?.click();

  const aoEscolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    if (!TIPOS_COMPROVANTE.includes(arquivo.type)) {
      toast.error('Envie um arquivo PDF ou uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_COMPROVANTE) {
      toast.error('O comprovante deve ter no máximo 10 MB.');
      return;
    }
    enviar.mutate({ parcelaId: parcela.id, arquivo });
  };

  const input = (
    <input
      ref={entrada}
      type="file"
      accept={TIPOS_COMPROVANTE.join(',')}
      className="hidden"
      onChange={aoEscolher}
      aria-label={`Comprovante da parcela ${parcela.ordem}`}
    />
  );

  if (enviar.isPending) {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
      </span>
    );
  }

  if (!parcela.comprovante_nome) {
    return (
      <>
        {input}
        <Button variant="outline" size="sm" onClick={selecionar} className="gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Anexar
        </Button>
      </>
    );
  }

  const Icone = parcela.comprovante_tipo === 'application/pdf' ? FileText : ImageIcon;
  const enviadoEm = parcela.comprovante_enviado_em
    ? format(parseISO(parcela.comprovante_enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '';

  return (
    <div className="flex items-center gap-1">
      {input}
      <button
        type="button"
        onClick={() => abrirComprovante(parcela.id)}
        className="flex min-w-0 max-w-[11rem] items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-primary hover:bg-primary/10"
        title={`${parcela.comprovante_nome} (${tamanhoLegivel(parcela.comprovante_tamanho)})${enviadoEm ? ` - enviado em ${enviadoEm}` : ''}`}
      >
        <Icone className="h-4 w-4 shrink-0" />
        <span className="truncate underline-offset-2 hover:underline">{parcela.comprovante_nome}</span>
      </button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={selecionar} title="Substituir comprovante">
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => setConfirmarRemocao(true)}
        disabled={remover.isPending}
        title="Remover comprovante"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <AlertDialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover comprovante?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{parcela.comprovante_nome}</strong> da parcela {parcela.ordem} será apagado. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remover.mutate(parcela.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
