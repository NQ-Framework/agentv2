// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { AnanasProduct } from "../common/ananas-product.model.ts";
import { getSyncItems, getPrices } from "../common/ananas-service.ts";
import { ErpProduct } from "../common/erp-product.model.ts";
import { getAnanasToken } from "../common/get-ananas-token.ts";

console.log("Hello from Functions!");

serve(async (req) => {
  const erpProducts = ((await req.json()) as { result: ErpProduct[] }).result;
  const token = await getAnanasToken();

  const response = await fetch(
    Deno.env.get("ANANAS_BASE_URL") +
      "/product/api/v1/merchant-integration/products?size=2000",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const products = (await response.json()) as AnanasProduct[];
  console.log(
    `Got this many pantheon products: ${erpProducts.length} and this many ananas produts: ${products.length}`
  );

  const currentPrices = await getPrices(token, products);

  const updateItems = getSyncItems(products, erpProducts, currentPrices);
  if (!updateItems || updateItems.length === 0) {
    console.log("No items to update! 😎");
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "No items to update",
        ananasResponse: "N/A",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  console.log("Items to update are: ", updateItems);

  const updateResponse = await fetch(
    Deno.env.get("ANANAS_BASE_URL") +
      "/product/api/v1/merchant-integration/product/bulk",
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateItems),
    }
  );
  const jsonData = await updateResponse.json();
  console.log("Ananas response after update ", jsonData);

  return new Response(
    JSON.stringify({
      status: "ok",
      ananasResponse: jsonData,
      message: "Successfully called ananas api",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
