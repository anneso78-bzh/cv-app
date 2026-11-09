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

interface PrivateContact {
  phone: string;
  email: string;
}

export async function createCvPdf(
  data: CVData,
  privateContact?: PrivateContact
): Promise<Buffer> {
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
  drawSidebar(document, data, privateContact);
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
  document.roundedRect(
    SIDEBAR_X,
    MAIN_PANEL_TOP,
    SIDEBAR_WIDTH,
    SIDEBAR_BOTTOM - MAIN_PANEL_TOP,
    8
  ).fillAndStroke(COLORS.sidebar, COLORS.line);
  document.restore();
  document.fillColor(COLORS.ink);
}

function drawSidebar(
  document: PDFKit.PDFDocument,
  data: CVData,
  privateContact?: PrivateContact
): void {
  const blocks: SidebarBlock[] = [
    {
      title: 'CONTACT',
      items: [
        { icon: 'phone', value: privateContact?.phone ?? 'Communiqué sur demande' },
        {
          icon: 'email',
          value: privateContact?.email ?? `${['as.hamon', 'outlook.com'].join(' [at] ')}`
        },
        { icon: 'location', value: 'Rieux (56)' },
        { icon: 'mobility', value: data.identity.mobility }
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
  const gap = Math.min(13, Math.max(
    0,
    (SIDEBAR_BOTTOM - SIDEBAR_TOP - totalBlockHeight) / (blocks.length - 1)
  ));
  let y = SIDEBAR_TOP;

  for (const block of blocks) {
    y = drawSidebarBlock(document, block, y) + gap;
  }
}

interface SidebarItem {
  label?: string;
  icon?: 'phone' | 'email' | 'location' | 'mobility';
  value: string;
}

interface SidebarBlock {
  title: string;
  items: SidebarItem[];
}

function sidebarBlockHeight(document: PDFKit.PDFDocument, block: SidebarBlock): number {
  let height = textHeight(document, block.title, 'Helvetica-Bold', 10, SIDEBAR_TEXT_WIDTH) + 12;
  for (const item of block.items) {
    if (item.icon) {
      height += textHeight(document, item.value, 'Helvetica', 7.1, SIDEBAR_TEXT_WIDTH - 14, 1) + 6;
    } else if (item.label) {
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
  document.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.accent)
    .text(block.title, SIDEBAR_TEXT_X, y, { width: SIDEBAR_TEXT_WIDTH });
  const lineY = document.y + 4;
  document.moveTo(SIDEBAR_TEXT_X, lineY)
    .lineTo(SIDEBAR_TEXT_X + SIDEBAR_TEXT_WIDTH, lineY)
    .lineWidth(0.6)
    .strokeColor('#c7dce2')
    .stroke();
  y = lineY + 8;

  for (const item of block.items) {
    if (item.icon) {
      drawContactIcon(document, item.icon, SIDEBAR_TEXT_X, y - 1, 9);
      document.font('Helvetica').fontSize(7.1).fillColor(COLORS.body)
        .text(item.value, SIDEBAR_TEXT_X + 14, y, {
          width: SIDEBAR_TEXT_WIDTH - 14,
          lineGap: 1
        });
      y = document.y + 6;
    } else if (item.label) {
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

function drawContactIcon(
  document: PDFKit.PDFDocument,
  icon: NonNullable<SidebarItem['icon']>,
  x: number,
  y: number,
  size: number
): void {
  document.save()
    .translate(x, y)
    .scale(size / 24)
    .lineWidth(1.7)
    .lineCap('round')
    .lineJoin('round')
    .strokeColor(COLORS.accent);

  if (icon === 'phone') {
    document.path('M6.5 3.5 C5.2 3.5 4 4.5 4 5.8 C4 13.7 10.3 20 18.2 20 C19.5 20 20.5 18.8 20.5 17.5 L20.1 15.8 C20 15.4 19.7 15.1 19.3 15 L15.9 13.7 C15.5 13.6 15.2 13.7 14.9 14 L13.2 16.1 C10.6 14.9 8.5 12.8 7.4 10.2 L9.5 8.5 C9.8 8.2 9.9 7.9 9.8 7.5 L8.5 4.1 C8.4 3.7 8.1 3.5 7.7 3.5 Z').stroke();
  } else if (icon === 'email') {
    document.roundedRect(3, 5, 18, 14, 2).stroke();
    document.moveTo(3, 7).lineTo(12, 13).lineTo(21, 7).stroke();
  } else if (icon === 'location') {
    document.path('M12 22 C12 22 4 15 4 10 C4 5.6 7.6 2 12 2 C16.4 2 20 5.6 20 10 C20 15 12 22 12 22 Z').stroke();
    document.circle(12, 10, 2.5).stroke();
  } else {
    document.path('M5 11 L6.6 6.9 C7 6 7.6 5.5 8.5 5.5 L15.5 5.5 C16.4 5.5 17 6 17.4 6.9 L19 11 L20.5 12.5 L20.5 18 L17.5 18 L17.5 16 L6.5 16 L6.5 18 L3.5 18 L3.5 12.5 Z').stroke();
    document.moveTo(6, 11).lineTo(18, 11).stroke();
    document.circle(7, 13.5, 0.5).stroke();
    document.circle(17, 13.5, 0.5).stroke();
  }

  document.restore();
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
  y = drawProfileSummary(document, data.summary, y);
  y += 9;

  y = drawMainHeading(document, 'COMPÉTENCES', y, data);
  for (const category of data.skills.filter((item) => item.category !== 'Soft skills')) {
    y = ensureMainSpace(document, y, 34, data);
    document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.ink)
      .text(category.category, MAIN_X, y, { width: MAIN_WIDTH });
    y = document.y + 2;
    y = drawTags(document, category.items, y, data, 0);
    y += 6;

    if (category.category === 'Éditique & composition documentaire') {
      y = ensureMainSpace(document, y, 61, data);
      document.roundedRect(MAIN_X, y, MAIN_WIDTH, 51, 4).fill(COLORS.pale);
      document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.accent)
        .text(data.targetEnvironments.title, MAIN_X + 9, y + 6, { width: MAIN_WIDTH - 18 });
      document.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.ink)
        .text(data.targetEnvironments.items.join('  ·  '), MAIN_X + 9, y + 18, { width: MAIN_WIDTH - 18 });
      document.font('Helvetica').fontSize(6.6).fillColor(COLORS.body)
        .text(data.targetEnvironments.note, MAIN_X + 9, y + 29, { width: MAIN_WIDTH - 18, lineGap: 1 });
      y += 61;
    }
  }

  y += 8;
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

function drawProfileSummary(document: PDFKit.PDFDocument, summary: string, y: number): number {
  const [introduction, ...objectiveLines] = summary.split('\n');
  const objectiveMatch = objectiveLines.join(' ').match(/^Objectif\s*:\s*(.*)$/);

  if (!objectiveMatch) {
    document.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink)
      .text(summary, MAIN_X, y, { width: MAIN_WIDTH, lineGap: 2 });
    return document.y;
  }

  document.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink)
    .text(introduction, MAIN_X, y, { width: MAIN_WIDTH, lineGap: 2 });
  y = document.y + 2;

  document.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.ink)
    .text('Objectif', MAIN_X, y, { continued: true, lineGap: 2 });
  document.font('Helvetica').fontSize(8.5).fillColor(COLORS.ink)
    .text(`: ${objectiveMatch[1]}`, { width: MAIN_WIDTH, lineGap: 2 });
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
    const height = document.font('Helvetica').fontSize(7.4)
      .heightOfString(highlight, { width: MAIN_WIDTH - 10, lineGap: 1 }) + 3;
    y = ensureMainSpace(document, y, height, data);
    document.font('Helvetica').fontSize(7.4).fillColor(COLORS.body);
    document.text('-', MAIN_X + 4, y, { width: 6 });
    document.text(highlight, MAIN_X + 10, y, { width: MAIN_WIDTH - 10, lineGap: 1 });
    y = document.y + 2;
  }

  return drawTags(document, experience.techStack, y, data) + 8;
}

function drawTags(
  document: PDFKit.PDFDocument,
  items: string[],
  startY: number,
  data: CVData,
  leftOffset = 4
): number {
  const horizontalPadding = 4;
  const tagHeight = 12;
  const tagGap = 4;
  const rowGap = 3;
  const left = MAIN_X + leftOffset;
  const right = MAIN_X + MAIN_WIDTH;
  let x = left;
  let y = startY;

  document.font('Helvetica-Bold').fontSize(6.8);
  for (const item of items) {
    const textWidth = document.widthOfString(item) + 1;
    const tagWidth = textWidth + horizontalPadding * 2;
    if (x + tagWidth > right && x > left) {
      y += tagHeight + rowGap;
      x = left;
    }

    y = ensureMainSpace(document, y, tagHeight, data);
    document.roundedRect(x, y, tagWidth, tagHeight, 3)
      .fillAndStroke(COLORS.pale, COLORS.line);
    document.font('Helvetica-Bold').fontSize(6.8).fillColor(COLORS.accent);
    document.text(item, x + horizontalPadding, y + (tagHeight - 6.8) / 2 + 1, {
      width: textWidth,
      lineBreak: false
    });
    x += tagWidth + tagGap;
  }

  return items.length > 0 ? y + tagHeight : startY;
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
