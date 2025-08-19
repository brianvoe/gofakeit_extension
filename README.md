# Gofakeit Chrome Extension

A comprehensive Chrome extension that generates fake data for web forms using the [Gofakeit API](https://gofakeit.com/). This extension provides multiple ways to generate realistic fake data for testing and development purposes.

## 🚀 Features

- **Smart Form Detection**: Automatically detects and fills form fields with appropriate fake data
- **Multiple Input Types**: Supports text, email, phone, password, date/time, number, color, checkbox, radio, and select inputs
- **Right-Click Context Menu**: Quick access to popular Gofakeit functions via right-click menu
- **Interactive Selection Mode**: Click to select specific areas for data generation
- **Custom Functions**: Use any Gofakeit function with `data-gofakeit="function_name"`
- **Real-time Notifications**: Visual feedback for successful and failed operations
- **Error Handling**: Graceful handling of API errors and invalid inputs
- **Keyboard Shortcuts**: `Ctrl+Shift+F` to trigger data generation

## 📦 Installation

### For Users
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Load the `dist` folder as an unpacked extension in Chrome
5. Navigate to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked"

### For Developers
```bash
git clone https://github.com/brianvoe/gofakeit_extension.git
cd gofakeit_extension
npm install
npm run dev  # For development with hot reload
```

## 🛠️ Development

### Scripts
- `npm run dev` - Start development server with hot reload (watches for changes)
- `npm run build` - Build for production
- `npm run clean` - Remove the dist folder

### Project Structure
```
src/
├── index.ts                 # Main exports
├── types.ts                 # TypeScript type definitions
├── api.ts                   # Gofakeit API interactions
├── autofill.ts              # Core data generation logic
├── input-datetime.ts        # Date/time input handling
├── input-text.ts            # Text input handling
├── input-number.ts          # Number input handling
├── input-misc.ts            # Checkbox, radio, and select handling
├── context-menu.ts          # Right-click context menu
├── selection.ts             # Interactive selection mode
├── notifications.ts         # Toast notification system
├── content.ts               # Main content script
├── popup.ts                 # Popup script
├── popup.html               # Popup HTML
└── background.ts            # Background service worker
```

### Architecture

#### Core Modules
- **`autofill.ts`**: Main orchestration logic for data generation
- **`api.ts`**: Handles all HTTP requests to the Gofakeit API
- **`input-*.ts`**: Specialized handlers for different input types
- **`context-menu.ts`**: Right-click menu functionality with popular functions
- **`selection.ts`**: Interactive mode for selecting specific areas

#### Input Type Support
- **Text Inputs**: `text`, `email`, `tel`, `password`, `search`, `url`, `color`
- **Date/Time**: `date`, `time`, `datetime-local`, `month`, `week`
- **Numbers**: `number`, `range`
- **Selections**: `checkbox`, `radio`, `select`, `textarea`

## 🎯 Usage

### Basic Usage
Add `data-gofakeit="true"` to any form field for automatic function mapping:
```html
<input type="email" data-gofakeit="true" placeholder="Email">
<input type="text" data-gofakeit="name" placeholder="Name">
```

### Custom Functions
Use any Gofakeit function by specifying the function name:
```html
<input type="text" data-gofakeit="company" placeholder="Company">
<input type="text" data-gofakeit="creditcard" placeholder="Credit Card">
```

### Right-Click Context Menu
1. Right-click on any form field
2. Select "Gofakeit" from the context menu
3. Choose a category (Personal Information, Business, etc.)
4. Select a specific function

### Interactive Mode
1. Click the extension icon
2. Select "Selected" mode
3. Click on form fields or containers to generate data

## 🔧 API Integration

The extension integrates with the [Gofakeit API](https://gofakeit.com/) to generate realistic fake data. All API calls are handled through the `api.ts` module with proper error handling and retry logic.

### Popular Functions
- **Personal**: `name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `ssn`, `date`, `age`
- **Business**: `company`, `job`, `department`, `url`, `username`
- **Financial**: `creditcard`, `currency`, `account`, `routing`
- **Technical**: `uuid`, `ipv4`, `ipv6`, `mac`, `password`
- **Text**: `word`, `sentence`, `paragraph`, `lorem`
- **Numbers**: `number`, `digit`, `price`
- **Colors**: `hexcolor`, `rgb`

## 🧪 Testing

### Manual Testing
1. Build the extension: `npm run build`
2. Load in Chrome as unpacked extension
3. Navigate to any form-heavy website
4. Test various input types and functions

### Development Testing
- Use `npm run dev` for continuous building during development (watches for changes)
- Use `npm run clean` to remove the dist folder if needed
- Check browser console for detailed logging
- Monitor network requests to Gofakeit API

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling
- Include console logging for debugging
- Test with multiple input types
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Gofakeit](https://gofakeit.com/) for providing the fake data API
- Chrome Extensions team for the excellent documentation
- The open source community for inspiration and tools
