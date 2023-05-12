const https = require("https");
const fs = require("fs");
const app = require("./app");
require("./supabase")();
require("./db");

const port = process.env.PORT || 5000;

if (process.env.USE_SELFSIGNED_CERT === "true") {
  const options = {
    key: fs.readFileSync("cert/domain.key"),
    cert: fs.readFileSync("cert/domain.crt"),
  };
  https.createServer(options, app).listen(port, () => {
    /* eslint-disable no-console */
    console.log(`Listening: https://localhost:${port}`);
    /* eslint-enable no-console */
  });
} else {
  app.listen(port, () => {
    /* eslint-disable no-console */
    console.log(`Listening: http://localhost:${port}`);
    /* eslint-enable no-console */
  });
}
