const assert = require('node:assert/strict');
const test = require('node:test');

test('runtime configuration loads', () => {
  assert.equal(typeof require('../settings'), 'object');
});
