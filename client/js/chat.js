emojione.imagePathPNG = chrome.extension.getURL("img/emojione-assets/png/32/");
const DEV = true;
const URL = (DEV) ? "http://localhost:3000" : "https://flix-chrome.appspot.com/";

// ON LOAD
const socket = io.connect(URL);

const div = document.createElement('div');
div.id = 'app';
const app = document.querySelector('.sizing-wrapper');
app.parentNode.insertBefore(div, app.nextSibling);

const vue = new Vue({
  el: "#app",
  data: {
    filepath: chrome.extension.getURL("img/emojione-assets/png/"),
    newMsg: '', // Holds new messages to be sent to the server
    username: '',
    roomId: '',
    chatContent: '', // A running list of chat messages displayed on the screen
    joined: false, // True if email and username have been filled in
  },
  created: function() {
    const self = this;

    // Receive incoming message
    socket.on('chatMessage', function (data) {
      const { msg, username, gravatar } = data;
      self.displayMessage(self.formatMessage(username, gravatar, msg));
    });

    // Receiver own message
    socket.on('userMessage', function(data) {
      const { msg, gravatar } = data;
      self.displayMessage(self.formatMessage(self.username, gravatar, msg, true));
    });

    // Receive incoming statuses
    socket.on('status', function({ status }) {
      self.displayMessage(`<p class="status">${status}</p>`);
    });
    socket.on('statusSelf', function({ status }) {
      self.displayMessage(`<p class="status-self">${status}</p>`);
    });

    // Handle incoming controls
    socket.on('command', commandHandler);

    // Add button listeners to control panel
    addButtonListeners();
  },
  methods: {
    onInput: function(e) {
      this.newMsg = e.target.value;
    },
    onKeyUp: function(e) {
      if (e.keyCode === 13) this.send();
    },
    send: function() {
      if (!/\S/.test(this.newMsg)) return;
      socket.emit('chatMessage', {
        username: this.username,
        roomId: this.roomId,
        msg: this.newMsg
      });
      this.newMsg = "";
    },
    formatMessage: function(username, gravatar, msg, isSelf = false) {
      const colour = isSelf ? "teal darken-3" : "blue-grey darken-3";
      return `
        <div class="message-container row valign-wrapper">
          <div class="col s2 avatar">
            <img
              src="${gravatar}"
              title="${username}"
              class="circle reponsive-img avatar-img"
            >
          </div>
          <div class="col s10">
            <div class="card-panel ${colour} lighten-5 z-depth-1 message">
              <span>
                ${emojione.toImage(msg)}
              </span>
            </div>
          </div>
        </div>
      `;
    },
    displayMessage: function(message) {
      this.chatContent += message;
      // Auto scroll to the bottom
      const messages = document.getElementById('chat-messages');
      setTimeout(() => messages.scrollTop = messages.scrollHeight, 100);
    }
  },
  render: function (h) {
    const chatContent = this.chatContent;

    return h('div', {
      class: {
        'flix-sidebar': true,
        'chat-active': false
      }
    }, [
      // Chat box
      h('div', {
        attrs: {
          id: 'message-area'
        },
        class: { row: true }
      }, [
        h('div', {
          class: { col: true, s12: true }
        }, [
          h('div', {
            class: { card: true, horizontal: true }
          }, [
            h('div', {
              attrs: {
                id: 'chat-messages'
              },
              class: { 'card-content': true },
              domProps: { innerHTML: chatContent }
            })
          ])
        ])
      ]),
      // Send box
      h('div', {
        attrs: {
          id: 'input-container'
        },
        class: { row: true }
      }, [
        // Input box
        h('div', {
          class: {
            'input-field': true,
            col: true,
            s9: true
          }
        }, [
          h('input', {
            attrs: {
              id: 'message-box'
            },
            domProps: {
              value: this.newMsg,
              placeholder: 'Enter message here'
            },
            on: {
              input: e => this.onInput(e),
              keyup: e => this.onKeyUp(e)
            }
          })
        ]),
        // Send button
        h('div', {
          class: {
            'input-field': true,
            col: true,
            s3: true
          }
        }, [
          h('button', {
            class: {
              btn: true
            },
            on: {
              click: () => this.send()
            }
          }, 'Send')
        ])
      ])
    ])
  }
});

chrome.storage.local.get(null, results => {
  const tabId = results['flix-tabId'];
  const roomId = results['flix-roomId'];
  const username = results['flix-username'];

  // Have not joined a channel yet
  if (tabId === -1) return;

  // Check if watching a netflix show
  if (location.href.startsWith('https://www.netflix.com/watch/')) {
    chrome.runtime.sendMessage({ message: 'getTabId' }, function(response) {
      // If current tab is same as original tab
      if (tabId === response.tabId) {
        joinChat(username, roomId);
        toggleChat(true);
        chrome.storage.local.set({ 'flix-toggle': true });
      }
    });
  }
});

// COMMAND FUNCTIONS

