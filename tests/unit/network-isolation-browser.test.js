/** @jest-environment jsdom */
const blocked = 'ISOLATED_NETWORK_BLOCKED';

test('browser network APIs fail before opening a connection', async () => {
  expect(() => new XMLHttpRequest().open('GET', 'https://example.invalid')).toThrow(blocked);
  expect(() => new WebSocket('wss://example.invalid')).toThrow(blocked);
  expect(() => new EventSource('https://example.invalid')).toThrow(blocked);
  expect(() => navigator.sendBeacon('https://example.invalid', 'test')).toThrow(blocked);
  await expect(window.fetch('https://example.invalid')).rejects.toThrow(blocked);
});

test('unmocked browser Axios calls fail while explicit test doubles work', async () => {
  const axios = require('axios');
  await expect(axios.get('/api/test')).rejects.toThrow(blocked);
  const response = { ok: true };
  const request = jest.fn().mockResolvedValue(response);
  await expect(request('/fixture')).resolves.toEqual(response);
});
