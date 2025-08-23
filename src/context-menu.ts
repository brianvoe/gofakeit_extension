import { getFuncs, type Func } from 'gofakeit';

// Cache for the function list to avoid repeated API calls
let functionListCache: Func[] | null = null;
let functionListCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get functions organized by category from the API
export async function getFunctionsByCategory(): Promise<Record<string, Record<string, string>>> {
  const now = Date.now();
  
  // Use cached data if it's still valid
  if (functionListCache && (now - functionListCacheTime) < CACHE_DURATION) {
    return organizeFunctionsByCategory(functionListCache);
  }
  
  // Fetch fresh data from API
  try {
    const functions = await getFuncs();
    
    // Cache the data
    functionListCache = functions;
    functionListCacheTime = now;
    
    return organizeFunctionsByCategory(functions);
  } catch (error) {
    console.error('[Gofakeit] Failed to fetch function list:', error);
    // Return empty object if API fails
    return {};
  }
}

// Organize functions by category
function organizeFunctionsByCategory(funcList: Func[]): Record<string, Record<string, string>> {
  const categories: Record<string, Record<string, string>> = {};
  
  funcList.forEach((func) => {
    const category = func.category || 'Other';
    const displayName = func.display || func.value;
    
    if (!categories[category]) {
      categories[category] = {};
    }
    
    categories[category][func.value] = displayName;
  });
  
  return categories;
}

// Create context menu items
export async function createContextMenus(): Promise<void> {
  try {
    // Get functions from API
    const functionsByCategory = await getFunctionsByCategory();
    
    // Remove existing context menus
    chrome.contextMenus.removeAll(() => {
      // Create parent menu
      chrome.contextMenus.create({
        id: 'gofakeit-menu',
        title: 'Gofakeit',
        contexts: ['editable']
      });

      // Create category submenus
      Object.entries(functionsByCategory).forEach(([category, functions]) => {
        chrome.contextMenus.create({
          id: `gofakeit-${category.toLowerCase().replace(/\s+/g, '-')}`,
          title: category,
          parentId: 'gofakeit-menu',
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
export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): Promise<void> {
  if (!tab?.id) return;

  const menuId = info.menuItemId as string;
  
  // Check if this is a Gofakeit function menu item
  if (menuId.startsWith('gofakeit-func-')) {
    const funcName = menuId.replace('gofakeit-func-', '');
    
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
