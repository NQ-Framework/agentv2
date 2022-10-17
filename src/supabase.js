const supabase = require("@supabase/supabase-js");
const processRequest = require("./process-query");

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
          (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
          payload.new.business_unit_id ===
            parseInt(process.env.SUPABASE_BU_ID, 10) &&
          payload.new.executed_at === null
        ) {
          console.clear();
          processRequest(payload.new, client)
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
