require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
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

// --- TẠO SERVER ĐỒNG BỘ HTTP & WEBSOCKET ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Danh sách quản lý tất cả kết nối (Cả ESP32 và các tab trình duyệt React)
let allClients = new Set();

wss.on("connection", (ws) => {
  allClients.add(ws);
  console.log("🔌 [WebSocket] Một thiết bị đã kết nối!");

  ws.on("message", (message) => {
    const msgStr = message.toString();

    // Nếu ESP32 gửi dữ liệu trạng thái lên -> Phát tán cho các tab React đang mở
    if (msgStr.startsWith("DATA:")) {
      allClients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(msgStr);
        }
      });
    }
  });

  ws.on("close", () => {
    allClients.delete(ws);
    console.log("❌ [WebSocket] Một thiết bị đã ngắt kết nối.");
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
// HỆ THỐNG API ROUTES
// ========================================================

// --- API ĐIỀU KHIỂN ĐÈN TỪ WEB -> ESP32 ---
app.get("/api/control", (req, res) => {
  const dir = req.query.dir;
  console.log(`📥 Nhận lệnh điều khiển hướng: ${dir}`);

  // Gửi lệnh CHG: đến tất cả client (ESP32 sẽ nhận và xử lý lệnh này)
  allClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`CHG:${dir}`);
    }
  });
  res.send("OK");
});

// --- API LƯU VI PHẠM TỪ RASPBERRY PI ---
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
        plateText,
        fullImageUrl,
        cropImageUrl,
      });

      await newViolation.save();
      console.log(`🚨 Nhận vi phạm mới: Xe ${plateText}`);
      res.status(201).json({ message: "Lưu thành công!", data: newViolation });
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).json({ error: "Lỗi server" });
    }
  },
);

// --- API LẤY DANH SÁCH VI PHẠM ---
app.get("/api/violations", async (req, res) => {
  try {
    const violations = await Violation.find().sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// --- API TÌM KIẾM ---
app.get("/api/violations/search", async (req, res) => {
  try {
    const { plate } = req.query;
    const violations = await Violation.find({
      plateText: { $regex: plate || "", $options: "i" },
    }).sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ========================================================
// PHỤC VỤ FRONTEND (REACT)
// ========================================================
app.use(express.static(path.join(__dirname, "../traffic-frontend/dist")));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../traffic-frontend/dist", "index.html"));
});

// --- CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Hệ thống đang chạy tại cổng ${PORT}`);
});
