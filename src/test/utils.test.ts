import { describe, expect, it } from "vitest";
import { formatCPF, formatTelefone, maskCPF, maskPIS, maskTelefone, unmask } from "@/lib/masks";
import { iniciaisDoNome, isEventoPausado, primeiroNome } from "@/lib/utils";

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

  it("monta iniciais do primeiro e último nome para o avatar", () => {
    expect(iniciaisDoNome("André Luis Caldeira")).toBe("AC");
    expect(iniciaisDoNome("maria")).toBe("M");
    expect(iniciaisDoNome("")).toBe("?");
    expect(primeiroNome("André Luis Caldeira")).toBe("André");
  });
});
