import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Trophy,
  Tags,
  GraduationCap,
  CalendarDays,
  CircleDot,
  Briefcase,
  Award,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  ArrowLeftCircle,
  FolderOpen,
  ChevronDown,
  History,
} from 'lucide-react';
import logoSecundaria from '@/assets/logo-secundaria.png';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { to: '/provas/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/provas/concursos', icon: Trophy, label: 'Concursos' },
  { to: '/provas/pedidos', icon: ClipboardList, label: 'Pedidos de Questões' },
  { to: '/provas/calendario', icon: CalendarDays, label: 'Calendário' },
  { to: '/provas/elaboradores', icon: Users, label: 'Elaboradores' },
  { to: '/provas/certificados', icon: Award, label: 'Gerar Certificado' },
  { to: '/provas/logs', icon: History, label: 'Logs' },
];

const cadastrosItems = [
  { to: '/provas/areas', icon: Tags, label: 'Áreas de Atuação' },
  { to: '/provas/niveis', icon: GraduationCap, label: 'Níveis de Provas' },
  { to: '/provas/status', icon: CircleDot, label: 'Status da Prova' },
  { to: '/provas/cargos', icon: Briefcase, label: 'Cargos' },
];

export function ProvasSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isCollapsed, toggleCollapsed } = useSidebarContext();
  const isCadastrosActive = cadastrosItems.some((i) => location.pathname.startsWith(i.to));
  const [cadastrosOpen, setCadastrosOpen] = useState(isCadastrosActive);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden shadow-md bg-background"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full transform bg-card border-r shadow-lg transition-all duration-300 ease-in-out md:translate-x-0',
          isCollapsed ? 'w-20' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-transparent',
            isCollapsed ? 'h-16 justify-center px-2' : 'h-20 px-6'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden flex-shrink-0">
            <img src={logoSecundaria} alt="CertameFlow" className="h-10 w-10 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-foreground whitespace-nowrap">Gestão de Provas</h1>
              <p className="text-xs text-muted-foreground">CertameFlow</p>
            </div>
          )}
        </div>

        <nav
          className={cn('flex flex-col gap-0.5 overflow-y-auto', isCollapsed ? 'p-2' : 'p-3')}
          style={{ maxHeight: 'calc(100vh - 10rem)' }}
        >
          {(() => {
            const backLink = (
              <NavLink
                to="/"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors bg-muted group-hover:bg-primary/10">
                  <ArrowLeftCircle className="h-4.5 w-4.5" />
                </div>
                {!isCollapsed && <span className="text-[13px]">Módulos</span>}
              </NavLink>
            );
            if (isCollapsed) {
              return (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{backLink}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    Módulos
                  </TooltipContent>
                </Tooltip>
              );
            }
            return backLink;
          })()}

          <div className="border-b mb-1" />

          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');

            const linkContent = (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-1'
                )}
              >
                <div
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted group-hover:bg-primary/10'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4.5 w-4.5 transition-transform',
                      isActive ? '' : 'group-hover:scale-110'
                    )}
                  />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-[13px]">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.to} delayDuration={0}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}

          {(() => {
            const toggleButton = (
              <button
                key="cadastros"
                onClick={() => setCadastrosOpen(!cadastrosOpen)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  isCadastrosActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isCadastrosActive ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'
                  )}
                >
                  <FolderOpen className="h-4.5 w-4.5" />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="text-[13px]">Cadastros</span>
                    <ChevronDown
                      className={cn(
                        'ml-auto h-4 w-4 transition-transform duration-200',
                        cadastrosOpen ? 'rotate-180' : ''
                      )}
                    />
                  </>
                )}
              </button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key="cadastros" delayDuration={0}>
                  <TooltipTrigger asChild>{toggleButton}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    <div className="flex flex-col gap-1">
                      {cadastrosItems.map((si) => (
                        <NavLink
                          key={si.to}
                          to={si.to}
                          onClick={() => setIsOpen(false)}
                          className="hover:text-primary text-sm py-0.5"
                        >
                          {si.label}
                        </NavLink>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key="cadastros">
                {toggleButton}
                {cadastrosOpen && (
                  <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l-2 border-muted pl-2">
                    {cadastrosItems.map((item) => {
                      const isActive = location.pathname.startsWith(item.to);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'group flex items-center gap-2 rounded-lg text-[13px] font-medium transition-all duration-200 px-2 py-2',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t">
          <button
            onClick={toggleCollapsed}
            className={cn(
              'hidden md:flex w-full items-center justify-center gap-2 bg-muted/70 hover:bg-muted transition-colors py-3'
            )}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Fechar Barra</span>
              </>
            )}
          </button>

          <ProfileMenu isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
}
