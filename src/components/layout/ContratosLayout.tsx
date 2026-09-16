import { ContratosSidebar } from './ContratosSidebar';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface ContratosLayoutProps {
  children: React.ReactNode;
}

export function ContratosLayout({ children }: ContratosLayoutProps) {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      <ContratosSidebar />
      <main
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'md:ml-20' : 'md:ml-72'
        )}
      >
        <div className="container mx-auto p-6 pt-20 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
