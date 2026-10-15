import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './src/lib/apiHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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
        }
      }

      let body: string | undefined = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
        body = JSON.stringify(req.body);
        if (!headers.get('content-type')) {
          headers.set('content-type', 'application/json');
        }
      }

      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
      });

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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
