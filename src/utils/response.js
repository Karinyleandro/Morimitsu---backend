export const padraoRespostaErro = (res, mensagem = "Erro no servidor", status = 500) => {
  return res.status(status).json({ mensagem });
};
