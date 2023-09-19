import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient, SupabaseClient } from "../deps.ts";
import { v4 as uuidV4 } from "https://deno.land/std@0.82.0/uuid/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  const body = await req.json();
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );
  const uuid = uuidV4.generate();
  await supabaseClient.from("agent_query").insert({
    business_unit_id: body.businessUnitId,
    request: {
      type: body.queryType,
      query: body.query,
      params: body.params ?? [],
    },
    request_id: uuid,
  });
  const result = await getResult(uuid, supabaseClient);
  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
});

const getResult = (
  uuid: string,
  supabaseClient: SupabaseClient
): Promise<{ result: string }> => {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      const { data, error } = await supabaseClient
        .from("agent_query")
        .select("*")
        .eq("request_id", uuid)
        .single();
      if (error) {
        clearInterval(interval);
        reject(error);
        return;
      }
      if (data?.result !== null) {
        clearInterval(interval);
        resolve(data.result);
        return;
      }
      if (tries > 10) {
        clearInterval(interval);
        reject("Timeout");
        return;
      }
    }, 500);
  });
};
