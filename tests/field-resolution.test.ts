import { describe, it, expect, beforeEach } from 'vitest';
import { Autofill } from 'gofakeit';

// Regression coverage for the reported bug: email fields were being filled with
// a full "Subject: ..." message because the fuzzy function search could resolve
// an <input type="email"> to `email_text`. These tests exercise the real
// library against a real DOM so a ranking regression fails loudly.
//
// See IMPROVEMENTS.md in the gofakeit_js repo for the upstream fix.

function resolveAll(): Autofill {
  const autofill = new Autofill({ mode: 'auto' });
  autofill.setElements();
  return autofill;
}

describe('field resolution', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('fills an email field with an email address, not an email message', async () => {
    document.body.innerHTML = `
      <label for="contact">Email body</label>
      <input id="contact" name="email" type="email" />
    `;

    const autofill = resolveAll();
    await autofill.setElementFunctions();
    await autofill.getElementValues();

    const [email] = autofill.state.elements;
    expect(email.function).toBe('email');
    expect(email.value).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(email.value).not.toContain('Subject:');
  });

  it('resolves email/tel/url/password deterministically', async () => {
    document.body.innerHTML = `
      <input name="email" type="email" />
      <input name="phone" type="tel" />
      <input name="site" type="url" />
      <input name="pw" type="password" />
    `;

    const autofill = resolveAll();
    await autofill.setElementFunctions();

    expect(autofill.state.elements.map(el => el.function)).toEqual([
      'email',
      'phone',
      'url',
      'password',
    ]);
    expect(autofill.state.elements.map(el => el.resolvedBy)).toEqual([
      'fallback',
      'fallback',
      'fallback',
      'fallback',
    ]);
  });

  it('uses the autocomplete token when present', async () => {
    document.body.innerHTML = `
      <input name="contact" type="email" autocomplete="email" />
    `;

    const autofill = resolveAll();
    await autofill.setElementFunctions();

    expect(autofill.state.elements[0].function).toBe('email');
    expect(autofill.state.elements[0].resolvedBy).toBe('autocomplete');
  });

  it('does not resolve a single-line "subject" field to a pronoun', async () => {
    document.body.innerHTML = `
      <label for="s">Subject</label>
      <input id="s" name="subject" type="text" />
    `;

    const autofill = resolveAll();
    await autofill.setElementFunctions();

    expect(autofill.state.elements[0].function).not.toBe('pronounreflective');
  });

  it('does not fill a textarea with an email body', async () => {
    document.body.innerHTML = `<textarea name="message"></textarea>`;

    const autofill = resolveAll();
    await autofill.setElementFunctions();
    await autofill.getElementValues();

    const [message] = autofill.state.elements;
    expect(message.function).not.toBe('email_text');
    expect(message.value).not.toContain('Subject:');
  });

  it('still uses search for genuinely ambiguous fields', async () => {
    document.body.innerHTML = `<input name="city" type="text" />`;

    const autofill = resolveAll();
    await autofill.setElementFunctions();

    expect(autofill.state.elements[0].function).toBe('city');
    expect(autofill.state.elements[0].resolvedBy).toBe('search');
  });
});
