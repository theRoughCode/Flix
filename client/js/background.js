// Open netflix on join request
function openRoom(showId) {
  chrome.tabs.create({ url: `https://www.netflix.com/watch/${showId}` }, tab => {
    chrome.storage.local.set({ 'flix-tabId': tab.id });
  });
}

// Listen to incoming messages from popup.html
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.message) {
    case 'openRoom':
      openRoom(request.params.showId);
      break;
  }
});
