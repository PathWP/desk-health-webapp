/**
 * ============================================================================
 * js/app.js — ตัวควบคุมหลักของแอปพลิเคชัน (Main Controller & 1-Second Engine)
 * ============================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. โหลดการตั้งค่าและสร้างไอคอน Lucide
  AppState.loadSettings();
  lucide.createIcons();

  // 2. ผูก Event Listeners ทั้งหมด
  bindAuthEvents();
  bindNavigationEvents();
  bindDashboardControls();
  bindAnalyticsControls();
  bindSettingsForm();

  // 3. เติมข้อมูลประวัติเหตุการณ์เริ่มต้นและเริ่มต้นกราฟ
  seedInitialLogs();
  AnalyticsCharts.init();
  syncSettingsToUI();

  // 4. เริ่ม Loop การทำงานทุก 1 วินาที (จำลอง Sampling Rate 1-2s และตัวจับเวลาสุขภาพ)
  setInterval(runOneSecondTick, 1000);
});

/* --------------------------------------------------------------------------
 * A. AUTHENTICATION HANDLERS
 * -------------------------------------------------------------------------- */
function bindAuthEvents() {
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const nameGroup = document.getElementById("register-name-group");
  const submitBtnText = document.querySelector("#auth-submit-btn span");
  const authForm = document.getElementById("auth-form");
  const demoBtn = document.getElementById("demo-login-btn");
  const authError = document.getElementById("auth-error");

  let authMode = "login";

  tabLogin.addEventListener("click", () => {
    authMode = "login";
    tabLogin.className = "py-2 rounded-lg bg-white text-slate-900 shadow-sm transition";
    tabRegister.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 transition";
    nameGroup.classList.add("hidden");
    submitBtnText.textContent = "เข้าสู่ระบบผ่าน ThingsBoard API";
    authError.classList.add("hidden");
  });

  tabRegister.addEventListener("click", () => {
    authMode = "register";
    tabRegister.className = "py-2 rounded-lg bg-white text-slate-900 shadow-sm transition";
    tabLogin.className = "py-2 rounded-lg text-slate-500 hover:text-slate-800 transition";
    nameGroup.classList.remove("hidden");
    submitBtnText.textContent = "ลงทะเบียนผู้ใช้งานใหม่";
    authError.classList.add("hidden");
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.classList.add("hidden");

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const tbUrl = document.getElementById("auth-tb-url").value.trim();
    const fullName = document.getElementById("auth-fullname").value.trim();

    if (authMode === "register") {
      enterApplication({
        name: fullName || email.split("@")[0],
        email,
        isDemo: true,
      });
      AlertService.showToast({
        title: "ลงทะเบียนสำเร็จ (Demo Sandbox)",
        message: "สร้างบัญชีและเชื่อมต่อข้อมูลจำลอง ESP32-S3 เรียบร้อยแล้ว",
        variant: "success",
      });
      return;
    }

    try {
      await ThingsBoardAPI.login(email, password, tbUrl);
      enterApplication({ name: email.split("@")[0], email, isDemo: false });
      ThingsBoardAPI.connectTelemetryWebSocket((telemetry) => {
        setPostureState(telemetry.posture, telemetry.confidence);
      });
    } catch (err) {
      authError.textContent = `ไม่สามารถเชื่อมต่อ ThingsBoard Server (${err.message}) — กรุณากดปุ่ม "เข้าสู่ระบบด้วยโหมดจำลอง (Demo Mode)" ด้านล่างเพื่อทดสอบระบบ`;
      authError.classList.remove("hidden");
    }
  });

  demoBtn.addEventListener("click", () => {
    enterApplication({
      name: "Demo Ergonomics User",
      email: "user@deskhealth.io",
      isDemo: true,
    });
  });

  // Logout Buttons
  const handleLogout = () => {
    ThingsBoardAPI.disconnect();
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
  };
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("mobile-logout-btn").addEventListener("click", handleLogout);
}

function enterApplication({ name, email, isDemo }) {
  AppState.user = { name, email };
  AppState.isDemoMode = isDemo;

  document.getElementById("sidebar-user-name").textContent = name;
  document.getElementById("sidebar-conn-mode").textContent = isDemo
    ? "Demo Mode (ESP32-S3 Sim)"
    : "ThingsBoard Live WSS";

  document.getElementById("tb-status-text").textContent = isDemo
    ? "ESP32-S3 Simulator Active"
    : "Connected: ThingsBoard Live";

  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  updateDashboardUI();
}

