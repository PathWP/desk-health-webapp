# Desk Health Tracker (Edge AI + IoT System) — Modular Web Application

โครงสร้างโปรเจกต์ถูกแยกออกเป็นไฟล์ย่อยตามหน้าที่การทำงาน เพื่อให้แก้ไข ปรับแต่ง และต่อยอดได้ง่ายโดยไม่ต้องใช้ Build Tools ใดๆ

## โครงสร้างโฟลเดอร์ (Folder Structure)

```text
desk-health-tracker/
├── index.html              # โครงสร้างหน้าเว็บหลัก (Login, Dashboard, Analytics, Settings)
├── README.md               # คู่มือการใช้งานและคำอธิบายแต่ละไฟล์
├── css/
│   └── style.css           # สไตล์ตกแต่งเพิ่มเติม, Animation และสถานะสีของการ์ด
└── js/
    ├── config.js           # ค่าตั้งต้น (Debounce 5s, Sedentary 45m, Hydration 60m) และข้อมูลจำลอง
    ├── state.js            # ตัวจัดการ State กลางของแอป และ LocalStorage
    ├── audio-alerts.js     # ระบบเสียงเตือน Active Buzzer (Web Audio API) และ Toast/Banner
    ├── thingsboard-api.js  # ระบบ Login ผ่าน ThingsBoard JWT API และเชื่อมต่อ WebSocket
    ├── charts.js           # โค้ดสร้างกราฟด้วย Chart.js (รายวัน / รายสัปดาห์ / สถิติ Buzzer)
    └── app.js              # ตัวควบคุมหลัก (Edge AI Simulator, ตัวจับเวลา 1 วินาที, อัปเดต UI)
```

## วิธีเปิดใช้งาน
1. แตกไฟล์ `.zip` ออกมาเป็นโฟลเดอร์ `desk-health-tracker`
2. ดับเบิลคลิกเปิดไฟล์ `index.html` บนเบราว์เซอร์ (Chrome / Edge / Safari) หรือเปิดผ่าน VS Code **Live Server**
3. กดปุ่ม **"เข้าสู่ระบบด้วยโหมดจำลอง (Demo Mode)"** เพื่อทดสอบระบบได้ทันที หรือกรอกบัญชี ThingsBoard จริงเพื่อรับค่า Telemetry ผ่าน WebSocket
