const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
fs.ensureDirSync(distDir);

// Build frontend
console.log('Building frontend...');
execSync('cd frontend && npm run build', { stdio: 'inherit' });

// Create frontend and backend directories in dist
const distFrontendDir = path.join(distDir, 'frontend');
const distBackendDir = path.join(distDir, 'backend');
fs.ensureDirSync(distFrontendDir);
fs.ensureDirSync(distBackendDir);

// Copy frontend build to dist/frontend
console.log('Copying frontend build...');
fs.copySync(path.join(__dirname, 'frontend', 'build'), distFrontendDir);

// Copy backend files to dist/backend
console.log('Copying backend files...');
const backendFiles = [
    'server.py',
    'requirements.txt',
    '.env'
];

backendFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, 'backend', file))) {
        fs.copySync(
            path.join(__dirname, 'backend', file),
            path.join(distBackendDir, file)
        );
    }
});

// Create a start script for the backend
const startScript = `@echo off
cd backend
python -m venv venv
call venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
`;

fs.writeFileSync(path.join(distDir, 'start-backend.bat'), startScript);

// Create a README for the dist folder
const readme = `# Pulse Game Distribution

This folder contains the built version of the Pulse Game application.

## Structure
- frontend/: Contains the built frontend application
- backend/: Contains the backend server files
- start-backend.bat: Script to start the backend server

## Running the Application

1. Start the backend server:
   - Run start-backend.bat
   - The server will start on http://localhost:8000

2. Serve the frontend:
   - You can use any static file server to serve the frontend folder
   - For example, using Python: python -m http.server 3000 --directory frontend
   - Or using Node.js: npx serve frontend

## Environment Variables
Make sure to set up the following environment variables in backend/.env:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase anonymous key
`;

fs.writeFileSync(path.join(distDir, 'README.md'), readme);

console.log('Build completed successfully!');
console.log('Distribution files are in the dist/ directory');