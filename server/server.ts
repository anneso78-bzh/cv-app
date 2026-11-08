import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import type { CVData } from '../src/app/core/models/cv-data.model';
import { createCvPdf } from './services/cv-pdf.service';

const app = express();
const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['IP'] ?? '::';
const projectRoot = process.cwd();
const builtWebRoot = resolve(projectRoot, 'dist/cv-ccm-portfolio/browser');
const cvDataPaths = [
  resolve(builtWebRoot, 'assets/data/cv-data.json'),
  resolve(projectRoot, 'src/assets/data/cv-data.json')
];

app.get('/api/cv.pdf', async (_request, response) => {
  try {
    const dataPath = cvDataPaths.find((path) => existsSync(path));
    if (!dataPath) {
      throw new Error('CV JSON file is not available');
    }

    const cvData = JSON.parse(await readFile(dataPath, 'utf8')) as CVData;
    const pdf = await createCvPdf(cvData);
    response
      .status(200)
      .type('application/pdf')
      .setHeader('Content-Disposition', 'attachment; filename="anne-sophie-hamon-cv.pdf"')
      .setHeader('Cache-Control', 'no-store')
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
