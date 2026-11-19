/**
 * ============================================================================
 * js/charts.js — ระบบสร้างและอัปเดตกราฟสถิติสุขภาพด้วย Chart.js
 * ============================================================================
 */

const AnalyticsCharts = {
  ratioChart: null,
  timelineChart: null,
  buzzerChart: null,
  currentPeriod: "daily",

  init() {
    const ratioCtx = document.getElementById("postureRatioChart");
    const timelineCtx = document.getElementById("postureTimelineChart");
    const buzzerCtx = document.getElementById("buzzerHourlyChart");

    if (!ratioCtx || !timelineCtx || !buzzerCtx) return;

    Chart.defaults.font.family = "'Prompt', sans-serif";
    Chart.defaults.color = "#64748b";

    // 1. Doughnut Chart: สัดส่วนท่านั่งถูก vs ผิด
    this.ratioChart = new Chart(ratioCtx, {
      type: "doughnut",
      data: {
        labels: ["Good Posture (นั่งถูกท่า)", "Slouching (หลังค่อม)", "Glute Sliding (ก้นสไลด์)"],
        datasets: [
          {
            data: [344, 78, 31],
            backgroundColor: ["#10b981", "#f59e0b", "#f43f5e"],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
          },
        },
      },
    });

    // 2. Stacked Bar Chart: ระยะเวลานั่งแบ่งตามช่วงเวลา
    this.timelineChart = new Chart(timelineCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Good Posture",
            data: [],
            backgroundColor: "#10b981",
            borderRadius: 6,
          },
          {
            label: "Slouching",
            data: [],
            backgroundColor: "#f59e0b",
            borderRadius: 6,
          },
          {
            label: "Glute Sliding",
            data: [],
            backgroundColor: "#f43f5e",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: "นาที" } },
        },
        plugins: {
          legend: { position: "top", labels: { usePointStyle: true } },
        },
      },
    });

    // 3. Buzzer Frequency Bar Chart
    this.buzzerChart = new Chart(buzzerCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "จำนวนครั้งที่ Active Buzzer ดังเตือน",
            data: [],
            backgroundColor: "rgba(244, 63, 94, 0.85)",
            borderRadius: 8,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });

    this.updatePeriod("daily");
  },

  updatePeriod(period) {
    this.currentPeriod = period;
    const dataset = APP_CONFIG.ANALYTICS_DATA[period];
    if (!dataset || !this.ratioChart) return;

    const sumGood = dataset.goodMins.reduce((a, b) => a + b, 0);
    const sumSlouch = dataset.slouchMins.reduce((a, b) => a + b, 0);
    const sumGlute = dataset.gluteMins.reduce((a, b) => a + b, 0);
    const total = sumGood + sumSlouch + sumGlute;
    const goodPct = total > 0 ? ((sumGood / total) * 100).toFixed(1) : "0.0";
    const totalBuzzers = dataset.buzzerHourlyCounts.reduce((a, b) => a + b, 0);

    // Update KPI Cards
    document.getElementById("kpi-good-rate").textContent = `${goodPct}%`;
    document.getElementById("kpi-slouch-mins").textContent = `${sumSlouch} นาที`;
    document.getElementById("kpi-glute-mins").textContent = `${sumGlute} นาที`;
    document.getElementById("kpi-buzzer-total").textContent = `${totalBuzzers} ครั้ง`;

    // Update Doughnut
    this.ratioChart.data.datasets[0].data = [sumGood, sumSlouch, sumGlute];
    this.ratioChart.update();

    // Update Stacked Bar
    this.timelineChart.data.labels = dataset.labels;
    this.timelineChart.data.datasets[0].data = dataset.goodMins;
    this.timelineChart.data.datasets[1].data = dataset.slouchMins;
    this.timelineChart.data.datasets[2].data = dataset.gluteMins;
    this.timelineChart.update();

    // Update Buzzer Hourly Chart
    this.buzzerChart.data.labels = dataset.buzzerHourlyLabels;
    this.buzzerChart.data.datasets[0].data = dataset.buzzerHourlyCounts;
    this.buzzerChart.update();
  },
};
