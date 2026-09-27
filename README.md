# Gofakeit Extension

A comprehensive browser extension that generates fake data for web forms using the [Gofakeit library](https://github.com/brianvoe/gofakeit). This extension provides multiple ways to generate realistic fake data for testing and development purposes, supporting both Chrome and Firefox browsers.

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## 🚀 Features

- **Smart Form Detection**: Automatically detects and fills form fields with appropriate fake data
- **Multiple Input Types**: Supports text, email, phone, password, date/time, number, color, checkbox, radio, and select inputs
- **Right-Click Context Menu**: Quick access to 200+ Gofakeit functions via right-click menu
- **Interactive Selection Mode**: Click to select specific areas for data generation
- **Popup Interface**: Bulk form filling with autofill options and settings
- **Password Generator**: Built-in secure password generation
- **UUID Generator**: Generate UUIDs for testing purposes
- **Real-time Notifications**: Visual feedback for successful and failed operations
- **Cross-Browser Support**: Works on both Chrome (Manifest V3) and Firefox (Manifest V2)
- **Settings Persistence**: Save autofill preferences across browser sessions

## 📦 Installation

### For Users
**Firefox Add-ons**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gofakeit/)
**Chrome Web Store**: [Install from Chrome Web Store](https://chrome.google.com/webstore) (coming soon)

### For Developers
```bash
git clone https://github.com/brianvoe/gofakeit_extension.git
cd gofakeit_extension
npm install
npm run dev        # For Chrome development with hot reload
npm run dev:firefox # For Firefox development with hot reload
```

### Manual Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build:chrome` for Chrome or `npm run build:firefox` for Firefox
4. Load the appropriate `dist` folder as an unpacked extension:
   - Chrome: `dist/chrome-mv3/`
   - Firefox: `dist/firefox-mv2/`

## 🛠️ Development

### Scripts
- `npm run dev` - Start Chrome development server with hot reload
- `npm run dev:firefox` - Start Firefox development server with hot reload
- `npm run build` - Build for both Chrome and Firefox
- `npm run build:chrome` - Build for Chrome only
- `npm run build:firefox` - Build for Firefox only
- `npm run zip` - Create zip files for both browsers
- `npm run clean` - Remove the dist folder
- `npm test` - Run test suite

### Project Structure
```
entrypoints/
├── background/
│   ├── index.ts             # Background script entry point
│   └── context-menu.ts      # Context menu creation and handling
├── content/
│   ├── index.ts             # Content script entry point
│   ├── autofill-service.ts  # Autofill logic and gofakeit integration
│   ├── message-handler.ts   # Message handling between popup and content
│   ├── notifications.ts     # Toast notification system
│   ├── selection.ts         # Interactive selection mode
│   └── styles.css           # Content script styles
└── popup/
    ├── index.html           # Popup HTML
    ├── main.ts              # Popup script
    ├── autofill-options.ts  # Autofill settings modal
    ├── password-generator.ts # Password generator functionality
    ├── uuid-generator.ts    # UUID generator functionality
    └── styles.css           # Popup styles

public/
├── images/                  # Extension icons and assets
└── variables.css            # CSS variables for consistent styling
```

### Architecture

#### Core Services
- **`AutofillService`**: Handles all autofill operations using the Gofakeit library
- **`MessageHandler`**: Manages communication between popup and content scripts
- **`Notification`**: Provides visual feedback for user actions
- **`Selection`**: Interactive mode for selecting specific form areas

#### Framework
- **WXT**: Modern web extension framework for cross-browser compatibility
- **TypeScript**: Full type safety and modern JavaScript features
- **Vite**: Fast build tool with hot module replacement
- **Gofakeit**: Comprehensive fake data generation library

#### Input Type Support
- **Text Inputs**: `text`, `email`, `tel`, `password`, `search`, `url`, `color`
- **Date/Time**: `date`, `time`, `datetime-local`, `month`, `week`
- **Numbers**: `number`, `range`
- **Selections**: `checkbox`, `radio`, `select`, `textarea`

## 🎯 Usage

### Popup Interface
1. Click the Gofakeit extension icon
2. Choose "Autofill All" to fill all form fields on the page
3. Choose "Autofill Selected" to enter selection mode
4. Use the password generator and UUID generator tools
5. Access autofill settings to customize behavior

### Right-Click Context Menu
1. Right-click on any form field
2. Select "Gofakeit" from the context menu
3. Choose from popular functions or browse the full list
4. Select a specific function to apply to that field

### Interactive Selection Mode
1. Click the extension icon and select "Autofill Selected"
2. Click on form fields or containers to generate data
3. The extension will detect the field type and apply appropriate data

### Settings
- **Auto Mode**: Automatically detects field types and applies appropriate data
- **Manual Mode**: Requires explicit user selection for each field
- **Stagger Timing**: Control the delay between filling multiple fields
- **Badge Duration**: Set how long success/error badges are displayed
- **Debug**: Log how each field was resolved (function, source, score) to the page console

## 🔧 Gofakeit Integration

The extension uses the [Gofakeit library](https://github.com/brianvoe/gofakeit) to generate realistic fake data. The library provides 200+ functions for generating various types of test data.

### Popular Functions
- **Personal**: `firstname`, `lastname`, `email`, `phone`, `address`, `city`, `state`, `zip`, `ssn`, `date`, `age`
- **Business**: `company`, `job`, `department`, `url`, `username`
- **Financial**: `creditcard`, `currency`, `account`, `routing`
- **Technical**: `uuid`, `ipv4`, `ipv6`, `mac`, `password`
- **Text**: `word`, `sentence`, `paragraph`, `lorem`
- **Numbers**: `number`, `digit`, `price`
- **Colors**: `hexcolor`, `rgb`
- **Entertainment**: `moviename`, `gamertag`, `animal`, `color`

### Context Menu Integration
The extension fetches the complete list of available functions from the Gofakeit API to populate the right-click context menu, ensuring users always have access to the latest data generation capabilities.

## 🧪 Testing

### Manual Testing
1. Build the extension: `npm run build:chrome` or `npm run build:firefox`
2. Load in browser as unpacked extension
3. Navigate to any form-heavy website
4. Test various input types and functions
5. Test both popup and right-click functionality

### Development Testing
- Use `npm run dev` for Chrome or `npm run dev:firefox` for Firefox development
- Use `npm run clean` to remove the dist folder if needed
- Check browser console for detailed logging
- Test cross-browser compatibility between Chrome and Firefox

### Automated Testing
- Run `npm test` to execute the test suite
- Tests cover core functionality, error handling, and edge cases
- Continuous integration ensures code quality

## 🚀 Deploying

Deploy builds and publishes the extension to the Chrome Web Store and Firefox
Add-ons in a single command.

### One-time setup

Generate store credentials interactively. This creates a `.env.submit` file,
which is gitignored:

```bash
npx wxt submit init
```

It asks for:

- **Chrome**: extension ID, Google Cloud OAuth client ID, client secret, and refresh token
- **Firefox**: add-on ID, JWT issuer, and JWT secret

> The very first upload of each extension must be done by hand in the store
> dashboards. Automated deploys only work for updating an existing listing.

### Deploy

```bash
npm run deploy        # build, zip, and submit to both stores
npm run deploy:dry    # validate credentials without uploading anything
```

Both stores reject a version that has already been uploaded, so bump the
version and commit it before deploying:

```bash
npm run release       # prompts for a new version, builds, and zips
npm run deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use WXT framework conventions for cross-browser compatibility
- Add proper error handling and user feedback
- Include console logging for debugging
- Test with multiple input types and browsers
- Update documentation for new features
- Ensure all new features work in both Chrome and Firefox

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Gofakeit](https://github.com/brianvoe/gofakeit) for providing the comprehensive fake data library
- [WXT](https://wxt.dev/) for the excellent cross-browser extension framework
- Chrome and Firefox extension teams for their documentation and support
- The open source community for inspiration and tools
