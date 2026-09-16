import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAccessLevel, type ModuleKey, MODULE_MIN_LEVEL } from '@/hooks/useAccessLevel';

interface RequireLevelProps {
  children: React.ReactNode;
  module?: ModuleKey;
  minLevel?: number;
}

/**
 * Bloqueia rotas para usuários sem nível suficiente.
 * Use `module` para validar pelo módulo, ou `minLevel` para nível arbitrário.
 */
export function RequireLevel({ children, module, minLevel }: RequireLevelProps) {
  const { level, isLoading, canAccess } = useAccessLevel();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const required = module ? MODULE_MIN_LEVEL[module] : (minLevel ?? 1);
  const allowed = module ? canAccess(module) : level >= required;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
