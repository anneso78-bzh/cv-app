import PDFDocument from 'pdfkit';
import type { CVData, Experience } from '../../src/app/core/models/cv-data.model';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 30;
const FOOTER_Y = PAGE_HEIGHT - PAGE_MARGIN - 18;
const CONTENT_BOTTOM = FOOTER_Y - 16;
const COLUMN_GAP = 18;
const MAIN_PANEL_PADDING = 10;
const MAIN_PANEL_TOP = 16;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const SIDEBAR_WIDTH = (CONTENT_WIDTH - COLUMN_GAP) / 3;
const SIDEBAR_X = PAGE_MARGIN;
const SIDEBAR_TEXT_X = SIDEBAR_X + 12;
const SIDEBAR_TEXT_WIDTH = SIDEBAR_WIDTH - 24;
const MAIN_PANEL_X = SIDEBAR_X + SIDEBAR_WIDTH + COLUMN_GAP / 2;
const MAIN_PANEL_WIDTH = PAGE_WIDTH - PAGE_MARGIN - MAIN_PANEL_X;
const MAIN_X = MAIN_PANEL_X + MAIN_PANEL_PADDING;
const MAIN_WIDTH = MAIN_PANEL_WIDTH - MAIN_PANEL_PADDING * 2;
const MAIN_TOP = 34;
const SIDEBAR_TOP = PAGE_MARGIN;
const SIDEBAR_BOTTOM = FOOTER_Y - 10;

const COLORS = {
  ink: '#172033',
  body: '#374151',
  muted: '#64748b',
  accent: '#087e9b',
  line: '#d8e0e8',
  sidebar: '#eff6f8',
  pale: '#e3f1f4'
};

export async function createCvPdf(data: CVData): Promise<Buffer> {
  const document = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
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

  document.on('pageAdded', () => drawPageBackground(document));

  drawPageBackground(document);
  drawSidebar(document, data);
  drawMainColumn(document, data);

  const pages = document.bufferedPageRange();
  for (let index = 0; index < pages.count; index += 1) {
    document.switchToPage(pages.start + index);
    document.moveTo(PAGE_MARGIN, FOOTER_Y)
      .lineTo(PAGE_WIDTH - PAGE_MARGIN, FOOTER_Y)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    document.font('Helvetica').fontSize(7).fillColor(COLORS.muted)
      .text(`${data.identity.name}  |  CV  |  ${index + 1}/${pages.count}`, MAIN_X, FOOTER_Y + 4, {
        width: MAIN_WIDTH,
        align: 'right'
      });
  }

  document.end();
  return pdfPromise;
}

function drawPageBackground(document: PDFKit.PDFDocument): void {
  document.save();
  document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  document.rect(0, 0, MAIN_PANEL_X - COLUMN_GAP / 2, PAGE_HEIGHT).fill(COLORS.sidebar);
  document.roundedRect(
    MAIN_PANEL_X,
    MAIN_PANEL_TOP,
    MAIN_PANEL_WIDTH,
    PAGE_HEIGHT - MAIN_PANEL_TOP * 2,
    8
  ).fillAndStroke('#ffffff', COLORS.line);
  document.restore();
  document.fillColor(COLORS.ink);
}

function drawSidebar(document: PDFKit.PDFDocument, data: CVData): void {
  const blocks: SidebarBlock[] = [
    {
      title: 'CONTACT',
      items: [
        { label: 'Téléphone', value: 'Communiqué sur demande' },
        { label: 'E-mail', value: `${['as.hamon', 'outlook.com'].join(' [at] ')}` },
        { label: 'Localisation', value: data.identity.location },
        { label: 'Mobilité', value: data.identity.mobility }
      ]
    },
    {
      title: 'SOFT SKILLS',
      items: (data.skills.find((category) => category.category === 'Soft skills')?.items ?? [])
        .map((value) => ({ value: `- ${value}` }))
    },
    {
      title: 'LANGUES',
      items: data.languages.map((language) => ({ value: `- ${language.name} · ${language.level}` }))
    },
    {
      title: 'FORMATION',
      items: data.education.map((item) => ({
        label: item.title,
        value: `${item.school} · ${item.year}`
      }))
    },
    {
      title: 'CENTRES D’INTÉRÊT',
      items: data.interests.map((value) => ({ value: `- ${value}` }))
    }
  ];
  const totalBlockHeight = blocks.reduce((total, block) => total + sidebarBlockHeight(document, block), 0);
  const gap = Math.max(0, (SIDEBAR_BOTTOM - SIDEBAR_TOP - totalBlockHeight) / (blocks.length - 1));
  let y = SIDEBAR_TOP;

  for (const block of blocks) {
    y = drawSidebarBlock(document, block, y) + gap;
  }
}

