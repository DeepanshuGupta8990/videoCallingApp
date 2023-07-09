let localStream;
let remoteStream;
let peerConnection;
let querystring = window.location.search;
let urlParams = new URLSearchParams(querystring);
let roomId = urlParams.get('room');
let APP_ID = "462a4574457a40abbb448e2d7b22fb20";
let videoCount = 0;

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

if (!roomId) {
    window.location = 'lobby.html';
}

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    channel = client.createChannel(roomId);
    await channel.join();

    channel.on('MemberJoined', handleUserJoined);
    channel.on("MemberLeft", handleUserLeft);

    client.on("MessageFromPeer", handleMessageFromPeer);

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
    })
    document.getElementById('user-1').srcObject = localStream;

}

let handleUserLeft = (MemberId) => {
    // document.getElementById("user-2").style.display = 'none';
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text);
    if (message.type === 'offer') {
        createAnswer(MemberId, message.offer)
    }
    if (message.type === 'answer') {
        addAnswer(message.answer)
    }
    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate);
        }
    }
    // console.log("Message : ",message)
}

let handleUserJoined = async (MemberId) => {
    console.log("A new user has joined the channel", MemberId);
    //    document.getElementById("user-2").style.display = 'block'
    let newUser = document.createElement("video");
    newUser.classList.add("video-player");
    document.getElementById("videos").append(newUser);
    newUser.id = videoCount;
    document.getElementById(videoCount).autoplay = true;
    document.getElementById(videoCount).playsInline = true;
    createOffer(MemberId);
}

let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers);


    remoteStream = new MediaStream();
    document.getElementById(`${videoCount}`).srcObject = remoteStream;
    videoCount++;

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        })
        document.getElementById('user-1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            // console.log('New ICE candidate',event.candidate);
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);

        }
    }

}

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId);
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);

    //    console.log("offer : ", offer);
}

let createAnswer = async (MemberId, offer) => {
    // document.getElementById("user-2").style.display = 'block'

    let newUser = document.createElement("video");
    newUser.classList.add("video-player");
    document.getElementById("videos").append(newUser);
    newUser.id = videoCount;
    document.getElementById(videoCount).autoplay = true;
    document.getElementById(videoCount).playsInline = true;

    await createPeerConnection(MemberId);

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId);
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
}

let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}
window.addEventListener("beforeunload", leaveChannel);

init();