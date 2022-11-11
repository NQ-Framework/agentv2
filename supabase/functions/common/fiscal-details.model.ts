export type FiscalDetails = {
  companyName: string;
  checkoutOperator: string;
  esirNumber: string;
  taxDetails: TaxDetails[];
  totalTax: number;
};

export type TaxDetails = {
  mark: string;
  name: string;
  percentageRate: number;
  amount: number;
};
