const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableLayoutType, TableOfContents, PageBreak, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── GO-1 Palette (Graphite Orange) ──
const PAL = {
  bg: "1A2330",
  primary: "2C3E50",
  body: "1A2330",
  secondary: "607080",
  accent: "E67E22",
  surface: "FDF8F3",
  table: {
    headerBg: "D4875A",
    headerText: "FFFFFF",
    accentLine: "D4875A",
    innerLine: "DDD0C8",
    surface: "F8F0EB",
  },
  cover: {
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078",
  },
};

const c = (hex) => hex.replace("#", "");
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };

// ── calcTitleLayout & calcCoverSpacing ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([
    ...',;:!?-', ...'_', ...' \t',
  ]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) {
        breakAt = i; break;
      }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
                        metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}

// ── Build Cover R4 (Top Color Block) ──
function buildCoverR4(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;

  const { titlePt, titleLines } = calcTitleLayout(config.title, 11906 - padL - padR - 200, 40, 26);
  const titleSize = titlePt * 2;

  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 1000,
  });

  const children = [];

  // Top color block
  children.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [],
    shading: { type: ShadingType.CLEAR, fill: P.accent },
  }));
  children.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [],
    shading: { type: ShadingType.CLEAR, fill: P.accent },
  }));
  children.push(new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [],
    shading: { type: ShadingType.CLEAR, fill: P.accent },
  }));

  // English label
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { before: 600, after: 400 },
      children: [new TextRun({ text: config.englishLabel, size: 18, color: P.accent,
        font: { ascii: "Calibri" }, characterSpacing: 60 })],
    }));
  }

  // Title
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: c(PAL.primary), font: { ascii: "Arial" } })],
    }));
  }

  // Subtitle
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: c(PAL.secondary),
        font: { ascii: "Calibri" } })],
    }));
  }

  // Meta lines
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 80 },
      children: [new TextRun({ text: line, size: 22, color: c(PAL.secondary),
        font: { ascii: "Calibri" } })],
    }));
  }

  // Bottom spacing
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  // Footer with accent top border
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(PAL.accent), space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: c(PAL.secondary), font: { ascii: "Calibri" } }),
      new TextRun({ text: "                                                    " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: c(PAL.secondary), font: { ascii: "Calibri" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF" }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ── Helper: Body paragraph (English, no CJK indent) ──
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(PAL.body), font: { ascii: "Times New Roman" } })],
  });
}

function bodyBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120, line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: c(PAL.primary), font: { ascii: "Times New Roman" } }),
      new TextRun({ text, size: 24, color: c(PAL.body), font: { ascii: "Times New Roman" } }),
    ],
  });
}

function mono(text) {
  return new TextRun({ text, size: 20, font: { ascii: "Consolas" }, color: c(PAL.accent) });
}

function monoLine(text) {
  return new Paragraph({
    spacing: { after: 20, line: 260 },
    indent: { left: 360 },
    children: [mono(text)],
  });
}

// ── Table builder ──
function makeTable(headers, rows, colWidths) {
  const t = PAL.table;
  const total = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: (colWidths[i] / total) * 100, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: c(t.headerBg) },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
        bottom: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
        left: NB, right: NB, insideHorizontal: NB, insideVertical: NB,
      },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 21, color: c(t.headerText), font: { ascii: "Calibri" } })] })],
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    cantSplit: true,
    children: row.map((cell, ci) => new TableCell({
      width: { size: (colWidths[ci] / total) * 100, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: ri % 2 === 0 ? c(t.surface) : "FFFFFF" },
      borders: {
        top: NB, bottom: NB, left: NB, right: NB,
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(t.innerLine) },
        insideVertical: NB,
      },
      margins: { top: 50, bottom: 50, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 21, color: c(PAL.body), font: { ascii: "Calibri" } })] })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(t.accentLine) },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(t.innerLine) },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  });
}

// ── Tree builder: converts indented path string to docx paragraphs ──
function treeSection(title, lines) {
  const items = [];
  // Section heading
  items.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160 },
    children: [new TextRun({ text: title, bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
  }));

  for (const line of lines) {
    const indent = (line.match(/^(\s*)/)[1].length);
    const trimmed = line.trim();
    if (!trimmed) continue;

    const indentTwips = indent * 180;
    const isDir = !trimmed.includes(".");
    const displayText = trimmed;

    const runProps = {
      text: displayText,
      size: 19,
      font: { ascii: "Consolas" },
      color: isDir ? c(PAL.primary) : c(PAL.body),
      bold: isDir,
    };

    items.push(new Paragraph({
      spacing: { after: 10, line: 240 },
      indent: { left: 200 + indentTwips },
      children: [new TextRun(runProps)],
    }));
  }
  return items;
}

// ── DOCUMENT CONTENT ──

// Cover config
const coverConfig = {
  title: "Multi-Vendor E-Commerce Platform",
  subtitle: "GitHub Project Structure",
  englishLabel: "PROJECT ARCHITECTURE",
  metaLines: [
    "Monorepo  |  Next.js 16  |  PostgreSQL 16  |  Prisma 6  |  Turborepo",
    "Prepared for Development Team Onboarding",
  ],
  footerLeft: "Confidential",
  footerRight: "June 2026",
  palette: {
    bg: "FFFFFF",
    accent: c(PAL.accent),
    titleColor: c(PAL.primary),
    subtitleColor: c(PAL.secondary),
    metaColor: c(PAL.secondary),
    footerColor: c(PAL.secondary),
  },
};

// ── Build body content ──
const bodyContent = [];

