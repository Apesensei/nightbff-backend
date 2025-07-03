import * as dotenv from 'dotenv';
import * as path from 'path';

// Load canonical test env for Jest
dotenv.config({ path: path.resolve(process.cwd(), 'config/env/test.env') }); 