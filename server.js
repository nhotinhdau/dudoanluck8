const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://jjhvc.onrender.com/api/taixiu/ws';
let cachedConfidence = null;
let cachedSession = null;
const CACHE_LIFETIME = 15000; // 15 giây

// --- THƯ VIỆN 60 LOẠI CẦU VÀ TRỌNG SỐ ---
const MAU_CAU_LIBRARY = {
  // Cầu bệt (trọng số cao)
  "TTTT": 3, "TTTTT": 4, "TTTTTT": 5,
  "XXXX": 3, "XXXXX": 4, "XXXXXX": 5,

  // Cầu đảo (1-1, 2-2,...)
  "TXTXT": 2, "XTXTX": 2,
  "TTXXTT": 3, "XXTTXX": 3,
  "TTTXXX": 4, "XXXTTT": 4,
  "TTTTXXXX": 5, "XXXXTTTT": 5,
  "TTTTTXXXXX": 6, "XXXXXTTTTT": 6,

  // Cầu xen kẽ phức tạp
  "TXXTXX": 2, "XTTXTT": 2, "TXXTXT": 1, "XTTXTTX": 1,
  "TTXTXT": 1, "XXTXTX": 1, "TXTTXX": -1, "XTTXTT": -1,
  "TTXTT": 1, "XXTXX": 1, "TTXXT": -1, "XXTTX": -1,
  "TXXTT": -2, "XTTXX": -2,

  // Cầu "dây" hoặc "gián đoạn"
  "TTXT": -1, "TXXT": -1, "XXTX": -1,
  "TXXXT": -2, "TTXXT": -2, "TTTXXT": -3,
  "XXTTX": -2, "XXXTTX": -3, "TTTX": -1, "XXXT": -1,

  // Cầu "lộn xộn" hoặc "không rõ ràng" (trọng số âm)
  "TXXTX": -3, "TXTTX": -3, "XXTXX": -3, "XTXTX": -3,
  "TTXTX": -2, "XTTXT": -2, "TXXTT": -2, "TXTTT": -2,
  "XXTTX": -3, "XTXTT": -3, "TXTXX": -3, "XXTXT": -3,
  "TTXXT": -2, "TXXXX": -4, "XTTTT": -4, "TXTTX": -3,
  "XTXXT": -3, "XTTTX": -3, "TTXTT": -2, "XTXTT": -3
};

// --- HÀM HỖ TRỢ ---
function getRandomConfidence(weight) {
  // Cập nhật độ tin cậy dựa trên trọng số
  let baseConfidence = 50;
  if (weight > 0) baseConfidence = 60 + Math.min(weight * 2, 30); // Tăng 2% mỗi điểm trọng số, tối đa 90%
  if (weight < 0) baseConfidence = 40 + Math.max(weight * 2, -15); // Giảm 2% mỗi điểm trọng số, tối thiểu 25%

  const randomOffset = Math.random() * 5 - 2.5; // +- 2.5%
  return (baseConfidence + randomOffset).toFixed(2) + "%";
}

// Hàm dự đoán dựa trên tổng xúc xắc (dự đoán cơ sở)
function getBasePrediction(history) {
  if (!history || history.length === 0) return null;

  const lastDice = [history[0].Xuc_xac_1, history[0].Xuc_xac_2, history[0].Xuc_xac_3];
  const total = lastDice.reduce((a, b) => a + b, 0);

  let resultList = [];
  const weights = [0.5, 0.3, 0.2];
  for (let i = 0; i < 3; i++) {
    let tmp = lastDice[i] + total;
    if (tmp === 4 || tmp === 5) tmp -= 4;
    else if (tmp >= 6) tmp -= 6;
    let val = tmp % 2 === 0 ? "Tài" : "Xỉu";
    for (let j = 0; j < weights[i] * 10; j++) resultList.push(val);
  }

  let counts = { "Tài": 0, "Xỉu": 0 };
  resultList.forEach(v => counts[v]++);
  return counts["Tài"] >= counts["Xỉu"] ? "Tài" : "Xỉu";
}

// Hàm phân tích cầu và tính trọng số
function analyzeMauCau(cauHistory) {
  let totalWeight = 0;
  const recentHistory = cauHistory.join('');

  for (const pattern in MAU_CAU_LIBRARY) {
    let startIndex = 0;
    while (true) {
      const foundIndex = recentHistory.indexOf(pattern, startIndex);
      if (foundIndex === -1) break;
      totalWeight += MAU_CAU_LIBRARY[pattern];
      startIndex = foundIndex + 1;
    }
  }
  return totalWeight;
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/lxk', async (req, res) => {
  try {
    const response = await axios.get(HISTORY_API_URL);
    if (!response.data || (Array.isArray(response.data) && response.data.length === 0)) {
      throw new Error("Không có dữ liệu");
    }

    const data = Array.isArray(response.data) ? response.data : [response.data];
    const currentData = data[0];

    const currentSession = Number(currentData.Phien);
    const nextSession = currentSession + 1;

    // Lấy 15 kết quả gần nhất để phân tích cầu
    const cauHistory = data.slice(0, 15).map(d => d.Ket_qua === "Tài" ? "T" : "X");
    
    // Bước 1: Dự đoán cơ sở
    const basePrediction = getBasePrediction(data);
    
    // Bước 2: Phân tích cầu và tính trọng số
    const totalWeight = analyzeMauCau(cauHistory);
    
    // Bước 3: Điều chỉnh dự đoán dựa trên trọng số
    let finalPrediction = basePrediction;
    let explanation = "Dựa trên tổng xúc xắc và phân tích cầu.";

    if (totalWeight > 5) {
      // Cầu đẹp, giữ nguyên dự đoán
      explanation = "Cầu đẹp, xu hướng ổn định. Giữ nguyên dự đoán.";
    } else if (totalWeight < -5) {
      // Cầu xấu, đảo ngược dự đoán
      finalPrediction = basePrediction === "Tài" ? "Xỉu" : "Tài";
      explanation = "Cầu xấu, xu hướng lộn xộn. Đảo ngược dự đoán.";
    } else {
      explanation = "Không có xu hướng cầu rõ ràng. Dựa vào dự đoán cơ sở.";
    }

    // Cập nhật độ tin cậy và phiên
    if (cachedSession !== currentSession) {
      cachedSession = currentSession;
      cachedConfidence = getRandomConfidence(totalWeight);
    }

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: currentSession,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession,
      du_doan: finalPrediction,
      do_tin_cay: cachedConfidence,
      giai_thich: explanation
    });

    // Log để debug
    console.log(`[LOG] Phiên ${currentSession} -> ${nextSession} | Cầu: ${cauHistory.join('')} | Trọng số: ${totalWeight} | Dự đoán: ${finalPrediction} (${cachedConfidence})`);

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
  res.send("Chào mừng đến API dự đoán Tài Xỉu!");
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy trên cổng ${PORT}`));
    
