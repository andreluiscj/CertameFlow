import { ContratosLayout } from '@/components/layout/ContratosLayout';
import { LogsAtividadesContent } from '@/components/logs/LogsAtividadesContent';

export default function LogsContratosPage() {
  return (
    <ContratosLayout>
      <LogsAtividadesContent modulo="contratos" />
    </ContratosLayout>
  );
}
