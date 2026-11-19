/**
 * ============================================================================
 * js/audio-alerts.js — ระบบเสียงเตือน Active Buzzer (Web Audio API) และ Toast UI
 * ============================================================================
 */

const AlertService = {
  audioCtx: null,

  // สร้างเสียง Buzzer แบบ Piezo Active Buzzer ผ่าน Web Audio API (ไม่ต้องใช้ไฟล์เสียงภายนอก)
  playBuzzerTone(type = "posture") {
    if (!AppState.settings.soundEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const beeps = type === "posture" ? [0, 0.18, 0.36] : [0, 0.25];
      const freq = type === "posture" ? 880 : 660;

      beeps.forEach((offset) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type === "posture" ? "square" : "sine";
        osc.frequency.setValueAtTime(freq, now + offset);

        gain.gain.setValueAtTime(0.08, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } catch (e) {
      console.warn("Web Audio API ถูกบล็อกจนกว่าจะมีการคลิกหน้าจอ:", e);
    }
  },

  // แสดง Toast แจ้งเตือนมุมขวาบน
  showToast({ title, message, variant = "info", duration = 5000 }) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const styles = {
      danger: "bg-rose-600 text-white border-rose-700",
      warning: "bg-amber-500 text-slate-950 border-amber-600",
      water: "bg-sky-600 text-white border-sky-700",
      success: "bg-emerald-600 text-white border-emerald-700",
      info: "bg-slate-900 text-white border-slate-700",
    };

    const toast = document.createElement("div");
    toast.className = `toast-enter pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start justify-between gap-3 ${styles[variant] || styles.info}`;
    toast.innerHTML = `
      <div class="text-xs leading-relaxed">
        <p class="font-bold text-sm mb-0.5">${title}</p>
        <p class="opacity-95">${message}</p>
      </div>
      <button type="button" class="opacity-75 hover:opacity-100 text-xs font-bold px-1.5 py-0.5">✕</button>
    `;

    toast.querySelector("button").addEventListener("click", () => toast.remove());
    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, duration);
    }
  },

  // แสดงแถบแจ้งเตือนด่วนด้านบน Dashboard
  showUrgentBanner({ title, desc, level = "danger" }) {
    const banner = document.getElementById("urgent-banner");
    const iconBox = document.getElementById("urgent-banner-icon");
    const titleEl = document.getElementById("urgent-banner-title");
    const descEl = document.getElementById("urgent-banner-desc");

    banner.className = "mx-5 lg:mx-8 mt-5 p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-sm";
    if (level === "danger") {
      banner.classList.add("bg-rose-50", "border-rose-200", "text-rose-900");
      iconBox.className = "w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0";
    } else if (level === "warning") {
      banner.classList.add("bg-amber-50", "border-amber-200", "text-amber-900");
      iconBox.className = "w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0";
    } else {
      banner.classList.add("bg-sky-50", "border-sky-200", "text-sky-900");
      iconBox.className = "w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0";
    }

    titleEl.textContent = title;
    descEl.textContent = desc;
  },

  hideUrgentBanner() {
    const banner = document.getElementById("urgent-banner");
    if (banner) banner.classList.add("hidden");
  },
};
