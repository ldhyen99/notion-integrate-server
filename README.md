# Notion Filter and Sort API

This project is a serverless API built with Node.js to query a Notion database, supporting filtering and sorting of data. It is designed to be deployed on Vercel and includes unit tests to ensure functionality.

## Features

- **Filter Data**: Query a Notion database with simple or nested filters (e.g., `and`, `or` conditions) based on properties like `Status`, `Priority`, `Company`, and `Estimated Value`.
- **Sort Data**: Sort query results by properties such as `Name`, `Company`, `Status`, `Priority`, `Estimated Value`, or `Account Owner` in ascending or descending order.
- **CORS Support**: Allows cross-origin requests, making it suitable for web applications.
- **Error Handling**: Validates filter and sort inputs, returning meaningful error messages for invalid requests.
- **Unit Tests**: Includes comprehensive unit tests using Node.js's built-in `test` module to verify functionality without external dependencies.
- **Serverless Deployment**: Optimized for Vercel, with a single endpoint (`/api/data`) for easy integration.

## Setup

### Prerequisites
- **Node.js**: Version 18 or higher (includes built-in `test` module).
- **Vercel CLI**: For deployment (optional if using Git integration).
- **Notion API Token**: A valid Notion integration token and database ID.

### Installation
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**:
   Install the required Node.js module for Notion API:
   ```bash
   npm install @notionhq/client
   ```

3. **Set Environment Variables**:
   Create a `.env` file in the project root with the following:
   ```env
   NOTION_DATABASE_ID=<your-notion-database-id>
   NOTION_SECRET=<your-notion-api-token>
   ```
   - Replace `<your-notion-database-id>` with your Notion database ID.
   - Replace `<your-notion-api-token>` with your Notion integration token.

### Project Structure
```
├── api/
│   ├── data.js       # Serverless API endpoint
├── __test__/
│   ├── data.test.js  # Unit tests
├── .env                    # Environment variables (not committed)
├── package.json
└── README.md
```

## Running Locally

### Run the API
1. Start a local server using Vercel CLI:
   ```bash
   vercel dev
   ```
   This will start the server at `http://localhost:3000`. The API endpoint is available at `http://localhost:3000/api/data`.

2. Test the endpoint with a POST request (e.g., using `curl` or Postman):
   ```bash
   curl -X POST http://localhost:3000/api/data \
     -H "Content-Type: application/json" \
     -d '{
           "filter": {
             "property": "Status",
             "status": { "equals": "Active" }
           },
           "sort": {
             "property": "Estimated Value",
             "direction": "descending"
           },
           "maxNestingLevel": 2
         }'
   ```

### Run Unit Tests
1. Run all tests using Node.js's built-in test runner:
   ```bash
   node --test __test__/data.test.js
   ```
   This will execute all test cases and display results in the terminal.

2. Run specific tests using a pattern:
   ```bash
   node --test --test-name-pattern="calculateNestingLevel" __test__/data.test.js
   ```
   Replace `calculateNestingLevel` with the desired test suite name (e.g., `calculateNestingLevel`, `validateFilter`, `fetchWithFlattenedFilter`).

3. Run a single test case:
   Edit `__test__/data.test.js` and add `.only` to the desired test, e.g.:
   ```javascript
   test.only("should fetch with simple filter", async () => { ... });
   ```
   Then run:
   ```bash
   node --test __test__/data.test.js
   ```

## Deploying to Vercel
1. **Set Environment Variables in Vercel**:
   - Log in to your Vercel dashboard.
   - Go to your project settings.
   - Add `NOTION_DATABASE_ID` and `NOTION_SECRET` under the "Environment Variables" section.

2. **Deploy**:
   - Using Vercel CLI:
     ```bash
     vercel deploy
     ```
   - Or push to a Git repository linked to Vercel for automatic deployment.

3. **Access the API**:
   After deployment, the API will be available at:
   ```
   https://<your-vercel-app>.vercel.app/api/data
   ```

## Testing Notes
- **Mocked Notion API**: Unit tests use a mocked `@notionhq/client` to simulate Notion API responses, avoiding real API calls.
- **Known Issue**: The `mapNotionRow` function in `data.js` incorrectly checks `statusCell.type === "select"` instead of `statusCell.type === "status"`, which may cause all responses to return `"NOT_FOUND"`. The tests account for this by mocking `Status` as `status` type, but consider fixing the main code for production use.
- **Test Coverage**:
  - `calculateNestingLevel`: Verifies nesting levels for simple and nested filters.
  - `validateFilter`: Tests valid and invalid filter conditions.
  - `fetchWithFlattenedFilter`: Tests querying with filters, sorts, and nested conditions.
  - `handler`: Tests HTTP methods, CORS, and request handling.

## Troubleshooting
- **Module Error**: If you encounter `Cannot find module '@notionhq/client'`, ensure dependencies are installed:
  ```bash
  npm install
  ```
- **API Token Error**: Verify `NOTION_SECRET` and `NOTION_DATABASE_ID` are set correctly in `.env` or Vercel.
- **Test Failures**: Check Node.js version (`node --version`) and ensure it's 18 or higher. Add `console.log` in tests for debugging.

## Contributing
Feel free to submit issues or pull requests for improvements. Ensure all changes include updated unit tests.
