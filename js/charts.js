(() => {
  "use strict";

  const instances = {};

  const isDark = () => document.documentElement.dataset.theme !== "light";

  function palette() {
    const dark = isDark();
    return {
      text: dark ? "#f4fbf8" : "#10201b",
      muted: dark ? "#a9bbb5" : "#4d655d",
      grid: dark ? "rgba(255,255,255,0.09)" : "rgba(16,32,27,0.09)",
      primary: "#19c37d",
      secondary: "#4da3ff",
      accent: "#b072ff",
      warning: "#f5b84b",
      danger: "#ff6b6b"
    };
  }

  function baseOpts(p) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeInOutQuart" },
      plugins: {
        legend: {
          labels: { color: p.text, boxWidth: 12, font: { family: "Inter, system-ui, sans-serif", size: 12 } }
        },
        tooltip: {
          backgroundColor: "rgba(10,20,17,0.95)",
          titleColor: "#fff",
          bodyColor: "#dbe7e2",
          padding: 12,
          cornerRadius: 8,
          borderColor: "rgba(25,195,125,0.3)",
          borderWidth: 1
        }
      }
    };
  }

  function axisStyle(p) {
    return { ticks: { color: p.muted, font: { size: 11 } }, grid: { color: p.grid } };
  }

  function destroy(id) {
    if (instances[id]) {
      try { instances[id].destroy(); } catch (_) {}
      delete instances[id];
    }
  }

  function emptyState(id, msg = "No data available. Start tracking today to see insights.") {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const box = canvas.closest(".chart-box");
    if (box && !box.querySelector(".chart-fallback")) {
      const p = document.createElement("p");
      p.className = "chart-fallback muted center";
      p.textContent = msg;
      box.appendChild(p);
    }
  }

  function renderLine(id, labels, data, label = "kg CO₂e") {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return emptyState(id);
    const p = palette();
    try {
      instances[id] = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label,
            data,
            borderColor: p.primary,
            backgroundColor: "rgba(25,195,125,0.14)",
            fill: true,
            tension: 0.38,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: p.primary
          }]
        },
        options: {
          ...baseOpts(p),
          scales: { x: axisStyle(p), y: { ...axisStyle(p), beginAtZero: true } }
        }
      });
    } catch (e) {
      emptyState(id, "Chart unavailable");
      if (console?.error) console.error(e);
    }
  }

  function renderForecast(id, labels, actuals, predictions, forecastStart, confidence = "Low") {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return emptyState(id);
    const p = palette();

    const actualData = actuals.map((v, i) => (i < forecastStart ? v : null));
    const bridge = actuals.length > 0 ? [...Array(forecastStart - 1).fill(null), actuals[actuals.length - 1], ...predictions] : predictions;

    const confColor = { Low: p.danger, Medium: p.warning, High: p.primary }[confidence] || p.accent;

    try {
      instances[id] = new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Actual",
              data: [...actualData, ...Array(predictions.length).fill(null)],
              borderColor: p.primary,
              backgroundColor: "rgba(25,195,125,0.12)",
              fill: true,
              tension: 0.38,
              pointRadius: 5,
              pointBackgroundColor: p.primary
            },
            {
              label: `Forecast (${confidence} confidence)`,
              data: bridge,
              borderColor: confColor,
              backgroundColor: "rgba(176,114,255,0.1)",
              borderDash: [6, 4],
              fill: true,
              tension: 0.38,
              pointRadius: 4
            }
          ]
        },
        options: {
          ...baseOpts(p),
          scales: { x: axisStyle(p), y: { ...axisStyle(p), beginAtZero: true } }
        }
      });
    } catch (e) {
      emptyState(id, "Forecast unavailable");
      if (console?.error) console.error(e);
    }
  }

  function renderDoughnut(id, values) {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return emptyState(id);
    const p = palette();
    try {
      instances[id] = new Chart(canvas, {
        type: "doughnut",
        data: {
          labels: ["Transport", "Electricity", "Food"],
          datasets: [{
            data: values,
            backgroundColor: [p.secondary, p.warning, p.primary],
            borderWidth: 0,
            hoverOffset: 8
          }]
        },
        options: {
          ...baseOpts(p),
          cutout: "70%"
        }
      });
    } catch (e) {
      emptyState(id, "Chart unavailable");
      if (console?.error) console.error(e);
    }
  }

  function renderBars(id, labels, datasets) {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return emptyState(id);
    const p = palette();
    const colors = [p.danger, p.primary, p.secondary, p.warning];
    try {
      instances[id] = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: datasets.map((ds, i) => ({
            ...ds,
            backgroundColor: colors[i % colors.length],
            borderRadius: 6,
            borderSkipped: false
          }))
        },
        options: {
          ...baseOpts(p),
          scales: { x: axisStyle(p), y: { ...axisStyle(p), beginAtZero: true } }
        }
      });
    } catch (e) {
      emptyState(id, "Chart unavailable");
      if (console?.error) console.error(e);
    }
  }

  function refreshTheme() {
    Object.values(instances).forEach((c) => {
      try { if (c?.update) c.update("none"); } catch (_) {}
    });
  }

  window.EcoCharts = {
    destroy,
    renderLine,
    renderForecast,
    renderDoughnut,
    renderBars,
    refreshTheme
  };
})();
