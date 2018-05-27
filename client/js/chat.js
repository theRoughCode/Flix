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
      username: 'Jimmy', // Our username
      joined: false, // True if email and username have been filled in
    },
    created: function() {
      const self = this;

      self.socket = io.connect('http://localhost:3000');
      const socket = self.socket;
      // Receive incoming message
      self.socket.on('chat message', function (data) {
        const { msg, username } = data;

        self.chatContent += self.formatMessage(username, msg);
      });
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
          msg: this.newMsg
        });
        this.newMsg = "";
      },
      formatMessage: function(username, msg) {
        const colour = (username === this.username) ? "teal lighten-2" : "blue-grey darken-3";
        return `
          <div class="row valign-wrapper">
            <div class="col s2 avatar">
              <img
                src="${getGravatarURL(username)}"
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
                'waves-effect': true,
                'waves-light': true,
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
  const chat = document.querySelector('.flix-sidebar');
  if (chat == null) {
    console.error('Chat not created yet');
    return;
  }
  $('.sizing-wrapper').toggleClass('chat-active');
  $('.flix-sidebar').toggleClass('chat-active');
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.command === "join") {
      sendResponse({response: "joined chat"});
      createChat();
    } else if (request.command === "toggleChat") {
      sendResponse({response: "toggled chat"});
      toggleChat();
    }
  }
);
