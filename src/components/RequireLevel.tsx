import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAccessLevel, type ModuleKey } from '@/hooks/useAccessLevel';

interface RequireLevelProps {
  children: React.ReactNode;
  module?: ModuleKey;
  adminOnly?: boolean;
}

/**
 * Bloqueia rotas para quem não tem acesso.
 * Use `module` para exigir o módulo, ou `adminOnly` para telas do administrador (nível 4).
 */
export function RequireLevel({ children, module, adminOnly = false }: RequireLevelProps) {
  const { isLoading, isAdmin, canAccess } = useAccessLevel();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allowed = adminOnly ? isAdmin : module ? canAccess(module) : true;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
