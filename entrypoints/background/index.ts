import { browser } from 'wxt/browser';
import { createContextMenus, handleContextMenuClick } from './context-menu';

export default defineBackground(() => {
  // Initialize context menus when extension loads
  browser.runtime.onStartup.addListener(() => {
    createContextMenus().catch(error => {
      console.error('[Gofakeit] Error initializing context menus:', error);
    });
  });

  browser.runtime.onInstalled.addListener(() => {
    createContextMenus().catch(error => {
      console.error('[Gofakeit] Error initializing context menus:', error);
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);
});
