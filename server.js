require("dotenv").config();
const { buildApp } = require("./backend/src/app");

module.exports = buildApp();
