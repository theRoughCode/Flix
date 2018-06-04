function sendCommand(command, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command }, callback);
  });
}

function createSession(socket, roomId, showId, username, iconTheme) {
  const data = {
    command: 'create',
    socket,
    username
  };
  socket.emit('create', { id: roomId, showId, owner: username, theme: iconTheme });
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
  let showId = -1;

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

    // Check if watching a netflix show
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      $("#form-join").hide();
      if (tabs[0].url.startsWith('https://www.netflix.com/watch/')) {
        // Set showId
        const url = new URL(tabs[0].url);
        showId = url.pathname.split("/")[2];
        $(".form-container").show(100);
        $("#form-create").show();
      } else {
        $(".invalid-page").show();
      }
    });
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
    createSession(socket, roomId, showId, username, iconTheme);
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

  // Add link to Netflix
  $('#netflix').on('click', function() {
    chrome.tabs.update({ url: 'https://www.netflix.com' });
  });
}, false);
