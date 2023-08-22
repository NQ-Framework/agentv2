import { AnanasProduct, UpdateAnanasItem } from "./ananas-product.model.ts";
import { AnanasPrice } from "./ananas-price.model.ts";
import { ErpProduct } from "./erp-product.model.ts";
import { format } from "https://deno.land/std@0.160.0/datetime/mod.ts";
import addDays from "https://deno.land/x/date_fns@v2.22.1/addDays/index.ts";
import { SupabaseClient } from "../deps.ts";

function matchIds(id1: string, id2: string): boolean {
  if (!id1 || !id2) {
    return false;
  }
  return id1 === id2;
}

export const getSyncItems = (
  products: AnanasProduct[],
  erpProducts: ErpProduct[],
  setUnmatchedProductsToZeroStock: boolean,
  syncStock: boolean,
  syncPrice: boolean
): UpdateAnanasItem[] => {
  const items: UpdateAnanasItem[] = [];

  for (const p of products) {
    const erpProduct =
      erpProducts.find((ep) => matchIds(ep.acCode, p.ean)) ||
      erpProducts.find((ep) => matchIds(ep.acIdent, p.sku));
    if (erpProduct) {
      if (syncStock && p.stockLevel !== erpProduct.anStock) {
        items.push({
          ean: p.ean,
          sku: p.sku,
          id: p.id,
          oldStockLevel: p.stockLevel,
          stockLevel: erpProduct.anStock,
          update: "stock",
          note: "",
        });
      }
      if (syncPrice && p.newBasePrice !== erpProduct.anSalePrice) {
        items.push({
          ean: p.ean,
          sku: p.sku,
          id: p.id,
          oldBasePrice: p.newBasePrice,
          basePrice: erpProduct.anSalePrice,
          update: "price",
          note: "",
        });
      }
    } else {
      if (syncStock && setUnmatchedProductsToZeroStock && p.stockLevel !== 0) {
        items.push({
          ean: p.ean,
          sku: p.sku,
          id: p.id,
          oldStockLevel: p.stockLevel,
          stockLevel: 0,
          update: "stock",
          note: "product not found in sync data, set stock 0 (setUnmatchedProductsToZeroStock)",
        });
      }
    }
  }

  return items;
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

export const getProductsAllPages = async (
  apiDetails: {
    baseUrl: string;
    token: string;
  },
  context?: { updateId?: string; supabaseClient?: SupabaseClient }
): Promise<AnanasProduct[]> => {
  console.log("start get all pages");
  let page = 0;
  const responseProducts: AnanasProduct[] = [];
  let lastResponseEmpty = false;
  while (!lastResponseEmpty) {
    const products = await getProductsPage(apiDetails, page, context);
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
  page = 0,
  context?: { updateId?: string; supabaseClient?: SupabaseClient }
): Promise<AnanasProduct[]> => {
  console.log("starting get page ", page);
  const requestTime = new Date();
  const requestUrl =
    apiDetails.baseUrl +
    `/product/api/v1/merchant-integration/products?size=250&page=${page}`;
  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${apiDetails.token}`,
    },
  });
  const responseTime = new Date();
  const products = (await response.json()) as AnanasProduct[];
  console.log("returning: ", products.length);
  if (context?.supabaseClient) {
    await context.supabaseClient.from("ananas_network_log").insert({
      update_id: context?.updateId ?? null,
      request_timestamp: requestTime.toUTCString(),
      request: {
        requestUrl,
      },
      response_timestamp: responseTime.toUTCString(),
      response: products,
    });
  }
  return products;
};
