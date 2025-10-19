const DIGITS_ONLY = /\D/g;

function normalizeDocumento(value) {
  if (!value) return '';
  return String(value).replace(DIGITS_ONLY, '');
}

// Validação relaxada para ambiente acadêmico. Apenas verifica o comprimento.
function isValidCPF(value) {
  const cpf = normalizeDocumento(value);
  return cpf.length === 11;
}

// Validação relaxada para ambiente acadêmico. Apenas verifica o comprimento.
function isValidCNPJ(value) {
  const cnpj = normalizeDocumento(value);
  return cnpj.length === 14;
}

module.exports = {
  normalizeDocumento,
  isValidCPF,
  isValidCNPJ
};

