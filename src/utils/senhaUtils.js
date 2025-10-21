export function validarSenhaForte(senha) {
  if (typeof senha !== "string") return "Senha inválida";

  if (senha.length < 8)
    return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(senha))
    return "A senha deve ter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(senha))
    return "A senha deve ter pelo menos uma letra minúscula";
  if (!/\d/.test(senha))
    return "A senha deve conter pelo menos um número";
  if (!/[@$!%*?&]/.test(senha))
    return "A senha deve conter pelo menos um caractere especial (@$!%*?&)";

  return true;
}
