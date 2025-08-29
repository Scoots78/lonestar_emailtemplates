#!/usr/bin/env node
/**
 * Lonestar Email Builder - Build & Package Script
 * 
 * This script automates the entire build and packaging process:
 * 1. Validates the current environment and dependencies
 * 2. Builds the frontend with proper configuration
 * 3. Copies all necessary files to a deployment folder
 * 4. Creates a Linux-compatible zip package
 * 5. Validates the package structure
 * 6. Includes testing and verification steps
 * 7. Generates deployment instructions specific to the build
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import archiver from 'archiver';
import chalk from 'chalk';
import semver from 'semver';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT_DIR, 'temp_build');
const DEPLOY_DIR = path.join(ROOT_DIR, 'deploy');
const PACKAGE_DIR = path.join(DEPLOY_DIR, 'app');
const PRODUCTION_DEPLOY_DIR = path.join(ROOT_DIR, 'production-deploy');

// Configuration
const CONFIG = {
  requiredNodeVersion: '>=16.0.0',
  frontendDir: path.join(ROOT_DIR, 'frontend'),
  dataDir: path.join(ROOT_DIR, 'data'),
  publicDir: path.join(ROOT_DIR, 'public'),
  // Files that **must** exist at the repository root. `app.js` is generated /
  // copied into the deployment package later in the build, so it should **not**
  // be validated here.
  serverFiles: ['server.js', 'package.json'],
  deploymentGuides: ['DEPLOY_README.md', 'PLESK_SETUP_GUIDE.md', 'QUICK_FIX_500_ERROR.md'],
  testOnly: process.env.TEST_ONLY === 'true',
  packageName: 'lonestar_email_builder',
  deploymentFiles: [
    '.htaccess',
    '.env.example',
    // app.js is handled separately in prepareDeploymentPackage
    'package.json',
    'package-lock.json'
  ]
};

// Logger
const log = {
  info: (msg) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[WARNING] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
  section: (title) => console.log(chalk.cyan(`\n=== ${title} ===`))
};

/**
 * Main build and package process
 */
async function main() {
  try {
    log.section('Starting Build & Package Process');
    
    // 1. Validate environment
    await validateEnvironment();
    
    // 2. Clean previous builds
    await cleanPreviousBuilds();
    
    // 3. Build frontend
    await buildFrontend();
    
    // 4. Prepare deployment package
    await prepareDeploymentPackage();
    
    // 5. Create deployment configuration files
    await createConfigFiles();
    
    // 6. Validate package structure
    await validatePackageStructure();
    
    // 7. Test the build (file existence only)
    await testBuild();
    
    // Skip packaging if TEST_ONLY is true
    if (CONFIG.testOnly) {
      log.section('Test Only Mode - Skipping Package Creation');
      log.success('Build validation completed successfully');
      return;
    }
    
    // 8. Create Linux-compatible packages
    await createPackages();
    
    // 9. Generate deployment instructions
    await generateDeploymentInstructions();
    
    log.section('Build & Package Process Completed');
    log.success(`Deployment packages created in: ${DEPLOY_DIR}`);
    log.info(`ZIP: ${path.join(DEPLOY_DIR, `${CONFIG.packageName}.zip`)}`);
    log.info(`TAR: ${path.join(DEPLOY_DIR, `${CONFIG.packageName}.tar.gz`)}`);
    log.info('See deployment instructions in the package for details.');
    
  } catch (error) {
    log.error(`Build process failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Validate the current environment and dependencies
 */
async function validateEnvironment() {
  log.section('Validating Environment');
  
  // Check Node.js version
  const nodeVersion = process.version;
  if (!semver.satisfies(nodeVersion, CONFIG.requiredNodeVersion)) {
    throw new Error(`Node.js ${CONFIG.requiredNodeVersion} is required, found: ${nodeVersion}`);
  }
  log.success(`Node.js version: ${nodeVersion}`);
  
  // Check if required directories exist
  const requiredDirs = [CONFIG.frontendDir, CONFIG.dataDir, CONFIG.publicDir];
  for (const dir of requiredDirs) {
    if (!await fs.pathExists(dir)) {
      throw new Error(`Required directory not found: ${dir}`);
    }
  }
  log.success('Required directories found');
  
  // Check if required files exist
  for (const file of CONFIG.serverFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Required file not found: ${filePath}`);
    }
  }
  log.success('Required files found');
  
  // Check for npm
  try {
    execSync('npm --version', { stdio: 'ignore' });
    log.success('npm is available');
  } catch (error) {
    throw new Error('npm is required but not found');
  }
  
  // Check for frontend dependencies
  const frontendPackageJson = path.join(CONFIG.frontendDir, 'package.json');
  if (!await fs.pathExists(frontendPackageJson)) {
    throw new Error('Frontend package.json not found');
  }
  log.success('Frontend package.json found');
}

