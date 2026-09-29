import { describe, expect, it } from "vitest";
import { formatCPF, formatTelefone, maskCPF, maskPIS, maskTelefone, unmask } from "@/lib/masks";
import { diasDeAtraso, iniciaisDoNome, isEventoAtrasado, isEventoPausado, primeiroNome } from "@/lib/utils";

describe("máscaras de dados", () => {
  it("formata e remove a máscara de CPF", () => {
    expect(maskCPF("12345678901")).toBe("123.456.789-01");
    expect(unmask("123.456.789-01")).toBe("12345678901");
  });

  it("formata telefone fixo e celular durante a digitação", () => {
    expect(maskTelefone("38")).toBe("(38");
    expect(maskTelefone("383212")).toBe("(38) 3212");
    expect(maskTelefone("3832123456")).toBe("(38) 3212-3456");
    expect(maskTelefone("38999991234")).toBe("(38) 99999-1234");
    expect(maskTelefone("3899999123499")).toBe("(38) 99999-1234");
  });

  it("formata CPF e telefone gravados sem mexer em texto fora do padrão", () => {
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
    expect(formatTelefone("38999991234")).toBe("(38) 99999-1234");
    expect(formatTelefone("ramal 12")).toBe("ramal 12");
  });

  it("formata PIS com no máximo 11 dígitos", () => {
    expect(maskPIS("12345678901234")).toBe("123.45678.90/1");
  });

  it("identifica evento de concurso pausado", () => {
    expect(isEventoPausado({ concurso_cadastros: { status: "Pausado" } })).toBe(true);
    expect(isEventoPausado({ concurso_cadastros: { status: "Em andamento" } })).toBe(false);
  });

  it("o prazo da tarefa é o dia inteiro: o atraso conta a partir do dia seguinte", () => {
    // Datas no horário local, como a tela usa.
    expect(diasDeAtraso("2026-09-16", new Date(2026, 8, 15, 10))).toBe(0);
    expect(diasDeAtraso("2026-09-16", new Date(2026, 8, 16, 23, 59))).toBe(0);
    expect(diasDeAtraso("2026-09-16", new Date(2026, 8, 17, 0, 1))).toBe(1);
    expect(diasDeAtraso("2026-09-16", new Date(2026, 8, 19, 20))).toBe(3);
  });

  it("tarefa pendente só fica atrasada depois do seu dia, e nunca com concurso pausado", () => {
    const tarefa = { data: "2026-09-16", concluido: false };
    expect(isEventoAtrasado(tarefa, new Date(2026, 8, 16, 23))).toBe(false);
    expect(isEventoAtrasado(tarefa, new Date(2026, 8, 17, 8))).toBe(true);
    expect(isEventoAtrasado({ ...tarefa, concluido: true }, new Date(2026, 8, 17, 8))).toBe(false);
    expect(
      isEventoAtrasado({ ...tarefa, concurso_cadastros: { status: "Pausado" } }, new Date(2026, 8, 17, 8)),
    ).toBe(false);
  });

  it("monta iniciais do primeiro e último nome para o avatar", () => {
    expect(iniciaisDoNome("André Luis Caldeira")).toBe("AC");
    expect(iniciaisDoNome("maria")).toBe("M");
    expect(iniciaisDoNome("")).toBe("?");
    expect(primeiroNome("André Luis Caldeira")).toBe("André");
  });
});