interface SidebarItem {
  label?: string;
  value: string;
}

interface SidebarBlock {
  title: string;
  items: SidebarItem[];
}

function sidebarBlockHeight(document: PDFKit.PDFDocument, block: SidebarBlock): number {
  let height = textHeight(document, block.title, 'Helvetica-Bold', 8.5, SIDEBAR_TEXT_WIDTH) + 12;
  for (const item of block.items) {
    if (item.label) {
      height += textHeight(document, item.label, 'Helvetica-Bold', 7.2, SIDEBAR_TEXT_WIDTH)
        + 1
        + textHeight(document, item.value, 'Helvetica', 7.1, SIDEBAR_TEXT_WIDTH, 1)
        + 6;
    } else {
      height += textHeight(document, item.value, 'Helvetica', 7.4, SIDEBAR_TEXT_WIDTH, 1) + 3;
    }
  }
  return height;
}

function textHeight(
  document: PDFKit.PDFDocument,
  text: string,
  font: 'Helvetica' | 'Helvetica-Bold',
  size: number,
  width: number,
  lineGap = 0
): number {
  return document.font(font).fontSize(size).heightOfString(text, { width, lineGap });
}

function drawSidebarBlock(document: PDFKit.PDFDocument, block: SidebarBlock, startY: number): number {
  let y = startY;
  document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.accent)
    .text(block.title, SIDEBAR_TEXT_X, y, { width: SIDEBAR_TEXT_WIDTH });
  const lineY = document.y + 4;
  document.moveTo(SIDEBAR_TEXT_X, lineY)
    .lineTo(SIDEBAR_TEXT_X + SIDEBAR_TEXT_WIDTH, lineY)
    .lineWidth(0.6)
    .strokeColor('#c7dce2')
    .stroke();
  y = lineY + 8;

  for (const item of block.items) {
    if (item.label) {
      document.font('Helvetica-Bold').fontSize(7.2).fillColor(COLORS.ink)
        .text(item.label, SIDEBAR_TEXT_X, y, { width: SIDEBAR_TEXT_WIDTH });
      y = document.y + 1;
      document.font('Helvetica').fontSize(7.1).fillColor(COLORS.body)
        .text(item.value, SIDEBAR_TEXT_X, y, { width: SIDEBAR_TEXT_WIDTH, lineGap: 1 });
      y = document.y + 6;
    } else {
      document.font('Helvetica').fontSize(7.4).fillColor(COLORS.body)
        .text(item.value, SIDEBAR_TEXT_X, y, { width: SIDEBAR_TEXT_WIDTH, lineGap: 1 });
      y = document.y + 3;
    }
  }
  return y;
}

function drawMainColumn(document: PDFKit.PDFDocument, data: CVData): void {
  let y = MAIN_TOP;
  document.font('Helvetica-Bold').fontSize(23).fillColor(COLORS.ink)
    .text(data.identity.name, MAIN_X, y, { width: MAIN_WIDTH });
  y = document.y + 4;

  document.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.accent)
    .text(data.identity.title, MAIN_X, y, { width: MAIN_WIDTH, lineGap: 2 });
  y = document.y + 9;

  y = drawMainHeading(document, 'PROFIL', y, data);
  y = mainText(document, data.summary, y, 8.5);
  y += 9;

  y = drawMainHeading(document, 'COMPÉTENCES', y, data);
  for (const category of data.skills.filter((item) => item.category !== 'Soft skills')) {
    y = ensureMainSpace(document, y, 34, data);
    document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.ink)
      .text(category.category, MAIN_X, y, { width: MAIN_WIDTH });
    y = document.y + 2;
    y = mainText(document, category.items.join('  ·  '), y, 7.8);
    y += 6;
  }

  y = ensureMainSpace(document, y, 48, data);
  document.roundedRect(MAIN_X, y, MAIN_WIDTH, 43, 4).fill(COLORS.pale);
  document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.accent)
    .text(data.targetEnvironments.title, MAIN_X + 9, y + 6, { width: MAIN_WIDTH - 18 });
  document.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.ink)
    .text(data.targetEnvironments.items.join('  ·  '), MAIN_X + 9, y + 18, { width: MAIN_WIDTH - 18 });
  document.font('Helvetica').fontSize(6.6).fillColor(COLORS.body)
    .text(data.targetEnvironments.note, MAIN_X + 9, y + 29, { width: MAIN_WIDTH - 18, lineGap: 1 });
  y += 53;

  y = drawMainHeading(document, 'EXPÉRIENCES PROFESSIONNELLES', y, data);
  for (const experience of data.experiences) {
    y = drawExperience(document, experience, y, data);
  }
}

