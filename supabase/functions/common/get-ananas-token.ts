import { SupabaseClient } from "../deps.ts";
export async function getAnanasApiDetails(
  businessUnitId: number,
  supabaseClient: SupabaseClient
): Promise<{ token: string; baseUrl: string } | null> {
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

  const tokenResponse = await fetch(`${baseUrl}/iam/api/v1/auth/token`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      grantType: "CLIENT_CREDENTIALS",
      clientId,
      clientSecret,
      scope: "public_api/full_access",
    }),
  });
  console.log(
    "got token response",
    tokenResponse.status,
    tokenResponse.statusText
  );
  const tokenJson = await tokenResponse.json();
  return { token: tokenJson.access_token, baseUrl };
}
