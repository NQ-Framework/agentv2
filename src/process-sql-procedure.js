const db = require("./db");

function processSqlProcedure(payload) {
  return db.raw(payload.request.query, payload.request.params);
}

module.exports = processSqlProcedure;
