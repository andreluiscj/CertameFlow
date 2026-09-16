import multer from 'multer';

/**
 * Recebe um unico arquivo multipart/form-data no campo informado e o deixa em
 * req.file, na memoria. O arquivo nunca e gravado no disco do servidor: o
 * service confere o conteudo e o envia direto ao Storage.
 *
 * Os erros do multer (arquivo grande demais, campo inesperado) viram 400 com
 * mensagem para o usuario, em vez de 500.
 */
export function receberArquivo(campo, tamanhoMaximo) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: tamanhoMaximo, files: 1 },
  }).single(campo);

  return (req, res, next) => {
    upload(req, res, (erro) => {
      if (!erro) {
        next();
        return;
      }
      if (erro instanceof multer.MulterError) {
        const mensagem =
          erro.code === 'LIMIT_FILE_SIZE'
            ? `O arquivo deve ter no máximo ${Math.round(tamanhoMaximo / (1024 * 1024))} MB.`
            : 'Envio de arquivo inválido.';
        res.status(400).json({ mensagem, campos: {} });
        return;
      }
      next(erro);
    });
  };
}
