import { NavLink, useLocation } from 'react-router-dom';
import { useAtrasadasCount } from '@/hooks/useAtrasadas';
import { cn } from '@/lib/utils';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import {
  LayoutDashboard,
  Trophy,
  UserPen,
  FileText,
  ClipboardList,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  FolderOpen,
  Award,
  ArrowLeftCircle,
  History } from
'lucide-react';
import logoSecundaria from '@/assets/logo-secundaria.png';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
{ to: '/concursos/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
{ to: '/concursos/estatisticas', icon: BarChart3, label: 'Estatísticas' },
{ to: '/concursos', icon: Trophy, label: 'Concursos' },
{ to: '/concursos/agenda', icon: CalendarDays, label: 'Agenda' },
{ to: '/concursos/tarefas', icon: CheckSquare, label: 'Tarefas' },
{ to: '/concursos/logs', icon: History, label: 'Logs' }];

const subMenuItems = [
{ to: '/concursos/inscricoes', icon: UserPen, label: 'Inscrições' },
{ to: '/concursos/provas', icon: FileText, label: 'Provas' },
{ to: '/concursos/resultados', icon: ClipboardList, label: 'Resultados' },
{ to: '/concursos/com-titulos', icon: Award, label: 'Títulos' }];


export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isSubActive = subMenuItems.some(i => location.pathname.startsWith(i.to));
  const [subMenuOpen, setSubMenuOpen] = useState(isSubActive);
  const { isCollapsed, toggleCollapsed } = useSidebarContext();
  const atrasadasCount = useAtrasadasCount();

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 md:hidden shadow-md bg-background"
        onClick={() => setIsOpen(!isOpen)}>

        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen &&
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        onClick={() => setIsOpen(false)} />

      }

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full transform bg-card border-r shadow-lg transition-all duration-300 ease-in-out md:translate-x-0',
          isCollapsed ? 'w-20' : 'w-72',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}>

        {/* Header */}
        <div className={cn(
          "flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 to-transparent",
          isCollapsed ? "h-16 justify-center px-2" : "h-20 px-6"
        )}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden flex-shrink-0">
            <img src={logoSecundaria} alt="CertameFlow" className="h-10 w-10 object-contain" />
          </div>
          {!isCollapsed &&
          <div className="flex flex-col">
              <h1 className="text-base font-bold text-foreground whitespace-nowrap">Gestão de Concursos</h1>
              <p className="text-xs text-muted-foreground">CertameFlow</p>
            </div>
          }
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-col gap-0.5 overflow-y-auto", isCollapsed ? "p-2" : "p-3")}
          style={{ maxHeight: 'calc(100vh - 10rem)' }}>
          
          {/* Voltar à seleção */}
          {(() => {
            const backLink = (
              <NavLink
                to="/"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}>
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
                  <TooltipContent side="right" className="font-medium">Módulos</TooltipContent>
                </Tooltip>
              );
            }
            return backLink;
          })()}

          <div className="border-b mb-1" />
          {navItems.map((item) => {
            const isActive = item.to === '/concursos'
              ? location.pathname === '/concursos' || location.pathname.startsWith('/concursos/detalhes') || location.pathname.startsWith('/concursos/novo') || location.pathname.startsWith('/concursos/editar') || location.pathname === '/concursos/finalizados'
              : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

            const linkContent =
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={cn(
                'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive ?
                'bg-primary text-primary-foreground shadow-md' :
                'text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-1'
              )}>

                <div className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                isActive ?
                'bg-primary-foreground/20' :
                'bg-muted group-hover:bg-primary/10'
              )}>
                  <item.icon className={cn(
                  'h-4.5 w-4.5 transition-transform',
                  isActive ? '' : 'group-hover:scale-110'
                )} />
                   {item.to === '/concursos/tarefas' && atrasadasCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      !
                    </span>
                  )}
                </div>
                {!isCollapsed &&
              <>
                    <span className="text-[13px]">{item.label}</span>
                    {item.to === '/concursos/tarefas' && atrasadasCount > 0 && (
                      <span className="ml-auto rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground whitespace-nowrap">
                        {atrasadasCount} {atrasadasCount === 1 ? 'Tarefa atrasada' : 'Tarefas atrasadas'}
                      </span>
                    )}
                    {isActive &&
                <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                }
                  </>
              }
              </NavLink>;

            if (isCollapsed) {
              return (
                <Tooltip key={item.to} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>);
            }

            return linkContent;
          })}

          {/* Telas Específicas - Submenu */}
          {(() => {
            const toggleButton = (
              <button
                key="telas-especificas"
                onClick={() => setSubMenuOpen(!subMenuOpen)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full',
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  isSubActive ?
                  'text-primary' :
                  'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}>
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isSubActive ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'
                )}>
                  <FolderOpen className="h-4.5 w-4.5" />
                </div>
                {!isCollapsed && <>
                  <span className="text-[13px]">Telas Específicas</span>
                  <ChevronDown className={cn(
                    'ml-auto h-4 w-4 transition-transform duration-200',
                    subMenuOpen ? 'rotate-180' : ''
                  )} />
                </>}
              </button>
            );

            if (isCollapsed) {
              return (
                <Tooltip key="telas-especificas" delayDuration={0}>
                  <TooltipTrigger asChild>
                    {toggleButton}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    <div className="flex flex-col gap-1">
                      {subMenuItems.map(si => (
                        <NavLink key={si.to} to={si.to} onClick={() => setIsOpen(false)} className="hover:text-primary text-sm py-0.5">
                          {si.label}
                        </NavLink>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key="telas-especificas">
                {toggleButton}
                {subMenuOpen && (
                  <div className="ml-6 mt-0.5 flex flex-col gap-0.5 border-l-2 border-muted pl-2">
                    {subMenuItems.map((item) => {
                      const isActive = location.pathname.startsWith(item.to);
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'group flex items-center gap-2 rounded-lg text-[13px] font-medium transition-all duration-200 px-2 py-2',
                            isActive ?
                            'bg-primary text-primary-foreground shadow-md' :
                            'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}>
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t">
          {/* Collapse Toggle Button */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden md:flex w-full items-center justify-center gap-2 bg-muted/70 hover:bg-muted transition-colors py-3"
            )}>
            {isCollapsed ?
              <PanelLeft className="h-4 w-4 text-muted-foreground" /> :
              <>
                <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Fechar Barra</span>
              </>
            }
          </button>
          
          <ProfileMenu isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>);

}