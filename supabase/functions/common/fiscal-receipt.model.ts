import type { FiscalArticle } from "./fiscal-article.model.ts";
import type { FiscalDetails } from "./fiscal-details.model.ts";
import type { GeneralFiscalData } from "./general-fiscal-data.model.ts";

export type FiscalReceipt = {
  generalFiscalData: GeneralFiscalData;
  articles: FiscalArticle[];
  fiscalDetails: FiscalDetails;
  qrImageUrl: string;
};
