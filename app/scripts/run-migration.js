const dotenv = require('dotenv');
const path = require('path');

// Changed to async immediately invoked function expression (IIFE)
// to allow top-level await if needed, although using require now.
(async function run() { 
    console.log('Starting programmatic migration execution...');

    // --- 1. Load Environment Variables ---
    const nodeEnv = process.env.NODE_ENV || 'development';
    let envFileName;
    if (nodeEnv === 'production') {
        envFileName = '.env.production';
    } else if (nodeEnv === 'performance') {
        envFileName = '.env.performance';
    } else {
        envFileName = '.env.development';
    }
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
        const dataSourcePath = path.resolve(projectRoot, 'dist/src/data-source.js');
        console.log(`Requiring DataSource from: ${dataSourcePath}`);
        const dataSourceModule = require(dataSourcePath);
        
        // Attempt to access the DataSource instance
        if (dataSourceModule && dataSourceModule.AppDataSource && typeof dataSourceModule.AppDataSource.initialize === 'function') {
            AppDataSource = dataSourceModule.AppDataSource;
            console.log('Successfully accessed AppDataSource via dataSourceModule.AppDataSource');
        } else if (dataSourceModule && dataSourceModule.default && typeof dataSourceModule.default.initialize === 'function') {
            AppDataSource = dataSourceModule.default;
            console.log('Successfully accessed AppDataSource via dataSourceModule.default');
        } else if (dataSourceModule && typeof dataSourceModule.initialize === 'function') {
            AppDataSource = dataSourceModule;
            console.log('Successfully accessed AppDataSource directly from module');
        } else {
            console.error(`Failed to find a valid DataSource instance in the module loaded from ${dataSourcePath}.`);
            console.error('dataSourceModule keys:', dataSourceModule ? Object.keys(dataSourceModule) : 'null');
            if (dataSourceModule) {
                console.error('typeof dataSourceModule.AppDataSource:', typeof dataSourceModule.AppDataSource);
                console.error('typeof dataSourceModule.default:', typeof dataSourceModule.default);
                console.error('typeof dataSourceModule.initialize:', typeof dataSourceModule.initialize);
            }
            throw new Error('Invalid DataSource module structure.');
        }
        
        if (!AppDataSource || typeof AppDataSource.initialize !== 'function') {
            // This block should ideally not be reached if the above logic works
            throw new Error('AppDataSource is not a valid DataSource instance after attempting all access methods.');
        }
        console.log('Successfully identified AppDataSource.');
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