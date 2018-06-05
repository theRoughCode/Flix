// States
const STATES = {
  DEFAULT: 1,
  POST_CREATE: 2,
  POST_JOIN: 3
};
Object.freeze(STATES);

// LOCAL STORAGE

// store key-value in local storage
function store(key, value) {
  key = `flix-${key}`;
  chrome.storage.local.set({ key: value }, function() {
    console.log(`${key} is set to ${value}`);
  });
}
// retrieve value of key in callback
function retrieve(key, callback) {
  key = `flix-${key}`;
  chrome.storage.local.get([key], callback);
}
// Set state of app
function setState(state) {
  store('state', state);
}
// Listen and store values of input
function listenToInput(field) {
  $(`#${field}`).change(function() {
    store(field, $(`#${field}`).val());
  });
}
// Initialize session storage
function initializeStorage() {
  setState(STATES.DEFAULT);
}
// Reset local storage
function resetStorage() {
  setState(STATES.DEFAULT);
  store('toggle', false);
}


// CHANNELS

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
      open(`https://www.netflix.com/watch/${showId}`);
      sendCommand('join');
    }
  });
}

function toggleChat(show) {
  store('toggle', show);
  sendCommand('toggleChat', { show });
}

// Open new tab to url
function open(url) {
  chrome.tabs.create({ url });
}


document.addEventListener('DOMContentLoaded', function() {
  const socket = io.connect('http://localhost:3000');
  let roomId = -1;
  let showId = -1;

  socket.on('roomId', ({ id }) => {
    roomId = id;
    $("#room-id-text").val(id);
  });

  const createRoomBtn = document.getElementById('create');
  const joinRoomBtn = document.getElementById('join');
  const createRoomSubmitBtn = document.getElementById('submit-create');
  const joinRoomSubmitBtn = document.getElementById('submit-join');

  createRoomBtn.addEventListener('click', function () {
    // Check if watching a netflix show
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0].url.startsWith('https://www.netflix.com/watch/')) {
        // Set showId
        const url = new URL(tabs[0].url);
        showId = url.pathname.split("/")[2];
        $(".form-container").show(100);
        $("#form-join").hide();
        $("#form-create").show();
      } else {
        $(".form-container").hide();
        $(".invalid-page").show();
        setState(STATES.DEFAULT);
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
    setState(STATES.POST_CREATE);
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
        setState(STATES.POST_JOIN);
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

  const leaveRoomBtn = document.querySelector('#leave-room');
  leaveRoomBtn.addEventListener('click', function() {
    sendCommand('leave');
    resetStorage();
    $('.choose-container').show(100);
    $('.room-form').hide();
    $('#toggle-chat').prop('checked', false);
    toggleChat(false);
  });

  // Listen to toggle chat
  $("#toggle-chat").change(function() {
    const toggleOn = $(this).is(':checked');
    toggleChat(toggleOn);
  });

  // Add link to Netflix
  $('#netflix').on('click', function() {
    open('https://www.netflix.com');
  });
}, false);
