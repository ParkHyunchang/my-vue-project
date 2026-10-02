<template>
  <aside
    class="term-guide"
    aria-label="자동매매 용어 안내"
  >
    <p><strong>상대강도</strong>는 지수보다 얼마나 더 올랐는지, <strong>ATR</strong>은 하루 가격이 흔들리는 평균 폭, <strong>1R</strong>은 매수 때 정한 1주당 손절 거리입니다.</p>
    <details>
      <summary>용어와 숫자 예시 간단히 보기</summary>
      <dl>
        <div
          v-for="term in terms"
          :key="term.name"
        >
          <dt>{{ term.name }}</dt><dd>{{ term.description }}</dd>
        </div>
      </dl>
    </details>
  </aside>
</template>

<script setup>
const terms = [
  { name: '상대강도 · %p', description: '이 전략에서는 최근 20거래일 수익률을 SPY·QQQ 중 더 많이 오른 쪽과 비교합니다. 종목 +8%, 비교 지수 +5%면 상대강도는 +3%p입니다. RSI와는 다른 지표입니다.' },
  { name: 'ATR · 평균 가격 변동폭', description: '전날 종가와의 차이까지 포함한 최근 14거래일의 하루 평균 가격 변동폭입니다. ATR이 $2이면 2 ATR은 $4입니다. 손절 거리와 추격 매수 제한에 사용합니다.' },
  { name: '1R · 초기 손절 거리', description: '진입 때 정한 1주당 손실 기준입니다. $100 매수에 초기 손절가가 $96이면 1R은 $4이고, +1R은 원가보다 $4 오른 가격입니다. 실제 손실이 이 금액으로 보장되지는 않습니다.' },
  { name: '돌파 · 이격', description: '돌파는 최근 고가를 넘어서는 것, 이격은 그 기준 가격에서 얼마나 더 올라왔는지입니다. 이격 상한으로 너무 비싸진 가격의 추격 매수를 제한합니다.' },
  { name: '추적 손절 · 청산', description: '가격이 오르면 손절 기준도 올리고, 다시 내려와 기준에 닿으면 팝니다. 청산은 보유를 파는 뜻이며 자동매매로 관리하는 수량만 대상입니다.' },
  { name: '위험 예산 · 금액 상한', description: '위험 예산은 계획한 손절까지의 손실을 기준으로 수량을 정하는 금액이고, 금액 상한은 한 번에 살 수 있는 최대 매수금액입니다. 서로 다른 제한입니다.' },
  { name: 'RVOL · 거래량 배수', description: '현재 거래량이 비교 기준의 몇 배인지입니다. 현재 구현은 전일 거래량을 오늘 장 경과 비율로 환산해 비교합니다. 1.2배면 그 예상량보다 20% 많다는 뜻입니다.' },
  { name: '호가 · 스프레드', description: '매도 1호가는 지금 가장 낮게 팔겠다는 가격, 매수 1호가는 가장 높게 사겠다는 가격입니다. 두 가격 사이의 차이를 스프레드라고 합니다.' },
  { name: 'PER · ROE', description: 'PER는 주가가 주당 이익의 몇 배인지, ROE는 자기자본 대비 순이익 비율입니다. Forward PER는 예상 이익, Trailing PER는 과거 이익 기준이며 선택적 기업 필터에 사용합니다.' },
  { name: '20일선 · 50일선', description: '최근 20거래일·50거래일 종가의 평균입니다. 하루의 가격보다 며칠간의 흐름을 보기 위한 기준입니다.' },
  { name: '거래일 · 갭 · 슬리피지', description: '거래일은 미국장이 열리는 날로 주말·휴장일은 제외합니다. 갭은 가격이 건너뛰듯 바뀌는 것, 슬리피지는 예상 가격과 실제 체결 가격의 차이입니다.' },
  { name: 'SPY · QQQ', description: '각각 S&P 500과 NASDAQ-100 지수를 따라가는 ETF입니다. 이 전략에서 시장 추세와 상대강도를 비교할 때 사용합니다.' },
]
</script>

<style scoped>
.term-guide{margin:14px 16px;padding:12px 14px;border:1px solid var(--card-border);border-radius:10px;background:var(--input-bg,#171b20);color:var(--text-secondary);font-size:.78rem;line-height:1.65}.term-guide p{margin:0 0 8px}.term-guide strong,.term-guide dt{color:var(--text-primary)}.term-guide summary{cursor:pointer;font-weight:700;color:var(--text-primary)}.term-guide dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 0}.term-guide dt{font-weight:700}.term-guide dd{margin:3px 0 0;overflow-wrap:anywhere}@media(max-width:640px){.term-guide dl{grid-template-columns:minmax(0,1fr)}}
</style>
