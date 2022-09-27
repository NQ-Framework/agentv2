const knex = require("knex")({
  client: "mssql",
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
});
knex.raw("select * from test_table").then((result) => {
  console.log("res", result);
});
module.exports = knex;
