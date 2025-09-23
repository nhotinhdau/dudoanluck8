const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://kbvvv.onrender.com/api/taixiu/ws';

// --- THUẬT TOÁN DỰ ĐOÁN THEO YÊU CẦU CỦA BẠN ---
/**
 * Thuật toán dự đoán dựa trên cầu mẫu và chu kỳ toán học.
 * @param {number} index - Chỉ số phiên hiện tại.
 * @returns {string} - Kết quả dự đoán ("Tài" hoặc "Xỉu").
 */
function vipPredictTX(index) {
  // ===== 1) Cầu mẫu (pattern) =====
  const patterns = [
    ["Tài", "Tài", "Xỉu", "Xỉu"], // TTXX
    ["Tài", "Xỉu", "Tài", "Xỉu"], // TXTX
    ["Tài", "Tài", "Tài", "Xỉu"], // TTTX
    ["Xỉu", "Xỉu", "Tài", "Tài"], // XXTT
  ];
  const patternIndex = Math.floor(index / 8) % patterns.length;
  const pattern = patterns[patternIndex];
  const patGuess = pattern[index % pattern.length];

  // ===== 2) Chu kỳ toán học (sin/cos) =====
  const val = Math.sin(index / 2) + Math.cos(index / 3);
  const mathGuess = val >= 0 ? "Tài" : "Xỉu";

  // ===== 3) Kết hợp cầu + chu kỳ toán học =====
  // Nếu 2 dự đoán trùng nhau → chọn luôn
  if (patGuess === mathGuess) return patGuess;

  // Nếu khác nhau → ưu tiên cầu, nhưng thỉnh thoảng chèn toán học
  return (index % 5 === 0) ? mathGuess : patGuess;
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/2k15', async (req, res) => {
  try {
    const response = await axios.get(HISTORY_API_URL);
    const data = Array.isArray(response.data) ? response.data : [response.data];
    if (!data || data.length === 0) throw new Error("Không có dữ liệu");

    const currentData = data[0];
    const nextSession = currentData.Phien + 1;
    
    // Sử dụng thuật toán của bạn với chỉ số phiên hiện tại
    const prediction = vipPredictTX(currentData.Phien);

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: currentData.Phien,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession,
      du_doan: prediction,
      do_tin_cay: "50.0%", // Đặt mặc định vì thuật toán không có cơ sở xác suất
      giai_thich: "địt mẹ tk huy phùng"
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      id: "@cskhtoollxk",
      error: "Lỗi hệ thống hoặc không thể lấy dữ liệu",
      du_doan: "Không thể dự đoán",
      do_tin_cay: "0%",
      giai_thich: "Đang chờ dữ liệu lịch sử"
    });
  }
});

app.get('/', (req, res) => {
  res.send("Chào mừng đến API dự đoán Tài Xỉu! Truy cập /api/2k15 để xem dự đoán.");
});

app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));
  