/* --------------------------------------------------------------------------
 * B. NAVIGATION & VIEW SWITCHING
 * -------------------------------------------------------------------------- */
function bindNavigationEvents() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const views = {
    dashboard: document.getElementById("view-dashboard"),
    analytics: document.getElementById("view-analytics"),
    settings: document.getElementById("view-settings"),
  };

  const titles = {
    dashboard: [
      "Real-time Posture Dashboard",
      "ติดตามท่านั่งทำงานและการแจ้งเตือนสุขภาพแบบเรียลไทม์ (Sampling 1-2s)",
    ],
    analytics: [
      "Posture Analytics & Reports",
      "วิเคราะห์สถิติสัดส่วนท่านั่งถูกสุขลักษณะและความถี่การแจ้งเตือน Buzzer",
    ],
    settings: [
      "System & ThingsBoard Settings",
      "กำหนดเวลาเตือนสุขภาพและการเชื่อมต่อ ThingsBoard IoT Platform",
    ],
  };

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      navBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.keys(views).forEach((key) => {
        views[key].classList.toggle("hidden", key !== target);
      });

      document.getElementById("page-title").textContent = titles[target][0];
      document.getElementById("page-subtitle").textContent = titles[target][1];

      if (target === "analytics") {
        AnalyticsCharts.updatePeriod(AnalyticsCharts.currentPeriod);
      }
    });
  });
}

/* --------------------------------------------------------------------------
 * C. DASHBOARD CONTROLS & EDGE AI SIMULATOR
 * -------------------------------------------------------------------------- */
function bindDashboardControls() {
  // ปุ่มเลือกสถานะจำลอง 4 คลาส
  document.querySelectorAll(".sim-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // ปิดการสุ่มอัตโนมัติเมื่อผู้ใช้กดเลือกเองเพื่อทดสอบ
      const autoToggle = document.getElementById("auto-sim-toggle");
      autoToggle.checked = false;
      AppState.live.autoSimulate = false;

      const selectedPosture = btn.dataset.simPosture;
      const randomConf = +(0.91 + Math.random() * 0.08).toFixed(2);
      setPostureState(selectedPosture, randomConf);
    });
  });

  // สวิตช์สุ่มสถานะอัตโนมัติ
  document.getElementById("auto-sim-toggle").addEventListener("change", (e) => {
    AppState.live.autoSimulate = e.target.checked;
  });

  // ปุ่มเปิด/ปิดเสียงเตือน Buzzer
  document.getElementById("quick-sound-btn").addEventListener("click", () => {
    AppState.settings.soundEnabled = !AppState.settings.soundEnabled;
    AppState.saveSettings();
    updateSoundButtonUI();
  });

  // ปิด Urgent Banner
  document.getElementById("dismiss-banner-btn").addEventListener("click", () => {
    AlertService.hideUrgentBanner();
  });

  // ปุ่มทดสอบเร่งเวลานั่งต่อเนื่อง +10 นาที
  document.getElementById("fast-forward-sitting-btn").addEventListener("click", () => {
    AppState.live.continuousSittingSec += 600;
    checkSedentaryThreshold();
    updateDashboardUI();
  });

  // ปุ่มลุกยืดเส้นแล้ว (รีเซ็ตเวลานั่งต่อเนื่อง)
  document.getElementById("reset-stretch-btn").addEventListener("click", () => {
    AppState.live.continuousSittingSec = 0;
    AppState.live.sedentaryAlertShown = false;
    AlertService.hideUrgentBanner();
    addEventLog("Sedentary Reset", "ผู้ใช้งานลุกยืดเส้นยืดสาย", "รีเซ็ตตัวนับ 45 นาที");
    AlertService.showToast({
      title: "เยี่ยมมาก! รีเซ็ตเวลานั่งต่อเนื่องแล้ว",
      message: "เริ่มต้นนับรอบการทำงานใหม่ 45 นาที",
      variant: "success",
    });
    updateDashboardUI();
  });

  // สวิตช์ Hydration บน Dashboard
  document.getElementById("dash-hydration-toggle").addEventListener("change", (e) => {
    AppState.settings.hydrationEnabled = e.target.checked;
    document.getElementById("set-hydration-enabled").checked = e.target.checked;
    AppState.saveSettings();
    updateDashboardUI();
  });

  // ปุ่มทดสอบเตือนดื่มน้ำทันที
  document.getElementById("test-hydration-btn").addEventListener("click", () => {
    triggerHydrationAlert();
  });

  // ปุ่มดื่มน้ำแล้ว (+1 แก้ว และรีเซ็ตตัวนับ)
  document.getElementById("drink-water-btn").addEventListener("click", () => {
    AppState.live.waterGlasses += 1;
    AppState.live.hydrationRemainingSec = AppState.settings.hydrationMinutes * 60;
    addEventLog("Hydration", `ดื่มน้ำแก้วที่ ${AppState.live.waterGlasses}`, "รีเซ็ตตัวนับดื่มน้ำ");
    AlertService.showToast({
      title: `บันทึกการดื่มน้ำแก้วที่ ${AppState.live.waterGlasses} แล้ว`,
      message: `ระบบจะเตือนอีกครั้งในอีก ${AppState.settings.hydrationMinutes} นาที`,
      variant: "water",
    });
    updateDashboardUI();
  });

  // ปุ่มล้างตารางประวัติ
  document.getElementById("clear-logs-btn").addEventListener("click", () => {
    document.getElementById("event-log-tbody").innerHTML = "";
  });
}

