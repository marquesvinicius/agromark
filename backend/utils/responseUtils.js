function buildCheckResponse(entity, exists) {
  if (exists) {
    return {
      exists: true,
      id: entity.id,
      status: entity.status,
      message: `${entity.razaoSocial || entity.descricao || 'Registro'} encontrado (ID ${entity.id})`
    };
  }

  return {
    exists: false,
    message: 'Registro não encontrado'
  };
}

function conflictResponse(res, message, meta = {}) {
  return res.status(409).json({
    error: 'CONFLICT',
    message,
    meta
  });
}

module.exports = {
  buildCheckResponse,
  conflictResponse
};


