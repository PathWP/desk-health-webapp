/**
 * ============================================================================
 * js/thingsboard-api.js — ระบบเชื่อมต่อ ThingsBoard JWT Auth & Telemetry WS
 * ============================================================================
 */

const ThingsBoardAPI = {
  socket: null,

  /**
   * เข้าสู่ระบบผ่าน ThingsBoard REST API (POST /api/auth/login)
   * หากไม่สามารถติดต่อเซิร์ฟเวอร์จริงได้ จะแจ้ง Error หรือสลับใช้ Demo Mode ได้ทันที
   */
  async login(email, password, tbUrl) {
    const cleanUrl = (tbUrl || AppState.settings.tbUrl).replace(/\/$/, "");
    const response = await fetch(`${cleanUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });

    if (!response.ok) {
      throw new Error(`ThingsBoard HTTP ${response.status}`);
    }

    const data = await response.json();
    AppState.jwtToken = data.token;
    AppState.isDemoMode = false;
    AppState.user = { email, name: email.split("@")[0] };
    AppState.settings.tbUrl = cleanUrl;
    AppState.saveSettings();
    return data;
  },

  /**
   * เชื่อมต่อ WebSocket เพื่อรับค่า Telemetry แบบ Real-time จาก ThingsBoard
   * Payload รูปแบบ: {"posture": "Slouching", "duration": 120, "alert": true}
   */
  connectTelemetryWebSocket(onTelemetryMessage) {
    if (AppState.isDemoMode || !AppState.jwtToken || !AppState.settings.tbDeviceId) {
      return;
    }

    try {
      const wsBase = AppState.settings.tbUrl.replace(/^http/, "ws");
      const wsUrl = `${wsBase}/api/ws/plugins/telemetry?token=${AppState.jwtToken}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        const subscribeCmd = {
          tsSubCmds: [
            {
              entityType: "DEVICE",
              entityId: AppState.settings.tbDeviceId,
              scope: "LATEST_TELEMETRY",
              cmdId: 1,
            },
          ],
          historyCmds: [],
          attrSubCmds: [],
        };
        this.socket.send(JSON.stringify(subscribeCmd));
      };

      this.socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.data && msg.data.posture) {
          const latestPosture = msg.data.posture[0][1];
          const latestConf = msg.data.confidence ? parseFloat(msg.data.confidence[0][1]) : 0.95;
          if (typeof onTelemetryMessage === "function") {
            onTelemetryMessage({ posture: latestPosture, confidence: latestConf });
          }
        }
      };

      this.socket.onerror = () => {
        console.warn("ThingsBoard WebSocket เชื่อมต่อไม่สำเร็จ ใช้โหมดจำลองแทน");
      };
    } catch (err) {
      console.warn("WebSocket Init Error:", err);
    }
  },

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  },
};
