function sendCommand(command, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command }, callback);
  });
}

function createSession(socket, roomId, username, iconTheme) {
  const data = {
    command: 'create',
    socket,
    username
  };
  socket.emit('create', { id: roomId, owner: username, theme: iconTheme });
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, data);
  });
}

function joinSession() {
  sendCommand('join', res => console.log(res));
}

function toggleChat() {
  sendCommand('toggleChat', res => console.log(res));
}


document.addEventListener('DOMContentLoaded', function() {
  const socket = io.connect('http://localhost:3000');
  let roomId = -1;
  socket.on('room id', ({ id }) => {
    roomId = id;
    $("#room-id-text").val(id);
  });
  // joinSession();

  // const checkPageButton = document.getElementById('checkPage');
  // checkPageButton.addEventListener('click', function() {
  //   toggleChat();
  // }, false);

  const createRoomBtn = document.getElementById('create');
  const joinRoomBtn = document.getElementById('join');
  const createRoomSubmitBtn = document.getElementById('submit-create');
  const joinRoomSubmitBtn = document.getElementById('submit-join');
  createRoomBtn.addEventListener('click', function () {
    $(".form-container").show(100);
    $("#form-create").show();
    $("#form-join").hide();
  });
  joinRoomBtn.addEventListener('click', function () {
    $(".form-container").show(100);
    $("#form-create").hide();
    $("#form-join").show();
  });
  createRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const iconTheme = $("#icons").val();
    createSession(socket, roomId, username, iconTheme);
    $('.choose-container').hide();
    $('.form-container').hide();
    $('.room-form').show(100);
  });
  joinRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const room = $("#room").val();
    if (!room) return;
    console.log(username);
    console.log(room);
  });

  const copyRoomIdBtn = document.querySelector('#copy-room-id');
  const roomIdText = document.querySelector('#room-id-text');
  copyRoomIdBtn.addEventListener('click', function() {
    roomIdText.select();
    document.execCommand("copy");
    copyRoomIdBtn.innerHTML = "Copied!";
  });

}, false);
