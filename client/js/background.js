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
    case 'getTabId':
      sendResponse({ tabId: sender.tab.id });
      break;
    case 'resetStorage':
      resetStorage();
      break;
    default:
      console.log(request);
  }
});

// Listen to tab close
chrome.tabs.onRemoved.addListener(function(tabId, info) {
  chrome.storage.local.get('flix-tabId', result => {
    if (result['flix-tabId'] === tabId) resetStorage();
  });
});

function resetStorage() {
  chrome.storage.local.remove([
    'flix-tabId',
    'flix-username',
    'flix-roomId',
    'flix-toggle',
    'flix-state'
  ]);
}
