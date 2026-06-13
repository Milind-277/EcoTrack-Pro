(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setText(selector, value, root = document) {
    const node = $(selector, root);
    if (node) node.textContent = value ?? "";
  }

  function create(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
    }
    return node;
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function formatKg(value) {
    return `${Number(value || 0).toFixed(2)} kg`;
  }

  function pageRoot() {
    return window.location.pathname.includes("/pages/") ? "../" : "./";
  }

  const EcoUI = {
    $,
    $$,
    setText,
    create,
    clear,
    formatKg,
    showToast(message, type = "info") {
      let wrap = $(".toast-wrap");
      if (!wrap) {
        wrap = create("div", { className: "toast-wrap", attrs: { "aria-live": "polite" } });
        document.body.appendChild(wrap);
      }
      const toast = create("div", { className: `toast ${type}`, text: String(message), attrs: { role: "status" } });
      wrap.appendChild(toast);
      window.setTimeout(() => toast.remove(), 4200);
    },
    setLoading(button, loading, text) {
      const node = typeof button === "string" ? document.getElementById(button) : button;
      if (!node) return;
      if (!node.dataset.originalText) node.dataset.originalText = node.textContent;
      node.disabled = loading;
      clear(node);
      if (loading) {
        node.append(create("span", { className: "loader", attrs: { "aria-hidden": "true" } }), document.createTextNode(" Working..."));
      } else {
        node.textContent = text || node.dataset.originalText || "Submit";
      }
    },
    initTheme() {
      const stored = window.EcoData.storage.getString(window.EcoData.STORAGE_KEYS.theme);
      const theme = stored || "dark";
      document.documentElement.dataset.theme = theme;
      $$(".theme-toggle").forEach((button) => {
        button.setAttribute("aria-pressed", String(theme === "light"));
        button.textContent = theme === "light" ? "Dark" : "Light";
        button.addEventListener("click", () => {
          const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
          document.documentElement.dataset.theme = next;
          window.EcoData.storage.setString(window.EcoData.STORAGE_KEYS.theme, next);
          $$(".theme-toggle").forEach((btn) => {
            btn.setAttribute("aria-pressed", String(next === "light"));
            btn.textContent = next === "light" ? "Dark" : "Light";
          });
          window.EcoCharts?.refreshTheme();
        });
      });
    },
    initNavState() {
      const user = window.EcoData.getCurrentUserSync();
      const path = window.location.pathname;
      $$(".guest-only").forEach((node) => node.classList.toggle("hidden", Boolean(user)));
      $$(".auth-only").forEach((node) => node.classList.toggle("hidden", !user));
      $$(".avatar-mini").forEach((node) => {
        node.textContent = user?.name?.charAt(0)?.toUpperCase() || "U";
      });
      $$(".logout-btn").forEach((button) => button.addEventListener("click", () => window.EcoAuth.logout()));
      $$(".profile-link").forEach((node) => node.setAttribute("href", `${pageRoot()}pages/profile.html`));
      $$(".menu-toggle").forEach((button) => {
        button.addEventListener("click", () => {
          const menu = $("#mobileNav");
          const open = !menu.classList.contains("open");
          menu.classList.toggle("open", open);
          button.setAttribute("aria-expanded", String(open));
        });
      });
      $$(".nav-links a, .mobile-nav a").forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (href !== "#" && path.endsWith(href.replace("../", "").replace("./", ""))) {
          link.classList.add("active");
        }
      });
    },
    initAuthPage() {
      window.EcoAuth.redirectIfAuthenticated();
      const loginForm = $("#loginForm");
      const signupForm = $("#signupForm");
      const modeButtons = $$('[data-auth-mode]');
      modeButtons.forEach((button, idx) => {
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-pressed', String(idx === 0));
        button.addEventListener("click", () => {
          const mode = button.dataset.authMode;
          loginForm.classList.toggle("hidden", mode !== "login");
          signupForm.classList.toggle("hidden", mode !== "signup");
          setText("#authTitle", mode === "login" ? "Welcome back" : "Create your account");
          setText("#authSubtitle", mode === "login" ? "Sign in to continue tracking your impact." : "Start your private carbon dashboard in under a minute.");
          modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
          button.focus();
        });
      });
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = $("#loginBtn");
        try {
          this.setLoading(button, true);
          await window.EcoAuth.login(loginForm);
          this.showToast("Signed in successfully.", "success");
          window.location.href = "index.html";
        } catch (error) {
          this.showToast(error.message, "error");
          this.setLoading(button, false, "Sign in");
        }
      });
      signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = $("#signupBtn");
        try {
          this.setLoading(button, true);
          await window.EcoAuth.signup(signupForm);
          this.showToast("Account created.", "success");
          window.location.href = "index.html";
        } catch (error) {
          this.showToast(error.message, "error");
          this.setLoading(button, false, "Create account");
        }
      });
    },
    requireUser() {
      if (!window.EcoAuth.requireAuth()) return null;
      return window.EcoData.getCurrentUserSync();
    },
    initDashboard() {
      const user = this.requireUser();
      if (!user) return;
      const stats = window.EcoData.getStats(user);
      setText("#userName", user.name.split(" ")[0]);
      setText("#ecoScore", user.ecoScore || 50);
      setText("#totalPoints", user.points || 0);
      setText("#streakCount", user.streak || 0);
      setText("#weekAverage", stats ? stats.dailyAverage.toFixed(1) : "0.0");
      setText("#logCount", user.history.length);

      if (!stats) {
        setText("#insightPreview", "Log your first day to unlock insights, forecasts, and badges.");
        return;
      }

      const recent = stats.recent;
      const labels = recent.map((entry) => new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
      const totals = recent.map((entry) => window.EcoLogic.calculateEmissions(entry).total);
      window.EcoCharts?.renderLine("trendChart", labels, totals, "Daily emissions");
      window.EcoCharts?.renderDoughnut("breakdownChart", [stats.transport, stats.electricity, stats.food]);
      const insight = window.EcoLogic.generateInsights(user.history)[0];
      setText("#insightTitle", insight.title);
      setText("#insightPreview", insight.desc);
    },
    initTracker() {
      const user = this.requireUser();
      if (!user) return;
      const form = $("#trackerForm");
      $("#entryDate").value = window.EcoData.todayISO();
      const preview = $("#liveTotal");
      const updatePreview = () => {
        const entry = this.readTrackerForm(form);
        const emissions = window.EcoLogic.calculateEmissions(entry);
        preview.textContent = emissions.total.toFixed(2);
        setText("#transportPreview", formatKg(emissions.transport));
        setText("#electricityPreview", formatKg(emissions.electricity));
        setText("#foodPreview", formatKg(emissions.food));
      };
      $$("input, select", form).forEach((input) => input.addEventListener("input", updatePreview));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = $("#submitTracker");
        try {
          this.setLoading(button, true);
          await window.EcoData.logEntry(this.readTrackerForm(form));
          this.showToast("Daily footprint saved. +10 points", "success");
          window.location.href = "../index.html";
        } catch (error) {
          this.showToast(error.message, "error");
          this.setLoading(button, false, "Save daily log");
        }
      });
      updatePreview();
    },
    readTrackerForm(form) {
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
    },
    initInsights() {
      const user = this.requireUser();
      if (!user) return;
      const container = $("#insightsContainer");
      clear(container);
      window.EcoLogic.generateInsights(user.history).forEach((insight) => {
        const card = create("article", { className: "glass insight-card" });
        card.append(create("div", { className: "insight-icon", text: insight.type.slice(0, 1).toUpperCase(), attrs: { "aria-hidden": "true" } }));
        const body = create("div");
        body.append(create("h2", { text: insight.title }), create("p", { text: insight.desc }));
        const list = create("ul", { className: "tips" });
        insight.tips.forEach((tip) => list.append(create("li", { text: tip })));
        body.append(list);
        card.append(body);
        container.append(card);
      });
    },
    initReports() {
      const user = this.requireUser();
      if (!user) return;
      const report = window.EcoLogic.getForecast(user.history, 5);
      window.EcoCharts?.renderForecast("forecastChart", report.labels, report.values, report.forecastStart);
      this.renderHistoryTable(user.history);
      const stats = window.EcoData.getStats(user);
      setText("#weeklyTotal", stats ? stats.total.toFixed(1) : "0.0");
      setText("#weeklyAverage", stats ? stats.dailyAverage.toFixed(1) : "0.0");
      setText("#forecastDays", "5");
      $("#exportBtn").addEventListener("click", () => this.exportPdf());
    },
    renderHistoryTable(history) {
      const tbody = $("#historyTable tbody");
      clear(tbody);
      if (!history.length) {
        const row = create("tr");
        const cell = create("td", { text: "No logs yet.", attrs: { colspan: "6" } });
        row.append(cell);
        tbody.append(row);
        return;
      }
      history.slice().reverse().slice(0, 10).forEach((entry) => {
        const emissions = window.EcoLogic.calculateEmissions(entry);
        const row = create("tr");
        [
          entry.date,
          entry.transportMode,
          `${entry.transportDist} km`,
          `${entry.acHours}h AC, ${entry.fanHours}h fan`,
          entry.foodType,
          emissions.total.toFixed(2)
        ].forEach((value) => row.append(create("td", { text: value })));
        tbody.append(row);
      });
    },
    exportPdf() {
      const target = $("#reportContent");
      if (!window.html2pdf) {
        window.print();
        return;
      }
      window.html2pdf().set({
        margin: 10,
        filename: "EcoTrack-Pro-Report.pdf",
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
      }).from(target).save();
    },
    initSimulator() {
      const user = this.requireUser();
      if (!user) return;
      const stats = window.EcoData.getStats(user);
      const baseline = stats ? {
        transport: stats.transport,
        electricity: stats.electricity,
        food: stats.food
      } : { transport: 4.6, electricity: 5.2, food: 2.8 };
      const update = () => {
        const changes = {
          travel: Number($("#travelSlider").value),
          ac: Number($("#acSlider").value),
          appliances: Number($("#applianceSlider").value),
          diet: Number($("#dietSlider").value)
        };
        Object.entries(changes).forEach(([key, value]) => setText(`#${key}Value`, `${value}%`));
        const scenario = window.EcoLogic.buildScenario(baseline, changes);
        this.renderComparison(scenario);
        window.EcoCharts?.renderBars("scenarioChart", ["Transport", "Electricity", "Food"], [
          { label: "Before", data: [scenario.before.transport, scenario.before.electricity, scenario.before.food] },
          { label: "After", data: [scenario.after.transport, scenario.after.electricity, scenario.after.food] }
        ]);
        setText("#monthlySavings", formatKg(scenario.monthlySavings));
        setText("#treeEquivalent", Math.round(scenario.monthlySavings / window.EcoData.CO2_PER_TREE_MONTH));
      };
      $$("input[type='range']").forEach((slider) => slider.addEventListener("input", update));
      update();
    },
    renderComparison(scenario) {
      const container = $("#comparisonBlock");
      clear(container);
      [
        ["Transport", scenario.before.transport, scenario.after.transport],
        ["Electricity", scenario.before.electricity, scenario.after.electricity],
        ["Food", scenario.before.food, scenario.after.food],
        ["Total daily", scenario.before.total, scenario.after.total]
      ].forEach(([label, before, after]) => {
        const row = create("div", { className: "comparison-row" });
        row.append(create("span", { text: label }));
        const values = create("span");
        values.append(create("span", { className: "before", text: formatKg(before) }), document.createTextNode(" -> "), create("span", { className: "after", text: formatKg(after) }));
        row.append(values);
        container.append(row);
      });
    },
    async initLeaderboard() {
      const user = this.requireUser();
      if (!user) return;
      const entries = await window.EcoData.getLeaderboard();
      const list = $("#leaderboardList");
      const podium = $("#podium");
      clear(list);
      clear(podium);
      [entries[1], entries[0], entries[2]].filter(Boolean).forEach((entry) => {
        const place = create("div", { className: "podium-place" });
        const height = entry.rank === 1 ? 132 : entry.rank === 2 ? 100 : 78;
        place.append(create("div", { className: "avatar-mini", text: entry.name.charAt(0) }));
        place.append(create("div", { className: "podium-block", text: `#${entry.rank}`, attrs: { style: `height:${height}px` } }));
        place.append(create("strong", { text: entry.name.split(" ")[0] }), create("span", { className: "muted", text: `${entry.ecoScore} score` }));
        podium.append(place);
      });
      entries.slice(0, 10).forEach((entry) => list.append(this.leaderboardRow(entry)));
      const myRank = entries.find((entry) => entry.isCurrentUser);
      setText("#myRank", myRank ? `#${myRank.rank}` : "Unranked");
      if (myRank && myRank.rank > 10) list.append(this.leaderboardRow(myRank));
    },
    leaderboardRow(entry) {
      const row = create("article", { className: `leaderboard-row${entry.isCurrentUser ? " current" : ""}` });
      row.append(create("div", { className: `rank${entry.rank <= 3 ? " top" : ""}`, text: `#${entry.rank}` }));
      row.append(create("div", { className: "avatar-mini", text: entry.name.charAt(0) }));
      const info = create("div");
      info.append(create("strong", { text: entry.isCurrentUser ? `${entry.name} (You)` : entry.name }), create("div", { className: "muted", text: `${entry.city} | ${entry.streak}-day streak | ${entry.points} pts` }));
      row.append(info);
      row.append(create("div", { className: "right", text: `${entry.ecoScore}/100` }));
      return row;
    },
    initProfile() {
      const user = this.requireUser();
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
      const badges = $("#badgesGrid");
      clear(badges);
      window.EcoLogic.getBadges(user).forEach((badge) => {
        const card = create("article", { className: "badge-card" });
        card.append(create("span", { className: `chip ${badge.unlocked ? "good" : ""}`, text: badge.unlocked ? "Unlocked" : "Locked" }));
        card.append(create("h3", { text: badge.name }), create("p", { text: badge.desc }));
        badges.append(card);
      });
    },
    seedDemoIfEmpty() {
      if (window.EcoData.getCurrentUserSync()) return;
      const users = window.EcoData.getUsers();
      if (Object.keys(users).length) return;
      const history = Array.from({ length: 7 }, (_, index) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - index));
        return window.EcoData.normalizeEntry({
          date: d.toISOString().slice(0, 10),
          transportMode: index % 3 === 0 ? "metro" : "bus",
          transportDist: 12 + index,
          acHours: Math.max(0, 4 - index * 0.3),
          fanHours: 8,
          applianceHours: 4,
          heaterHours: 0.4,
          washingCycles: index % 2,
          foodType: index % 4 === 0 ? "meat" : "vegetarian"
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
      window.EcoLogic.updateGamification(user);
      users[user.id] = user;
      window.EcoData.saveUsers(users);
      window.EcoData.storage.setString(window.EcoData.STORAGE_KEYS.currentUser, user.id);
    },
    initPage() {
      this.initTheme();
      document.addEventListener("navbar-ready", () => {
        this.initTheme();
        this.initNavState();
      });
      this.initNavState();
      const page = document.body.dataset.page;
      if (new URLSearchParams(window.location.search).has("demo")) this.seedDemoIfEmpty();
      const map = {
        auth: () => this.initAuthPage(),
        dashboard: () => this.initDashboard(),
        tracker: () => this.initTracker(),
        insights: () => this.initInsights(),
        reports: () => this.initReports(),
        simulator: () => this.initSimulator(),
        leaderboard: () => this.initLeaderboard(),
        profile: () => this.initProfile()
      };
      map[page]?.();
    }
  };

  window.EcoUI = EcoUI;
  document.addEventListener("DOMContentLoaded", () => EcoUI.initPage());
})();
