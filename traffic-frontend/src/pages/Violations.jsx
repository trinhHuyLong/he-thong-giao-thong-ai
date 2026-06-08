import React, { useState, useEffect } from "react";
import axios from "axios";

function Violations() {
  const [violations, setViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Trỏ về API Backend NodeJS của bạn
  const NODEJS_API = "/api/violations";

  // Hàm gọi API lấy toàn bộ danh sách khi vừa mở trang
  const fetchViolations = async () => {
    try {
      const response = await axios.get(NODEJS_API);
      setViolations(response.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu vi phạm:", error);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  // Hàm gọi API tìm kiếm khi bấm nút
  const handleSearch = async () => {
    if (!searchTerm) {
      fetchViolations(); // Nếu để trống thì tải lại tất cả
      return;
    }
    try {
      const response = await axios.get(
        `${NODEJS_API}/search?plate=${searchTerm}`,
      );
      setViolations(response.data);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
    }
  };

  // Format ngày tháng cho dễ đọc
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN");
  };

  return (
    <div>
      <h2>Hồ Sơ Phạt Nguội Hệ Thống</h2>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Nhập biển số xe cần tìm (VD: 29A)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="search-btn" onClick={handleSearch}>
          Tìm Kiếm
        </button>
      </div>

      <div className="violation-grid">
        {violations.length === 0 ? (
          <p>Không có dữ liệu vi phạm nào.</p>
        ) : (
          violations.map((v) => (
            <div className="card" key={v._id}>
              <div className="plate-badge">{v.plateText}</div>
              <p>⏱ Thời gian: {formatDate(v.violationTime)}</p>

              {/* Ảnh Toàn Cảnh */}
              <img src={v.fullImageUrl} alt={`Toàn cảnh xe ${v.plateText}`} />

              {/* Ảnh Cắt (Biển số) - Nếu có */}
              {v.cropImageUrl && (
                <div>
                  <p
                    style={{
                      marginBottom: "5px",
                      fontSize: "14px",
                      color: "#bdc3c7",
                    }}
                  >
                    Ảnh cắt trích xuất:
                  </p>
                  <img
                    src={v.cropImageUrl}
                    alt={`Biển số ${v.plateText}`}
                    className="crop-img"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Violations;
