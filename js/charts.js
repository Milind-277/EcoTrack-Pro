/**
 * EcoTrack Pro - Chart Utility
 */

let activeCharts = [];

function getChartColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94A3B8';
}

function initChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = getChartColor();
  Chart.defaults.font.family = "'Poppins', sans-serif";
}

function renderPieChart(canvasId, dataValues, labels = ['Transport', 'Electricity', 'Food', 'Water']) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  initChartDefaults();
  
  const chart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      cutout: '75%',
      plugins: { legend: { position: 'bottom' } },
      animation: { animateScale: true, animateRotate: true }
    }
  });
  activeCharts.push(chart);
  return chart;
}

function renderLineChart(canvasId, labels, dataValues, label = 'Total Emission (kg)') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  initChartDefaults();

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: dataValues,
        borderColor: '#10b981',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#10b981'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
  activeCharts.push(chart);
  return chart;
}

function renderBarChart(canvasId, labels, dataValues, label = 'Emissions by Category') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  initChartDefaults();

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: dataValues,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
  activeCharts.push(chart);
  return chart;
}

function updateTheme() {
  const newColor = getChartColor();
  Chart.defaults.color = newColor;
  activeCharts.forEach(c => {
    c.options.scales?.y?.grid && (c.options.scales.y.grid.color = 'rgba(150,150,150,0.1)');
    c.update();
  });
}

window.EcoCharts = { renderPieChart, renderLineChart, renderBarChart, updateTheme };
