import { SupabaseClient } from "../deps.ts";
export async function getAnanasApiDetails(
  businessUnitId: number,
  supabaseClient: SupabaseClient,
  context?: { updateId?: string }
): Promise<{ token: string; baseUrl: string; configuration: any } | null> {
  const result = await supabaseClient
    .from("ananas_token")
    .select("*")
    .eq("business_unit_id", businessUnitId);

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data || result.data.length === 0) {
    return null;
  }

  const clientId: string = result.data?.[0]?.client_id;
  const clientSecret: string = result.data?.[0]?.token;
  const baseUrl: string = result.data?.[0]?.base_api_url;
  const configuration: any = result.data?.[0]?.configuration;

  const tokenRequestTime = new Date();
  const request = {
    grantType: "CLIENT_CREDENTIALS",
    clientId,
    clientSecret,
    scope: "public_api/full_access",
  };
  const tokenResponse = await fetch(`${baseUrl}/iam/api/v1/auth/token`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(request),
  });
  const tokenResponseTime = new Date();
  console.log(
    "got token response",
    tokenResponse.status,
    tokenResponse.statusText
  );
  const tokenJson = await tokenResponse.json();
  await supabaseClient.from("ananas_network_log").insert({
    update_id: context?.updateId ?? null,
    request: { configuration, baseUrl, requestBody: request },
    request_timestamp: tokenRequestTime.toUTCString(),
    response: tokenJson,
    response_timestamp: tokenResponseTime.toUTCString(),
  });
  return { token: tokenJson.access_token, baseUrl, configuration };
}
