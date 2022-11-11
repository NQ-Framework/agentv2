import {
  AnanasProduct,
  UpdateAnanasProductDTO,
} from "./ananas-product.model.ts";
import { AnanasPrice } from "./ananas-price.model.ts";
import { ErpProduct } from "./erp-product.model.ts";
import { format } from "https://deno.land/std@0.160.0/datetime/mod.ts";
import addDays from "https://deno.land/x/date_fns@v2.22.1/addDays/index.ts";

export const getSyncItems = (
  products: AnanasProduct[],
  erpProducts: ErpProduct[],
  currentPrices: AnanasPrice[]
): UpdateAnanasProductDTO[] => {
  const dtos: UpdateAnanasProductDTO[] = products
    .filter((p) => {
      const erpProduct = erpProducts.find((ep) => ep.acCode === p.ean);
      const ananasPrice =
        currentPrices.find((cp) => cp.merchantInventoryId === p.id) ?? null;
      return erpProduct && hasDifference(p, erpProduct, ananasPrice);
    })
    .map((p) => {
      const erpProduct = erpProducts.find((ep) => ep.acCode === p.ean);
      if (!erpProduct) {
        throw new Error("couldnt relocate erp product after filter");
      }
      return {
        basePrice: erpProduct.anSalePrice,
        id: p.id,
        oldBasePrice: p.basePrice,
        oldStockLevel: p.stockLevel,
        stockLevel: erpProduct.anStock,
      };
    });

  return dtos;
};

const hasDifference = (
  product: AnanasProduct,
  erpProduct: ErpProduct,
  ananasPrice: AnanasPrice | null
): boolean => {
  if (product.ean !== erpProduct.acCode) {
    throw new Error("comparing frogs and grandmothers");
  }
  if (product.stockLevel !== erpProduct.anStock) {
    return true;
  }
  let productPrice = product.basePrice;
  if (ananasPrice !== null) {
    productPrice = ananasPrice.basePrice;
  }

  if (productPrice !== erpProduct.anSalePrice) {
    return true;
  }

  return false;
};

export const getPrices = async (
  apiDetails: { baseUrl: string; token: string },
  products: AnanasProduct[]
): Promise<AnanasPrice[]> => {
  const ananasPrices: AnanasPrice[] = [];
  const dateString = format(addDays(new Date(), 1), "dd/MM/yyyy");
  const buckets = products.reduce((acc, product, index) => {
    const bucketIndex = Math.floor(index / 100);
    if (!acc[bucketIndex]) {
      acc[bucketIndex] = [];
    }
    acc[bucketIndex].push(product.id);
    return acc;
  }, [] as number[][]);

  for (const bucket of buckets) {
    const response = await fetch(
      `${
        apiDetails.baseUrl
      }/payment/api/v1/merchant-integration/prices?dateFrom=${dateString}&merchantInventoryIds=${bucket.join(
        ","
      )}`,
      {
        headers: {
          Authorization: `Bearer ${apiDetails.token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Could not get prices");
    }
    const prices = (await response.json()) as AnanasPrice[];
    ananasPrices.push(...prices);
  }
  return ananasPrices;
};
