/**
 * Generates the placeholder website mockups in /public/mockups.
 *
 * These are original, abstract representations of a page layout — not
 * screenshots. Replace any file with a real export at the same dimensions and
 * the site picks it up with no code changes.
 *
 *   node scripts/make-mockups.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/mockups');
mkdirSync(OUT, { recursive: true });

/* ----------------------------------------------------------- primitives -- */

const r = (x, y, w, h, fill, rx = 0, opacity = 1) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${
		opacity === 1 ? '' : ` opacity="${opacity}"`
	}/>`;

const c = (cx, cy, rad, fill, opacity = 1) =>
	`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"${
		opacity === 1 ? '' : ` opacity="${opacity}"`
	}/>`;

const line = (x1, y1, x2, y2, stroke, opacity = 0.18) =>
	`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"/>`;

/** A stack of text-like bars with tapering widths. */
const textBlock = (x, y, widths, h, fill, gap, opacity = 1, rx = 0) =>
	widths.map((w, i) => r(x, y + i * (h + gap), w, h, fill, rx, opacity)).join('');

const svg = (w, h, body, bg) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">` +
	r(0, 0, w, h, bg) +
	body +
	'</svg>\n';

const write = (name, content) => {
	writeFileSync(resolve(OUT, name), content, 'utf8');
	console.log('  ✓', name);
};

/* -------------------------------------------------------------- palettes -- */

const PALETTES = {
	astra: { bg: '#151011', panel: '#1E1719', ink: '#ECE6E5', dim: '#7C7073', accent: '#B5566B' },
	cwh: { bg: '#F4EFEE', panel: '#E7DEDD', ink: '#1A1416', dim: '#8B7F82', accent: '#8E5F72' },
	lucky: { bg: '#181314', panel: '#231B1D', ink: '#EFE8E6', dim: '#847678', accent: '#C0836F' }
};

/* ------------------------------------------------------- desktop mockup --- */

function desktop(p) {
	const W = 1440;
	const H = 900;
	let s = '';

	// Browser chrome
	s += r(0, 0, W, 46, p.panel);
	s += c(30, 23, 5, p.dim, 0.5) + c(50, 23, 5, p.dim, 0.35) + c(70, 23, 5, p.dim, 0.25);
	s += r(W / 2 - 170, 14, 340, 18, p.bg, 9, 0.7);

	// Site nav
	s += r(72, 84, 132, 13, p.ink, 2);
	[0, 1, 2, 3].forEach((i) => s += r(920 + i * 88, 87, 58, 8, p.dim, 2, 0.55));
	s += r(1272, 76, 96, 32, p.accent, 16);
	s += line(0, 140, W, 140, p.ink, 0.1);

	// Hero — oversized headline bars beside a tinted image plate
	s += r(72, 196, 96, 8, p.accent, 4);
	s += textBlock(72, 232, [560, 690, 400], 46, p.ink, 20);
	s += textBlock(72, 456, [380, 300], 10, p.dim, 14, 0.6);
	s += r(72, 528, 168, 46, p.accent, 23);
	s += r(268, 528, 130, 46, 'none', 23);
	s += `<rect x="268" y="528" width="130" height="46" rx="23" fill="none" stroke="${p.ink}" stroke-width="1" opacity="0.35"/>`;

	s += `<defs><linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0" stop-color="${p.accent}" stop-opacity="0.55"/>
		<stop offset="1" stop-color="${p.accent}" stop-opacity="0.12"/></linearGradient></defs>`;
	s += r(880, 196, 488, 380, p.panel, 4);
	s += r(880, 196, 488, 380, 'url(#hero)', 4);
	s += c(1124, 386, 62, p.ink, 0.12);
	s += c(1124, 386, 30, p.accent, 0.85);

	// Content grid
	s += line(72, 656, W - 72, 656, p.ink, 0.1);
	[0, 1, 2].forEach((i) => {
		const x = 72 + i * 432;
		s += r(x, 700, 384, 118, p.panel, 3);
		s += r(x, 700, 384, 118, p.accent, 3, i === 1 ? 0.16 : 0.07);
		s += textBlock(x, 838, [180, 260], 9, p.dim, 12, 0.55);
	});

	return svg(W, H, s, p.bg);
}

