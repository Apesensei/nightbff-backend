import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.test for all Jest tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') }); 