const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// 사용자 세션을 저장할 객체
const sessions = {};

// 클라이언트 접속자 리스트
let clients = [];
let player = [];


const https_host = "10.10.30.241"
const ws_host = "10.10.30.241"
const wss = new WebSocket.Server({ host: ws_host, port: 3030 });


const word = ["사과", "원숭이", "기차", "비행기", "바나나"]

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

    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        // 파일을 비동기적으로 읽습니다.
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('404 Not Found');
            } else {
                // 정상적으로 파일을 읽은 경우 HTML 내용을 반환합니다.
                res.writeHead(200, {'Content-Type': 'text/html'});
                console.log(`Session ID: ${sessionID}\nUser ID: ${sessions[sessionID].userID}`);
                res.end(data);
            }
        });
    } 
    else if (req.url === '/script.js') {
        const filePath = path.join(__dirname, 'script.js');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('404 Not Found');
            } else {
                res.writeHead(200, {'Content-Type': 'text/javascript'});
                res.end(data);
            }
        });
    }
    else {
        // 다른 경로로의 요청에 대해서는 404 에러를 반환합니다.
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
    }
});

// 서버를 시작합니다.
const port = 3000;
server.listen(port, https_host, () => {
    console.log(`Server running at http://${https_host}:${port}/`);
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

function dup_id_check(w_id){

    for(let i = 0 ; i < clients.length; i ++){
        if(clients[i].userID == w_id){
            console.log("duplicated id")
            return false;
        }
    }
    return true;
}

function change_id(o_id, w_id){
    clients.forEach(client =>{
        if(client.userID == o_id){
            client.userID = w_id;
            return;
        }
    })
}

function boardcastMSG(type, context){
    clients.forEach(client => {
        client.ws.send(JSON.stringify({ type: type, data: context }));
    });
}

function boardcastMSG_g(type, context){
    players.forEach(player=> {
        client.ws.send(JSON.stringify({ type: type, data: context }));
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let button_state = 1;
let speak_person = "";

wss.on('connection', function connection(ws) {
    console.log('New client connected');
    let userID = ""
    while(true){
        userID = 'User' + Math.floor(Math.random() * 100000); // 임의의 사용자 아이디 생성
        if(dup_id_check(userID)){
            clients.push({ ws: ws, userID: userID});
            break;
        }
    }  
    let state_flag = 1;

    while(state_flag !== 3){
        if (state_flag == 1){
            ws.send(JSON.stringify({ type: 'uid', data: userID.toString('utf-8')}));
            state_flag = 2;
        }
        else if(state_flag == 2){
            // 새로운 클라이언트가 접속할 때마다 접속자 리스트를 모든 클라이언트에게 전송
            broadcastUserList('userList', clients);
            broadcastButton();
            boardcastMSG('chat', userID + " 님이 입장 하셨습니다.")
            state_flag = 3;
        }
    }


    // 클라이언트가 메시지를 보낼 때
    ws.on('message', function incoming(message) {
        const sp = "qmwnburqiowe"
        let msg = message.toString('utf-8').split(sp)
        if (msg[0] =='send_chat'){
            if(speak_person == ""){
                console.log('Received:', message.data);
                boardcastMSG('chat', msg[1])
            }
            else{
                // 게임중
                let name = msg[1].split(":");
                console.log(msg[1])
                if(speak_person == name[0]){
                    console.log('Received:', message.data);
                    boardcastMSG('chat', msg[1])
                }
                else{

                }
            }
        }
        else if(msg[0] == 'change_id'){
            let nick = msg[1].split(":")
            console.log(nick[0], "->", nick[1])
            if(dup_id_check(nick[1]) == true){
                change_id(nick[0], nick[1])
                clients.forEach(client =>{
                    if(client.userID == nick[1]){
                        client.ws.send(JSON.stringify({ type: 'uid', data: nick[1] }))
                        console.log("변경 완료");
                    }
                })
            }
            else{
                console.log("중복 id");
            }
            broadcastUserList('userList', clients);
            broadcastButton();
        }
        else if(msg[0] == "liar_game"){
            game();
        }
    });

    // 클라이언트가 연결을 종료할 때
    ws.on('close', function close() {
        console.log('Client disconnected');

        // 클라이언트 정보 제거
        clients = clients.filter(client => client.ws !== ws);
        // 클라이언트가 연결을 종료할 때마다 접속자 리스트를 모든 클라이언트에게 전송
        broadcastUserList('userList', clients);
    });
});

function getRandomInt(min, max) {
    min = Math.ceil(min); // 최소값 올림
    max = Math.floor(max); // 최대값 내림
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function game(){

    boardcastMSG('chat', "누군가 시작 버튼을 눌렀습니다.")
    // 모든 사용자에게 비활성화 시그널 보냄
    players = [];
    clients.forEach(client =>{
        players.push(client)
    })
    button_state = 0;
    broadcastButton();

    let n = getRandomInt(0, players.length - 1)
    let m = getRandomInt(0, word.length - 1)
    console.log(n, m)
    players.forEach(player=>{
        if(n == 0){
            player.ws.send(JSON.stringify({ type: 'liar', data: "라이어" }))   
        }
        else{
            player.ws.send(JSON.stringify({ type: 'liar', data: word[m] }))
        }
        n -= 1;
    })

    for(let i = 0 ; i < players.length; i ++){
        speak_person = players[i].userID;
        boardcastMSG('chat', players[i].userID + "가 제시어를 설명할 차례입니다. (15초)");
        await delay(15000)
    }
    speak_person = "";

    boardcastMSG('chat', "라이어를 투표해주세요. (20초)")
    broadcastUserList('vote', players);
    await delay(20000)

    broadcastUserList('vote', []);
    
}
// 접속자 리스트를 모든 클라이언트에게 전송하는 함수
function broadcastUserList(type, ulist) {
    const userList = ulist.map(client => client.userID);
    const message = JSON.stringify({ type: type, data: userList});
    ulist.forEach(client => {
        client.ws.send(message);
    });
}
function broadcastButton(){
    //button_state
    clients.forEach(client => {
        client.ws.send(JSON.stringify({ type: 'button', data: button_state}));
    });
}
