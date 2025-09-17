import { browser } from 'wxt/browser';

// Cache for the function list to avoid repeated API calls
let functionListCache: any = null;
let functionListCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fetch the complete list of available functions from the API
async function fetchFunctionList(): Promise<any> {
  try {
    const response = await fetch('https://api.gofakeit.com/funcs/list/short');
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
export async function getFunctionsByCategory(): Promise<{ popular: Record<string, string>, categories: Record<string, Record<string, string>> }> {
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
function organizeFunctionsByCategory(funcList: Array<{value: string, display: string, category: string}>): { popular: Record<string, string>, categories: Record<string, Record<string, string>> } {
  const categories: Record<string, Record<string, string>> = {};
  
  // Define popular functions that should appear first
  const popularFunctions = ['email', 'firstname', 'lastname', 'password', 'gamertag'];
  
  funcList.forEach(func => {
    const category = func.category || 'Other';
    const displayName = func.display || func.value;
    
    if (!categories[category]) {
      categories[category] = {};
    }
    
    categories[category][func.value] = displayName;
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
    const func = funcList.find(f => f.value === funcName);
    if (func) {
      popular[funcName] = func.display || funcName;
    }
  });

  return {
    popular,
    categories: sortedCategories
  };
}

// Create context menu items
export async function createContextMenus(): Promise<void> {
  try {
    // Get functions from API
    const { popular, categories } = await getFunctionsByCategory();
    
    // Remove existing context menus
    browser.contextMenus.removeAll(() => {
      // Create parent menu
      browser.contextMenus.create({
        id: 'gofakeit-menu',
        title: 'Gofakeit',
        contexts: ['editable']
      });

      // Create "Popular Functions" header
      browser.contextMenus.create({
        id: 'gofakeit-popular-header',
        title: 'Popular Functions',
        parentId: 'gofakeit-menu',
        contexts: ['editable'],
        enabled: false
      });

      // Create popular functions directly in the main menu
      Object.entries(popular).forEach(([funcName, displayName]) => {
        browser.contextMenus.create({
          id: `gofakeit-popular-${funcName}`,
          title: displayName,
          parentId: 'gofakeit-menu',
          contexts: ['editable']
        });
      });

      // Create "Full List" submenu
      browser.contextMenus.create({
        id: 'gofakeit-full-list',
        title: 'Full List',
        parentId: 'gofakeit-menu',
        contexts: ['editable']
      });

      // Create category submenus under "Full List"
      Object.entries(categories).forEach(([category, functions]) => {
        // Skip empty categories
        if (Object.keys(functions).length === 0) return;
        
        browser.contextMenus.create({
          id: `gofakeit-${category.toLowerCase().replace(/\s+/g, '-')}`,
          title: category,
          parentId: 'gofakeit-full-list',
          contexts: ['editable']
        });

        // Create function items under each category
        Object.entries(functions).forEach(([funcName, displayName]) => {
          browser.contextMenus.create({
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
export async function handleContextMenuClick(info: any, tab?: any): Promise<void> {
  if (!tab?.id) return;

  const menuId = info.menuItemId as string;
  
  // Check if this is a Gofakeit function menu item (either popular or regular)
  if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
    const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
    
    try {
      // Send message to content script to apply the function to the clicked element
      // WXT automatically handles content script injection
      await browser.tabs.sendMessage(tab.id, {
        command: 'context-menu',
        function: funcName
      });
      
    } catch (error) {
      console.error('[Gofakeit] Error sending context menu command:', error);
    }
  }
}
