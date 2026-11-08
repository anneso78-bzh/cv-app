import PDFDocument from 'pdfkit';
import type { CVData, Experience } from '../../src/app/core/models/cv-data.model';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = PAGE_HEIGHT - MARGIN - 20;
const COLORS = {
  ink: '#172033',
  body: '#374151',
  muted: '#64748b',
  accent: '#087e9b',
  line: '#d8e0e8',
  pale: '#eff6f8'
};

export async function createCvPdf(data: CVData): Promise<Buffer> {
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
    bufferPages: true,
    info: {
      Title: `${data.identity.name} - CV`,
      Author: data.identity.name,
      Subject: 'CV - Composition documentaire, développement et protection des données'
    }
  });
  const chunks: Buffer[] = [];

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  document.on('pageAdded', () => {
    drawWhitePage(document);
  });

  drawWhitePage(document);
  let y = MARGIN;

  document.font('Helvetica-Bold').fontSize(23).fillColor(COLORS.ink)
    .text(data.identity.name, MARGIN, y, { width: CONTENT_WIDTH });
  y = document.y + 3;
  document.font('Helvetica').fontSize(10).fillColor(COLORS.accent)
    .text(data.identity.title, MARGIN, y, { width: CONTENT_WIDTH });
  y = document.y + 8;

  const contact = [
    data.identity.location,
    data.identity.mobility,
    ...data.languages.map((language) => `${language.name}: ${language.level}`)
  ].join('   |   ');
  document.fontSize(8).fillColor(COLORS.muted).text(contact, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
  y = document.y + 10;

  y = sectionHeading(document, 'PROFIL', y);
  y = bodyText(document, data.summary, y, 9);
  y += 6;

  y = sectionHeading(document, 'COMPÉTENCES', y);
  for (const category of data.skills) {
    y = ensureSpace(document, y, 34);
    document.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink)
      .text(category.category, MARGIN, y, { width: CONTENT_WIDTH });
    y = document.y + 2;
    y = bodyText(document, category.items.join('  ·  '), y, 8);
    y += 5;
  }

  y = ensureSpace(document, y, 46);
  document.roundedRect(MARGIN, y, CONTENT_WIDTH, 43, 4).fill(COLORS.pale);
  document.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.accent)
    .text(data.targetEnvironments.title, MARGIN + 10, y + 7);
  document.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.ink)
    .text(data.targetEnvironments.items.join('  ·  '), MARGIN + 10, y + 20);
  document.font('Helvetica').fontSize(7).fillColor(COLORS.body)
    .text(data.targetEnvironments.note, MARGIN + 10, y + 31, { width: CONTENT_WIDTH - 20 });
  y += 54;

  y = sectionHeading(document, 'EXPÉRIENCE PROFESSIONNELLE', y);
  for (const experience of data.experiences) {
    y = drawExperience(document, experience, y);
  }

  y = ensureSpace(document, y, 40);
  y = sectionHeading(document, 'FORMATION', y);
  for (const item of data.education) {
    y = ensureSpace(document, y, 28);
    document.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.ink)
      .text(item.title, MARGIN, y, { width: CONTENT_WIDTH - 50 });
    document.font('Helvetica').fontSize(8).fillColor(COLORS.accent)
      .text(item.year, PAGE_WIDTH - MARGIN - 45, y, { width: 45, align: 'right' });
    y = Math.max(document.y, y + 10);
    document.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
      .text(item.school, MARGIN, y, { width: CONTENT_WIDTH });
    y = document.y + 5;
  }

  const pages = document.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    document.switchToPage(pages.start + index);
    document.moveTo(MARGIN, PAGE_HEIGHT - MARGIN - 14)
      .lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - 14)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    document.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
      .text(`${data.identity.name}  |  CV  |  ${index + 1}/${pages.count}`, MARGIN, PAGE_HEIGHT - MARGIN - 10, {
        width: CONTENT_WIDTH,
        align: 'right'
      });
  }

  document.end();
  return pdfPromise;
}

function drawWhitePage(document: PDFKit.PDFDocument): void {
  document.save();
  document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  document.restore();
  document.fillColor(COLORS.ink);
}

function sectionHeading(document: PDFKit.PDFDocument, title: string, y: number): number {
  y = ensureSpace(document, y, 24);
  document.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent)
    .text(title, MARGIN, y, { width: CONTENT_WIDTH });
  const lineY = document.y + 4;
  document.moveTo(MARGIN, lineY).lineTo(PAGE_WIDTH - MARGIN, lineY)
    .lineWidth(0.7).strokeColor(COLORS.line).stroke();
  return lineY + 8;
}

function bodyText(document: PDFKit.PDFDocument, text: string, y: number, size: number): number {
  document.font('Helvetica').fontSize(size).fillColor(COLORS.body)
    .text(text, MARGIN, y, { width: CONTENT_WIDTH, lineGap: 2 });
  return document.y;
}

function drawExperience(document: PDFKit.PDFDocument, experience: Experience, startY: number): number {
  let y = ensureSpace(document, startY, 62);
  document.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink)
    .text(experience.role, MARGIN, y, { width: CONTENT_WIDTH - 150 });
  document.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.accent)
    .text(experience.period, PAGE_WIDTH - MARGIN - 145, y, { width: 145, align: 'right' });
  y = Math.max(document.y, y + 12) + 2;

  document.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    .text(`${experience.company}  |  ${experience.location}`, MARGIN, y, { width: CONTENT_WIDTH });
  y = document.y + 4;

  const highlights = [...experience.ccmHighlights, ...experience.dpoHighlights];
  for (const highlight of highlights) {
    const text = `-  ${highlight}`;
    const height = document.font('Helvetica').fontSize(8).heightOfString(text, { width: CONTENT_WIDTH - 7, lineGap: 1 });
    y = ensureSpace(document, y, height + 3);
    document.font('Helvetica').fontSize(8).fillColor(COLORS.body)
      .text(text, MARGIN + 5, y, { width: CONTENT_WIDTH - 5, lineGap: 1 });
    y = document.y + 3;
  }

  document.font('Helvetica').fontSize(7).fillColor(COLORS.accent)
    .text(experience.techStack.join('  ·  '), MARGIN + 5, y, { width: CONTENT_WIDTH - 5 });
  return document.y + 9;
}

function ensureSpace(document: PDFKit.PDFDocument, y: number, requiredHeight: number): number {
  if (y + requiredHeight > BOTTOM) {
    document.addPage();
    return MARGIN;
  }
  return y;
}
