export async function getAnanasToken(): Promise<string> {
  const url = Deno.env.get("ANANAS_BASE_URL");
  const tokenResponse = await fetch(
    Deno.env.get("ANANAS_BASE_URL") + "/iam/api/v1/auth/token",
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        grantType: "CLIENT_CREDENTIALS",
        clientId: Deno.env.get("ANANAS_CLIENT_ID"),
        clientSecret: Deno.env.get("ANANAS_CLIENT_SECRET"),
        scope: "public_api/full_access",
      }),
    }
  );
  const tokenJson = await tokenResponse.json();
  return tokenJson.access_token;
}
