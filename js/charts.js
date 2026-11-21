/* Analytics: read telemetry history from ThingsBoard; never fabricate production stats */
const AnalyticsCharts={
  ratioChart:null,timelineChart:null,buzzerChart:null,currentPeriod:"daily",raw:null,
  init(){
    if(typeof Chart==="undefined")return;
    Chart.defaults.font.family="'Prompt', sans-serif";Chart.defaults.color="#64748b";
    const a=document.getElementById("postureRatioChart"),b=document.getElementById("postureTimelineChart"),c=document.getElementById("buzzerHourlyChart");
    if(!a||!b||!c)return;
    this.ratioChart=new Chart(a,{type:"doughnut",data:{labels:["นั่งถูกท่า","หลังค่อม","ก้นสไลด์"],datasets:[{data:[0,0,0],backgroundColor:["#10b981","#f59e0b","#f43f5e"],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom"}}}});
    this.timelineChart=new Chart(b,{type:"bar",data:{labels:[],datasets:[
      {label:"Good Posture",data:[],backgroundColor:"#10b981",borderRadius:5},
      {label:"Slouching",data:[],backgroundColor:"#f59e0b",borderRadius:5},
      {label:"Glute Sliding",data:[],backgroundColor:"#f43f5e",borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,title:{display:true,text:"นาที"}}}}});
    this.buzzerChart=new Chart(c,{type:"bar",data:{labels:[],datasets:[{label:"จำนวนครั้ง",data:[],backgroundColor:"#f43f5e",borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{stepSize:1}}},plugins:{legend:{display:false}}}});
    this.showEmpty("กรุณาเข้าสู่ระบบ ThingsBoard เพื่อโหลดข้อมูลจริง");
  },
  showEmpty(message){
    ["kpi-good-rate","kpi-slouch-mins","kpi-glute-mins","kpi-buzzer-total"].forEach((id,i)=>{const e=document.getElementById(id);if(e)e.textContent=i===0?"—":"— นาที";});
    if(this.ratioChart){this.ratioChart.data.datasets[0].data=[0,0,0];this.ratioChart.update();}
    if(this.timelineChart){this.timelineChart.data.labels=[];this.timelineChart.data.datasets.forEach(d=>d.data=[]);this.timelineChart.update();}
    if(this.buzzerChart){this.buzzerChart.data.labels=[];this.buzzerChart.data.datasets[0].data=[];this.buzzerChart.update();}
  },
  async load(){
    if(AppState.isDemoMode||!AppState.jwtToken||!AppState.settings.tbDeviceId){this.showEmpty("ไม่มีข้อมูล ThingsBoard");return;}
    const now=Date.now(),start=now-7*86400000;
    try{this.raw=await ThingsBoardAPI.getHistory(start,now);this.restoreTodayTotals();this.updatePeriod(this.currentPeriod);if(typeof updateDashboardUI==="function")updateDashboardUI();}
    catch(e){console.error("Analytics history:",e);AlertService.showToast({title:"โหลด Analytics ไม่สำเร็จ",message:e.message,variant:"warning"});}
  },
  rowsFor(key){return (this.raw?.[key]||[]).map(x=>({ts:Number(x.ts),value:x.value})).sort((a,b)=>a.ts-b.ts);},
  restoreTodayTotals(){
    const midnight=new Date();midnight.setHours(0,0,0,0);const from=midnight.getTime(),to=Date.now();
    const rows=this.rowsFor("posture").filter(x=>x.ts>=from&&x.ts<=to);let good=0,bad=0;
    rows.forEach((r,i)=>{const next=rows[i+1];const sec=next?Math.max(0,Math.min(120,(next.ts-r.ts)/1000)):0;
      if(r.value==="Good_Posture")good+=sec;else if(r.value==="Slouching"||r.value==="Glute_Sliding")bad+=sec;});
    const alerts=this.rowsFor("alert");let prev=false,count=0;
    alerts.forEach(r=>{const active=String(r.value)==="true";if(active&&!prev&&r.ts>=from&&r.ts<=to)count++;prev=active;});
    AppState.live.dailyGoodSec=Math.round(good);AppState.live.dailyBadSec=Math.round(bad);AppState.live.dailyBuzzerCount=count;
  },
  updatePeriod(period){
    this.currentPeriod=period;if(!this.ratioChart)return;
    if(!this.raw){this.showEmpty("ยังไม่มีประวัติ telemetry");return;}
    const start=new Date();if(period==="daily")start.setHours(0,0,0,0);else{start.setDate(start.getDate()-6);start.setHours(0,0,0,0);}
    const end=Date.now(),postures=this.rowsFor("posture").filter(x=>x.ts>=start.getTime()&&x.ts<=end);
    const alerts=this.rowsFor("alert").filter(x=>x.ts>=start.getTime()&&x.ts<=end&&String(x.value)==="true");
    const good=Array(period==="daily"?24:7).fill(0),slouch=[...good],glute=[...good],buzz=[...good];
    const labels=period==="daily"?Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}:00`):["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];
    let goodTotal=0,slouchTotal=0,gluteTotal=0;
    postures.forEach((p,i)=>{
      const next=postures[i+1];let seconds=next?Math.max(0,Math.min(120,(next.ts-p.ts)/1000)):0;
      const dt=new Date(p.ts),idx=period==="daily"?dt.getHours():dt.getDay();
      if(p.value==="Good_Posture"){good[idx]+=seconds/60;goodTotal+=seconds;}
      if(p.value==="Slouching"){slouch[idx]+=seconds/60;slouchTotal+=seconds;}
      if(p.value==="Glute_Sliding"){glute[idx]+=seconds/60;gluteTotal+=seconds;}
    });
    const allAlerts=this.rowsFor("alert");let previous=false;
    allAlerts.forEach(a=>{const active=String(a.value)==="true";if(active&&!previous&&a.ts>=start.getTime()&&a.ts<=end){const d=new Date(a.ts),idx=period==="daily"?d.getHours():d.getDay();buzz[idx]++;}previous=active;});
    const total=goodTotal+slouchTotal+gluteTotal,pct=total?((goodTotal/total)*100).toFixed(1):"—";
    document.getElementById("kpi-good-rate").textContent=pct==="—"?"—":`${pct}%`;
    document.getElementById("kpi-slouch-mins").textContent=`${Math.round(slouchTotal/60)} นาที`;
    document.getElementById("kpi-glute-mins").textContent=`${Math.round(gluteTotal/60)} นาที`;
    document.getElementById("kpi-buzzer-total").textContent=`${buzz.reduce((a,b)=>a+b,0)} ครั้ง`;
    this.ratioChart.data.datasets[0].data=[goodTotal,slouchTotal,gluteTotal];this.ratioChart.update();
    this.timelineChart.data.labels=labels;this.timelineChart.data.datasets[0].data=good;this.timelineChart.data.datasets[1].data=slouch;this.timelineChart.data.datasets[2].data=glute;this.timelineChart.update();
    this.buzzerChart.data.labels=labels;this.buzzerChart.data.datasets[0].data=buzz;this.buzzerChart.update();
  }
};