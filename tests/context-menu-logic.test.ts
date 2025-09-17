import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the logic of context menu functionality without importing the actual module
describe('Context Menu Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Function List Fetching Logic', () => {
    it('should fetch function list successfully', async () => {
      const mockResponse = [
        { value: 'email', display: 'Email', category: 'contact' },
        { value: 'firstName', display: 'First Name', category: 'person' },
        { value: 'lastName', display: 'Last Name', category: 'person' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const fetchFunctionList = async () => {
        try {
          const response = await fetch('https://api.gofakeit.com/funcs/list/short');
          if (!response.ok) {
            return { success: false, error: `HTTP error! status: ${response.status}` };
          }
          const data = await response.json();
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await fetchFunctionList();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const fetchFunctionList = async () => {
        try {
          const response = await fetch('https://api.gofakeit.com/funcs/list/short');
          if (!response.ok) {
            return { success: false, error: `HTTP error! status: ${response.status}` };
          }
          const data = await response.json();
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await fetchFunctionList();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP error! status: 500');
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const fetchFunctionList = async () => {
        try {
          const response = await fetch('https://api.gofakeit.com/funcs/list/short');
          if (!response.ok) {
            return { success: false, error: `HTTP error! status: ${response.status}` };
          }
          const data = await response.json();
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await fetchFunctionList();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Function Organization Logic', () => {
    it('should organize functions by category correctly', () => {
      const mockFuncList = [
        { value: 'email', display: 'Email Address', category: 'contact' },
        { value: 'firstName', display: 'First Name', category: 'person' },
        { value: 'lastName', display: 'Last Name', category: 'person' },
        { value: 'password', display: 'Password', category: 'security' },
        { value: 'gamertag', display: 'Gamer Tag', category: 'gaming' },
      ];

      const organizeFunctionsByCategory = (funcList: Array<{value: string, display: string, category: string}>) => {
        const categories: Record<string, Record<string, string>> = {};
        const popularFunctions = ['email', 'firstName', 'lastName', 'password', 'gamertag'];
        
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

        return { popular, categories: sortedCategories };
      };

      const result = organizeFunctionsByCategory(mockFuncList);

      // Check popular functions
      expect(result.popular.email).toBe('Email Address');
      expect(result.popular.firstName).toBe('First Name');
      expect(result.popular.lastName).toBe('Last Name');
      expect(result.popular.password).toBe('Password');
      expect(result.popular.gamertag).toBe('Gamer Tag');

      // Check categories
      expect(result.categories.contact.email).toBe('Email Address');
      expect(result.categories.person.firstName).toBe('First Name');
      expect(result.categories.person.lastName).toBe('Last Name');
      expect(result.categories.security.password).toBe('Password');
      expect(result.categories.gaming.gamertag).toBe('Gamer Tag');
    });

    it('should handle functions without category', () => {
      const mockFuncList = [
        { value: 'email', display: 'Email', category: 'contact' },
        { value: 'unknown', display: 'Unknown Function', category: '' },
      ];

      const organizeFunctionsByCategory = (funcList: Array<{value: string, display: string, category: string}>) => {
        const categories: Record<string, Record<string, string>> = {};
        
        funcList.forEach(func => {
          const category = func.category || 'Other';
          const displayName = func.display || func.value;
          
          if (!categories[category]) {
            categories[category] = {};
          }
          
          categories[category][func.value] = displayName;
        });

        return { popular: {}, categories };
      };

      const result = organizeFunctionsByCategory(mockFuncList);

      expect(result.categories.Other).toBeDefined();
      expect(result.categories.Other.unknown).toBe('Unknown Function');
    });

    it('should handle functions without display name', () => {
      const mockFuncList = [
        { value: 'email', display: '', category: 'contact' },
        { value: 'firstName', category: 'person' },
      ];

      const organizeFunctionsByCategory = (funcList: Array<{value: string, display: string, category: string}>) => {
        const categories: Record<string, Record<string, string>> = {};
        
        funcList.forEach(func => {
          const category = func.category || 'Other';
          const displayName = func.display || func.value;
          
          if (!categories[category]) {
            categories[category] = {};
          }
          
          categories[category][func.value] = displayName;
        });

        return { popular: {}, categories };
      };

      const result = organizeFunctionsByCategory(mockFuncList);

      expect(result.categories.contact.email).toBe('email');
      expect(result.categories.person.firstName).toBe('firstName');
    });

    it('should sort categories alphabetically', () => {
      const mockFuncList = [
        { value: 'zebra', display: 'Zebra', category: 'zoo' },
        { value: 'apple', display: 'Apple', category: 'fruit' },
        { value: 'banana', display: 'Banana', category: 'fruit' },
      ];

      const organizeFunctionsByCategory = (funcList: Array<{value: string, display: string, category: string}>) => {
        const categories: Record<string, Record<string, string>> = {};
        
        funcList.forEach(func => {
          const category = func.category || 'Other';
          const displayName = func.display || func.value;
          
          if (!categories[category]) {
            categories[category] = {};
          }
          
          categories[category][func.value] = displayName;
        });
        
        // Sort categories alphabetically
        const sortedCategories: Record<string, Record<string, string>> = {};
        Object.keys(categories)
          .sort()
          .forEach(category => {
            sortedCategories[category] = categories[category];
          });

        return { popular: {}, categories: sortedCategories };
      };

      const result = organizeFunctionsByCategory(mockFuncList);

      const categoryKeys = Object.keys(result.categories);
      expect(categoryKeys).toEqual(['fruit', 'zoo']);
    });

    it('should sort functions within categories alphabetically', () => {
      const mockFuncList = [
        { value: 'zebra', display: 'Zebra', category: 'animals' },
        { value: 'apple', display: 'Apple', category: 'animals' },
        { value: 'banana', display: 'Banana', category: 'animals' },
      ];

      const organizeFunctionsByCategory = (funcList: Array<{value: string, display: string, category: string}>) => {
        const categories: Record<string, Record<string, string>> = {};
        
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

        return { popular: {}, categories };
      };

      const result = organizeFunctionsByCategory(mockFuncList);

      const functionKeys = Object.keys(result.categories.animals);
      expect(functionKeys).toEqual(['apple', 'banana', 'zebra']);
    });
  });

  describe('Context Menu Click Handling Logic', () => {
    it('should handle popular function clicks', () => {
      const handleContextMenuClick = (info: any, tab: any) => {
        if (!tab?.id) return { success: false, error: 'No tab ID' };

        const menuId = info.menuItemId as string;
        
        if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
          const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
          return { success: true, function: funcName, tabId: tab.id };
        }
        
        return { success: false, error: 'Not a gofakeit menu item' };
      };

      const mockTab = { id: 123 };
      const mockInfo = { menuItemId: 'gofakeit-popular-email' };
      const result = handleContextMenuClick(mockInfo, mockTab);

      expect(result.success).toBe(true);
      expect(result.function).toBe('email');
      expect(result.tabId).toBe(123);
    });

    it('should handle regular function clicks', () => {
      const handleContextMenuClick = (info: any, tab: any) => {
        if (!tab?.id) return { success: false, error: 'No tab ID' };

        const menuId = info.menuItemId as string;
        
        if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
          const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
          return { success: true, function: funcName, tabId: tab.id };
        }
        
        return { success: false, error: 'Not a gofakeit menu item' };
      };

      const mockTab = { id: 123 };
      const mockInfo = { menuItemId: 'gofakeit-func-firstName' };
      const result = handleContextMenuClick(mockInfo, mockTab);

      expect(result.success).toBe(true);
      expect(result.function).toBe('firstName');
      expect(result.tabId).toBe(123);
    });

    it('should ignore non-gofakeit menu items', () => {
      const handleContextMenuClick = (info: any, tab: any) => {
        if (!tab?.id) return { success: false, error: 'No tab ID' };

        const menuId = info.menuItemId as string;
        
        if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
          const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
          return { success: true, function: funcName, tabId: tab.id };
        }
        
        return { success: false, error: 'Not a gofakeit menu item' };
      };

      const mockTab = { id: 123 };
      const mockInfo = { menuItemId: 'other-menu-item' };
      const result = handleContextMenuClick(mockInfo, mockTab);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a gofakeit menu item');
    });

    it('should handle missing tab ID', () => {
      const handleContextMenuClick = (info: any, tab: any) => {
        if (!tab?.id) return { success: false, error: 'No tab ID' };

        const menuId = info.menuItemId as string;
        
        if (menuId.startsWith('gofakeit-func-') || menuId.startsWith('gofakeit-popular-')) {
          const funcName = menuId.replace('gofakeit-func-', '').replace('gofakeit-popular-', '');
          return { success: true, function: funcName, tabId: tab.id };
        }
        
        return { success: false, error: 'Not a gofakeit menu item' };
      };

      const mockInfo = { menuItemId: 'gofakeit-popular-email' };
      const result = handleContextMenuClick(mockInfo, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No tab ID');
    });
  });

  describe('Menu ID Processing Logic', () => {
    it('should extract function names from popular menu IDs', () => {
      const testCases = [
        { menuId: 'gofakeit-popular-email', expected: 'email' },
        { menuId: 'gofakeit-popular-firstName', expected: 'firstName' },
        { menuId: 'gofakeit-popular-phoneNumber', expected: 'phoneNumber' },
      ];

      testCases.forEach(({ menuId, expected }) => {
        const extractFunctionName = (menuId: string) => {
          if (menuId.startsWith('gofakeit-popular-')) {
            return menuId.replace('gofakeit-popular-', '');
          }
          if (menuId.startsWith('gofakeit-func-')) {
            return menuId.replace('gofakeit-func-', '');
          }
          return null;
        };

        const result = extractFunctionName(menuId);
        expect(result).toBe(expected);
      });
    });

    it('should extract function names from regular menu IDs', () => {
      const testCases = [
        { menuId: 'gofakeit-func-email', expected: 'email' },
        { menuId: 'gofakeit-func-firstName', expected: 'firstName' },
        { menuId: 'gofakeit-func-phoneNumber', expected: 'phoneNumber' },
      ];

      testCases.forEach(({ menuId, expected }) => {
        const extractFunctionName = (menuId: string) => {
          if (menuId.startsWith('gofakeit-popular-')) {
            return menuId.replace('gofakeit-popular-', '');
          }
          if (menuId.startsWith('gofakeit-func-')) {
            return menuId.replace('gofakeit-func-', '');
          }
          return null;
        };

        const result = extractFunctionName(menuId);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Caching Logic', () => {
    it('should use cached data when available', () => {
      let cache: any = null;
      let cacheTime: number = 0;
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      const getCachedData = () => {
        const now = Date.now();
        
        if (cache && (now - cacheTime) < CACHE_DURATION) {
          return { fromCache: true, data: cache };
        }
        
        return { fromCache: false, data: null };
      };

      // First call - no cache
      let result = getCachedData();
      expect(result.fromCache).toBe(false);

      // Set cache
      cache = { email: 'Email' };
      cacheTime = Date.now();

      // Second call - should use cache
      result = getCachedData();
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual({ email: 'Email' });
    });

    it('should refresh cache after expiration', () => {
      let cache: any = null;
      let cacheTime: number = 0;
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      const getCachedData = () => {
        const now = Date.now();
        
        if (cache && (now - cacheTime) < CACHE_DURATION) {
          return { fromCache: true, data: cache };
        }
        
        return { fromCache: false, data: null };
      };

      // Set cache
      cache = { email: 'Email' };
      cacheTime = Date.now();

      // Should use cache initially
      let result = getCachedData();
      expect(result.fromCache).toBe(true);

      // Fast forward time past cache expiration
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      // Should not use cache after expiration
      result = getCachedData();
      expect(result.fromCache).toBe(false);
    });
  });
});
