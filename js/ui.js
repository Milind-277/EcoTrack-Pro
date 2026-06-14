(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setText(sel, val, root = document) {
    const n = $(sel, root);
    if (n) n.textContent = val ?? "";
  }

  function create(tag, opts = {}) {
    const el = document.createElement(tag);
    if (opts.className) el.className = opts.className;
    if (opts.text !== undefined) el.textContent = opts.text;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function formatKg(v) { return `${Number(v || 0).toFixed(2)} kg`; }

  function pageRoot() { return window.location.pathname.includes("/pages/") ? "../" : "./"; }

  function debounce(fn, ms = 180) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function showToast(msg, type = "info") {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = create("div", { className: "toast-wrap", attrs: { "aria-live": "polite", "aria-atomic": "true" } });
      document.body.appendChild(wrap);
    }
    const toast = create("div", { className: `toast ${type}`, text: String(msg), attrs: { role: "status" } });
    wrap.appendChild(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  function setLoading(btn, loading, fallbackText) {
    const node = typeof btn === "string" ? document.getElementById(btn) : btn;
    if (!node) return;
    if (!node.dataset.originalText) node.dataset.originalText = node.textContent;
    node.disabled = loading;
    clear(node);
    if (loading) {
      node.append(create("span", { className: "loader", attrs: { "aria-hidden": "true" } }), document.createTextNode(" Analyzing…"));
    } else {
      node.textContent = fallbackText || node.dataset.originalText || "Submit";
    }
  }

  function initTheme() {
    const stored = window.EcoData.storage.getString(window.EcoData.STORAGE_KEYS.theme);
    const theme = stored || "dark";
    document.documentElement.dataset.theme = theme;
    $$(".theme-toggle").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.textContent = theme === "light" ? "Dark mode" : "Light mode";
      btn.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        window.EcoData.storage.setString(window.EcoData.STORAGE_KEYS.theme, next);
        $$(".theme-toggle").forEach((b) => {
          b.setAttribute("aria-pressed", String(next === "light"));
          b.textContent = next === "light" ? "Dark mode" : "Light mode";
        });
        window.EcoCharts?.refreshTheme();
      });
    });
  }

  function initNavState() {
    const user = window.EcoData.getCurrentUserSync();
    const path = window.location.pathname;
    $$(".guest-only").forEach((n) => n.classList.toggle("hidden", Boolean(user)));
    $$(".auth-only").forEach((n) => n.classList.toggle("hidden", !user));
    $$(".avatar-mini").forEach((n) => { n.textContent = user?.name?.charAt(0)?.toUpperCase() || "U"; });
    $$(".logout-btn").forEach((b) => b.addEventListener("click", () => { window.EcoAuth.logout(); }));
    $$(".profile-link").forEach((n) => n.setAttribute("href", `${pageRoot()}pages/profile.html`));
    $$(".menu-toggle").forEach((b) => {
      b.addEventListener("click", () => {
        const menu = $("#mobileNav");
        const open = !menu.classList.contains("open");
        menu.classList.toggle("open", open);
        b.setAttribute("aria-expanded", String(open));
      });
    });
    $$(".nav-links a, .mobile-nav a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href !== "#" && path.endsWith(href.replace("../", "").replace("./", ""))) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function requireUser() {
    if (!window.EcoAuth.requireAuth()) return null;
    return window.EcoData.getCurrentUserSync();
  }

  function enhanceInteractiveAccessibility() {
    $$("button, a.btn, .btn").forEach((el) => {
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
      if (!el.hasAttribute("aria-label") && el.textContent.trim()) el.setAttribute("aria-label", el.textContent.trim());
    });
  }

  function initAuthPage() {
    window.EcoAuth.redirectIfAuthenticated();
    const loginForm = $("#loginForm");
    const signupForm = $("#signupForm");
    const modeBtns = $$("[data-auth-mode]");
    modeBtns.forEach((btn, idx) => {
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-pressed", String(idx === 0));
      btn.addEventListener("click", () => {
        const mode = btn.dataset.authMode;
        loginForm.classList.toggle("hidden", mode !== "login");
        signupForm.classList.toggle("hidden", mode !== "signup");
        setText("#authTitle", mode === "login" ? "Welcome back" : "Create your account");
        setText("#authSubtitle", mode === "login" ? "Sign in to continue." : "Start your carbon dashboard in under a minute.");
        modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        btn.focus();
      });
    });
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#loginBtn");
      try {
        setLoading(btn, true);
        await window.EcoAuth.login(loginForm);
        showToast("Signed in successfully.", "success");
        window.location.href = "index.html";
      } catch (err) {
        showToast(err.message, "error");
        setLoading(btn, false, "Sign in");
      }
    });
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#signupBtn");
      try {
        setLoading(btn, true);
        await window.EcoAuth.signup(signupForm);
        showToast("Account created!", "success");
        window.location.href = "index.html";
      } catch (err) {
        showToast(err.message, "error");
        setLoading(btn, false, "Create account");
      }
    });
  }

  function initDashboard() {
    const user = requireUser();
    if (!user) return;
    const stats = window.EcoData.getStats(user);
    setText("#userName", user.name.split(" ")[0]);
    setText("#ecoScore", user.ecoScore || 50);
    setText("#totalPoints", user.points || 0);
    setText("#streakCount", user.streak || 0);
    setText("#weekAverage", stats ? stats.dailyAverage.toFixed(1) : "0.0");
    setText("#logCount", user.history.length);

    if (!stats) {
      setText("#insightPreview", "No data available. Start tracking today to see insights.");
      const offsetBtn = $("#offsetBtn");
      if (offsetBtn) { offsetBtn.textContent = "Log data first"; offsetBtn.disabled = true; }
      if (window.EcoCharts) {
        window.EcoCharts.emptyState("trendChart", "No data available. Start tracking today to see insights.");
        window.EcoCharts.emptyState("breakdownChart", "No data available. Start tracking today to see insights.");
      }
      return;
    }

    const { recent, transport, electricity, food, dailyAverage } = stats;
    const labels = recent.map((e) => new Date(`${e.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
    const totals = recent.map((e) => window.EcoEngine.calcTotal(e).total);
    window.EcoCharts?.renderLine("trendChart", labels, totals, "Daily emissions (kg CO₂e)");
    window.EcoCharts?.renderDoughnut("breakdownChart", [transport, electricity, food]);

    const insight = window.EcoAI.getTopInsight(user.history);
    if (insight) {
      setText("#insightTitle", insight.title);
      setText("#insightPreview", insight.desc);
    }

    // Carbon Offset Module
    const yearlyEmissions = dailyAverage * 365;
    const treesRequired = Math.ceil(yearlyEmissions / (window.EcoData.CO2_PER_TREE_MONTH * 12));
    const offsetCost = Math.ceil(treesRequired * 150);
    setText("#yearlyEmissions", formatKg(yearlyEmissions));
    setText("#treesRequired", `${treesRequired} trees`);

    const offsetBtn = $("#offsetBtn");
    if (!offsetBtn) return;
    if (user.hasOffset) {
      offsetBtn.textContent = "Offset Completed ✓";
      offsetBtn.disabled = true;
      offsetBtn.classList.add("btn-outline");
    } else {
      offsetBtn.textContent = `Offset Now (₹${offsetCost})`;
      offsetBtn.addEventListener("click", async () => {
        setLoading(offsetBtn, true);
        await window.EcoData.simulateApi(700);
        user.hasOffset = true;
        window.EcoLogic.updateGamification(user);
        window.EcoData.saveUserSync(user);
        setLoading(offsetBtn, false, "Offset Completed ✓");
        offsetBtn.disabled = true;
        offsetBtn.classList.add("btn-outline");
        showToast("Carbon footprint offset successful! 🌳 Offset Hero badge unlocked.", "success");
      });
    }
  }

  function readTrackerForm(form) {
    return {
      date: $("#entryDate", form).value || window.EcoData.todayISO(),
      transportMode: $("#transportMode", form).value,
      transportDist: $("#transportDist", form).value,
      acHours: $("#acHours", form).value,
      fanHours: $("#fanHours", form).value,
      applianceHours: $("#applianceHours", form).value,
      heaterHours: $("#heaterHours", form).value,
      washingCycles: $("#washingCycles", form).value,
      foodType: $("#foodType", form).value
    };
  }

  function initTracker() {
    const user = requireUser();
    if (!user) return;
    const form = $("#trackerForm");
    $("#entryDate").value = window.EcoData.todayISO();

    const updatePreview = debounce(() => {
      const entry = readTrackerForm(form);
      const em = window.EcoEngine.calcTotal(entry);
      setText("#liveTotal", em.total.toFixed(2));
      setText("#transportPreview", formatKg(em.transport));
      setText("#electricityPreview", formatKg(em.electricity));
      setText("#foodPreview", formatKg(em.food));
    }, 120);

    $$("input, select", form).forEach((inp) => inp.addEventListener("input", updatePreview));
    updatePreview();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#submitTracker");
      try {
        setLoading(btn, true);
        await window.EcoData.logEntry(readTrackerForm(form));
        showToast("Daily footprint saved. +10 points 🎉", "success");
        window.location.href = "../index.html";
      } catch (err) {
        showToast(err.message, "error");
        setLoading(btn, false, "Save daily log");
      }
    });
  }

  function initInsights() {
    const user = requireUser();
    if (!user) return;
    const container = $("#insightsContainer");
    if (!container) return;
    container.setAttribute("aria-busy", "true");
    clear(container);
    const loader = create("div", { className: "chart-fallback", text: "Analyzing your data..." });
    container.appendChild(loader);

    setTimeout(() => {
      clear(container);
      const insights = window.EcoAI.generateInsights(user.history);
      insights.forEach((insight) => {
      const card = create("article", { className: "glass insight-card" });
      card.setAttribute("aria-label", insight.title);
      const iconEl = create("div", { className: "insight-icon", attrs: { "aria-hidden": "true" } });
      const icons = { breakdown: "📊", transport: "🚗", electricity: "⚡", food: "🥗", positive: "✅", benchmark: "📈", savings: "💡", starter: "🌱" };
      iconEl.textContent = icons[insight.type] || "💡";
      const body = create("div");
      body.appendChild(create("h2", { text: insight.title }));
      body.appendChild(create("p", { text: insight.desc }));
      if (insight.secondary) {
        body.appendChild(create("p", { text: `Secondary contributor: ${insight.secondary.label} at ${insight.secondary.pct}%. ${insight.secondary.advice}` }));
      }
      if (insight.savings) {
        body.appendChild(create("p", { text: `Projected savings: ${insight.savings.daily} kg/day, ${insight.savings.monthly} kg/month.` }));
      }
      const ul = create("ul", { className: "tips" });
      insight.tips.forEach((tip) => ul.appendChild(create("li", { text: tip })));
      body.appendChild(ul);
      card.append(iconEl, body);
      container.appendChild(card);
    });

      const analysis = window.EcoAI.analyzeHistory(user.history);
      if (analysis) {
        const trendEl = $("#trendIndicator");
        if (trendEl) {
        const dir = analysis.trendDir;
        trendEl.textContent = dir === "increasing" ? `↑ ${Math.abs(analysis.trendPct)}% this week`
          : dir === "decreasing" ? `↓ ${Math.abs(analysis.trendPct)}% this week`
          : "→ Stable this week";
        trendEl.className = `chip ${dir === "decreasing" ? "good" : dir === "increasing" ? "bad" : ""}`;
        }
      }
      container.removeAttribute("aria-busy");
    }, 320);
  }

  function initReports() {
    const user = requireUser();
    if (!user) return;
    const reportContent = $("#reportContent");
    reportContent?.setAttribute("aria-busy", "true");
    setTimeout(() => {
      const result = window.EcoPredict.forecast(user.history, 5);
      const stats = window.EcoData.getStats(user);

    setText("#weeklyTotal", stats ? stats.total.toFixed(1) : "0.0");
    setText("#weeklyAverage", stats ? stats.dailyAverage.toFixed(1) : "0.0");
    setText("#forecastDays", "5");
    setText("#confidenceLevel", result.confidence);
    setText("#confidenceSummary", `Prediction Confidence: ${result.confidence}`);

    const summaryEl = document.querySelector("#confidenceSummary");
    if (summaryEl) {
      summaryEl.className = `muted mt chip ${result.confidence.toLowerCase()}`;
    }

    if (stats) {
      const monthlySaving = parseFloat((stats.dailyAverage * 0.15 * 30).toFixed(1));
      const trees = Math.ceil((stats.dailyAverage * 365) / (window.EcoData.CO2_PER_TREE_MONTH * 12));
      setText("#reportReduction", `${monthlySaving} kg`);
      setText("#reportTrees", trees);
    }

    const allLabels = [...result.labels];
    window.EcoCharts?.renderForecast(
      "forecastChart",
      allLabels,
      result.actuals,
      result.predictions,
      result.forecastStart,
      result.confidence
    );

    renderHistoryTable(user.history);
    const exportBtn = $("#exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", () => exportPdf());
      reportContent?.removeAttribute("aria-busy");
    }, 280);
  }

  function renderHistoryTable(history) {
    const tbody = $("#historyTable tbody");
    clear(tbody);
    if (!history.length) {
      const row = create("tr");
      row.appendChild(create("td", { text: "No logs yet.", attrs: { colspan: "6" } }));
      tbody.appendChild(row);
      return;
    }
    history.slice().reverse().slice(0, 10).forEach((entry) => {
      const em = window.EcoEngine.calcTotal(entry);
      const row = create("tr");
      [entry.date, entry.transportMode, `${entry.transportDist} km`,
        `${entry.acHours}h AC / ${entry.fanHours}h fan`, entry.foodType, em.total.toFixed(2)
      ].forEach((val) => row.appendChild(create("td", { text: val })));
      tbody.appendChild(row);
    });
  }

  function exportPdf() {
    const target = $("#reportContent");
    if (window.html2pdf) {
      window.html2pdf().set({
        margin: 10,
        filename: "EcoTrack-Pro-Report.pdf",
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      }).from(target).save();
    } else {
      window.print();
    }
  }

  function initSimulator() {
    const user = requireUser();
    if (!user) return;
    const stats = window.EcoData.getStats(user);
    const baseline = stats
      ? { transport: stats.transport, electricity: stats.electricity, food: stats.food }
      : { transport: 4.6, electricity: 5.2, food: 2.8 };

    const update = debounce(() => {
      const changes = {
        travel: Number($("#travelSlider").value),
        ac: Number($("#acSlider").value),
        appliances: Number($("#applianceSlider").value),
        diet: Number($("#dietSlider").value)
      };
      Object.entries(changes).forEach(([k, v]) => {
        const id = k === "appliances" ? "appliancesValue" : `${k}Value`;
        setText(`#${id}`, `${v}%`);
      });
      const scenario = window.EcoLogic.buildScenario(baseline, changes);
      renderComparison(scenario);
      window.EcoCharts?.renderBars("scenarioChart", ["Transport", "Electricity", "Food"], [
        { label: "Before", data: [scenario.before.transport, scenario.before.electricity, scenario.before.food] },
        { label: "After", data: [scenario.after.transport, scenario.after.electricity, scenario.after.food] }
      ]);
      setText("#monthlySavings", formatKg(scenario.monthlySavings));
      setText("#treeEquivalent", Math.round(scenario.monthlySavings / window.EcoData.CO2_PER_TREE_MONTH));
    }, 80);

    $$("input[type='range']").forEach((s) => s.addEventListener("input", update));
    update();
  }

  function renderComparison(scenario) {
    const container = $("#comparisonBlock");
    clear(container);
    [
      ["Transport", scenario.before.transport, scenario.after.transport],
      ["Electricity", scenario.before.electricity, scenario.after.electricity],
      ["Food", scenario.before.food, scenario.after.food],
      ["Total daily", scenario.before.total, scenario.after.total]
    ].forEach(([label, before, after]) => {
      const row = create("div", { className: "comparison-row" });
      row.appendChild(create("span", { text: label }));
      const vals = create("span");
      const b = create("span", { className: "before", text: formatKg(before) });
      const sep = document.createTextNode(" → ");
      const a = create("span", { className: "after", text: formatKg(after) });
      vals.append(b, sep, a);
      row.appendChild(vals);
      container.appendChild(row);
    });
  }

  async function initLeaderboard() {
    const user = requireUser();
    if (!user) return;
    const entries = await window.EcoData.getLeaderboard();
    const list = $("#leaderboardList");
    const podium = $("#podium");
    clear(list);
    clear(podium);

    [entries[1], entries[0], entries[2]].filter(Boolean).forEach((entry) => {
      const place = create("div", { className: "podium-place" });
      const height = entry.rank === 1 ? 132 : entry.rank === 2 ? 100 : 78;
      place.appendChild(create("div", { className: "avatar-mini", text: entry.name.charAt(0) }));
      const block = create("div", { className: "podium-block", text: `#${entry.rank}`, attrs: { style: `height:${height}px` } });
      place.appendChild(block);
      place.appendChild(create("strong", { text: entry.name.split(" ")[0] }));
      place.appendChild(create("span", { className: "muted", text: `${entry.ecoScore} pts` }));
      podium.appendChild(place);
    });

    entries.slice(0, 10).forEach((entry) => list.appendChild(leaderboardRow(entry)));
    const myRank = entries.find((e) => e.isCurrentUser);
    setText("#myRank", myRank ? `#${myRank.rank}` : "Unranked");
    if (myRank && myRank.rank > 10) list.appendChild(leaderboardRow(myRank));
  }

  function leaderboardRow(entry) {
    const row = create("article", { className: `leaderboard-row${entry.isCurrentUser ? " current" : ""}` });
    row.setAttribute("aria-label", `Rank ${entry.rank}: ${entry.name}`);
    row.appendChild(create("div", { className: `rank${entry.rank <= 3 ? " top" : ""}`, text: `#${entry.rank}` }));
    row.appendChild(create("div", { className: "avatar-mini", text: entry.name.charAt(0) }));
    const info = create("div");
    info.appendChild(create("strong", { text: entry.isCurrentUser ? `${entry.name} (You)` : entry.name }));
    info.appendChild(create("div", { className: "muted", text: `${entry.city || "India"} · ${entry.streak}-day streak · ${entry.points} pts` }));
    row.appendChild(info);
    row.appendChild(create("div", { className: "right", text: `${entry.ecoScore}/100` }));
    return row;
  }

  function initProfile() {
    const user = requireUser();
    if (!user) return;
    window.EcoLogic.updateGamification(user);
    window.EcoData.saveUserSync(user);

    setText("#profileInitial", user.name.charAt(0).toUpperCase());
    setText("#profileName", user.name);
    setText("#profileEmail", user.email);
    setText("#profileJoined", new Date(user.joinedAt || Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
    setText("#profilePoints", user.points);
    setText("#profileStreak", user.streak);
    setText("#profileLogs", user.history.length);
    setText("#profileScore", user.ecoScore);
    $(".score-ring")?.style.setProperty("--score", `${user.ecoScore}%`);

    const grid = $("#badgesGrid");
    clear(grid);
    window.EcoLogic.getBadges(user).forEach((badge) => {
      const card = create("article", { className: "badge-card" });
      card.setAttribute("aria-label", `${badge.name}: ${badge.unlocked ? "Unlocked" : "Locked"}`);
      card.appendChild(create("span", { className: `chip ${badge.unlocked ? "good" : ""}`, text: badge.unlocked ? "Unlocked" : "Locked" }));
      const iconEl = create("div", { className: "badge-icon", attrs: { "aria-hidden": "true" } });
      iconEl.textContent = badge.icon || "🏅";
      card.appendChild(iconEl);
      card.appendChild(create("h3", { text: badge.name }));
      card.appendChild(create("p", { text: badge.desc }));
      grid.appendChild(card);
    });
  }

  function initPage() {
    initTheme();
    enhanceInteractiveAccessibility();
    document.addEventListener("navbar-ready", () => { initTheme(); initNavState(); enhanceInteractiveAccessibility(); });
    initNavState();

    if (new URLSearchParams(window.location.search).has("demo")) {
      if (!window.EcoData.getCurrentUserSync()) window.EcoLogic.seedDemoUser();
    }

    const page = document.body.dataset.page;
    const pageMap = {
      auth: initAuthPage,
      dashboard: initDashboard,
      tracker: initTracker,
      insights: initInsights,
      reports: initReports,
      simulator: initSimulator,
      leaderboard: initLeaderboard,
      profile: initProfile
    };
    pageMap[page]?.();
  }

  window.EcoUI = {
    $, $$, setText, create, clear, formatKg, showToast, setLoading,
    initTheme, initNavState, initDashboard, initTracker, initInsights,
    initReports, initSimulator, initLeaderboard, initProfile, initPage
  };

  document.addEventListener("DOMContentLoaded", initPage);
})();
