/**
 * ============================================================================
 * js/state.js — ระบบจัดการ State กลางของแอป และ LocalStorage
 * ============================================================================
 */

const AppState = {
  // ข้อมูลผู้ใช้งานและ Token จาก ThingsBoard
  user: null,
  jwtToken: null,
  isDemoMode: true,

  // การตั้งค่าที่ผู้ใช้ปรับแต่งได้ (บันทึกใน LocalStorage)
  settings: { ...APP_CONFIG.DEFAULTS },

  // สถานะเรียลไทม์จาก ESP32-S3
  live: {
    currentPosture: "Good_Posture",
    confidence: 0.96,
    badPostureStreakSec: 0,      // ตัวนับ Debounce 0 -> 5 วินาที
    buzzerTriggered: false,      // สถานะ Buzzer ดังอยู่หรือไม่
    continuousSittingSec: 1104,  // เริ่มต้นจำลอง 18 นาที 24 วินาที
    sedentaryAlertShown: false,
    dailyGoodSec: 11940,         // ~3 ชม. 19 น.
    dailyBadSec: 3360,           // ~56 น.
    dailyBuzzerCount: 6,
    hydrationRemainingSec: 2050, // ~34 นาที 10 วินาที
    waterGlasses: 4,
    mqttPackets: 1,
    autoSimulate: true,
  },

  // โหลดการตั้งค่าจาก LocalStorage
  loadSettings() {
    try {
      const saved = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...APP_CONFIG.DEFAULTS, ...parsed };
      }
    } catch (err) {
      console.warn("ไม่สามารถโหลดการตั้งค่าจาก LocalStorage:", err);
    }
  },

  // บันทึกการตั้งค่าลง LocalStorage
  saveSettings() {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (err) {
      console.warn("ไม่สามารถบันทึกการตั้งค่าลง LocalStorage:", err);
    }
  },
};
