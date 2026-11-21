/* Main application controller */
let engineTimer=null,authMode="login",autoSimTickCounter=0;
document.addEventListener("DOMContentLoaded",()=>{
  AppState.loadSettings();lucide.createIcons();
  bindAuthEvents();bindNavigationEvents();bindDashboardControls();bindAnalyticsControls();bindSettingsForm();
  AnalyticsCharts.init();syncSettingsToUI();
  engineTimer=setInterval(runOneSecondTick,1000);
  document.addEventListener("tb-connection",e=>{
    const ok=e.detail.connected;
    const el=document.getElementById("tb-status-text");if(el)el.textContent=ok?"ThingsBoard: Connected":"ThingsBoard: Disconnected";
    const pill=document.getElementById("tb-status-pill");if(pill){pill.className=`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${ok?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-rose-50 text-rose-700 border-rose-200"}`;}
  });
});
function bindAuthEvents(){
  const login=document.getElementById("tab-login"),reg=document.getElementById("tab-register");
  login.addEventListener("click",()=>setAuthMode("login"));reg.addEventListener("click",()=>setAuthMode("register"));
  document.getElementById("auth-form").addEventListener("submit",async e=>{
    e.preventDefault();const err=document.getElementById("auth-error");err.classList.add("hidden");
    const email=document.getElementById("auth-email").value.trim(),password=document.getElementById("auth-password").value;
    const url=document.getElementById("auth-tb-url").value.trim();
    const btn=document.getElementById("auth-submit-btn");btn.disabled=true;
    try{
      if(authMode==="register"){await ThingsBoardAPI.register();return;}
      await ThingsBoardAPI.login(email,password,url);
      enterApplication({name:AppState.user.name,email,isDemo:false});
      if(!AppState.settings.tbDeviceId)AlertService.showToast({title:"Login สำเร็จ",message:"ไปที่ Settings แล้วกรอก Device Entity UUID เพื่อเริ่มรับ telemetry",variant:"warning"});
      else{
        ThingsBoardAPI.connectTelemetryWebSocket(handleTelemetry);
        await ThingsBoardAPI.getLatest().then(d=>handleLatest(d)).catch(e=>console.warn("Initial latest telemetry:",e));
        AnalyticsCharts.load();
      }
    }catch(ex){err.textContent=ex.message;err.classList.remove("hidden");}
    finally{btn.disabled=false;}
  });
  document.getElementById("demo-login-btn").addEventListener("click",()=>{
    AppState.isDemoMode=true;AppState.jwtToken=null;AppState.live.autoSimulate=true;
    enterApplication({name:"Demo Ergonomics User",email:"demo@deskhealth.local",isDemo:true});
  });
  const logout=()=>{ThingsBoardAPI.disconnect();AppState.jwtToken=null;AppState.refreshToken=null;AppState.user=null;document.getElementById("app-shell").classList.add("hidden");document.getElementById("auth-screen").classList.remove("hidden");};
  document.getElementById("logout-btn").addEventListener("click",logout);document.getElementById("mobile-logout-btn").addEventListener("click",logout);
}
function setAuthMode(mode){
  authMode=mode;const l=document.getElementById("tab-login"),r=document.getElementById("tab-register"),name=document.getElementById("register-name-group"),txt=document.querySelector("#auth-submit-btn span"),err=document.getElementById("auth-error");
  l.className=mode==="login"?"py-2 rounded-lg bg-white text-slate-900 shadow-sm transition":"py-2 rounded-lg text-slate-500 hover:text-slate-800 transition";
  r.className=mode==="register"?"py-2 rounded-lg bg-white text-slate-900 shadow-sm transition":"py-2 rounded-lg text-slate-500 hover:text-slate-800 transition";
  name.classList.toggle("hidden",mode!=="register");txt.textContent=mode==="login"?"เข้าสู่ระบบผ่าน ThingsBoard API":"ลงทะเบียนบัญชี";
  err.textContent=mode==="register"?"การสมัครบัญชีต้องเปิด Self-Registration ใน ThingsBoard PE หรือสร้างผู้ใช้ผ่าน Tenant Admin ก่อน":"";
  err.classList.toggle("hidden",mode!=="register");
}
function enterApplication({name,email,isDemo}){
  AppState.user={name,email};AppState.isDemoMode=isDemo;
  document.getElementById("sidebar-user-name").textContent=name;
  document.getElementById("sidebar-conn-mode").textContent=isDemo?"Demo Simulator":"ThingsBoard Live WebSocket";
  document.getElementById("tb-status-text").textContent=isDemo?"Demo Simulator Active":"Connecting ThingsBoard…";
  document.getElementById("auth-screen").classList.add("hidden");document.getElementById("app-shell").classList.remove("hidden");
  AppState.live.autoSimulate=!!isDemo;document.getElementById("auto-sim-toggle").checked=!!isDemo;updateDashboardUI();
}
function bindNavigationEvents(){
  const views={dashboard:"view-dashboard",analytics:"view-analytics",settings:"view-settings"};
  const titles={dashboard:["Real-time Posture Dashboard","ติดตามท่านั่งและการแจ้งเตือนสุขภาพ"],analytics:["Posture Analytics & Reports","วิเคราะห์สถิติจาก ThingsBoard telemetry"],settings:["System & ThingsBoard Settings","ตั้งค่าเกณฑ์สุขภาพและการเชื่อมต่อ IoT"]};
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
    const key=btn.dataset.nav;if(!views[key])return;
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b===btn));
    Object.entries(views).forEach(([k,id])=>document.getElementById(id).classList.toggle("hidden",k!==key));
    document.getElementById("page-title").textContent=titles[key][0];document.getElementById("page-subtitle").textContent=titles[key][1];
    if(key==="analytics")AnalyticsCharts.load();
  }));
}
function bindDashboardControls(){
  document.querySelectorAll(".sim-btn").forEach(btn=>btn.addEventListener("click",()=>{
    AppState.live.autoSimulate=false;document.getElementById("auto-sim-toggle").checked=false;
    setPostureState(btn.dataset.simPosture,0.97);
  }));
  document.getElementById("auto-sim-toggle").addEventListener("change",e=>{AppState.live.autoSimulate=e.target.checked;});
  document.getElementById("quick-sound-btn").addEventListener("click",()=>{AppState.settings.soundEnabled=!AppState.settings.soundEnabled;AppState.saveSettings();updateSoundButtonUI();});
  document.getElementById("dismiss-banner-btn").addEventListener("click",()=>AlertService.hideUrgentBanner());
  document.getElementById("fast-forward-sitting-btn").addEventListener("click",()=>{AppState.live.continuousSittingSec+=600;checkSedentaryThreshold();updateDashboardUI();});
  document.getElementById("reset-stretch-btn").addEventListener("click",()=>{AppState.live.continuousSittingSec=0;AppState.live.sedentaryAlertShown=false;AlertService.hideUrgentBanner();addEventLog("Sedentary Reset","ผู้ใช้งานลุกยืดเส้นยืดสาย","รีเซ็ตตัวนับ");updateDashboardUI();});
  document.getElementById("dash-hydration-toggle").addEventListener("change",e=>setHydrationEnabled(e.target.checked));
  document.getElementById("test-hydration-btn").addEventListener("click",triggerHydrationAlert);
  document.getElementById("drink-water-btn").addEventListener("click",()=>{AppState.live.waterGlasses++;AppState.live.hydrationRemainingSec=AppState.settings.hydrationMinutes*60;addEventLog("Hydration",`ดื่มน้ำแก้วที่ ${AppState.live.waterGlasses}`,"รีเซ็ตตัวนับ");AlertService.showToast({title:"บันทึกการดื่มน้ำแล้ว",message:`แก้วที่ ${AppState.live.waterGlasses}`,variant:"water"});updateDashboardUI();});
  document.getElementById("clear-logs-btn").addEventListener("click",()=>{document.getElementById("event-log-tbody").replaceChildren();AppState.logs=[];});
}
function setHydrationEnabled(enabled){
  AppState.settings.hydrationEnabled=enabled;
  if(enabled&&AppState.live.hydrationRemainingSec<=0)AppState.live.hydrationRemainingSec=AppState.settings.hydrationMinutes*60;
  document.getElementById("set-hydration-enabled").checked=enabled;AppState.saveSettings();updateDashboardUI();
}
function setPostureState(key,confidence=0.95,source={}){
  if(!APP_CONFIG.POSTURE_META[key]){console.warn("Unknown posture:",key);return;}
  const live=AppState.live;live.currentPosture=key;live.confidence=confidence;
  document.querySelectorAll(".sim-btn").forEach(b=>{b.classList.toggle("ring-2",b.dataset.simPosture===key);b.classList.toggle("ring-white",b.dataset.simPosture===key);});
  if(source.alert===true)handleDeviceAlert(source);
  updateDashboardUI();
}
function handleLatest(data){
  const get=k=>data?.[k]?.[0]?.value;
  const p=get("posture");if(p!==undefined)setPostureState(String(p),Number(get("confidence"))||.95,{alert:String(get("alert"))==="true",duration:Number(get("duration"))||0,ts:Number(data.posture?.[0]?.ts)||Date.now()});
}
function handleTelemetry(t){
  if(t.ts&&t.ts<=AppState.live.lastTelemetryTs)return;
  AppState.live.lastTelemetryTs=t.ts||Date.now();AppState.live.mqttPackets++;
  setPostureState(t.posture,t.confidence,{...t});
  if(t.alert===false && AppState.live.buzzerTriggered){AppState.live.buzzerTriggered=false;AlertService.hideUrgentBanner();}
}
function handleDeviceAlert(t){
  const live=AppState.live;
  if(!live.buzzerTriggered){
    live.buzzerTriggered=true;live.dailyBuzzerCount++;
    const meta=APP_CONFIG.POSTURE_META[live.currentPosture];
    AlertService.playBuzzerTone("posture");
    AlertService.showUrgentBanner({title:`แจ้งเตือนท่านั่งผิด (${meta.labelTh})`,desc:"ESP32-S3 ส่ง alert=true จาก Edge AI",level:"danger"});
    AlertService.showToast({title:"Posture Alert",message:`ตรวจพบ ${meta.labelTh}`,variant:"danger"});
    addEventLog("Bad Posture Alert",meta.labelTh,"รับ alert=true จาก ThingsBoard");
  }
}
function runOneSecondTick(){
  const shell=document.getElementById("app-shell");if(!shell||shell.classList.contains("hidden"))return;
  const live=AppState.live,s=AppState.settings,now=new Date();
  if(live.lastDailyDate!==now.toDateString()){live.dailyGoodSec=0;live.dailyBadSec=0;live.dailyBuzzerCount=0;live.waterGlasses=0;live.lastDailyDate=now.toDateString();}
  if(AppState.isDemoMode&&live.autoSimulate){autoSimTickCounter++;if(autoSimTickCounter>=8){autoSimTickCounter=0;const pool=["Good_Posture","Good_Posture","Slouching","Glute_Sliding","No_User"];setPostureState(pool[Math.floor(Math.random()*pool.length)],.93);}}
  const meta=APP_CONFIG.POSTURE_META[live.currentPosture];
  if(meta.isSitting){
    live.continuousSittingSec++;
    if(meta.isBad){live.dailyBadSec++;if(!AppState.isDemoMode&&!live.buzzerTriggered&&live.badPostureStreakSec>=s.debounceSeconds){/* alert flag is authoritative in live mode */}}
    else live.dailyGoodSec++;
    checkSedentaryThreshold();
  } // No_User: pause the continuous-sitting counter; do not add elapsed time.
  if(meta.isBad){live.badPostureStreakSec++;if(AppState.isDemoMode&&live.badPostureStreakSec>=s.debounceSeconds&&!live.buzzerTriggered)handleDeviceAlert({alert:true});}
  else{live.badPostureStreakSec=0;if(live.buzzerTriggered){live.buzzerTriggered=false;AlertService.hideUrgentBanner();}}
  if(s.hydrationEnabled){
    live.hydrationRemainingSec=Math.max(0,live.hydrationRemainingSec-1);
    if(live.hydrationRemainingSec===0){triggerHydrationAlert();live.hydrationRemainingSec=s.hydrationMinutes*60;}
  }
  updateDashboardUI();
}
function checkSedentaryThreshold(){
  const live=AppState.live,limit=AppState.settings.sedentaryMinutes*60;
  if(live.continuousSittingSec>=limit&&!live.sedentaryAlertShown){
    live.sedentaryAlertShown=true;AlertService.playBuzzerTone("health");
    AlertService.showUrgentBanner({title:`นั่งต่อเนื่องครบ ${AppState.settings.sedentaryMinutes} นาทีแล้ว`,desc:"กรุณาลุกยืน ยืดเส้น หรือเดินพัก 2–3 นาที",level:"warning"});
    AlertService.showToast({title:"Sedentary Alert",message:"ถึงเวลาลุกเปลี่ยนอิริยาบถแล้ว",variant:"warning",duration:8000});
    addEventLog("Sedentary Alert",`ครบ ${AppState.settings.sedentaryMinutes} นาที`,"แจ้งเตือนให้ลุกพัก");
  }
}
function triggerHydrationAlert(){
  AlertService.playBuzzerTone("health");AlertService.showToast({title:"ถึงเวลาดื่มน้ำแล้ว",message:"จิบน้ำสะอาดสักแก้ว",variant:"water",duration:7000});
  addEventLog("Hydration Reminder","ครบกำหนดเวลาเตือนดื่มน้ำ","แจ้งเตือนบน Web App");
}
function updateDashboardUI(){
  const live=AppState.live,s=AppState.settings,meta=APP_CONFIG.POSTURE_META[live.currentPosture];if(!meta)return;
  const themes={emerald:["border-emerald-200","bg-emerald-100 text-emerald-600","bg-emerald-100 text-emerald-800","bg-emerald-500"],amber:["border-amber-300","bg-amber-100 text-amber-600","bg-amber-100 text-amber-800","bg-amber-500"],rose:["border-rose-300","bg-rose-100 text-rose-600","bg-rose-100 text-rose-800","bg-rose-500"],slate:["border-slate-200","bg-slate-100 text-slate-500","bg-slate-200 text-slate-700","bg-slate-400"]};
  const t=themes[meta.colorTheme],hero=document.getElementById("posture-hero-card"),lamp=document.getElementById("posture-lamp"),badge=document.getElementById("posture-class-badge");
  hero.className=`xl:col-span-7 bg-white rounded-3xl p-6 lg:p-7 border-2 ${t[0]} shadow-sm transition-all duration-300 flex flex-col justify-between ${live.buzzerTriggered?"posture-alert-pulse":""}`;
  lamp.className=`w-20 h-20 rounded-3xl ${t[1]} flex items-center justify-center shrink-0 shadow-inner`;badge.className=`px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold ${t[2]}`;
  document.getElementById("posture-label-th").textContent=meta.labelTh;badge.textContent=live.currentPosture;document.getElementById("posture-advice").textContent=meta.advice;document.getElementById("posture-confidence").textContent=`Confidence: ${(live.confidence*100).toFixed(1)}%`;
  lamp.innerHTML=`<i data-lucide="${meta.icon}" class="w-10 h-10"></i>`;lucide.createIcons({nodes:[lamp]});
  const debounce=Math.min(live.badPostureStreakSec,s.debounceSeconds),bar=document.getElementById("debounce-progress-bar");bar.style.width=`${debounce/s.debounceSeconds*100}%`;bar.className=`h-full ${t[3]} rounded-full transition-all`;
  document.getElementById("debounce-max-label").textContent=s.debounceSeconds;
  document.getElementById("debounce-counter-text").textContent=meta.isBad?`${live.badPostureStreakSec}s / ${s.debounceSeconds}s ${live.buzzerTriggered?"(ALERT)":"(กำลังตรวจสอบ…)"}`:`0s / ${s.debounceSeconds}s (ปกติ)`;
  const hw=document.getElementById("buzzer-hardware-state");hw.textContent=live.buzzerTriggered?"BUZZER: ACTIVE":"BUZZER: OFF";hw.className=live.buzzerTriggered?"font-mono font-bold text-rose-600":"font-mono text-slate-500";
  document.getElementById("mqtt-packet-count").textContent=`Packets: ${live.mqttPackets}`;
  document.getElementById("mqtt-payload-preview").textContent=JSON.stringify({posture:live.currentPosture,duration:meta.isBad?live.badPostureStreakSec:live.continuousSittingSec,alert:live.buzzerTriggered},null,2);
  document.getElementById("continuous-time-display").textContent=formatMMSS(live.continuousSittingSec);document.getElementById("sedentary-target-label").textContent=s.sedentaryMinutes;
  document.getElementById("sedentary-progress-bar").style.width=`${Math.min(100,live.continuousSittingSec/(s.sedentaryMinutes*60)*100)}%`;
  const total=live.dailyGoodSec+live.dailyBadSec,goodPct=total?Math.round(live.dailyGoodSec/total*100):0;
  document.getElementById("daily-total-display").textContent=`${Math.floor(total/3600)} ชม. ${Math.floor(total%3600/60)} น.`;
  document.getElementById("daily-good-pct").textContent=`${goodPct}%`;document.getElementById("daily-buzzer-count").textContent=live.dailyBuzzerCount;document.getElementById("daily-good-bar").style.width=`${goodPct}%`;
  document.getElementById("dash-hydration-toggle").checked=s.hydrationEnabled;document.getElementById("hydration-countdown-display").textContent=s.hydrationEnabled?formatMMSS(live.hydrationRemainingSec):"ปิดใช้งาน";
  document.getElementById("hydration-status-label").textContent=s.hydrationEnabled?`ถัดไป (ทุก ${s.hydrationMinutes} น.)`:"เปิดสวิตช์เพื่อเริ่มนับเวลา";document.getElementById("water-glasses-count").textContent=live.waterGlasses;
}
function updateSoundButtonUI(){
  const enabled=AppState.settings.soundEnabled;document.getElementById("quick-sound-label").textContent=enabled?"เสียงเตือน: เปิด":"เสียงเตือน: ปิด";
  document.getElementById("quick-sound-icon").setAttribute("data-lucide",enabled?"volume-2":"volume-x");lucide.createIcons({nodes:[document.getElementById("quick-sound-btn")]});
}
function bindAnalyticsControls(){
  const d=document.getElementById("analytics-daily-btn"),w=document.getElementById("analytics-weekly-btn");
  d.addEventListener("click",()=>{d.className="px-4 py-2 rounded-lg bg-white text-slate-900 shadow-sm";w.className="px-4 py-2 rounded-lg text-slate-500";AnalyticsCharts.updatePeriod("daily");});
  w.addEventListener("click",()=>{w.className="px-4 py-2 rounded-lg bg-white text-slate-900 shadow-sm";d.className="px-4 py-2 rounded-lg text-slate-500";AnalyticsCharts.updatePeriod("weekly");});
}
function bindSettingsForm(){
  document.getElementById("settings-form").addEventListener("submit",async e=>{
    e.preventDefault();const s=AppState.settings;
    s.sedentaryMinutes=clampNum("set-sedentary-mins",5,180,45);s.debounceSeconds=clampNum("set-debounce-secs",2,30,5);s.hydrationMinutes=clampNum("set-hydration-mins",10,240,60);
    s.hydrationEnabled=document.getElementById("set-hydration-enabled").checked;s.tbUrl=document.getElementById("set-tb-url").value.trim().replace(/\/+$/,"");s.tbDeviceId=document.getElementById("set-tb-device-id").value.trim();
    AppState.live.hydrationRemainingSec=s.hydrationMinutes*60;AppState.live.sedentaryAlertShown=false;AppState.saveSettings();syncSettingsToUI();updateDashboardUI();
    if(!AppState.isDemoMode&&AppState.jwtToken){ThingsBoardAPI.disconnect();if(s.tbDeviceId){ThingsBoardAPI.connectTelemetryWebSocket(handleTelemetry);AnalyticsCharts.load();}}
    AlertService.showToast({title:"บันทึกการตั้งค่าแล้ว",message:"อัปเดตเกณฑ์และการเชื่อมต่อเรียบร้อย",variant:"success"});
  });
  document.getElementById("test-tb-conn-btn").addEventListener("click",async()=>{
    try{await ThingsBoardAPI.testConnection();AlertService.showToast({title:"เชื่อมต่อสำเร็จ",message:"ยืนยัน JWT และอ่าน telemetry ของ Device ได้",variant:"success"});}
    catch(e){AlertService.showToast({title:"ทดสอบไม่สำเร็จ",message:e.message,variant:"danger"});}
  });
}
function clampNum(id,min,max,fallback){const n=Number(document.getElementById(id).value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;}
function syncSettingsToUI(){
  const s=AppState.settings;document.getElementById("set-sedentary-mins").value=s.sedentaryMinutes;document.getElementById("set-debounce-secs").value=s.debounceSeconds;document.getElementById("set-hydration-mins").value=s.hydrationMinutes;
  document.getElementById("set-hydration-enabled").checked=s.hydrationEnabled;document.getElementById("dash-hydration-toggle").checked=s.hydrationEnabled;document.getElementById("set-tb-url").value=s.tbUrl;document.getElementById("set-tb-device-id").value=s.tbDeviceId;updateSoundButtonUI();
}
function formatMMSS(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;}
function addEventLog(type,detail,action){
  const tbody=document.getElementById("event-log-tbody");if(!tbody)return;
  const tr=document.createElement("tr");tr.className="hover:bg-slate-50/80 transition";
  [new Date().toLocaleTimeString("th-TH"),type,detail,action].forEach((value,i)=>{const td=document.createElement("td");td.className=["py-2.5 px-3 font-mono text-slate-500","py-2.5 px-3 font-semibold text-slate-800","py-2.5 px-3 text-slate-600","py-2.5 px-3 text-right"][i];td.textContent=value;tr.appendChild(td);});
  tbody.prepend(tr);while(tbody.children.length>100)tbody.lastElementChild.remove();
}
