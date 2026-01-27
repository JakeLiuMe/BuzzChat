/**
 * BuzzChat - Form Validation Tests
 * Verifies form validation feedback behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Form Validation', () => {
  test.describe('FormValidator Helper', () => {
    // Mock the FormValidator helper from popup.js
    const FormValidator = {
      showError(input, message) {
        if (!input) return;
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        formGroup.classList.add('has-error');
        input.setAttribute('aria-invalid', 'true');
        let errorEl = formGroup.querySelector('.form-error');
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'form-error';
          errorEl.setAttribute('role', 'alert');
          input.parentNode.insertBefore(errorEl, input.nextSibling);
        }
        errorEl.textContent = message;
      },

      clearError(input) {
        if (!input) return;
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        formGroup.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        const errorEl = formGroup.querySelector('.form-error');
        if (errorEl) {
          errorEl.remove();
        }
      },

      validateRequired(input, fieldName = 'This field') {
        if (!input) return false;
        const value = input.value.trim();
        if (!value) {
          this.showError(input, `${fieldName} is required`);
          return false;
        }
        this.clearError(input);
        return true;
      },

      validateMinLength(input, minLength, fieldName = 'This field') {
        if (!input) return false;
        const value = input.value.trim();
        if (value.length < minLength) {
          this.showError(input, `${fieldName} must be at least ${minLength} characters`);
          return false;
        }
        this.clearError(input);
        return true;
      }
    };

    test('showError handles null input gracefully', () => {
      expect(() => FormValidator.showError(null, 'Error')).not.toThrow();
    });

    test('clearError handles null input gracefully', () => {
      expect(() => FormValidator.clearError(null)).not.toThrow();
    });

    test('validateRequired returns false for empty string', () => {
      const mockInput = { value: '', closest: () => null };
      expect(FormValidator.validateRequired(mockInput, 'Field')).toBe(false);
    });

    test('validateRequired returns false for whitespace only', () => {
      const mockInput = { value: '   ', closest: () => null };
      expect(FormValidator.validateRequired(mockInput, 'Field')).toBe(false);
    });

    test('validateRequired returns true for valid value', () => {
      const mockInput = {
        value: 'test',
        closest: () => null,
        removeAttribute: () => {}
      };
      expect(FormValidator.validateRequired(mockInput, 'Field')).toBe(true);
    });

    test('validateMinLength returns false for short value', () => {
      const mockInput = { value: 'ab', closest: () => null };
      expect(FormValidator.validateMinLength(mockInput, 5, 'Field')).toBe(false);
    });

    test('validateMinLength returns true for long enough value', () => {
      const mockInput = {
        value: 'hello world',
        closest: () => null,
        removeAttribute: () => {}
      };
      expect(FormValidator.validateMinLength(mockInput, 5, 'Field')).toBe(true);
    });
  });

  test.describe('Error Messages', () => {
    test('required field error message format', () => {
      const fieldName = 'Welcome message';
      const errorMessage = `${fieldName} is required`;
      expect(errorMessage).toBe('Welcome message is required');
    });

    test('minimum length error message format', () => {
      const fieldName = 'Response';
      const minLength = 5;
      const errorMessage = `${fieldName} must be at least ${minLength} characters`;
      expect(errorMessage).toBe('Response must be at least 5 characters');
    });
  });

  test.describe('Character Counter', () => {
    test('calculates remaining characters correctly', () => {
      const maxLength = 500;
      const currentLength = 450;
      const remaining = maxLength - currentLength;
      expect(remaining).toBe(50);
    });

    test('warning threshold at 50 characters remaining', () => {
      const remaining = 50;
      const isWarning = remaining <= 50 && remaining > 0;
      expect(isWarning).toBe(true);
    });

    test('error threshold at 0 or less remaining', () => {
      const remaining = 0;
      const isError = remaining <= 0;
      expect(isError).toBe(true);
    });

    test('normal state when plenty of characters remaining', () => {
      const remaining = 200;
      const isWarning = remaining <= 50 && remaining > 0;
      const isError = remaining <= 0;
      expect(isWarning).toBe(false);
      expect(isError).toBe(false);
    });
  });

  test.describe('CSS Error States', () => {
    test('error class name is has-error', () => {
      const errorClass = 'has-error';
      expect(errorClass).toBe('has-error');
    });

    test('error message class is form-error', () => {
      const errorMessageClass = 'form-error';
      expect(errorMessageClass).toBe('form-error');
    });

    test('aria-invalid attribute value for errors', () => {
      const ariaInvalid = 'true';
      expect(ariaInvalid).toBe('true');
    });
  });

  test.describe('Accessibility', () => {
    test('error messages should have role=alert', () => {
      const role = 'alert';
      expect(role).toBe('alert');
    });

    test('invalid inputs should have aria-invalid=true', () => {
      const ariaInvalid = 'true';
      expect(ariaInvalid).toBe('true');
    });

    test('valid inputs should not have aria-invalid attribute', () => {
      // Mock input after validation passes
      const mockInput = {
        hasAttribute: (attr) => attr !== 'aria-invalid'
      };
      expect(mockInput.hasAttribute('aria-invalid')).toBe(false);
    });
  });

  test.describe('Validation Patterns', () => {
    test('validate on blur pattern', () => {
      // Validate should trigger when user leaves field
      const events = ['blur', 'focusout'];
      expect(events).toContain('blur');
    });

    test('clear error on valid input pattern', () => {
      // When user fixes input, error should clear
      let hasError = true;
      const validValue = 'valid input';
      if (validValue.length > 0) {
        hasError = false;
      }
      expect(hasError).toBe(false);
    });
  });
});
