import {
  AnanasProduct,
  UpdateAnanasProductDTO,
} from "./ananas-product.model.ts";
import { AnanasPrice } from "./ananas-price.model.ts";
import { ErpProduct } from "./erp-product.model.ts";

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
  token: string,
  products: AnanasProduct[]
): Promise<AnanasPrice[]> => {
  const ananasPrices: AnanasPrice[] = [];
  const buckets = products.reduce((acc, product, index) => {
    const bucketIndex = Math.floor(index / 100);
    if (!acc[bucketIndex]) {
      acc[bucketIndex] = [];
    }
    acc[bucketIndex].push(product.id);
    return acc;
  }, [] as number[][]);
  console.log(`sorted ananas products into: ${buckets.length} buckets!`);

  for (const bucket of buckets) {
    const idx = buckets.indexOf(bucket);
    console.log(`calling bucket ${idx} of ${buckets.length}`);
    const response = await fetch(
      `${Deno.env.get(
        "ANANAS_BASE_URL"
      )}/payment/api/v1/merchant-integration/prices?dateFrom=${"18/10/2022"}&merchantInventoryIds=${bucket.join(
        ","
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Could not get prices");
    }
    const prices = (await response.json()) as AnanasPrice[];
    console.log(
      `pushing results (${
        prices?.length ?? "bad response"
      }) from bucket ${idx} of ${buckets.length}`
    );
    ananasPrices.push(...prices);
  }
  return ananasPrices;
};