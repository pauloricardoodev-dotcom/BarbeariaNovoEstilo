import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const MAX_FOTOS = 3;
const FORMATOS_ACEITOS = new Set(['jpeg', 'png', 'webp']);
const MSG_FOTO_INVALIDA = 'Foto inválida. Envie imagens JPG, PNG ou WebP.';

/**
 * Valida pelo CONTEÚDO (não pelo nome/tipo informado pelo cliente) e regrava a foto:
 * gira conforme a orientação, limita o tamanho e descarta todos os metadados (EXIF, inclusive o GPS
 * de onde a foto foi tirada). O que é gravado é sempre um WebP gerado por nós.
 */
export async function prepararFoto(original: Buffer): Promise<Buffer> {
  try {
    const entrada = sharp(original, {
      failOn: 'error',
      limitInputPixels: 60_000_000, // recusa "bombas" de descompressão
    });
    const { format } = await entrada.metadata();
    if (!format || !FORMATOS_ACEITOS.has(format)) {
      throw new BadRequestException(MSG_FOTO_INVALIDA);
    }
    return await entrada
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (erro) {
    if (erro instanceof BadRequestException) throw erro;
    throw new BadRequestException(MSG_FOTO_INVALIDA);
  }
}
