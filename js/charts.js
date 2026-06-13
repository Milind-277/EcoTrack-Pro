(() => {
  const charts = {};

  function hasChart() {
    return typeof window.Chart !== "undefined";
  }

  function colors() {
    const light = document.documentElement.dataset.theme === "light";
    return {
      text: light ? "#10201b" : "#f4fbf8",
      muted: light ? "#4d655d" : "#a9bbb5",
      grid: light ? "rgba(16,32,27,0.1)" : "rgba(255,255,255,0.1)",
      primary: "#19c37d",
      secondary: "#4da3ff",
      accent: "#b072ff",
      warning: "#f5b84b",
      danger: "#ff6b6b"
    };
  }

  function destroy(id) {
    try {
      if (charts[id]) {
        if (typeof charts[id].destroy === "function") charts[id].destroy();
        else if (charts[id].chart && typeof charts[id].chart.destroy === "function") charts[id].chart.destroy();
        delete charts[id];
      }
    } catch (err) {
      // swallow chart cleanup errors but keep console trace in dev
      if (typeof console !== "undefined" && console.debug) console.debug("Chart destroy error", err);
      delete charts[id];
    }
  }

  function emptyState(id, message = "Chart unavailable") {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const box = canvas.closest(".chart-box");
    if (box && !box.querySelector(".chart-fallback")) {
      const p = document.createElement("p");
      p.className = "chart-fallback muted center";
      p.textContent = message;
      box.appendChild(p);
    }
  }

  function baseOptions(c) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 420 },
      plugins: {
        legend: { labels: { color: c.text, boxWidth: 12 } },
        tooltip: {
          backgroundColor: "rgba(10, 20, 17, 0.94)",
          titleColor: "#fff",
          bodyColor: "#dbe7e2",
          padding: 12,
          cornerRadius: 8
        }
      }
    };
  }

  function axis(c) {
    return {
      ticks: { color: c.muted },
      grid: { color: c.grid }
    };
  }

  window.EcoCharts = {
    destroy,
    renderLine(id, labels, data, label = "kg CO2e") {
      destroy(id);
      if (!hasChart()) return emptyState(id);
      const c = colors();
      try {
        charts[id] = new Chart(document.getElementById(id), {
        type: "line",
        data: {
          labels,
          datasets: [{
            label,
            data,
            borderColor: c.primary,
            backgroundColor: "rgba(25,195,125,0.16)",
            fill: true,
            tension: 0.35,
            pointRadius: 4
          }]
        },
        options: {
          ...baseOptions(c),
          scales: { x: axis(c), y: { ...axis(c), beginAtZero: true } }
        }
        }
      } catch (err) {
        emptyState(id, "Unable to render chart");
        if (console && console.error) console.error(err);
      }
    },
    renderForecast(id, labels, data, forecastStart) {
      destroy(id);
      if (!hasChart()) return emptyState(id);
      const c = colors();
      const actual = data.map((value, index) => (index < forecastStart ? value : null));
      const forecast = data.map((value, index) => (index >= forecastStart - 1 ? value : null));
      try {
        charts[id] = new Chart(document.getElementById(id), {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "Actual", data: actual, borderColor: c.primary, backgroundColor: "rgba(25,195,125,0.14)", fill: true, tension: 0.35 },
            { label: "Forecast", data: forecast, borderColor: c.accent, backgroundColor: "rgba(176,114,255,0.12)", borderDash: [6, 5], fill: true, tension: 0.35 }
          ]
        },
        options: {
          ...baseOptions(c),
          scales: { x: axis(c), y: { ...axis(c), beginAtZero: true } }
        }
        }
      } catch (err) {
        emptyState(id, "Unable to render chart");
        if (console && console.error) console.error(err);
      }
    },
    renderDoughnut(id, values) {
      destroy(id);
      if (!hasChart()) return emptyState(id);
      const c = colors();
      try {
        charts[id] = new Chart(document.getElementById(id), {
        type: "doughnut",
        data: {
          labels: ["Transport", "Electricity", "Food"],
          datasets: [{
            data: values,
            backgroundColor: [c.secondary, c.warning, c.primary],
            borderWidth: 0
          }]
        },
        options: {
          ...baseOptions(c),
          cutout: "68%"
        }
        }
      } catch (err) {
        emptyState(id, "Unable to render chart");
        if (console && console.error) console.error(err);
      }
    },
    renderBars(id, labels, datasets) {
      destroy(id);
      if (!hasChart()) return emptyState(id);
      const c = colors();
      const palette = [c.danger, c.primary, c.secondary, c.warning];
      try {
        charts[id] = new Chart(document.getElementById(id), {
        type: "bar",
        data: {
          labels,
          datasets: datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: palette[index % palette.length],
            borderRadius: 6
          }))
        },
        options: {
          ...baseOptions(c),
          scales: { x: axis(c), y: { ...axis(c), beginAtZero: true } }
        }
        }
      } catch (err) {
        emptyState(id, "Unable to render chart");
        if (console && console.error) console.error(err);
      }
    },
    refreshTheme() {
      Object.values(charts).forEach((chart) => {
        try { chart.update && chart.update("none"); } catch (e) { /* ignore */ }
      });
    }
  };
})();
