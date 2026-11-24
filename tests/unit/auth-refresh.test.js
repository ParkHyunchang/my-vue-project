/** @jest-environment jsdom */

import axios from 'axios';
import api from '@/axios';
import store from '@/store';
import auth from '@/store/modules/auth';

jest.mock('@/store', () => ({
  __esModule: true,
  default: { dispatch: jest.fn(() => Promise.resolve()) },
}));
jest.mock('@/router/index.js', () => ({ syncDynamicRoutes: jest.fn() }));

function unauthorized(config, message = '인증이 필요합니다.') {
  return new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, null, {
    status: 401, data: { message }, headers: {}, config,
  });
}

function ok(config, data = {}) {
  return { status: 200, data, headers: {}, config };
}

function context() {
  return {
    commit: jest.fn(), dispatch: jest.fn(() => Promise.resolve()),
    rootGetters: { 'menu/allMenus': [] },
  };
}

let refresh;
beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/#/');
  refresh = jest.spyOn(axios, 'post');
  api.defaults.adapter = jest.fn(config => Promise.reject(unauthorized(config)));
});
afterEach(() => jest.restoreAllMocks());

test('anonymous bootstrap remains on the public home when both session and refresh return 401', async () => {
  refresh.mockRejectedValue(unauthorized({ url: '/api/auth/refresh' }));
  const ctx = context();

  expect(await auth.actions.checkAuth(ctx)).toBe(false);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(store.dispatch).toHaveBeenCalledWith('auth/logoutLocal');
  expect(ctx.commit).toHaveBeenCalledWith('LOGOUT');
  expect(window.location.hash).toBe('#/');
});

test('bootstrap still restores an expired access cookie through refresh and retains the requested route', async () => {
  window.history.replaceState(null, '', '/#/todos?category=work');
  const user = { username: 'preview', email: 'preview@example.test', role: 'USER' };
  refresh.mockResolvedValue({ status: 200 });
  api.defaults.adapter.mockImplementation(config => config._retry
    ? Promise.resolve(ok(config, user)) : Promise.reject(unauthorized(config)));
  const ctx = context();

  expect(await auth.actions.checkAuth(ctx)).toBe(true);
  expect(ctx.commit).toHaveBeenCalledWith('SET_USER', user);
  expect(ctx.dispatch).toHaveBeenCalledWith('menu/loadMenuDefinitions', null, { root: true });
  expect(ctx.dispatch).toHaveBeenCalledWith('menu/loadUserMenus', null, { root: true });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(api.defaults.adapter).toHaveBeenCalledTimes(2);
  expect(window.location.hash).toBe('#/todos?category=work');
});

test('normal protected requests still clear an expired session and navigate to login', async () => {
  window.history.replaceState(null, '', '/#/stock');
  refresh.mockRejectedValue(unauthorized({ url: '/api/auth/refresh' }));

  await expect(api.get('/api/portfolio/holdings')).rejects.toMatchObject({ response: { status: 401 } });
  expect(store.dispatch).toHaveBeenCalledWith('auth/logoutLocal');
  expect(window.location.hash).toBe('#/login');
});

test('profile reads outside bootstrap do not silently suppress expired-session navigation', async () => {
  window.history.replaceState(null, '', '/#/mypage');
  refresh.mockRejectedValue(unauthorized({ url: '/api/auth/refresh' }));

  expect(await auth.actions.fetchProfile()).toBeNull();
  expect(window.location.hash).toBe('#/login');
});

test('simultaneous 401 requests share one refresh and retry each original request once', async () => {
  let completeRefresh;
  refresh.mockImplementation(() => new Promise(resolve => { completeRefresh = resolve; }));
  api.defaults.adapter.mockImplementation(config => config._retry
    ? Promise.resolve(ok(config, { path: config.url })) : Promise.reject(unauthorized(config)));

  const requests = [api.get('/api/first'), api.get('/api/second')];
  for (let i = 0; i < 10 && !completeRefresh; i += 1) await Promise.resolve();
  expect(refresh).toHaveBeenCalledTimes(1);
  completeRefresh({ status: 200 });
  const responses = await Promise.all(requests);

  expect(responses.map(response => response.data.path)).toEqual(['/api/first', '/api/second']);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(api.defaults.adapter).toHaveBeenCalledTimes(4);
  expect(store.dispatch).not.toHaveBeenCalled();
});

test('a retry that is still unauthorized clears the session without a refresh loop', async () => {
  refresh.mockResolvedValue({ status: 200 });

  await expect(api.get('/api/protected')).rejects.toMatchObject({ response: { status: 401 } });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(api.defaults.adapter).toHaveBeenCalledTimes(2);
  expect(store.dispatch).toHaveBeenCalledWith('auth/logoutLocal');
  expect(window.location.hash).toBe('#/login');
});

test('a still-unauthorized bootstrap retry also remains anonymous on the public route', async () => {
  refresh.mockResolvedValue({ status: 200 });

  expect(await auth.actions.checkAuth(context())).toBe(false);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(api.defaults.adapter).toHaveBeenCalledTimes(2);
  expect(window.location.hash).toBe('#/');
});

test.each(['login', 'register'])('%s rejection preserves the credential error without refreshing or redirecting', async action => {
  window.history.replaceState(null, '', '/#/login');
  api.defaults.adapter.mockImplementation(config => Promise.reject(unauthorized(config, '입력한 인증 정보를 확인하세요.')));

  expect(await auth.actions[action](context(), { username: 'preview', password: 'invalid' }))
    .toEqual({ success: false, message: '입력한 인증 정보를 확인하세요.' });
  expect(refresh).not.toHaveBeenCalled();
  expect(store.dispatch).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('#/login');
});

test('an unauthorized error lacking request metadata is returned without a secondary exception', async () => {
  const error = { response: { status: 401 } };
  api.defaults.adapter.mockRejectedValue(error);

  await expect(api.get('/api/protected')).rejects.toBe(error);
  expect(refresh).not.toHaveBeenCalled();
  expect(store.dispatch).not.toHaveBeenCalled();
});
