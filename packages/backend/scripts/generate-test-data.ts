/**
 * Generate Test Data Script
 *
 * Creates customers and 1000 invoices spread over 5 years for testing purposes.
 * Run with: npm run generate-test-data --workspace=@crm-local/backend
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import type {
  DocumentDto,
  DocumentItemDto,
  DocumentCustomerSnapshotDto,
  DocumentFileDto,
  InvoiceStatus,
  CustomerDto,
  DatabaseDto,
} from '@crm-local/shared';
import { createDocumentFile } from '@crm-local/shared';
import { writeJsonFile, safeReadJsonFile } from '@crm-local/shared/utils';

// Configuration
const TOTAL_CUSTOMERS = 50; // Generate 50 customers
const TOTAL_INVOICES = 1000;
const YEARS_SPAN = 5;
const DATA_PATH = join(import.meta.dirname, '..', 'data');
const INVOICES_PATH = join(DATA_PATH, 'invoices');

// Sample data for generating realistic data
const COMPANY_NAMES = [
  'Tech Solutions BV',
  'Digital Agency NL',
  'Creative Studio',
  'Web Experts',
  'Cloud Services BV',
  'Data Analytics Co',
  'Marketing Pro',
  'Design House',
  'Software Factory',
  'IT Consultancy',
  'Mobile Apps BV',
  'E-commerce Solutions',
  'Startup Hub',
  'Innovation Labs',
  'Business Solutions',
  'NetWorks BV',
  'Smart Systems',
  'Future Tech',
  'Code Masters',
  'Digital Pioneers',
];

const FIRST_NAMES = [
  'Jan', 'Pieter', 'Klaas', 'Willem', 'Hendrik', 'Johan', 'Cornelis', 'Dirk',
  'Maria', 'Anna', 'Elisabeth', 'Johanna', 'Catharina', 'Margaretha', 'Petronella',
  'Thomas', 'Lucas', 'Emma', 'Sophie', 'Daan', 'Sem', 'Lieke', 'Sanne',
  'Bram', 'Finn', 'Luuk', 'Jesse', 'Milan', 'Julia', 'Tess', 'Fleur',
];

const LAST_NAMES = [
  'de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen',
  'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos',
  'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'Vermeer', 'van Dam',
];

const CITIES = [
  'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen',
  'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Apeldoorn', 'Haarlem', 'Arnhem',
  'Enschede', 'Zaanstad', 'Amersfoort', 'Maastricht', 'Leiden', 'Dordrecht',
];

const STREETS = [
  'Hoofdstraat', 'Kerkstraat', 'Molenweg', 'Dorpsstraat', 'Schoolstraat',
  'Stationsweg', 'Nieuwstraat', 'Parkweg', 'Industrieweg', 'Marktplein',
  'Beatrixlaan', 'Wilhelminastraat', 'Julianaweg', 'Oranjelaan', 'Prins Bernhardstraat',
];

const SERVICE_DESCRIPTIONS = [
  'Website Development',
  'Mobile App Development',
  'UI/UX Design',
  'SEO Optimization',
  'Digital Marketing Campaign',
  'Cloud Infrastructure Setup',
  'Database Optimization',
  'API Integration',
  'Security Audit',
  'Performance Optimization',
  'Consulting Services',
  'Training & Workshop',
  'Maintenance & Support',
  'Custom Software Development',
  'E-commerce Platform Setup',
  'CRM Implementation',
  'Data Migration',
  'System Integration',
  'Technical Documentation',
  'Project Management',
];

// Weighted status distribution (more paid invoices)
const STATUS_WEIGHTS = {
  draft: 5,
  sent: 15,
  paid: 60,
  overdue: 15,
  cancelled: 5,
};

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function weightedRandomStatus(): InvoiceStatus {
  const totalWeight = Object.values(STATUS_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [status, weight] of Object.entries(STATUS_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return status as InvoiceStatus;
    }
  }
  return 'paid';
}

function generatePostalCode(): string {
  return `${randomInt(1000, 9999)} ${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}`;
}

function generateEmail(name: string, company: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  const cleanCompany = company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  return `${cleanName}@${cleanCompany}.nl`;
}

function generatePhone(): string {
  return `06-${randomInt(10000000, 99999999)}`;
}

// Generate a full customer for the database
function generateFullCustomer(): CustomerDto {
  const firstName = randomElement(FIRST_NAMES);
  const lastName = randomElement(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const company = randomElement(COMPANY_NAMES);
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name,
    email: generateEmail(name, company),
    phone: generatePhone(),
    company,
    address: {
      street: `${randomElement(STREETS)} ${randomInt(1, 200)}`,
      postalCode: generatePostalCode(),
      city: randomElement(CITIES),
      country: 'Netherlands',
    },
    createdAt: now,
    updatedAt: now,
  };
}

// Convert a CustomerDto to a DocumentCustomerSnapshotDto
function customerToSnapshot(customer: CustomerDto): DocumentCustomerSnapshotDto {
  return {
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    street: customer.address?.street,
    postalCode: customer.address?.postalCode ?? '',
    city: customer.address?.city ?? '',
    country: customer.address?.country,
  };
}

// Generate line items for an invoice
function generateLineItems(): DocumentItemDto[] {
  const itemCount = randomInt(1, 5);
  const items: DocumentItemDto[] = [];

  for (let i = 0; i < itemCount; i++) {
    const quantity = randomInt(1, 20);
    const unitPrice = randomFloat(50, 500);

    items.push({
      id: uuidv4(),
      description: randomElement(SERVICE_DESCRIPTIONS),
      quantity,
      unitPrice,
      total: quantity * unitPrice,
    });
  }

  return items;
}

// Generate a single invoice using a real customer
function generateInvoice(
  invoiceNumber: number,
  date: Date,
  taxRate: number,
  customer: CustomerDto
): DocumentDto {
  const id = uuidv4();
  const items = generateLineItems();

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const year = date.getFullYear();
  const documentNumber = `INV-${year}-${String(invoiceNumber).padStart(4, '0')}`;

  // Due date is 14-30 days after invoice date
  const paymentTermDays = randomInt(14, 30);
  const dueDate = new Date(date);
  dueDate.setDate(dueDate.getDate() + paymentTermDays);

  const status = weightedRandomStatus();

  // Adjust status based on date
  const now = new Date();
  let finalStatus = status;

  if (status === 'sent' && dueDate < now) {
    finalStatus = Math.random() > 0.3 ? 'overdue' : 'paid';
  }

  if (status === 'draft' && date < new Date(now.getFullYear() - 1, 0, 1)) {
    finalStatus = Math.random() > 0.5 ? 'paid' : 'cancelled';
  }

  const createdAt = date.toISOString();
  const updatedAt = date.toISOString();

  return {
    id,
    documentType: 'invoice',
    documentNumber,
    documentTitle: `Invoice ${documentNumber}`,
    customerId: customer.id,
    customer: customerToSnapshot(customer),
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status: finalStatus,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'draft',
        timestamp: createdAt,
      },
      ...(finalStatus !== 'draft'
        ? [
            {
              fromStatus: 'draft' as const,
              toStatus: finalStatus,
              timestamp: new Date(
                date.getTime() + randomInt(1, 7) * 24 * 60 * 60 * 1000
              ).toISOString(),
            },
          ]
        : []),
    ],
    paymentTermDays,
    dueDate: dueDate.toISOString(),
    introText: 'Thank you for your business. Please find the invoice below.',
    notesText: '',
    footerText: `Payment due within ${paymentTermDays} days. Bank: NL00BANK0123456789`,
    createdAt,
    updatedAt,
  };
}

// Main function
async function main(): Promise<void> {
  console.log('Starting test data generation...\n');

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - YEARS_SPAN + 1;

  // Load existing database
  const dbPath = join(DATA_PATH, 'database.json');
  const dbResult = await safeReadJsonFile<DatabaseDto>(dbPath);
  
  if (!dbResult.success) {
    console.error('Failed to load database.json');
    process.exit(1);
  }

  const db = dbResult.data;

  // Step 1: Generate customers
  console.log(`Generating ${TOTAL_CUSTOMERS} customers...`);
  const customers: CustomerDto[] = [];
  
  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    customers.push(generateFullCustomer());
  }

  // Add customers to database (replace existing test customers, keep manually created ones)
  // We'll append new customers
  db.customers = [...db.customers, ...customers];
  
  console.log(`  Added ${customers.length} customers to database\n`);

  // Step 2: Generate invoices using the customers
  console.log(`Generating ${TOTAL_INVOICES} invoices from ${startYear} to ${currentYear}...`);

  const invoiceCountByYear: Record<number, number> = {};
  const invoices: { date: Date; invoice: DocumentDto }[] = [];

  for (let i = 0; i < TOTAL_INVOICES; i++) {
    const date = randomDate(startYear, currentYear);
    const year = date.getFullYear();

    if (!invoiceCountByYear[year]) {
      invoiceCountByYear[year] = 0;
    }
    invoiceCountByYear[year]++;

    // Randomly select VAT rate (mostly 21%, some 9%, rare 0%)
    const taxRateRandom = Math.random();
    let taxRate: number;
    if (taxRateRandom < 0.85) {
      taxRate = 21;
    } else if (taxRateRandom < 0.95) {
      taxRate = 9;
    } else {
      taxRate = 0;
    }

    // Pick a random customer from our generated customers
    const customer = randomElement(customers);
    const invoice = generateInvoice(invoiceCountByYear[year], date, taxRate, customer);
    invoices.push({ date, invoice });
  }

  // Sort by date
  invoices.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Renumber invoices sequentially per year
  const yearCounters: Record<number, number> = {};

  for (const { invoice } of invoices) {
    const year = new Date(invoice.createdAt).getFullYear();
    if (!yearCounters[year]) {
      yearCounters[year] = 0;
    }
    yearCounters[year]++;

    invoice.documentNumber = `INV-${year}-${String(yearCounters[year]).padStart(4, '0')}`;
    invoice.documentTitle = `Invoice ${invoice.documentNumber}`;
  }

  // Create year directories and save invoices
  const yearStats: Record<number, { count: number; total: number }> = {};

  for (const { invoice } of invoices) {
    const year = new Date(invoice.createdAt).getFullYear();
    const yearPath = join(INVOICES_PATH, String(year));

    await mkdir(yearPath, { recursive: true });

    const filePath = join(yearPath, `${invoice.documentNumber}.json`);
    const fileData: DocumentFileDto = createDocumentFile(invoice);
    await writeJsonFile(filePath, fileData);

    if (!yearStats[year]) {
      yearStats[year] = { count: 0, total: 0 };
    }
    yearStats[year].count++;
    yearStats[year].total += invoice.total;
  }

  // Update database with customers and next invoice number
  const maxYear = Math.max(...Object.keys(yearCounters).map(Number));
  db.settings.nextInvoiceNumber = (yearCounters[maxYear] ?? 0) + 1;
  await writeJsonFile(dbPath, db);

  // Print summary
  console.log('\nTest data generation complete!\n');
  
  console.log('Customers:');
  console.log(`  Generated: ${customers.length}`);
  console.log(`  Total in database: ${db.customers.length}\n`);
  
  console.log('Invoices by year:');
  console.log('-'.repeat(50));

  const sortedYears = Object.keys(yearStats).map(Number).sort();
  let grandTotal = 0;

  for (const year of sortedYears) {
    const stats = yearStats[year]!;
    grandTotal += stats.total;
    console.log(
      `  ${year}: ${stats.count} invoices, EUR ${stats.total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
    );
  }

  console.log('-'.repeat(50));
  console.log(
    `  Total: ${TOTAL_INVOICES} invoices, EUR ${grandTotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
  );
  console.log('\nDone! You can now test the app with realistic data.');
}

main().catch(console.error);
