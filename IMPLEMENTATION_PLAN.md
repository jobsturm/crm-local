# CRM Implementation Plan

## Project Structure

```
crm-local/
├── packages/
│   ├── shared/                    # Shared DTOs and utilities
│   │   ├── src/
│   │   │   ├── dto/
│   │   │   │   ├── customer.dto.ts
│   │   │   │   ├── document.dto.ts    # Offers & Invoices (unified)
│   │   │   │   ├── business.dto.ts
│   │   │   │   ├── settings.dto.ts
│   │   │   │   ├── database.dto.ts
│   │   │   │   ├── common.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── storage.ts     # JSON read/write with atomically
│   │   │   │   └── index.ts
│   │   │   ├── templates/
│   │   │   │   ├── pdf-generator.reference.ts  # Client-approved PDF template
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/                   # Node.js backend server
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── customer.controller.ts
│   │   │   │   ├── document.controller.ts  # Handles both offers & invoices
│   │   │   │   ├── business.controller.ts
│   │   │   │   └── settings.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── customer.service.ts
│   │   │   │   ├── document.service.ts
│   │   │   │   ├── pdf.service.ts         # PDF generation
│   │   │   │   ├── business.service.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   └── storage.service.ts
│   │   │   ├── migrations/
│   │   │   │   └── index.ts
│   │   │   ├── routes/
│   │   │   │   └── index.ts
│   │   │   ├── middleware/
│   │   │   │   └── error-handler.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── frontend/                  # Vue 3 + Electron frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── customers/
│       │   │   │   ├── CustomerList.vue
│       │   │   │   ├── CustomerForm.vue
│       │   │   │   └── CustomerDetail.vue
│       │   │   ├── documents/             # Shared for offers & invoices
│       │   │   │   ├── DocumentList.vue
│       │   │   │   ├── DocumentForm.vue
│       │   │   │   └── DocumentPreview.vue
│       │   │   ├── business/
│       │   │   │   └── BusinessForm.vue
│       │   │   ├── settings/
│       │   │   │   └── SettingsForm.vue
│       │   │   └── layout/
│       │   │       ├── AppLayout.vue
│       │   │       ├── AppSidebar.vue
│       │   │       └── AppHeader.vue
│       │   ├── views/
│       │   │   ├── CustomersView.vue
│       │   │   ├── OffersView.vue         # List of offers
│       │   │   ├── InvoicesView.vue       # List of invoices
│       │   │   ├── DocumentEditView.vue   # Shared edit view
│       │   │   ├── BusinessView.vue
│       │   │   └── SettingsView.vue
│       │   ├── stores/
│       │   │   ├── customer.store.ts
│       │   │   ├── document.store.ts      # Handles both offers & invoices
│       │   │   ├── business.store.ts
│       │   │   └── settings.store.ts
│       │   ├── api/
│       │   │   └── client.ts
│       │   ├── router/
│       │   │   └── index.ts
│       │   ├── App.vue
│       │   └── main.ts
│       ├── electron/
│       │   ├── main.ts            # Electron main process (spawns backend)
│       │   └── preload.ts
│       ├── tests/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── electron-builder.json
│
├── package.json                   # Root package.json (workspaces)
├── tsconfig.base.json
├── AGENTS.md                      # Guidelines for AI agents
├── PLAN.md
└── IMPLEMENTATION_PLAN.md
```

---

## Storage Architecture

### File Layout

```
{storagePath}/                     # User-configurable location
├── database.json                  # Customers, business info, settings (~small)
├── offers/
│   ├── 2025/
│   │   ├── OFF-2025-0001.json
│   │   └── OFF-2025-0002.json
│   └── 2026/
│       └── OFF-2026-0001.json
└── invoices/
    ├── 2025/
    │   ├── INV-2025-0001.json
    │   └── INV-2025-0002.json
    └── 2026/
        ├── INV-2026-0001.json
        └── ...
```

### Why Split Documents?

| Documents | Single File Size | Memory Impact |
|-----------|------------------|---------------|
| 100 | ~500KB | Fine |
| 1,000 | ~5MB | Fine |
| 10,000 | ~50MB | Sluggish startup |
| 50,000 | ~250MB | Problematic |

**Benefits of separate document files:**
- Fast listing (read directory, not file contents)
- Lazy loading (only load document when viewed/edited)
- Small memory footprint
- Better for incremental backups
- Easy to archive old years

### Atomic Writes

Using `atomically` (write-file-atomic) package to prevent data corruption:
- Writes to temporary file first
- Renames to target (atomic operation on most filesystems)
- If app crashes mid-write, original file is intact

