export function validarCPF(cpfRaw) {
  const cpf = cpfRaw.replace(/\D/g, "");
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calc = (t) => {
    const slice = cpf.slice(0, t - 1).split("").map(Number);
    const factor = t;
    const sum = slice.reduce((acc, num, i) => acc + num * (factor - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(10);
  const d2 = calc(11);
  return d1 === +cpf[9] && d2 === +cpf[10];
}
