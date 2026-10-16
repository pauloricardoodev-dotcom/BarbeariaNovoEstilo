/**
 * Reduz a foto no navegador antes de enviar (fotos de celular passam de 5 MB): lado maior de até 1600 px,
 * JPEG. O servidor valida e regrava de novo (remove a localização e outros metadados), então isto só
 * economiza internet; se algo falhar, envia o arquivo original.
 */
const LADO_MAXIMO = 1600;

export const reduzirFoto = async (arquivo) => {
  try {
    const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const tela = document.createElement('canvas');
    tela.width = Math.round(imagem.width * escala);
    tela.height = Math.round(imagem.height * escala);
    tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
    imagem.close?.();
    const blob = await new Promise((resolve) => tela.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo;
  }
};
