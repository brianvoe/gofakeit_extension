const sendCommand = async (command: string) => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      // First, ensure the content script is injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectionError) {
        // If injection fails (e.g., already injected), continue anyway
        console.log('Content script injection skipped (likely already injected)');
      }
      
      // Then send the message
      await chrome.tabs.sendMessage(tab.id, { command });
      
      // Close the popup for interactive commands
      if (command === 'autofill-selected') {
        window.close();
      }
    }
  } catch (error) {
    console.error('Error sending command:', error);
  }
};

document.getElementById('autofill-all')?.addEventListener('click', () => sendCommand('autofill-all'));
document.getElementById('autofill-selected')?.addEventListener('click', () => sendCommand('autofill-selected'));
