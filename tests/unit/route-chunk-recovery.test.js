import { createChunkLoadRecovery, isChunkLoadError } from '@/utils/routeChunkRecovery';

const chunkError = () => Object.assign(new Error('Loading chunk 123 failed.'), { name: 'ChunkLoadError' });
function setup(existingStorage) {
  const values = existingStorage || new Map();
  const session = {
    getItem: jest.fn(key => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: jest.fn(key => values.delete(key)),
  };
  const deps = {
    storage: () => session, isOnline: jest.fn(() => true),
    resolveHref: jest.fn(fullPath => 'https://example.test/#' + fullPath),
    reload: jest.fn(), notify: jest.fn(),
  };
  return { values, session, deps, recovery: createChunkLoadRecovery(deps) };
}

test('a stale chunk reloads once at its destination including query and anchor', () => {
  const c = setup();
  const target = '/travel?tab=wishlist#item';
  c.recovery.navigationStarted(target);
  expect(c.recovery.handleError(chunkError(), target)).toBe(true);
  expect(c.deps.reload).toHaveBeenCalledWith('https://example.test/#/travel?tab=wishlist#item');
  const nextDocument = setup(c.values);
  nextDocument.recovery.navigationSucceeded('/');
  nextDocument.recovery.navigationStarted(target);
  nextDocument.recovery.handleError(chunkError(), target);
  expect(nextDocument.deps.reload).not.toHaveBeenCalled();
  expect(nextDocument.deps.notify).toHaveBeenCalledTimes(1);
});

test('only successful navigation to the failed destination clears the guard', () => {
  const c = setup();
  c.recovery.navigationStarted('/realestate');
  c.recovery.handleError(chunkError(), '/realestate');
  const nextDocument = setup(c.values);
  nextDocument.recovery.navigationSucceeded('/login');
  expect(c.values.size).toBe(1);
  nextDocument.recovery.navigationSucceeded('/realestate');
  expect(c.values.size).toBe(0);
});

test('application and authorization errors do not trigger reload', () => {
  const c = setup(); c.recovery.navigationStarted('/chat');
  expect(c.recovery.handleError(new Error('Forbidden'), '/chat')).toBe(false);
  expect(c.recovery.handleError(new TypeError('Cannot read properties'), '/chat')).toBe(false);
  expect(c.deps.reload).not.toHaveBeenCalled();
  expect(c.values.size).toBe(0);
});

test('an older navigation error cannot replace the latest selected destination', () => {
  const c = setup();
  c.recovery.navigationStarted('/travel');
  c.recovery.navigationStarted('/diary');
  c.recovery.handleError(chunkError(), '/travel');
  expect(c.deps.reload).not.toHaveBeenCalled();
  c.recovery.handleError(chunkError(), '/diary');
  expect(c.deps.reload).toHaveBeenCalledWith('https://example.test/#/diary');
  c.recovery.handleError(chunkError(), '/diary');
  expect(c.deps.reload).toHaveBeenCalledTimes(1);
});

test('offline failures show guidance without reloading or setting a marker', () => {
  const c = setup(); c.deps.isOnline.mockReturnValue(false);
  c.recovery.navigationStarted('/travel'); c.recovery.handleError(chunkError(), '/travel');
  expect(c.deps.reload).not.toHaveBeenCalled();
  expect(c.deps.notify).toHaveBeenCalledTimes(1);
  expect(c.values.size).toBe(0);
});

test('blocked session storage fails safely with guidance', () => {
  const c = setup(); c.session.setItem.mockImplementation(() => { throw new Error('blocked'); });
  c.recovery.navigationStarted('/travel'); c.recovery.handleError(chunkError(), '/travel');
  expect(c.deps.reload).not.toHaveBeenCalled();
  expect(c.deps.notify).toHaveBeenCalledTimes(1);
});

test('storage that silently discards writes cannot trigger repeated reloads', () => {
  const c = setup(); c.session.setItem.mockImplementation(() => {});
  c.recovery.navigationStarted('/travel'); c.recovery.handleError(chunkError(), '/travel');
  expect(c.deps.reload).not.toHaveBeenCalled();
});

test('invalid destination does not reload', () => {
  const c = setup(); c.deps.resolveHref.mockReturnValue(null);
  c.recovery.navigationStarted('/travel'); c.recovery.handleError(chunkError(), '/travel');
  expect(c.deps.reload).not.toHaveBeenCalled();
});

test.each([
  { code: 'CSS_CHUNK_LOAD_FAILED' },
  { message: 'Failed to fetch dynamically imported module: /js/123.js' },
  { message: 'Importing a module script failed.' },
])('recognizes browser asset errors %j', error => expect(isChunkLoadError(error)).toBe(true));
