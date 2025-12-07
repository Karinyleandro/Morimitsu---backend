export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Não autenticado" });

    let tipoUsuario = req.user.tipo;

    // Regra especial: ALUNO_PROFESSOR é tratado como PROFESSOR
    if (tipoUsuario === "ALUNO_PROFESSOR") tipoUsuario = "PROFESSOR";

    if (!allowedRoles.includes(tipoUsuario)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    next();
  };
}