/* -------------------------------------------------------- mobile mockup --- */

function mobile(p) {
	const W = 390;
	const H = 780;
	let s = '';

	// Status bar + notch
	s += r(0, 0, W, 40, p.bg);
	s += r(150, 12, 90, 16, p.panel, 8);
	s += r(26, 17, 34, 6, p.dim, 3, 0.5);

	// Nav
	s += r(26, 62, 84, 10, p.ink, 2);
	s += r(330, 62, 34, 3, p.ink, 2, 0.8) + r(340, 71, 24, 3, p.ink, 2, 0.8);

	// Hero
	s += r(26, 124, 62, 6, p.accent, 3);
	s += textBlock(26, 150, [300, 250, 190], 30, p.ink, 12);
	s += textBlock(26, 288, [280, 220], 8, p.dim, 11, 0.6);
	s += r(26, 344, 148, 42, p.accent, 21);

	// Image plate
	s += `<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/>
		<stop offset="1" stop-color="${p.accent}" stop-opacity="0.1"/></linearGradient></defs>`;
	s += r(26, 418, 338, 200, p.panel, 4);
	s += r(26, 418, 338, 200, 'url(#m)', 4);
	s += c(195, 518, 34, p.accent, 0.85);

	// Cards
	[0, 1].forEach((i) => {
		const x = 26 + i * 176;
		s += r(x, 650, 162, 62, p.panel, 3);
		s += r(x, 726, 110, 7, p.dim, 3, 0.5);
	});

	return svg(W, H, s, p.bg);
}

/* --------------------------------------------------- concept archetypes --- */

const CONCEPT_W = 900;
const CONCEPT_H = 640;

