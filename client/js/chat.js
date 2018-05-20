document.body.style.background = 'yellow'

const div = document.createElement('div');
const viewport = document.querySelector('#viewport');
viewport.appendChild(div);


new Vue({
  el: div,
  data: {
    ws: null, // Our websocket
    newMsg: '', // Holds new messages to be sent to the server
    chatContent: '', // A running list of chat messages displayed on the screen
    email: null, // Email address used for grabbing an avatar
    username: null, // Our username
    joined: false // True if email and username have been filled in
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
      this.newMsg = "";
    }
  },
  render: function (h) {
    return h('div', {
      class: { 'flix-sidebar': true }
    }, [
      // Chat box
      h('div', {
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
              domProps: { innerHTML: 'chatContent' }
            })
          ])
        ])
      ]),
      // Send box
      h('div', {
        class: { row: true }
      }, [
        // Input box
        h('div', {
          class: {
            'input-field': true,
            col: true,
            s8: true
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
            s4: true
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
