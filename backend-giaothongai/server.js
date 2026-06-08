require("dotenv").config();
const express = require("express");
const http = require("http"); // Thêm thư viện HTTP lõi của Node.js
const WebSocket = require("ws"); // Thêm thư viện WebSocket
const mongoose = require("mongoose");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");
const multer = require("multer");

const Violation = require("./models/Violation");

const app = express();
app.use(cors());
app.use(express.json());

// --- TẠO SERVER CỦA ĐỒNG BỘ WEBSOCKET ---
const server = http.createServer(app); // Bọc Express vào HTTP Server
const wss = new WebSocket.Server({ server }); // Khởi tạo WebSocket Server

// Danh sách quản lý các mạch ESP32 đang kết nối
let espClients = new Set();

wss.on("connection", (ws) => {
  espClients.add(ws);
  console.log(
    "🔌 [WebSocket] Một mạch ESP32 đã kết nối vào hệ thống Internet!",
  );

  ws.on("close", () => {
    espClients.delete(ws);
    console.log("❌ [WebSocket] Mạch ESP32 đã mất kết nối.");
  });
});

// --- 1. KẾT NỐI MONGODB ---
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB Atlas!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB:", err));

// --- 2. CẤU HÌNH CLOUDINARY & MULTER ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "traffic_violations",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage: storage });

// ========================================================
// HỆ THỐNG CÁC API ROUTES (ĐỂ TRÊN)
// ========================================================

// --- API ĐIỀU KHIỂN ĐÈN CHO IFRAME / REACTJS ---
app.get("/api/control", (req, res) => {
  const dir = req.query.dir;
  console.log(`📥 Nhận lệnh đổi đèn từ Web hướng: ${dir} -> Bắn xuống ESP32`);

  // Gửi lệnh qua ống dẫn WebSocket xuống thẳng ESP32
  espClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`CHG:${dir}`);
    }
  });

  res.send("OK");
});

// --- API NHẬN DỮ LIỆU PHẠT NGUỘI TỪ PYTHON RASPBERRY PI ---
app.post(
  "/api/violations",
  upload.fields([
    { name: "full_image", maxCount: 1 },
    { name: "crop_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { plateText } = req.body;

      const fullImageUrl = req.files["full_image"]
        ? req.files["full_image"][0].path
        : "";
      const cropImageUrl = req.files["crop_image"]
        ? req.files["crop_image"][0].path
        : "";

      const newViolation = new Violation({
        plateText: plateText,
        fullImageUrl: fullImageUrl,
        cropImageUrl: cropImageUrl,
      });

      await newViolation.save();

      console.log(`🚨 Nhận vi phạm mới từ Pi: Xe ${plateText}`);
      res
        .status(201)
        .json({ message: "Lưu vi phạm thành công!", data: newViolation });
    } catch (error) {
      console.error("Lỗi khi lưu vi phạm:", error);
      res.status(500).json({ error: "Lỗi server nội bộ" });
    }
  },
);

// --- API LẤY DANH SÁCH CHO REACTJS ---
app.get("/api/violations", async (req, res) => {
  try {
    const violations = await Violation.find().sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// --- API TÌM KIẾM THEO BIỂN SỐ XE ---
app.get("/api/violations/search", async (req, res) => {
  try {
    const searchQuery = req.query.plate;

    if (!searchQuery) {
      return res
        .status(400)
        .json({ error: "Vui lòng cung cấp biển số xe cần tìm (plate)" });
    }

    const violations = await Violation.find({
      plateText: { $regex: searchQuery, $options: "i" },
    }).sort({ violationTime: -1 });

    res.status(200).json(violations);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm:", error);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// ========================================================
// CẤU HÌNH PHỤC VỤ FILE TĨNH FRONTEND (PHẢI ĐỂ DƯỚI CÙNG)
// ========================================================

// 1. Chỉ định thư mục chứa file tĩnh sau khi React build
app.use(express.static(path.join(__dirname, "../traffic-frontend/dist")));

// 2. Cấu hình "Catch-all" route xử lý chuyển trang cho React Router bằng Regex định dạng mới
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../traffic-frontend/dist", "index.html"));
});

// --- CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
// Thay app.listen bằng server.listen để kích hoạt cả HTTP + WebSocket
server.listen(PORT, () => {
  console.log(`🚀 Hệ thống All-in-One đang chạy tại cổng ${PORT}`);
});