const concepts = {
	/** Editorial — a dominant headline against a single tall plate. */
	editorial(p) {
		let s = r(0, 0, CONCEPT_W, 54, p.panel);
		s += r(48, 22, 90, 10, p.ink, 2);
		s += textBlock(48, 118, [400, 330, 250], 40, p.ink, 16);
		s += r(48, 336, 96, 7, p.accent, 3);
		s += textBlock(48, 372, [300, 250, 200], 8, p.dim, 12, 0.55);
		s += r(520, 100, 332, 460, p.panel, 3);
		s += r(520, 100, 332, 460, p.accent, 3, 0.28);
		s += line(48, 580, 852, 580, p.ink, 0.14);
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	},

	/** Gallery — an even grid of plates. */
	gallery(p) {
		let s = r(0, 0, CONCEPT_W, 54, p.panel);
		s += r(48, 22, 110, 10, p.ink, 2);
		s += textBlock(48, 96, [260], 26, p.ink, 0);
		for (let row = 0; row < 2; row++) {
			for (let col = 0; col < 3; col++) {
				const x = 48 + col * 272;
				const y = 168 + row * 226;
				s += r(x, y, 252, 168, p.panel, 3);
				s += r(x, y, 252, 168, p.accent, 3, (row + col) % 2 ? 0.24 : 0.1);
				s += r(x, y + 184, 130, 7, p.dim, 3, 0.55);
			}
		}
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	},

	/** Interface — sidebar, rows and a bar chart. */
	interface(p) {
		let s = r(0, 0, 208, CONCEPT_H, p.panel);
		s += r(36, 40, 96, 10, p.ink, 2);
		for (let i = 0; i < 6; i++) {
			s += r(36, 96 + i * 34, i === 1 ? 130 : 108, 8, i === 1 ? p.accent : p.dim, 3, i === 1 ? 1 : 0.45);
		}
		s += r(256, 44, 200, 16, p.ink, 2);
		s += r(256, 92, 596, 1, p.dim, 0, 0.25);
		const bars = [96, 148, 118, 190, 132, 214, 160];
		bars.forEach((h, i) => {
			s += r(256 + i * 88, 340 - h, 54, h, i === 5 ? p.accent : p.dim, 2, i === 5 ? 0.95 : 0.3);
		});
		s += line(256, 342, 852, 342, p.ink, 0.2);
		for (let i = 0; i < 4; i++) {
			s += r(256, 400 + i * 54, 596, 34, p.panel, 3);
			s += r(276, 412, 120, 8, p.dim, 3, 0.4);
		}
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	},

	/** Catalogue — dense product columns. */
	catalogue(p) {
		let s = r(0, 0, CONCEPT_W, 54, p.panel);
		s += r(48, 22, 96, 10, p.ink, 2);
		s += r(760, 20, 92, 14, p.accent, 7);
		s += textBlock(48, 92, [300], 22, p.ink, 0);
		for (let i = 0; i < 4; i++) {
			const x = 48 + i * 206;
			s += r(x, 160, 186, 230, p.panel, 3);
			s += r(x, 160, 186, 230, p.accent, 3, i % 2 ? 0.2 : 0.08);
			s += textBlock(x, 408, [120, 70], 8, p.dim, 12, 0.5);
			s += r(x, 456, 54, 10, p.accent, 2, 0.9);
		}
		s += line(48, 520, 852, 520, p.ink, 0.14);
		s += textBlock(48, 552, [420, 300], 8, p.dim, 12, 0.4);
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	},

	/** Portfolio — one hero plate with an offset caption card. */
	portfolio(p) {
		let s = r(0, 0, CONCEPT_W, 54, p.panel);
		s += r(48, 22, 104, 10, p.ink, 2);
		s += r(48, 100, 700, 400, p.panel, 3);
		s += r(48, 100, 700, 400, p.accent, 3, 0.3);
		s += c(398, 300, 88, p.bg, 0.5);
		s += c(398, 300, 40, p.accent, 0.9);
		s += r(560, 430, 292, 150, p.bg, 3);
		s += `<rect x="560" y="430" width="292" height="150" fill="none" stroke="${p.ink}" stroke-width="1" opacity="0.16"/>`;
		s += textBlock(588, 464, [180, 230, 140], 9, p.dim, 14, 0.6);
		s += r(588, 542, 64, 8, p.accent, 3);
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	},

	/** Storefront — hero band over two product cards. */
	storefront(p) {
		let s = r(0, 0, CONCEPT_W, 54, p.panel);
		s += r(48, 22, 92, 10, p.ink, 2);
		s += r(48, 92, 804, 260, p.panel, 3);
		s += r(48, 92, 804, 260, p.accent, 3, 0.22);
		s += textBlock(88, 150, [280, 200], 28, p.ink, 14);
		s += r(88, 262, 132, 38, p.accent, 19);
		[0, 1].forEach((i) => {
			const x = 48 + i * 414;
			s += r(x, 388, 390, 160, p.panel, 3);
			s += r(x + 24, 412, 112, 112, p.accent, 3, 0.35);
			s += textBlock(x + 160, 428, [160, 120], 8, p.dim, 13, 0.55);
			s += r(x + 160, 486, 70, 10, p.accent, 2, 0.9);
		});
		s += line(48, 588, 852, 588, p.ink, 0.14);
		return svg(CONCEPT_W, CONCEPT_H, s, p.bg);
	}
};

/* ------------------------------- redesign pair (before / after) ---------- */

