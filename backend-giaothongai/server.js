require("dotenv").config();
const express = require("express");
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

// LƯU Ý: Phải đặt dưới các route API như /api/violations để tránh Express nhận diện nhầm

// 1. Chỉ định thư mục chứa file tĩnh sau khi React build
app.use(express.static(path.join(__dirname, "../traffic-frontend/dist")));

// 2. Cấu hình "Catch-all" route: Mọi request không trùng với API sẽ được đẩy về index.html của React
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, "../traffic-frontend/dist", "index.html"));
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
    folder: "traffic_violations", // Ảnh sẽ lưu vào folder này trên Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage: storage });

// --- 3. TẠO API NHẬN DỮ LIỆU TỪ PYTHON ---
app.post(
  "/api/violations",
  upload.fields([
    { name: "full_image", maxCount: 1 },
    { name: "crop_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Chỉ lấy plateText, bỏ direction
      const { plateText } = req.body;

      const fullImageUrl = req.files["full_image"]
        ? req.files["full_image"][0].path
        : "";
      const cropImageUrl = req.files["crop_image"]
        ? req.files["crop_image"][0].path
        : "";

      // Tạo bản ghi mới không có direction
      const newViolation = new Violation({
        plateText: plateText,
        fullImageUrl: fullImageUrl,
        cropImageUrl: cropImageUrl,
      });

      await newViolation.save();

      console.log(`🚨 Nhận vi phạm mới: Xe ${plateText}`); // Cập nhật lại log
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
    // Lấy danh sách vi phạm, sắp xếp mới nhất lên đầu
    const violations = await Violation.find().sort({ violationTime: -1 });
    res.status(200).json(violations);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// --- API TÌM KIẾM THEO BIỂN SỐ XE ---
app.get("/api/violations/search", async (req, res) => {
  try {
    // Lấy từ khóa tìm kiếm từ query URL (ví dụ: ?plate=29A)
    const searchQuery = req.query.plate;

    if (!searchQuery) {
      return res
        .status(400)
        .json({ error: "Vui lòng cung cấp biển số xe cần tìm (plate)" });
    }

    // Tìm kiếm tương đối (Regex) và không phân biệt chữ hoa/thường ($options: 'i')
    const violations = await Violation.find({
      plateText: { $regex: searchQuery, $options: "i" },
    }).sort({ violationTime: -1 }); // Vẫn sắp xếp mới nhất lên đầu

    res.status(200).json(violations);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm:", error);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// --- 4. CHẠY SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Node.js đang chạy tại cổng ${PORT}`);
});
