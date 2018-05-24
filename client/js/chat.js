document.body.style.background = 'yellow'

const div = document.createElement('div');
const viewport = document.querySelector('#viewport');
viewport.appendChild(div);


new Vue({
  el: div,
  data: {
    socket: null, // Our websocket
    newMsg: '', // Holds new messages to be sent to the server
    chatContent: '', // A running list of chat messages displayed on the screen
    email: null, // Email address used for grabbing an avatar
    username: 'Jimmy', // Our username
    joined: false // True if email and username have been filled in
  },
  created: function() {
    const self = this;

    self.socket = io.connect('http://localhost:3000');
    const socket = self.socket;
    socket.on('news', function (data) {
      console.log(data);
      socket.emit('my other event', { my: 'data' });
    });

    // Receive incoming message
    self.socket.on('chat message', function (data) {
      const { msg, username } = data;

      self.chatContent += '<div class="chip">'
          + '<img src="' + self.gravatarURL(username) + '">' // Avatar
          + username
          + '</div>'
          + msg + '<br/>'; // Parse emojis
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
      console.log(this.newMsg);
      this.socket.emit('chat message', {
        username: this.username,
        msg: this.newMsg
      });
      this.newMsg = "";
    },
    gravatarURL: function(username) {
      return 'http://www.gravatar.com/avatar/' + username;
    }
  },
  render: function (h) {
    const chatContent = this.chatContent;

    return h('div', {
      class: { 'flix-sidebar': true }
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
