const processSqlQuery = require("./process-sql-query");

const processQuery = (payload, client) => {
  switch (payload.request.type) {
    case "sql-query":
      return processSqlQuery(payload, client);
    default:
      throw new Error("Unknown request type");
  }
};

module.exports = processQuery;
