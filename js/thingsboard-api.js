/* ThingsBoard REST + current WebSocket API */
const ThingsBoardAPI = {
  socket:null, reconnectTimer:null, onTelemetry:null, manuallyClosed:false,
  baseUrl(){return (AppState.settings.tbUrl||"").trim().replace(/\/+$/,"");},
  async request(path, options={}){
    if(!AppState.jwtToken) throw new Error("ยังไม่มี JWT token");
    const res=await fetch(this.baseUrl()+path,{...options,headers:{
      "Content-Type":"application/json","X-Authorization":`Bearer ${AppState.jwtToken}`,
      ...(options.headers||{})
    }});
    if(res.status===401 && !options._retried && await this.refresh()) return this.request(path,{...options,_retried:true});
    if(!res.ok){let detail="";try{const j=await res.json();detail=j.message||j.error||"";}catch(_){}
      throw new Error(`ThingsBoard HTTP ${res.status}${detail?": "+detail:""}`);}
    if(res.status===204)return null;
    const text=await res.text();return text?JSON.parse(text):null;
  },
  async login(email,password,tbUrl){
    AppState.settings.tbUrl=(tbUrl||AppState.settings.tbUrl).replace(/\/+$/,"");
    const res=await fetch(this.baseUrl()+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:email,password})});
    if(!res.ok)throw new Error(`เข้าสู่ระบบไม่สำเร็จ (HTTP ${res.status})`);
    const data=await res.json(); if(!data.token)throw new Error("ThingsBoard ไม่ส่ง JWT token กลับมา");
    AppState.jwtToken=data.token;AppState.refreshToken=data.refreshToken||null;AppState.isDemoMode=false;
    const me=await this.request("/api/auth/user").catch(()=>null);
    AppState.user={email,name:me?.firstName?`${me.firstName} ${me.lastName||""}`.trim():email.split("@")[0]};
    AppState.saveSettings();return AppState.user;
  },
  async register(){
    throw new Error("ThingsBoard ไม่ได้เปิด public registration API ทั่วไปสำหรับฟอร์มนี้ การสมัครต้องเปิด Self-Registration บน ThingsBoard PE หรือให้ Tenant Admin สร้าง Customer/User ผ่าน REST API ฝั่ง Server ก่อน");
  },
  async refresh(){
    if(!AppState.refreshToken)return false;
    const res=await fetch(this.baseUrl()+"/api/auth/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:AppState.refreshToken})});
    if(!res.ok)return false;const d=await res.json();AppState.jwtToken=d.token;AppState.refreshToken=d.refreshToken||AppState.refreshToken;return true;
  },
  async getLatest(){
    const id=encodeURIComponent(AppState.settings.tbDeviceId);
    return this.request(`/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${encodeURIComponent(APP_CONFIG.DEFAULTS.telemetryKeys.join(","))}`);
  },
  async getHistory(startTs,endTs){
    const id=encodeURIComponent(AppState.settings.tbDeviceId);
    const keys=APP_CONFIG.DEFAULTS.telemetryKeys.join(",");
    return this.request(`/api/plugins/telemetry/DEVICE/${id}/values/timeseries?keys=${encodeURIComponent(keys)}&startTs=${startTs}&endTs=${endTs}&limit=10000&agg=NONE&orderBy=ASC`);
  },
  async testConnection(){
    if(!AppState.jwtToken)throw new Error("กรุณา Login ก่อนทดสอบ");
    await this.request("/api/auth/user");
    if(!AppState.settings.tbDeviceId)throw new Error("กรุณาระบุ Device Entity UUID");
    await this.getLatest();return true;
  },
  connectTelemetryWebSocket(callback){
    this.onTelemetry=callback;this.manuallyClosed=false;this.openSocket();
  },
  openSocket(){
    if(this.manuallyClosed||AppState.isDemoMode||!AppState.jwtToken||!AppState.settings.tbDeviceId)return;
    if(this.socket&&(this.socket.readyState===WebSocket.OPEN||this.socket.readyState===WebSocket.CONNECTING))return;
    const wsUrl=this.baseUrl().replace(/^http:/,"ws:").replace(/^https:/,"wss:")+"/api/ws";
    const ws=new WebSocket(wsUrl);this.socket=ws;
    ws.onopen=()=>{
      ws.send(JSON.stringify({authCmd:{cmdId:0,token:AppState.jwtToken},cmds:[{
        cmdId:1,type:"ENTITY_DATA",
        query:{entityFilter:{type:"singleEntity",singleEntity:{entityType:"DEVICE",id:AppState.settings.tbDeviceId}},pageLink:{pageSize:1,page:0,sortOrder:{key:{type:"ENTITY_FIELD",key:"name"},direction:"ASC"}},entityFields:[],latestValues:[],keyFilters:[]},
        latestCmd:{keys:APP_CONFIG.DEFAULTS.telemetryKeys.map(key=>({type:"TIME_SERIES",key}))}
      }] }));
      document.dispatchEvent(new CustomEvent("tb-connection",{detail:{connected:true}}));
    };
    ws.onmessage=(ev)=>{
      try{
        const m=JSON.parse(ev.data);
        if(m.errorCode&&m.errorCode!==0){console.error("TB WS:",m);return;}
        let rows=m.data?.data||m.update?.data||[];
        if(!Array.isArray(rows)&&m.update&&typeof m.update==="object"){
          rows=Object.values(m.update).map(v=>v?.latest? v : ({latest:v?.TIME_SERIES? v : v}));
        }
        if(!Array.isArray(rows)&&m.data?.data)rows=m.data.data;
        rows.forEach(row=>{
          const latest=row.latest?.TIME_SERIES||row.latest||row.TIME_SERIES||row;
          const update=row.latest?.TIME_SERIES?latest:(row.latest||{});
          const pick=k=>update[k]?.value??update[k]?.[0]?.[1]??update[k];
          const posture=pick("posture"), duration=pick("duration"), alert=pick("alert"), confidence=pick("confidence");
          if(posture!==undefined)this.onTelemetry?.({posture:String(posture),duration:Number(duration)||0,alert:String(alert)==="true"||alert===true,confidence:Number(confidence)||0.95,ts:Math.max(...Object.values(update).map(v=>Number(v?.ts)||0))||Date.now()});
        });
      }catch(e){console.warn("Invalid TB WS message",e);}
    };
    ws.onerror=()=>document.dispatchEvent(new CustomEvent("tb-connection",{detail:{connected:false}}));
    ws.onclose=()=>{
      document.dispatchEvent(new CustomEvent("tb-connection",{detail:{connected:false}}));
      if(!this.manuallyClosed){clearTimeout(this.reconnectTimer);this.reconnectTimer=setTimeout(async()=>{await this.refresh().catch(()=>false);this.openSocket();},AppState.settings.reconnectMs);}
    };
  },
  disconnect(){
    this.manuallyClosed=true;clearTimeout(this.reconnectTimer);
    if(this.socket){try{if(this.socket.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({cmds:[{cmdId:1,type:"ENTITY_DATA_UNSUBSCRIBE"}]}));}catch(_){}
      this.socket.close();this.socket=null;}
  }
};