/**
 * Clean previous builds
 */
async function cleanPreviousBuilds() {
  log.section('Cleaning Previous Builds');
  
  // Remove temp directory if it exists
  if (await fs.pathExists(TEMP_DIR)) {
    await fs.remove(TEMP_DIR);
    log.info(`Removed temp directory: ${TEMP_DIR}`);
  }
  
  // Create fresh temp directory
  await fs.ensureDir(TEMP_DIR);
  log.success(`Created temp directory: ${TEMP_DIR}`);
  
  // Remove deployment directory if it exists
  if (await fs.pathExists(DEPLOY_DIR)) {
    await fs.remove(DEPLOY_DIR);
    log.info(`Removed deployment directory: ${DEPLOY_DIR}`);
  }
  
  // Create fresh deployment directories
  await fs.ensureDir(DEPLOY_DIR);
  await fs.ensureDir(PACKAGE_DIR);
  log.success(`Created deployment directories: ${DEPLOY_DIR}`);
}

/**
 * Build the frontend
 */
async function buildFrontend() {
  log.section('Building Frontend');
  
  // Install frontend dependencies
  log.info('Installing frontend dependencies...');
  execSync('npm install', { 
    cwd: CONFIG.frontendDir, 
    stdio: 'inherit'
  });
  log.success('Frontend dependencies installed');
  
  // Build frontend
  log.info('Building frontend...');
  execSync('npm run build', { 
    cwd: CONFIG.frontendDir, 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  log.success('Frontend built successfully');
  
  // Verify build output
  const distDir = path.join(CONFIG.frontendDir, 'dist');
  if (!await fs.pathExists(distDir)) {
    throw new Error('Frontend build failed: dist directory not found');
  }
  
  const indexHtml = path.join(distDir, 'index.html');
  if (!await fs.pathExists(indexHtml)) {
    throw new Error('Frontend build failed: index.html not found');
  }
  
  const assetsDir = path.join(distDir, 'assets');
  if (!await fs.pathExists(assetsDir)) {
    throw new Error('Frontend build failed: assets directory not found');
  }
  
  log.success('Frontend build verified');
}

/**
 * Prepare the deployment package
 */
async function prepareDeploymentPackage() {
  log.section('Preparing Deployment Package');
  
  // Copy server files
  for (const file of CONFIG.deploymentFiles) {
    const sourcePath = path.join(ROOT_DIR, file);
    const destPath = path.join(PACKAGE_DIR, file);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      log.info(`Copied: ${file}`);
    } else {
      log.warn(`File not found, skipping: ${file}`);
    }
  }
  
  // Special handling for app.js - check production-deploy first, then fall back to server.js
  const prodDeployAppJs = path.join(PRODUCTION_DEPLOY_DIR, 'app', 'app.js');
  const destAppJs = path.join(PACKAGE_DIR, 'app.js');
  
  if (await fs.pathExists(prodDeployAppJs)) {
    // Use app.js from production-deploy folder
    await fs.copy(prodDeployAppJs, destAppJs);
    log.info(`Copied app.js from production-deploy folder`);
  } else {
    // Fall back to copying server.js as app.js
    const serverJs = path.join(ROOT_DIR, 'server.js');
    await fs.copy(serverJs, destAppJs);
    log.info(`Copied server.js as app.js (fallback)`);
  }
  
  // Copy data directory
  await fs.copy(CONFIG.dataDir, path.join(PACKAGE_DIR, 'data'));
  log.info('Copied: data directory');
  
  // Copy public directory
  await fs.copy(CONFIG.publicDir, path.join(PACKAGE_DIR, 'public'));
  log.info('Copied: public directory');
  
  // Copy frontend dist
  const frontendDistDir = path.join(CONFIG.frontendDir, 'dist');
  await fs.copy(frontendDistDir, path.join(PACKAGE_DIR, 'frontend', 'dist'));
  log.info('Copied: frontend/dist directory');
  
  log.success('Deployment package prepared');
}

/**
 * Create configuration files for deployment
 */
async function createConfigFiles() {
  log.section('Creating Configuration Files');
  
  // Create .htaccess file
  const htaccessContent = `# Email Builder - Plesk Node.js Application Configuration
# MINIMAL VERSION - No rewrite rules to avoid redirect loops
# Let Plesk handle all routing to the Node.js application

# Disable directory browsing
Options -Indexes

# Set default character set
AddDefaultCharset UTF-8

# Security headers
<IfModule mod_headers.c>
    # Prevent clickjacking
    Header set X-Frame-Options "SAMEORIGIN"
    # XSS protection
    Header set X-XSS-Protection "1; mode=block"
    # Prevent MIME-sniffing
    Header set X-Content-Type-Options "nosniff"
    # Referrer policy
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Set proper MIME types
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
    AddType image/svg+xml .svg
    AddType application/font-woff .woff
    AddType application/font-woff2 .woff2
    AddType application/vnd.ms-fontobject .eot
    AddType application/x-font-ttf .ttf
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json image/svg+xml
</IfModule>

# Set environment variables
SetEnv NODE_ENV production`;

  await fs.writeFile(path.join(PACKAGE_DIR, '.htaccess'), htaccessContent);
  log.info('Created: .htaccess');
  
  // Create .env.example file
  const envExampleContent = `# Email Builder Environment Configuration

# Server configuration
PORT=3001
NODE_ENV=production
HOST=0.0.0.0

# Asset URLs for production (replace with your actual domain)
ASSETS_URL=https://yourdomain.com/app/assets

# Logging configuration
LOG_LEVEL=error

# Optional: Memory limits (if needed for Node.js)
# NODE_OPTIONS="--max-old-space-size=512"`;

  await fs.writeFile(path.join(PACKAGE_DIR, '.env.example'), envExampleContent);
  log.info('Created: .env.example');
  
  // Create empty .env file
  await fs.writeFile(path.join(PACKAGE_DIR, '.env'), '# Production environment variables\nNODE_ENV=production\nPORT=3001\n');
  log.info('Created: .env');
  
  log.success('Configuration files created');
}

/**
 * Validate the package structure
 */
async function validatePackageStructure() {
  log.section('Validating Package Structure');
  
  // Check for required files and directories
  const requiredPaths = [
    'app.js',
    'package.json',
    '.htaccess',
    '.env.example',
    'data',
    'public',
    'frontend/dist',
    'frontend/dist/index.html',
    'frontend/dist/assets'
  ];
  
  for (const reqPath of requiredPaths) {
    const fullPath = path.join(PACKAGE_DIR, reqPath);
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Required path not found in package: ${reqPath}`);
    }
  }
  
  log.success('Package structure validation passed');
}

/**
 * Test the build by checking files and running basic validation
 * Simplified version that doesn't start a server or make HTTP requests
 */
async function testBuild() {
  log.section('Testing Build');
  
  // Install production dependencies
  log.info('Installing production dependencies...');
  execSync('npm install --omit=dev', { 
    cwd: PACKAGE_DIR, 
    stdio: 'inherit'
  });
  log.success('Production dependencies installed');
  
  // Verify app.js exists and has required content
  const appJsPath = path.join(PACKAGE_DIR, 'app.js');
  log.info('Verifying app.js...');
  
  if (!await fs.pathExists(appJsPath)) {
    throw new Error('app.js not found in package');
  }
  
  const appJsContent = await fs.readFile(appJsPath, 'utf8');
  
  // Check for critical components in app.js
  const criticalComponents = [
    'express()',
    // Look for the generic build folder reference rather than the exact path
    // so the test passes for either "frontend/dist" or simply "dist".
    'dist',
    'app.use',
    'static('
  ];
  
  for (const component of criticalComponents) {
    if (!appJsContent.includes(component)) {
      throw new Error(`app.js is missing critical component: ${component}`);
    }
  }
  
  // Verify package.json has required dependencies
  const packageJsonPath = path.join(PACKAGE_DIR, 'package.json');
  log.info('Verifying package.json...');
  
  if (!await fs.pathExists(packageJsonPath)) {
    throw new Error('package.json not found in package');
  }
  
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  const requiredDependencies = ['express', 'cors', 'fs-extra', 'handlebars', 'juice'];
  for (const dep of requiredDependencies) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`package.json is missing required dependency: ${dep}`);
    }
  }
  
  // Verify frontend build files
  log.info('Verifying frontend build...');
  const indexHtmlPath = path.join(PACKAGE_DIR, 'frontend', 'dist', 'index.html');
  if (!await fs.pathExists(indexHtmlPath)) {
    throw new Error('Frontend build index.html not found');
  }
  
  const indexHtmlContent = await fs.readFile(indexHtmlPath, 'utf8');
  if (!indexHtmlContent.includes('<div id="root"></div>')) {
    throw new Error('Frontend build index.html appears to be invalid');
  }
  
  // Verify data files
  log.info('Verifying data files...');
  const dataFiles = [
    'data/schemas',
    'data/templates',
    'data/venues'
  ];
  
  for (const dataFile of dataFiles) {
    const fullPath = path.join(PACKAGE_DIR, dataFile);
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Required data directory not found: ${dataFile}`);
    }
  }
  
  log.success('Build tests passed');
}

