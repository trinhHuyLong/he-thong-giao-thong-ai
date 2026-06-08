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

// --- TẠO SERVER HỖ TRỢ HTTP VÀ WEBSOCKET ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// KHAI BÁO BIẾN TOÀN CỤC QUẢN LÝ CLIENTS
let allClients = new Set();

wss.on("connection", (ws) => {
  allClients.add(ws);
  console.log("🔌 [WebSocket] Một thiết bị đã kết nối!");

  ws.on("message", (message) => {
    const msgStr = message.toString();
    if (msgStr.startsWith("DATA:")) {
      // Phát dữ liệu từ ESP32 cho tất cả các tab trình duyệt
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

// --- 2. CẤU HÌNH CLOUDINARY ---
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
// API ROUTES
// ========================================================

// 1. Điều khiển đèn
app.get("/api/control", (req, res) => {
  const dir = req.query.dir;
  allClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`CHG:${dir}`);
    }
  });
  res.send("OK");
});

// 2. Lưu vi phạm từ Pi
app.post(
  "/api/violations",
  upload.fields([{ name: "full_image" }, { name: "crop_image" }]),
  async (req, res) => {
    try {
      const { plateText } = req.body;
      const newViolation = new Violation({
        plateText,
        fullImageUrl: req.files["full_image"]
          ? req.files["full_image"][0].path
          : "",
        cropImageUrl: req.files["crop_image"]
          ? req.files["crop_image"][0].path
          : "",
      });
      await newViolation.save();
      res.status(201).json({ message: "Lưu thành công!" });
    } catch (error) {
      res.status(500).json({ error: "Lỗi server" });
    }
  },
);

// 3. Lấy danh sách vi phạm
app.get("/api/violations", async (req, res) => {
  try {
    const violations = await Violation.find().sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// 4. Tìm kiếm vi phạm theo biển số
app.get("/api/violations/search", async (req, res) => {
  try {
    const { plate } = req.query;
    const query = plate ? { plateText: { $regex: plate, $options: "i" } } : {};
    const violations = await Violation.find(query).sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ========================================================
// PHỤC VỤ FRONTEND
// ========================================================
app.use(express.static(path.join(__dirname, "../traffic-frontend/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../traffic-frontend/dist", "index.html"));
});

// --- KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
});
