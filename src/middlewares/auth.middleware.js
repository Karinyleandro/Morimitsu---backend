import jwt from "jsonwebtoken";
import prisma from '../prisma.js';

// Middleware para verificar autenticação JWT
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ message: "Token não fornecido" });

    const token = header.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    // Verifica se o token foi revogado
    const revoked = await prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
    if (revoked) return res.status(401).json({ message: "Token revogado" });

    req.user = { id: payload.sub, tipo_usuario: payload.tipo_usuario, nome: payload.nome };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro interno" });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Não autenticado" });
    if (!allowedRoles.includes(req.user.tipo_usuario))
      return res.status(403).json({ message: "Acesso negado" });
    next();
  };
}
