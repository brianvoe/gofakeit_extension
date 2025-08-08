# Gofakeit Extension - Source Code Structure

This directory contains the organized source code for the Gofakeit browser extension.

## File Structure

```
src/
├── types.ts                 # TypeScript type definitions
├── gofakeit-api.ts          # Gofakeit API interactions
├── autofill-core.ts         # Core autofill logic
├── autofill-utils.ts        # Form field detection utilities
├── selection-mode.ts        # Interactive selection mode
├── notifications.ts         # Notification system
├── content.ts               # Main content script
├── popup.ts                 # Popup script
├── popup.html               # Popup HTML
├── background.ts            # Background service worker
└── index.ts                 # Main exports
```

## File Responsibilities

### `types.ts`
- TypeScript interfaces
- Type definitions
- Global type extensions

### `gofakeit-api.ts`
- Handles all HTTP requests to the Gofakeit API
- Error handling for API calls
- Data fetching for form field values

### `autofill-core.ts`
- Core autofill functionality
- Individual field autofill
- Container autofill
- Form-wide autofill

### `autofill-utils.ts`
- Form field detection
- Container finding logic
- Element type checking

### `selection-mode.ts`
- Interactive selection mode
- Mouse event handling
- Visual highlighting
- Click detection

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
