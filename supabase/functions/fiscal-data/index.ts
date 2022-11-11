import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { parseFiscalHtml } from "../common/fiscal-parser.service.ts";
import { createClient } from "../deps.ts";

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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );
  const { data } = await supabaseClient.auth.getUser();
  if (!data?.user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const urlObject = new URL(req.url);
  const url = urlObject.searchParams.get("url");
  if (!url) {
    return new Response("url is required", { status: 400 });
  }

  const response = await fetch(url);
  const text = await response.text();
  try {
    const {
      generalFiscalData,
      fiscalDetails,
      articles,
      qrImageUrl,
      fiscalPrintImageUrl,
    } = await parseFiscalHtml(text);
    return new Response(
      JSON.stringify({
        generalFiscalData,
        fiscalDetails,
        articles,
        qrImageUrl,
        fiscalPrintImageUrl,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      }
    );
  } catch (e) {
    return new Response(e.message, { status: 400 });
  }
});
