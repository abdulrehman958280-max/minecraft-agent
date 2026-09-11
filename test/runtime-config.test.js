const assert = require('node:assert/strict');
const test = require('node:test');

process.env.WEB_HOST = '0.0.0.0';
process.env.PORT = '3123';

const settings = require('../settings');
const runtime = require('../index');

test('runtime configuration loads with hosting defaults', () => {
  assert.equal(typeof settings, 'object');
  assert.equal(settings.web.host, '0.0.0.0');
  assert.equal(settings.web.port, 3123);
});

test('public server settings never expose auto-auth password', () => {
  const serialized = JSON.stringify(runtime.publicServerSettings());
  assert.equal(serialized.includes(settings.autoAuth.password), false);
});

runtime.__testOnlyClose?.();
