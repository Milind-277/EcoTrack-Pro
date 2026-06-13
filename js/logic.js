(() => {
  const round = (value, digits = 2) => Number.parseFloat(Number(value || 0).toFixed(digits));

  function dateDiffDays(a, b) {
    const left = new Date(`${a}T00:00:00`);
    const right = new Date(`${b}T00:00:00`);
    return Math.round((left - right) / 86400000);
  }

  window.EcoLogic = {
    calculateEmissions(input = {}) {
      // Delegate precise calculations to EcoData helpers to ensure a single source of truth
      const out = window.EcoData.calculateTotal(input || {});
      return {
        transport: round(out.transport, 3),
        electricity: round(out.electricity, 3),
        food: round(out.food, 3),
        total: round(out.total, 3)
      };
    },
    calculateEcoScore(history = [], points = 0, streak = 0) {
      if (!history.length) return 50;
      const average = history.reduce((sum, entry) => sum + this.calculateEmissions(entry).total, 0) / history.length;
      const reductionBonus = Math.max(0, window.EcoData.INDIA_AVERAGE_DAILY - average) * 3.2;
      const score = 42 + reductionBonus + Math.min(18, streak * 3) + Math.min(14, points / 35);
      return Math.max(0, Math.min(100, Math.round(score)));
    },
    calculateStreak(history = []) {
      const dates = [...new Set(history.map((entry) => entry.date))].sort().reverse();
      if (!dates.length) return 0;
      const today = window.EcoData.todayISO();
      if (dateDiffDays(today, dates[0]) > 1) return 0;
      let streak = 1;
      for (let i = 1; i < dates.length; i += 1) {
        if (dateDiffDays(dates[i - 1], dates[i]) === 1) streak += 1;
        else break;
      }
      return streak;
    },
    getBadges(user = {}) {
      const history = user.history || [];
      const average = history.length
        ? history.reduce((sum, entry) => sum + this.calculateEmissions(entry).total, 0) / history.length
        : Number.POSITIVE_INFINITY;
      return [
        { id: "beginner", name: "Beginner", desc: "Logged the first carbon entry", unlocked: history.length >= 1 },
        { id: "consistent", name: "Consistent User", desc: "Maintained a 3-day logging streak", unlocked: (user.streak || 0) >= 3 },
        { id: "champion", name: "Green Champion", desc: "Reached an Eco Score of 85+", unlocked: (user.ecoScore || 0) >= 85 },
        { id: "low-footprint", name: "Low Footprint", desc: "Kept average emissions below 8 kg/day", unlocked: history.length >= 3 && average < 8 },
        { id: "points", name: "Habit Builder", desc: "Earned at least 100 points", unlocked: (user.points || 0) >= 100 }
      ];
    },
    updateGamification(user) {
      user.streak = this.calculateStreak(user.history || []);
      user.ecoScore = this.calculateEcoScore(user.history || [], user.points || 0, user.streak || 0);
      user.badges = this.getBadges(user).filter((badge) => badge.unlocked).map((badge) => badge.id);
      return user;
    },
    generateInsights(history = []) {
      if (!history.length) {
        return [{
          type: "starter",
          title: "Start with one daily log",
          desc: "Track transport, electricity, and diet once to unlock personalized recommendations.",
          tips: ["Use realistic daily values.", "Come back tomorrow to start a streak."]
        }];
      }
      const recent = history.slice(-7);
      const totals = recent.map((entry) => this.calculateEmissions(entry));
      const categoryTotals = totals.reduce((acc, item) => ({
        transport: acc.transport + item.transport,
        electricity: acc.electricity + item.electricity,
        food: acc.food + item.food
      }), { transport: 0, electricity: 0, food: 0 });
      const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0];
      const dailyAverage = totals.reduce((sum, item) => sum + item.total, 0) / totals.length;
      const insights = [];
      const categoryTips = {
        transport: {
          title: "Transport is your highest emission source",
          desc: "Your commute and trips are driving the largest share of recent emissions.",
          tips: ["Use metro or local train for trips above 5 km.", "Combine errands into one trip.", "Try bus or carpool twice this week."]
        },
        electricity: {
          title: "Electricity usage needs attention",
          desc: "AC and appliance hours are the biggest opportunity in your current pattern.",
          tips: ["Set AC to 24C or higher.", "Use fans and natural ventilation during cooler hours.", "Switch off standby appliances at night."]
        },
        food: {
          title: "Diet choices are shaping your footprint",
          desc: "Food emissions are leading your recent carbon profile.",
          tips: ["Plan two vegetarian meals per day.", "Buy seasonal produce from local markets.", "Reduce food waste with weekly meal planning."]
        }
      };
      insights.push({ type: highestCategory, ...categoryTips[highestCategory] });
      if (dailyAverage < window.EcoData.INDIA_AVERAGE_DAILY * 0.65) {
        insights.push({
          type: "positive",
          title: "You are below the urban India benchmark",
          desc: `Your recent average is ${round(dailyAverage)} kg/day, comfortably below the ${window.EcoData.INDIA_AVERAGE_DAILY} kg benchmark.`,
          tips: ["Keep logging daily to protect your streak.", "Use the simulator to find the next 10% reduction."]
        });
      } else {
        insights.push({
          type: "benchmark",
          title: "There is room to beat the India benchmark",
          desc: `Your recent average is ${round(dailyAverage)} kg/day against a ${window.EcoData.INDIA_AVERAGE_DAILY} kg urban benchmark.`,
          tips: ["Target the highest category first.", "Reduce one high-impact habit rather than changing everything at once."]
        });
      }
      if (totals.length >= 4) {
        const first = totals.slice(0, Math.floor(totals.length / 2));
        const second = totals.slice(Math.floor(totals.length / 2));
        const firstAvg = first.reduce((sum, item) => sum + item.total, 0) / first.length;
        const secondAvg = second.reduce((sum, item) => sum + item.total, 0) / second.length;
        const change = firstAvg ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
        insights.push({
          type: change <= 0 ? "trend-down" : "trend-up",
          title: change <= 0 ? "Your trend is improving" : "Your trend is rising",
          desc: `Recent emissions changed by ${round(Math.abs(change), 1)}% compared with earlier logs.`,
          tips: change <= 0 ? ["Repeat the habits from your lowest-emission days."] : ["Review which recent activity changed most."]
        });
      }
      return insights;
    },
    getForecast(history = [], days = 5) {
      const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
      const recent = sorted.slice(-7);
      const actual = recent.map((entry) => this.calculateEmissions(entry).total);
      const labels = recent.map((entry) => new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
      if (!actual.length) return { labels: [], values: [], forecastStart: 0 };
      const slope = actual.length > 1 ? (actual[actual.length - 1] - actual[0]) / (actual.length - 1) : 0;
      const weighted = actual.reduce((sum, value, index) => sum + value * (index + 1), 0) / actual.reduce((sum, _, index) => sum + index + 1, 0);
      const lastDate = new Date(`${recent[recent.length - 1].date}T00:00:00`);
      const forecast = [];
      for (let i = 1; i <= days; i += 1) {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i);
        labels.push(`${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} est`);
        forecast.push(round(Math.max(0, weighted + slope * i * 0.45)));
      }
      return { labels, values: [...actual, ...forecast], forecastStart: actual.length };
    },
    buildScenario(baseline, changes) {
      const after = {
        transport: round(baseline.transport * (1 - changes.travel / 100)),
        electricity: round(baseline.electricity * (1 - (changes.ac * 0.6 + changes.appliances * 0.4) / 100)),
        food: round(baseline.food * (1 - changes.diet * 0.55 / 100))
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
  };
})();