### Versioning Strategy

Each JSON file starts with a `version` field (semver):
```json
{
  "version": "1.0.0",
  "customers": [...]
}
```

On load, check version and run migrations if needed:
```typescript
if (semver.lt(data.version, CURRENT_VERSION)) {
  data = migrate(data);
  await saveDatabase(data);
}
```

---

## Document Model (Offers & Invoices)

Offers and invoices share the same structure via `DocumentDto`:

```typescript
interface DocumentDto {
  id: string;
  documentType: 'offer' | 'invoice';
  documentTitle: string;           // "Quote", "Offerte", "Factuur", etc.
  documentNumber: string;          // "OFF-2026-0001" or "INV-2026-0001"
  
  customerId: string;              // Reference to customer
  customer: {                      // Snapshot for PDF (won't change if customer updates)
    name: string;
    company?: string;
    street?: string;
    postalCode: string;
    city: string;
  };
  
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;             // In cents
    total: number;                 // In cents
  }>;
  
  subtotal: number;                // In cents
  taxRate: number;                 // e.g., 21 for 21%
  taxAmount: number;               // In cents
  total: number;                   // In cents
  
  paymentTermDays: number;         // e.g., 14, 30
  dueDate: string;                 // Calculated: createdAt + paymentTermDays
  
  introText?: string;              // Before line items
  notesText?: string;              // After line items
  footerText?: string;             // PDF footer
  
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue' | 'cancelled';
  statusHistory: StatusLogEntryDto[];  // Audit trail for analytics
  
  createdAt: string;
  updatedAt: string;
  convertedFromOfferId?: string;   // If invoice was created from an offer
}

interface StatusLogEntryDto {
  timestamp: string;               // When status changed
  fromStatus: DocumentStatus | null;  // Previous (null on creation)
  toStatus: DocumentStatus;        // New status
  note?: string;                   // Optional reason
}
```

### Converting Offer → Invoice

When an offer is accepted, it can be converted to an invoice:

```typescript
POST /api/documents/convert-to-invoice
{
  offerId: "uuid",
  paymentTermDays?: 14,  // Optional override
}
```

This creates a new invoice document with:
- New document number (INV-2026-XXXX)
- `convertedFromOfferId` set to original offer ID
- Original offer status updated to 'accepted'

---

## Phase 1: Project Setup

### 1.1 Initialize Monorepo
- [ ] Create root `package.json` with npm workspaces
- [ ] Create base TypeScript config (`tsconfig.base.json`) with strict mode
- [ ] Setup shared, backend, and frontend packages

### 1.2 Shared Package
- [ ] Create shared DTOs (Customer, Document, Business, Settings, Database)
- [ ] Create storage utilities with `atomically` for safe JSON read/write
- [ ] Configure TypeScript for shared package

### 1.3 Backend Package
- [ ] Setup Node.js with Express
- [ ] Configure TypeScript (strict mode)
- [ ] Setup Vite for testing
- [ ] Import shared DTOs and utilities

### 1.4 Frontend Package
- [ ] Setup Vue 3 + Vite + TypeScript (strict)
- [ ] Install and configure Naive UI
- [ ] Setup Electron integration
- [ ] Configure Vite for testing
- [ ] Import shared DTOs

---

## Phase 2: Backend Development

### 2.1 Storage Service

**Main Database** (`database.json`):
```json
{
  "version": "1.0.0",
  "customers": [],
  "business": null,
  "settings": {
    "currency": "EUR",
    "defaultTaxRate": 21,
    "defaultPaymentTermDays": 14,
    "offerPrefix": "OFF",
    "nextOfferNumber": 1,
    "invoicePrefix": "INV",
    "nextInvoiceNumber": 1,
    "defaultIntroText": null,
    "defaultFooterText": null,
    "labels": {
      "offerTitle": "Quote",
      "invoiceTitle": "Invoice",
      "dateLabel": "Date",
      "dueDateLabel": "Due Date",
      "subtotalLabel": "Subtotal",
      "taxLabel": "VAT",
      "totalLabel": "Total"
    },
    "theme": "system",
    "dateFormat": "DD-MM-YYYY",
    "updatedAt": "2026-01-29T..."
  }
}
```

**Document File** (`offers/2026/OFF-2026-0001.json` or `invoices/2026/INV-2026-0001.json`):
```json
{
  "version": "1.0.0",
  "document": {
    "id": "uuid",
    "documentType": "offer",
    "documentNumber": "OFF-2026-0001",
    ...
  }
}
```

