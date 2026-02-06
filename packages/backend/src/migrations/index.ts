/**
 * Database Migrations
 *
 * Migrations are applied in sequence when loading a database with an older version.
 * Each migration transforms the data from one version to the next.
 */

import type { DatabaseDto } from '@crm-local/shared';
import { CURRENT_DATABASE_VERSION } from '@crm-local/shared';
import * as v1_0_0_to_v1_1_0 from './v1.0.0-to-v1.1.0';
import * as v1_1_0_to_v1_2_0 from './v1.1.0-to-v1.2.0';

/** Migration function type */
type MigrationFn = (data: unknown) => DatabaseDto;

/** Migration definition */
interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: MigrationFn;
}

/**
 * List of all migrations in order.
 * When adding a new migration:
 * 1. Create a new file: v{from}-to-v{to}.ts
 * 2. Add it to this array
 */
const migrations: Migration[] = [
  {
    fromVersion: v1_0_0_to_v1_1_0.fromVersion,
    toVersion: v1_0_0_to_v1_1_0.toVersion,
    migrate: v1_0_0_to_v1_1_0.migrate as MigrationFn,
  },
  {
    fromVersion: v1_1_0_to_v1_2_0.fromVersion,
    toVersion: v1_1_0_to_v1_2_0.toVersion,
    migrate: v1_1_0_to_v1_2_0.migrate as MigrationFn,
  },
];

/**
 * Compare semantic versions
 * @returns negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;
    if (partA !== partB) {
      return partA - partB;
    }
  }
  return 0;
}

/**
 * Run all necessary migrations on a database
 *
 * @param data The database data (may be an older version)
 * @returns The migrated database at the current version
 * @throws Error if migration path is not possible
 */
export function runMigrations(data: { version: string }): DatabaseDto {
  let currentVersion = data.version;
  let currentData: unknown = data;

  // If already at current version, no migration needed
  if (compareVersions(currentVersion, CURRENT_DATABASE_VERSION) >= 0) {
    return currentData as DatabaseDto;
  }

  console.log(`Migrating database from v${currentVersion} to v${CURRENT_DATABASE_VERSION}...`);

  // Apply migrations in sequence
  for (const migration of migrations) {
    if (
      compareVersions(currentVersion, migration.fromVersion) === 0 &&
      compareVersions(currentVersion, CURRENT_DATABASE_VERSION) < 0
    ) {
      console.log(`  Applying migration: v${migration.fromVersion} → v${migration.toVersion}`);
      currentData = migration.migrate(currentData);
      currentVersion = migration.toVersion;
    }
  }

  // Verify we reached the target version
  if (compareVersions(currentVersion, CURRENT_DATABASE_VERSION) !== 0) {
    throw new Error(
      `Migration incomplete: reached v${currentVersion} but expected v${CURRENT_DATABASE_VERSION}. ` +
        `You may need to add a migration from v${currentVersion} to v${CURRENT_DATABASE_VERSION}.`
    );
  }

  console.log(`Migration complete. Database is now at v${CURRENT_DATABASE_VERSION}`);
  return currentData as DatabaseDto;
}

/**
 * Check if a database needs migration
 */
export function needsMigration(version: string): boolean {
  return compareVersions(version, CURRENT_DATABASE_VERSION) < 0;
}
