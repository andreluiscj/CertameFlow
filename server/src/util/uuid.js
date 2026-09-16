export const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lista (possivelmente vazia) em que todo item e um UUID em texto. */
export function validarListaDeIds(ids) {
  return Array.isArray(ids) && ids.every((id) => typeof id === 'string' && FORMATO_UUID.test(id));
}
