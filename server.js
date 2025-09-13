const express = require('express');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// WSS URL
const WS_URL = "wss://pmcn.space/game_68gb/ws?id=Cskhtool11&key=trantuanbo57";
// Biến lưu phiên mới nhất
let latestResult = null;

// Kết nối WebSocket
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
    console.log("Đã kết nối WSS");
});

ws.on('message', (data) => {
    try {
        const json = JSON.parse(data);

        // Lấy thông tin cần thiết
        latestResult = {
            Phien: json.Phien,
            Xuc_xac_1: json.Xuc_xac_1,
            Xuc_xac_2: json.Xuc_xac_2,
            Xuc_xac_3: json.Xuc_xac_3,
            Tong: json.Tong,
            Ket_qua: json.Ket_qua
        };

        console.log("Phiên mới nhất:", latestResult);

    } catch (err) {
        console.error("Lỗi parse WSS message:", err);
    }
});

ws.on('close', () => {
    console.log("Kết nối WSS đã đóng");
});

ws.on('error', (err) => {
    console.error("Lỗi WSS:", err);
});

// REST API lấy phiên mới nhất
app.get('/api/taixiu/ws', (req, res) => {
    if (!latestResult) {
        return res.status(503).json({
            error: "Chưa có dữ liệu WSS",
            details: "Vui lòng thử lại sau vài giây."
        });
    }

    res.json(latestResult);
});

// Endpoint mặc định
app.get('/', (req, res) => {
    res.send('API WSS Tài Xỉu. Truy cập /api/taixiu/ws để xem phiên mới nhất.');
});

app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});






