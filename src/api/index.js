const express = require("express");

const processQuery = require("../process-query");

const router = express.Router();

router.get("/", (req, res) => {
  const { query: queryParams, headers } = req;
  if (
    !headers.authorization ||
    !headers.authorization === `Bearer ${process.env.API_SECRET}`
  ) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { type, query } = queryParams;
  return processQuery({
    request: {
      type,
      query,
    },
  })
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      res.status(500).json({
        message: err.message,
      });
    });
});

module.exports = router;
