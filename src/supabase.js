const supabase = require("@supabase/supabase-js");
const processRequest = require("./process-query");

function init() {
  if (!process.env.SUPABASE_HOST) {
    console.log("SUPABASE_HOST not set. Disabling realtime queries.");
    return;
  }

  const businessUnitIds = process.env.SUPABASE_BU_ID.split(",").map((id) =>
    parseInt(id, 10)
  );
  const client = supabase.createClient(
    process.env.SUPABASE_HOST,
    process.env.SUPABASE_PUBLIC_KEY
  );
  client.auth.signIn({
    email: process.env.SUPABASE_USERNAME,
    password: process.env.SUPABASE_PASSWORD,
  });

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      client
        .from("agent_query")
        .on("*", (payload) => {
          if (
            (payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE") &&
            businessUnitIds.includes(payload.new.business_unit_id) &&
            payload.new.executed_at === null
          ) {
            // Received new payload for configured BU_ID:
            console.log(
              `executing new request... payload:
              ${JSON.stringify(payload, null, 2)}`
            );
            processRequest(payload.new)
              .then((result) => {
                const status = "success";
                const errorText = undefined;
                if (
                  !payload.new.request.output ||
                  payload.new.request.output === "updateTable"
                ) {
                  return client
                    .from("agent_query")
                    .update({
                      result: { status, errorText, resultSet: result },
                      executed_at: new Date(),
                      executed_by: 1,
                    })
                    .match({ id: payload.new.id });
                }

                if (payload.new.request.output === "callUrl") {
                  const { url } = payload.new.request;
                  let { authHeader } = payload.new.request;
                  if (authHeader === "inherit") {
                    authHeader = `Bearer ${client.auth.session().access_token}`;
                  }
                  const body = JSON.stringify({
                    result,
                    businessUnitId: payload.new.business_unit_id.toString(),
                  });
                  return fetch(url, {
                    method: "POST",
                    headers: authHeader
                      ? {
                          "Content-Type": "application/json",
                        }
                      : { "Content-Type": "application/json" },
                    body,
                  })
                    .then((res) => res.text())
                    .then((text) => {
                      console.log("api result: ", text);
                      client
                        .from("agent_query")
                        .update({
                          result: { status, errorText, apiResponse: text },
                          executed_at: new Date(),
                          executed_by: 1,
                        })
                        .match({ id: payload.new.id })
                        .then((res) =>
                          console.log("updated agent query response: ", res)
                        );
                    });
                }
                throw new Error(
                  `Invalid output type for supabase realtime: ${payload.new.request.output}`
                );
              })
              .then(() => {
                console.log(
                  "done processing realtime query",
                  payload.new.request_id
                );
              })
              .catch((error) => {
                console.log("failed to process realtime query", error);
              });
          }
        })
        .subscribe();
    }
  });
}

module.exports = init;
