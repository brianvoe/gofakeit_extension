import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AutofillService,
  DEFAULT_AUTOFILL_SETTINGS,
} from '../entrypoints/content/autofill-service';

// These tests import and exercise the real service instead of re-implementing
// its logic, so behavior changes are actually caught.

const show = vi.fn();

function makeService(): AutofillService {
  const notification = { show } as any;
  return new AutofillService(notification);
}

function stubStorage(values: Record<string, unknown> = {}) {
  (globalThis as any).storage = {
    getItem: vi.fn(async (key: string) => values[key] ?? null),
  };
}

describe('AutofillService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubStorage();
  });

  describe('getSettings', () => {
    it('falls back to defaults when storage is empty', async () => {
      const settings = await makeService().getSettings();

      expect(settings.mode).toBe(DEFAULT_AUTOFILL_SETTINGS.mode);
      expect(settings.stagger).toBe(DEFAULT_AUTOFILL_SETTINGS.stagger);
      expect(settings.badges).toBe(DEFAULT_AUTOFILL_SETTINGS.badges);
      expect(settings.debug).toBe(DEFAULT_AUTOFILL_SETTINGS.debug);
      expect(typeof settings.onStatusChange).toBe('function');
    });

    it('maps stored values through to the gofakeit settings', async () => {
      stubStorage({
        'sync:gofakeitMode': 'manual',
        'sync:gofakeitStagger': 100,
        'sync:gofakeitBadges': 5000,
        'sync:gofakeitDebug': true,
      });

      const settings = await makeService().getSettings();

      expect(settings.mode).toBe('manual');
      expect(settings.stagger).toBe(100);
      expect(settings.badges).toBe(5000);
      expect(settings.debug).toBe(true);
    });
  });

  describe('showAutofillResults', () => {
    it('reports an error when no fields were found', () => {
      makeService().showAutofillResults([], 'form field');

      expect(show).toHaveBeenCalledWith('error', 'No fillable form field found');
    });

    it('reports success when every field filled', () => {
      makeService().showAutofillResults(
        [{ value: 'a' }, { value: 'b' }] as any,
        'form field'
      );

      expect(show).toHaveBeenCalledWith(
        'success',
        '✅ Successfully filled 2 form fields!'
      );
    });

    it('reports a warning on partial success', () => {
      makeService().showAutofillResults(
        [{ value: 'a' }, { value: '', error: 'boom' }] as any,
        'form field'
      );

      expect(show).toHaveBeenCalledWith(
        'warning',
        '⚠️ Filled 1 form field, 1 failed'
      );
    });

    it('reports an error when every field failed', () => {
      makeService().showAutofillResults(
        [{ value: '', error: 'boom' }, { value: '', error: 'boom' }] as any,
        'form field'
      );

      expect(show).toHaveBeenCalledWith('error', '❌ Failed to fill 2 form fields');
    });
  });

  describe('onFunctionDetermined', () => {
    it('logs the resolved function when debug is enabled', async () => {
      stubStorage({ 'sync:gofakeitDebug': true });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const settings = await makeService().getSettings();
      settings.onFunctionDetermined?.(
        { name: 'email', id: '1', function: 'email', resolvedBy: 'type' } as any,
        undefined
      );

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('stays quiet when debug is disabled', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const settings = await makeService().getSettings();
      settings.onFunctionDetermined?.(
        { name: 'email', id: '1', function: 'email' } as any,
        undefined
      );

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
