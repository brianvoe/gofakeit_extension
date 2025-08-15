# Gofakeit Extension - Source Code Structure

This directory contains the organized source code for the Gofakeit browser extension.

## File Structure

```
src/
└── index.ts                 # Main exports
├── types.ts                 # TypeScript type definitions
├── api.ts                   # Gofakeit API interactions
├── selection.ts             # Interactive selection mode
├── autofill.ts              # Core autofill logic & utilities
├── input-datetime.ts        # Date/time input handling
├── input-text.ts            # Text input handling
├── input-number.ts          # Number input handling
├── input-misc.ts            # Miscellaneous input handling
├── notifications.ts         # Notification system
├── content.ts               # Main content script
├── popup.ts                 # Popup script
├── popup.html               # Popup HTML
├── background.ts            # Background service worker
```

## File Responsibilities

### `types.ts`
- TypeScript interfaces
- Type definitions
- Global type extensions

### `api.ts`
- Handles all HTTP requests to the Gofakeit API
- Error handling for API calls
- Data fetching for form field values

### `autofill.ts`
- Core autofill functionality
- Individual field autofill
- Container autofill
- Form-wide autofill
- Form field detection utilities
- Container finding logic
- Element type checking

### `selection.ts`
- Interactive selection mode
- Mouse event handling
- Visual highlighting
- Click detection

### `input-datetime.ts`
- Date input handling (date, datetime-local, time, month, week)
- ISO date string parsing
- Custom function support
- Proper formatting for HTML5 inputs

### `input-text.ts`
- Text input handling (text, email, tel, password, search, url)
- Textarea handling
- Smart function mapping for 'true' values
- Event triggering
- Error handling

### `input-number.ts`
- Number input handling
- Range input handling
- Smart function mapping for 'true' values
- Min/max parameter support for range inputs
- Event triggering
- Error handling

### `input-misc.ts`
- Checkbox input handling (with group selection logic)
- Radio input handling
- Select dropdown handling (random and function-based)
- Event triggering
- Error handling

### `notifications.ts`
- Toast notification system
- User feedback messages
- Visual status indicators

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single responsibility
2. **Maintainability**: Easy to find and modify specific functionality
3. **Testability**: Individual modules can be tested in isolation
4. **Reusability**: Functions can be imported and reused across modules
5. **Type Safety**: Centralized type definitions ensure consistency

## Usage

The main content script (`content.ts`) imports from these modules and orchestrates the functionality. Each module exports only what's needed, keeping the codebase clean and organized.
