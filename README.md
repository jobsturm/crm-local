# Simpel CRM

<p align="center">
  <img src="CRM-simpel-logo.svg" alt="Simpel CRM Logo" width="120" />
</p>

<p align="center">
  <strong>A simple, local-first CRM for freelancers and small businesses</strong>
</p>

<p align="center">
  <a href="https://github.com/jobsturm/crm-local/releases/latest">
    <img src="https://img.shields.io/github/v/release/jobsturm/crm-local?style=flat-square" alt="Latest Release" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-Source%20Available-blue?style=flat-square" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=flat-square" alt="Platform" />
</p>

---

## ✨ Features

- **🔒 100% Local** — Your data stays on your computer. No cloud, no subscriptions, no data harvesting.
- **📄 Professional Invoices & Offers** — Create beautiful PDF documents with your branding.
- **👥 Customer Management** — Keep track of your clients and their contact details.
- **📊 Financial Overview** — BTW/VAT declarations, revenue tracking, and aging reports.
- **🌍 Multilingual** — Full support for English and Dutch (Nederlands).
- **🎨 Dark & Light Mode** — Easy on the eyes, day or night.
- **💾 Portable Data** — JSON files you can backup, move, or inspect anytime.

---

## 📥 Download

Download the latest version for your operating system:

### [⬇️ Download Latest Release](https://github.com/jobsturm/crm-local/releases/latest)

| Platform | File |
|----------|------|
| **macOS** (Intel & Apple Silicon) | `Simpel-CRM-x.x.x-mac-universal.dmg` |
| **Windows** | `Simpel-CRM-x.x.x-win-x64.exe` |
| **Linux** | `Simpel-CRM-x.x.x-linux-x86_64.AppImage` or `.deb` |

### macOS Installation Note

Since the app is not signed with an Apple Developer certificate, macOS may block it. To open:

1. **Right-click** the app → **Open** → **Open** (in the dialog)
2. Or run in Terminal: `xattr -cr /Applications/Simpel\ CRM.app`

---

## 🖼️ Screenshots

<p align="center">
  <img src="docs/screenshot-dashboard.png" alt="Dashboard" width="45%" />
  <img src="docs/screenshot-invoice.png" alt="Invoice" width="45%" />
</p>

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 20+ 
- **npm** 10+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/jobsturm/crm-local.git
cd crm-local

# Install dependencies
npm install

# Start development servers (backend + frontend)
npm run dev

# Or start them separately:
npm run dev -w @crm-local/backend    # Backend on http://localhost:3456
npm run dev -w simpel-crm            # Frontend on http://localhost:5173
```

### Building the Desktop App

```bash
# Build for your current platform
cd packages/frontend
npm run electron:build

# Build for specific platforms
npm run electron:build:mac    # macOS
npm run electron:build:win    # Windows  
npm run electron:build:linux  # Linux
```

Built apps will be in `packages/frontend/release/`.

### Project Structure

```
crm-local/
├── packages/
│   ├── shared/      # Shared DTOs and utilities
│   ├── backend/     # Express.js API server
│   └── frontend/    # Vue 3 + Electron app
├── docs/            # GitHub Pages landing site
└── scripts/         # Build and utility scripts
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Bugs

1. Check if the issue already exists in [Issues](https://github.com/jobsturm/crm-local/issues)
2. Create a new issue with:
   - Clear title describing the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Your OS and app version

### Suggesting Features

Open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the code style
4. **Test your changes** thoroughly
5. **Commit** with a descriptive message: `git commit -m "✨ Add amazing feature"`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open a Pull Request** against `master`

### Code Guidelines

- **TypeScript** strict mode is mandatory
- **No custom CSS** in Vue components — use Naive UI components only
- **All user-facing text** must use the i18n system (both EN and NL)
- **DTOs** live in `packages/shared/src/dto/`
- **Breaking database changes** require migrations

See [AGENTS.md](AGENTS.md) for detailed coding guidelines.

---

## 📋 Roadmap

- [ ] Recurring invoices
- [ ] Email integration (send invoices directly)
- [ ] Multi-currency support
- [ ] Import/export (CSV, other CRM formats)
- [ ] Invoice templates customization
- [ ] Time tracking integration

---

## 📜 License

This project is **source-available** under a custom license. 

**You are free to:**
- ✅ Use the software for personal or business purposes
- ✅ Modify and customize it for your own use
- ✅ Share it with others (with attribution)
- ✅ Contribute improvements back to the project

**You may NOT:**
- ❌ Sell or commercially distribute the software
- ❌ Offer it as a paid service or SaaS
- ❌ Remove or alter the license/attribution notices

See [LICENSE](LICENSE) for full details.

---

## 🙏 Acknowledgments

Built with:
- [Vue 3](https://vuejs.org/) + [Naive UI](https://www.naiveui.com/)
- [Electron](https://www.electronjs.org/)
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

<p align="center">
  Made with ❤️ for freelancers who just want to get paid
</p>
