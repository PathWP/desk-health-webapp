/* Central state + persistent user preferences */
const AppState = {
  user:null, jwtToken:null, refreshToken:null, isDemoMode:true,
  settings:{...APP_CONFIG.DEFAULTS},
  live:{
    currentPosture:"No_User", confidence:0, badPostureStreakSec:0,
    buzzerTriggered:false, continuousSittingSec:0, sedentaryAlertShown:false,
    dailyGoodSec:0,dailyBadSec:0,dailyBuzzerCount:0,
    hydrationRemainingSec:APP_CONFIG.DEFAULTS.hydrationMinutes*60,
    waterGlasses:0,mqttPackets:0,autoSimulate:false,lastTelemetryTs:0,
    lastTickAt:Date.now(),lastDailyDate:new Date().toDateString()
  },
  analytics:{daily:null,weekly:null,loadedAt:0},
  logs:[],
  loadSettings(){
    try {
      const v = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEY) || "{}");
      if (!v.tbDeviceId) delete v.tbDeviceId;
      this.settings = { ...APP_CONFIG.DEFAULTS, ...v };
    }
    catch(e){ console.warn("Settings load:", e); }
  },
  saveSettings(){try{localStorage.setItem(APP_CONFIG.STORAGE_KEY,JSON.stringify(this.settings));}catch(e){console.warn(e);}}
};