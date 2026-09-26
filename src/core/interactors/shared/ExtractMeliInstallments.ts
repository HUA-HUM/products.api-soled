const INSTALLMENTS_CAMPAIGN_TERM_ID = 'INSTALLMENTS_CAMPAIGN';
const CAMPAIGN_PATTERN = /^(\d+)x_campaign$/;

type RawItemWithInstallments = {
  item?: {
    sale_terms?: Array<{ id?: unknown; value_name?: unknown }>;
    tags?: unknown;
  };
};

export type MeliInstallments = {
  installments_campaign: string | null;
  installments_quantity: number | null;
};

// MELI no expone las cuotas en un campo propio: vienen como sale_term
// INSTALLMENTS_CAMPAIGN (ej. "12x_campaign") y repetidas en item.tags. Sin
// campania no hay cuotas especiales y quedan en null.
export function extractMeliInstallments(rawPayload: unknown): MeliInstallments {
  const item = (rawPayload as RawItemWithInstallments | null)?.item;
  const fromSaleTerms = Array.isArray(item?.sale_terms)
    ? item.sale_terms.find((term) => term?.id === INSTALLMENTS_CAMPAIGN_TERM_ID)
        ?.value_name
    : undefined;
  const fromTags = Array.isArray(item?.tags)
    ? item.tags.find(
        (tag) => typeof tag === 'string' && CAMPAIGN_PATTERN.test(tag),
      )
    : undefined;
  const campaign = [fromSaleTerms, fromTags].find(
    (value): value is string =>
      typeof value === 'string' && CAMPAIGN_PATTERN.test(value),
  );

  if (!campaign) {
    return { installments_campaign: null, installments_quantity: null };
  }

  return {
    installments_campaign: campaign,
    installments_quantity: Number(campaign.match(CAMPAIGN_PATTERN)![1]),
  };
}
