const db = require("./db");

function processSqlQuery(payload) {
  return db.raw(payload.request.query);
}

const fetch = require("node-fetch");
module.exports = processSqlQuery;
