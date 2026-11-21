/* Desk Health Tracker configuration */
const APP_CONFIG = {
  STORAGE_KEY: "desk_health_tracker_v2",
  DEFAULTS: {
    debounceSeconds: 5, sedentaryMinutes: 45, hydrationMinutes: 60,
    hydrationEnabled: true, soundEnabled: true,
    tbUrl: "https://thingsboard.cloud", tbDeviceId: "3d43eda0-e0f4-11f1-8cd9-6b9990469fa2",
    reconnectMs: 5000, telemetryKeys: ["posture","duration","alert","confidence"]
  },
  POSTURE_META: {
    Good_Posture:{labelTh:"นั่งถูกสุขลักษณะ",advice:"ลำตัวตรง ศีรษะสมดุลกับหัวไหล่ รักษาท่านี้ต่อไป",colorTheme:"emerald",icon:"user-check",isBad:false,isSitting:true},
    Slouching:{labelTh:"หลังค่อม / ก้มคอ",advice:"ยืดตัวตรงและปรับระดับสายตาให้ขนานกับหน้าจอ",colorTheme:"amber",icon:"alert-circle",isBad:true,isSitting:true},
    Glute_Sliding:{labelTh:"ก้นสไลด์ / ตัวไหลลง",advice:"ขยับสะโพกให้ชิดพนักเก้าอี้เพื่อพยุงหลังส่วนล่าง",colorTheme:"rose",icon:"shield-alert",isBad:true,isSitting:true},
    No_User:{labelTh:"ไม่พบผู้ใช้งาน",advice:"ไม่พบผู้ใช้งาน ระบบหยุดนับเวลานั่งต่อเนื่อง",colorTheme:"slate",icon:"user-minus",isBad:false,isSitting:false}
  }
};