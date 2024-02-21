const http = require('http');
const crypto = require('crypto');

// 사용자 세션을 저장할 객체
const sessions = {};

// HTTP 서버 생성
const server = http.createServer((req, res) => {
    // 쿠키를 파싱하여 세션 아이디를 추출합니다.
    const cookies = parseCookies(req);
    let sessionID = cookies.sessionID;

    // 세션 아이디가 없으면 새로 생성합니다.
    if (!sessionID) {
        sessionID = generateSessionID();
        // 쿠키에 세션 아이디를 설정합니다.
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; HttpOnly; Path=/`);
    }

    // 세션에 사용자 정보를 저장합니다.
    if (!sessions[sessionID]) {
        sessions[sessionID] = {
            userID: generateUserID()
        };
    }

    // 사용자에게 세션 아이디와 사용자 아이디를 보여줍니다.
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(`Session ID: ${sessionID}\nUser ID: ${sessions[sessionID].userID}`);
});

// 서버를 시작합니다.
const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// 쿠키를 파싱하는 함수
function parseCookies(req) {
    const cookieHeader = req.headers.cookie;
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            const key = parts.shift().trim();
            const value = parts.join('=');
            cookies[key] = value;
        });
    }
    return cookies;
}

// 세션 아이디 생성 함수
function generateSessionID() {
    return crypto.randomBytes(16).toString('hex');
}

// 사용자 아이디 생성 함수
function generateUserID() {
    return crypto.randomBytes(8).toString('hex');
}