// TOC
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));
bodyContent.push(new TableOfContents("TOC", {
  hyperlink: true,
  headingStyleRange: "1-3",
}));
bodyContent.push(new Paragraph({
  spacing: { before: 200, after: 0 },
  children: [
    new TextRun({ text: "Note: ", italics: true, size: 20, color: c(PAL.secondary), font: { ascii: "Calibri" } }),
    new TextRun({ text: "Right-click the Table of Contents and select \"Update Field\" to refresh page numbers after opening in Word.", italics: true, size: 20, color: c(PAL.secondary), font: { ascii: "Calibri" } }),
  ],
}));
bodyContent.push(new Paragraph({ children: [new PageBreak()] }));

// ── Chapter 1: Overview ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 200, after: 160 },
  children: [new TextRun({ text: "1. Architecture Overview", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("This document defines the complete GitHub project structure for the Multi-Vendor E-Commerce Platform. The repository follows a monorepo architecture managed by Turborepo, housing three distinct Next.js 16 applications and four shared packages. This structure ensures zero code duplication, atomic commits across the entire platform, and a streamlined developer onboarding experience where a single clone and install brings the full system to life."));

bodyContent.push(body("The monorepo is organized into two primary tiers. The first tier contains the deployable applications: the Customer Storefront, the Vendor Dashboard, and the Admin Panel. Each application is a fully independent Next.js 16 project with its own configuration, routing, and deployment pipeline. The second tier contains shared packages that all three applications consume: a centralized Prisma database client, a unified authentication module with role-based access control, a shared validation library using Zod schemas, and a reusable UI component library built on shadcn/ui."));

bodyContent.push(body("Infrastructure configuration lives at the repository root and in dedicated directories. Docker Compose files provide a complete local development environment with PostgreSQL 16, Redis 7, and MinIO (S3-compatible object storage). GitHub Actions workflows handle continuous integration and per-app deployment. Environment variable templates, TypeScript configuration, and linting rules are centralized to eliminate configuration drift between applications."));

// Tech stack table
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "1.1 Technology Stack Summary", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(makeTable(
  ["Layer", "Technology", "Version", "Purpose"],
  [
    ["Framework", "Next.js (React 19)", "16.x", "SSR/ISR for storefront, dashboards for vendor/admin"],
    ["Language", "TypeScript", "5.x", "Full type safety across all packages"],
    ["Database", "PostgreSQL", "16.x", "Primary relational data store"],
    ["ORM", "Prisma", "6.x", "Type-safe database access with migrations"],
    ["Cache", "Redis", "7.x", "Session storage, product cache, rate limiting"],
    ["Auth", "NextAuth.js (Auth.js) v5", "5.x", "JWT-based auth with RBAC (Customer/Vendor/Admin)"],
    ["Styling", "Tailwind CSS + shadcn/ui", "4.x", "Utility-first CSS with component primitives"],
    ["Monorepo", "Turborepo", "2.x", "Build orchestration and incremental caching"],
    ["Runtime", "Node.js", "22.x LTS", "Server runtime for all applications"],
    ["Package Manager", "pnpm", "9.x", "Fast, disk-efficient dependency management"],
    ["Storage", "Cloudflare R2 / AWS S3", "N/A", "Product images, vendor uploads, static assets"],
    ["Payments", "Stripe + bKash / SSLCommerz", "N/A", "International and local payment gateways"],
    ["Real-time", "Socket.IO / Server-Sent Events", "N/A", "Order notifications, chat, live inventory"],
    ["Deployment", "Vercel + Docker", "N/A", "Apps on Vercel, infra services in Docker"],
  ],
  [20, 35, 12, 33],
));

// ── Chapter 2: Root Structure ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "2. Root Directory Structure", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The root directory serves as the monorepo entry point and contains all shared configuration files. These files establish the development environment standards that every package and application inherits. Turborepo reads turbo.json to determine build dependencies and caching strategies, while pnpm-workspace.yaml defines which directories constitute the workspace packages."));

bodyContent.push(body("Root-level configuration files enforce consistency across the entire codebase. ESLint, Prettier, and TypeScript configs are defined once and extended by each workspace. Environment variable templates (.env.example) document every required secret and configuration value. Docker and CI/CD configurations at the root level ensure that infrastructure-as-code practices are applied uniformly."));

bodyContent.push(...treeSection("2.1 Root Files and Directories", [
  "/",
  "  .env.example                  # Environment variable template for all apps",
  "  .eslintrc.js                  # Shared ESLint config (extended by apps)",
  "  .gitignore                    # Git ignore rules (node_modules, .env, .next)",
  "  .prettierrc                   # Shared Prettier config (formatting standards)",
  "  docker-compose.yml            # Local dev: PostgreSQL + Redis + MinIO",
  "  docker-compose.prod.yml       # Production Docker configuration",
  "  package.json                  # Root package.json (workspace scripts)",
  "  pnpm-lock.yaml                # Lock file for deterministic installs",
  "  pnpm-workspace.yaml           # Defines workspace packages",
  "  README.md                     # Project overview, setup guide, architecture",
  "  turbo.json                    # Turborepo pipeline config (build/deploy)",
  "  tsconfig.base.json            # Base TypeScript config (extended by apps)",
  "",
  "  apps/                         # Deployable Next.js applications",
  "  packages/                     # Shared internal packages",
  "  docker/                       # Dockerfile per service + Docker Compose",
  "  .github/                      # CI/CD workflows and templates",
  "  docs/                         # Project documentation (ADR, API docs)",
  "  scripts/                      # Utility scripts (seed, migrate, deploy)",
]));

// ── Chapter 3: Applications ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "3. Applications (apps/)", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The apps/ directory contains three fully independent Next.js 16 applications. Each application has its own package.json, tsconfig.json, next.config.js, and complete source tree. They share data access logic through @ecom/db, authentication through @ecom/auth, validation through @ecom/validations, and UI components through @ecom/ui. This separation ensures that each application can be deployed, scaled, and versioned independently while maintaining a single source of truth for business logic."));

// ── 3.1 Storefront ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "3.1 Customer Storefront (apps/storefront)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The storefront is the customer-facing e-commerce application. It is optimized for SEO using Next.js Server-Side Rendering (SSR) for product pages and Incremental Static Regeneration (ISR) for category and listing pages. The storefront implements a high-performance product browsing experience with Redis-cached product listings, real-time inventory status, and a streamlined checkout flow supporting multiple payment gateways."));

bodyContent.push(body("The application follows a feature-based directory structure where each major domain (products, cart, checkout, orders, account) is organized as a self-contained module with its own components, hooks, and server actions. This structure scales well as the storefront grows in complexity, keeping related code colocated while maintaining clear boundaries between domains."));

bodyContent.push(...treeSection("3.1.1 Storefront Directory Tree", [
  "apps/storefront/",
  "  package.json",
  "  tsconfig.json",
  "  next.config.ts",
  "  tailwind.config.ts",
  "  postcss.config.mjs",
  "  .env.local                    # Storefront-specific env vars",
  "  public/",
  "    favicon.ico",
  "    og-image.png",
  "    robots.txt",
  "    sitemap.xml",
  "  src/",
  "    app/                        # Next.js App Router",
  "      layout.tsx                # Root layout (fonts, providers, metadata)",
  "      page.tsx                  # Homepage",
  "      globals.css               # Global Tailwind imports",
  "      loading.tsx               # Global loading state",
  "      not-found.tsx             # Custom 404 page",
  "      (marketing)/",
  "        page.tsx                # Landing page",
  "        about/page.tsx",
  "        contact/page.tsx",
  "      products/",
  "        page.tsx                # Product listing (SSR + Redis cache)",
  "        [slug]/page.tsx         # Product detail (ISR, revalidate: 3600)",
  "        loading.tsx             # Product list skeleton",
  "      categories/",
  "        [slug]/page.tsx         # Category listing (ISR)",
  "      cart/",
  "        page.tsx                # Shopping cart (client component)",
  "        CheckoutButton.tsx",
  "      checkout/",
  "        page.tsx                # Multi-step checkout flow",
  "        ShippingForm.tsx",
  "        PaymentForm.tsx",
  "        OrderReview.tsx",
  "        success/page.tsx        # Order confirmation page",
  "      orders/",
  "        page.tsx                # Order history (protected route)",
  "        [id]/page.tsx           # Order detail + tracking",
  "      auth/",
  "        login/page.tsx",
  "        register/page.tsx",
  "        forgot-password/page.tsx",
  "      vendor/",
  "        [slug]/page.tsx         # Public vendor profile page",
  "      search/",
  "        page.tsx                # Full-text search results",
  "      api/",
  "        webhooks/",
  "          stripe/route.ts       # Stripe webhook handler",
  "          bkash/route.ts        # bKash webhook handler",
  "        search/route.ts         # Search API endpoint",
  "    components/",
  "      ui/                       # shadcn/ui components (button, card, etc.)",
  "      layout/",
  "        Header.tsx              # Main navigation bar",
  "        Footer.tsx              # Site footer",
  "        MobileNav.tsx           # Mobile hamburger menu",
  "        SearchBar.tsx           # Global search input",
  "        CartDrawer.tsx          # Slide-out cart panel",
  "      product/",
  "        ProductCard.tsx         # Product listing card",
  "        ProductGrid.tsx         # Responsive product grid",
  "        ProductGallery.tsx      # Image carousel/gallery",
  "        ProductInfo.tsx         # Price, variants, add-to-cart",
  "        VariantSelector.tsx     # Size/color/variant picker",
  "        ReviewList.tsx          # Customer reviews section",
  "      cart/",
  "        CartItem.tsx            # Single cart line item",
  "        CartSummary.tsx         # Subtotal, shipping, tax",
  "        QuantitySelector.tsx",
  "      checkout/",
  "        AddressForm.tsx",
  "        PaymentSelector.tsx",
  "        CouponInput.tsx",
  "      vendor/",
  "        VendorCard.tsx          # Vendor preview card",
  "        VendorBadge.tsx         # Verified vendor badge",
  "    lib/",
  "      utils.ts                  # Utility functions (cn, formatCurrency)",
  "      constants.ts              # App-wide constants",
  "      stripe.ts                 # Stripe client initialization",
  "      bkash.ts                  # bKash client initialization",
  "    hooks/",
  "      use-cart.ts               # Cart state management (Zustand)",
  "      use-search.ts             # Search debouncing + suggestions",
  "      use-product-filters.ts    # Filter/sort state",
  "    actions/",
  "      cart.ts                   # Server actions: add/remove/update cart",
  "      checkout.ts               # Server actions: create order, process payment",
  "      auth.ts                   # Server actions: login, register",
  "    providers/",
  "      SessionProvider.tsx        # NextAuth session provider",
  "      ToastProvider.tsx          # Notification toast provider",
  "      CartProvider.tsx           # Cart state provider",
  "    types/",
  "      index.ts                  # Storefront-specific type definitions",
]));

// ── 3.2 Vendor Dashboard ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "3.2 Vendor Dashboard (apps/vendor-dashboard)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The vendor dashboard is a comprehensive management interface that allows vendors to manage their product catalog, process orders, handle customer communications, and view sales analytics. This application is a client-side heavy React application protected by NextAuth.js middleware that enforces the Vendor role. Vendors can only access their own data through row-level security policies enforced at the Prisma query level."));

bodyContent.push(body("The dashboard implements a sidebar-based navigation layout with collapsible sections for Products, Orders, Analytics, Settings, and Communications. Real-time order notifications are delivered through Server-Sent Events (SSE), ensuring vendors see new orders instantly without polling. The product management module includes a rich file upload component with image optimization, bulk import/export via CSV, and variant management."));

bodyContent.push(...treeSection("3.2.1 Vendor Dashboard Directory Tree", [
  "apps/vendor-dashboard/",
  "  package.json",
  "  tsconfig.json",
  "  next.config.ts",
  "  tailwind.config.ts",
  "  .env.local",
  "  public/",
  "    favicon.ico",
  "    logo.svg",
  "  src/",
  "    app/",
  "      layout.tsx                # Dashboard layout (sidebar + header)",
  "      page.tsx                  # Redirect to /dashboard",
  "      (dashboard)/",
  "        layout.tsx              # Protected layout (auth middleware)",
  "        dashboard/",
  "          page.tsx              # Overview: stats, recent orders, charts",
  "        products/",
  "          page.tsx              # Product list with data table",
  "          new/page.tsx          # Create product form",
  "          [id]/",
  "            page.tsx            # Edit product",
  "            variants/page.tsx   # Manage variants",
  "          import/page.tsx       # Bulk CSV import",
  "          categories/page.tsx   # Manage product categories",
  "        orders/",
  "          page.tsx              # Order list with filters",
  "          [id]/page.tsx         # Order detail + status update",
  "        analytics/",
  "          page.tsx              # Sales charts (revenue, orders, top products)",
  "          reports/page.tsx      # Downloadable reports",
  "        reviews/",
  "          page.tsx              # Customer reviews management",
  "        settings/",
  "          page.tsx              # Store profile, shipping, policies",
  "          payout/page.tsx       # Payout configuration",
  "          notifications/page.tsx",
  "        chat/",
  "          page.tsx              # Customer chat interface",
  "          [id]/page.tsx         # Chat thread",
  "      auth/",
  "        login/page.tsx          # Vendor-specific login",
  "        register/page.tsx       # Vendor registration (with approval flow)",
  "      api/",
  "        upload/route.ts         # Image upload endpoint (R2/S3)",
  "        export/route.ts         # CSV/Excel export endpoint",
  "        notifications/route.ts  # SSE endpoint for real-time alerts",
  "    components/",
  "      ui/                       # shadcn/ui components",
  "      layout/",
  "        Sidebar.tsx             # Dashboard sidebar navigation",
  "        TopBar.tsx              # Header with search + notifications",
  "        MobileSidebar.tsx",
  "      dashboard/",
  "        StatsCard.tsx           # KPI stat card",
  "        RecentOrders.tsx        # Recent orders table",
  "        RevenueChart.tsx        # Revenue line chart",
  "      product/",
  "        ProductForm.tsx         # Create/edit product form",
  "        ProductTable.tsx        # Data table with sorting/filtering",
  "        ImageUploader.tsx       # Multi-image upload with preview",
  "        VariantManager.tsx      # Variant builder",
  "        PriceEditor.tsx         # Price with discount logic",
  "      order/",
  "        OrderTable.tsx          # Orders data table",
  "        OrderStatusBadge.tsx    # Status color badge",
  "        FulfillmentForm.tsx     # Shipping/tracking form",
  "      analytics/",
  "        SalesChart.tsx          # Chart.js / Recharts wrapper",
  "        TopProductsTable.tsx",
  "        DateRangePicker.tsx",
  "      chat/",
  "        ChatWindow.tsx",
  "        MessageBubble.tsx",
  "    lib/",
  "      utils.ts",
  "      upload.ts                # R2/S3 upload helper",
  "      csv-parser.ts            # CSV import parser",
  "    hooks/",
  "      use-vendor.ts            # Current vendor context hook",
  "      use-notifications.ts     # SSE notification hook",
  "      use-data-table.ts        # Table sorting/pagination hook",
  "    actions/",
  "      products.ts              # Server actions: CRUD operations",
  "      orders.ts                # Server actions: status updates, fulfillment",
  "      settings.ts              # Server actions: profile updates",
  "    middleware.ts               # Auth guard: redirect non-vendors",
]));

// ── 3.3 Admin Panel ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "3.3 Admin Panel (apps/admin)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The admin panel is the superuser interface for platform-wide management. It provides comprehensive tools for vendor approval workflows, product moderation, order dispute resolution, financial reporting, and system configuration. Access is restricted to users with the Admin role through NextAuth.js middleware, with additional permission granularity for sub-admin roles (e.g., Support, Finance, Moderation)."));

bodyContent.push(body("The admin panel shares many UI patterns with the vendor dashboard (data tables, charts, forms) and therefore imports heavily from @ecom/ui for shared components like DataTable, FileUploader, and StatCard. However, the admin panel includes additional modules for platform governance: vendor verification workflows, content moderation queues, payment reconciliation, and system health monitoring. The admin panel also serves as the configuration interface for global platform settings such as commission rates, shipping zones, and feature flags."));

bodyContent.push(...treeSection("3.3.1 Admin Panel Directory Tree", [
  "apps/admin/",
  "  package.json",
  "  tsconfig.json",
  "  next.config.ts",
  "  tailwind.config.ts",
  "  .env.local",
  "  public/",
  "    favicon.ico",
  "    logo.svg",
  "  src/",
  "    app/",
  "      layout.tsx                # Admin layout (sidebar + topbar)",
  "      page.tsx                  # Redirect to /admin",
  "      (admin)/",
  "        layout.tsx              # Protected admin layout",
  "        dashboard/",
  "          page.tsx              # Platform-wide KPI dashboard",
  "        vendors/",
  "          page.tsx              # All vendors list",
  "          [id]/page.tsx         # Vendor detail + verification",
  "          pending/page.tsx      # Pending approval queue",
  "          suspended/page.tsx    # Suspended vendors",
  "        products/",
  "          page.tsx              # All products (platform-wide)",
  "          flagged/page.tsx      # Flagged/reported products",
  "          categories/page.tsx   # Global category management",
  "          attributes/page.tsx   # Product attributes management",
  "        orders/",
  "          page.tsx              # All orders (platform-wide)",
  "          disputes/page.tsx     # Order disputes queue",
  "          refunds/page.tsx      # Refund requests",
  "        customers/",
  "          page.tsx              # Customer list + search",
  "          [id]/page.tsx         # Customer detail + order history",
  "        finance/",
  "          page.tsx              # Revenue overview",
  "          commissions/page.tsx  # Commission tracking",
  "          payouts/page.tsx      # Vendor payout management",
  "          transactions/page.tsx",
  "        settings/",
  "          page.tsx              # General platform settings",
  "          shipping/page.tsx     # Shipping zones + rates",
  "          payments/page.tsx     # Payment gateway config",
  "          taxes/page.tsx        # Tax configuration",
  "          roles/page.tsx        # Admin role/permission management",
  "        moderation/",
  "          page.tsx              # Content moderation queue",
  "          reviews/page.tsx      # Review moderation",
  "        system/",
  "          health/page.tsx       # System health monitoring",
  "          logs/page.tsx         # Audit log viewer",
  "          cache/page.tsx        # Redis cache management",
  "      auth/",
  "        login/page.tsx          # Admin login",
  "      api/",
  "        admin/",
  "          vendors/[id]/route.ts",
  "          export/route.ts",
  "          system/health/route.ts",
  "    components/",
  "      ui/                       # shadcn/ui components",
  "      layout/",
  "        AdminSidebar.tsx",
  "        AdminTopBar.tsx",
  "      dashboard/",
  "        PlatformStats.tsx       # Platform-wide stat cards",
  "        RevenueOverview.tsx     # Revenue chart",
  "        OrderVolumeChart.tsx",
  "      vendor/",
  "        VendorTable.tsx",
  "        VendorVerification.tsx  # Approval/rejection form",
  "      product/",
  "        ProductModeration.tsx   # Content moderation card",
  "      finance/",
  "        PayoutTable.tsx",
  "        CommissionReport.tsx",
  "      system/",
  "        HealthStatus.tsx        # Service health indicators",
  "        AuditLog.tsx            # Activity log viewer",
  "    lib/",
  "      utils.ts",
  "      admin-client.ts          # Admin-specific API helpers",
  "    hooks/",
  "      use-admin.ts             # Admin permission check hook",
  "      use-data-table.ts        # Shared data table hook",
  "    actions/",
  "      vendors.ts               # Vendor approval/suspension actions",
  "      products.ts              # Product moderation actions",
  "      finance.ts               # Payout and commission actions",
  "      settings.ts              # Platform settings actions",
  "    middleware.ts               # Auth guard: Admin role only",
]));

// ── Chapter 4: Shared Packages ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "4. Shared Packages (packages/)", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The packages/ directory contains four internal workspace packages that serve as the single source of truth for cross-cutting concerns. These packages are not deployed independently; instead, they are consumed by the applications through TypeScript path aliases (e.g., @ecom/db, @ecom/auth). This architecture eliminates code duplication, ensures consistent business logic across all applications, and allows a single Prisma migration to propagate schema changes to every consumer."));

bodyContent.push(body("Each package follows a consistent structure: an src/ directory for source code, a package.json that defines the package name and its dependencies, an index.ts barrel export file, and a tsconfig.json that extends the root base configuration. Turborepo detects changes at the package level and only rebuilds dependent applications when a shared package is modified, keeping CI times fast even as the codebase grows."));

// 4.1 Database Package
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "4.1 Database Package (packages/db)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The database package is the most critical shared package. It contains the complete Prisma schema defining all database models, relations, and indexes. All three applications import the generated Prisma client from this package, ensuring that every query uses the same schema definition. The package also exports helper functions for common database operations like pagination, filtering, and transaction management. Prisma migrations are run from this package and the generated client is shared across all applications."));

