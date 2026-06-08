const mongoose = require("mongoose");

const ViolationSchema = new mongoose.Schema({
  plateText: {
    type: String,
    required: true,
  },
  // Đã xóa trường direction ở đây
  fullImageUrl: {
    type: String,
    required: true,
  },
  cropImageUrl: {
    type: String,
  },
  violationTime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Violation", ViolationSchema);
