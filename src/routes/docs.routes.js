import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Serve OpenAPI specification
 */
router.get('/openapi.yaml', (req, res) => {
    try {
        const openapiPath = join(__dirname, '../../openapi/openapi.yaml');
        const openapi = readFileSync(openapiPath, 'utf8');
        res.setHeader('Content-Type', 'text/yaml');
        res.send(openapi);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load OpenAPI specification' });
    }
});

/**
 * Serve OpenAPI specification as JSON
 */
router.get('/openapi.json', (req, res) => {
    try {
        const openapiPath = join(__dirname, '../../openapi/openapi.yaml');
        const yaml = readFileSync(openapiPath, 'utf8');
        // For now, just serve YAML. In production, you'd convert YAML to JSON
        res.json({ message: 'Use /docs/openapi.yaml for the specification' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load OpenAPI specification' });
    }
});

export default router;
