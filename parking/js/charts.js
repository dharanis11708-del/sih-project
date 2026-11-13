/**
 * Smart Parking Management System - Charts & Visualizations
 * Powered by Chart.js
 */

const ParkingCharts = {
  instances: {},

  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#cbd5e1' : '#475569',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      tooltipBg: isDark ? '#0f172a' : '#1e293b',
    };
  },

  // 1. Dashboard Area Occupancy Bar Chart
  renderDashboardAreaChart(canvasId = 'dashboard-area-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const { textColor, gridColor } = this.getThemeColors();
    const analytics = ParkingAPI.getAnalyticsData();
    const { labels, occupied, available } = analytics.areaOccupancy;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels.map((l) => l.split('(')[0].trim()),
        datasets: [
          {
            label: 'Occupied Slots',
            data: occupied,
            backgroundColor: '#ef4444',
            borderRadius: 6,
          },
          {
            label: 'Available Slots',
            data: available,
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { weight: '600', size: 12 } },
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                const total = items.reduce((a, b) => a + b.parsed.y, 0);
                return `Total Capacity: ${total} slots`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: textColor, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            stacked: true,
            ticks: { color: textColor, stepSize: 5 },
            grid: { color: gridColor },
          },
        },
      },
    });
  },

  // 2. Analytics: Vehicle Categories Doughnut Chart
  renderVehicleCategoryChart(canvasId = 'analytics-vehicle-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const { textColor } = this.getThemeColors();
    const analytics = ParkingAPI.getAnalyticsData();
    const { labels, data } = analytics.vehicleCategories;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: ['#2563eb', '#f59e0b', '#8b5cf6'],
            borderWidth: 2,
            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#111827' : '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, padding: 14, font: { size: 12, weight: '600' } },
          },
        },
        cutout: '65%',
      },
    });
  },

  // 3. Analytics: Peak Parking Hours Bar Chart (Highlight 9-11 AM & 4-6 PM)
  renderPeakHoursChart(canvasId = 'analytics-peak-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const { textColor, gridColor } = this.getThemeColors();
    const analytics = ParkingAPI.getAnalyticsData();
    const { labels, data } = analytics.peakHours;

    // Highlight peak hours: 9-11 (indices 9, 10, 11) and 16-18 (indices 16, 17, 18)
    const backgroundColors = labels.map((_, idx) => {
      if ((idx >= 9 && idx <= 11) || (idx >= 16 && idx <= 18)) {
        return '#ef4444'; // Red highlight for peak
      }
      return '#3b82f6'; // Blue standard
    });

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Vehicle Entries',
            data: data,
            backgroundColor: backgroundColors,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const hour = context.dataIndex;
                if ((hour >= 9 && hour <= 11) || (hour >= 16 && hour <= 18)) {
                  return '🔥 PEAK TRAFFIC PERIOD';
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              callback: function (val, index) {
                return index % 2 === 0 ? labels[index] : '';
              },
            },
            grid: { display: false },
          },
          y: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    });
  },

  // 4. Analytics: Daily Revenue Line Chart (30 Days)
  renderDailyRevenueChart(canvasId = 'analytics-revenue-chart') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
    }

    const { textColor, gridColor } = this.getThemeColors();
    const analytics = ParkingAPI.getAnalyticsData();
    const { labels, data } = analytics.dailyRevenue;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Revenue (₹)',
            data: data,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointRadius: 3,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { weight: '600' } },
          },
          tooltip: {
            callbacks: {
              label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: textColor,
              maxRotation: 45,
              callback: function (val, index) {
                return index % 3 === 0 ? labels[index] : '';
              },
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: textColor,
              callback: (val) => `₹${val}`,
            },
            grid: { color: gridColor },
          },
        },
      },
    });
  },

  // 5. Analytics: Hour vs Weekday Heatmap (Custom HTML/CSS renderer)
  renderHeatmap(containerId = 'analytics-heatmap-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const analytics = ParkingAPI.getAnalyticsData();
    const { days, hoursRange, matrix } = analytics.heatmap;

    // Find maximum count to scale intensity classes (heat-0 to heat-6)
    let maxCount = 1;
    matrix.forEach((row) => {
      row.hours.forEach((val) => {
        if (val > maxCount) maxCount = val;
      });
    });

    let html = `<div class="heatmap-container"><div class="heatmap-grid">`;

    // 1. Header row with hours
    html += `<div class="heatmap-header-cell">Day</div>`;
    hoursRange.forEach((hour) => {
      html += `<div class="heatmap-header-cell">${hour}</div>`;
    });

    // 2. Rows for each Day
    matrix.forEach((row) => {
      html += `<div class="heatmap-day-label">${row.dayName}</div>`;
      row.hours.forEach((count, hIdx) => {
        // Calculate heat level from 0 to 6
        const heatLevel = count === 0 ? 0 : Math.min(6, Math.max(1, Math.ceil((count / maxCount) * 6)));
        const hourLabel = hoursRange[hIdx];
        html += `
          <div class="heatmap-cell heat-${heatLevel}" title="${row.dayName} at ${hourLabel}: ${count} vehicles">
            ${count > 0 ? count : ''}
          </div>
        `;
      });
    });

    html += `</div></div>`;
    container.innerHTML = html;
  },

  // Refresh all charts when theme changes or data updates
  refreshAll() {
    this.renderDashboardAreaChart();
    this.renderVehicleCategoryChart();
    this.renderPeakHoursChart();
    this.renderDailyRevenueChart();
    this.renderHeatmap();
  },
};

