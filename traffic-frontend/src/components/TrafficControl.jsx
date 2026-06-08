import React, { useState, useEffect } from "react";
import axios from "axios";

export default function TrafficControl() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Trạng thái lưu trữ thời gian và màu đèn của 4 hướng từ ESP32 đồng bộ về
  // lightState: 0=Đỏ, 1=Xanh, 2=Vàng. timer: Số giây đếm ngược
  const [trafficData, setTrafficData] = useState({
    0: { lightState: 0, timer: 0, name: "ĐÔNG" },
    1: { lightState: 0, timer: 0, name: "NAM" },
    2: { lightState: 0, timer: 0, name: "TÂY" },
    3: { lightState: 0, timer: 0, name: "BẮC" },
  });

  // TỰ ĐỘNG KẾT NỐI WEBSOCKET ĐỂ ĐỒNG BỘ GIÂY TỪ ĐÁM MÂY
  useEffect(() => {
    // Tự động lấy tên miền Render hiện tại, đổi giao thức sang wss://
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const msg = event.data;
      // Nếu nhận được chuỗi dữ liệu giây: DATA:0,5,0,0...
      if (msg.startsWith("DATA:")) {
        const rawData = msg.substring(5).split(","); // Bẻ đôi chuỗi lấy mảng số

        setTrafficData({
          0: {
            name: "ĐÔNG",
            lightState: parseInt(rawData[0]),
            timer: parseInt(rawData[1]),
          },
          1: {
            name: "NAM",
            lightState: parseInt(rawData[2]),
            timer: parseInt(rawData[3]),
          },
          2: {
            name: "TÂY",
            lightState: parseInt(rawData[4]),
            timer: parseInt(rawData[5]),
          },
          3: {
            name: "BẮC",
            lightState: parseInt(rawData[6]),
            timer: parseInt(rawData[7]),
          },
        });
      }
    };

    ws.onclose = () =>
      console.log("WebSocket đồng bộ đã đóng. Đang thử kết nối lại...");
    return () => ws.close(); // Dọn dẹp kết nối khi rời trang
  }, []);

  const handleControl = async (dirId, dirName) => {
    setLoading(true);
    setMessage(`Đang gửi lệnh kích hoạt hướng ${dirName}...`);
    try {
      await axios.get(`/api/control?dir=${dirId}`);
      setMessage(`✅ Đã đồng bộ lệnh đổi đèn hướng ${dirName}!`);
    } catch (error) {
      setMessage("❌ Lỗi kết nối điều khiển.");
    } finally {
      setLoading(false);
    }
  };

  // Hàm tiện ích để lấy màu CSS hiển thị vòng tròn đèn tương ứng
  const getLightColorClass = (state, type) => {
    if (type === "bg") {
      if (state === 0) return "#ff4d4d"; // Đỏ rực
      if (state === 1) return "#2ecc71"; // Xanh lá
      if (state === 2) return "#f1c40f"; // Vàng
    }
    return "#7f8c8d";
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#141824",
        color: "#fff",
        borderRadius: "16px",
        textAlign: "center",
      }}
    >
      <h2 style={{ letterSpacing: "1px", marginBottom: "5px" }}>
        🚥 GIÁM SÁT & ĐIỀU KHIỂN SA BÀN REAL-TIME 🚥
      </h2>
      <div
        style={{
          width: "80px",
          height: "3px",
          background: "#3498db",
          margin: "0 auto 15px auto",
        }}
      ></div>

      {message && (
        <div
          style={{
            margin: "10px auto",
            padding: "8px",
            background: "#1c2434",
            border: "1px solid #3498db",
            borderRadius: "6px",
            maxWidth: "400px",
            fontSize: "13px",
            color: "#3498db",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "25px",
          flexWrap: "wrap",
          marginTop: "25px",
        }}
      >
        {Object.keys(trafficData).map((key) => {
          const dir = trafficData[key];
          const lightColor = getLightColorClass(dir.lightState, "bg");

          return (
            <div
              key={key}
              style={{
                background: "#1f293d",
                borderRadius: "12px",
                padding: "20px",
                width: "160px",
                border: "1px solid #2d3d5a",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "16px",
                  color: "#a0aec0",
                }}
              >
                Hướng {dir.name}
              </h3>

              {/* Vòng tròn Đèn giao thông ảo đổi màu liên tục theo Sa bàn vật lý */}
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  background: lightColor,
                  borderRadius: "50%",
                  margin: "15px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 20px ${lightColor}`,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#000",
                }}
              >
                {dir.timer}
              </div>

              <button
                disabled={loading}
                onClick={() => handleControl(key, dir.name)}
                style={{
                  background: "#34495e",
                  color: "#fff",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "100%",
                  marginTop: "10px",
                  fontSize: "12px",
                }}
              >
                KÍCH HOẠT
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
