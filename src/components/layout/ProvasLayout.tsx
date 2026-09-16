import { ProvasSidebar } from './ProvasSidebar';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface ProvasLayoutProps {
  children: React.ReactNode;
}

export function ProvasLayout({ children }: ProvasLayoutProps) {
  const { isCollapsed } = useSidebarContext();

  return (
    <div className="min-h-screen bg-background">
      <ProvasSidebar />
      <main
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'md:ml-20' : 'md:ml-72'
        )}
      >
        <div className="w-full max-w-full px-8 py-8 pt-20 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