/** The "before": cramped, centred, gradient buttons, clip-art blocks. */
function redesignBefore() {
	const W = 1440;
	const H = 900;
	const bg = '#E8E9EA';
	const nav = '#2B4A7D';
	const text = '#4A4F55';
	let s = '';

	s += `<defs><linearGradient id="oldbtn" x1="0" y1="0" x2="0" y2="1">
		<stop offset="0" stop-color="#FFB733"/><stop offset="1" stop-color="#E07A16"/></linearGradient></defs>`;

	// Heavy blue bar with a stretched wordmark and cramped tabs
	s += r(0, 0, W, 92, nav);
	s += r(40, 30, 210, 32, '#FFFFFF', 0, 0.92);
	for (let i = 0; i < 6; i++) s += r(560 + i * 132, 44, 104, 22, '#FFFFFF', 0, 0.42);

	// Boxed content column — the classic 960px centred layout
	s += r(150, 92, 1140, 808, '#FFFFFF');
	s += r(180, 124, 1080, 250, '#C7CDD4');
	s += r(470, 214, 500, 26, '#8D959E');
	s += r(560, 254, 320, 18, '#A6ADB5');
	s += r(620, 296, 200, 44, 'url(#oldbtn)', 4);

	// Three clip-art columns of dense small text
	for (let i = 0; i < 3; i++) {
		const x = 190 + i * 360;
		s += c(x + 60, 460, 40, '#B9C0C8');
		s += r(x, 520, 240, 16, '#7E858D');
		for (let j = 0; j < 6; j++) s += r(x, 552 + j * 20, j === 5 ? 150 : 320, 9, text, 0, 0.45);
	}

	// Cluttered footer strip
	s += r(150, 800, 1140, 100, '#D5DAE0');
	for (let i = 0; i < 5; i++) s += r(190 + i * 210, 828, 150, 10, '#8D959E');
	s += r(190, 862, 620, 9, '#A6ADB5');

	return svg(W, H, s, bg);
}

/** The "after": the same business, rebuilt in the Avero language. */
function redesignAfter() {
	const W = 1440;
	const H = 900;
	const p = { bg: '#131011', panel: '#1D1719', ink: '#ECE6E5', dim: '#7F7476', accent: '#C0707F' };
	let s = '';

	s += r(64, 52, 150, 13, p.ink, 2);
	[0, 1, 2].forEach((i) => s += r(1000 + i * 104, 55, 68, 8, p.dim, 2, 0.6));
	s += r(1300, 42, 76, 34, p.accent, 17);

	s += `<defs><linearGradient id="newhero" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/>
		<stop offset="1" stop-color="${p.accent}" stop-opacity="0.08"/></linearGradient></defs>`;

	// Generous type-led hero
	s += r(64, 190, 86, 7, p.accent, 3);
	s += textBlock(64, 232, [620, 480], 58, p.ink, 22);
	s += textBlock(64, 400, [340, 260], 10, p.dim, 14, 0.6);
	s += r(64, 470, 176, 48, p.accent, 24);

	s += r(830, 150, 546, 470, p.panel, 4);
	s += r(830, 150, 546, 470, 'url(#newhero)', 4);
	s += c(1103, 385, 58, p.accent, 0.9);

	s += line(64, 700, W - 64, 700, p.ink, 0.12);
	[0, 1, 2].forEach((i) => {
		const x = 64 + i * 442;
		s += r(x, 744, 404, 96, p.panel, 3);
		s += r(x, 744, 404, 96, p.accent, 3, i === 1 ? 0.2 : 0.07);
	});

	return svg(W, H, s, p.bg);
}

/* --------------------------------- spotlight pair (wire / final) --------- */

const SPOT_W = 1440;
const SPOT_H = 810;

