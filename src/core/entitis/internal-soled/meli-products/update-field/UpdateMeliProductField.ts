export type UpdateMeliProductFieldRequest = {
  field: string;
  value: unknown;
};

export type UpdateMeliProductFieldResponse = {
  status?: string;
  message?: string;
  data?: unknown;
};