function setPostureState(postureKey, confidence = 0.95) {
  AppState.live.currentPosture = postureKey;
  AppState.live.confidence = confidence;

  // ไฮไลต์ปุ่ม Simulator ที่เลือกอยู่
  document.querySelectorAll(".sim-btn").forEach((btn) => {
    btn.classList.toggle("ring-2", btn.dataset.simPosture === postureKey);
    btn.classList.toggle("ring-white", btn.dataset.simPosture === postureKey);
  });

  updateDashboardUI();
}

/* --------------------------------------------------------------------------
 * D. MAIN 1-SECOND ENGINE (Debounce 5s, Sedentary 45m, Hydration 60m)
 * -------------------------------------------------------------------------- */
let autoSimTickCounter = 0;

function runOneSecondTick() {
  // ทำงานเฉพาะเมื่อเข้าสู่ระบบแล้ว
  if (document.getElementById("app-shell").classList.contains("hidden")) return;

  const live = AppState.live;
  const settings = AppState.settings;

  // 1. สุ่มสถานะจำลองอัตโนมัติทุกๆ 8 วินาที (หากเปิด Auto Simulate)
  if (live.autoSimulate) {
    autoSimTickCounter++;
    if (autoSimTickCounter >= 8) {
      autoSimTickCounter = 0;
      const pool = ["Good_Posture", "Good_Posture", "Good_Posture", "Slouching", "Glute_Sliding"];
      const next = pool[Math.floor(Math.random() * pool.length)];
      setPostureState(next, +(0.9 + Math.random() * 0.09).toFixed(2));
    }
  }

  const meta = APP_CONFIG.POSTURE_META[live.currentPosture];

  // 2. ตรรกะ Debounce 5 วินาทีสำหรับท่านั่งผิด (Slouching / Glute_Sliding)
  if (meta.isBad) {
    live.badPostureStreakSec += 1;
    live.dailyBadSec += 1;

    if (live.badPostureStreakSec >= settings.debounceSeconds && !live.buzzerTriggered) {
      live.buzzerTriggered = true;
      live.dailyBuzzerCount += 1;

      // สั่งงานเสียง Buzzer + แจ้งเตือนบน Web App
      AlertService.playBuzzerTone("posture");
      AlertService.showUrgentBanner({
        title: `แจ้งเตือนนั่งผิดท่า (${meta.labelTh}) เกิน ${settings.debounceSeconds} วินาที!`,
        desc: meta.advice,
        level: "danger",
      });
      AlertService.showToast({
        title: `Buzzer Alert: ${live.currentPosture}`,
        message: `ตรวจพบ "${meta.labelTh}" ติดต่อกันครบ ${settings.debounceSeconds} วินาที`,
        variant: "danger",
      });
      addEventLog(
        "Bad Posture Alert",
        `${meta.labelTh} (${live.currentPosture})`,
        "Active Buzzer ดัง + ส่ง MQTT Alert"
      );
    }
  } else {
    // รีเซ็ต Debounce ทันทีเมื่อกลับมานั่งตรงหรือลุกออกจากโต๊ะ
    if (live.buzzerTriggered) {
      AlertService.hideUrgentBanner();
    }
    live.badPostureStreakSec = 0;
    live.buzzerTriggered = false;

    if (live.currentPosture === "Good_Posture") {
      live.dailyGoodSec += 1;
    }
  }

  // 3. นับเวลานั่งต่อเนื่อง (นับเฉพาะสถานะที่ไม่ใช่ No_User)
  if (meta.isSitting) {
    live.continuousSittingSec += 1;
    checkSedentaryThreshold();
  }

  // 4. นับถอยหลังเตือนดื่มน้ำ (Hydration Reminder)
  if (settings.hydrationEnabled && live.hydrationRemainingSec > 0) {
    live.hydrationRemainingSec -= 1;
    if (live.hydrationRemainingSec === 0) {
      triggerHydrationAlert();
      live.hydrationRemainingSec = settings.hydrationMinutes * 60;
    }
  }

  // 5. อัปเดตหน้าจอ Dashboard และ MQTT JSON Payload Preview
  live.mqttPackets += 1;
  updateDashboardUI();
}