bodyContent.push(...treeSection("4.1.1 Database Package Tree", [
  "packages/db/",
  "  package.json                  # @ecom/db",
  "  tsconfig.json",
  "  prisma/",
  "    schema.prisma               # Complete database schema",
  "    seed.ts                     # Database seeder (dev data)",
  "    migrations/                 # Prisma migration files",
  "      20260615_init/",
  "        migration.sql",
  "  src/",
  "    index.ts                    # Barrel export: PrismaClient, helpers",
  "    client.ts                   # PrismaClient singleton (connection pooling)",
  "    extensions.ts               # Prisma client extensions",
  "    helpers/",
  "      pagination.ts             # Cursor/offset pagination helper",
  "      filtering.ts              # Dynamic filter builder",
  "      transactions.ts           # Transaction wrapper with retry",
  "      cache-invalidation.ts     # Redis cache invalidation triggers",
  "    types/",
  "      index.ts                  # Re-exported Prisma generated types",
]));

// 4.2 Auth Package
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "4.2 Authentication Package (packages/auth)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The authentication package centralizes the entire Auth.js (NextAuth.js v5) configuration. It defines the JWT strategy, credential provider, OAuth providers (Google, Facebook), and the role-based access control (RBAC) system with three roles: Customer, Vendor, and Admin. Each application imports the auth configuration and middleware from this package, ensuring that a user authenticated on the storefront is recognized by the vendor dashboard and admin panel without re-authentication. The package also exports type-safe session helper functions and route protection utilities."));

