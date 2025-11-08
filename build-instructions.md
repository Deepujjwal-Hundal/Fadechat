# Building FadeChat Executable

## Prerequisites
- Node.js installed (v18 or later)
- npm installed

## Steps to Build .exe File

1. Install dependencies (including pkg):
   ```bash
   npm install
   ```

2. Build the executable:
   ```bash
   npm run build-exe
   ```

   Or simply:
   ```bash
   npm run build
   ```

3. The executable will be created as `fadechat.exe` in the fadechat directory.

## Running the Executable

1. Double-click `fadechat.exe` to start the server
2. The server will start on `http://localhost:3000`
3. Open your browser and navigate to `http://localhost:3000`

## Notes

- The executable includes all dependencies and runs independently
- The `db` folder will be created automatically when the server first runs
- Make sure port 3000 is available before running

