import { SupabaseClient } from "../deps.ts";
export async function getAnanasToken(
  businessUnitId: number,
  supabaseClient: SupabaseClient
): Promise<string | null> {
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

  const clientId = result.data?.[0]?.client_id;
  const clientSecret = result.data?.[0]?.token;

  const baseUrl = Deno.env.get("ANANAS_BASE_URL");
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
  const tokenJson = await tokenResponse.json();
  return tokenJson.access_token;
}
