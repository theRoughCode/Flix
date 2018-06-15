emojione.imagePathPNG = chrome.extension.getURL("img/emojione-assets/png/32/");
const DEV = true;
const URL = (DEV) ? "http://localhost:3000" : "https://flix-chrome.herokuapp.com/";

// ON LOAD
const socket = io.connect(URL);
const netflixTitle = document.title;
const typingMaxWait = 1000;
let isReceivingAction = false;

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
    chatContent: [], // A running list of chat messages displayed on the screen
    joined: false, // True if email and username have been filled in,
    unreadCount: 0,  // Keeps track of how many unread messages there are
    typingTimer: null // Timer counting down to turn off typing status
  },
  created: function() {
    const self = this;

    // Set playback of video (for guests)
    socket.on('setPlayback', function({ factor, isPlaying }) {
      const ppCommand = (isPlaying) ? 'play' : 'pause';
      ppAction(ppCommand);  // play/pause
      commandHandler({ command: 'seek', factor }); // seek to playback position
    });

    // Receive incoming message
    socket.on('chatMessage', function (data) {
      const { msg, username, gravatar } = data;
      self.formatMessage(username, gravatar, msg);
      if (document.hasFocus()) self.unreadCount = 0;
      else self.unreadCount++;
      setUnreadCount(self.unreadCount);
    });

    // Receiver own message
    socket.on('userMessage', function(data) {
      const { msg, gravatar } = data;
      self.formatMessage(self.username, gravatar, msg, true)
    });

    // Receive incoming statuses
    socket.on('status', function({ status }) {
      self.displayMessage({
        type: 'p',
        classes: { status: true },
        status
      });
    });
    socket.on('statusSelf', function({ status }) {
      self.displayMessage({
        type: 'p',
        classes: { 'status-self': true },
        status
      });
    });

    // Handle incoming controls
    socket.on('command', commandHandler);

    // Handling incoming typing status
    socket.on('typingStatus', function({ message }) {
      $(".typing-status span").text(message);
    });

    // Handle timestamp querying (only for hosts)
    socket.on('queryPlayback', ({ responseSocketId }) => {
      waitTillVisible('.PlayerControls--button-control-row', 100000).then(() => {
        showControls()
          .then(() => {
            const track = document.querySelector('.progress-control');
            const scrubberHead = document.querySelector('.scrubber-head');
            const scrubberHeadRadius = scrubberHead.offsetWidth / 2;
            const currOffset = scrubberHead.offsetLeft + scrubberHeadRadius;
            const factor = currOffset / track.offsetWidth;
            socket.emit('queryPlaybackResponse', { responseSocketId, factor, roomId: self.roomId });
          });
      });
    });

    // Add button listeners to control panel
    addButtonListeners();

    // Listen for document focus
    $(window).focus(() => {
      self.unreadCount = 0;
      setUnreadCount(0);
    });

    // When end credits show, control buttons disappear and button listeners
    // are removed. We want to listen for if the user click back into the show
    // to re-add the button listeners.
    $(window).mouseup(() => {
      let controls = document.querySelector('.controls');
      if (controls == null) {
        setTimeout(() => {
          controls = document.querySelector('.controls');
          if (controls != null) addButtonListeners();
        }, 700);
      }
    });
  },
  methods: {
    onInput: function(e) {
      this.newMsg = e.target.value;
      // Send typing status
      if (this.typingTimer == null) socket.emit('typingStatus', {
        isTyping: true,
        roomId: this.roomId,
        username: this.username
      });
      else clearTimeout(this.typingTimer);  // Reset typing timer
      this.typingTimer = setTimeout(() => {
        socket.emit('typingStatus', {
          isTyping: false,
          roomId: this.roomId,
          username: this.username
        });
        this.typingTimer = null;
      }, typingMaxWait);
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
      // TODO: Get better emoji pack
      const colour = isSelf ? "teal darken-3" : "blue-grey darken-3";
      const chatContent = Array.from(this.chatContent);
      const numMessages = chatContent.length;

      // Consolidate messages if same user
      if (numMessages > 0 &&
        chatContent[numMessages - 1].hasOwnProperty('attrs') &&
        chatContent[numMessages - 1].attrs.name === username) {
        const lastMsg = this.chatContent.pop();
        lastMsg.messageList.push(
          `<div class="card-panel ${colour} lighten-5 z-depth-1 message">
            <span>
              ${emojione.toImage(msg)}
            </span>
          </div>`
        );
        this.displayMessage(lastMsg);
        return;
      }

      // New user messaging
      const classes = {
        'message-container': true,
        'row': true,
        'valign-wrapper': true
      };
      const attrs = {
        name: username
      };
      const messageList = [
        `<div class="card-panel ${colour} lighten-5 z-depth-1 message">
          <span>
            ${emojione.toImage(msg)}
          </span>
        </div>`
      ];
      if (isSelf) {
        classes['is-self'] = true;
        messageList.unshift(`<div class="message-name-container">
            <span class="message-name">${username}</span>
          </div>`);
      }
      this.displayMessage({ type: 'div', classes, attrs, gravatar, messageList });
    },
    displayMessage: function(message) {
      const chatContent = Array.from(this.chatContent);
      chatContent.push(message);
      this.chatContent = chatContent;
      // Auto scroll to the bottom
      const messages = document.getElementById('chat-messages');
      setTimeout(() => messages.scrollTop = messages.scrollHeight, 100);
    },
    formatChatContent: function(content, h) {
      const {
        type,
        classes,
        attrs,
        gravatar,
        status,
        messageList
      } = content;
      switch (type) {
        case 'p':
          return h(type, {
            class: classes,
            attrs,
            domProps: {
              innerHTML: status
            }
          });
          break;
        case 'div':
          return h(type, {
            class: classes,
            attrs
          }, [
            h('div', {
              class: { 'col': true, 's2': true, 'avatar': true }
            }, [
              h('img', {
                class: { 'circle': true, 'responsive-img': true, 'avatar-img':true },
                attrs: { src: gravatar,  }
              })
            ]),
            h('div', {
              class: { 'col': true, 's10': true }
            }, [
              h('div', {
                class: { 'message-list': true },
                domProps: {
                  innerHTML: messageList.join("\n")
                }
              })
            ])
          ]);
      }
    }
  },
  render: function (h) {
    const chatContent = Array.from(this.chatContent);

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
            style: {
              marginBottom: '8px'
            },
            class: { card: true, horizontal: true }
          }, [
            h('div', {
              attrs: {
                id: 'chat-messages'
              },
              class: { 'card-content': true },
            }, chatContent.map(content => this.formatChatContent(content, h)))
          ])
        ]),
        h('div', {
          class: { col: true, s12: true, 'typing-status': true }
        }, [ h('span') ])
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

