const db = require("./db");

const processSupabaseQuery = (payload, client) => {
  const status = "success";
  const errorText = undefined;
  console.log("db", db, db.select);
  return db.raw(payload.request.query).then((result) =>
    client
      .from("agent_query")
      .update({
        result: { status, errorText, resultSet: result },
        executed_at: new Date(),
        executed_by: 1,
      })
      .match({ id: payload.id })
      .then((p) => {
        console.log("done?", p);
      })
  );
};

module.exports = processSupabaseQuery;