/** Blueprint state: grid, boxes, no colour. */
function spotWireframe() {
	const bg = '#131011';
	const wire = '#6E6466';
	let s = '';

	// Blueprint grid
	for (let x = 0; x <= SPOT_W; x += 48) s += line(x, 0, x, SPOT_H, wire, 0.09);
	for (let y = 0; y <= SPOT_H; y += 48) s += line(0, y, SPOT_W, y, wire, 0.09);

	const box = (x, y, w, h, cross = false) => {
		let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${wire}" stroke-width="1.5" opacity="0.75"/>`;
		if (cross) {
			out += `<path d="M${x} ${y} L${x + w} ${y + h} M${x + w} ${y} L${x} ${y + h}" stroke="${wire}" stroke-width="1" opacity="0.4"/>`;
		}
		return out;
	};

	s += box(64, 44, 148, 26);
	[0, 1, 2].forEach((i) => s += box(1010 + i * 100, 48, 66, 18));
	s += box(64, 168, 620, 54) + box(64, 236, 500, 54) + box(64, 310, 360, 54);
	s += box(64, 404, 168, 46);
	s += box(830, 140, 546, 460, true);
	[0, 1, 2].forEach((i) => s += box(64 + i * 442, 660, 404, 100, true));

	return svg(SPOT_W, SPOT_H, s, bg);
}

/** The finished design underneath. */
function spotFinal() {
	const p = { bg: '#131011', panel: '#1E1719', ink: '#ECE6E5', dim: '#7F7476', accent: '#C0707F' };
	let s = '';

	s += r(64, 44, 148, 26, p.ink, 2);
	[0, 1, 2].forEach((i) => s += r(1010 + i * 100, 48, 66, 18, p.dim, 2, 0.6));

	s += `<defs><linearGradient id="spotHero" x1="0" y1="0" x2="1" y2="1">
		<stop offset="0" stop-color="${p.accent}" stop-opacity="0.55"/>
		<stop offset="1" stop-color="${p.accent}" stop-opacity="0.1"/></linearGradient></defs>`;

	s += textBlock(64, 168, [620, 500, 360], 54, p.ink, 14);
	s += r(64, 404, 168, 46, p.accent, 23);
	s += r(830, 140, 546, 460, p.panel, 4);
	s += r(830, 140, 546, 460, 'url(#spotHero)', 4);
	s += c(1103, 370, 62, p.accent, 0.9);

	[0, 1, 2].forEach((i) => {
		const x = 64 + i * 442;
		s += r(x, 660, 404, 100, p.panel, 3);
		s += r(x, 660, 404, 100, p.accent, 3, i === 1 ? 0.22 : 0.08);
	});

	return svg(SPOT_W, SPOT_H, s, p.bg);
}

/* ------------------------------------------------------------------ run --- */

console.log('Generating mockups →', OUT);

for (const [key, palette] of Object.entries(PALETTES)) {
	write(`${key}-desktop.svg`, desktop(palette));
	write(`${key}-mobile.svg`, mobile(palette));
}

const CONCEPT_SPECS = [
	['concept-01.svg', 'editorial', { bg: '#141011', panel: '#1F1819', ink: '#ECE6E5', dim: '#7E7274', accent: '#C0707F' }],
	['concept-02.svg', 'portfolio', { bg: '#F4EFEE', panel: '#E6DCDB', ink: '#171213', dim: '#8A7E80', accent: '#B3697A' }],
	['concept-03.svg', 'interface', { bg: '#12100F', panel: '#1C1718', ink: '#ECE6E5', dim: '#7B7072', accent: '#9E7A8C' }],
	['concept-04.svg', 'catalogue', { bg: '#1A1516', panel: '#241C1E', ink: '#EFE8E6', dim: '#867A7C', accent: '#C0836F' }],
	['concept-05.svg', 'gallery', { bg: '#F2ECEB', panel: '#E2D7D6', ink: '#171213', dim: '#8B7F81', accent: '#A85C6C' }],
	['concept-06.svg', 'storefront', { bg: '#151112', panel: '#201819', ink: '#ECE6E5', dim: '#7F7375', accent: '#CE8A97' }]
];

for (const [name, archetype, palette] of CONCEPT_SPECS) {
	write(name, concepts[archetype](palette));
}

write('redesign-before.svg', redesignBefore());
write('redesign-after.svg', redesignAfter());
write('spot-wireframe.svg', spotWireframe());
write('spot-final.svg', spotFinal());

console.log('Done.');
