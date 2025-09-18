const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://jjhvc.onrender.com/api/taixiu/ws';
let cachedConfidence = null;
let cachedSession = null;

// --- MẪU CẦU TT/XX ---
const mau_cau_xau = [
  "TXXTX","TXTXT","XXTXX","XTXTX","TTXTX",
  "XTTXT","TXXTT","TXTTX","XXTTX","XTXTT",
  "TXTXX","XXTXT","TTXXT","TXTTT","XTXTX",
  "XTXXT","XTTTX","TTXTT","XTXTT","TXXTX"
];

const mau_cau_dep = [
  "TTTTT","XXXXX","TTTXX","XXTTT","TXTXX",
  "TTTXT","XTTTX","TXXXT","XXTXX","TXTTT",
  "XTTTT","TTXTX","TXXTX","TXTXT","XTXTX",
  "TTTXT","XTTXT","TXTXT","XXTXX","TXXXX"
];

// --- HÀM HỖ TRỢ ---
function getRandomConfidence() {
  return (Math.random() * (90 - 40) + 40).toFixed(2) + "%";
}
function isCauXau(cauStr) { return mau_cau_xau.includes(cauStr); }
function isCauDep(cauStr) { return mau_cau_dep.includes(cauStr); }

// Dự đoán phiên tiếp theo
function predictNext(history, cau) {
  if (!history || history.length === 0) return "Đợi thêm dữ liệu";

  const lastDice = [
    history[0].Xuc_xac_1,
    history[0].Xuc_xac_2,
    history[0].Xuc_xac_3
  ];
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

  // Đếm tần suất
  let counts = { "Tài": 0, "Xỉu": 0 };
  resultList.forEach(v => counts[v]++);
  let pred = counts["Tài"] >= counts["Xỉu"] ? "Tài" : "Xỉu";

  // Xử lý cầu TT/XX
  const cau5 = cau.slice(-5).join('');
  if (isCauXau(cau5)) {
    pred = pred === "Tài" ? "Xỉu" : "Tài";
  }

  return pred;
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

    // Ép kiểu số để +1 không bị nối chuỗi
    const currentSession = Number(currentData.Phien);
    const nextSession = currentSession + 1;

    if (cachedSession !== currentSession) {
      cachedSession = currentSession;
      cachedConfidence = getRandomConfidence();
    }

    // 5 cầu gần nhất
    let cau = data.slice(0, 5).map(d => d.Ket_qua === "Tài" ? "T" : "X");

    const du_doan = predictNext(data, cau);

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: currentSession,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession,
      du_doan,
      do_tin_cay: cachedConfidence,
      giai_thich: "trần bình an đẹp trai"
    });

    // Log ra console để debug Render
    console.log(`[LOG] Phiên ${currentSession} -> ${nextSession} | KQ: ${currentData.Ket_qua} | Dự đoán: ${du_doan} (${cachedConfidence})`);

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
  res.send("Chào mừng đến API dự đoán Tài Xỉu! Truy cập /api/taixiu/du_doan_68gb để xem dự đoán.");
});

app.listen(PORT, () => console.log(`🚀 Server đang chạy trên cổng ${PORT}`));

                                 




