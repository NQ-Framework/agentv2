const db = require("./db");

function processSqlQuery(payload) {
  return db.raw(payload.request.query);
}

module.exports = processSqlQuery;
