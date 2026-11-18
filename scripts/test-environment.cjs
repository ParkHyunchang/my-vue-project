function isolatedEnvironment(source) {
  const env = {};
  const allowed = new Set(['SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'TMPDIR', 'LOCALAPPDATA', 'TZ', 'LANG', 'LC_ALL']);
  for (const [key, value] of Object.entries(source)) {
    if (allowed.has(key.toUpperCase())) env[key] = value;
  }
  return { ...env, NODE_ENV: 'test', BABEL_ENV: 'test', VUE_APP_API_URL: 'http://isolated.invalid' };
}

module.exports = { isolatedEnvironment };
