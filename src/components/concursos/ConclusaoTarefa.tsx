import { CheckCircle2 } from 'lucide-react';
import { descreverConclusao, type TarefaComConclusao } from '@/lib/conclusao';
import { cn } from '@/lib/utils';

interface Props {
  tarefa: TarefaComConclusao;
  className?: string;
}

/** "Concluída por Fulano em 17/09/2026 às 10:32 (concluída com 1 dia de atraso)". */
export function ConclusaoTarefa({ tarefa, className }: Props) {
  const conclusao = descreverConclusao(tarefa);
  if (!conclusao) return null;

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      <CheckCircle2 className="mr-1 inline h-3 w-3 align-[-2px] text-emerald-600" aria-hidden />
      Concluída{conclusao.autor && <> por <span className="font-medium">{conclusao.autor}</span></>} em {conclusao.quando}
      {conclusao.atraso && (
        <span className="font-medium text-destructive"> (concluída com {conclusao.atraso} de atraso)</span>
      )}
    </p>
  );
}
