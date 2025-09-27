/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface MigrationIssue {
  type:
    | "duplicate"
    | "invalid_naming"
    | "large_file"
    | "seed_data"
    | "broken_chain"
    | "inconsistent_structure";
  file: string;
  severity: "critical" | "warning" | "info";
  message: string;
  details?: any;
}

interface MigrationFile {
  file: string;
  path: string;
  size: number;
  hash: string;
  content: string;
  timestamp?: string;
  baseName: string;
}

export class MigrationValidator {
  // Canonical migration directory only – prevents duplicate scanning and keeps
  // validator output focused. Backup/legacy folders are ignored.
  private readonly migrationPaths = [
    path.join(process.cwd(), "src/database/migrations"),
  ];

  private readonly maxFileSize = 50000; // 50KB threshold
  private readonly seedDataKeywords = [
    "insert into",
    "seed",
    "sample",
    "test data",
    "9999999",
  ];

  async validate(): Promise<MigrationIssue[]> {
    console.log("🔍 Migration Validator: Starting comprehensive analysis...");
    const issues: MigrationIssue[] = [];

    try {
      const allMigrations = await this.scanAllMigrations();
      console.log(
        `📊 Found ${allMigrations.length} migration files across repositories`,
      );

      // Industry-standard validation checks
      issues.push(...this.findDuplicates(allMigrations));
      issues.push(...this.validateNaming(allMigrations));
      issues.push(...this.checkFileSizes(allMigrations));
      issues.push(...this.findSeedData(allMigrations));
      issues.push(...this.validateMigrationChain(allMigrations));

      console.log(`📋 Analysis complete: ${issues.length} issues found`);
      return issues;
    } catch (error) {
      console.error("❌ Migration validation failed:", error);
      issues.push({
        type: "broken_chain",
        file: "validator",
        severity: "critical",
        message: `Validation process failed: ${error.message}`,
      });
      return issues;
    }
  }

  private async scanAllMigrations(): Promise<MigrationFile[]> {
    const migrations: MigrationFile[] = [];

    for (const migrationPath of this.migrationPaths) {
      if (fs.existsSync(migrationPath)) {
        console.log(`🔍 Scanning: ${migrationPath}`);
        const files = this.getAllMigrationFiles(migrationPath);

        for (const file of files) {
          try {
            const fullPath = path.join(migrationPath, file);
            const stats = fs.statSync(fullPath);
            const content = fs.readFileSync(fullPath, "utf8");
            const hash = crypto
              .createHash("sha1")
              .update(content)
              .digest("hex");

            const migration: MigrationFile = {
              file,
              path: fullPath,
              size: stats.size,
              hash,
              content,
              baseName: this.extractBaseName(file),
              timestamp: this.extractTimestamp(file),
            };

            migrations.push(migration);
          } catch {
            console.warn(`⚠️ Could not read migration file: ${file}`);
          }
        }
      } else {
        console.log(`⚠️ Migration path not found: ${migrationPath}`);
      }
    }

    return migrations;
  }

  private getAllMigrationFiles(directory: string): string[] {
    const files: string[] = [];

    const scan = (dir: string, relativePath = "") => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);

