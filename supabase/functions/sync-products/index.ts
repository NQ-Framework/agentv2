import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { getSyncItems, getProductsAllPages } from "../common/ananas-service.ts";
import { AnanasUpdateResponse } from "../common/ananas-update-response.model.ts";
import { ErpProduct } from "../common/erp-product.model.ts";
import { getAnanasApiDetails } from "../common/get-ananas-token.ts";
import { LogItem } from "../common/log-item.ts";
import { SupabaseClient, createClient } from "../deps.ts";
import { v4 as uuidV4 } from "https://deno.land/std@0.82.0/uuid/mod.ts";
import { UpdateAnanasItem } from "../common/ananas-product.model.ts";

serve(async (req) => {
  const updateDate = new Date();
  const updateId = uuidV4.generate();

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

  console.log("initialized supabase client");

  const apiDetails = await getAnanasApiDetails(businessUnitId, supabaseClient, {
    updateId,
  });
  console.log("got api details", apiDetails);
  if (!apiDetails) {
    return new Response(
      "Auth error or Ananas not setup for business unit id ",
      { status: 400 }
    );
  }

  const products = await getProductsAllPages(apiDetails, {
    updateId,
    supabaseClient,
  });

  console.log(
    `Executing product sync. Got this many pantheon products: ${erpProducts.length} and this many ananas produts: ${products.length}`
  );

  const updateItems = getSyncItems(
    products,
    erpProducts,
    apiDetails.configuration?.setUnmatchedProductsToZeroStock === true
  );
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

  const logItems: LogItem[] = updateItems.map((item) => {
    return {
      created_at: updateDate,
      update_id: updateId,
      business_unit_id: businessUnitId,
      product_id: item.id,
      sku: item.sku,
      ean: item.ean,
      status: "pending",
      update_details:
        item.update === "price"
          ? {
              type: "price",
              oldPrice: item.oldBasePrice,
              newPrice: item.basePrice,
              note: item.note,
            }
          : {
              type: "stock",
              oldStock: item.oldStockLevel,
              newStock: item.stockLevel,
              note: item.note,
            },
    };
  });

  const responsePrice = await updateAnanasProducts(
    "price",
    apiDetails,
    updateItems.filter((ui) => ui.update === "price"),
    logItems,
    adminSupabaseClient,
    updateId
  );
  const responseStock = await updateAnanasProducts(
    "stock",
    apiDetails,
    updateItems.filter((ui) => ui.update === "stock"),
    logItems,
    adminSupabaseClient,
    updateId
  );

  console.log("inserting log items", logItems);
  const { error: logInsertError } = await adminSupabaseClient
    .from("ananas_log")
    .insert(logItems);
  if (logInsertError) {
    console.error("Error inserting log items", logInsertError);
  }

  return new Response(
    JSON.stringify({
      priceStatus: responsePrice.status,
      stockStatus: responseStock.status,
      ananasResponsePrice: responsePrice.ananasResponse,
      ananasResposneStock: responseStock.ananasResponse,
      message: `UpdatePrice: ${responsePrice.status} UpdateStock: ${responsePrice.status}`,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});

async function updateAnanasProducts(
  type: "price" | "stock",
  apiDetails: { token: string; baseUrl: string },
  updateItems: UpdateAnanasItem[],
  logItems: LogItem[],
  adminSupabaseClient: SupabaseClient,
  updateId?: string
): Promise<{
  ananasResponse: AnanasUpdateResponse[] | null;
  status: "success" | "fail";
}> {
  let ananasResponse = null;
  const requestTime = new Date();
  const updateItemsBody = updateItems.map((ui) => {
    if (type === "price" && ui.update === "price") {
      return {
        id: ui.id,
        basePrice: ui.basePrice,
      };
    } else if (type === "stock" && ui.update === "stock") {
      return {
        id: ui.id,
        stockLevel: ui.stockLevel,
      };
    }
  });
  try {
    const updateResponse = await fetch(
      apiDetails.baseUrl + "/product/api/v1/merchant-integration/product/bulk",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiDetails.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateItemsBody),
      }
    );
    const responseTime = new Date();
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
      await adminSupabaseClient?.from("ananas_network_log").insert({
        update_id: updateId,
        request_timestamp: requestTime.toUTCString(),
        request: {
          updateItemsBody,
        },
        response_timestamp: responseTime.toUTCString(),
        response: text,
        note: "ananas update call errored",
      });
      return { ananasResponse, status: "fail" };
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
      await adminSupabaseClient?.from("ananas_network_log").insert({
        update_id: updateId,
        request_timestamp: requestTime.toUTCString(),
        request: {
          updateItemsBody,
        },
        response_timestamp: responseTime.toUTCString(),
        response: { ananasResponse },
      });
    }
    return { ananasResponse, status: "success" };
  } catch {
    logItems.forEach((li) => {
      li.status = "ananas api call error";
    });
    return { ananasResponse, status: "fail" };
  }
}
