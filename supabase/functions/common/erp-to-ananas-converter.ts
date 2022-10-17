import { AnanasProduct } from "./ananas-product.model.ts";
import { ErpProduct } from "./erp-product.model.ts";

export const erpToAnanasConverter = (
  product: ErpProduct
): Partial<AnanasProduct> => {
  return {
    basePrice: product.anSalePrice,
    stockLevel: product.anStock,
    ean: product.acCode,
    name: product.acName,
  };
};