function drawMainHeading(document: PDFKit.PDFDocument, title: string, startY: number, data: CVData): number {
  const y = ensureMainSpace(document, startY, 23, data);
  document.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.accent)
    .text(title, MAIN_X, y, { width: MAIN_WIDTH });
  const lineY = document.y + 3;
  document.moveTo(MAIN_X, lineY).lineTo(MAIN_X + MAIN_WIDTH, lineY)
    .lineWidth(0.65)
    .strokeColor(COLORS.line)
    .stroke();
  return lineY + 7;
}

function mainText(document: PDFKit.PDFDocument, text: string, y: number, size: number): number {
  document.font('Helvetica').fontSize(size).fillColor(COLORS.body)
    .text(text, MAIN_X, y, { width: MAIN_WIDTH, lineGap: 2 });
  return document.y;
}

function drawExperience(
  document: PDFKit.PDFDocument,
  experience: Experience,
  startY: number,
  data: CVData
): number {
  let y = ensureMainSpace(document, startY, 49, data);
  document.font('Helvetica-Bold').fontSize(8.8).fillColor(COLORS.ink)
    .text(experience.role, MAIN_X, y, { width: MAIN_WIDTH });
  y = document.y + 2;

  document.font('Helvetica-Bold').fontSize(7.3).fillColor(COLORS.accent)
    .text(experience.period, MAIN_X, y, { width: MAIN_WIDTH });
  y = document.y + 2;

  document.font('Helvetica').fontSize(7.3).fillColor(COLORS.muted)
    .text(`${experience.company}  ·  ${experience.location}`, MAIN_X, y, { width: MAIN_WIDTH });
  y = document.y + 4;

  for (const highlight of [...experience.ccmHighlights, ...experience.dpoHighlights]) {
    const text = `- ${highlight}`;
    const height = document.font('Helvetica').fontSize(7.4)
      .heightOfString(text, { width: MAIN_WIDTH - 6, lineGap: 1 }) + 3;
    y = ensureMainSpace(document, y, height, data);
    document.font('Helvetica').fontSize(7.4).fillColor(COLORS.body)
      .text(text, MAIN_X + 4, y, { width: MAIN_WIDTH - 4, lineGap: 1 });
    y = document.y + 2;
  }

  y = ensureMainSpace(document, y, 14, data);
  document.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.accent)
    .text(experience.techStack.join('  ·  '), MAIN_X + 4, y, { width: MAIN_WIDTH - 4, lineGap: 1 });
  return document.y + 8;
}

function ensureMainSpace(
  document: PDFKit.PDFDocument,
  y: number,
  requiredHeight: number,
  data: CVData
): number {
  if (y + requiredHeight > CONTENT_BOTTOM) {
    document.addPage();
    document.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
      .text(`${data.identity.name}  ·  CV (SUITE)`, MAIN_X, MAIN_TOP, { width: MAIN_WIDTH });
    document.moveTo(MAIN_X, MAIN_TOP + 16)
      .lineTo(MAIN_X + MAIN_WIDTH, MAIN_TOP + 16)
      .lineWidth(0.6)
      .strokeColor(COLORS.line)
      .stroke();
    return MAIN_TOP + 25;
  }
  return y;
}
