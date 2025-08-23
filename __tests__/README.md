This folder contains unit tests written for Jest. To run them locally:

1. Install dev dependencies (run in project root):

   npm install --save-dev jest @types/jest ts-jest

2. Initialize Jest for TypeScript (optional):

   npx ts-jest config:init

3. Run tests:

   npx jest

Notes:
- The test files use path aliases (e.g. `@/utils/...`). Ensure Jest `moduleNameMapper` is configured the same as your tsconfig or use `ts-jest` to respect tsconfig paths.
- I did not install dev dependencies automatically. If you'd like, I can add a package.json test script and install the packages.
