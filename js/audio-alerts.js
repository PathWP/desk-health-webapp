/* Browser audio cues and safe toast/banner rendering */
const AlertService={
  audioCtx:null,
  playBuzzerTone(type="posture"){
    if(!AppState.settings.soundEnabled)return;
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      if(!this.audioCtx)this.audioCtx=new C();if(this.audioCtx.state==="suspended")this.audioCtx.resume();
      const now=this.audioCtx.currentTime,offsets=type==="posture"?[0,.18,.36]:[0,.25],freq=type==="posture"?880:660;
      offsets.forEach(offset=>{const osc=this.audioCtx.createOscillator(),gain=this.audioCtx.createGain();osc.type=type==="posture"?"square":"sine";osc.frequency.setValueAtTime(freq,now+offset);gain.gain.setValueAtTime(.07,now+offset);gain.gain.exponentialRampToValueAtTime(.001,now+offset+.12);osc.connect(gain);gain.connect(this.audioCtx.destination);osc.start(now+offset);osc.stop(now+offset+.13);});
    }catch(e){console.warn("Audio unavailable until user interaction:",e);}
  },
  showToast({title,message,variant="info",duration=5000}){
    const container=document.getElementById("toast-container");if(!container)return;
    const styles={danger:"bg-rose-600 text-white border-rose-700",warning:"bg-amber-500 text-slate-950 border-amber-600",water:"bg-sky-600 text-white border-sky-700",success:"bg-emerald-600 text-white border-emerald-700",info:"bg-slate-900 text-white border-slate-700"};
    const toast=document.createElement("div");toast.className=`toast-enter pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start justify-between gap-3 ${styles[variant]||styles.info}`;
    const body=document.createElement("div");body.className="text-xs leading-relaxed";
    const heading=document.createElement("p");heading.className="font-bold text-sm mb-0.5";heading.textContent=title;
    const desc=document.createElement("p");desc.className="opacity-95";desc.textContent=message;body.append(heading,desc);
    const close=document.createElement("button");close.type="button";close.className="opacity-75 hover:opacity-100 text-xs font-bold px-1.5 py-0.5";close.textContent="✕";close.addEventListener("click",()=>toast.remove());
    toast.append(body,close);container.appendChild(toast);
    if(duration>0)setTimeout(()=>toast.remove(),duration);
  },
  showUrgentBanner({title,desc,level="danger"}){
    const banner=document.getElementById("urgent-banner");if(!banner)return;
    const icon=document.getElementById("urgent-banner-icon");
    banner.className="mx-5 lg:mx-8 mt-5 p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-sm";
    const themes={danger:["bg-rose-50","border-rose-200","text-rose-900","bg-rose-100","text-rose-600"],warning:["bg-amber-50","border-amber-200","text-amber-900","bg-amber-100","text-amber-600"],water:["bg-sky-50","border-sky-200","text-sky-900","bg-sky-100","text-sky-600"]};
    (themes[level]||themes.danger).forEach(c=>banner.classList.add(c));
    if(icon)icon.className=`w-10 h-10 rounded-xl ${ (themes[level]||themes.danger)[3]} ${(themes[level]||themes.danger)[4]} flex items-center justify-center shrink-0`;
    document.getElementById("urgent-banner-title").textContent=title;document.getElementById("urgent-banner-desc").textContent=desc;
  },
  hideUrgentBanner(){document.getElementById("urgent-banner")?.classList.add("hidden");}
};