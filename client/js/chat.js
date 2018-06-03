function hashString(str) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function getGravatarURL(username) {
  return `http://www.gravatar.com/avatar/${hashString(username)}?d=robohash`;
}

function createChat() {
  const div = document.createElement('div');
  const app = document.querySelector('.sizing-wrapper');
  app.parentNode.insertBefore(div, app.nextSibling);


  new Vue({
    el: div,
    data: {
      filepath: chrome.extension.getURL("img/emojione-assets/png/"),
      socket: null, // Our websocket
      newMsg: '', // Holds new messages to be sent to the server
      chatContent: '', // A running list of chat messages displayed on the screen
      email: null, // Email address used for grabbing an avatar
      username: 'Jimmy', // Our username,
      gravatar: '', // Gravatar URL
      joined: false, // True if email and username have been filled in
    },
    created: function() {
      const self = this;

      self.socket = io.connect('http://localhost:3000');
      self.gravatar = getGravatarURL(self.username);
      const socket = self.socket;

      // Join session
      socket.emit('join', { name: self.username, gravatarURL: self.gravatar });

      // Receive incoming message
      socket.on('chat message', function (data) {
        const { msg, username, gravatar } = data;
        self.chatContent += self.formatMessage(username, gravatar, msg);
      });

      // Receiver own message
      socket.on('user message', function(data) {
        const { msg, username, gravatar } = data;
        self.chatContent += self.formatMessage(username, gravatar, msg, true);
      });

      // Receive incoming statuses
      socket.on('status', function({ status }) {
        self.chatContent += `
          <p class="status">${status}</p>
        `;
      });

      // Handle incoming controls
      socket.on('command', commandHandler);

      // Add button listeners to control panel
      addButtonListeners(socket);
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
        this.socket.emit('chat message', {
          username: this.username,
          gravatar: this.gravatar,
          msg: this.newMsg
        });
        this.newMsg = "";
      },
      formatMessage: function(username, gravatar, msg, isSelf = false) {
        const colour = isSelf ? "teal darken-3" : "blue-grey darken-3";
        return `
          <div class="row valign-wrapper">
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
                  ${msg}
                </span>
              </div>
            </div>
          </div>
        `;
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
            id: 'message-container'
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
}

function toggleChat() {
  waitTillVisible('.flix-sidebar', 10000).then(() => {
    $('.sizing-wrapper').toggleClass('chat-active');
    $('.flix-sidebar').toggleClass('chat-active');
  }, () => console.log('Could not create chat in time.'));
}

// Handles user's controls and broadcasts them to the room
function buttonHandler(type, socket, factor) {
  const seeker = document.querySelector('.scrubber-head');
  const currTimestamp = seeker.getAttribute('aria-valuetext').split(' ')[0];
  switch (type.toLowerCase()) {
    case 'play':
      socket.emit('play');
      break;
    case 'pause':
      socket.emit('pause', { time: currTimestamp });
      break;
    case 'seek':
      const seekValue = seeker.getAttribute('aria-valuenow');
      const seekMax = seeker.getAttribute('aria-valuemax');
      const factor = seekValue / seekMax;
      socket.emit('seek', { time: currTimestamp, factor });
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
    default:
      console.log(`Invalid command: ${command}`);
      return;
  }
}

// Add event listeners to control panel
function addButtonListeners(socket, username, gravatar) {
  waitTillVisible('.PlayerControls--button-control-row', 100000).then(() => {
    const btnControl = document.querySelector('.PlayerControls--button-control-row');
    const buttons = btnControl.querySelectorAll('button');
    const ppButton = buttons[0];
    const track = document.querySelector('.scrubber-bar');

    ppButton.addEventListener('click', e => buttonHandler(e.target.getAttribute('aria-label'), socket));
    track.addEventListener('click', () => buttonHandler('seek', socket));
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
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.command === 'create') {
      const  { username, iconTheme } = request;
    } else if (request.command === "join") {
      sendResponse({response: "joined chat"});
      createChat();
    } else if (request.command === "toggleChat") {
      sendResponse({response: "toggled chat"});
      toggleChat();
    }
  }
);
