# Agent Guidelines

Rules and conventions for AI agents working on this codebase.

---

## Database Schema Changes (CRITICAL)

When modifying DTOs in `packages/shared/src/dto/`, you MUST check if it's a breaking change.

### Breaking Changes REQUIRE a Migration

If you make a breaking change:

1. Create a migration function in `packages/backend/src/migrations/`
2. Migrations must be sequential: `1.0.0 → 1.1.0 → 2.0.0` (never skip versions)
3. Update `CURRENT_DATABASE_VERSION` or `CURRENT_INVOICE_VERSION` in `packages/shared/src/dto/database.dto.ts`
4. Test the migration with sample data from the previous version

### What Counts as a Breaking Change

| Change | Breaking? |
|--------|-----------|
| Adding a required field (no default) | YES |
| Removing a field | YES |
| Renaming a field | YES |
| Changing a field's type | YES |
| Restructuring nested objects | YES |
| Adding an optional field | NO |
| Adding a field with a default in migration | NO |

### Migration Example

```typescript
// migrations/v1.0.0-to-v1.1.0.ts
export function migrate(data: DatabaseV1_0_0): DatabaseV1_1_0 {
  return {
    ...data,
    version: '1.1.0',
    customers: data.customers.map(customer => ({
      ...customer,
      phone: customer.phone ?? '',  // New required field with default
    })),
  };
}
```

---

## Storage Rules

### JSON File Writes

Always use `atomically` (via shared utils) for writing JSON files. Never use raw `fs.writeFile`.

```typescript
// CORRECT
import { writeJsonFile } from '@crm-local/shared';
await writeJsonFile(path, data);

// WRONG - can corrupt data on crash
import { writeFile } from 'fs/promises';
await writeFile(path, JSON.stringify(data));
```

### File Structure

- Main database: `{storagePath}/database.json`
- Offers: `{storagePath}/offers/{year}/{documentNumber}.json`
- Invoices: `{storagePath}/invoices/{year}/{documentNumber}.json`

Do NOT store invoices in the main database.json file.

---

## Frontend Rules (CRITICAL)

### Naive UI Only - NO Custom CSS

**This is a strict rule.** The client explicitly requested no freestyle styling.

Use Naive UI components for EVERYTHING. Do NOT write:
- Custom CSS classes
- Inline styles (`style="..."`)
- `<style>` blocks in Vue components
- Tailwind/utility classes
- Custom HTML elements when a Naive UI component exists

```vue
<!-- ✅ CORRECT -->
<n-space vertical :size="12">
  <n-button type="primary">Save</n-button>
  <n-button>Cancel</n-button>
</n-space>

<n-flex justify="space-between" align="center">
  <n-text>Total:</n-text>
  <n-text strong>€100.00</n-text>
</n-flex>

<!-- ❌ WRONG - Custom CSS -->
<div style="display: flex; gap: 8px;">
  <button class="my-button">Save</button>
</div>

<!-- ❌ WRONG - Inline styles -->
<n-button style="margin-top: 16px;">Save</n-button>

<!-- ❌ WRONG - Custom wrapper div -->
<div class="button-container">
  <n-button>Save</n-button>
</div>
```

### When Custom CSS is Allowed

Only in these rare cases:
1. **PDF template** - HTML for Electron's printToPDF (already in reference file)
2. **Third-party integration** - If a library absolutely requires it
3. **Bug workaround** - With a comment explaining why

If you think you need custom CSS, you're probably missing a Naive UI component. Check the docs first: https://www.naiveui.com/en-US/os-theme/components/

### Naive UI Component Reference

| Need | Use |
|------|-----|
| Layout structure | `n-layout`, `n-layout-sider`, `n-layout-content`, `n-layout-header` |
| Spacing | `n-space` (gap between items) |
| Flexbox | `n-flex` (justify, align, wrap) |
| Grid | `n-grid`, `n-grid-item` |
| Container | `n-card` |
| Separator | `n-divider` |
| Text styling | `n-text`, `n-h1`-`n-h6`, `n-p` |
| Lists | `n-list`, `n-thing` |
| Empty state | `n-empty` |
| Loading | `n-spin`, `n-skeleton` |

### Spacing and Sizing

Use Naive UI's built-in props, NOT custom CSS:

```vue
<!-- ✅ CORRECT - Use component props -->
<n-space :size="24" vertical>
<n-button size="large">
<n-card :bordered="false">

<!-- ❌ WRONG - Custom spacing -->
<n-space style="margin-bottom: 24px;">
<div style="padding: 16px;">
```

---

## Internationalization (i18n) Rules

### Language Support

The application supports two languages:
- **English (en-US)** - Default
- **Dutch (nl-NL)**

### Core Rules

1. **No translation in the backend**
   - Backend returns raw values (e.g., status: "draft", "sent", etc.)
   - All translation happens in the frontend

2. **Backend value mapping**
   - If backend values need translation, create a map in the frontend
   - Map backend values to translation keys
   ```typescript
   // Example: Map backend status to translation key
   const statusKey = `status.${backendStatus}`; // "status.draft"
   const translated = t(statusKey); // "Draft" or "Concept"
   ```

3. **All visible text through label system**
   - All user-facing text must use `t()` function from vue-i18n
   - No hardcoded strings in components (except for technical/debug values)

4. **Flat label structure (no nesting)**
   - Label files use a flat key-value structure
   - No nested objects in translation files

5. **Label file structure**
   ```typescript
   {
     "en-US": {
       "draft": "Draft",
       "sent": "Sent",
       "customers.title": "Customers"
     },
     "nl-NL": {
       "draft": "Concept",
       "sent": "Verzonden",
       "customers.title": "Klanten"
     }
   }
   ```

### PDF Labels Exception

- PDF labels in settings (`DocumentLabelsDto`) are **user-customizable** and **not** part of i18n
- These are stored in the database and can be edited by users
- They are separate from the UI translation system

---

## TypeScript Rules

### Strict Mode

TypeScript strict mode is mandatory. Do not add `// @ts-ignore` or disable strict checks.

### Shared DTOs

All DTOs must live in `packages/shared/src/dto/`. Do not define types locally in backend or frontend.

```typescript
// CORRECT
import type { CustomerDto } from '@crm-local/shared';

// WRONG - duplicating types
interface Customer {
  id: string;
  name: string;
}
```

---

## Package Structure

```
packages/
├── shared/    # DTOs, utilities (used by both backend and frontend)
├── backend/   # Node.js API server
└── frontend/  # Vue 3 + Electron app
```

Changes to shared types affect both backend and frontend. Test both after modifying `packages/shared/`.
