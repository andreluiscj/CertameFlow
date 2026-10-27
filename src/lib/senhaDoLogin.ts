// Só em memória (nunca storage): a LoginPage guarda a senha digitada para a tela de
// troca recusar nova senha igual à provisória. Some ao recarregar a página.
let senha = '';

export const lembrarSenhaDoLogin = (valor: string) => { senha = valor; };
export const senhaDoLogin = () => senha;
export const esquecerSenhaDoLogin = () => { senha = ''; };
