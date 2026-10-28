// Fravega solo acepta refId sin tildes ni caracteres especiales; es el valor
// con el que se publica (BuildFravegaPayload) y con el que hay que consultar o
// actualizar despues (endpoints /fravega/*/refId/...).
export function sanitizeFravegaRefId(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '');
}
