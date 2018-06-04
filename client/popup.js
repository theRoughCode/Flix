function sendCommand(command, params, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command, params }, callback);
  });
}

function createSession(socket, roomId, showId, username, iconTheme) {
  socket.emit('create', { id: roomId, showId, owner: username, theme: iconTheme });
  sendCommand('create', { username, roomId });
}

function joinSession(socket, roomId, username, callback) {
  socket.emit('join', { roomId, username });
  socket.on('joinResponse', ({ showId }) => {
    if (showId == null) {
      callback(false);
    } else {
      callback(true);
      sendCommand('join');
    }
  });
}

function toggleChat(show) {
  sendCommand('toggleChat', { show });
}


document.addEventListener('DOMContentLoaded', function() {
  const socket = io.connect('http://localhost:3000');
  let roomId = -1;
  let showId = -1;

  socket.on('roomId', ({ id }) => {
    roomId = id;
    $("#room-id-text").val(id);
  });

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
    $('.post-create-view').show();
  });
  joinRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const room = $("#room").val();
    if (!room) return;
    joinSession(socket, room, username, valid => {
      if (!valid) {
        $('#invalid-room').show();
      } else {
        $('.choose-container').hide();
        $('.form-container').hide();
        $('.room-form').show(100);
        $('.post-join-view').show();
      }
    });
  });

  const copyRoomIdBtn = document.querySelector('#copy-room-id');
  const roomIdText = document.querySelector('#room-id-text');
  copyRoomIdBtn.addEventListener('click', function() {
    roomIdText.select();
    document.execCommand("copy");
    copyRoomIdBtn.innerHTML = "Copied!";
  });

  // Listen to toggle chat
  $("#toggle-chat").change(function() {
    if ($(this).is(':checked')) {
      toggleChat(true);
    } else {
      toggleChat(false);
    }
  });

  // TODO: Implement leave room

  // Add link to Netflix
  $('#netflix').on('click', function() {
    chrome.tabs.update({ url: 'https://www.netflix.com' });
  });
}, false);
