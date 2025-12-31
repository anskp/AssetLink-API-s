#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const FIREBLOCKS_API_KEY = process.env.FIREBLOCKS_API_KEY;
const FIREBLOCKS_SECRET_KEY_PATH = process.env.FIREBLOCKS_SECRET_KEY_PATH || './fireblocks_secret.key';
const FIREBLOCKS_BASE_URL = process.env.FIREBLOCKS_BASE_URL || 'https://sandbox-api.fireblocks.io';

async function fireblocksRequest(path, method = 'GET', payload = null) {
  const secretKey = fs.readFileSync(FIREBLOCKS_SECRET_KEY_PATH, 'utf8');
  const data = payload ? JSON.stringify(payload) : '';
  
  const token = {
    uri: path,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 55,
    sub: FIREBLOCKS_API_KEY,
    bodyHash: crypto.createHash('sha256').update(data).digest('hex')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(token)).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${encodedHeader}.${encodedPayload}`), {
    key: secretKey,
    padding: crypto.constants.RSA_PKCS1_PADDING
  }).toString('base64url');

  const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;
  const url = new URL(FIREBLOCKS_BASE_URL);
  
  const options = {
    hostname: url.hostname,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': FIREBLOCKS_API_KEY,
      'Authorization': `Bearer ${jwt}`
    }
  };

  if (method !== 'GET' && data) {
    options.headers['Content-Length'] = data.length;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', reject);
    
    if (method !== 'GET' && data) {
      req.write(data);
    }
    req.end();
  });
}

async function main() {
  console.log('Fetching tokenization links...\n');
  const response = await fireblocksRequest('/v1/tokenization/tokens');
  
  console.log('Response type:', typeof response);
  console.log('Is array:', Array.isArray(response));
  console.log('\nFull response:');
  console.log(JSON.stringify(response, null, 2));
}

main();