bodyContent.push(...treeSection("4.2.1 Auth Package Tree", [
  "packages/auth/",
  "  package.json                  # @ecom/auth",
  "  tsconfig.json",
  "  src/",
  "    index.ts                    # Barrel export",
  "    auth.ts                     # NextAuth v5 configuration",
  "    auth.config.ts              # Auth options (providers, callbacks)",
  "    middleware.ts               # Auth middleware (role-based route protection)",
  "    session.ts                  # Type-safe session helpers",
  "    rbac.ts                     # Role definitions + permission matrix",
  "    guards/",
  "      vendor-guard.ts           # Vendor role check utility",
  "      admin-guard.ts            # Admin role check utility",
  "      customer-guard.ts         # Customer role check utility",
  "    adapters/",
  "      prisma-adapter.ts         # Custom Prisma Auth adapter",
  "    types/",
  "      next-auth.d.ts            # Augment NextAuth types with custom User/Session",
]));

// 4.3 Validations Package
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "4.3 Validation Package (packages/validations)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The validation package provides a comprehensive set of Zod schemas that define the shape and constraints of every data entity in the system. These schemas are used by both client-side form validation and server-side API input validation, guaranteeing that the same rules apply everywhere. When a developer adds a new field to the Product model in Prisma, they also update the corresponding Zod schema in this package, and the change automatically propagates to all forms and API endpoints that use it."));

