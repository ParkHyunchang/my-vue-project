export function useStockFormatters() {
  function fmtKRW(v) {
    return new Intl.NumberFormat("ko-KR").format(Math.round(v)) + "원";
  }

  function fmtUSD(v) {
    return (
      "$" +
      v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function fmtByMkt(v, mkt) {
    return mkt === "KR" ? fmtKRW(v) : fmtUSD(v);
  }

  function pnlCls(v) {
    return v == null ? "" : v > 0 ? "positive" : v < 0 ? "negative" : "";
  }

  function formatPrice(price, currency) {
    if (price == null) return "-";
    const abs = Math.abs(price);
    if (currency === "KRW") {
      return new Intl.NumberFormat("ko-KR").format(Math.round(price)) + "원";
    }
    return (
      "$" +
      abs.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatVolume(vol) {
    if (!vol) return "—";
    if (vol >= 1e8) return (vol / 1e8).toFixed(1) + "억주";
    if (vol >= 1e4) return (vol / 1e4).toFixed(0) + "만주";
    return vol.toLocaleString() + "주";
  }

  function formatMarketCap(cap, currency) {
    if (!cap) return "-";
    if (currency === "KRW") {
      const jo = cap / 1e12;
      return jo >= 1 ? jo.toFixed(1) + "조" : (cap / 1e8).toFixed(0) + "억";
    }
    const t = cap / 1e12;
    if (t >= 1) return "$" + t.toFixed(2) + "T";
    const b = cap / 1e9;
    return "$" + b.toFixed(1) + "B";
  }

  function formatChangePct(v) {
    if (v == null) return "—";
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  }

  function formatNewsDate(pubDate) {
    if (!pubDate) return "";
    try {
      const date = new Date(pubDate);
      const diff = Math.floor((Date.now() - date) / 1000);
      if (diff < 60) return "방금 전";
      if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
      return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
    } catch {
      return pubDate.substring(0, 10);
    }
  }

  function changeClass(val) {
    if (val > 0) return "positive";
    if (val < 0) return "negative";
    return "neutral";
  }

  function rankClass(rank) {
    if (rank === 1) return "rank-gold";
    if (rank === 2) return "rank-silver";
    if (rank === 3) return "rank-bronze";
    return "";
  }

  return {
    fmtKRW,
    fmtUSD,
    fmtByMkt,
    pnlCls,
    formatPrice,
    formatVolume,
    formatMarketCap,
    formatChangePct,
    formatNewsDate,
    changeClass,
    rankClass,
  };
}
