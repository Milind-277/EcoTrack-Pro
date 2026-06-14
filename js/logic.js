(() => {
  "use strict";

  const round = (v, d = 2) => parseFloat(Number(v || 0).toFixed(d));

  function dateDiffDays(a, b) {
    return Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);
  }

  function calculateEmissions(input = {}) {
    const out = window.EcoEngine.calcTotal(input || {});
    return {
      transport: round(out.transport, 3),
      electricity: round(out.electricity, 3),
      food: round(out.food, 3),
      total: round(out.total, 3)
    };
  }

  function calculateEcoScore(history = [], points = 0, streak = 0) {
    if (!history.length) return 50;
    const average = history.reduce((s, e) => s + calculateEmissions(e).total, 0) / history.length;
    const reductionBonus = Math.max(0, window.EcoData.INDIA_AVERAGE_DAILY - average) * 3.2;
    const score = 42 + reductionBonus + Math.min(18, streak * 3) + Math.min(14, points / 35);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function calculateStreak(history = []) {
    const dates = [...new Set(history.map((e) => e.date))].sort().reverse();
    if (!dates.length) return 0;
    const today = window.EcoData.todayISO();
    if (dateDiffDays(today, dates[0]) > 1) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dateDiffDays(dates[i - 1], dates[i]) === 1) streak++;
      else break;
    }
    return streak;
  }

  function getBadges(user = {}) {
    const history = user.history || [];
    const average = history.length
      ? history.reduce((s, e) => s + calculateEmissions(e).total, 0) / history.length
      : Infinity;
    return [
      { id: "beginner", name: "Beginner", desc: "Logged the first carbon entry", icon: "🌱", unlocked: history.length >= 1 },
      { id: "consistent", name: "Consistent User", desc: "Maintained a 3-day logging streak", icon: "🔥", unlocked: (user.streak || 0) >= 3 },
      { id: "champion", name: "Green Champion", desc: "Reached an Eco Score of 85+", icon: "🏆", unlocked: (user.ecoScore || 0) >= 85 },
      { id: "low-footprint", name: "Low Footprint", desc: "Kept average emissions below 8 kg/day", icon: "🌍", unlocked: history.length >= 3 && average < 8 },
      { id: "eco-hero", name: "Eco Hero", desc: "Earned at least 100 points", icon: "⚡", unlocked: (user.points || 0) >= 100 },
      { id: "low-carbon-master", name: "Low Carbon Master", desc: "Maintained a 7-day logging streak", icon: "💎", unlocked: (user.streak || 0) >= 7 },
      { id: "offset-hero", name: "Offset Hero", desc: "Offset yearly carbon emissions", icon: "🌳", unlocked: Boolean(user.hasOffset) }
    ];
  }

  function updateGamification(user) {
    user.streak = calculateStreak(user.history || []);
    user.ecoScore = calculateEcoScore(user.history || [], user.points || 0, user.streak || 0);
    user.badges = getBadges(user).filter((b) => b.unlocked).map((b) => b.id);
    return user;
  }

  function generateInsights(history = []) {
    if (window.EcoAI) return window.EcoAI.generateInsights(history);
    return [{ type: "starter", title: "Log your first day", desc: "Track carbon to unlock insights.", tips: [] }];
  }

  function getForecast(history = [], days = 5) {
    if (window.EcoPredict) return window.EcoPredict.forecast(history, days);
    return { labels: [], actuals: [], predictions: [], forecast: [], forecastStart: 0, confidence: "Low" };
  }

  function buildScenario(baseline, changes) {
    const after = {
      transport: round(baseline.transport * (1 - changes.travel / 100)),
      electricity: round(baseline.electricity * (1 - (changes.ac * 0.6 + changes.appliances * 0.4) / 100)),
      food: round(baseline.food * (1 - (changes.diet * 0.55) / 100))
    };
    const beforeTotal = round(baseline.transport + baseline.electricity + baseline.food);
    const afterTotal = round(after.transport + after.electricity + after.food);
    return {
      before: { ...baseline, total: beforeTotal },
      after: { ...after, total: afterTotal },
      dailySavings: round(Math.max(0, beforeTotal - afterTotal)),
      monthlySavings: round(Math.max(0, beforeTotal - afterTotal) * 30)
    };
  }

  function seedDemoUser() {
    const history = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return window.EcoEngine.sanitizeEntry({
        date: d.toISOString().slice(0, 10),
        transportMode: i % 3 === 0 ? "metro" : "bus",
        transportDist: 12 + i,
        acHours: Math.max(0, 4 - i * 0.3),
        fanHours: 8,
        applianceHours: 4,
        heaterHours: 0.4,
        washingCycles: i % 2,
        foodType: i % 4 === 0 ? "meat" : "vegetarian"
      });
    });
    const user = {
      id: "demo_user",
      name: "Eco Demo",
      email: "demo@ecotrack.local",
      passwordHash: "demo",
      joinedAt: new Date().toISOString(),
      points: 70,
      history
    };
    updateGamification(user);
    const users = window.EcoData.getUsers();
    users[user.id] = user;
    window.EcoData.saveUsers(users);
    window.EcoData.storage.setString(window.EcoData.STORAGE_KEYS.currentUser, user.id);
  }

  window.EcoLogic = {
    calculateEmissions,
    calculateEcoScore,
    calculateStreak,
    getBadges,
    updateGamification,
    generateInsights,
    getForecast,
    buildScenario,
    seedDemoUser
  };
})();
