(() => {
  "use strict";

  const INDIA_DAILY_AVG = 14;

  function analyzeHistory(history = []) {
    if (!history.length) return null;

    const recent7 = history.slice(-7);
    const totals = recent7.map((e) => window.EcoEngine.calcTotal(e));

    const sumTransport = totals.reduce((s, t) => s + t.transport, 0);
    const sumElectricity = totals.reduce((s, t) => s + t.electricity, 0);
    const sumFood = totals.reduce((s, t) => s + t.food, 0);
    const sumTotal = totals.reduce((s, t) => s + t.total, 0);
    const dailyAvg = sumTotal / totals.length;

    const tPct = sumTotal ? Math.round((sumTransport / sumTotal) * 100) : 0;
    const ePct = sumTotal ? Math.round((sumElectricity / sumTotal) * 100) : 0;
    const fPct = sumTotal ? Math.round((sumFood / sumTotal) * 100) : 0;

    let trendPct = 0;
    let trendDir = "stable";
    if (totals.length >= 4) {
      const half = Math.floor(totals.length / 2);
      const firstHalf = totals.slice(0, half);
      const secondHalf = totals.slice(half);
      const firstAvg = firstHalf.reduce((s, t) => s + t.total, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, t) => s + t.total, 0) / secondHalf.length;
      if (firstAvg > 0) {
        trendPct = parseFloat(((secondAvg - firstAvg) / firstAvg * 100).toFixed(1));
        trendDir = trendPct > 0 ? "increasing" : trendPct < 0 ? "decreasing" : "stable";
      }
    }

    const categories = [
      { key: "transport", label: "Travel", total: sumTransport, pct: tPct, advice: "Reduce vehicle trips and choose public transit for shorter routes." },
      { key: "electricity", label: "Electricity", total: sumElectricity, pct: ePct, advice: "Cut AC runtimes and unplug standby devices when not in use." },
      { key: "food", label: "Diet", total: sumFood, pct: fPct, advice: "Swap one meat meal for a plant-based alternative each day." }
    ];
    const sorted = categories.slice().sort((a, b) => b.total - a.total);
    const [primary, secondary] = sorted;

    return {
      dailyAvg,
      tPct,
      ePct,
      fPct,
      trendPct,
      trendDir,
      topCategory: primary.key,
      topLabel: primary.label,
      topPct: primary.pct,
      topAdvice: primary.advice,
      secondLabel: secondary?.label || "Other",
      secondPct: secondary?.pct || 0,
      secondAdvice: secondary?.advice || "Balance the next-highest source with small habit changes.",
      isAboveBenchmark: dailyAvg > INDIA_DAILY_AVG
    };
  }

  function generateBreakdownInsight(analysis) {
    const { topLabel, topPct, secondLabel, secondPct, trendPct, trendDir } = analysis;
    let trend = "";
    if (trendDir !== "stable") {
      const dir = trendDir === "increasing" ? "increased" : "decreased";
      trend = ` Your emissions ${dir} by ${Math.abs(trendPct)}% this week.`;
    }
    const significant = secondPct >= 20 ? ` Additionally, ${secondLabel} is also strong at ${secondPct}%.` : "";

    return {
      type: "breakdown",
      title: "Carbon Intelligence Breakdown",
      desc: `${topLabel} is your highest emission source at ${topPct}%.${significant} ${trend}`.trim(),
      tips: [
        "Consistently logging helps the engine detect trends faster.",
        "Focus on the category with the highest percentage first."
      ]
    };
  }

  function generateActionPlan(analysis) {
    const { topCategory, dailyAvg, topLabel, topPct, secondLabel, secondPct, topAdvice, secondAdvice } = analysis;
    const monthlySaving = parseFloat((dailyAvg * 0.20 * 30).toFixed(1));

    const estimatedDailySavings = parseFloat((dailyAvg * 0.12).toFixed(1));
    const estimatedMonthlySavings = parseFloat((estimatedDailySavings * 30).toFixed(1));

    const plans = {
      transport: {
        title: "Action Plan: Reduce Travel Emissions",
        desc: `Travel is your highest emission source at ${topPct}%. Reducing vehicle use by 20% can save around ${estimatedMonthlySavings} kg/month. ${topAdvice}`,
        tips: [
          "Use metro or local train for trips above 5 km.",
          "Combine errands into one trip and avoid peak traffic.",
          "Try pedestrian routes or cycling for quick daily commutes."
        ]
      },
      electricity: {
        title: "Action Plan: Optimise Electricity Use",
        desc: `Electricity is a major contributor at ${topPct}%. Reducing AC use by 2 hours/day and unplugging idle devices can save around ${estimatedMonthlySavings} kg/month.`,
        tips: [
          "Set AC temperature to 24°C or higher.",
          "Unplug standby devices when not in use.",
          "Use energy-efficient LED lighting and natural light."
        ]
      },
      food: {
        title: "Action Plan: Shift Your Diet",
        desc: `Diet contributes ${topPct}% of your footprint. Introducing two plant-based meals per week can lower your footprint by roughly ${estimatedMonthlySavings} kg/month.",
        tips: [
          "Plan meat-free meals and use legumes as protein.",
          "Buy seasonal, locally grown produce.",
          "Reduce food waste with batch cooking and tracked portions."
        ]
      }
    };

    return {
      type: topCategory,
      ...plans[topCategory],
      secondary: {
        label: secondLabel,
        pct: secondPct,
        advice: secondAdvice
      },
      savings: {
        daily: estimatedDailySavings,
        monthly: estimatedMonthlySavings
      }
    };
  }

  function generateBenchmarkInsight(analysis) {
    const { dailyAvg, isAboveBenchmark, topLabel, topPct, secondLabel, secondPct } = analysis;
    const avg = dailyAvg.toFixed(1);
    const secondaryPhrase = secondPct > 20 ? ` ${secondLabel} is also significant at ${secondPct}%.` : "";
    if (isAboveBenchmark) {
      return {
        type: "benchmark",
        title: "Above India Urban Benchmark",
        desc: `Your daily average is ${avg} kg vs the ${INDIA_DAILY_AVG} kg benchmark. ${topLabel} is the leading source at ${topPct}%.` + secondaryPhrase,
        tips: ["Use the Simulator to find which habit change has the most impact.", "Reduce one high-impact habit rather than changing everything at once."]
      };
    }
    return {
      type: "positive",
      title: "Below India Urban Benchmark 🎉",
      desc: `Excellent! Your daily average is ${avg} kg — below the ${INDIA_DAILY_AVG} kg benchmark. Keep your focus on ${topLabel}.` + secondaryPhrase,
      tips: ["Use the Simulator to find the next 10% reduction.", "Share your progress to inspire others."]
    };
  }

  function generateSavingsInsight(analysis) {
    const { dailyAvg, topLabel, topPct } = analysis;
    const daily = parseFloat((dailyAvg * 0.15).toFixed(2));
    const monthly = parseFloat((daily * 30).toFixed(1));
    return {
      type: "savings",
      title: "Estimated Savings Opportunity",
      desc: `A 15% improvement saves ~${daily} kg/day (~${monthly} kg/month). Target ${topLabel} first for the most immediate impact.",
      tips: ["Small consistent changes beat large one-off efforts.", "Track daily to lock in your progress."]
    };
  }

  function generateInsights(history = []) {
    if (!history.length) {
      return [{
        type: "starter",
        title: "Start your first carbon log",
        desc: "No data available. Start tracking today to see insights. Add your first entry to unlock AI insights.",
        tips: ["Use realistic daily values.", "Come back tomorrow to build your streak."]
      }];
    }

    const analysis = analyzeHistory(history);
    if (!analysis) return [];

    return [
      generateBreakdownInsight(analysis),
      generateActionPlan(analysis),
      generateBenchmarkInsight(analysis),
      generateSavingsInsight(analysis)
    ];
  }

  function getTopInsight(history = []) {
    return generateInsights(history)[0] || null;
  }

  window.EcoAI = {
    analyzeHistory,
    generateInsights,
    getTopInsight,
    INDIA_DAILY_AVG
  };
})();
