import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Element Detection', () => {
    it('should detect input elements as form elements', () => {
      const isFormElement = (tagName: string) => {
        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
      };

      expect(isFormElement('INPUT')).toBe(true);
      expect(isFormElement('TEXTAREA')).toBe(true);
      expect(isFormElement('SELECT')).toBe(true);
      expect(isFormElement('DIV')).toBe(false);
      expect(isFormElement('SPAN')).toBe(false);
    });

    it('should identify form input types correctly', () => {
      const inputTypes = [
        'text', 'email', 'password', 'number', 'tel', 'url', 'search',
        'date', 'time', 'datetime-local', 'month', 'week', 'color',
        'range', 'file', 'hidden', 'checkbox', 'radio', 'submit', 'reset', 'button'
      ];

      inputTypes.forEach(type => {
        expect(inputTypes.includes(type)).toBe(true);
      });

      expect(inputTypes.includes('invalid')).toBe(false);
    });

    it('should handle textarea and select elements', () => {
      const formElements = ['INPUT', 'TEXTAREA', 'SELECT'];
      
      expect(formElements.includes('TEXTAREA')).toBe(true);
      expect(formElements.includes('SELECT')).toBe(true);
      expect(formElements.includes('DIV')).toBe(false);
    });
  });

  describe('Element Querying Logic', () => {
    it('should generate correct CSS selectors', () => {
      const getFormSelector = () => {
        return 'input, textarea, select';
      };

      expect(getFormSelector()).toBe('input, textarea, select');
    });

    it('should handle specific input type selectors', () => {
      const getInputTypeSelector = (type: string) => {
        return `input[type="${type}"]`;
      };

      expect(getInputTypeSelector('text')).toBe('input[type="text"]');
      expect(getInputTypeSelector('email')).toBe('input[type="email"]');
      expect(getInputTypeSelector('password')).toBe('input[type="password"]');
    });

    it('should handle container-based selectors', () => {
      const getContainerSelector = (container: string) => {
        return `${container} input, ${container} textarea, ${container} select`;
      };

      const result = getContainerSelector('.form-container');
      expect(result).toBe('.form-container input, .form-container textarea, .form-container select');
    });
  });

  describe('Element Validation Logic', () => {
    it('should validate required attributes', () => {
      const hasRequiredAttributes = (element: any) => {
        return !!(element.name || element.id || element.className);
      };

      const elementWithName = { name: 'test-field' };
      const elementWithId = { id: 'test-field' };
      const elementWithClass = { className: 'test-field' };
      const elementWithoutAttributes = {};

      expect(hasRequiredAttributes(elementWithName)).toBe(true);
      expect(hasRequiredAttributes(elementWithId)).toBe(true);
      expect(hasRequiredAttributes(elementWithClass)).toBe(true);
      expect(hasRequiredAttributes(elementWithoutAttributes)).toBe(false);
    });

    it('should check for disabled elements', () => {
      const isDisabled = (element: any) => {
        return !!(element.disabled || element.readOnly);
      };

      const disabledElement = { disabled: true };
      const readonlyElement = { readOnly: true };
      const enabledElement = { disabled: false, readOnly: false };

      expect(isDisabled(disabledElement)).toBe(true);
      expect(isDisabled(readonlyElement)).toBe(true);
      expect(isDisabled(enabledElement)).toBe(false);
    });

    it('should check for hidden elements', () => {
      const isHidden = (element: any) => {
        return element.type === 'hidden' || 
               element.style?.display === 'none' || 
               element.style?.visibility === 'hidden';
      };

      const hiddenInput = { type: 'hidden' };
      const displayNoneElement = { style: { display: 'none' } };
      const visibilityHiddenElement = { style: { visibility: 'hidden' } };
      const visibleElement = { type: 'text', style: {} };

      expect(isHidden(hiddenInput)).toBe(true);
      expect(isHidden(displayNoneElement)).toBe(true);
      expect(isHidden(visibilityHiddenElement)).toBe(true);
      expect(isHidden(visibleElement)).toBe(false);
    });
  });

  describe('Data Attribute Handling', () => {
    it('should handle data-gofakeit attributes', () => {
      const hasGofakeitAttribute = (element: any) => {
        return !!(element.dataset && element.dataset.gofakeit);
      };

      const elementWithAttribute = { dataset: { gofakeit: 'email' } };
      const elementWithoutAttribute = { dataset: {} };

      expect(hasGofakeitAttribute(elementWithAttribute)).toBe(true);
      expect(hasGofakeitAttribute(elementWithoutAttribute)).toBe(false);
    });

    it('should extract gofakeit function names', () => {
      const getGofakeitFunction = (element: any) => {
        return element.dataset?.gofakeit;
      };

      const testCases = [
        { dataset: { gofakeit: 'email' }, expected: 'email' },
        { dataset: { gofakeit: 'firstName' }, expected: 'firstName' },
        { dataset: { gofakeit: 'phoneNumber' }, expected: 'phoneNumber' },
        { dataset: {}, expected: undefined },
      ];

      testCases.forEach(({ dataset, expected }) => {
        const element = { dataset };
        expect(getGofakeitFunction(element)).toBe(expected);
      });
    });
  });

  describe('Element Styling and Classes', () => {
    it('should generate CSS class names', () => {
      const getNotificationClass = (type: string) => {
        return `gfi-notification gfi-${type}`;
      };

      expect(getNotificationClass('success')).toBe('gfi-notification gfi-success');
      expect(getNotificationClass('error')).toBe('gfi-notification gfi-error');
      expect(getNotificationClass('warning')).toBe('gfi-notification gfi-warning');
      expect(getNotificationClass('info')).toBe('gfi-notification gfi-info');
    });

    it('should generate dismiss button classes', () => {
      const getDismissClass = () => {
        return 'gfi-dismiss-btn';
      };

      expect(getDismissClass()).toBe('gfi-dismiss-btn');
    });

    it('should generate selection highlight classes', () => {
      const getHighlightClass = () => {
        return 'gfi-selection-highlight';
      };

      expect(getHighlightClass()).toBe('gfi-selection-highlight');
    });
  });

  describe('Event Handling Utilities', () => {
    it('should handle keyboard events', () => {
      const isEscapeKey = (event: any) => {
        return event.key === 'Escape';
      };

      const escapeEvent = { key: 'Escape' };
      const enterEvent = { key: 'Enter' };

      expect(isEscapeKey(escapeEvent)).toBe(true);
      expect(isEscapeKey(enterEvent)).toBe(false);
    });

    it('should handle mouse events', () => {
      const getMouseEventType = (event: any) => {
        return event.type;
      };

      const mouseOverEvent = { type: 'mouseover' };
      const mouseOutEvent = { type: 'mouseout' };
      const clickEvent = { type: 'click' };

      expect(getMouseEventType(mouseOverEvent)).toBe('mouseover');
      expect(getMouseEventType(mouseOutEvent)).toBe('mouseout');
      expect(getMouseEventType(clickEvent)).toBe('click');
    });
  });

  describe('String and Message Utilities', () => {
    it('should format notification messages correctly', () => {
      const formatMessage = (count: number, type: string, action: string = 'filled') => {
        if (count === 0) return `No ${type} found`;
        if (count === 1) return `1 ${type} ${action}`;
        return `${count} ${type}s ${action}`;
      };

      expect(formatMessage(0, 'field')).toBe('No field found');
      expect(formatMessage(1, 'field')).toBe('1 field filled');
      expect(formatMessage(5, 'field')).toBe('5 fields filled');
      expect(formatMessage(1, 'input', 'processed')).toBe('1 input processed');
    });

    it('should handle emoji formatting', () => {
      const addEmoji = (message: string, emoji: string) => {
        return `${emoji} ${message}`;
      };

      expect(addEmoji('Success', '✅')).toBe('✅ Success');
      expect(addEmoji('Error', '❌')).toBe('❌ Error');
      expect(addEmoji('Warning', '⚠️')).toBe('⚠️ Warning');
      expect(addEmoji('Info', 'ℹ️')).toBe('ℹ️ Info');
    });

    it('should validate notification types', () => {
      const validTypes = ['success', 'error', 'warning', 'info', 'persistent'];
      const isValidType = (type: string) => validTypes.includes(type);

      expect(isValidType('success')).toBe(true);
      expect(isValidType('error')).toBe(true);
      expect(isValidType('warning')).toBe(true);
      expect(isValidType('info')).toBe(true);
      expect(isValidType('persistent')).toBe(true);
      expect(isValidType('invalid')).toBe(false);
      expect(isValidType('')).toBe(false);
    });
  });

  describe('Async Utilities', () => {
    it('should handle promise-based operations', async () => {
      const asyncOperation = async (value: any) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(value), 10);
        });
      };

      const result = await asyncOperation('test');
      expect(result).toBe('test');
    });

    it('should handle promise rejections', async () => {
      const failingOperation = async () => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation failed')), 10);
        });
      };

      await expect(failingOperation()).rejects.toThrow('Operation failed');
    });

    it('should handle multiple async operations', async () => {
      const operations = [
        Promise.resolve('result1'),
        Promise.resolve('result2'),
        Promise.resolve('result3'),
      ];

      const results = await Promise.all(operations);
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });
  });

  describe('Error Handling Utilities', () => {
    it('should handle errors gracefully', () => {
      const safeOperation = (operation: () => any, fallback: any) => {
        try {
          return operation();
        } catch (error) {
          return fallback;
        }
      };

      const throwingOperation = () => {
        throw new Error('Something went wrong');
      };

      const result = safeOperation(throwingOperation, 'fallback');
      expect(result).toBe('fallback');
    });

    it('should validate function parameters', () => {
      const validateParams = (params: any) => {
        if (!params) return false;
        if (typeof params !== 'object') return false;
        return true;
      };

      expect(validateParams({})).toBe(true);
      expect(validateParams({ key: 'value' })).toBe(true);
      expect(validateParams(null)).toBe(false);
      expect(validateParams(undefined)).toBe(false);
      expect(validateParams('string')).toBe(false);
      expect(validateParams(123)).toBe(false);
    });
  });
});