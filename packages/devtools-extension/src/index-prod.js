"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./index.production.umd.js");
} else {
  module.exports = require("./index.development.umd.js");
}
