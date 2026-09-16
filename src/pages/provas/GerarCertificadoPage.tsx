import { useMemo, useRef, useState } from 'react';
import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { useElaboradores } from '@/hooks/useElaboradores';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Award,
  Check,
  ChevronsUpDown,
  Download,
  FileCheck2,
  FileText,
  IdCard,
  Loader2,
  RotateCcw,
  Sparkles,
  User,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { patchDocument, PatchType, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import bgImage from '@/assets/certificado.png';
import { useRegistrarCertificado } from '@/hooks/useCertificados';
import { SELECIONE } from '@/components/ui/searchable-select';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatCpf(cpf: string | null | undefined) {
  if (!cpf) return '___.___.___-__';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export default function GerarCertificadoPage() {
  const { data: elaboradores = [] } = useElaboradores();
  const { data: profile } = useUserProfile();
  const registrarCertificado = useRegistrarCertificado();

  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string>('');
  const [registrado, setRegistrado] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const pending = elaboradores.find((e) => e.id === pendingId);
  const confirmed = elaboradores.find((e) => e.id === confirmedId);

  const today = useMemo(() => new Date(), []);
  const dia = String(today.getDate());
  const mes = MESES[today.getMonth()];
  const anoData = String(today.getFullYear());
  const ano = anoData;

  const requestSelect = (id: string) => {
    setPendingId(id);
    setConfirmOpen(true);
  };

  const confirmSelect = () => {
    setConfirmedId(pendingId);
    setRegistrado(false);
    setConfirmOpen(false);
  };

  const reset = () => {
    setConfirmedId('');
    setPendingId('');
    setRegistrado(false);
  };

  const handleGerarCertificado = async () => {
    if (!confirmed) return;
    setGeneratingCert(true);
    try {
      await registrarCertificado.mutateAsync({
        elaborador_id: confirmed.id,
        elaborador_nome: confirmed.nome ?? '',
        elaborador_cpf: formatCpf(confirmed.cpf),
      });
      setRegistrado(true);
      toast.success('Certificado gerado e registrado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar a emissão');
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirmed) return;
    setGenerating(true);
    try {
      const res = await fetch('/templates/declaracao-elaborador.docx');
      if (!res.ok) throw new Error('Falha ao carregar o modelo');
      const buf = await res.arrayBuffer();

      const doc = await patchDocument({
        outputType: 'blob',
        data: buf,
        patches: {
          nome: { type: PatchType.PARAGRAPH, children: [new TextRun(confirmed.nome ?? '')] },
          cpf: { type: PatchType.PARAGRAPH, children: [new TextRun(formatCpf(confirmed.cpf))] },
          ano: { type: PatchType.PARAGRAPH, children: [new TextRun(ano)] },
          dia: { type: PatchType.PARAGRAPH, children: [new TextRun(dia)] },
          mes: { type: PatchType.PARAGRAPH, children: [new TextRun(mes)] },
          anoData: { type: PatchType.PARAGRAPH, children: [new TextRun(anoData)] },
        },
      });

      const safeName = (confirmed.nome ?? 'elaborador')
        .replace(/[^\w\s.-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      saveAs(doc as Blob, `Declaracao_${safeName}.docx`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar a declaração');
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!confirmed || !previewRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
      const safeName = (confirmed.nome ?? 'elaborador')
        .replace(/[^\w\s.-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      pdf.save(`Declaracao_${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar o PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const isGenerated = registrado;

  return (
    <ProvasLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Gerar Certificado</h1>
        </div>

        {!confirmed ? (
          <div className="rounded-xl border bg-card p-6 max-w-2xl">
            <div className="space-y-3">
              <Label>Selecione o Elaborador</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-11"
                  >
                    <span className="truncate text-muted-foreground">
                      {SELECIONE}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command
                    filter={(value, search) => {
                      if (!search) return 1;
                      return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                    }}
                  >
                    <CommandInput placeholder="Buscar por nome ou ID..." />
                    <CommandList>
                      <CommandEmpty>Nenhum elaborador encontrado.</CommandEmpty>
                      <CommandGroup>
                        {elaboradores.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={`${e.codigo} ${e.nome}`}
                            onSelect={() => {
                              setOpen(false);
                              requestSelect(e.id);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4 opacity-0')} />
                            <span className="font-mono text-xs text-muted-foreground mr-2">
                              {e.codigo}
                            </span>
                            {e.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {confirmed.codigo}
                    </span>
                    <span className="font-semibold text-foreground">{confirmed.nome}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CPF: {formatCpf(confirmed.cpf)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Trocar elaborador
                </Button>
                {!isGenerated ? (
                  <Button
                    onClick={handleGerarCertificado}
                    disabled={generatingCert}
                    size="sm"
                    className="gap-2"
                  >
                    {generatingCert ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Gerar Certificado
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      Registrado
                    </div>
                    <Button
                      onClick={handleGeneratePdf}
                      disabled={generatingPdf}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      {generatingPdf ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Baixar PDF
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      size="sm"
                      className="gap-2"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Baixar DOCX
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* A4 page preview */}
            <div className="flex justify-center">
              <div
                ref={previewRef}
                className="relative bg-white shadow-xl text-black"
                style={{
                  width: 'min(100%, 794px)',
                  aspectRatio: '595.45 / 841.9',
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                }}
              >
                <div
                  className="absolute"
                  style={{ top: '18.5%', left: '14.5%', right: '14.5%' }}
                >
                  <h2
                    className="text-center font-bold mb-5"
                    style={{ fontSize: 'clamp(14px, 2.1vw, 17px)' }}
                  >
                    DECLARAÇÃO
                  </h2>
                  <div
                    className="space-y-3 text-justify leading-relaxed"
                    style={{ fontSize: 'clamp(11px, 1.55vw, 13px)' }}
                  >
                    <p>
                      <span style={{ display: 'inline-block', width: '2.5em' }} />
                      Declaramos, para os devidos fins, que o(a) Professor(a){' '}
                      <strong>{confirmed.nome}</strong>, inscrito(a) no CPF nº{' '}
                      <strong>{formatCpf(confirmed.cpf)}</strong>, exerceu a função de{' '}
                      <strong>elaborador(a) de questões</strong> destinadas às provas de Concursos
                      Públicos e Processos Seletivos organizados pela CertameFlow, no ano de{' '}
                      <strong>{ano}</strong>.
                    </p>
                    <p>
                      <span style={{ display: 'inline-block', width: '2.5em' }} />
                      Declaramos, ainda, que as atividades foram desempenhadas conforme as normas e
                      diretrizes estabelecidas pela instituição.
                    </p>
                    <p>
                      <span style={{ display: 'inline-block', width: '2.5em' }} />
                      Por ser expressão da verdade, firmamos a presente declaração, assumindo
                      inteira responsabilidade pelas informações aqui prestadas, sujeitando-nos às
                      sanções administrativas, civis e penais cabíveis, na forma da legislação
                      vigente.
                    </p>
                    <p className="text-right pt-4">
                      Montes Claros, {dia} de {mes} de {anoData}.
                    </p>
                    <div className="text-center pt-12">
                      <p className="font-bold">André Luis Caldeira Jorge dos Santos</p>
                      <p>Desenvolvedor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar elaborador</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? (
                <>
                  Gerar declaração para{' '}
                  <span className="font-mono text-xs">{pending.codigo}</span> -{' '}
                  <strong className="text-foreground">{pending.nome}</strong>?
                </>
              ) : (
                'Selecione um elaborador.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSelect}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ProvasLayout>
  );
}
