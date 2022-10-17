const processSupabaseSqlQuery = require("./process-sql-query");

const processSupabaseQuery = (payload, client) => {
  switch (payload.request.type) {
    case "sql-query":
      return processSupabaseSqlQuery(payload, client);
    default:
      throw new Error("Unknown request type");
  }
};

module.exports = processSupabaseQuery;