function checkSedentaryThreshold() {
  const limitSec = AppState.settings.sedentaryMinutes * 60;
  if (AppState.live.continuousSittingSec >= limitSec && !AppState.live.sedentaryAlertShown) {
    AppState.live.sedentaryAlertShown = true;
    AlertService.playBuzzerTone("health");
    AlertService.showUrgentBanner({
      title: `เตือนนั่งทำงานต่อเนื่องครบ ${AppState.settings.sedentaryMinutes} นาทีแล้ว!`,
      desc: "กรุณาลุกขึ้นยืน ยืดเส้นยืดสาย หรือเดินพักสายตา 2-3 นาที",
      level: "warning",
    });
    AlertService.showToast({
      title: "Sedentary Alert (นั่งนานเกินไป)",
      message: `คุณนั่งทำงานต่อเนื่องครบ ${AppState.settings.sedentaryMinutes} นาทีแล้ว ลุกยืดเส้นกันเถอะ`,
      variant: "warning",
      duration: 8000,
    });
    addEventLog(
      "Sedentary Alert",
      `นั่งต่อเนื่องครบ ${AppState.settings.sedentaryMinutes} นาที`,
      "แจ้งเตือนให้ลุกยืดเส้นยืดสาย"
    );
  }
}

function triggerHydrationAlert() {
  AlertService.playBuzzerTone("health");
  AlertService.showToast({
    title: "ถึงเวลาดื่มน้ำแล้ว (Hydration Reminder)",
    message: "จิบน้ำสะอาด 1 แก้ว เพื่อเพิ่มความสดชื่นและลดอาการอ่อนล้า",
    variant: "water",
    duration: 7000,
  });
  addEventLog("Hydration Reminder", "ครบกำหนดเวลาเตือนดื่มน้ำ", "แจ้งเตือนบน Web App");
}

/* --------------------------------------------------------------------------
 * E. UPDATE DASHBOARD UI
 * -------------------------------------------------------------------------- */
