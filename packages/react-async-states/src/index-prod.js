'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./react-async-states.production.js');
} else {
  module.exports = require('./react-async-states.development.js');
}
