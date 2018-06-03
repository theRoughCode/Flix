function sendCommand(command, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { command }, callback);
  });
}

function joinSession() {
  sendCommand('join', res => console.log(res));
}

function toggleChat() {
  sendCommand('toggleChat', res => console.log(res));
}


document.addEventListener('DOMContentLoaded', function() {
  joinSession();

  // const checkPageButton = document.getElementById('checkPage');
  // checkPageButton.addEventListener('click', function() {
  //   toggleChat();
  // }, false);

  const createRoomBtn = document.getElementById('create');
  const joinRoomBtn = document.getElementById('join');
  const createRoomSubmitBtn = document.getElementById('submit-create');
  const joinRoomSubmitBtn = document.getElementById('submit-join');
  createRoomBtn.addEventListener('click', function () {
    $(".form-container").show(100);
    $("#form-create").show();
    $("#form-join").hide();
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
    console.log(username);
    console.log(iconTheme);
  });
  joinRoomSubmitBtn.addEventListener('click', function() {
    const username = $("#username").val();
    if (!username) return;
    const room = $("#room").val();
    if (!room) return;
    console.log(username);
    console.log(room);
  });

}, false);
