// Runs when the user clicks the extension icon
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'] // this must match the output from Vite
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger-autofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      }
    });
  }
});
