"use strict";

if (process.env.NODE_ENV === "production") {
  module.exports = require("./async-states.production.js");
} else {
  module.exports = require("./async-states.development.js");
}