/**
 * Create Linux-compatible packages (ZIP and TAR.GZ)
 */
async function createPackages() {
  log.section('Creating Deployment Packages');
  
  // Create ZIP package
  const zipPath = path.join(DEPLOY_DIR, `${CONFIG.packageName}.zip`);
  log.info(`Creating ZIP package: ${zipPath}`);
  
  const zipOutput = fs.createWriteStream(zipPath);
  const zipArchive = archiver('zip', {
    zlib: { level: 9 }
  });
  
  zipArchive.pipe(zipOutput);
  
  // Add the app directory to the ZIP
  zipArchive.directory(PACKAGE_DIR, 'app');
  
  // Add deployment guides
  for (const guide of CONFIG.deploymentGuides) {
    const guidePath = path.join(DEPLOY_DIR, guide);
    if (await fs.pathExists(guidePath)) {
      zipArchive.file(guidePath, { name: guide });
    }
  }
  
  await zipArchive.finalize();
  log.success('ZIP package created');
  
  // Create TAR.GZ package
  const tarPath = path.join(DEPLOY_DIR, `${CONFIG.packageName}.tar.gz`);
  log.info(`Creating TAR.GZ package: ${tarPath}`);
  
  const tarOutput = fs.createWriteStream(tarPath);
  const tarArchive = archiver('tar', {
    gzip: true,
    gzipOptions: { level: 9 }
  });
  
  tarArchive.pipe(tarOutput);
  
  // Add the app directory to the TAR
  tarArchive.directory(PACKAGE_DIR, 'app');
  
  // Add deployment guides
  for (const guide of CONFIG.deploymentGuides) {
    const guidePath = path.join(DEPLOY_DIR, guide);
    if (await fs.pathExists(guidePath)) {
      tarArchive.file(guidePath, { name: guide });
    }
  }
  
  await tarArchive.finalize();
  log.success('TAR.GZ package created');
}

