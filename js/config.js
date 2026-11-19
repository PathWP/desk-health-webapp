/**
 * ============================================================================
 * js/config.js — ค่าตั้งต้นของระบบและข้อมูลจำลอง (Default Constants & Mock Data)
 * แก้ไขเกณฑ์เวลา (5 วินาที, 45 นาที, 60 นาที) หรือข้อมูลกราฟตัวอย่างได้ที่นี่
 * ============================================================================
 */

const APP_CONFIG = {
  STORAGE_KEY: "desk_health_tracker_v1",

  // เกณฑ์เวลาสุขภาพตามเอกสารสเปก (Business Logic & Operational Thresholds)
  DEFAULTS: {
    debounceSeconds: 5,       // ตรวจพบท่านั่งผิดติดต่อกัน 5 วินาที จึงดัง Buzzer
    sedentaryMinutes: 45,     // นั่งต่อเนื่องครบ 45 นาที เตือนลุกยืดเส้นยืดสาย
    hydrationMinutes: 60,     // เตือนดื่มน้ำทุกๆ 60 นาที
    hydrationEnabled: true,
    soundEnabled: true,
    tbUrl: "https://thingsboard.cloud",
    tbDeviceId: "esp32s3-desk-health-01",
  },

  // ข้อมูลรายละเอียดของแต่ละ Class จากโมเดล Edge Impulse
  POSTURE_META: {
    Good_Posture: {
      labelTh: "นั่งถูกสุขลักษณะ",
      advice: "ลำตัวตรง ศีรษะอยู่ในแนวสมดุลกับหัวไหล่ รักษาท่านี้ต่อไปเพื่อลดอาการออฟฟิศซินโดรม",
      colorTheme: "emerald",
      icon: "user-check",
      isBad: false,
      isSitting: true,
    },
    Slouching: {
      labelTh: "หลังค่อม / ก้มคอ",
      advice: "ตรวจพบการก้มคอหรือหลังค่อม! กรุณายืดตัวตรงและปรับระดับสายตาให้ขนานกับหน้าจอ",
      colorTheme: "amber",
      icon: "alert-circle",
      isBad: true,
      isSitting: true,
    },
    Glute_Sliding: {
      labelTh: "ก้นสไลด์ / ตัวไหลลง",
      advice: "ตรวจพบก้นสไลด์ออกจากพนักพิง! กรุณาขยับสะโพกให้ชิดพนักเก้าอี้เพื่อพยุงหลังส่วนล่าง",
      colorTheme: "rose",
      icon: "shield-alert",
      isBad: true,
      isSitting: true,
    },
    No_User: {
      labelTh: "ไม่อยู่ที่โต๊ะทำงาน",
      advice: "ไม่พบผู้ใช้งานหน้ากล้อง OV2640 ระบบหยุดนับเวลานั่งต่อเนื่องชั่วคราว",
      colorTheme: "slate",
      icon: "user-minus",
      isBad: false,
      isSitting: false,
    },
  },

  // ชุดข้อมูลจำลองสำหรับหน้า Analytics (Daily vs Weekly)
  ANALYTICS_DATA: {
    daily: {
      labels: ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
      goodMins: [48, 45, 40, 50, 38, 35, 42, 46],
      slouchMins: [5, 8, 12, 4, 14, 15, 10, 6],
      gluteMins: [2, 2, 5, 1, 6, 8, 4, 3],
      buzzerHourlyLabels: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
      buzzerHourlyCounts: [0, 1, 1, 2, 0, 1, 3, 4, 2, 1],
    },
    weekly: {
      labels: ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"],
      goodMins: [340, 365, 310, 380, 355],
      slouchMins: [55, 42, 72, 38, 48],
      gluteMins: [25, 18, 35, 15, 22],
      buzzerHourlyLabels: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"],
      buzzerHourlyCounts: [1, 4, 6, 9, 2, 5, 12, 15, 11, 6],
    },
  },
};
