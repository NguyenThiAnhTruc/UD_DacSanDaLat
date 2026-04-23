const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'src', 'assets', 'env.js');

const parseEnv = (content) => {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
    result[key] = value;
  }

  return result;
};

let env = {};
if (fs.existsSync(envPath)) {
  env = parseEnv(fs.readFileSync(envPath, 'utf8'));
} else {
  console.warn('[prepare:env] .env not found. Generating empty runtime config.');
}

const runtimeEnv = {
  FIREBASE_API_KEY: env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: env.FIREBASE_APP_ID || '',
  FIREBASE_MEASUREMENT_ID: env.FIREBASE_MEASUREMENT_ID || '',
  APP_PUBLIC_BASE_URL: env.APP_PUBLIC_BASE_URL || '',
  CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_UPLOAD_PRESET: env.CLOUDINARY_UPLOAD_PRESET || '',
  ENABLE_DEMO_ACCOUNT: env.ENABLE_DEMO_ACCOUNT || 'false',
  DEMO_ACCOUNT_PASSWORD: env.DEMO_ACCOUNT_PASSWORD || '',
};

const fileContent = `window.__env = ${JSON.stringify(runtimeEnv, null, 2)};\n`;
fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log(`[prepare:env] Runtime config generated: ${outputPath}`);
