const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://kbvvv.onrender.com/api/taixiu/ws';

// --- THUẬT TOÁN DỰ ĐOÁN THEO YÊU CẦU ---
/**
 * Thuật toán dự đoán dựa trên cầu mẫu và chu kỳ toán học.
 * @param {number} index - Chỉ số phiên hiện tại.
 * @returns {string} - Kết quả dự đoán ("Tài" hoặc "Xỉu").
 */
function vipPredictTX(index) {
  const patterns = [
    ["Tài", "Tài", "Xỉu", "Xỉu"],
    ["Tài", "Xỉu", "Tài", "Xỉu"],
    ["Tài", "Tài", "Tài", "Xỉu"],
    ["Xỉu", "Xỉu", "Tài", "Tài"],
  ];
  const patternIndex = Math.floor(index / 8) % patterns.length;
  const pattern = patterns[patternIndex];
  const patGuess = pattern[index % pattern.length];

  const val = Math.sin(index / 2) + Math.cos(index / 3);
  const mathGuess = val >= 0 ? "Tài" : "Xỉu";

  if (patGuess === mathGuess) return patGuess;
  return (index % 5 === 0) ? mathGuess : patGuess;
}

// --- HÀM TẠO ĐỘ TIN CẬY NGẪU NHIÊN ---
/**
 * Tạo một giá trị độ tin cậy ngẫu nhiên từ 65.0% đến 95.0%.
 * @returns {string} - Giá trị độ tin cậy dưới dạng chuỗi có ký hiệu %.
 */
function getRandomConfidence() {
  const min = 65.0;
  const max = 95.0;
  const confidence = Math.random() * (max - min) + min;
  return confidence.toFixed(1) + "%";
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/2k15', async (req, res) => {
  try {
    const response = await axios.get(HISTORY_API_URL);
    const data = Array.isArray(response.data) ? response.data : [response.data];
    if (!data || data.length === 0) throw new Error("Không có dữ liệu");

    const currentData = data[0];
    
    // Sửa lỗi ở đây: Chuyển đổi phien_truoc thành số nguyên trước khi cộng
    const phienTruocInt = parseInt(currentData.Phien);
    const nextSession = phienTruocInt + 1;

    const prediction = vipPredictTX(nextSession);
    const confidence = getRandomConfidence();

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: currentData.Phien,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession, // nextSession giờ là kiểu số
      du_doan: prediction,
      do_tin_cay: confidence,
      giai_thich: "dmmmm"
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
    
