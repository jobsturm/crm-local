# Changelog

All notable changes to Simpel CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.4] - 2026-01-30

### Added
- **Bundled Backend**: Backend server now starts automatically with the app
- No need to run the backend separately - it's all in one package
- Automatic storage path in user data directory

### Fixed
- Fixed API calls in Electron to connect to bundled backend

## [1.0.3] - 2026-01-30

### Fixed
- Fixed API calls in Electron (now uses absolute URL to localhost:3456)

## [1.0.2] - 2026-01-30

### Fixed
- Fixed blank screen on app launch (use hash routing for Electron)

## [1.0.1] - 2026-01-30

### Fixed
- Fixed asset loading in Windows builds (paths now relative instead of absolute)

## [1.0.0] - 2026-01-30

### Added
- Initial release of Simpel CRM
- Customer management (create, edit, view, search)
- Document management (invoices and quotes)
- PDF generation with customizable templates
- Financial overview with quarterly reports
- Dashboard with key statistics
- Dutch BTW (VAT) declarations support
- Multi-language support (English and Dutch)
- Dark mode support
- Auto-update functionality
- Configurable storage location
- Interactive PDF preview in settings

### Features
- Local-first architecture - all data stays on your computer
- Professional PDF invoices and quotes
- Customer search and filtering
- Document status tracking
- Financial reports with charts
- Invoice aging reports
- Export to CSV and PDF
- Automatic document numbering
- Customizable company branding
