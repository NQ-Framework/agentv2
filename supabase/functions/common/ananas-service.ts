import {
  AnanasProduct,
  UpdateAnanasProductDTO,
} from "./ananas-product.model.ts";
import { AnanasPrice } from "./ananas-price.model.ts";
import { ErpProduct } from "./erp-product.model.ts";
import { format } from "https://deno.land/std@0.160.0/datetime/mod.ts";
import addDays from "https://deno.land/x/date_fns@v2.22.1/addDays/index.ts";

function matchIds(id1: string, id2: string): boolean {
  if (!id1 || !id2) {
    return false;
  }
  return id1 === id2;
}

export const getSyncItems = (
  products: AnanasProduct[],
  erpProducts: ErpProduct[]
): UpdateAnanasProductDTO[] => {
  const dtos: UpdateAnanasProductDTO[] = [];

  for (const p of products) {
    const erpProduct =
      erpProducts.find((ep) => matchIds(ep.acCode, p.ean)) ||
      erpProducts.find((ep) => matchIds(ep.acIdent, p.sku));
    if (erpProduct && hasDifference(p, erpProduct)) {
      dtos.push({
        basePrice: erpProduct.anSalePrice,
        id: p.id,
        oldBasePrice: p.basePrice,
        oldStockLevel: p.stockLevel,
        stockLevel: erpProduct.anStock,
      });
    }
  }

  return dtos;
};

const hasDifference = (
  product: AnanasProduct,
  erpProduct: ErpProduct
): boolean => {
  if (product.stockLevel !== erpProduct.anStock) {
    return true;
  }

  if (product.newBasePrice !== erpProduct.anSalePrice) {
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
      const body = await response.text();
      throw new Error(`Could not get prices. The parmameters were:
status: ${response.status}
code: ${response.statusText}
body: ${body}
dateString: ${dateString}
merchantInventoryIds: ${bucket.join(",")}
`);
    }
    const prices = (await response.json()) as AnanasPrice[];
    ananasPrices.push(...prices);
  }
  return ananasPrices;
};

export const getProductsAllPages = async (apiDetails: {
  baseUrl: string;
  token: string;
}): Promise<AnanasProduct[]> => {
  console.log("start get all pages");
  let page = 0;
  const responseProducts: AnanasProduct[] = [];
  let lastResponseEmpty = false;
  while (!lastResponseEmpty) {
    const products = await getProductsPage(apiDetails, page);
    if (products.length === 0) {
      lastResponseEmpty = true;
    }
    responseProducts.push(...products);
    page++;
    if (products.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  console.log("returning all pages", responseProducts.length);
  return responseProducts;
};

export const getProductsPage = async (
  apiDetails: { baseUrl: string; token: string },
  page = 0
): Promise<AnanasProduct[]> => {
  console.log("starting get page ", page);
  const response = await fetch(
    apiDetails.baseUrl +
      `/product/api/v1/merchant-integration/products?size=250&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${apiDetails.token}`,
      },
    }
  );
  const products = (await response.json()) as AnanasProduct[];
  console.log("returning: ", products.length);
  return products;
};
