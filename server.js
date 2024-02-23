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
let votes = [];
let _chat_state = 0;
const https_host = ""
const ws_host = ""
const wss = new WebSocket.Server({ host: ws_host, port: 3030 });

const vote_time = 20;
const desc_time = 1;

const cate = ["음식", "직업", "장소"]
const word =  {};

word["음식"] = ["비빔밥", "배추김치", "삼계탕", "불고기", "떡볶이", "삼겹살", "김밥", "잡채", "김치찌개", "순두부찌개", "냉면", "해물파전"]
word["직업"] = ["영화배우", "영화감독", "선생님", "개발자", "기획자", "소방관", "경찰관", "대통령", "목사", "신부"]
word["장소"] = ["영화관", "화장실", "도서관", "학교", "헬스클럽", "식당", "야구장", "축구장", "PC방" ,"카페"]

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

    if (req.url === '/liar' || req.url === '/') {
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
    else if (req.url === '/chat') {
        const filePath = path.join(__dirname, 'index2.html');
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
let liar_final_word = "";
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
            boardcastMSG('chat', "[info] " + userID + " 님이 입장 하셨습니다.")
            state_flag = 3;
        }
    }


    // 클라이언트가 메시지를 보낼 때
    ws.on('message', function incoming(message) {
        const sp = "qmwnburqiowe"
        let msg = message.toString('utf-8').split(sp)
        if (msg[0] =='send_chat'){
            if(speak_person == ""){
                console.log('Received:', msg[1]);
                boardcastMSG('chat', msg[1])
            }
            else{
                // 게임중
                let name = msg[1].split(":");
                console.log(msg[1])
                if(speak_person == name[0]){

                    if(_chat_state ==1){
                        liar_final_word = msg[1].split(': ')[1].trim();
                        boardcastMSG('chat', msg[1])
                    }
                    else{
                        console.log('[chat]', message.data);
                        boardcastMSG('chat', msg[1])
                    }
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
                        console.log("[change] ", nick[0], " -> ", nick[1]);
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
            votes = [];
            game();
        }
        else if(msg[0] == 'vote'){
            if(msg[1] !== ""){
                votes.push(msg[1]);
            }
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

    boardcastMSG('chat', "[info] " + "누군가 시작 버튼을 눌렀습니다.")
    // 모든 사용자에게 비활성화 시그널 보냄
    players = [];
    clients.forEach(client =>{
        players.push(client)
    })
    button_state = 0;
    broadcastButton();
    let liar = "";
    let sub_word = "";
    let cate_idx = getRandomInt(0, cate.length - 1)
    let n = getRandomInt(0, players.length - 1)
    let m = getRandomInt(0, word[cate[cate_idx]].length - 1)
    console.log(n, m)
    players.forEach(player=>{
        if(n == 0){
            liar = player.userID;
            player.ws.send(JSON.stringify({ type: 'liar', data: "[info] " + "당신은 [라이어] 입니다." }))   
        }
        else{
            player.ws.send(JSON.stringify({ type: 'liar', data: "[info] " + "이 문구는 당신만 볼 수 있습니다. 제시어 : [" + word[cate[cate_idx]][m]+"]" }))
        }
        n -= 1;
    })
    sub_word = word[cate[cate_idx]][m];

    boardcastMSG('chat', "[info] " + "주제는 [" + cate[cate_idx] + "] 입니다. 잠시 후 게임이 시작됩니다.");
    for(let i = 3; i >= 0 ; i--){
        clients.forEach(client => {
            client.ws.send(JSON.stringify({ type: 'time', data: i}));
        });
        await delay(1000)
    }

    for(let i = 0 ; i < players.length; i ++){
        speak_person = players[i].userID;
        boardcastMSG('chat', "[info] " + players[i].userID + "가 제시어를 설명할 차례입니다. (15초)");
        for(let i = desc_time; i >= 0 ; i--){
            clients.forEach(client => {
                client.ws.send(JSON.stringify({ type: 'time', data: i}));
            });
            await delay(1000)
        }
    }
    speak_person = "";

    while(true){

        boardcastMSG('chat', "[info] " + "라이어를 투표해주세요. (20초)")
        broadcastUserList('vote', players);
        for(let i = vote_time; i >= 0 ; i--){
            clients.forEach(client => {
                client.ws.send(JSON.stringify({ type: 'time', data: i}));
            });
            await delay(1000)
        }

        broadcastUserList('de_vote', players);

        boardcastMSG('chat', "[info] " + "투표를 집계중입니다.")
        for(let i = 3; i >= 0 ; i--){
            clients.forEach(client => {
                client.ws.send(JSON.stringify({ type: 'time', data: i}));
            });
            await delay(1000)
        }

        const wordCount = {};
        // 각 단어의 등장 횟수를 카운트
        votes.forEach(word => {
            console.log("투표 아이디 " + word);
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // 가장 많이 등장하는 단어 찾기
        let same = 0;
        let maxCount = 0;
        let mostFrequentWord = '';
        Object.entries(wordCount).forEach(([word, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostFrequentWord = word;
                same = 0;
            }
            else if(count == maxCount){
                same = 1;
            }
        });

        if(same == 1){
            let same_list = "";
            Object.entries(wordCount).forEach(([word, count]) => {
                if (count == maxCount) {
                    same_list += word + " ";
                }
            });

            boardcastMSG('chat', "[info] " + "동표가 나와 재투표를 진행합니다. 동점자: " + same_list);
        }
        else{
            boardcastMSG('chat', "[info] " +  mostFrequentWord + "님이 라이어로 지목되었습니다.");
            if(mostFrequentWord == liar){
                _chat_state = 1;
                speak_person = mostFrequentWord;
                boardcastMSG('chat',"[info] " +  mostFrequentWord + "님은 라이어가 맞습니다. 라이어는 제시어를 맞추면 승리할 수 있습니다.");
                boardcastMSG('chat',"[info] " + "제시어를 입력해주세요. 정답은 한글과 영어 대문자로 구성되며 띄어쓰기는 없습니다. 가장 마지막에 입력한 단어가 기준이 됩니다.");
                for(let i = 15; i >= 0 ; i--){
                    clients.forEach(client => {
                        client.ws.send(JSON.stringify({ type: 'time', data: i}));
                    });
                    await delay(1000)
                }

                speak_person = "";

                boardcastMSG('chat', "[info] " + "제시어 : [" + sub_word + "] 라이어가 입력한 제시어 : [" + liar_final_word+"]");
                if(sub_word == liar_final_word){
                    boardcastMSG('chat', "[info] " + mostFrequentWord + "님이 제시어를 알아냈으므로 라이어의 승리입니다. 게임을 종료합니다.");
                }
                else{
                    boardcastMSG('chat', "[info] " + mostFrequentWord + "님이 제시어를 모르므로 시민의 승리입니다. 게임을 종료합니다.");
                }
            }
            else{
                boardcastMSG('chat', "[info] " + mostFrequentWord + "님이 라이어가 아닙니다. 라이어는 " + liar + "님 입니다. 게임을 종료합니다.");  
            }
            _chat_state = 0;
            button_state = 1;
            liar_final_word = "";
            broadcastButton();
            break;
        }
    }
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
