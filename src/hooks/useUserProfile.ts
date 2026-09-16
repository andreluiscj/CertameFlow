import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Usuario } from '@/types/database';

export type UserProfile = Pick<Usuario, 'id' | 'nome' | 'email' | 'setor' | 'nivel_acesso' | 'modulos'>;

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, setor, nivel_acesso, modulos')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
