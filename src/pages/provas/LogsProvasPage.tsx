import { ProvasLayout } from '@/components/layout/ProvasLayout';
import { LogsAtividadesContent } from '@/components/logs/LogsAtividadesContent';

export default function LogsProvasPage() {
  return (
    <ProvasLayout>
      <LogsAtividadesContent modulo="provas" />
    </ProvasLayout>
  );
}
