import React, { useState } from "react";
import axios from "axios";

export default function TrafficControl() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Định nghĩa 4 hướng giao thông tương ứng với các số dir (0, 1, 2, 3)
  const directions = [
    { id: 0, name: "ĐÔNG", color: "border-blue-500" },
    { id: 1, name: "NAM", color: "border-green-500" },
    { id: 2, name: "TÂY", color: "border-yellow-500" },
    { id: 3, name: "BẮC", color: "border-red-500" },
  ];

  // Hàm gọi API tương đối lên Node.js để kích hoạt đổi đèn qua WebSocket
  const handleControl = async (dirId, dirName) => {
    setLoading(true);
    setMessage(`Đang gửi lệnh đổi đèn hướng ${dirName}...`);
    try {
      // Vì chạy chung tên miền, chỉ cần gọi đường dẫn tương đối '/api/control'
      await axios.get(`/api/control?dir=${dirId}`);
      setMessage(`✅ Đã kích hoạt đổi đèn hướng ${dirName}!`);
    } catch (error) {
      console.error("Lỗi điều khiển:", error);
      setMessage("❌ Không thể gửi lệnh. Vui lòng kiểm tra lại Server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#1e272e",
        color: "#d2dae2",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <h2 style={{ color: "#fff", marginBottom: "10px" }}>
        🚥 TRUNG TÂM ĐIỀU KHIỂN SA BÀN TOÀN CẦU 🚥
      </h2>
      <p style={{ color: "#9bc53d", fontSize: "14px" }}>
        Hệ thống đang truyền tín hiệu thời gian thực (WebSocket) xuống ESP32
      </p>

      {message && (
        <div
          style={{
            margin: "15px auto",
            padding: "10px",
            background: "#2c3e50",
            borderRadius: "6px",
            maxWidth: "400px",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        {directions.map((dir) => (
          <div
            key={dir.id}
            style={{
              background: "#2d3436",
              border: "2px solid #555",
              borderRadius: "10px",
              padding: "20px",
              width: "150px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", letterSpacing: "1px" }}>
              {dir.name}
            </h3>

            <button
              disabled={loading}
              onClick={() => handleControl(dir.id, dir.name)}
              style={{
                background: loading ? "#7f8c8d" : "#8e44ad",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "bold",
                width: "100%",
                transition: "0.2s",
              }}
              onMouseOver={(e) =>
                !loading && (e.target.style.background = "#9b59b6")
              }
              onMouseOut={(e) =>
                !loading && (e.target.style.background = "#8e44ad")
              }
            >
              ĐỔI ĐÈN
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
