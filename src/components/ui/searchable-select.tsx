import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Texto padrão de todo campo selecionável sem valor escolhido. */
export const SELECIONE = '--- Selecione ---';

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Cor exibida numa bolinha antes do texto (p.ex. cor do concurso). */
  color?: string;
  /** Texto extra considerado na busca, sem aparecer na lista. */
  keywords?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  /**
   * Adiciona no topo a opção "--- Selecione ---", que devolve este valor.
   * Use em campos opcionais, para permitir limpar a escolha.
   */
  clearValue?: string;
  'aria-label'?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = SELECIONE,
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhum resultado',
  className,
  disabled,
  id,
  clearValue,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return options;
    const s = stripDiacritics(search);
    return options.filter(o => stripDiacritics(`${o.label} ${o.keywords ?? ''}`).includes(s));
  }, [options, search]);

  const selected = options.find(o => o.value === value);
  const showClear = clearValue !== undefined && !search;

  const choose = (v: string) => {
    onValueChange(v);
    setOpen(false);
    setSearch('');
  };

  const itemClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-left',
      active && 'bg-accent',
    );

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected?.color && (
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
            )}
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[12rem] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto overscroll-contain p-1">
          {showClear && (
            <button type="button" className={itemClass(value === clearValue)} onClick={() => choose(clearValue)}>
              <Check className={cn('h-4 w-4 shrink-0', value === clearValue ? 'opacity-100' : 'opacity-0')} />
              <span className="truncate text-muted-foreground">{SELECIONE}</span>
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">{emptyMessage}</p>
          ) : (
            filtered.map((o) => (
              <button key={o.value} type="button" className={itemClass(value === o.value)} onClick={() => choose(o.value)}>
                <Check className={cn('h-4 w-4 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                {o.color && <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />}
                <span className="truncate">{o.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
