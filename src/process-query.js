const processSqlProcedure = require("./process-sql-procedure");
const processSqlQuery = require("./process-sql-query");

const processQuery = (payload) => {
  switch (payload.request.type) {
    case "sql-query":
      return processSqlQuery(payload);
    case "sql-procedure":
      return processSqlProcedure(payload);
    default:
      throw new Error("Unknown request type");
  }
};

module.exports = processQuery;