### 2.2 API Endpoints

#### Customers
- `GET    /api/customers`        - List all customers
- `GET    /api/customers/:id`    - Get customer by ID
- `POST   /api/customers`        - Create customer
- `PUT    /api/customers/:id`    - Update customer
- `DELETE /api/customers/:id`    - Delete customer

#### Documents (Offers & Invoices)
- `GET    /api/documents`                    - List all documents (with type filter)
- `GET    /api/documents/offers`             - List offers only
- `GET    /api/documents/invoices`           - List invoices only
- `GET    /api/documents/:id`                - Get full document by ID
- `POST   /api/documents`                    - Create document (offer or invoice)
- `PUT    /api/documents/:id`                - Update document
- `DELETE /api/documents/:id`                - Delete document
- `POST   /api/documents/convert-to-invoice` - Convert offer to invoice
- `GET    /api/documents/:id/pdf`            - Generate/download PDF

#### Business
- `GET    /api/business`         - Get business info
- `PUT    /api/business`         - Update business info

#### Settings
- `GET    /api/settings`         - Get settings
- `PUT    /api/settings`         - Update settings

### 2.3 Document Service Special Handling

```typescript
// List documents - read directory, parse filenames
async listDocuments(type?: 'offer' | 'invoice'): Promise<DocumentSummary[]> {
  const folders = type ? [type === 'offer' ? 'offers' : 'invoices'] : ['offers', 'invoices'];
  const summaries: DocumentSummary[] = [];
  
  for (const folder of folders) {
    const years = await listSubdirectories(join(storagePath, folder));
    for (const year of years) {
      const files = await listJsonFiles(join(storagePath, folder, year));
      for (const file of files) {
        const { document } = await readJsonFile<DocumentFileDto>(file);
        summaries.push({
          id: document.id,
          documentType: document.documentType,
          documentNumber: document.documentNumber,
          customerId: document.customerId,
          customerName: document.customer.name,
          total: document.total,
          status: document.status,
          dueDate: document.dueDate,
          createdAt: document.createdAt,
        });
      }
    }
  }
  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```

### 2.4 PDF Generation (via Electron)

**No external PDF library needed!** We use Electron's built-in `printToPDF` capability:

1. Generate HTML document with inline CSS
2. Pass HTML to Electron main process via IPC
3. Electron uses Chromium's PDF renderer

```typescript
// Frontend: request PDF generation
const result = await window.electronAPI.generatePDF(htmlContent, filePath);

// Electron main process: uses built-in printToPDF
const pdfBuffer = await win.webContents.printToPDF({
  pageSize: 'A4',
  printBackground: true,
});
```

**PDF Service generates HTML** using:
- Document data (items, totals, customer snapshot)
- Business info (company name, address, logo, bank details)
- Customizable labels from settings

Reference implementation saved at: `packages/shared/src/templates/pdf-generator.reference.ts`

### 2.5 Unit Tests
- [ ] Storage utility tests
- [ ] Document service tests (mock file system)
- [ ] PDF generation tests

---

## Phase 3: Frontend Development

### 3.1 Layout (Naive UI Only)
- [ ] App layout using `n-layout`, `n-layout-sider`, `n-layout-content`
- [ ] Sidebar navigation with `n-menu`
- [ ] Header with `n-page-header`

### 3.2 Views

#### Customers View
- [ ] Customer list using `n-data-table`
- [ ] Customer form using `n-form`, `n-input`, `n-select`
- [ ] Customer detail using `n-descriptions`
- [ ] CRUD operations with `n-modal`, `n-button`

#### Offers View
- [ ] Offer list using `n-data-table` (filter by type=offer)
- [ ] Status badges (draft, sent, accepted, rejected)
- [ ] Quick action: Convert to Invoice

#### Invoices View
- [ ] Invoice list using `n-data-table` (filter by type=invoice)
- [ ] Status badges (draft, sent, paid, overdue)
- [ ] Quick action: Mark as Paid

#### Document Edit View (Shared)
- [ ] Document form with line items using `n-dynamic-input`
- [ ] Customer selector (with snapshot preview)
- [ ] Customizable text fields (intro, notes, footer)
- [ ] Tax rate & payment terms
- [ ] Live preview panel
- [ ] PDF download button

#### Business View
- [ ] Business info form using `n-form`
- [ ] Logo upload using `n-upload`
- [ ] Preview of business card/letterhead

#### Settings View
- [ ] Storage path selector (via Electron dialog)
- [ ] Document defaults (tax rate, payment terms, prefixes)
- [ ] Default text templates (intro, footer)
- [ ] Document labels editor (customizable PDF text)
- [ ] App preferences (currency, currency symbol, date format, theme)

