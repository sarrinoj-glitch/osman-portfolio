import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FPS = 24;
const framesDir = path.join(__dirname, 'tmp_frames');
const outPath = path.join(__dirname, 'site-preview.mp4');

if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1800));

// ── helpers ───────────────────────────────────────────────────────────────────

let frameIdx = 0;
let curX = 720, curY = 450;

async function cap(n = 1) {
  for (let i = 0; i < n; i++) {
    const p = path.join(framesDir, `frame-${String(frameIdx++).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: p, type: 'jpeg', quality: 90 });
  }
}

// Eased mouse move — steps = number of frames captured
async function moveTo(x, y, steps = 20) {
  const sx = curX, sy = curY;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.mouse.move(sx + (x - sx) * ease, sy + (y - sy) * ease);
    await cap();
  }
  curX = x; curY = y;
}

// Eased scroll to absolute document Y
async function scrollTo(targetY, frames) {
  const startY = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= frames; i++) {
    const t = i / frames;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.evaluate(y => window.scrollTo(0, y), startY + (targetY - startY) * ease);
    await cap();
  }
}

// Get viewport-relative center of an element (explicit DOMRect extraction)
async function getCenter(selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 · HERO — ~4s
// ─────────────────────────────────────────────────────────────────────────────
await cap(20);  // 0.8s — hero stationary

// Hover nav links
const navSelectors = ['.nav-links a:nth-child(1)', '.nav-links a:nth-child(2)',
                      '.nav-links a:nth-child(3)', '.nav-links a:nth-child(4)'];
for (const sel of navSelectors) {
  const pos = await getCenter(sel);
  if (pos) { await moveTo(pos.x, pos.y, 12); await cap(8); }
}

// Hover primary CTA button
let pos = await getCenter('.hero-cta .btn-primary, .hero-actions .btn-primary, .cta-btn');
if (!pos) pos = await getCenter('.btn-primary');
if (pos) { await moveTo(pos.x, pos.y, 16); await cap(22); }

// Hover secondary / outline button
const outlinePos = await getCenter('.btn-secondary, .btn-outline');
if (outlinePos) { await moveTo(outlinePos.x, outlinePos.y, 14); await cap(16); }

await cap(8);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2 · SCROLL-ANIMATION — плавный проход через всю секцию (~8s)
// ─────────────────────────────────────────────────────────────────────────────
await moveTo(720, 450, 10);
await scrollTo(1600, 36);   // начало анимации
await cap(6);
await scrollTo(2800, 44);   // середина
await cap(6);
await scrollTo(4200, 36);   // конец анимации

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3 · SPECS — ~4s
// ─────────────────────────────────────────────────────────────────────────────
await scrollTo(4480, 20);
await cap(20);  // пауза — читаем заголовок и цифры

// Hover stat items
for (let i = 1; i <= 4; i++) {
  const p = await getCenter(`.spec-item:nth-child(${i}), .specs-grid > *:nth-child(${i})`);
  if (p) { await moveTo(p.x, p.y, 12); await cap(10); }
}
await cap(8);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4 · FEATURES — ~8s (6 карточек)
// ─────────────────────────────────────────────────────────────────────────────
await scrollTo(5100, 22);
await cap(16);  // заголовок «Полный цикл продвижения»

const cards = await page.$$('.feature-card');
for (const card of cards) {
  // Проверяем позицию карточки в viewport, при необходимости подскроллим
  const box = await page.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, visible: r.top > 50 && r.bottom < 860 };
  }, card);

  if (!box.visible) {
    // Карточка не полностью видна — подскроллим к ней
    const scrollY = await page.evaluate(() => window.scrollY);
    const docY = await page.evaluate(el => el.getBoundingClientRect().top + window.scrollY, card);
    await scrollTo(docY - 200, 18);
    await cap(4);
    const refreshed = await page.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }, card);
    await moveTo(refreshed.x, refreshed.y, 16);
  } else {
    await moveTo(box.x, box.y, 16);
  }
  await cap(22);  // держим hover ~0.9s
}
await cap(8);

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 5 · CTA — ~7s
// Специальный блок: ждём glitch-анимацию заголовка (~3s), потом hover кнопку
// ─────────────────────────────────────────────────────────────────────────────
// Скроллим так чтобы CTA секция была хорошо видна (центрируем её)
await scrollTo(5680, 28);
await cap(8);

// Убедимся что special-text виден и IntersectionObserver сработал
// (threshold: 0.5, задержка 120ms перед анимацией)
// Анимация: 31 симв × 2 шага фаза1 + 31×2 фаза2 = 124 шага × 22ms ≈ 2.7s
// Ждём 3.5s — пишем кадры чтобы анимация была в видео
await cap(Math.round(FPS * 3.5)); // 84 кадра = 3.5s

// Hover кнопки CTA — получаем позицию напрямую из DOM
const ctaBtnPos = await page.evaluate(() => {
  const btn = document.querySelector('#cta .btn-primary, #cta .btn-large');
  if (!btn) return null;
  const r = btn.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
});

if (ctaBtnPos && ctaBtnPos.w > 10) {
  await moveTo(ctaBtnPos.x, ctaBtnPos.y, 20);
  await cap(28);  // держим hover — видно скольжение иконки
  // Убираем курсор и возвращаем
  await moveTo(ctaBtnPos.x - 150, ctaBtnPos.y - 40, 14);
  await cap(10);
  await moveTo(ctaBtnPos.x, ctaBtnPos.y, 14);
  await cap(22);
} else {
  // Fallback: если selector не нашёл — используем координаты из известных данных
  // Кнопка при scrollY≈5680: абс. позиция ≈ 6132, viewport y = 6132-5680 = 452
  await moveTo(720, 452, 20);
  await cap(30);
}

await cap(12);  // финальная пауза на CTA

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 6 · ВОЗВРАТ НАВЕРХ — ~3s
// ─────────────────────────────────────────────────────────────────────────────
await scrollTo(0, 54);
await cap(14);

await browser.close();

// ─────────────────────────────────────────────────────────────────────────────
// ENCODE
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\nCaptured ${frameIdx} frames (${(frameIdx/FPS).toFixed(1)}s) → encoding…`);
execSync(
  `ffmpeg -y -framerate ${FPS} -i "${framesDir}/frame-%05d.jpg" ` +
  `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart "${outPath}"`,
  { stdio: 'inherit' }
);
fs.rmSync(framesDir, { recursive: true });
console.log(`\n✓ Video saved: ${outPath}`);
