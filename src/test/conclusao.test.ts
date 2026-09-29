import { describe, expect, it } from "vitest";
import { descreverConclusao } from "@/lib/conclusao";

// Datas montadas no horário local, como a tela faz, para o teste não depender do fuso da máquina.
const local = (dia: number, hora: number, minuto = 0) => new Date(2026, 8, dia, hora, minuto);
const tarefa = (concluidaEm: Date, nome: string | null = "André Luis Caldeira") => ({
  data: "2026-09-16",
  hora: "08:00:00",
  concluido: true,
  concluido_por_nome: nome,
  concluido_em: concluidaEm.toISOString(),
});

describe("descrição da conclusão", () => {
  it("tarefa das 08:00 concluída às 16:47 do mesmo dia está no prazo", () => {
    expect(descreverConclusao(tarefa(local(16, 16, 47)))).toEqual({
      autor: "André Luis Caldeira",
      quando: "16/09/2026 às 16:47",
      atraso: null,
    });
    expect(descreverConclusao(tarefa(new Date(2026, 8, 16, 23, 59)))?.atraso).toBeNull();
  });

  it("concluída depois do dia da tarefa mostra os dias de atraso", () => {
    expect(descreverConclusao(tarefa(local(17, 0, 30)))?.atraso).toBe("1 dia");
    expect(descreverConclusao(tarefa(local(19, 9)))?.atraso).toBe("3 dias");
  });

  it("pendente, ou concluída antes do registro de autoria, não mostra nada", () => {
    expect(descreverConclusao({ ...tarefa(local(16, 9)), concluido: false })).toBeNull();
    expect(descreverConclusao({ ...tarefa(local(16, 9)), concluido_em: null })).toBeNull();
  });

  it("sem nome gravado, mostra só quando", () => {
    expect(descreverConclusao(tarefa(local(15, 7), null))).toMatchObject({ autor: null, atraso: null });
  });
});
