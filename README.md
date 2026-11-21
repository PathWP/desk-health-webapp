# Desk Health Tracker — Updated ThingsBoard Integration

## เปิดใช้งาน
1. แตก ZIP แล้วเปิดโฟลเดอร์นี้ด้วย VS Code
2. รันผ่าน Live Server หรือ static web server (แนะนำ `http://localhost` ไม่แนะนำ `file://`)
3. Login ด้วย ThingsBoard account ของคุณ หรือเลือก Demo Mode เพื่อทดสอบ UI
4. หลัง Login ไปที่ **ตั้งค่าระบบ** แล้วใส่ ThingsBoard Server URL และ **Device Entity UUID** (UUID ไม่ใช่ชื่อ Device หรือ Access Token)
5. กดทดสอบการเชื่อมต่อ แล้วกลับหน้า Dashboard

## Telemetry contract
ESP32-S3 ควร publish telemetry เข้า ThingsBoard ด้วย device access token ผ่าน MQTT topic `v1/devices/me/telemetry`:
```json
{"posture":"Slouching","duration":120,"alert":true}
```
คลาส posture ที่รองรับ:
- `Good_Posture`
- `Slouching`
- `Glute_Sliding`
- `No_User`

คีย์ที่ Web App อ่าน: `posture`, `duration`, `alert`, และ `confidence` (confidence เป็น optional; หากไม่มีใช้ 0.95)
ชนิดข้อมูลที่แนะนำ: `posture` string, `duration` number (seconds), `alert` boolean, `confidence` number 0..1.
ThingsBoard เก็บ telemetry เป็น time-series แยก key ดังนั้นทุก key ที่ต้องการแสดงย้อนหลังต้องถูก publish โดยอุปกรณ์อย่างสม่ำเสมอ

## สิ่งที่ทำงานใน Web App
- Login ด้วย `POST /api/auth/login` และใช้ JWT ผ่าน `X-Authorization: Bearer ...`
- WebSocket `/api/ws` แบบ `authCmd` + `ENTITY_DATA` subscribe ไปยัง Device UUID
- REST อ่าน latest telemetry และ history
- Dashboard status colors, continuous sitting timer, daily totals, alert logs
- Posture alert จาก `alert=true`; Demo Mode มี simulator และ debounce 5 วินาที
- Sedentary alert ตามเวลาที่ตั้งไว้ (default 45 นาที), นับเฉพาะเมื่อ posture ไม่ใช่ `No_User`
- Hydration toggle/countdown (default 60 นาที)
- Analytics ดึงข้อมูลย้อนหลัง 7 วันจาก ThingsBoard และแยก Daily/Weekly
- Settings ปรับ Debounce, Sedentary, Hydration, Server URL และ Device UUID

## Registration
ฟอร์ม Register เดิมใน ZIP แค่พาเข้า Demo Mode ไม่ได้สร้าง ThingsBoard user จริง จึงแก้ให้แจ้งข้อจำกัดแทนการแสดงผลว่าสมัครสำเร็จปลอม ๆ
ThingsBoard self-registration ตามเอกสารปัจจุบันเป็นความสามารถของ ThingsBoard PE ที่ต้องตั้งค่าจาก Security > Self registration; อีกทางคือให้ Tenant Admin สร้าง Customer/User ผ่าน backend ที่ปลอดภัย **ห้ามฝัง Tenant Admin credentials ใน frontend**
เอกสาร: https://thingsboard.io/docs/user-guide/security/self-registration/

## ข้อจำกัด/สิ่งที่ต้องตรวจสอบก่อนใช้งานจริง
1. **Device Entity UUID** ต้องเป็น UUID ของ Device ที่ผู้ใช้มีสิทธิ์อ่าน telemetry; อย่าใส่ Access Token ลงในช่องนี้
2. ThingsBoard CORS ต้องอนุญาต origin ของ Web App และ HTTPS/WSS ต้องใช้ certificate ที่ถูกต้อง
3. JWT ถูกเก็บใน memory เท่านั้น; เมื่อ reload ต้อง Login ใหม่ (ลดความเสี่ยง token ค้างใน LocalStorage)
4. Daily counters ฟื้นจาก telemetry history หลัง Login; คำนวณช่วงเวลาระหว่าง posture samples โดยจำกัด gap สูงสุด 120 วินาทีต่อ sample เพื่อไม่เหมารวมช่วงออฟไลน์
5. Analytics เป็นการประมาณเวลาจาก timestamps ของ posture samples (sampling แนะนำ 1–2 วินาที) ไม่ใช่ผลรวม duration แบบ authoritative หาก `duration` ที่อุปกรณ์ส่งมีความหมายเป็น “ยอดสะสม” หรือ “เวลาต่อเนื่อง” ไม่ควรนำมาบวกซ้ำทุก sample
6. Sedentary/Hydration timers ทำงานใน browser ขณะที่หน้าเว็บเปิดอยู่เท่านั้น หากต้องการแจ้งเตือนแม้ปิด browser ต้องย้าย timer/alert logic ไป Rule Engine หรือ backend
7. Browser Web Audio ต้องมี user interaction อย่างน้อยหนึ่งครั้งก่อนเล่นเสียงได้ในบาง browser
8. การใช้งานจริงควรเพิ่ม backend/BFF สำหรับ user provisioning, token policy, audit, rate limiting และ authorization; ไม่ควรเปิดเผยสิทธิ์ระดับ Tenant Admin ใน client

## Files
- `index.html`: UI
- `css/style.css`: styles
- `js/config.js`: defaults + posture classes
- `js/state.js`: runtime state + user preferences
- `js/thingsboard-api.js`: REST/JWT/WebSocket
- `js/app.js`: application, timers, alerts and event handlers
- `js/charts.js`: historical analytics
- `js/audio-alerts.js`: browser audio and notifications
