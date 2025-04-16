const dotenv = require('dotenv');
const path = require('path');

// Changed to async immediately invoked function expression (IIFE)
// to allow top-level await if needed, although using require now.
(async function run() { 
    console.log('Starting programmatic migration execution...');

    // --- 1. Load Environment Variables ---
    const nodeEnv = process.env.NODE_ENV || 'development';
    const envFileName = nodeEnv === 'production' ? '.env.production' : '.env.development';
    const projectRoot = process.cwd(); 
    const envFilePath = path.resolve(projectRoot, envFileName);

    console.log(`Loading environment variables from: ${envFilePath}`);
    const envConfig = dotenv.config({ path: envFilePath });

    if (envConfig.error) {
        console.warn(`Warning: Could not load ${envFileName}. Falling back to system environment variables. Error:`, envConfig.error);
    }
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not set in the environment or .env file. Cannot connect to database.');
        process.exit(1); 
    }

    // --- 2. Use require to Load Compiled DataSource ---
    // Ensure this runs *after* env vars are loaded
    let AppDataSource;
    try {
        // Use require(), targeting the compiled JS file
        const dataSourcePath = path.resolve(projectRoot, 'dist/data-source.js');
        console.log(`Requiring DataSource from: ${dataSourcePath}`);
        const dataSourceModule = require(dataSourcePath);
        
        // Access the default export provided by CJS interop
        AppDataSource = dataSourceModule.default;
        
        if (!AppDataSource || typeof AppDataSource.initialize !== 'function') {
            // Fallback check if .default didn't work as expected
            if (dataSourceModule && typeof dataSourceModule.initialize === 'function') {
                AppDataSource = dataSourceModule; 
            } else {
                 throw new Error(`Failed to require a valid DataSource instance from ${dataSourcePath}. Module content: ${JSON.stringify(dataSourceModule)}`);
            }
        }
        console.log('Successfully required DataSource.');
    } catch (requireError) {
        console.error('Error requiring DataSource:', requireError);
        console.error('Ensure you have run `npm run build` successfully before running this script.');
        process.exit(1);
    }

    // --- 3. Initialize DataSource and Run Migrations ---
    try {
        console.log('Initializing DataSource...');
        await AppDataSource.initialize();
        console.log('DataSource initialized.');

        console.log('Running migrations...');
        const executedMigrations = await AppDataSource.runMigrations();

        if (executedMigrations.length > 0) {
            console.log('Successfully executed migrations:');
            executedMigrations.forEach(migration => console.log(`- ${migration.name}`));
        } else {
            console.log('No pending migrations to execute.');
        }

    } catch (migrationError) {
        console.error('Error during migration execution:', migrationError);
        process.exitCode = 1; 
    } finally {
        // --- 4. Close Connection ---
        if (AppDataSource && AppDataSource.isInitialized) { // Add check if AppDataSource exists
            console.log('Closing DataSource connection...');
            await AppDataSource.destroy();
            console.log('DataSource connection closed.');
        }
    }
    console.log('Programmatic migration execution finished.');
})(); // Immediately invoke the function 