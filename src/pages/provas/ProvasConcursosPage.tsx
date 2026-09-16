import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { ConcursosListContent } from '@/components/concursos/ConcursosListContent';

export default function ProvasConcursosPage() {
  return (
    <ProvasLayout>
      <ConcursosListContent showActions={false} showCodigoProjeto includeFinalizados />
    </ProvasLayout>
  );
}
