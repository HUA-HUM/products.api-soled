export interface IUpdateFravegaStatusRepository {
  activateByRefId(refId: string): Promise<void>;
  deactivateByRefId(refId: string): Promise<void>;
}
