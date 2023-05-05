const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");

require("dotenv").config();

const middleware = require("./middleware");
const api = require("./api");

const app = express();

app.use(morgan("dev"));
app.use(helmet());

// allow all origins
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "🦄🌈✨👋🌎🌍🌏✨🌈🦄",
  });
});
if (process.env.API_SECRET) {
  app.use(
    "/api/v1",
    cors({
      origin: "*",
    }),
    api
  );
}

app.use(middleware.notFound);
app.use(middleware.errorHandler);

module.exports = app;
