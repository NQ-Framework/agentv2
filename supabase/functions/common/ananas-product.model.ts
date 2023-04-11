export type AnanasProduct = {
  id: number;
  ean: string;
  ananasCode: string;
  name: string;
  description: string;
  brand: { id: number; name: string };
  sku: string;
  productType: string;
  categories: string[];
  basePrice: number;
  newBasePrice: number;
  vat: number;
  stockLevel: number;
  packageWeightValue: number;
  packageWeightUnit: string;
  warehouse: string;
};

export type UpdateAnanasProductDTO = {
  id: number;
  basePrice: number;
  stockLevel: number;
  oldBasePrice: number;
  oldStockLevel: number;
};
