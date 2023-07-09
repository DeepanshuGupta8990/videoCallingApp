let localStream;
let remoteStream;
let peerConnection;
let querystring = window.location.search;
let urlParams = new URLSearchParams(querystring);
let room = urlParams.get('room');
let password = urlParams.get("password");
let roomId = room+password;
let APP_ID = "462a4574457a40abbb448e2d7b22fb20";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

if(!roomId){
  window.location = 'lobby.html';
}

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
        }
    ]
}

let constraints = {
  video: {
    width:{min:640, ideal:1920, max:1920},
    height:{min:480, ideal:1080, max:1080},
  },
  audio:true,
}
// let constraints = {
//   video:true,
//   audio:true
// }
let init = async ()=>{
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({uid,token});

  channel = client.createChannel(roomId);
  await channel.join();

  channel.on('MemberJoined',handleUserJoined);
  channel.on("MemberLeft",handleUserLeft);

  client.on("MessageFromPeer",handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia(constraints)
  document.getElementById('user-1').srcObject = localStream;
  document.getElementById('user-1').muted = true;
}

let handleUserLeft = (MemberId)=>{
    document.getElementById("user-2").style.display = 'none';
    document.getElementById('user-1').classList.remove("smallframe");
}

let handleMessageFromPeer = async (message,MemberId)=>{
    message = JSON.parse(message.text);
    if(message.type === 'offer'){
      createAnswer(MemberId,message.offer)
    }
    if(message.type === 'answer'){
      addAnswer(message.answer)
    }
    if(message.type === 'candidate'){
      if(peerConnection){
        peerConnection.addIceCandidate(message.candidate);
      }
    }
    // console.log("Message : ",message)
}

let handleUserJoined = async (MemberId)=>{
   console.log("A new user has joined the channel",MemberId);
   document.getElementById("user-2").style.display = 'block'
   createOffer(MemberId);
}

let createPeerConnection = async (MemberId)=>{
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;

    document.getElementById('user-1').classList.add("smallframe");
    drag();
 
    if(!localStream){
     localStream = await navigator.mediaDevices.getUserMedia({
         video: true,
         audio: false
       })
       document.getElementById('user-1').srcObject = localStream;
    }
 
    localStream.getTracks().forEach((track)=>{
         peerConnection.addTrack(track,localStream);
    })
 
    peerConnection.ontrack = (event)=>{
         event.streams[0].getTracks().forEach((track)=>{
             remoteStream.addTrack(track);
         })
    }
 
    peerConnection.onicecandidate = async (event)=>{
     if(event.candidate){
         // console.log('New ICE candidate',event.candidate);
         client.sendMessageToPeer({text : JSON.stringify({'type':'candidate','candidate': event.candidate})},MemberId);
 
     }
    }
 
}

let createOffer = async (MemberId)=>{
   await createPeerConnection(MemberId);
   let offer = await peerConnection.createOffer();
   await peerConnection.setLocalDescription(offer);

   client.sendMessageToPeer({text : JSON.stringify({'type':'offer','offer':offer})},MemberId);

//    console.log("offer : ", offer);
}

let createAnswer = async (MemberId,offer)=>{
    document.getElementById("user-2").style.display = 'block'
    await createPeerConnection(MemberId);

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    client.sendMessageToPeer({text : JSON.stringify({'type':'answer','answer': answer})},MemberId);
}

let addAnswer = async (answer)=>{
     if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer);
     }
}

let leaveChannel = async ()=>{
    await channel.leave()
    await client.logout()
}

let toggleCamera = async ()=>{
   let videoTrack = localStream.getTracks().find(track=> track.kind === 'video');

   if(videoTrack.enabled){
    videoTrack.enabled = false;
    document.getElementById('cameraBtn').style.backgroundColor = 'rgb(255,80,80)';
   }else{
    videoTrack.enabled = true;
    document.getElementById('cameraBtn').style.backgroundColor = 'rgb(179,102,249,0.9)';
   }
}

document.getElementById('cameraBtn').addEventListener("click",toggleCamera)

let toggleAudio = async ()=>{
   let audioTrack = localStream.getTracks().find(track=> track.kind === 'audio');

   if(audioTrack.enabled){
    audioTrack.enabled = false;
    document.getElementById('micBtn').style.backgroundColor = 'rgb(255,80,80)';
   }else{
    audioTrack.enabled = true;
    document.getElementById('micBtn').style.backgroundColor = 'rgb(179,102,249,0.9)';
   }
}

document.getElementById('micBtn').addEventListener("click",toggleAudio)

window.addEventListener("beforeunload",leaveChannel);

init();

// Get the draggable element
function drag(){
const dragElement = document.querySelector(".smallframe");
let dragging = false;
let offsetX = 0;
let offsetY = 0;

dragElement.addEventListener('mousedown', (e) => {
  dragging = true;
  dragElement.style.position = 'absolute';
  // offsetX = e.clientX - dragElement.getBoundingClientRect().left;
  // offsetY = e.clientY - dragElement.getBoundingClientRect().top;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

dragElement.addEventListener('mousemove', (e) => {
  if (dragging) {
    dragElement.style.top = `${e.clientY - offsetY}px`;
    dragElement.style.left = `${e.clientX - offsetX}px`;
  }
});

dragElement.addEventListener('mouseup', () => {
  dragging = false;
});


dragElement.addEventListener('touchstart', (e) => {
  dragging = true;
  dragElement.style.position = 'absolute';
  const touch = e.touches[0];
  offsetX = touch.clientX - dragElement.getBoundingClientRect().left;
  offsetY = touch.clientY - dragElement.getBoundingClientRect().top;
});

dragElement.addEventListener('touchmove', (e) => {
  if (dragging) {
    const touch = e.touches[0];
    dragElement.style.top = `${touch.clientY - offsetY}px`;
    dragElement.style.left = `${touch.clientX - offsetX}px`;
  }
});

dragElement.addEventListener('touchend', () => {
  dragging = false;
});
}