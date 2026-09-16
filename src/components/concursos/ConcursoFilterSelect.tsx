import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Concurso } from '@/types/database';

interface ConcursoFilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  concursos: Concurso[];
}

export function ConcursoFilterSelect({ value, onValueChange, concursos }: ConcursoFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return concursos
      .filter(c => c.status !== 'Finalizado')
      .sort((a, b) => Number(a.concurso_id) - Number(b.concurso_id))
      .filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return c.concurso_id.toLowerCase().includes(s) || c.cidade.toLowerCase().includes(s);
      });
  }, [concursos, search]);

  const selected = concursos.find(c => c.id === value);
  const label = value === 'all'
    ? 'Todos os concursos'
    : selected
      ? `${selected.concurso_id} - ${selected.cidade}`
      : 'Concurso';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-56 justify-between font-normal">
          <span className="truncate flex items-center gap-2">
            {selected && value !== 'all' && (
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.cor }} />
            )}
            {label}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Buscar ID ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
              value === 'all' && 'bg-accent'
            )}
            onClick={() => { onValueChange('all'); setOpen(false); setSearch(''); }}
          >
            <Check className={cn('h-4 w-4', value === 'all' ? 'opacity-100' : 'opacity-0')} />
            Todos os concursos
          </button>
          {filtered.map(c => (
            <button
              key={c.id}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                value === c.id && 'bg-accent'
              )}
              onClick={() => { onValueChange(c.id); setOpen(false); setSearch(''); }}
            >
              <Check className={cn('h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor }} />
              <span className="truncate">{c.concurso_id} - {c.cidade}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum concurso encontrado</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
