const fetch = require("node-fetch");
const db = require("./db");

function processSqlQuery(payload, client) {
  const status = "success";
  const errorText = undefined;
  return db.raw(payload.request.query).then((result) => {
    if (payload.request.output === "updateTable") {
      return client
        .from("agent_query")
        .update({
          result: { status, errorText, resultSet: result },
          executed_at: new Date(),
          executed_by: 1,
        })
        .match({ id: payload.id })
        .then((p) => {
          console.log("done.", p);
        });
    }
    if (payload.request.output === "callUrl") {
      const { url } = payload.request;
      const { authHeader } = payload.request;
      const body = JSON.stringify({ result });
      return fetch(url, {
        method: "POST",
        headers: authHeader
          ? { Authorization: authHeader, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" },
        body,
      })
        .then((res) => {
          console.log("res je", res);
          return res.text();
        })
        .then((text) => {
          console.log("called api and got result: ", text);
          client
            .from("agent_query")
            .update({
              result: { status, errorText, resultSet: null },
              executed_at: new Date(),
              executed_by: 1,
            })
            .match({ id: payload.id })
            .then((p) => {
              console.log("done.", p);
            });
        });
    }
    throw new Error("invalid output type");
  });
}

module.exports = processSqlQuery;