bodyContent.push(...treeSection("4.3.1 Validation Package Tree", [
  "packages/validations/",
  "  package.json                  # @ecom/validations",
  "  tsconfig.json",
  "  src/",
  "    index.ts                    # Barrel export",
  "    product.ts                  # Product create/update/variant schemas",
  "    order.ts                    # Order creation, status update schemas",
  "    vendor.ts                   # Vendor registration, profile schemas",
  "    customer.ts                 # Customer registration, address schemas",
  "    auth.ts                     # Login, register, password reset schemas",
  "    review.ts                   # Review create/update schemas",
  "    common.ts                   # Shared schemas (pagination, sorting, ID)",
  "    settings.ts                 # Platform settings schemas",
]));

// 4.4 UI Package
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "4.4 UI Component Library (packages/ui)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The UI package is a shared component library built on top of shadcn/ui primitives. It contains complex, reusable components that are used by both the vendor dashboard and admin panel, such as data tables with sorting and pagination, file uploaders with drag-and-drop support, stat cards, and chart wrappers. The storefront imports fewer components from this package (it has a distinct visual identity), but still shares utility components like loading skeletons and toast notifications. All components in this package are fully typed, accessible, and consistent with the platform's design system."));

bodyContent.push(...treeSection("4.4.1 UI Package Tree", [
  "packages/ui/",
  "  package.json                  # @ecom/ui",
  "  tsconfig.json",
  "  src/",
  "    index.ts                    # Barrel export",
  "    components/",
  "      ui/                       # Base shadcn/ui primitives",
  "        button.tsx",
  "        input.tsx",
  "        card.tsx",
  "        dialog.tsx",
  "        dropdown-menu.tsx",
  "        select.tsx",
  "        table.tsx",
  "        tabs.tsx",
  "        badge.tsx",
  "        toast.tsx",
  "        skeleton.tsx",
  "        avatar.tsx",
  "        separator.tsx",
  "        sheet.tsx",
  "        tooltip.tsx",
  "      data-table/",
  "        DataTable.tsx            # Full-featured data table component",
  "        DataTablePagination.tsx",
  "        DataTableToolbar.tsx    # Filter + search toolbar",
  "        DataTableColumnHeader.tsx",
  "        types.ts                # Column definition types",
  "      file-upload/",
  "        FileUploader.tsx         # Drag-and-drop multi-file upload",
  "        ImagePreview.tsx         # Image preview with crop/remove",
  "        UploadProgress.tsx",
  "      dashboard/",
  "        StatCard.tsx             # KPI stat card with trend indicator",
  "        StatGrid.tsx             # Responsive stat card grid",
  "        ChartCard.tsx            # Chart container with title + actions",
  "      form/",
  "        FormField.tsx            # Reusable form field with label + error",
  "        SearchInput.tsx          # Debounced search input",
  "        DatePicker.tsx",
  "        RichTextEditor.tsx",
  "      layout/",
  "        PageHeader.tsx           # Page title + breadcrumbs + actions",
  "        EmptyState.tsx           # Empty state placeholder",
  "        LoadingState.tsx         # Full-page loading skeleton",
  "    hooks/",
  "      use-debounce.ts",
  "      use-media-query.ts",
  "    lib/",
  "      utils.ts                  # cn() and other UI utilities",
  "    styles/",
  "      globals.css               # Shared CSS variables + Tailwind base",
]));