// Check if previous session was started in this tab.  If so, open chat.
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
  $('#message-box').prop('disabled', false);

  // Join specified room id
  socket.emit('join', { username, roomId, isHost });
}

function leaveChat() {
  socket.emit('leave', { username: vue.username, roomId: vue.roomId });
  $('#message-box').prop('disabled', true);
  chrome.runtime.sendMessage({ message: 'resetStorage' });
  socket.disconnect();
}

// Handles user's controls and broadcasts them to the room
function buttonHandler(type, e) {
  // Don't trigger events if you are receiving them (prevent loop)
  if (isReceivingAction) return;
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
      const track = document.querySelector('.progress-control');
      const factor = e.offsetX / track.offsetWidth;
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
      ppAction(command);
      break;
    case 'seek':
    //TODO: Seeking to beginning sometimes
      const { factor } = data;
      isReceivingAction = true;
      showControls()
        .then(showScrubber)
        .then(() => seek(factor));
      break;
    case 'closeRoom':
      leaveChat();
      break;
    default:
      console.log(`Invalid command: ${command}`);
      return;
  }
}

// Fire a play/pause action
function ppAction(command) {
  // TODO: Undefined player controls
  const btn = document.querySelector('.PlayerControls--button-control-row').querySelector('button');
  if (command === btn.getAttribute('aria-label').toLowerCase()) {
    isReceivingAction = true;
    btn.click();
    isReceivingAction = false;
  } else console.log('failed', command);
}

// Add event listeners to control panel
function addButtonListeners() {
  waitTillVisible('.PlayerControls--button-control-row', 100000).then(() => {
    const btnControl = document.querySelector('.PlayerControls--button-control-row');
    const buttons = btnControl.querySelectorAll('button');
    const ppButton = buttons[0];
    const track = document.querySelector('.progress-control');

    // Pause show on start
    ppAction('pause');

    ppButton.addEventListener('click', e => buttonHandler(e.target.getAttribute('aria-label')));
    track.addEventListener('click', e => buttonHandler('seek', e));
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
  const scrubber = document.querySelector('.progress-control');
  scrubber.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    currentTarget: scrubber
  }));
  return waitTillVisible('.progress-control');
}

// Click on scrubber to seek
function seek(factor) {
  const scrubber = document.querySelector('.scrubber-bar');
  const track = document.querySelector('.progress-control'); // Use this because scrubber's pos is inconsistent
  const trackBoundingRect = track.getBoundingClientRect(); // Need this to get absolute position of element
  const offsetX = Math.round(track.offsetWidth * factor);
  const offsetY = Math.round(track.offsetHeight / 2);
  const pageX = Math.round(trackBoundingRect.left) + offsetX;
  const pageY = Math.round(trackBoundingRect.top) + offsetY;
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
    srcElement: scrubber,
    toElement: scrubber,
    bubbles: true,
    button: 0
  };
  const mouseDownEvent = new MouseEvent('mousedown', options);
  const mouseUpEvent = new MouseEvent('mouseup', options);
  const mouseOutEvent = new MouseEvent('mouseout', options);
  scrubber.dispatchEvent(mouseDownEvent);
  scrubber.dispatchEvent(mouseUpEvent);
  scrubber.dispatchEvent(mouseOutEvent);

  isReceivingAction = false;
}

// Set the unread message count in title
function setUnreadCount(count) {
  if (count > 0) {
    document.title = `(${count}) ${netflixTitle}`;
  } else { // reset title
    document.title = netflixTitle;
  }
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
