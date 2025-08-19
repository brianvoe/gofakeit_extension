// Self-contained background script for Chrome extension
// No imports to avoid module issues

// Cache for the function list to avoid repeated API calls
let functionListCache: any = null;
let functionListCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch the complete list of available functions from the API
async function fetchFunctionList(): Promise<any> {
  try {
    const response = await fetch('https://api.gofakeit.com/funcs/list');
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error! status: ${response.status}`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('[Gofakeit] Error fetching function list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get functions organized by category from the API
async function getFunctionsByCategory(): Promise<{ popular: Record<string, string>, categories: Record<string, Record<string, string>> }> {
  const now = Date.now();
  
  // Use cached data if it's still valid
  if (functionListCache && (now - functionListCacheTime) < CACHE_DURATION) {
    return organizeFunctionsByCategory(functionListCache);
  }
  
  // Fetch fresh data from API
  const response = await fetchFunctionList();
  
  if (!response.success || !response.data) {
    console.error('[Gofakeit] Failed to fetch function list:', response.error);
    // Return empty objects if API fails
    return { popular: {}, categories: {} };
  }
  
  // Cache the data
  functionListCache = response.data;
  functionListCacheTime = now;
  
  return organizeFunctionsByCategory(response.data);
}

// Organize functions by category with popular functions
function organizeFunctionsByCategory(funcList: any): { popular: Record<string, string>, categories: Record<string, Record<string, string>> } {
  const categories: Record<string, Record<string, string>> = {};
  
  // Define popular functions that should appear first
  const popularFunctions = ['email', 'firstname', 'lastname', 'password', 'gamertag'];
  
  Object.entries(funcList).forEach(([funcName, funcInfo]: [string, any]) => {
    const category = funcInfo.category || 'Other';
    const displayName = funcInfo.display || funcName;
    
    if (!categories[category]) {
      categories[category] = {};
    }
    
    categories[category][funcName] = displayName;
  });
  
  // Sort functions alphabetically within each category
  Object.keys(categories).forEach(category => {
    const sortedFunctions: Record<string, string> = {};
    Object.keys(categories[category])
      .sort()
      .forEach(funcName => {
        sortedFunctions[funcName] = categories[category][funcName];
      });
    categories[category] = sortedFunctions;
  });
  
  // Sort categories alphabetically
  const sortedCategories: Record<string, Record<string, string>> = {};
  Object.keys(categories)
    .sort()
    .forEach(category => {
      sortedCategories[category] = categories[category];
    });
  
  // Create popular functions object
  const popular: Record<string, string> = {};
  popularFunctions.forEach(funcName => {
    if (funcList[funcName]) {
      popular[funcName] = funcList[funcName].display || funcName;
    }
  });

  return {
    popular,
    categories: sortedCategories
  };
}

// Create context menu items
async function createContextMenus(): Promise<void> {
  try {
    // Get functions from API
    const { popular, categories } = await getFunctionsByCategory();
    
    // Remove existing context menus
    chrome.contextMenus.removeAll(() => {
      // Create parent menu
      chrome.contextMenus.create({
        id: 'gofakeit-menu',
        title: 'Gofakeit',
        contexts: ['editable']
      });

      // Create "Popular Functions" header
      chrome.contextMenus.create({
        id: 'gofakeit-popular-header',
        title: 'Popular Functions',
        parentId: 'gofakeit-menu',
        contexts: ['editable'],
        enabled: false
      });

      // Create popular functions directly in the main menu
      Object.entries(popular).forEach(([funcName, displayName]) => {
        chrome.contextMenus.create({
          id: `gofakeit-popular-${funcName}`,
          title: displayName,
          parentId: 'gofakeit-menu',
          contexts: ['editable']
        });
      });

      // Create "Full List" submenu
      chrome.contextMenus.create({
        id: 'gofakeit-full-list',
        title: 'Full List',
        parentId: 'gofakeit-menu',
        contexts: ['editable']
      });

      // Create category submenus under "Full List"
      Object.entries(categories).forEach(([category, functions]) => {
        // Skip empty categories
        if (Object.keys(functions).length === 0) return;
        
        chrome.contextMenus.create({
          id: `gofakeit-${category.toLowerCase().replace(/\s+/g, '-')}`,
          title: category,
          parentId: 'gofakeit-full-list',
          contexts: ['editable']
        });

        // Create function items under each category
        Object.entries(functions).forEach(([funcName, displayName]) => {
          chrome.contextMenus.create({
            id: `gofakeit-func-${funcName}`,
            title: displayName,
            parentId: `gofakeit-${category.toLowerCase().replace(/\s+/g, '-')}`,
            contexts: ['editable']
          });
        });
      });
    });
  } catch (error) {
    console.error('[Gofakeit] Error creating context menus:', error);
  }
}

// Handle context menu clicks
async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.id) return;

  const menuId = info.menuItemId as string;
  
  // Check if this is a Gofakeit function menu item (either popular or regular)
  if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
    const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
    
    try {
      // First, try to inject the content script if it's not already loaded
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send message to content script to apply the function to the clicked element
      await chrome.tabs.sendMessage(tab.id, {
        command: 'context-menu',
        function: funcName
      });
      
    } catch (error) {
      console.error('[Gofakeit] Error sending context menu command:', error);
    }
  }
}

// Initialize context menus when extension loads
// Use chrome.runtime.onStartup and chrome.runtime.onInstalled for proper initialization
chrome.runtime.onStartup.addListener(() => {
  createContextMenus().catch(error => {
    console.error('[Gofakeit] Error initializing context menus:', error);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  createContextMenus().catch(error => {
    console.error('[Gofakeit] Error initializing context menus:', error);
  });
});

// Check if content script is already injected
export async function isContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, { command: 'ping' });
    return true;
  } catch {
    return false;
  }
}

// Inject content script if not already injected
export async function injectContentScriptIfNeeded(tabId: number): Promise<void> {
  const isInjected = await isContentScriptInjected(tabId);
  if (!isInjected) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }
}

// Runs when the user clicks the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await injectContentScriptIfNeeded(tab.id);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'trigger-autofill') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      await injectContentScriptIfNeeded(tab.id);
    }
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