// ── Chapter 5: Infrastructure ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "5. Infrastructure and DevOps", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("Infrastructure configuration is centralized at the repository root to ensure that local development, staging, and production environments are consistent. The Docker Compose setup provides a complete local development environment with PostgreSQL 16, Redis 7, and MinIO (an S3-compatible object storage server), allowing developers to run the entire platform locally without any cloud accounts or API keys. GitHub Actions workflows automate testing, building, and deploying each application independently."));

bodyContent.push(...treeSection("5.1 Docker Configuration (docker/)", [
  "docker/",
  "  docker-compose.yml            # Dev environment (root level, convenience link)",
  "  docker-compose.prod.yml       # Production overrides",
  "  postgres/",
  "    Dockerfile                  # PostgreSQL 16 + extensions",
  "    init.sql                    # Initial database setup",
  "  redis/",
  "    Dockerfile                  # Redis 7 with custom config",
  "    redis.conf                  # Redis configuration (maxmemory, eviction)",
  "  minio/",
  "    Dockerfile                  # MinIO S3-compatible storage",
  "  nginx/",
  "    nginx.conf                  # Reverse proxy config (if self-hosting)",
  "  monitor/",
  "    prometheus.yml              # Prometheus metrics config",
  "    grafana/",
  "      provisioning/             # Grafana dashboard provisioning",
]));

