import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { DOMParser, Node } from '@xmldom/xmldom';

// Ensure DOMParser and Node exist in global scope for AWS SDK S3 XML deserialization in Node.js
if (typeof (globalThis as any).DOMParser === 'undefined') {
  (globalThis as any).DOMParser = DOMParser;
}
if (typeof (globalThis as any).Node === 'undefined') {
  (globalThis as any).Node = Node;
}

import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './src/lib/apiHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : NaN;
  const PORT = (!isNaN(cliPort) && cliPort > 0) ? cliPort : (Number(process.env.PORT) || 3000);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API router using unified handleApiRequest
  app.all('/api/*', async (req, res) => {
    try {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || `localhost:${PORT}`;
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && typeof value === 'string') {
          headers.set(key, value);
        } else if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        }
      }

      let body: string | undefined = undefined;
      const upperMethod = req.method.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
        if (typeof req.body === 'string') {
          body = req.body;
        } else if (req.body !== undefined && req.body !== null) {
          body = JSON.stringify(req.body);
        }
        if (!headers.get('content-type')) {
          headers.set('content-type', 'application/json');
        }
      }

      const requestInit: RequestInit = {
        method: req.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod) && body !== undefined) {
        requestInit.body = body;
      }

      const webRequest = new Request(fullUrl, requestInit);

      const webResponse = await handleApiRequest(webRequest);

      res.status(webResponse.status);
      webResponse.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const responseBody = await webResponse.text();
      res.send(responseBody);
    } catch (err: any) {
      console.error('API Error:', err);
      res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

