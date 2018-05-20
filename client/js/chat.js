document.body.style.background = 'yellow'

const div = document.createElement('div');
const viewport = document.querySelector('#viewport');
viewport.appendChild(div);

var chatMessage = "test";

function onInput(e) {
  chatMessage = e.target.value;
}

function onKeyUp(e) {
  if (e.keyCode === 13) send()
}

function send() {
  console.log(chatMessage);
  chatMessage = "";
  $("#message-box").val("");
}

new Vue({
  el: div,
  render: function (h) {
    return h('div', {
      class: { 'flix-sidebar': true }
    }, [
      h('p', 'Hello world'),
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
            on: {
              input: e => onInput(e),
              keyup: e => onKeyUp(e)
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
              click: () => send()
            }
          }, 'Send')
        ])
      ])
    ])
  }
});
