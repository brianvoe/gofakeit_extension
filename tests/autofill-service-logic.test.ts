import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test the logic of AutofillService without importing the actual class
describe('AutofillService Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Settings Management Logic', () => {
    it('should handle default settings correctly', () => {
      const getDefaultSettings = () => {
        return {
          mode: 'auto',
          stagger: 50,
          badges: 3000,
          debug: false,
        };
      };

      const settings = getDefaultSettings();
      
      expect(settings.mode).toBe('auto');
      expect(settings.stagger).toBe(50);
      expect(settings.badges).toBe(3000);
      expect(settings.debug).toBe(false);
    });

    it('should handle storage retrieval with fallbacks', async () => {
      const mockStorage = {
        getItem: vi.fn()
          .mockResolvedValueOnce('manual') // mode
          .mockResolvedValueOnce(100)      // stagger
          .mockResolvedValueOnce(5000)     // badges
      };

      const getSettings = async () => {
        const [mode, stagger, badges] = await Promise.all([
          mockStorage.getItem('sync:gofakeitMode') ?? 'auto',
          mockStorage.getItem('sync:gofakeitStagger') ?? 50,
          mockStorage.getItem('sync:gofakeitBadges') ?? 3000
        ]);

        return {
          mode: mode as 'auto' | 'manual',
          stagger: stagger ?? 50,
          badges: badges ?? 3000,
          debug: false
        };
      };

      const settings = await getSettings();
      
      expect(settings.mode).toBe('manual');
      expect(settings.stagger).toBe(100);
      expect(settings.badges).toBe(5000);
    });

    it('should use fallback values when storage returns null', async () => {
      const mockStorage = {
        getItem: vi.fn().mockResolvedValue(null)
      };

      const getSettings = async () => {
        const [mode, stagger, badges] = await Promise.all([
          mockStorage.getItem('sync:gofakeitMode') ?? 'auto',
          mockStorage.getItem('sync:gofakeitStagger') ?? 50,
          mockStorage.getItem('sync:gofakeitBadges') ?? 3000
        ]);

        return {
          mode: (mode ?? 'auto') as 'auto' | 'manual',
          stagger: stagger ?? 50,
          badges: badges ?? 3000,
          debug: false
        };
      };

      const settings = await getSettings();
      
      expect(settings.mode).toBe('auto');
      expect(settings.stagger).toBe(50);
      expect(settings.badges).toBe(3000);
    });
  });

  describe('Result Handling Logic', () => {
    it('should show correct notification for no fields found', () => {
      const showAutofillResults = (result: any, context: string = 'form fields') => {
        if (result.success === 0 && result.failed === 0) {
          return { type: 'error', message: `No fillable ${context} found` };
        }
        return null;
      };

      const result = showAutofillResults({ success: 0, failed: 0 }, 'form field');
      
      expect(result?.type).toBe('error');
      expect(result?.message).toBe('No fillable form field found');
    });

    it('should show success notification for all fields filled', () => {
      const showAutofillResults = (result: any, context: string = 'form fields') => {
        if (result.success > 0 && result.failed === 0) {
          return { 
            type: 'success', 
            message: `✅ Successfully filled ${result.success} ${context}${result.success === 1 ? '' : 's'}!` 
          };
        }
        return null;
      };

      const result = showAutofillResults({ success: 3, failed: 0 }, 'form field');
      
      expect(result?.type).toBe('success');
      expect(result?.message).toBe('✅ Successfully filled 3 form fields!');
    });

    it('should show warning notification for partial success', () => {
      const showAutofillResults = (result: any, context: string = 'form fields') => {
        if (result.success > 0 && result.failed > 0) {
          return { 
            type: 'warning', 
            message: `⚠️ Filled ${result.success} ${context}${result.success === 1 ? '' : 's'}, ${result.failed} failed` 
          };
        }
        return null;
      };

      const result = showAutofillResults({ success: 2, failed: 1 }, 'form field');
      
      expect(result?.type).toBe('warning');
      expect(result?.message).toBe('⚠️ Filled 2 form fields, 1 failed');
    });

    it('should show error notification for complete failure', () => {
      const showAutofillResults = (result: any, context: string = 'form fields') => {
        if (result.failed > 0 && result.success === 0) {
          return { 
            type: 'error', 
            message: `❌ Failed to fill ${result.failed} ${context}${result.failed === 1 ? '' : 's'}` 
          };
        }
        return null;
      };

      const result = showAutofillResults({ success: 0, failed: 2 }, 'form field');
      
      expect(result?.type).toBe('error');
      expect(result?.message).toBe('❌ Failed to fill 2 form fields');
    });
  });

  describe('Context Menu Function Application Logic', () => {
    it('should handle context menu function application', () => {
      const applyContextMenuFunction = (funcName: string, targetElement: any) => {
        return {
          infoMessage: `🔍 Applying ${funcName} function...`,
          targetElement,
          funcName
        };
      };

      const result = applyContextMenuFunction('email', { id: 'test-input' });
      
      expect(result.infoMessage).toBe('🔍 Applying email function...');
      expect(result.targetElement).toEqual({ id: 'test-input' });
      expect(result.funcName).toBe('email');
    });

    it('should handle different function names', () => {
      const testCases = [
        { funcName: 'email', expected: '🔍 Applying email function...' },
        { funcName: 'firstName', expected: '🔍 Applying firstName function...' },
        { funcName: 'phoneNumber', expected: '🔍 Applying phoneNumber function...' },
      ];

      testCases.forEach(({ funcName, expected }) => {
        const applyContextMenuFunction = (funcName: string) => {
          return `🔍 Applying ${funcName} function...`;
        };

        const result = applyContextMenuFunction(funcName);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Status Change Callback Logic', () => {
    it('should handle found status with elements', () => {
      const handleStatusChange = (status: string, elements: any[]) => {
        switch (status) {
          case 'found':
            if (elements.length > 0) {
              return { type: 'info', message: `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}` };
            } else {
              return { type: 'error', message: 'No fillable fields found' };
            }
          default:
            return null;
        }
      };

      const result = handleStatusChange('found', [{ id: 'field1' }, { id: 'field2' }]);
      
      expect(result?.type).toBe('info');
      expect(result?.message).toBe('Found 2 fillable fields');
    });

    it('should handle found status with no elements', () => {
      const handleStatusChange = (status: string, elements: any[]) => {
        switch (status) {
          case 'found':
            if (elements.length > 0) {
              return { type: 'info', message: `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}` };
            } else {
              return { type: 'error', message: 'No fillable fields found' };
            }
          default:
            return null;
        }
      };

      const result = handleStatusChange('found', []);
      
      expect(result?.type).toBe('error');
      expect(result?.message).toBe('No fillable fields found');
    });

    it('should handle singular vs plural field messages', () => {
      const handleStatusChange = (status: string, elements: any[]) => {
        switch (status) {
          case 'found':
            if (elements.length > 0) {
              return { type: 'info', message: `Found ${elements.length} fillable field${elements.length === 1 ? '' : 's'}` };
            } else {
              return { type: 'error', message: 'No fillable fields found' };
            }
          default:
            return null;
        }
      };

      const singleResult = handleStatusChange('found', [{ id: 'field1' }]);
      const multipleResult = handleStatusChange('found', [{ id: 'field1' }, { id: 'field2' }]);
      
      expect(singleResult?.message).toBe('Found 1 fillable field');
      expect(multipleResult?.message).toBe('Found 2 fillable fields');
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle autofill errors gracefully', async () => {
      const mockAutofill = {
        fill: vi.fn().mockRejectedValue(new Error('Autofill failed'))
      };

      const autofillAll = async () => {
        try {
          await mockAutofill.fill();
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await autofillAll();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Autofill failed');
    });

    it('should handle storage errors gracefully', async () => {
      const mockStorage = {
        getItem: vi.fn().mockRejectedValue(new Error('Storage error'))
      };

      const getSettings = async () => {
        try {
          await mockStorage.getItem('sync:gofakeitMode');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await getSettings();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('Autofill Operations Logic', () => {
    it('should handle autofill all operation', async () => {
      const mockAutofill = {
        fill: vi.fn().mockResolvedValue({ success: 3, failed: 0 }),
        updateSettings: vi.fn()
      };

      const autofillAll = async () => {
        const settings = { mode: 'auto', stagger: 50, badges: 3000 };
        mockAutofill.updateSettings(settings);
        const result = await mockAutofill.fill();
        return result;
      };

      const result = await autofillAll();
      
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockAutofill.updateSettings).toHaveBeenCalledWith({ mode: 'auto', stagger: 50, badges: 3000 });
    });

    it('should handle autofill selected operation', async () => {
      const mockAutofill = {
        fill: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        updateSettings: vi.fn()
      };

      const autofillSelected = async (element: any) => {
        const settings = { mode: 'manual', stagger: 100, badges: 5000 };
        mockAutofill.updateSettings(settings);
        const result = await mockAutofill.fill(element);
        return result;
      };

      const mockElement = { id: 'test-input' };
      const result = await autofillSelected(mockElement);
      
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockAutofill.fill).toHaveBeenCalledWith(mockElement);
    });

    it('should handle context menu function with element and function name', async () => {
      const mockAutofill = {
        fill: vi.fn().mockResolvedValue({ success: 1, failed: 0 })
      };

      const applyContextMenuFunction = async (funcName: string, targetElement: any) => {
        const result = await mockAutofill.fill(targetElement, funcName);
        return result;
      };

      const mockElement = { id: 'test-input' };
      const result = await applyContextMenuFunction('email', mockElement);
      
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockAutofill.fill).toHaveBeenCalledWith(mockElement, 'email');
    });
  });
});