function toggleChat(show) {
  waitTillVisible('.flix-sidebar', 10000).then(() => {
    if (show) {
      $('.sizing-wrapper').addClass('chat-active');
      $('.flix-sidebar').addClass('chat-active');
    } else {
      $('.sizing-wrapper').removeClass('chat-active');
      $('.flix-sidebar').removeClass('chat-active');
    }
  }, () => console.log('Could not create chat in time.'));
}

function joinChat(username, roomId, isHost) {
  vue.username = username;
  vue.roomId = roomId;
  vue.chatContent = '';
  socket.connect();

  // Join specified room id
  socket.emit('join', { username, roomId, isHost });
}

function leaveChat() {
  socket.emit('leave', { username: vue.username, roomId: vue.roomId });
  vue.username = "";
  vue.roomId = "";
  vue.chatContent = "";
  socket.disconnect();
}

// Handles user's controls and broadcasts them to the room
function buttonHandler(type) {
  const { username, roomId } = vue;
  const seeker = document.querySelector('.scrubber-head');
  const currTimestamp = seeker.getAttribute('aria-valuetext').split(' ')[0];
  switch (type.toLowerCase()) {
    case 'play':
      socket.emit('play', { username, roomId });
      break;
    case 'pause':
      socket.emit('pause', { username, roomId, time: currTimestamp });
      break;
    case 'seek':
      const seekValue = seeker.getAttribute('aria-valuenow');
      const seekMax = seeker.getAttribute('aria-valuemax');
      const factor = seekValue / seekMax;
      socket.emit('seek', { username, roomId, time: currTimestamp, factor });
      break;
    default:
      console.log(`Invalid aria label: ${ariaLabel}`);
      return;
  }
}

// Receives incoming controls from room broadcasts
function commandHandler(data) {
  const { command } = data;
  switch (command) {
    case 'play':
    case 'pause':
      const btn = document.querySelector('.PlayerControls--button-control-row').querySelector('button');
      if (command === btn.getAttribute('aria-label').toLowerCase()) {
        btn.click();
      } else console.log('failed', command)
      break;
    case 'seek':
      const { factor } = data;
      showControls()
        .then(showScrubber)
        .then(() => seek(factor));
      break;
    case 'closeRoom':
      toggleChat(false);
      leaveChat();
      break;
    default:
      console.log(`Invalid command: ${command}`);
      return;
  }
}

// Add event listeners to control panel
function addButtonListeners() {
  waitTillVisible('.PlayerControls--button-control-row', 100000).then(() => {
    const btnControl = document.querySelector('.PlayerControls--button-control-row');
    const buttons = btnControl.querySelectorAll('button');
    const ppButton = buttons[0];
    const track = document.querySelector('.scrubber-bar');

    ppButton.addEventListener('click', e => buttonHandler(e.target.getAttribute('aria-label')));
    track.addEventListener('click', () => buttonHandler('seek'));
  }, () => console.log('Could not get buttons on time'));
}


// Seeker Helper Functions

// Keeps checking to see if element is visible and returns when the element is
// visible or time runs out
function waitTillVisible(className, maxWait = 1000, delay = 100) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    setInterval(() => {
      const elem = document.querySelector(className);
      if (elem != null || $(elem).is(':visible')) return resolve();
      else if (Date.now() - startTime >= maxWait) return reject();
    }, delay);
  });
}

// Move mouse to show bottom controls
function showControls() {
  const bottomControls = document.querySelector('.PlayerControls--bottom-controls.nfp-control-row.bottom-controls');
  bottomControls.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    currentTarget: bottomControls
  }));
  return waitTillVisible('.PlayerControls--bottom-controls.nfp-control-row.bottom-controls');
}

// Move mouse to show scrubber
function showScrubber() {
  const scrubber = document.querySelector('.scrubber-bar');
  scrubber.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    currentTarget: scrubber
  }));
  return waitTillVisible('.scrubber-bar');
}

// Click on scrubber to seek
function seek(factor) {
  const track = document.querySelector('.scrubber-bar');
  const offsetX = Math.round(track.offsetWidth * factor);
  const offsetY = Math.round(track.offsetHeight / 2);
  const pageX = track.offsetLeft + offsetX;
  const pageY = track.offsetTop + offsetY;
  const screenX = pageX - window.scrollX;
  const screenY = pageY - window.scrollY;
  const options = {
    screenX,
    screenY,
    clientX: screenX,
    clientY: screenY,
    offsetX,
    offsetY,
    pageX,
    pageY,
    currentTarget: track,
    bubbles: true,
    button: 0
  };
  const mouseDownEvent = new MouseEvent('mousedown', options);
  const mouseUpEvent = new MouseEvent('mouseup', options);
  const mouseOutEvent = new MouseEvent('mouseout', options);
  track.dispatchEvent(mouseDownEvent);
  track.dispatchEvent(mouseUpEvent);
  track.dispatchEvent(mouseOutEvent);
}

// Listen to incoming messages from popup.html
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.command) {
    case 'create':
      joinChat(request.params.username, request.params.roomId, true);
      break;
    case 'join':
      joinChat(request.params.username, request.params.roomId, false);
      break;
    case 'toggleChat':
      sendResponse({response: "toggled chat"});
      toggleChat(request.params.show);
      break;
    case 'leave':
      leaveChat();
      break;
  }
});
