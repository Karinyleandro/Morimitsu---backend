export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.errors?.map(e => ({
        field: e.path.join("."),
        message: e.message
      })) || [{ message: "Erro de validação desconhecido" }];
      
      return res.status(400).json({ message: "Dados inválidos", errors });
    }

    req.body = result.data;
    next();
  };
}
