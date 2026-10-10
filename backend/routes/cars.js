const express = require("express");
const router = express.Router();

const { getCars } = require("../controllers/carsController");

router.get("/", getCars);

module.exports = router;