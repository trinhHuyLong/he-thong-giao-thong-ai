import React from "react";

function Dashboard() {
  // Thay thế IP này bằng IP thực tế của ESP32 của bạn
  const ESP32_URL = "http://172.20.10.2";

  return (
    <div>
      <h2>Trung Tâm Giám Sát Cụm Đèn</h2>
      <p>Bảng điều khiển trực tiếp từ thiết bị phần cứng (ESP32).</p>

      <div className="iframe-container">
        <iframe
          src={ESP32_URL}
          width="100%"
          height="100%"
          frameBorder="0"
          title="ESP32 Traffic Controller"
        ></iframe>
      </div>
    </div>
  );
}

export default Dashboard;
