import { useAuth } from '@/contexts/AuthContext';
import DefinirNovaSenhaPage from '@/pages/DefinirNovaSenhaPage';
import LoginPage from '@/pages/LoginPage';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Senha provisória: nenhuma outra tela abre até o usuário definir a própria senha.
  if (user.app_metadata?.trocar_senha === true) {
    return <DefinirNovaSenhaPage />;
  }

  return <>{children}</>;
}
