import React from "react";

import TrafficControl from "../components/TrafficControl";

function Dashboard() {
  // Thay thế IP này bằng IP thực tế của ESP32 của bạn
  const ESP32_URL = "http://172.20.10.2";

  return (
    <div>
      <h2>Trung Tâm Giám Sát Cụm Đèn</h2>
      <p>Bảng điều khiển trực tiếp từ thiết bị phần cứng (ESP32).</p>

      <div className="iframe-container">
        <TrafficControl />
      </div>
    </div>
  );
}

export default Dashboard;
