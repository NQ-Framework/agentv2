import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { AnanasProduct } from "../common/ananas-product.model.ts";
import { getSyncItems, getPrices } from "../common/ananas-service.ts";
import { ErpProduct } from "../common/erp-product.model.ts";
import { getAnanasToken } from "../common/get-ananas-token.ts";
import { createClient } from "../deps.ts";

serve(async (req) => {
  const body = await req.json();
  console.log("received body: ", body);
  const { result: erpProducts, businessUnitId } = body as {
    result: ErpProduct[];
    businessUnitId: string;
  };

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  const token = await getAnanasToken(parseInt(businessUnitId), supabaseClient);
  if (!token) {
    return new Response(
      "Auth error or Ananas not setup for business unit id ",
      { status: 400 }
    );
  }

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
    `Executing product sync. Got this many pantheon products: ${erpProducts.length} and this many ananas produts: ${products.length}`
  );

  const currentPrices = await getPrices(token, products);
  console.log("Loaded current prices", currentPrices.length);

  const updateItems = getSyncItems(products, erpProducts, currentPrices);
  if (!updateItems || updateItems.length === 0) {
    console.log("No items to update! Job done");
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
  if (!updateResponse.ok) {
    const text = await updateResponse.text();
    console.error(
      "Ananas error response after update! Job done.",
      updateResponse.status,
      text
    );
  }
  const jsonData = await updateResponse.json();
  console.log("Ananas success response after update. Job done.");

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
