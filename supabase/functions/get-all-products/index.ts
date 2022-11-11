import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { getAnanasApiDetails } from "../common/get-ananas-token.ts";
import { createClient } from "../deps.ts";

serve(async (req) => {
  const body = (await req.json()) as { business_unit_id: number | null };

  if (!body.business_unit_id) {
    console.error("no business unit id, exiting");
    return new Response("business_unit_id is required", { status: 400 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  const apiDetails = await getAnanasApiDetails(
    body.business_unit_id,
    supabaseClient
  );

  if (!apiDetails) {
    return new Response(
      "Auth error or Ananas not setup for business unit id ",
      { status: 400 }
    );
  }

  const response = await fetch(
    apiDetails.baseUrl +
      "/product/api/v1/merchant-integration/products?size=2000",
    {
      headers: {
        Authorization: `Bearer ${apiDetails.token}`,
      },
    }
  );
  if (!response.ok) {
    return new Response("Could not get products", { status: 500 });
  }
  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
