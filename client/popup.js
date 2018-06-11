const DEV = false;
const SERVER_URL = (DEV) ? "http://localhost:3000" : "https://flix-chrome.herokuapp.com/";

// States
const STATES = {
  POST_CREATE: 1,
  POST_JOIN: 2
};
Object.freeze(STATES);

// Vars
const USER = {
  showId: '',
  roomId: '',
  socket: null,
  tabId: -1
};

// LOCAL STORAGE
// keys: state, toggle, roomId, tabId, username
const storageKeys = ['state', 'toggle', 'roomId', 'tabId', 'username'];
const nullKeys = {
  roomId: '',
  tabId: -1,
  username: '',
}

// store key-value in local storage
function store(key, value) {
  key = `flix-${key}`;
  const data = {};
  data[key] = value;
  console.log(`Store ${value} as ${key}`);
  chrome.storage.local.set(data);
}
// retrieve value of key in callback
function retrieve(key, callback) {
  key = `flix-${key}`;
  chrome.storage.local.get(key, result => {
    console.log(`Retrieving ${key} as ${result[key]}`);
    if (result[key] === nullKeys[key]) callback(null);
    else callback(result[key]);
  });
}
// retrieve set of keys
function retrieveKeys(keys, callback) {
  chrome.storage.local.get(null, result => {
    const values = {};
    keys.forEach(key => {
      const fmtKey = `flix-${key}`;
      values[key] = (result[fmtKey] === nullKeys[key]) ? null : result[fmtKey];
    });
    console.log('Retrieving: ', values);
    callback(values);
  });
}
// Set state of app
function setState(state) {
  store('state', state);
}
function resetState() {
  deleteKeys(['state']);
}
// Remove keys from local storage
function deleteKeys(keys) {
  chrome.storage.local.remove(keys.map(k => `flix-${k}`));
}
// Reset local storage
function resetStorage() {
  deleteKeys(storageKeys);
}


// HELPERS

function getShowId(url) {
  // Check if watching a netflix show
  if (url.startsWith('https://www.netflix.com/watch/')) {
    url = new URL(url);
    return url.pathname.split("/")[2];
  }

  return null;
}

function setTabId(tabId) {
  USER.tabId = tabId;
  store('tabId', tabId);
}


// CHANNELS

// Send command to specific tab
function sendCommandToTab(id, command, params, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const tabId = id || tabs[0].id;
    chrome.tabs.sendMessage(tabId, { command, params }, callback);
  });
}

// Send command to active tab
function sendCommandToActiveTab(command, params, callback) {
  sendCommandToTab(null, command, params, callback);
}

// Send command to background.js
function sendRuntimeMessage(message, params, callback) {
  chrome.runtime.sendMessage({ message, params }, callback);
}

function createSession(username, iconTheme) {
  const { socket, showId } = USER;
  socket.emit('create', { showId, theme: iconTheme });
  socket.on('createResponse', ({ id }) => {
    USER.roomId = id;
    $("#room-id-text").val(id);
    store('roomId', id);
    store('toggle', false);
    store('username', username);
    sendCommandToActiveTab('create', { username, roomId: id });
  });
}

// TODO: Bug - invalid room id then valid opens 2 urls
function joinSession(roomId, username, callback) {
  const { socket } = USER;
  socket.emit('join', { roomId, username });
  socket.on('joinResponse', ({ showId }) => {
    if (showId == null) {
      callback(false);
    } else {
      store('roomId', roomId);
      store('toggle', false);
      store('username', username);
      callback(true);
      sendRuntimeMessage('openRoom', { showId });
    }
  });
}

function leaveSession() {
  USER.showId = '';
  setTabId(-1);
  resetStorage();
  sendCommandToActiveTab('leave');
  $('.choose-container').show(100);
  $('.room-form').hide();
  $('#toggle-chat').prop('checked', false);
  toggleChat(false);
}

function toggleChat(show) {
  store('toggle', show);
  sendCommandToActiveTab('toggleChat', { show });
}

// Open new tab to url
function open(url, callback) {
  chrome.tabs.create({ url }, callback);
}


// Set up popup
function setView(state) {
  switch (state) {
    case STATES.POST_CREATE:
      $('.choose-container').hide();
      $('.room-form').show();
      $('.post-create-view').show();
      break;
    case STATES.POST_JOIN:
      $('.choose-container').hide();
      $('.room-form').show();
      $('.post-join-view').show();
      break;
    default:
      $('.choose-container').show(100);
      $('.room-form').hide();
      $('#toggle-chat').prop('checked', false);
  }
}

// Display error page
function displayError(errorNum) {
  $('.error').hide();
  $(`#error-${errorNum}`).show();
  $(".invalid-page").show();
}

// Add button listeners
function addButtonListeners(tabs) {
  const createRoomBtn = document.getElementById('create');
  const joinRoomBtn = document.getElementById('join');
  const createRoomSubmitBtn = document.getElementById('submit-create');
  const joinRoomSubmitBtn = document.getElementById('submit-join');

  createRoomBtn.addEventListener('click', function () {
    // Check if watching a netflix show
    const showId = getShowId(tabs[0].url);

    if (showId != null) {
      // Set showId
      USER.showId = showId;
      $(".form-container").show(100);
      $("#form-join").hide();
      $(".invalid-page").hide();
      $("#form-create").show();
    } else {
      $(".form-container").hide();
      displayError(1);
      resetState();
    }
  });
  joinRoomBtn.addEventListener('click', function () {
    $(".form-container").show(100);
    $("#form-create").hide();
    $(".invalid-page").hide();
    $("#form-join").show();
  });
  createRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const iconTheme = $("#icons").val();
    setTabId(tabs[0].id); // Set tabId
    createSession(username, iconTheme);
    $('.choose-container').hide();
    $('.form-container').hide();
    $('.room-form').show(100);
    $('.post-create-view').show();
    toggleChat(true);
    $('#toggle-chat').prop('checked', true);
    setState(STATES.POST_CREATE);
  });
  joinRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const room = $("#room").val();
    if (!room) return;
    setTabId(tabs[0].id); // Set tabId
    joinSession(room, username, valid => {
      if (!valid) {
        $('#invalid-room').show();
      } else {
        toggleChat(true);
        $('#toggle-chat').prop('checked', true);
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
    leaveSession();
  });

  // Listen to toggle chat
  const toggleSwitch = document.querySelector('#toggle-chat');
  toggleSwitch.addEventListener('change', function() {
    toggleChat(this.checked);
  });

  // Add link to Netflix
  $('#netflix').on('click', function() {
    open('https://www.netflix.com');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  USER.socket = io.connect(SERVER_URL);

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const showId = getShowId(tabs[0].url);

    // Retrieve state
    retrieveKeys(['state', 'tabId', 'username', 'roomId', 'toggle'], vals => {
      const { state, tabId, username, roomId, toggle } = vals;
      switch (state) {
        case STATES.POST_CREATE:
        case STATES.POST_JOIN:
          // Not on netflix tab
          if (showId == null) {
            $('.choose-container').hide();
            displayError(2)
          } else if (tabs[0].id != tabId) {
            $('.choose-container').hide();
            displayError(3);
          } else {
            USER.roomId = roomId;
            USER.tabId = tabId;
            if (state === STATES.POST_CREATE) {
              $("#room-id-text").val(roomId);
            }
            setView(state);
            // toggle is already set to true from content scripts
            $('#toggle-chat').prop('checked', true);
          }
          break;
      }
    });

    addButtonListeners(tabs);
  });

  // Tabs listeners
  chrome.tabs.onRemoved.addListener((tabId, info) => {

  });
}, false);
