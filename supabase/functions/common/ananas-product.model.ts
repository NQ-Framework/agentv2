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

export type UpdateAnanasItem = {
  id: number;
  sku: string;
  ean: string;
  note: string;
} & (
  | {
      oldBasePrice: number;
      basePrice: number;
      update: "price";
    }
  | {
      oldStockLevel: number;
      stockLevel: number;
      update: "stock";
    }
);

export type UpdateAnanasProductDTO =
  | {
      id: number;
      basePrice: number;
    }
  | {
      id: number;
      stockLevel: number;
    };
