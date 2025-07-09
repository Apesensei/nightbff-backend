import * as glob from 'glob';
import { AppDataSource } from '../src/data-source.cli';
import * as path from 'path';

describe('Migration Glob Pattern Validation', () => {
  it('should resolve migration pattern to >0 files', async () => {
    // Get the migration patterns from the data source configuration
    const options = AppDataSource.options;
    const migrationPatterns = Array.isArray(options.migrations) 
      ? options.migrations 
      : [options.migrations].filter(Boolean);

    expect(migrationPatterns.length).toBeGreaterThan(0);

    // Check each pattern resolves to at least one file
    for (const pattern of migrationPatterns) {
      if (!pattern) continue;
      
      const resolvedPattern = typeof pattern === 'string' 
        ? pattern 
        : pattern.toString();
      
      // Resolve relative to project root
      const absolutePattern = path.isAbsolute(resolvedPattern) 
        ? resolvedPattern 
        : path.join(process.cwd(), resolvedPattern);

      const files = glob.sync(absolutePattern);
      
      console.log(`Pattern: ${resolvedPattern}`);
      console.log(`Absolute: ${absolutePattern}`);
      console.log(`Resolved files: ${files.length}`);
      
      expect(files.length).toBeGreaterThan(0);
      
      // Verify all resolved files are .js files (compiled migrations)
      files.forEach(file => {
        expect(file).toMatch(/\.js$/);
      });
    }
  });

  it('should have locked migration pattern pointing to dist/', () => {
    const options = AppDataSource.options;
    const migrationPatterns = Array.isArray(options.migrations) 
      ? options.migrations 
      : [options.migrations].filter(Boolean);

    // Verify patterns are locked to dist/ directory
    migrationPatterns.forEach(pattern => {
      if (!pattern) return;
      
      const resolvedPattern = typeof pattern === 'string' 
        ? pattern 
        : pattern.toString();
      
      expect(resolvedPattern).toMatch(/dist.*migrations.*\.js$/);
    });
  });
}); 