### 3.3 State Management
- [ ] Pinia stores for each entity
- [ ] API client for backend communication
- [ ] Document store loads summaries, fetches full on demand

### 3.4 Unit Tests
- [ ] Component tests
- [ ] Store tests

---

## Phase 4: Electron Integration

### 4.1 Main Process
- [ ] Spawn backend server as child process
- [ ] Window management
- [ ] IPC for native dialogs (folder picker for storage path)

### 4.2 Build Configuration
- [ ] electron-builder setup
- [ ] Bundle both frontend and backend
- [ ] Single executable output

---

## Phase 5: Testing & Polish

### 5.1 Integration Testing
- [ ] End-to-end workflow tests
- [ ] Data persistence tests

### 5.2 Error Handling
- [ ] Graceful error messages
- [ ] Data validation

### 5.3 Documentation
- [ ] User guide
- [ ] Developer documentation

---

## Data Models Overview

### Customer
- ID, name, email, phone, company, address, notes, createdAt, updatedAt

### Document (Offer or Invoice)
- ID, documentType, documentTitle, documentNumber
- customerId, customer (snapshot)
- items[], subtotal, taxRate, taxAmount, total
- paymentTermDays, dueDate
- introText, notesText, footerText
- status, statusHistory[] (audit trail for analytics)
- createdAt, updatedAt, convertedFromOfferId

### Business
- Name, address, phone, email, website, taxId, chamberOfCommerce, logo, bankDetails

### Settings
- storagePath, currency, currencySymbol, defaultTaxRate, defaultPaymentTermDays
- offerPrefix, nextOfferNumber, invoicePrefix, nextInvoiceNumber
- defaultIntroText, defaultFooterText
- labels (customizable PDF text - see below)
- theme, dateFormat

### Document Labels (in Settings)
User-customizable labels for PDF generation (no i18n, just editable strings):
- Document titles: offerTitle, invoiceTitle
- Metadata: documentDateLabel, dueDateLabel, offerNumberLabel, invoiceNumberLabel
- Customer section: customerSectionTitleOffer, customerSectionTitleInvoice
- Intro/notes sections: introSectionLabel, notesSectionLabel
- Table headers: descriptionLabel, quantityLabel, unitPriceLabel, amountLabel
- Totals: subtotalLabel, taxLabel, totalLabel
- Payment terms: paymentTermsTitleOffer, paymentTermsTitleInvoice
- Footer: thankYouText, questionsTextOffer, questionsTextInvoice (with {company}, {email}, {phone} placeholders)

Preset available: `DUTCH_LABELS` for Dutch businesses

---

## Naive UI Components Reference

| Feature | Components |
|---------|------------|
| Layout | `n-layout`, `n-layout-sider`, `n-layout-content`, `n-layout-header` |
| Navigation | `n-menu` |
| Data Display | `n-data-table`, `n-descriptions`, `n-card`, `n-tag` |
| Forms | `n-form`, `n-form-item`, `n-input`, `n-select`, `n-date-picker`, `n-input-number` |
| Dynamic | `n-dynamic-input` (for line items) |
| Feedback | `n-modal`, `n-message`, `n-notification`, `n-spin` |
| Actions | `n-button`, `n-popconfirm`, `n-dropdown` |
| Spacing | `n-space`, `n-flex`, `n-grid` |
| Other | `n-upload`, `n-divider`, `n-icon`, `n-tabs` |

---

## Key Principles

1. **No custom CSS** - Use Naive UI components exclusively
2. **Shared DTOs** - Single source of truth for types
3. **Unified Document model** - Offers and invoices share the same structure
4. **Versioned storage** - JSON with semver for migrations
5. **Split documents** - One file per document for scalability
6. **Atomic writes** - Use `atomically` package to prevent corruption
7. **Single app** - Electron spawns backend automatically
8. **TypeScript strict** - Full type safety everywhere

---

## Dependencies

### Shared Package
- `atomically` - Atomic file writes

### Backend Package
- `express` - HTTP server
- `cors` - CORS middleware
- `uuid` - Generate unique IDs
- (No PDF library - uses Electron's built-in printToPDF)

### Frontend Package
- `vue` - UI framework
- `vue-router` - Routing
- `pinia` - State management
- `naive-ui` - UI components
- `@vicons/ionicons5` - Icons for Naive UI

### Electron
- `electron` - Desktop app framework
- `electron-builder` - Packaging
