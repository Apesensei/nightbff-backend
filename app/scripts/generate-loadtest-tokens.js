const fs = require('fs');
const path = require('path');

// Path to the file containing user IDs (one per line)
const userIdsFilePath = path.join(__dirname, 'loadtest_user_ids.txt');
// Path where the generated tokens will be saved
const tokensFilePath = path.join(__dirname, 'loadtest_tokens.json');

// Main async function to handle dynamic import
async function generateTokens() {
  try {
    // Dynamically import the ES Module helper using require.resolve to get the path
    const helperPath = require.resolve('../test/utils/jwt-test.utils.ts'); // Get path to TS file
    // Convert the file path to a file URL for dynamic import
    const helperUrl = 'file://' + path.resolve(helperPath);

    const jwtHelperModule = await import(helperUrl);
    const { generateTestJwt } = jwtHelperModule;

    if (typeof generateTestJwt !== 'function') {
        throw new Error('generateTestJwt function not found in the helper module.');
    }

    const userIds = fs.readFileSync(userIdsFilePath, 'utf-8')
      .split('\n')
      .map(id => id.trim())
      .filter(id => id); // Filter out empty lines

    if (userIds.length === 0) {
      throw new Error(`No user IDs found in ${userIdsFilePath}. Make sure the file exists and contains IDs.`);
    }

    console.log(`Found ${userIds.length} user IDs. Generating tokens...`);

    // The helper loads .env.test itself, no need to set process.env.JWT_SECRET here

    // Generate tokens sequentially using async/await with Promise.all
    const tokenPromises = userIds.map(userId => {
      // Assuming generateTestJwt takes a payload like { userId }
      // Adjust payload if your helper expects something different
      // The helper is async, so we await its promise
      return generateTestJwt({ userId });
    });

    const tokens = await Promise.all(tokenPromises);

    // Write the tokens as a JSON array to the output file
    fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2));
    console.log(`Successfully generated ${tokens.length} tokens and saved to ${tokensFilePath}`);

  } catch (error) {
    console.error('Error generating tokens:', error);
    process.exit(1); // Exit with error code
  }
}

// Execute the main function
generateTokens(); 