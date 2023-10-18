"use strict";

if (process.env.NODE_ENV === "production") {
	module.exports = require("./state-fiber.production.js");
} else {
	module.exports = require("./state-fiber.development.js");
}
