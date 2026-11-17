/**
 * Oak & Pixel Studio — Pricing Brochure
 * Landscape A4 tri-fold matching brochure.html design:
 *   Panel 1 (Cover):  dark/black bg, white headline, B&W image
 *   Panel 2 (About):  off-white bg, studio description, amber image, services, stats
 *   Panel 3 (Plans):  white top (pricing table) + dark bottom (contact strip)
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
  VerticalAlign, TabStopType, TabStopPosition, PageOrientation,
} = require('../node_modules/docx');
const fs   = require('fs');
const path = require('path');

// ── Colours (matching brochure.html tokens) ───────────────────────────────
const C = {
  black:      '0A0A09',
  graphite:   '161614',
  slate:      '2A2A27',
  mist:       '9B9B94',
  offWhite:   'F5F4F1',
  silk:       'EDE9E3',
  white:      'FFFFFF',
  emerald:    '1A5C3A',
  emeraldL:   '2D7A52',
  emeraldXL:  '3D9966',
};

// ── Page: A4 Landscape, zero margins (panels bleed to edge) ───────────────
// docx-js takes portrait dims + LANDSCAPE → swaps internally
// Rendered: 16838 DXA wide × 11906 DXA tall (11.69 × 8.27 in)
const W = 16838;  // landscape width
const H = 11906;  // landscape height

// 3 equal panels
const P1W = Math.floor(W / 3);       // 5612
const P2W = Math.floor(W / 3);       // 5612
const P3W = W - P1W - P2W;           // 5614

// Cell inner padding (DXA)
const PAD = { top: 280, bottom: 280, left: 300, right: 300 };
const PAD_SM = { top: 180, bottom: 180, left: 300, right: 300 };

// Inner usable width per panel (panel width − left pad − right pad)
const IW1 = P1W - PAD.left - PAD.right;   // 5012 DXA ≈ 3.48 in → 334px @96dpi
const IW2 = P2W - PAD.left - PAD.right;
const IW3 = P3W - PAD.left - PAD.right;

// ── Images ────────────────────────────────────────────────────────────────
const logoData  = fs.readFileSync(path.join(__dirname, '../images/oak-pixel-mark-hires-transparent.png'));

// ── Border helpers ────────────────────────────────────────────────────────
const bNone = { style: BorderStyle.NONE,   size: 0, color: 'auto' };
const bGrid = { style: BorderStyle.SINGLE, size: 2, color: 'EBEBEB' };
const bEm   = { style: BorderStyle.SINGLE, size: 6, color: C.emerald };
const NO_BORDERS  = { top: bNone, bottom: bNone, left: bNone, right: bNone };
const NO_TABLE_BORDERS = { top: bNone, bottom: bNone, left: bNone, right: bNone, insideH: bNone, insideV: bNone };
const TOP_BORDER  = { top: bEm,   bottom: bNone, left: bNone, right: bNone };
const ROW_BORDERS = { top: bGrid, bottom: bNone, left: bNone, right: bNone };

// ── Paragraph helpers ─────────────────────────────────────────────────────
function eyebrow(text, color = C.emeraldL, bg = false) {
  // Mono uppercase label — simulates .section-eyebrow
  return new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({ text: '—  ', font: 'Courier New', size: 14, color }),
      new TextRun({ text: text.toUpperCase(), font: 'Courier New', size: 14, color, characterSpacing: 60 }),
    ],
  });
}

function sp(before = 0, after = 0) {
  return new Paragraph({ spacing: { before, after }, children: [new TextRun('')] });
}

function rule(color = C.emerald) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color, space: 1 } },
    children: [new TextRun('')],
  });
}

// ── TABLE CELL builders ───────────────────────────────────────────────────
function cell(width, fill, children, margins = PAD) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins,
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL 1 — COVER (dark background)
// ════════════════════════════════════════════════════════════════════════════
function buildCover() {
  const logoRow = new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [
      new ImageRun({
        type: 'png', data: logoData,
        transformation: { width: 28, height: 28 },
        altText: { title: 'Logo', description: 'Oak & Pixel mark', name: 'logo' },
      }),
    ],
  });

  const brandName = new Paragraph({
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: 'Oak & Pixel', font: 'Georgia', size: 24, color: C.offWhite, bold: false })],
  });

  const brandTag = new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'WEB DESIGN AGENCY', font: 'Courier New', size: 12, color: C.mist, characterSpacing: 40 })],
  });

  const coverEyebrow = new Paragraph({
    spacing: { before: 400, after: 80 },
    children: [
      new TextRun({ text: '—  ', font: 'Courier New', size: 14, color: C.emeraldL }),
      new TextRun({ text: 'RANDBURG · SOUTH AFRICA', font: 'Courier New', size: 14, color: C.emeraldL, characterSpacing: 40 }),
    ],
  });

  const h1Line1 = new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'Websites', font: 'Georgia', size: 64, color: C.white, bold: false })],
  });
  const h1Line2 = new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'built to', font: 'Georgia', size: 64, color: C.white, bold: false })],
  });
  const h1Line3 = new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: 'perform.', font: 'Georgia', size: 64, color: C.emeraldXL, bold: false, italics: true })],
  });

  const sub = new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: 'Refined, fast websites for brands that refuse to compromise.', font: 'Arial', size: 16, color: '666663' })],
  });

  const footer = new Paragraph({
    spacing: { before: 240, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: IW1 }],
    children: [
      new TextRun({ text: 'oakandpixel.co.za', font: 'Courier New', size: 14, color: C.emeraldL }),
      new TextRun({ text: '\t2026', font: 'Courier New', size: 14, color: C.mist }),
    ],
  });

  return cell(P1W, C.black, [
    logoRow, brandName, brandTag,
    coverEyebrow,
    h1Line1, h1Line2, h1Line3,
    sub,
    sp(400),
    footer,
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL 2 — ABOUT (off-white background)
// ════════════════════════════════════════════════════════════════════════════
function buildAbout() {
  const iw = IW2;
  const half = Math.floor(iw / 2);
  const third = Math.floor(iw / 3);

  const services = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: iw, type: WidthType.DXA },
    columnWidths: [half, iw - half],
    rows: [
      ['Custom Website Design',         'Online Booking'],
      ['Lead Capture & Forms',         'Landing Pages'],
      ['CRM & Payment Integration',   'E-commerce & Portals'],
      ['Hosting & Maintenance',         'SEO & Content Updates'],
    ].map(([a, b]) => new TableRow({ children: [
      new TableCell({
        width: { size: half, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 40, bottom: 40, left: 0, right: 60 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: '· ', font: 'Arial', size: 16, color: C.emerald }),
            new TextRun({ text: a, font: 'Arial', size: 16, color: C.slate }),
          ],
        })],
      }),
      new TableCell({
        width: { size: iw - half, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: '· ', font: 'Arial', size: 16, color: C.emerald }),
            new TextRun({ text: b, font: 'Arial', size: 16, color: C.slate }),
          ],
        })],
      }),
    ]})),
  });

  const statsRow = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: iw, type: WidthType.DXA },
    columnWidths: [third, third, iw - third * 2],
    rows: [
      new TableRow({ children: [
        // First stat: dark background (matching HTML .stat-box:first-child)
        new TableCell({
          width: { size: third, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { fill: C.black, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 60 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '2026', font: 'Georgia', size: 40, color: C.white })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'FOUNDED', font: 'Courier New', size: 12, color: C.mist, characterSpacing: 20 })] }),
          ],
        }),
        new TableCell({
          width: { size: third, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { fill: C.silk, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 60 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '10', font: 'Georgia', size: 40, color: C.black })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CLIENT SLOTS', font: 'Courier New', size: 12, color: C.mist, characterSpacing: 20 })] }),
          ],
        }),
        new TableCell({
          width: { size: iw - third * 2, type: WidthType.DXA },
          borders: NO_BORDERS,
          shading: { fill: C.silk, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 0 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '3', font: 'Georgia', size: 40, color: C.black })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'WEBSITE PLANS', font: 'Courier New', size: 12, color: C.mist, characterSpacing: 20 })] }),
          ],
        }),
      ]}),
    ],
  });

  return cell(P2W, C.offWhite, [
    eyebrow('Our Studio', C.emerald),

    new Paragraph({
      spacing: { before: 80, after: 0 },
      children: [new TextRun({ text: 'We build websites', font: 'Georgia', size: 38, color: C.black })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: 'that', font: 'Georgia', size: 38, color: C.black })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: 'perform.', font: 'Georgia', size: 38, color: C.emerald, italics: true })],
    }),

    rule(C.emerald),

    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: 'Oak & Pixel Studio is a web design agency at the intersection of technology and taste. We design, build, and look after refined websites for businesses that need their online presence to match the quality of their real-world service.', font: 'Arial', size: 16, color: C.slate })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [new TextRun({ text: 'We work with a deliberately limited number of clients each year — because exceptional work demands genuine investment.', font: 'Arial', size: 16, color: C.slate })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 0 },
      children: [new TextRun({ text: '— Built to last. Designed to lead.', font: 'Georgia', size: 18, color: C.mist, italics: true })],
    }),

    sp(120),

    eyebrow('What We Do', C.emerald),
    sp(40),
    services,
    sp(160),
    statsRow,
  ]);
}

// ════════════════════════════════════════════════════════════════════════════
// PANEL 3 — PLANS + CONTACT
// ════════════════════════════════════════════════════════════════════════════
function buildPlans() {
  const iw = IW3;
  const half = Math.floor(iw / 2);

  // Plans table columns: Plan (50%) | Setup (25%) | Monthly (25%)
  const cPlan  = Math.floor(iw * 0.44);
  const cSetup = Math.floor(iw * 0.28);
  const cMonth = iw - cPlan - cSetup;

  function planRow(name, setup, monthly) {
    return new TableRow({ children: [
      new TableCell({
        width: { size: cPlan, type: WidthType.DXA },
        borders: { top: bGrid, bottom: bNone, left: bNone, right: bNone },
        margins: { top: 80, bottom: 20, left: 0, right: 40 },
        children: [new Paragraph({
          children: [new TextRun({ text: name, font: 'Georgia', size: 22, color: C.black, bold: false })],
        })],
      }),
      new TableCell({
        width: { size: cSetup, type: WidthType.DXA },
        borders: { top: bGrid, bottom: bNone, left: bNone, right: bNone },
        margins: { top: 80, bottom: 20, left: 0, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: setup, font: 'Courier New', size: 17, color: C.emerald })],
        })],
      }),
      new TableCell({
        width: { size: cMonth, type: WidthType.DXA },
        borders: { top: bGrid, bottom: bNone, left: bNone, right: bNone },
        margins: { top: 80, bottom: 20, left: 0, right: 0 },
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: monthly, font: 'Courier New', size: 17, color: C.emerald })],
        })],
      }),
    ]});
  }

  function featureRow(text) {
    return new TableRow({ children: [
      new TableCell({
        columnSpan: 3,
        width: { size: iw, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 0, bottom: 80, left: 0, right: 0 },
        children: [new Paragraph({
          children: [new TextRun({ text, font: 'Arial', size: 14, color: C.mist })],
        })],
      }),
    ]});
  }

  const plansTable = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: iw, type: WidthType.DXA },
    columnWidths: [cPlan, cSetup, cMonth],
    rows: [
      // Header row
      new TableRow({ children: [
        new TableCell({
          width: { size: cPlan, type: WidthType.DXA },
          borders: NO_BORDERS,
          margins: { top: 0, bottom: 80, left: 0, right: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Plan', font: 'Courier New', size: 14, color: C.mist, characterSpacing: 30 })] })],
        }),
        new TableCell({
          width: { size: cSetup, type: WidthType.DXA },
          borders: NO_BORDERS,
          margins: { top: 0, bottom: 80, left: 0, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Setup', font: 'Courier New', size: 14, color: C.mist, characterSpacing: 30 })] })],
        }),
        new TableCell({
          width: { size: cMonth, type: WidthType.DXA },
          borders: NO_BORDERS,
          margins: { top: 0, bottom: 80, left: 0, right: 0 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Monthly', font: 'Courier New', size: 14, color: C.mist, characterSpacing: 30 })] })],
        }),
      ]}),
      planRow('Signature',  'R8,500', 'R1,500'),
      featureRow('Up to 5 pages · Mobile-ready · Basic SEO · Hosting, domain, 2 updates/mo'),
      planRow('Growth',     'R18,500', 'R2,800'),
      featureRow('Everything in Signature · Up to 10 pages · Booking · Blog · CRM / Payments'),
      planRow('Premium',    'From R35,000', 'R5,500'),
      featureRow('Everything in Growth · Bespoke design · E-commerce / portal · Advanced integrations'),
      // Closing rule row
      new TableRow({ children: [
        new TableCell({
          columnSpan: 3,
          width: { size: iw, type: WidthType.DXA },
          borders: { top: bGrid, bottom: bNone, left: bNone, right: bNone },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ children: [new TextRun('')] })],
        }),
      ]}),
    ],
  });

  const whyGrid = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: iw, type: WidthType.DXA },
    columnWidths: [half, iw - half],
    rows: [
      ['Precision-led design',     'High-touch execution'],
      ['Senior practitioners only', 'Technology with taste'],
    ].map(([a, b]) => new TableRow({ children: [
      new TableCell({
        width: { size: half, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 40, bottom: 40, left: 0, right: 40 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: '· ', size: 16, color: C.emerald }),
            new TextRun({ text: a, font: 'Arial', size: 16, color: C.slate }),
          ],
        })],
      }),
      new TableCell({
        width: { size: iw - half, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [new Paragraph({
          children: [
            new TextRun({ text: '· ', size: 16, color: C.emerald }),
            new TextRun({ text: b, font: 'Arial', size: 16, color: C.slate }),
          ],
        })],
      }),
    ]})),
  });

  // ── White top section ──────────────────────────────────────────────────
  const whiteSection = new TableCell({
    width: { size: P3W, type: WidthType.DXA },
    borders: NO_BORDERS,
    shading: { fill: C.white, type: ShadingType.CLEAR },
    margins: PAD,
    children: [
      eyebrow('Service Plans', C.emerald),
      sp(100),
      plansTable,
      sp(80),
      new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [new TextRun({ text: 'All prices exclude VAT. Setup fees are once-off. Monthly care plan billed at start of each month. 50% deposit required to commence. Proposals valid for 30 days.', font: 'Courier New', size: 13, color: C.mist })],
      }),
      rule('EBEBEB'),
      sp(80),
      eyebrow('Why Oak & Pixel', C.emerald),
      sp(60),
      whyGrid,
    ],
  });

  // ── Dark contact strip ────────────────────────────────────────────────
  const contactGrid = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: IW3, type: WidthType.DXA },
    columnWidths: [half, IW3 - half],
    rows: [
      [['Email', 'info@oakandpixel.co.za', true], ['Phone', '+27 (75) 089 0614', false]],
      [['Web',   'oakandpixel.co.za',       true], ['Location', 'Randburg · Gauteng', false]],
    ].map(row => new TableRow({ children: row.map(([label, val, isEm]) =>
      new TableCell({
        width: { size: half, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { top: 60, bottom: 60, left: 0, right: 40 },
        children: [
          new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), font: 'Courier New', size: 12, color: '555550', characterSpacing: 30 })] }),
          new Paragraph({ children: [new TextRun({ text: val, font: 'Arial', size: 16, color: isEm ? C.emeraldL : 'CCCCC8' })] }),
        ],
      })
    )})),
  });

  const darkSection = new TableCell({
    width: { size: P3W, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: C.emeraldL, space: 0 }, bottom: bNone, left: bNone, right: bNone },
    shading: { fill: C.graphite, type: ShadingType.CLEAR },
    margins: PAD_SM,
    children: [
      eyebrow('Start a Conversation', C.emeraldL),
      sp(80),
      contactGrid,
      sp(100),
      new Paragraph({
        spacing: { before: 100, after: 0 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333330', space: 6 } },
        children: [
          new TextRun({ text: 'Ready to build something ', font: 'Georgia', size: 20, color: '66665F', italics: true }),
          new TextRun({ text: 'remarkable?', font: 'Georgia', size: 20, color: 'AAAAAA', italics: true }),
        ],
      }),
    ],
  });

  // Panel 3 = nested 2-row table (white top + dark bottom) inside outer cell
  const nestedTable = new Table({
    borders: NO_TABLE_BORDERS,
    width: { size: P3W, type: WidthType.DXA },
    columnWidths: [P3W],
    rows: [
      new TableRow({ children: [whiteSection] }),
      new TableRow({ children: [darkSection] }),
    ],
  });

  return new TableCell({
    width: { size: P3W, type: WidthType.DXA },
    borders: NO_BORDERS,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlign.TOP,
    children: [nestedTable],
  });
}

// ── Assemble document ─────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 18, color: C.black } } },
  },
  sections: [{
    properties: {
      page: {
        size: {
          width:  11906,   // short edge (portrait width → docx-js swaps for landscape)
          height: 16838,   // long edge
          orientation: PageOrientation.LANDSCAPE,
        },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
    children: [
      new Table({
        borders: NO_TABLE_BORDERS,
        width: { size: W, type: WidthType.DXA },
        columnWidths: [P1W, P2W, P3W],
        rows: [
          new TableRow({
            height: { value: H, rule: 'exact' },
            children: [
              buildCover(),
              buildAbout(),
              buildPlans(),
            ],
          }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, '../documents/oak-pixel-brochure-za.docx');
  fs.writeFileSync(out, buf);
  console.log('Written:', out, `(${(buf.length / 1024).toFixed(0)} KB)`);
}).catch(e => { console.error(e); process.exit(1); });
