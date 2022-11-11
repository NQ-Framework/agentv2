import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { AnanasProduct } from "../common/ananas-product.model.ts";
import { getSyncItems, getPrices } from "../common/ananas-service.ts";
import { AnanasUpdateResponse } from "../common/ananas-update-response.model.ts";
import { ErpProduct } from "../common/erp-product.model.ts";
import { getAnanasApiDetails } from "../common/get-ananas-token.ts";
import { LogItem } from "../common/log-item.ts";
import { createClient } from "../deps.ts";
import { v4 as uuidV4 } from "https://deno.land/std@0.82.0/uuid/mod.ts";

serve(async (req) => {
  const body = await req.json();
  console.log("received body: ", body);
  const { result: erpProducts, businessUnitId: stringbusinessUnitId } =
    body as {
      result: ErpProduct[];
      businessUnitId: string;
    };
  const businessUnitId = parseInt(stringbusinessUnitId);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );
  const adminSupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  (await supabaseClient.auth.getSession()).data.session?.access_token;

  const apiDetails = await getAnanasApiDetails(businessUnitId, supabaseClient);
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
  const products = (await response.json()) as AnanasProduct[];
  console.log(
    `Executing product sync. Got this many pantheon products: ${erpProducts.length} and this many ananas produts: ${products.length}`
  );

  const currentPrices = await getPrices(apiDetails, products);
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

  const updateDate = new Date();
  const updateId = uuidV4.generate();
  const logItems: LogItem[] = updateItems.map((item) => ({
    created_at: updateDate,
    update_id: updateId,
    business_unit_id: businessUnitId,
    product_id: item.id,
    status: "pending",
    update_details: {
      type: "price-and-stock",
      oldPrice: item.oldBasePrice,
      newPrice: item.basePrice,
      oldStock: item.oldStockLevel,
      newStock: item.stockLevel,
    },
  }));

  let ananasResponse = null;
  try {
    const updateResponse = await fetch(
      apiDetails.baseUrl + "/product/api/v1/merchant-integration/product/bulk",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiDetails.token}`,
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

      logItems.forEach((li) => {
        li.status = "ananas api call error " + text;
      });
    } else {
      const jsonData = (await updateResponse.json()) as AnanasUpdateResponse[];
      ananasResponse = jsonData;

      jsonData.forEach((ar) => {
        const logItem = logItems.find((li) => li.product_id === ar.myProductId);
        if (logItem) {
          logItem.status = ar.status;
          logItem.update_details.ean = ar.ean;
          logItem.update_details.productName = ar.productName;
        }
      });
    }
    console.log("inserting log items", logItems);
    const { error: logInsertError } = await adminSupabaseClient
      .from("ananas_log")
      .insert(logItems);
    if (logInsertError) {
      console.error("Error inserting log items", logInsertError);
    }
    return new Response(
      JSON.stringify({
        status: "ok",
        ananasResponse: ananasResponse,
        message: "Successfully called ananas api",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    logItems.forEach((li) => {
      li.status = "ananas api call error";
    });
    console.log("inserting log items iz catcha", logItems);
    const { error: logInsertError } = await adminSupabaseClient
      .from("ananas_log")
      .insert(logItems);
    if (logInsertError) {
      console.error("Error inserting log items", logInsertError);
    }
    return new Response(
      JSON.stringify({
        status: "ok",
        ananasResponse: ananasResponse,
        message: "Error calling ananas api",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
