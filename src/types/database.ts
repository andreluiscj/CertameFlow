export interface Database {
  public: {
    Tables: {
      concurso_cadastros: {
        Row: {
          id: string;
          concurso_id: string;
          nome: string;
          tipo: string;
          uf: string;
          cidade: string;
          cor: string;
          status: string;
          observacoes: string | null;
          nota_titulo: boolean;
          cod_projeto: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          concurso_id: string;
          nome: string;
          tipo: string;
          uf: string;
          cidade: string;
          cor?: string;
          status?: string;
          observacoes?: string | null;
          nota_titulo?: boolean;
          cod_projeto?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          concurso_id?: string;
          nome?: string;
          tipo?: string;
          uf?: string;
          cidade?: string;
          cor?: string;
          status?: string;
          observacoes?: string | null;
          nota_titulo?: boolean;
          cod_projeto?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      concurso_eventos: {
        Row: {
          id: string;
          concurso_id: string | null;
          titulo: string;
          data: string;
          hora: string | null;
          cor: string | null;
          concluido: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          concurso_id?: string | null;
          titulo: string;
          data: string;
          hora?: string | null;
          cor?: string | null;
          concluido?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          concurso_id?: string | null;
          titulo?: string;
          data?: string;
          hora?: string | null;
          cor?: string | null;
          concluido?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'concurso_eventos_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: false;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
        ];
      };
      concurso_observacoes: {
        Row: {
          id: string;
          ano: number;
          mes: number;
          conteudo: string | null;
          usuario_id: string | null;
          usuario_nome: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ano: number;
          mes: number;
          conteudo?: string | null;
          usuario_id?: string | null;
          usuario_nome?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ano?: number;
          mes?: number;
          conteudo?: string | null;
          usuario_id?: string | null;
          usuario_nome?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      concurso_tipos: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      concurso_status: {
        Row: {
          id: string;
          nome: string;
          ativo: boolean;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      provas_areas_atuacao: {
        Row: {
          id: string;
          codigo: number;
          descricao: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: number;
          descricao: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: number;
          descricao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provas_elaboradores: {
        Row: {
          id: string;
          codigo: number;
          nome: string;
          email: string | null;
          celular: string | null;
          cpf: string | null;
          data_nascimento: string | null;
          pis: string | null;
          sexo_id: string | null;
          banco_id: string | null;
          tipo_conta: string | null;
          agencia: string | null;
          conta: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: number;
          nome: string;
          email?: string | null;
          celular?: string | null;
          cpf?: string | null;
          data_nascimento?: string | null;
          pis?: string | null;
          sexo_id?: string | null;
          banco_id?: string | null;
          tipo_conta?: string | null;
          agencia?: string | null;
          conta?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: number;
          nome?: string;
          email?: string | null;
          celular?: string | null;
          cpf?: string | null;
          data_nascimento?: string | null;
          pis?: string | null;
          sexo_id?: string | null;
          banco_id?: string | null;
          tipo_conta?: string | null;
          agencia?: string | null;
          conta?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_elaboradores_sexo_id_fkey';
            columns: ['sexo_id'];
            isOneToOne: false;
            referencedRelation: 'provas_elaboradores_sexo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_elaboradores_banco_id_fkey';
            columns: ['banco_id'];
            isOneToOne: false;
            referencedRelation: 'provas_bancos';
            referencedColumns: ['id'];
          },
        ];
      };
      provas_elaboradores_sexo: {
        Row: {
          id: string;
          nome: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      provas_bancos: {
        Row: {
          id: string;
          numero: number;
          nome: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          numero: number;
          nome: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          numero?: number;
          nome?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      provas_elaborador_areas: {
        Row: {
          elaborador_id: string;
          area_id: string;
          created_at: string;
        };
        Insert: {
          elaborador_id: string;
          area_id: string;
          created_at?: string;
        };
        Update: {
          elaborador_id?: string;
          area_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_elaborador_areas_elaborador_id_fkey';
            columns: ['elaborador_id'];
            isOneToOne: false;
            referencedRelation: 'provas_elaboradores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_elaborador_areas_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'provas_areas_atuacao';
            referencedColumns: ['id'];
          },
        ];
      };
      concurso_notas_titulos: {
        Row: {
          id: string;
          concurso_id: string;
          junto_inscricoes: boolean;
          data_inicio: string | null;
          data_termino: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          concurso_id: string;
          junto_inscricoes?: boolean;
          data_inicio?: string | null;
          data_termino?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          concurso_id?: string;
          junto_inscricoes?: boolean;
          data_inicio?: string | null;
          data_termino?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'concurso_notas_titulos_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: false;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
        ];
      };
      usuarios: {
        Row: {
          id: string;
          nome: string | null;
          email: string;
          setor: string | null;
          nivel_acesso: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          email: string;
          setor?: string | null;
          nivel_acesso?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string | null;
          email?: string;
          setor?: string | null;
          nivel_acesso?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provas_niveis: {
        Row: {
          id: string;
          codigo: number;
          descricao: string;
          valor_questao: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: number;
          descricao: string;
          valor_questao?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: number;
          descricao?: string;
          valor_questao?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provas_status: {
        Row: {
          id: string;
          codigo: number;
          descricao: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: number;
          descricao: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: number;
          descricao?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provas_cadastro: {
        Row: {
          id: string;
          concurso_id: string;
          codigo: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          concurso_id: string;
          codigo: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          concurso_id?: string;
          codigo?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_cadastro_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: false;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
        ];
      };
      provas_cargos: {
        Row: {
          id: string;
          codigo: number;
          descricao: string;
          concurso_id: string | null;
          prova_id: string | null;
          nivel_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          codigo?: number;
          descricao: string;
          concurso_id?: string | null;
          prova_id?: string | null;
          nivel_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          codigo?: number;
          descricao?: string;
          concurso_id?: string | null;
          prova_id?: string | null;
          nivel_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_cargos_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: false;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_cargos_prova_id_fkey';
            columns: ['prova_id'];
            isOneToOne: false;
            referencedRelation: 'provas_cadastro';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_cargos_nivel_id_fkey';
            columns: ['nivel_id'];
            isOneToOne: false;
            referencedRelation: 'provas_niveis';
            referencedColumns: ['id'];
          },
        ];
      };
      provas_disciplinas: {
        Row: {
          id: string;
          prova_id: string;
          disciplina: string;
          tipo: string | null;
          questoes: number;
          total_questoes_prova: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prova_id: string;
          disciplina: string;
          tipo?: string | null;
          questoes?: number;
          total_questoes_prova?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prova_id?: string;
          disciplina?: string;
          tipo?: string | null;
          questoes?: number;
          total_questoes_prova?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_disciplinas_prova_id_fkey';
            columns: ['prova_id'];
            isOneToOne: false;
            referencedRelation: 'provas_cadastro';
            referencedColumns: ['id'];
          },
        ];
      };
      provas_disciplina_niveis: {
        Row: {
          id: string;
          disciplina_id: string;
          nivel_id: string | null;
          qtd: number;
          elaborador_id: string | null;
          status_id: string | null;
          contrato_status_id: string | null;
          contabilizar: boolean;
          prazo_entrega: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          disciplina_id: string;
          nivel_id?: string | null;
          qtd?: number;
          elaborador_id?: string | null;
          status_id?: string | null;
          contrato_status_id?: string | null;
          contabilizar?: boolean;
          prazo_entrega?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          disciplina_id?: string;
          nivel_id?: string | null;
          qtd?: number;
          elaborador_id?: string | null;
          status_id?: string | null;
          contrato_status_id?: string | null;
          contabilizar?: boolean;
          prazo_entrega?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_disciplina_niveis_disciplina_id_fkey';
            columns: ['disciplina_id'];
            isOneToOne: false;
            referencedRelation: 'provas_disciplinas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_disciplina_niveis_nivel_id_fkey';
            columns: ['nivel_id'];
            isOneToOne: false;
            referencedRelation: 'provas_niveis';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_disciplina_niveis_elaborador_id_fkey';
            columns: ['elaborador_id'];
            isOneToOne: false;
            referencedRelation: 'provas_elaboradores';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'provas_disciplina_niveis_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'provas_status';
            referencedColumns: ['id'];
          },
        ];
      };
      provas_concurso_encerramentos: {
        Row: {
          concurso_id: string;
          encerrado_em: string;
          created_at: string;
        };
        Insert: {
          concurso_id: string;
          encerrado_em?: string;
          created_at?: string;
        };
        Update: {
          concurso_id?: string;
          encerrado_em?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'provas_concurso_encerramentos_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: true;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
        ];
      };
      contrato_cliente_tipo: {
        Row: {
          id: string;
          nome: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      contrato_clientes: {
        Row: {
          id: string;
          descricao: string;
          cidade: string;
          uf: string;
          tipo_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          descricao: string;
          cidade: string;
          uf: string;
          tipo_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          descricao?: string;
          cidade?: string;
          uf?: string;
          tipo_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contrato_clientes_tipo_id_fkey';
            columns: ['tipo_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_cliente_tipo';
            referencedColumns: ['id'];
          },
        ];
      };
      contrato_responsaveis: {
        Row: {
          id: string;
          cliente_id: string;
          nome: string;
          cargo: string | null;
          email: string | null;
          telefone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          nome: string;
          cargo?: string | null;
          email?: string | null;
          telefone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          nome?: string;
          cargo?: string | null;
          email?: string | null;
          telefone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contrato_responsaveis_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_clientes';
            referencedColumns: ['id'];
          },
        ];
      };
      contrato_tipo_processo: {
        Row: {
          id: string;
          descricao: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          descricao: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          descricao?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contrato_status: {
        Row: {
          id: string;
          descricao: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          descricao: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          descricao?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contrato_parcela_status: {
        Row: {
          id: string;
          descricao: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          descricao: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          descricao?: string;
          ativo?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      contrato_conta_recebimento: {
        Row: {
          id: string;
          banco: string;
          convenio: string | null;
          conta: string | null;
          agencia: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          banco: string;
          convenio?: string | null;
          conta?: string | null;
          agencia?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          banco?: string;
          convenio?: string | null;
          conta?: string | null;
          agencia?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contrato_forma_pagamento: {
        Row: {
          id: string;
          quantidade_parcelas: number;
          valor_parcela: number;
          data_pagamento: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quantidade_parcelas?: number;
          valor_parcela?: number;
          data_pagamento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quantidade_parcelas?: number;
          valor_parcela?: number;
          data_pagamento?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contrato_cadastros: {
        Row: {
          id: string;
          cliente_id: string;
          tipo_processo_id: string;
          forma_pagamento_id: string | null;
          conta_recebimento_id: string | null;
          status_id: string;
          data_vigencia: string | null;
          valor_total: number;
          concurso_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          tipo_processo_id: string;
          forma_pagamento_id?: string | null;
          conta_recebimento_id?: string | null;
          status_id: string;
          data_vigencia?: string | null;
          valor_total?: number;
          concurso_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          tipo_processo_id?: string;
          forma_pagamento_id?: string | null;
          conta_recebimento_id?: string | null;
          status_id?: string;
          data_vigencia?: string | null;
          valor_total?: number;
          concurso_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contrato_cadastros_cliente_id_fkey';
            columns: ['cliente_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastros_tipo_processo_id_fkey';
            columns: ['tipo_processo_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_tipo_processo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastros_forma_pagamento_id_fkey';
            columns: ['forma_pagamento_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_forma_pagamento';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastros_conta_recebimento_id_fkey';
            columns: ['conta_recebimento_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_conta_recebimento';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastros_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_status';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastros_concurso_id_fkey';
            columns: ['concurso_id'];
            isOneToOne: false;
            referencedRelation: 'concurso_cadastros';
            referencedColumns: ['id'];
          },
        ];
      };
      contrato_parcelas: {
        Row: {
          id: string;
          contrato_id: string;
          ordem: number;
          percentual: number;
          data_pagamento: string | null;
          status_id: string | null;
          pago: boolean;
          data_pagamento_efetivo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contrato_id: string;
          ordem: number;
          percentual?: number;
          data_pagamento?: string | null;
          status_id?: string | null;
          pago?: boolean;
          data_pagamento_efetivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contrato_id?: string;
          ordem?: number;
          percentual?: number;
          data_pagamento?: string | null;
          status_id?: string | null;
          pago?: boolean;
          data_pagamento_efetivo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contrato_parcelas_contrato_id_fkey';
            columns: ['contrato_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_cadastros';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_parcelas_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_parcela_status';
            referencedColumns: ['id'];
          },
        ];
      };
      contrato_cadastro_responsaveis: {
        Row: {
          contrato_id: string;
          responsavel_id: string;
          created_at: string;
        };
        Insert: {
          contrato_id: string;
          responsavel_id: string;
          created_at?: string;
        };
        Update: {
          contrato_id?: string;
          responsavel_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contrato_cadastro_responsaveis_contrato_id_fkey';
            columns: ['contrato_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_cadastros';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contrato_cadastro_responsaveis_responsavel_id_fkey';
            columns: ['responsavel_id'];
            isOneToOne: false;
            referencedRelation: 'contrato_responsaveis';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type NotaTitulo = Database['public']['Tables']['concurso_notas_titulos']['Row'];
export type NotaTituloInsert = Database['public']['Tables']['concurso_notas_titulos']['Insert'];
export type NotaTituloUpdate = Database['public']['Tables']['concurso_notas_titulos']['Update'];

export type Concurso = Database['public']['Tables']['concurso_cadastros']['Row'];
export type ConcursoInsert = Database['public']['Tables']['concurso_cadastros']['Insert'];
export type ConcursoUpdate = Database['public']['Tables']['concurso_cadastros']['Update'];

export type EventoAgenda = Database['public']['Tables']['concurso_eventos']['Row'];
export type EventoAgendaInsert = Database['public']['Tables']['concurso_eventos']['Insert'];
export type EventoAgendaUpdate = Database['public']['Tables']['concurso_eventos']['Update'];

export type ObservacaoAgenda = Database['public']['Tables']['concurso_observacoes']['Row'];
export type ObservacaoAgendaInsert = Database['public']['Tables']['concurso_observacoes']['Insert'];
export type ObservacaoAgendaUpdate = Database['public']['Tables']['concurso_observacoes']['Update'];

export type ConcursoTipo = Database['public']['Tables']['concurso_tipos']['Row'];
export type ConcursoStatus = Database['public']['Tables']['concurso_status']['Row'];

export type AreaAtuacao = Database['public']['Tables']['provas_areas_atuacao']['Row'];
export type AreaAtuacaoInsert = Database['public']['Tables']['provas_areas_atuacao']['Insert'];
export type AreaAtuacaoUpdate = Database['public']['Tables']['provas_areas_atuacao']['Update'];

export type Elaborador = Database['public']['Tables']['provas_elaboradores']['Row'];
export type ElaboradorInsert = Database['public']['Tables']['provas_elaboradores']['Insert'];
export type ElaboradorUpdate = Database['public']['Tables']['provas_elaboradores']['Update'];

export type Banco = Database['public']['Tables']['provas_bancos']['Row'];
export type BancoInsert = Database['public']['Tables']['provas_bancos']['Insert'];

export type Usuario = Database['public']['Tables']['usuarios']['Row'];
export type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

export type NivelProva = Database['public']['Tables']['provas_niveis']['Row'];
export type NivelProvaInsert = Database['public']['Tables']['provas_niveis']['Insert'];
export type NivelProvaUpdate = Database['public']['Tables']['provas_niveis']['Update'];

export type StatusProva = Database['public']['Tables']['provas_status']['Row'];
export type StatusProvaInsert = Database['public']['Tables']['provas_status']['Insert'];
export type StatusProvaUpdate = Database['public']['Tables']['provas_status']['Update'];

export type ProvaCadastro = Database['public']['Tables']['provas_cadastro']['Row'];
export type ProvaCadastroInsert = Database['public']['Tables']['provas_cadastro']['Insert'];
export type ProvaCadastroUpdate = Database['public']['Tables']['provas_cadastro']['Update'];

export type CargoProva = Database['public']['Tables']['provas_cargos']['Row'];
export type CargoProvaInsert = Database['public']['Tables']['provas_cargos']['Insert'];
export type CargoProvaUpdate = Database['public']['Tables']['provas_cargos']['Update'];

export type Disciplina = Database['public']['Tables']['provas_disciplinas']['Row'];
export type DisciplinaInsert = Database['public']['Tables']['provas_disciplinas']['Insert'];
export type DisciplinaUpdate = Database['public']['Tables']['provas_disciplinas']['Update'];

export type DisciplinaNivel = Database['public']['Tables']['provas_disciplina_niveis']['Row'];
export type DisciplinaNivelInsert = Database['public']['Tables']['provas_disciplina_niveis']['Insert'];
export type DisciplinaNivelUpdate = Database['public']['Tables']['provas_disciplina_niveis']['Update'];

export type ProvaEncerramento = Database['public']['Tables']['provas_concurso_encerramentos']['Row'];


export type ContratoClienteTipo = Database['public']['Tables']['contrato_cliente_tipo']['Row'];

export type ContratoCliente = Database['public']['Tables']['contrato_clientes']['Row'];
export type ContratoClienteInsert = Database['public']['Tables']['contrato_clientes']['Insert'];
export type ContratoClienteUpdate = Database['public']['Tables']['contrato_clientes']['Update'];

export type ContratoResponsavel = Database['public']['Tables']['contrato_responsaveis']['Row'];
export type ContratoResponsavelInsert = Database['public']['Tables']['contrato_responsaveis']['Insert'];
export type ContratoResponsavelUpdate = Database['public']['Tables']['contrato_responsaveis']['Update'];

export type ContratoTipoProcesso = Database['public']['Tables']['contrato_tipo_processo']['Row'];
export type ContratoStatus = Database['public']['Tables']['contrato_status']['Row'];
export type ContratoParcelaStatus = Database['public']['Tables']['contrato_parcela_status']['Row'];

export type ContratoContaRecebimento = Database['public']['Tables']['contrato_conta_recebimento']['Row'];
export type ContratoContaRecebimentoInsert = Database['public']['Tables']['contrato_conta_recebimento']['Insert'];

export type ContratoFormaPagamento = Database['public']['Tables']['contrato_forma_pagamento']['Row'];

export type ContratoCadastro = Database['public']['Tables']['contrato_cadastros']['Row'];
export type ContratoCadastroInsert = Database['public']['Tables']['contrato_cadastros']['Insert'];
export type ContratoCadastroUpdate = Database['public']['Tables']['contrato_cadastros']['Update'];

export type ContratoParcela = Database['public']['Tables']['contrato_parcelas']['Row'];
export type ContratoParcelaUpdate = Database['public']['Tables']['contrato_parcelas']['Update'];

export type ContratoCadastroResponsavel = Database['public']['Tables']['contrato_cadastro_responsaveis']['Row'];

export const TIPOS_CONTA = ['Conta Corrente', 'Conta Poupança', 'Conta Salário', 'Conta Pagamento'] as const;

export type EventoComConcurso = EventoAgenda & {
  concurso_cadastros: Concurso | null;
};

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const CORES_CONCURSO = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
] as const;
