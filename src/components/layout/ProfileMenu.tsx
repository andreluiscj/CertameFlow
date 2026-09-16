import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, LogOut, Moon, Sun, User } from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface ProfileMenuProps {
  isCollapsed: boolean;
}

export function ProfileMenu({ isCollapsed }: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: profile } = useUserProfile();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameInput, setNameInput] = useState('');

  const profileName = profile?.nome || displayName;
  const profileEmail = profile?.email || user?.email;

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDisplayName(trimmed);
      localStorage.setItem('app_display_name', trimmed);
    }
    setNameDialogOpen(false);
  };

  const openNameDialog = () => {
    setNameInput(displayName);
    setNameDialogOpen(true);
  };

  if (isCollapsed) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-center py-3 text-muted-foreground hover:bg-accent transition-colors">
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {profileName || profileEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openNameDialog}>
              <User className="mr-2 h-4 w-4" />
              Alterar Nome
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              {theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Alterar Senha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
        <NameDialog open={nameDialogOpen} onOpenChange={setNameDialogOpen} nameInput={nameInput} setNameInput={setNameInput} onSave={handleSaveName} />
      </>
    );
  }

  return (
    <>
      <div className="p-4 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 hover:bg-muted transition-colors group text-left">
              <div className="flex-1 min-w-0">
                {profileName && (
                  <p className="text-xs font-semibold text-foreground truncate">{profileName}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {profileEmail ?? ''}
                </p>
              </div>
              <User className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={openNameDialog}>
              <User className="mr-2 h-4 w-4" />
              Alterar Nome
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              {theme === 'light' ? 'Modo Noturno' : 'Modo Claro'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Alterar Senha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <NameDialog open={nameDialogOpen} onOpenChange={setNameDialogOpen} nameInput={nameInput} setNameInput={setNameInput} onSave={handleSaveName} />
    </>
  );
}

function NameDialog({ open, onOpenChange, nameInput, setNameInput, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nameInput: string;
  setNameInput: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Alterar Nome
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Nome de exibição</Label>
            <Input
              id="display-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Digite seu nome"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
