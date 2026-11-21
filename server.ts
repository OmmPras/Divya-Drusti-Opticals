import 'dotenv/config';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, verifyCsrfForCookieMutations } from './server/auth.ts';
import { initDatabase } from './server/db.ts';
import { addSseClient, removeSseClient } from './server/events.ts';
import adminRoutes from './server/routes/adminRoutes.ts';
import appointmentRoutes from './server/routes/appointmentRoutes.ts';
import authRoutes from './server/routes/authRoutes.ts';
import billingRoutes from './server/routes/billingRoutes.ts';
import examRoutes from './server/routes/examRoutes.ts';
import patientRoutes from './server/routes/patientRoutes.ts';
import productRoutes from './server/routes/productRoutes.ts';

async function startServer() {
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // CSRF check for cookie-authenticated mutations
  app.use('/api', verifyCsrfForCookieMutations);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Divya Drusti Opticals API' });
  });

  // Real-time Server-Sent Events stream for automatic Admin & Doctor dashboard updates
  app.get('/api/events/stream', requireAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = crypto.randomUUID();
    addSseClient({
      id: clientId,
      userId: req.authUser!.id,
      role: req.authUser!.role,
      res,
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, role: req.authUser!.role })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeSseClient(clientId);
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/bills', billingRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Divya Drusti Opticals server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