function updateDashboardUI() {
  const live = AppState.live;
  const settings = AppState.settings;
  const meta = APP_CONFIG.POSTURE_META[live.currentPosture];

  // Hero Card & Colors
  const heroCard = document.getElementById("posture-hero-card");
  const lamp = document.getElementById("posture-lamp");
  const badge = document.getElementById("posture-class-badge");

  const themeMap = {
    emerald: {
      border: "border-emerald-200",
      lamp: "bg-emerald-100 text-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      bar: "bg-emerald-500",
    },
    amber: {
      border: "border-amber-300",
      lamp: "bg-amber-100 text-amber-600",
      badge: "bg-amber-100 text-amber-800",
      bar: "bg-amber-500",
    },
    rose: {
      border: "border-rose-300",
      lamp: "bg-rose-100 text-rose-600",
      badge: "bg-rose-100 text-rose-800",
      bar: "bg-rose-500",
    },
    slate: {
      border: "border-slate-200",
      lamp: "bg-slate-100 text-slate-500",
      badge: "bg-slate-200 text-slate-700",
      bar: "bg-slate-400",
    },
  };

  const t = themeMap[meta.colorTheme];
  heroCard.className = `xl:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border-2 ${t.border} shadow-sm transition-all duration-300 flex flex-col justify-between ${
    live.buzzerTriggered ? "posture-alert-pulse" : ""
  }`;
  lamp.className = `w-20 h-20 rounded-3xl ${t.lamp} flex items-center justify-center shrink-0 shadow-inner transition-colors`;
  badge.className = `px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold ${t.badge}`;

  document.getElementById("posture-label-th").textContent = meta.labelTh;
  badge.textContent = live.currentPosture;
  document.getElementById("posture-advice").textContent = meta.advice;
  document.getElementById("posture-confidence").textContent = `Confidence: ${(live.confidence * 100).toFixed(1)}%`;

  // Update Hero Icon dynamically
  lamp.innerHTML = `<i data-lucide="${meta.icon}" class="w-10 h-10"></i>`;
  lucide.createIcons({ nodes: [lamp] });

  // Debounce Progress Bar
  const maxDebounce = settings.debounceSeconds;
  const clampedStreak = Math.min(live.badPostureStreakSec, maxDebounce);
  const debouncePct = (clampedStreak / maxDebounce) * 100;

  document.getElementById("debounce-max-label").textContent = maxDebounce;
  const barEl = document.getElementById("debounce-progress-bar");
  barEl.style.width = `${debouncePct}%`;
  barEl.className = `h-full ${t.bar} rounded-full transition-all duration-300`;

  document.getElementById("debounce-counter-text").textContent = meta.isBad
    ? `${live.badPostureStreakSec.toFixed(1)}s / ${maxDebounce}.0s ${live.buzzerTriggered ? "(BUZZER ON!)" : "(กำลังตรวจสอบ...)"}`
    : `0.0s / ${maxDebounce}.0s (ปกติ)`;

  const buzzerHwEl = document.getElementById("buzzer-hardware-state");
  buzzerHwEl.textContent = live.buzzerTriggered ? "BUZZER: ACTIVE (BEEPING)" : "BUZZER: OFF";
  buzzerHwEl.className = live.buzzerTriggered
    ? "font-mono font-bold text-rose-600"
    : "font-mono text-slate-500";

  // MQTT Payload Preview
  document.getElementById("mqtt-packet-count").textContent = `Packets: ${live.mqttPackets}`;
  document.getElementById("mqtt-payload-preview").textContent = JSON.stringify(
    {
      posture: live.currentPosture,
      confidence: live.confidence,
      duration: meta.isBad ? live.badPostureStreakSec : live.continuousSittingSec,
      alert: live.buzzerTriggered,
    },
    null,
    2
  );

  // Timer 1: Continuous Sitting (Sedentary)
  document.getElementById("continuous-time-display").textContent = formatMMSS(live.continuousSittingSec);
  document.getElementById("sedentary-target-label").textContent = settings.sedentaryMinutes;
  const sedentaryPct = Math.min(100, (live.continuousSittingSec / (settings.sedentaryMinutes * 60)) * 100);
  document.getElementById("sedentary-progress-bar").style.width = `${sedentaryPct}%`;

  // Timer 2: Cumulative Daily Sitting
  const totalDailySec = live.dailyGoodSec + live.dailyBadSec;
  const hrs = Math.floor(totalDailySec / 3600);
  const mins = Math.floor((totalDailySec % 3600) / 60);
  const goodPct = totalDailySec > 0 ? Math.round((live.dailyGoodSec / totalDailySec) * 100) : 100;

  document.getElementById("daily-total-display").textContent = `${hrs} ชม. ${mins} น.`;
  document.getElementById("daily-good-pct").textContent = `${goodPct}%`;
  document.getElementById("daily-buzzer-count").textContent = live.dailyBuzzerCount;
  document.getElementById("daily-good-bar").style.width = `${goodPct}%`;

  // Timer 3: Hydration Countdown
  const hydDisplay = document.getElementById("hydration-countdown-display");
  const hydStatus = document.getElementById("hydration-status-label");
  if (settings.hydrationEnabled) {
    hydDisplay.textContent = formatMMSS(live.hydrationRemainingSec);
    hydDisplay.className = "text-3xl font-bold font-mono text-sky-600";
    hydStatus.textContent = `ถัดไป (ทุก ${settings.hydrationMinutes} น.)`;
  } else {
    hydDisplay.textContent = "ปิดใช้งาน";
    hydDisplay.className = "text-2xl font-bold text-slate-400";
    hydStatus.textContent = "เปิดสวิตช์เพื่อเริ่มนับเวลา";
  }
  document.getElementById("water-glasses-count").textContent = live.waterGlasses;
}

function updateSoundButtonUI() {
  const enabled = AppState.settings.soundEnabled;
  const iconEl = document.getElementById("quick-sound-icon");
  const labelEl = document.getElementById("quick-sound-label");

  labelEl.textContent = enabled ? "เสียงเตือน: เปิด" : "เสียงเตือน: ปิด";
  iconEl.setAttribute("data-lucide", enabled ? "volume-2" : "volume-x");
  lucide.createIcons({ nodes: [document.getElementById("quick-sound-btn")] });
}

