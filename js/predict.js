(() => {
  "use strict";

  function movingAverage(values, window = 3) {
    if (!values.length) return [];
    const result = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      result.push(parseFloat((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(3)));
    }
    return result;
  }

  function linearTrend(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0 };
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den ? num / den : 0;
    const intercept = yMean - slope * xMean;
    return { slope, intercept };
  }

  function confidenceLevel(values) {
    if (!values.length) return "Low";
    const mean = values.reduce((sum, v) => sum + Math.abs(v), 0) / values.length || 1;
    const trendChange = values.length > 1 ? Math.abs(values[values.length - 1] - values[0]) / Math.max(mean, 1) : 0;
    const range = Math.max(...values) - Math.min(...values);
    const volatility = range / Math.max(mean, 1);

    if (trendChange < 0.08 && volatility < 0.12) return "High";
    if (trendChange < 0.20 && volatility < 0.22) return "Medium";
    return "Low";
  }

  function forecast(history = [], days = 5) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-7);

    if (!recent.length) {
      return { labels: [], actuals: [], predictions: [], forecast: [], forecastStart: 0, confidence: "Low" };
    }

    const actuals = recent.map((e) => window.EcoEngine.calcTotal(e).total);
    const smoothed = movingAverage(actuals, 3);
    const { slope } = linearTrend(smoothed);

    const lastDate = new Date(`${recent[recent.length - 1].date}T00:00:00`);
    const lastSmoothed = smoothed[smoothed.length - 1];

    const fmtDate = (d) =>
      d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    const labels = recent.map((e) => fmtDate(new Date(`${e.date}T00:00:00`)));
    const predicted = [];

    for (let i = 1; i <= days; i++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + i);
      labels.push(`${fmtDate(d)} (est)`);
      const raw = lastSmoothed + slope * i * 0.6;
      predicted.push(parseFloat(Math.max(0, raw).toFixed(3)));
    }

    const confidence = confidenceLevel(actuals);
    return {
      labels,
      actuals,
      predictions: predicted,
      forecast: predicted,
      forecastStart: actuals.length,
      confidence,
      slope: parseFloat(slope.toFixed(4))
    };
  }

  window.EcoPredict = {
    movingAverage,
    linearTrend,
    confidenceLevel,
    forecast
  };
})();