bodyContent.push(...treeSection("5.2 CI/CD Workflows (.github/)", [
  ".github/",
  "  workflows/",
  "    ci.yml                      # Main CI: lint, type-check, test all packages",
  "    deploy-storefront.yml        # Deploy storefront to Vercel",
  "    deploy-vendor.yml            # Deploy vendor dashboard to Vercel",
  "    deploy-admin.yml             # Deploy admin panel to Vercel",
  "    pr-checks.yml                # PR validation: lint + build affected",
  "    release.yml                  # Release workflow: version bump + changelog",
  "  templates/",
  "    pr-template.md               # Pull request template",
  "    issue-template.md            # Issue template",
  "  CODEOWNERS                    # Code ownership rules for review routing",
]));

bodyContent.push(...treeSection("5.3 Utility Scripts (scripts/)", [
  "scripts/",
  "  seed.ts                       # Database seeder script",
  "  migrate.ts                    # Run Prisma migrations",
  "  generate-types.ts             # Regenerate TypeScript types from schema",
  "  setup-dev.sh                  # One-command dev environment setup",
  "  cleanup-docker.sh             # Docker volume and container cleanup",
  "  deploy-staging.sh             # Staging deployment helper",
  "  backup-db.sh                  # Database backup script",
  "  verify-env.sh                 # Environment variable validation",
]));

// ── Chapter 6: Documentation ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "6. Documentation (docs/)", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The docs/ directory contains all project documentation beyond the README. Architecture Decision Records (ADRs) capture the rationale behind key technical decisions, ensuring that future developers understand why certain choices were made. API documentation provides endpoint specifications for all backend routes, and the onboarding guide helps new developers set up their environment and understand the codebase structure within their first day."));

bodyContent.push(...treeSection("6.1 Documentation Tree", [
  "docs/",
  "  architecture/",
  "    system-overview.md          # High-level system architecture diagram",
  "    data-model.md               # Entity-relationship diagram and descriptions",
  "    auth-flow.md                # Authentication and authorization flow",
  "    caching-strategy.md         # Redis caching patterns and invalidation",
  "    payment-flow.md             # Payment processing flow diagrams",
  "  adr/",
  "    001-monorepo-vs-polyrepo.md # Why monorepo was chosen",
  "    002-nextjs-16-ssr-isr.md    # Why Next.js 16 with SSR/ISR",
  "    003-prisma-over-drizzle.md  # Why Prisma 6 over Drizzle",
  "    004-redis-caching.md        # Caching architecture decisions",
  "  api/",
  "    storefront-api.md           # Storefront API routes documentation",
  "    vendor-api.md               # Vendor dashboard API documentation",
  "    admin-api.md                # Admin panel API documentation",
  "    webhook-spec.md             # Webhook specifications (Stripe, bKash)",
  "  onboarding/",
  "    getting-started.md          # New developer setup guide",
  "    coding-standards.md         # Code style and conventions",
  "    git-workflow.md             # Branching strategy and PR process",
  "    testing-guide.md            # How to write and run tests",
]));

// ── Chapter 7: Workspace Configuration ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "7. Workspace Configuration Files", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The workspace configuration files at the repository root define the shared development standards that all packages and applications inherit. These files are carefully structured to avoid duplication while allowing per-application overrides when necessary. Understanding these configurations is essential for maintaining consistency as the project scales."));

bodyContent.push(makeTable(
  ["File", "Purpose", "Extended By"],
  [
    ["pnpm-workspace.yaml", "Defines apps/ and packages/ as workspace members", "pnpm (automatic)"],
    ["turbo.json", "Build pipeline: dependsOn, cache, parallel tasks", "Turborepo CLI"],
    ["tsconfig.base.json", "Base TS config: strict mode, path aliases, target ES2022", "All apps/packages tsconfig.json"],
    [".eslintrc.js", "Shared ESLint rules: Next.js, React, TypeScript plugins", "Apps extend via extends"],
    [".prettierrc", "Formatting: 2-space indent, single quotes, trailing comma", "All packages (via IDE + CI)"],
    ["package.json (root)", "Workspace scripts: dev, build, lint, test, db:push, db:seed", "pnpm workspace commands"],
    [".env.example", "Template listing all env vars with descriptions", "Each app creates .env.local"],
    ["docker-compose.yml", "Local services: Postgres, Redis, MinIO with health checks", "Direct Docker Compose usage"],
    [".github/CODEOWNERS", "Defines code review owners per directory", "GitHub PR routing"],
  ],
  [25, 48, 27],
));

bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "7.1 Turborepo Pipeline (turbo.json)", bold: true, size: 28, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("The turbo.json file defines the build pipeline that orchestrates how packages and applications are built, tested, and deployed. Turborepo uses this configuration to determine dependency graphs between packages and only rebuilds what has changed. The pipeline is designed for maximum parallelism: independent packages build simultaneously, while dependent tasks wait for their inputs to be ready. Remote caching ensures that CI builds reuse artifacts from previous successful runs, reducing build times by up to 80% on average."));

bodyContent.push(...treeSection("7.1.1 turbo.json Structure", [
  "turbo.json",
  "  {",
  "    \"$schema\": \"https://turbo.build/schema.json\",",
  "    \"globalDependencies\": [\"**/.env.*local\"],",
  "    \"tasks\": {",
  "      \"build\": {",
  "        \"dependsOn\": [\"^build\"],",
  "        \"outputs\": [\".next/**\", \"!.next/cache/**\", \"dist/**\"]",
  "      },",
  "      \"dev\": {",
  "        \"cache\": false,",
  "        \"persistent\": true",
  "      },",
  "      \"lint\": {",
  "        \"dependsOn\": [\"^build\"]",
  "      },",
  "      \"test\": {",
  "        \"dependsOn\": [\"^build\"]",
  "      },",
  "      \"db:generate\": {",
  "        \"cache\": false,",
  "        \"outputs\": [\"node_modules/.prisma/**\"]",
  "      }",
  "    }",
  "  }",
]));

// ── Chapter 8: Environment Variables ──
bodyContent.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 160 },
  children: [new TextRun({ text: "8. Environment Variable Reference", bold: true, size: 32, color: c(PAL.primary), font: { ascii: "Arial" } })],
}));

bodyContent.push(body("Environment variables are organized by scope to prevent confusion and reduce the risk of misconfiguration. Shared variables (database URL, Redis URL, JWT secret) are defined once in the root .env.example and referenced by all applications through the workspace configuration. Application-specific variables (e.g., Stripe keys for the storefront, different OAuth callbacks for each app) are defined in each application's .env.local file. This separation ensures that developers only need to configure shared services once, while still allowing per-app customization."));

bodyContent.push(makeTable(
  ["Variable", "Scope", "Example", "Description"],
  [
    ["DATABASE_URL", "Shared", "postgresql://user:pass@localhost:5432/ecom", "PostgreSQL connection string"],
    ["REDIS_URL", "Shared", "redis://localhost:6379", "Redis connection string"],
    ["AUTH_SECRET", "Shared", "your-jwt-secret-min-32-chars", "NextAuth JWT signing secret"],
    ["AUTH_URL", "Per App", "http://localhost:3000", "Canonical URL for OAuth callbacks"],
    ["NEXTAUTH_URL", "Per App", "http://localhost:3000", "NextAuth base URL override"],
    ["STRIPE_SECRET_KEY", "Storefront", "sk_test_xxx", "Stripe API secret key"],
    ["STRIPE_WEBHOOK_SECRET", "Storefront", "whsec_xxx", "Stripe webhook verification"],
    ["BKASH_MERCHANT_KEY", "Storefront", "bkash_sandbox_xxx", "bKash merchant API key"],
    ["R2_ACCESS_KEY", "Shared", "access_key_xxx", "Cloudflare R2 access key"],
    ["R2_SECRET_KEY", "Shared", "secret_key_xxx", "Cloudflare R2 secret key"],
    ["R2_BUCKET_NAME", "Shared", "ecom-assets", "R2 bucket for file uploads"],
    ["R2_PUBLIC_URL", "Shared", "https://assets.example.com", "Public URL for R2 files"],
    ["NODE_ENV", "Per App", "development", "Node environment (dev/staging/prod)"],
  ],
  [25, 15, 35, 25],
));

// ── Assemble Document ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "Microsoft YaHei" },
          size: 24, color: c(PAL.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: { font: { ascii: "Arial", eastAsia: "SimHei" }, size: 32, bold: true, color: c(PAL.primary) },
        paragraph: { spacing: { before: 300, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Arial", eastAsia: "SimHei" }, size: 28, bold: true, color: c(PAL.primary) },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Arial", eastAsia: "SimHei" }, size: 24, bold: true, color: c(PAL.primary) },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
  },
  sections: [
    // Section 1: Cover
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: buildCoverR4(coverConfig),
    },
    // Section 2: TOC (Roman numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Multi-Vendor E-Commerce Platform", size: 18, color: c(PAL.secondary), font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "PAGE  \\* ROMAN  \\* MERGEFORMAT ", size: 18, font: { ascii: "Calibri" }, color: c(PAL.secondary) }),
            ],
          })],
        }),
      },
      children: bodyContent.slice(0, 3), // TOC section (heading, TOC element, note, pagebreak)
    },
    // Section 3: Body (Arabic numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Multi-Vendor E-Commerce Platform", size: 18, color: c(PAL.secondary), font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "PAGE  \\* arabic  \\* MERGEFORMAT ", size: 18, font: { ascii: "Calibri" }, color: c(PAL.secondary) }),
            ],
          })],
        }),
      },
      children: bodyContent.slice(3), // Everything after the TOC pagebreak
    },
  ],
});

// ── Write file ──
const OUTPUT = "/home/z/my-project/download/Multi-Vendor-E-Commerce-Project-Structure.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated:", OUTPUT);
});