//自己的代號
var name;

//連結的對象
var connectedUser;

//connecting to our signaling server 
//請帶入自己WS server 的ip位置
var wsConn = new WebSocket('ws://192.168.6.145:9090');

// Connection
var yourConn;

wsConn.onopen = function () {

    AddLog('Connected to the signaling server.', 'b');
};

//when we got a message from a signaling server 
wsConn.onmessage = function (msg) {
    console.log("Got message :", msg);

    try {
        var data = JSON.parse(msg.data);

        switch (data.type) {
            case "login":
                handleLogin(data);
                break;
                //when somebody wants to call us 
            case "offer":
                AddLog(data.name + "進入了!!", 'r');
                handleOffer(data.offer, data.name);
                break;
            case "answer":
                handleAnswer(data.answer);
                break;
                //when a remote peer sends an ice candidate to us 
            case "candidate":
                handleCandidate(data.candidate);
                break;
            case "leave":
                AddLog('登出成功 ', 'b');
                handleLeave();
                break;
            case "hello":
                AddLog(data.message, 'b');
                //alert(data.message);
                break;
            default:
                break;

        }
    }
    catch (e) {
        console.log('signaling server error : ' + msg.data + " 。Exception Message :" + e);
        AddLog('signaling server error : ' + msg.data + " 。Exception Message :" + e, 'r');
    }


};

wsConn.onerror = function (err) {
    AddLog("Web Socket Connection 發生錯誤 : " + JSON.stringify(err), 'r');
};


function send(message) {
    //attach the other peer username to our messages 
    if (connectedUser) {
        message.name = connectedUser;
    }

    wsConn.send(JSON.stringify(message));
};


//After Connected Action 
//Type:login 
//處理登入後的狀態，收到type:login的時候呼叫
function handleLogin(data) {

    if (data.success === false) {
        AddLog('[Error] : ' + data.message, 'r');
    } else {

        //********************** 
        //Starting a peer connection 
        //建立起自己為一個可Connection的端點
        //********************** 

        //using Google public stun server 
        AddLog('登入成功 :' + name, 'b');
        var configuration = {
            "iceServers": [{ "url": "stun:stun2.l.google.com:19302" }]
        };

        //  yourConn = new webkitRTCPeerConnection(configuration, { optional: [{ RtpDataChannels: true }] });
        yourConn = new webkitRTCPeerConnection(configuration);

        // Setup ice handling 
        yourConn.onicecandidate = function (event) {
            if (event.candidate) {
                AddLog('送出 candidate :' + JSON.stringify(event.candidate), 'b');
                send({
                    type: "candidate",
                    candidate: event.candidate
                });
            }
        };

        yourConn.ondatachannel = function (event) {
            var receiveChannel = event.channel;
            receiveChannel.onmessage = function (event) {
                AddLog(connectedUser + ": " + event.data, 'y');
            };
        };


        //creating data channel 
        dataChannel = yourConn.createDataChannel("channel1", { reliable: true });

        dataChannel.onerror = function (error) {
            console.log("Ooops...error:", error);
        };

        //when we receive a message from the other peer, display it on the screen 
        dataChannel.onmessage = function (event) {
            // chatArea.innerHTML += connectedUser + ": " + event.data + "<br />";
            AddLog('dataChannel.onmessage :' + connectedUser + ": " + event.data);
        };

        dataChannel.onclose = function () {
            console.log("data channel is closed");
        };

    }
};

//Leave
//將 RTCPeerConnection 關閉
function handleLeave() {
    connectedUser = null;
    yourConn.close();
    yourConn.onicecandidate = null;
    name = '';
    connectedUser = '';
};



//Offer 
//when somebody sends us an offer 
function handleOffer(offer, name) {
    //  alert(offer + name);
    console.log("handleOffer", offer + ",,," + name);
    connectedUser = name;
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));

    //create an answer to an offer 
    yourConn.createAnswer(function (answer) {
        AddLog("createAnswer answer:" + answer, 'b');
        yourConn.setLocalDescription(answer);
        send({
            type: "answer",
            answer: answer
        });
    }, function (error) {;
        AddLog("Error when creating an answer" + error, 'r');
        // alert("Error when creating an answer");
    });

};



//Candidate
//when we got an ice candidate from a remote user 
//被呼叫端收到邀請呼叫該func
function handleCandidate(candidate) {

    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
    AddLog("Got Candidate(收到邀請) -" + JSON.stringify(candidate), 'b');
};

//Answer
//when we got an answer from a remote user 
function handleAnswer(answer) {
    yourConn.setRemoteDescription(new RTCSessionDescription(answer));
    AddLog("Got Answer(收到回應) -" + JSON.stringify(answer), 'b');
};
