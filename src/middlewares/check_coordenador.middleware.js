import prisma from "../prisma.js"; 
export async function checkCoordenador(req) {
  const userId = req.user?.id; // aqui deve ser "id", não "sub"
  if (!userId) {
    const error = new Error("Usuário não autenticado");
    error.status = 401;
    throw error;
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario || usuario.tipo_usuario !== "COORDENADOR") {
    const error = new Error("Apenas coordenadores podem realizar esta ação");
    error.status = 403;
    throw error;
  }
}
