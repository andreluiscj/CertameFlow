import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useConcurso, useUpdateConcurso } from '@/hooks/useConcursos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UFS, CORES_CONCURSO } from '@/types/database';
import { useTiposConcurso, useStatusConcurso } from '@/hooks/useOpcoes';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

const concursoSchema = z.object({
  concurso_id: z.string().min(1, 'ID do concurso é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.string().min(1, 'Tipo é obrigatório'),
  uf: z.string().min(1, 'UF é obrigatória'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  cor: z.string().min(1, 'Cor é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  observacoes: z.string().optional(),
  nota_titulo: z.boolean(),
});

type ConcursoFormData = z.infer<typeof concursoSchema>;

/**
 * Mantém na lista o valor já gravado no concurso mesmo que ele não exista
 * (ou ainda não tenha chegado) entre as opções cadastradas, para o campo
 * nunca aparecer vazio na edição.
 */
function opcoesComValorAtual(opcoes: SearchableSelectOption[], atual: string): SearchableSelectOption[] {
  if (!atual || opcoes.some((o) => o.value === atual)) return opcoes;
  return [{ value: atual, label: atual }, ...opcoes];
}

export default function EditarConcursoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: concurso, isLoading } = useConcurso(id);
  const updateConcurso = useUpdateConcurso();
  const { data: tiposConcurso = [] } = useTiposConcurso();
  const { data: statusConcurso = [] } = useStatusConcurso();

  const form = useForm<ConcursoFormData>({
    resolver: zodResolver(concursoSchema),
    defaultValues: {
      concurso_id: '',
      nome: '',
      tipo: '',
      uf: '',
      cidade: '',
      cor: CORES_CONCURSO[0],
      status: 'Em andamento',
      observacoes: '',
      nota_titulo: false,
    },
  });

  // Preenche o formulário uma única vez por concurso. Sem essa trava, cada
  // nova busca do concurso em segundo plano (p.ex. ao voltar o foco para a
  // janela) chamava form.reset e descartava o que já tinha sido alterado.
  const carregadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (concurso && carregadoRef.current !== concurso.id) {
      carregadoRef.current = concurso.id;
      form.reset({
        concurso_id: concurso.concurso_id,
        nome: concurso.nome,
        tipo: concurso.tipo,
        uf: concurso.uf,
        cidade: concurso.cidade,
        cor: concurso.cor,
        status: concurso.status || 'Em andamento',
        observacoes: concurso.observacoes || '',
        nota_titulo: concurso.nota_titulo ?? false,
      });
    }
  }, [concurso, form]);

  const onSubmit = async (data: ConcursoFormData) => {
    if (!id) return;
    try {
      const { observacoes, ...updateData } = data;
      await updateConcurso.mutateAsync({ id, ...updateData });
      toast.success('Concurso atualizado com sucesso!');
      navigate(`/concursos/${id}`);
    } catch (error) {
      toast.error('Erro ao atualizar concurso');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <p className="text-muted-foreground">Carregando...</p>
      </Layout>
    );
  }

  if (!concurso) {
    return (
      <Layout>
        <p className="text-muted-foreground">Concurso não encontrado</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/concursos/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Concurso</h1>
            <p className="text-muted-foreground">
              Atualize os dados do concurso
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Concurso</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="concurso_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID do Concurso</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CONC-2025-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Concurso</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Prefeitura de São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={opcoesComValorAtual(
                              [...tiposConcurso]
                                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                                .map((tipo) => ({ value: tipo.nome, label: tipo.nome })),
                              field.value,
                            )}
                            searchPlaceholder="Pesquisar tipo..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="uf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={UFS.map((uf) => ({ value: uf, label: uf }))}
                            searchPlaceholder="Pesquisar UF..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cor"
                    render={({ field }) => {
                      const allColors = [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                        '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
                        '#14B8A6', '#6366F1', '#A855F7', '#F43F5E',
                        '#84CC16', '#22C55E', '#0EA5E9', '#D946EF',
                      ];
                      const isCustomColor = !allColors.includes(field.value);
                      
                      return (
                        <FormItem>
                          <FormLabel>Cor</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-2 items-center">
                              {allColors.map((cor) => (
                                <button
                                  key={cor}
                                  type="button"
                                  onClick={() => field.onChange(cor)}
                                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                                    field.value === cor
                                      ? 'border-foreground scale-110'
                                      : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: cor }}
                                />
                              ))}
                              <div className="relative">
                                <input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div
                                  className={`h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center ${
                                    isCustomColor
                                      ? 'border-foreground scale-110'
                                      : 'border-muted-foreground/50 hover:scale-105'
                                  }`}
                                  style={{
                                    background: isCustomColor
                                      ? field.value
                                      : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                                  }}
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={opcoesComValorAtual(
                              [...statusConcurso]
                                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                                .map((s) => ({ value: s.nome, label: s.nome })),
                              field.value,
                            )}
                            searchPlaceholder="Pesquisar status..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nota_titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Possui Nota de Título?</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value ? 'sim' : 'nao'}
                            onValueChange={(v) => field.onChange(v === 'sim')}
                            options={[
                              { value: 'sim', label: 'Sim' },
                              { value: 'nao', label: 'Não' },
                            ]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais sobre o concurso..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={updateConcurso.isPending}>
                    {updateConcurso.isPending ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to={`/concursos/${id}`}>Cancelar</Link>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