        if (fs.statSync(fullPath).isDirectory()) {
          scan(fullPath, itemRelativePath);
        } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
          files.push(itemRelativePath);
        }
      }
    };

    scan(directory);
    return files;
  }

  private extractBaseName(filename: string): string {
    // Remove timestamp prefix and file extension
    return filename.replace(/^\d{13}-/, "").replace(/\.ts$/, "");
  }

  private extractTimestamp(filename: string): string | undefined {
    const match = filename.match(/^(\d{13})-/);
    return match ? match[1] : undefined;
  }

  private findDuplicates(migrations: MigrationFile[]): MigrationIssue[] {
    const issues: MigrationIssue[] = [];

    // Check for exact content duplicates using SHA1 hash
    const hashGroups = new Map<string, MigrationFile[]>();

    migrations.forEach((migration) => {
      if (!hashGroups.has(migration.hash)) {
        hashGroups.set(migration.hash, []);
      }
      hashGroups.get(migration.hash)!.push(migration);
    });

    // Check for basename duplicates (same logical migration)
    const baseNameGroups = new Map<string, MigrationFile[]>();

    migrations.forEach((migration) => {
      if (!baseNameGroups.has(migration.baseName)) {
        baseNameGroups.set(migration.baseName, []);
      }
      baseNameGroups.get(migration.baseName)!.push(migration);
    });

    // Report exact duplicates (critical)
    hashGroups.forEach((group, hash) => {
      if (group.length > 1) {
        const paths = group.map((m) => m.path).join(", ");
        issues.push({
          type: "duplicate",
          file: group[0].file,
          severity: "critical",
          message: `EXACT DUPLICATE: ${group.length} identical files found at: ${paths}`,
          details: {
            hash,
            files: group.map((m) => m.path),
            size: group[0].size,
          },
        });
      }
    });

    // Report basename duplicates (warnings for similar migrations)
    baseNameGroups.forEach((group, baseName) => {
      if (group.length > 1) {
        // Only report if they're not exact duplicates (already reported above)
        const uniqueHashes = new Set(group.map((m) => m.hash));
        if (uniqueHashes.size > 1) {
          issues.push({
            type: "duplicate",
            file: group[0].file,
            severity: "warning",
            message: `SIMILAR MIGRATIONS: ${group.length} files with same base name but different content`,
            details: {
              baseName,
              files: group.map((m) => ({ path: m.path, hash: m.hash })),
            },
          });
        }
      }
    });

    return issues;
  }

  private validateNaming(migrations: MigrationFile[]): MigrationIssue[] {
    const issues: MigrationIssue[] = [];

    migrations.forEach((migration) => {
      const filename = path.basename(migration.file);

      // Check for proper timestamp format (13 digits)
      if (!filename.match(/^\d{13}-[A-Z][a-zA-Z0-9]*\.ts$/)) {
        issues.push({
          type: "invalid_naming",
          file: migration.path,
          severity: "warning",
          message: `Invalid naming convention: ${filename}. Expected format: {timestamp}-{PascalCaseName}.ts`,
        });
      }

      // Check for .skip files (broken migrations)
      if (filename.includes(".skip")) {
        issues.push({
          type: "broken_chain",
          file: migration.path,
          severity: "critical",
          message: `Skipped migration found: ${filename}. This indicates a broken migration chain.`,
        });
      }

      // Check for development/temp naming patterns
      if (
        filename.toLowerCase().includes("temp") ||
        filename.toLowerCase().includes("test")
      ) {
        issues.push({
          type: "invalid_naming",
          file: migration.path,
          severity: "warning",
          message: `Temporary/test migration detected: ${filename}. Should be renamed or removed.`,
        });
      }
    });

    return issues;
  }

  private checkFileSizes(migrations: MigrationFile[]): MigrationIssue[] {
    const issues: MigrationIssue[] = [];

    migrations.forEach((migration) => {
      if (migration.size > this.maxFileSize) {
        const sizeKB = Math.round(migration.size / 1024);
        issues.push({
          type: "large_file",
          file: migration.path,
          severity: sizeKB > 100 ? "critical" : "warning",
          message: `Large migration file (${sizeKB}KB). Consider splitting into smaller, focused migrations.`,
          details: {
            sizeBytes: migration.size,
            sizeKB,
            threshold: Math.round(this.maxFileSize / 1024),
          },
        });
      }
    });

    return issues;
  }

  private findSeedData(migrations: MigrationFile[]): MigrationIssue[] {
    const issues: MigrationIssue[] = [];

    migrations.forEach((migration) => {
      const contentLower = migration.content.toLowerCase();
      const filename = path.basename(migration.file).toLowerCase();

      // Check filename for seed indicators
      if (this.seedDataKeywords.some((keyword) => filename.includes(keyword))) {
        issues.push({
          type: "seed_data",
          file: migration.path,
          severity: "warning",
          message: `Potential seed data in migration filename: ${migration.file}. Consider moving to seeds/ directory.`,
        });
      }

      // Check content for seed data patterns
      const seedPatterns = [
        /insert\s+into\s+\w+\s+\([^)]*\)\s+values\s*\(/gi,
        /insert\s+into\s+\w+\s+values\s*\(/gi,
        /'test[^']*'/gi,
        /'sample[^']*'/gi,
        /'demo[^']*'/gi,
      ];

      seedPatterns.forEach((pattern) => {
        const matches = contentLower.match(pattern);
        if (matches && matches.length > 5) {
          // More than 5 insert statements suggests seed data
          issues.push({
            type: "seed_data",
            file: migration.path,
            severity: "warning",
            message: `Potential seed data detected in migration content (${matches.length} insert statements). Consider moving to seeds/ directory.`,
            details: {
              insertCount: matches.length,
              sampleMatches: matches.slice(0, 3),
            },
          });
        }
      });
    });

    return issues;
  }

  private validateMigrationChain(
    migrations: MigrationFile[],
  ): MigrationIssue[] {
    const issues: MigrationIssue[] = [];

    // Group migrations by repository path
    const repoGroups = new Map<string, MigrationFile[]>();

    migrations.forEach((migration) => {
      const repoPath = this.getRepositoryPath(migration.path);
      if (!repoGroups.has(repoPath)) {
        repoGroups.set(repoPath, []);
      }
      repoGroups.get(repoPath)!.push(migration);
    });

    // Validate each repository's migration chain
    repoGroups.forEach((repoMigrations) => {
      const timestampedMigrations = repoMigrations
        .filter((m) => m.timestamp)
        .sort((a, b) => a.timestamp!.localeCompare(b.timestamp!));

      // Check for gaps in timestamp sequence (basic validation)
      for (let i = 1; i < timestampedMigrations.length; i++) {
        const prev = parseInt(timestampedMigrations[i - 1].timestamp!);
        const curr = parseInt(timestampedMigrations[i].timestamp!);

        // If timestamps are too close (less than 1 second apart), flag as suspicious
        if (curr - prev < 1000) {
          issues.push({
            type: "broken_chain",
            file: timestampedMigrations[i].path,
            severity: "warning",
            message: `Suspicious timestamp sequence: migrations created within 1 second of each other.`,
            details: {
              previousFile: timestampedMigrations[i - 1].file,
              currentFile: timestampedMigrations[i].file,
              timeDifference: curr - prev,
            },
          });
        }
      }
    });

    return issues;
  }

  private getRepositoryPath(_filePath: string): string {
    // Backend repo is single source of truth per ADR-018
    return "backend";
  }

  // CLI runner for immediate assessment
  async generateReport(): Promise<void> {
    console.log("🔍 MIGRATION VALIDATOR REPORT");
    console.log("=============================");
    console.log("");

    const issues = await this.validate();

    if (issues.length === 0) {
      console.log("✅ All migrations valid - no issues found");
      return;
    }

    // Group issues by severity
    const critical = issues.filter((i) => i.severity === "critical");
    const warnings = issues.filter((i) => i.severity === "warning");

    console.log(`📊 SUMMARY: ${issues.length} total issues`);
    console.log(`   🔴 Critical: ${critical.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log("");

    // Report critical issues first
    if (critical.length > 0) {
      console.log("🔴 CRITICAL ISSUES (MUST FIX):");
      console.log("==============================");
      critical.forEach((issue, index) => {
        console.log(
          `${index + 1}. ${issue.type.toUpperCase()}: ${issue.message}`,
        );
        console.log(`   File: ${issue.file}`);
        if (issue.details) {
          console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
        console.log("");
      });
    }

    // Report warnings
    if (warnings.length > 0) {
      console.log("⚠️ WARNINGS (SHOULD FIX):");
      console.log("=========================");
      warnings.forEach((issue, index) => {
        console.log(
          `${index + 1}. ${issue.type.toUpperCase()}: ${issue.message}`,
        );
        console.log(`   File: ${issue.file}`);
        console.log("");
      });
    }

    // Provide recommendations
    console.log("🎯 RECOMMENDATIONS:");
    console.log("==================");

    if (critical.some((i) => i.type === "duplicate")) {
      console.log("1. Remove duplicate migration files immediately");
      console.log("2. Establish single source of truth for migrations");
    }

    if (issues.some((i) => i.type === "large_file")) {
      console.log("3. Split large migrations into smaller, focused changes");
    }

    if (issues.some((i) => i.type === "seed_data")) {
      console.log("4. Move seed data to dedicated seeds/ directory");
    }

    if (issues.some((i) => i.type === "broken_chain")) {
      console.log("5. Fix broken migration chains and remove .skip files");
    }

    console.log("6. Implement migration governance guidelines");
    console.log("");
  }
}

// CLI runner for immediate assessment
async function runCLI() {
  const validator = new MigrationValidator();
  try {
    await validator.generateReport();
    console.log("✅ Migration validation complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration validation failed:", error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (typeof require !== "undefined" && require.main === module) {
  runCLI();
}
