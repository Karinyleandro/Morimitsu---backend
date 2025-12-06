export const padraoRespostaErro = (res, message = "Erro no servidor", status = 500) => {
  return res.status(status).json({ message });
};
