/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { transformSync } = require('@babel/core');
const { createApp } = require('vue');

function loadComponent(name) {
  const filename = path.resolve(__dirname, '../../src/components/stock', name);
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, { id: name });
  const { code } = transformSync(script.content, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const result = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, result, result.exports);
  const template = compileTemplate({ source: descriptor.template.content, filename, id: name });
  const renderCode = transformSync(template.code, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const renderModule = { exports: {} };
  new Function('require', 'module', 'exports', renderCode)(require, renderModule, renderModule.exports);
  result.exports.default.render = renderModule.exports.render;
  return result.exports.default;
}

test('summary hides incomplete totals rather than formatting null as zero or displaying loss', () => {
  const Summary = loadComponent('PortfolioSummary.vue');
  const fmt = jest.fn(value => `${value}원`);
  const props = {
    valuationComplete: false, marketFilter: 'all', filteredHoldings: [{ symbol: 'MISSING' }],
    krHoldingsCount: 1, usHoldingsCount: 0, hasAvgPrice: true, krHasAvgPrice: true, usHasAvgPrice: false,
    fmtKRW: fmt, fmtUSD: fmt, fmtAbsPnl: fmt, pnlCls: () => '',
  };
  const host = document.createElement('div'); document.body.appendChild(host);
  const app = createApp(Summary, props);
  try {
    app.mount(host);
    expect(host.textContent).toContain('합계·손익 계산 대기');
    expect(host.textContent).not.toContain('0원');
    expect(host.textContent).not.toContain('▼');
    expect(fmt).not.toHaveBeenCalled();
  } finally { app.unmount(); host.remove(); }
});

test('chart shows unavailable state without presenting known subset as complete allocation', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const app = createApp(loadComponent('PortfolioChart.vue'), {
    valuationComplete: false, chartSegments: [], filteredHoldingsCount: 2, fmtLegVal: String,
  });
  try {
    app.mount(host);
    expect(host.textContent).toContain('확인되면 전체 비중');
    expect(host.querySelector('svg')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});