/* --------------------------------------------------------------------------
 * F. ANALYTICS & SETTINGS HANDLERS
 * -------------------------------------------------------------------------- */
function bindAnalyticsControls() {
  const dailyBtn = document.getElementById("analytics-daily-btn");
  const weeklyBtn = document.getElementById("analytics-weekly-btn");

  dailyBtn.addEventListener("click", () => {
    dailyBtn.className = "px-4 py-2 rounded-lg bg-white text-slate-900 shadow-sm transition";
    weeklyBtn.className = "px-4 py-2 rounded-lg text-slate-500 hover:text-slate-900 transition";
    AnalyticsCharts.updatePeriod("daily");
  });

  weeklyBtn.addEventListener("click", () => {
    weeklyBtn.className = "px-4 py-2 rounded-lg bg-white text-slate-900 shadow-sm transition";
    dailyBtn.className = "px-4 py-2 rounded-lg text-slate-500 hover:text-slate-900 transition";
    AnalyticsCharts.updatePeriod("weekly");
  });
}

function bindSettingsForm() {
  const form = document.getElementById("settings-form");
  const testConnBtn = document.getElementById("test-tb-conn-btn");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    AppState.settings.sedentaryMinutes = Math.max(5, parseInt(document.getElementById("set-sedentary-mins").value, 10) || 45);
    AppState.settings.debounceSeconds = Math.max(2, parseInt(document.getElementById("set-debounce-secs").value, 10) || 5);
    AppState.settings.hydrationMinutes = Math.max(10, parseInt(document.getElementById("set-hydration-mins").value, 10) || 60);
    AppState.settings.hydrationEnabled = document.getElementById("set-hydration-enabled").checked;
    AppState.settings.tbUrl = document.getElementById("set-tb-url").value.trim() || "https://thingsboard.cloud";
    AppState.settings.tbDeviceId = document.getElementById("set-tb-device-id").value.trim();

    AppState.live.hydrationRemainingSec = AppState.settings.hydrationMinutes * 60;
    AppState.saveSettings();
    syncSettingsToUI();
    updateDashboardUI();

    AlertService.showToast({
      title: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
      message: "อัปเดตเกณฑ์แจ้งเตือนสุขภาพและการเชื่อมต่อ ThingsBoard เรียบร้อย",
      variant: "success",
    });
  });

  testConnBtn.addEventListener("click", async () => {
    const url = document.getElementById("set-tb-url").value.trim();
    AlertService.showToast({
      title: "กำลังตรวจสอบ ThingsBoard Endpoint...",
      message: `Ping ไปยัง ${url}/api/v1/telemetry`,
      variant: "info",
      duration: 3000,
    });
  });
}

function syncSettingsToUI() {
  const s = AppState.settings;
  document.getElementById("set-sedentary-mins").value = s.sedentaryMinutes;
  document.getElementById("set-debounce-secs").value = s.debounceSeconds;
  document.getElementById("set-hydration-mins").value = s.hydrationMinutes;
  document.getElementById("set-hydration-enabled").checked = s.hydrationEnabled;
  document.getElementById("dash-hydration-toggle").checked = s.hydrationEnabled;
  document.getElementById("set-tb-url").value = s.tbUrl;
  document.getElementById("set-tb-device-id").value = s.tbDeviceId;
  updateSoundButtonUI();
}

/* --------------------------------------------------------------------------
 * G. HELPERS & EVENT LOG TABLE
 * -------------------------------------------------------------------------- */
function formatMMSS(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function addEventLog(type, detail, action) {
  const tbody = document.getElementById("event-log-tbody");
  if (!tbody) return;

  const nowStr = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const tr = document.createElement("tr");
  tr.className = "hover:bg-slate-50/80 transition";
  tr.innerHTML = `
    <td class="py-2.5 px-3 font-mono text-slate-500">${nowStr}</td>
    <td class="py-2.5 px-3 font-semibold text-slate-800">${type}</td>
    <td class="py-2.5 px-3 text-slate-600">${detail}</td>
    <td class="py-2.5 px-3 text-right">
      <span class="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">${action}</span>
    </td>
  `;
  tbody.prepend(tr);
}

function seedInitialLogs() {
  addEventLog("System Ready", "เชื่อมต่อ ESP32-S3 Edge Impulse สำเร็จ", "เริ่มตรวจจับท่านั่ง (1-2s)");
  addEventLog("Bad Posture Alert", "หลังค่อม / ก้มคอ (Slouching)", "Active Buzzer ดัง + ส่ง MQTT Alert");
}
