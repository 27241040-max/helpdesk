import "dotenv/config";

import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth';
import { isAllowedOrigin } from './config';
import { requireAuth } from './middleware/require-auth';

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? 'unknown'} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ticket-management-system' });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
