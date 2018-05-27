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

  const checkPageButton = document.getElementById('checkPage');
  checkPageButton.addEventListener('click', function() {
    toggleChat();
  }, false);

}, false);