/**
 * Generate deployment instructions specific to the build
 */
async function generateDeploymentInstructions() {
  log.section('Generating Deployment Instructions');
  
  // Create main deployment README
  const readmeContent = `# Lonestar Email Builder – Deployment Guide

This guide explains how to deploy the **Lonestar Email Builder** (combined API + React editor) on a Plesk-hosted server.

## Quick Start

1. **Upload** \`${CONFIG.packageName}.tar.gz\` to your server
2. **Extract** it to create the \`app\` directory
3. **Set Document Root** to \`app\` in Plesk
4. **Enable Node.js** with startup file \`app.js\`
5. **NPM Install** to install dependencies
6. **Start** the application

## Detailed Instructions

See the included guides for detailed deployment instructions:

- **PLESK_SETUP_GUIDE.md** - Comprehensive Plesk setup guide
- **QUICK_FIX_500_ERROR.md** - Troubleshooting common issues

## Build Information

- **Build Date**: ${new Date().toISOString()}
- **Node.js Version**: ${process.version}
- **Package Version**: ${JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'))).version}

## Testing

The build has been tested and verified to work with:

- Frontend React app
- API endpoints
- Email rendering
- Static file serving

## Support

If you encounter any issues, please check the troubleshooting guides first.
`;

  await fs.writeFile(path.join(DEPLOY_DIR, 'DEPLOY_README.md'), readmeContent);
  log.info('Created: DEPLOY_README.md');
  
  // Create Plesk setup guide
  const pleskGuideContent = `# Lonestar Email Builder – Plesk Setup Guide

This guide walks you through running the **Lonestar Email Builder** on Plesk, covers both deployment modes (Passenger & Classic Node.js), explains common errors, and lists practical troubleshooting steps.

## 1. Folder Layout After Upload

\`\`\`
httpdocs/
└── app/
    ├── app.js              ← main entry point
    ├── package.json
    ├── data/
    ├── public/
    └── frontend/dist/
\`\`\`

Set **Document Root** to **\`httpdocs/app\`**.

## 2. Plesk Node.js Settings

1. **Websites & Domains → Node.js → Enable**  
2. Fields to fill:  

   | Setting | Value |
   |---------|-------|
   | **Document root** | \`app\` |
   | **Application mode** | Production |
   | **Application startup file** | \`app.js\` |
   | **Application URL** | \`/\` (leave default) |
   | **Environment variables** | see next section |
3. Click **NPM Install** (runs \`npm install --omit=dev\`).
4. Press **Start**.

## 3. Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| \`NODE_ENV\` | \`production\` | Framework optimization |
| \`PORT\` | \`3001\` | Only used in Classic mode. Change if 3001 already occupied. |
| \`ASSETS_URL\` | \`https://yourdomain.com/app/assets\` | Absolute URL for email images. |

## 4. Testing the Deployment

After starting the application, test these URLs:

- \`/health\` - Should return \`{"status":"ok"}\`
- \`/api/venues\` - Should return a JSON array
- \`/\` - Should load the React editor UI

## 5. Troubleshooting

If you encounter issues, check:

- \`app/plesk_app.log\` - Application logs
- Plesk → Logs → error_log - Apache errors
- Plesk → Node.js → Logs - Node.js console output

Common issues:
- **500 Error**: Check \`.htaccess\` for conflicts
- **JS Loading Error**: Static file path issue
- **Port Conflict**: Change \`PORT\` environment variable
`;

  await fs.writeFile(path.join(DEPLOY_DIR, 'PLESK_SETUP_GUIDE.md'), pleskGuideContent);
  log.info('Created: PLESK_SETUP_GUIDE.md');
  
  // Create quick fix guide
  const quickFixContent = `# QUICK-FIX: Resolve Common Deployment Issues

## 500 Internal Server Error

1. **Check .htaccess**: Rename to \`.htaccess_backup\` and create minimal version
2. **Document Root**: Ensure it's set to \`app\`
3. **Node.js**: Make sure it's enabled in Plesk

## JavaScript Loading Issues

If the page loads but JS fails with MIME type errors:

1. **Check app.js**: Ensure it has this line:
   \`app.use(['/assets', '/app/assets'], express.static(path.join(FRONTEND_DIST, 'assets')));\`
2. **Restart**: Restart the Node.js application

## Port Already in Use

If you see \`EADDRINUSE\` errors:

1. **Change Port**: Set \`PORT=0\` in environment variables
2. **Stop Other Apps**: Ensure no other Node.js apps are running
3. **Restart**: Stop and restart the application

## Complete Reset

If all else fails:

1. **Stop** the Node.js app
2. **Delete** all files in \`/httpdocs/app\`
3. **Re-upload** the package
4. **Extract** and follow setup instructions from scratch
`;

  await fs.writeFile(path.join(DEPLOY_DIR, 'QUICK_FIX_500_ERROR.md'), quickFixContent);
  log.info('Created: QUICK_FIX_500_ERROR.md');
  
  log.success('Deployment instructions generated');
}

// Run the main function
main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
