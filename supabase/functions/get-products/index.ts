// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { AnanasProduct } from "../common/ananas-product.model.ts";
import { getAnanasToken } from "../common/get-ananas-token.ts";

console.log("Hello from Functions!");

serve(async (req) => {
  const reqBody = await req.json();
  console.log("zdravo živo", reqBody);
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
  console.log("odgovaram", products[0]);
  return new Response(JSON.stringify(products[0]), {
    headers: { "Content-Type": "application/json" },
  });
});

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
