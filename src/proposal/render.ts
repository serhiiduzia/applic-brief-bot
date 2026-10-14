import type { CompanyProfile } from "../domain/company.js";
import type { StoredProposal } from "../domain/proposal.js";

const DEFAULT_PRIMARY = "#111827";
const DEFAULT_ACCENT = "#2563EB";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeColor(value: string, fallback: string): string {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function websiteUrl(value: string): string | null {
  const trimmed = value.trim();
  return safeHttpUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
}

function telegramUrl(value: string): string | null {
  const trimmed = value.trim();
  const username = /^@?([A-Za-z0-9_]{4,32})$/.exec(trimmed);
  if (username) {
    return `https://t.me/${username[1]}`;
  }
  const url = safeHttpUrl(trimmed);
  if (url && /^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i.test(url)) {
    return url;
  }
  return null;
}

function renderParagraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .map((line: string): string => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function renderMultiline(text: string): string {
  return escapeHtml(text.trim()).replace(/\r?\n/g, "<br>");
}

function formatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" });
}

type ProposalSection = StoredProposal["sections"][number];
type ProposalTable = NonNullable<ProposalSection["table"]>;

function renderTable(table: ProposalTable): string {
  const head = table.columns.map((column: string): string => `<th>${escapeHtml(column)}</th>`).join("");
  const rows = table.rows
    .map((row: string[]): string => {
      const cells = table.columns
        .map((_column: string, index: number): string => {
          const value = row[index] ?? "";
          const numeric = /^[€$₴]?\s?\d[\d\s.,\-]*\s?(?:€|\$|₴|%|EUR|USD|UAH|грн|год\.?|тиж\.?|тижні|тижнів|днів)?$/i.test(value.trim());
          return `<td${numeric ? ' class="num"' : ""}>${renderMultiline(value)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return `<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderSection(section: ProposalSection): string {
  const items = section.bullets
    .map((bullet: string): string => bullet.trim())
    .filter((bullet: string): boolean => bullet.length > 0)
    .map((bullet: string): string => `<li>${escapeHtml(bullet)}</li>`)
    .join("");
  const list = items ? `<ul>${items}</ul>` : "";
  const table = section.table && section.table.rows.length > 0 ? renderTable(section.table) : "";
  return `<section class="section"><h2>${escapeHtml(section.heading)}</h2>${renderParagraphs(section.text)}${table}${list}</section>`;
}

function renderInfoBlock(label: string, value: string | null): string {
  if (value === null || value.trim() === "") {
    return "";
  }
  return `<section class="info"><div class="eyebrow">${escapeHtml(label)}</div><div class="info-body">${renderMultiline(value)}</div></section>`;
}

function renderKpis(kpis: StoredProposal["kpis"]): string {
  if (!kpis || kpis.length === 0) {
    return "";
  }
  const items = kpis
    .map((kpi: { label: string; value: string }): string => `<div class="kpi"><div class="kpi-value">${escapeHtml(kpi.value)}</div><div class="kpi-label">${escapeHtml(kpi.label)}</div></div>`)
    .join("");
  return `<div class="kpis">${items}</div>`;
}

function renderContactItems(company: CompanyProfile): string {
  const items: string[] = [];
  if (company.website) {
    const href = websiteUrl(company.website);
    const label = escapeHtml(company.website.replace(/^https?:\/\//i, "").replace(/\/$/, ""));
    items.push(href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`);
  }
  if (company.contacts.email) {
    const email = company.contacts.email.trim();
    items.push(`<a href="mailto:${escapeHtml(encodeURI(email))}">${escapeHtml(email)}</a>`);
  }
  if (company.contacts.phone) {
    const phone = company.contacts.phone.trim();
    const digits = phone.replace(/[^\d+]/g, "");
    items.push(digits ? `<a href="tel:${escapeHtml(digits)}">${escapeHtml(phone)}</a>` : `<span>${escapeHtml(phone)}</span>`);
  }
  if (company.contacts.telegram) {
    const telegram = company.contacts.telegram.trim();
    const href = telegramUrl(telegram);
    items.push(href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">Telegram: ${escapeHtml(telegram)}</a>` : `<span>Telegram: ${escapeHtml(telegram)}</span>`);
  }
  return items.map((item: string): string => `<span class="contact">${item}</span>`).join("");
}

function baseStyles(primary: string, accent: string): string {
  return `
:root { --primary: ${primary}; --accent: ${accent}; --text: ${primary}; --muted: #5A6470; --line: #DDE1E6; --soft: #F5F6F8; --bg: #EDEFF2; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: Manrope, system-ui, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 16px; line-height: 1.6; overflow-wrap: anywhere; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { max-width: 860px; margin: 32px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(16, 24, 32, 0.08); overflow: hidden; }
.header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 24px; padding: 28px 48px; border-bottom: 1px solid var(--line); }
.logo { height: 34px; width: auto; max-width: 180px; object-fit: contain; display: block; }
.company { font-size: 22px; font-weight: 800; color: var(--primary); }
.doc-meta { color: var(--muted); font-size: 13px; text-align: right; }
.content { padding: 40px 48px 32px; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
h1 { margin: 0 0 18px; color: var(--primary); font-size: 34px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em; }
h2 { margin: 0 0 12px; color: var(--primary); font-size: 21px; line-height: 1.3; font-weight: 800; }
p { margin: 0 0 12px; }
.intro { font-size: 17px; color: var(--primary); margin-bottom: 8px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 24px 0 12px; }
.kpi { background: var(--soft); border-radius: 12px; padding: 16px 18px; }
.kpi-value { font-size: 22px; font-weight: 800; color: var(--primary); font-variant-numeric: tabular-nums; line-height: 1.25; }
.kpi-label { font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 6px; }
.validity { color: var(--muted); font-size: 13px; margin-top: 4px; }
.section { padding: 26px 0 8px; break-inside: avoid; page-break-inside: avoid; }
.section ul { margin: 6px 0 12px; padding-left: 22px; }
.section li { margin: 6px 0; }
.section li::marker { color: var(--accent); }
.tbl { overflow-x: auto; margin: 8px 0 14px; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); padding: 10px 12px; background: var(--soft); }
td { padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
tbody tr:last-child td { font-weight: 700; }
.info { margin-top: 16px; padding: 20px 22px; background: var(--soft); border-radius: 12px; break-inside: avoid; page-break-inside: avoid; }
.info-body { font-variant-numeric: tabular-nums; }
.actions { display: flex; justify-content: flex-end; margin-top: 28px; }
.print-button { appearance: none; border: 0; border-radius: 10px; background: var(--accent); color: #ffffff; font: inherit; font-weight: 700; padding: 12px 22px; cursor: pointer; }
.print-button:hover { filter: brightness(1.06); }
.footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; padding: 20px 48px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); }
.contacts { display: flex; flex-wrap: wrap; gap: 4px 6px; }
.contacts .contact + .contact::before { content: "·"; margin-right: 6px; }
.contacts a { color: var(--muted); text-decoration: none; }
.contacts a:hover { color: var(--accent); }
.notice { padding: 56px 40px; }
.notice p { color: var(--muted); }
@media (max-width: 640px) {
  .page { margin: 0; border-radius: 0; box-shadow: none; }
  .header, .footer { padding: 18px 20px; }
  .doc-meta { text-align: left; }
  .content { padding: 26px 20px 20px; }
  h1 { font-size: 26px; }
  h2 { font-size: 19px; }
  table { font-size: 14px; }
  .print-button { width: 100%; }
}
@page { size: A4; margin: 14mm 12mm; }
@media print {
  body { background: #ffffff; font-size: 11pt; }
  .page { margin: 0; max-width: none; border-radius: 0; box-shadow: none; }
  .header { padding: 0 0 14px; }
  .content { padding: 22px 0 8px; }
  .footer { padding: 12px 0 0; }
  .tbl { overflow: visible; }
  table, tr, .kpis, .info { break-inside: avoid; page-break-inside: avoid; }
  h2, .eyebrow { break-after: avoid; page-break-after: avoid; }
  .actions, .print-button { display: none !important; }
}
`;
}

function renderDocument(title: string, styles: string, body: string): string {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
<title>${title}</title>
<style>${styles}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderProposalHtml(proposal: StoredProposal, company: CompanyProfile, logoUrl: string | null): string {
  const primary = safeColor(company.colors.primary, DEFAULT_PRIMARY);
  const accent = safeColor(company.colors.accent, DEFAULT_ACCENT);
  const logo = safeHttpUrl(logoUrl);
  const companyName = escapeHtml(company.name);
  const date = formatDate(proposal.createdAt);
  const created = new Date(proposal.createdAt);
  const validUntil = Number.isNaN(created.getTime()) ? null : formatDate(new Date(created.getTime() + 30 * 86400000).toISOString());
  const brand = logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="${companyName}">` : `<div class="company">${companyName}</div>`;
  const metaParts = ["Комерційна пропозиція", proposal.client ?? null, date].filter((part: string | null | undefined): part is string => Boolean(part && part.trim()));
  const sections = proposal.sections.map(renderSection).join("");
  const info = [
    renderInfoBlock("Вартість", proposal.price),
    renderInfoBlock("Терміни", proposal.timeline),
    renderInfoBlock("Наступні кроки", proposal.nextSteps),
  ].join("");
  const body = `<main class="page">
<header class="header">${brand}<div class="doc-meta">${metaParts.map(escapeHtml).join(" · ")}</div></header>
<div class="content">
<div class="eyebrow">Комерційна пропозиція</div>
<h1>${escapeHtml(proposal.title)}</h1>
<div class="intro">${renderParagraphs(proposal.intro)}</div>
${renderKpis(proposal.kpis)}
${validUntil ? `<div class="validity">Пропозиція дійсна до ${escapeHtml(validUntil)}</div>` : ""}
${sections}
${info}
<div class="actions"><button type="button" class="print-button" onclick="window.print()">Завантажити PDF</button></div>
</div>
<footer class="footer"><div class="contacts"><span class="contact">${companyName}</span>${renderContactItems(company)}</div><div>${escapeHtml(proposal.title)}</div></footer>
</main>`;
  return renderDocument(`${escapeHtml(proposal.title)} · ${companyName}`, baseStyles(primary, accent), body);
}

export function renderNotFoundHtml(): string {
  const body = `<main class="page"><div class="notice"><h1>Пропозицію не знайдено або термін її дії минув</h1><p>Зверніться до відправника, щоб отримати актуальне посилання.</p></div></main>`;
  return renderDocument("Пропозицію не знайдено", baseStyles(DEFAULT_PRIMARY, DEFAULT_ACCENT), body);
}

export function renderErrorHtml(): string {
  const body = `<main class="page"><div class="notice"><h1>Не вдалося завантажити пропозицію</h1><p>Спробуйте оновити сторінку трохи пізніше.</p></div></main>`;
  return renderDocument("Помилка", baseStyles(DEFAULT_PRIMARY, DEFAULT_ACCENT), body);
}
