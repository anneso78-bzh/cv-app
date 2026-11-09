import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';
import type { CVData } from '../src/app/core/models/cv-data.model';
import { createCvPdf } from './services/cv-pdf.service';

const app = express();
const FULL_CV_COOKIE = 'cv_full_access';
const FULL_CV_SESSION_SECONDS = 24 * 60 * 60;
const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['IP'] ?? '::';
const projectRoot = process.cwd();
const builtWebRoot = resolve(projectRoot, 'dist/cv-ccm-portfolio/browser');
const cvDataPaths = [
  resolve(builtWebRoot, 'assets/data/cv-data.json'),
  resolve(projectRoot, 'src/assets/data/cv-data.json')
];

function getPrivateContact(): { phone: string; email: string } | null {
  const phone = process.env['CV_PRIVATE_PHONE']?.trim();
  const email = process.env['CV_PRIVATE_EMAIL']?.trim();
  const token = process.env['CV_FULL_CV_TOKEN'];

  if (!phone || !email || !token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) {
    return null;
  }
  return { phone, email };
}

function isValidToken(candidate: string, expected: string): boolean {
  const candidateHash = createHmac('sha256', 'cv-token-comparison').update(candidate).digest();
  const expectedHash = createHmac('sha256', 'cv-token-comparison').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

function createFullCvSession(token: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + FULL_CV_SESSION_SECONDS;
  const signature = createHmac('sha256', token).update(String(expiresAt)).digest('base64url');
  return `${expiresAt}.${signature}`;
}

function hasFullCvSession(cookieHeader: string | undefined, token: string): boolean {
  const cookie = cookieHeader?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FULL_CV_COOKIE}=`))
    ?.slice(FULL_CV_COOKIE.length + 1);
  if (!cookie) {
    return false;
  }

  const [expiresAt, signature, extra] = cookie.split('.');
  if (!expiresAt || !signature || extra !== undefined || !/^\d+$/.test(expiresAt)) {
    return false;
  }
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = createHmac('sha256', token)
    .update(expiresAt)
    .digest('base64url');
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

app.get('/api/cv-access', (request, response) => {
  const token = process.env['CV_FULL_CV_TOKEN'];
  const suppliedToken = request.query['token'];
  if (!getPrivateContact() || !token) {
    response.status(503).send('Private CV access is not configured.');
    return;
  }
  if (typeof suppliedToken !== 'string' || !isValidToken(suppliedToken, token)) {
    response.status(403).send('This private CV link is invalid.');
    return;
  }

  const isHttps = request.secure || request.get('x-forwarded-proto')?.split(',')[0].trim() === 'https';
  response
    .setHeader('Cache-Control', 'no-store')
    .setHeader('Referrer-Policy', 'no-referrer')
    .setHeader(
      'Set-Cookie',
      `${FULL_CV_COOKIE}=${createFullCvSession(token)}; HttpOnly;${isHttps ? ' Secure;' : ''} SameSite=Strict; Path=/api; Max-Age=${FULL_CV_SESSION_SECONDS}`
    )
    .redirect(303, '/');
});

app.get('/api/cv-access/status', (request, response) => {
  const token = process.env['CV_FULL_CV_TOKEN'];
  response
    .setHeader('Cache-Control', 'no-store')
    .json({ fullAccess: Boolean(token && getPrivateContact() && hasFullCvSession(request.headers.cookie, token)) });
});

app.get('/api/cv.pdf', async (request, response) => {
  try {
    const token = process.env['CV_FULL_CV_TOKEN'];
    const hasAccess = Boolean(token && hasFullCvSession(request.headers.cookie, token));
    const privateContact = hasAccess ? getPrivateContact() : null;
    if (hasAccess && !privateContact) {
      response.status(503).json({ error: 'Private CV contact details are not configured.' });
      return;
    }

    const dataPath = cvDataPaths.find((path) => existsSync(path));
    if (!dataPath) {
      throw new Error('CV JSON file is not available');
    }

    const cvData = JSON.parse(await readFile(dataPath, 'utf8')) as CVData;
    const pdf = await createCvPdf(cvData, privateContact ?? undefined);
    response
      .status(200)
      .type('application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="anne-sophie-hamon-cv${privateContact ? '-complet' : ''}.pdf"`
      )
      .setHeader('Cache-Control', 'no-store')
      .setHeader('Referrer-Policy', 'no-referrer')
      .send(pdf);
  } catch (error) {
    console.error('Unable to generate CV PDF:', error);
    if (!response.headersSent) {
      response.status(500).json({ error: 'Unable to generate the CV PDF.' });
    }
  }
});

if (existsSync(builtWebRoot)) {
  app.use(express.static(builtWebRoot));
  app.get('*path', (_request, response) => {
    response.sendFile(resolve(builtWebRoot, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`CV backend listening on ${host}:${port}`);
});
