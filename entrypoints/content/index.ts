import { Notification } from './notifications';
import { MessageHandler } from './message-handler';
import './styles.css';

// Initialize single notification instance and export it
export const notification = new Notification();

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    // Initialize message handler with notification service and context
    const messageHandler = new MessageHandler(notification, ctx);

    // Set up message listener with context cleanup
    const messageListener = (msg: any, sender: any, sendResponse: any) => {
      messageHandler.handleMessage(msg, sender, sendResponse);
      return true; // Keep message channel open for async response
    };
    
    browser.runtime.onMessage.addListener(messageListener);
    
    // Clean up listener when context is invalidated
    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(messageListener);
    });
  }
});
