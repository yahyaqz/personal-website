import gsap from 'gsap';
import { prefersReducedMotion, onResize } from './env.js';

/**
 * Hand-drawn pink navigation indicator.
 *
 * Each nav link gets its own SVG squiggle whose path is generated with jittered
 * control points, so no two are identical and none of them is a straight line.
 * Activating a link animates stroke-dashoffset from "not drawn" to "drawn";
 * deactivating keeps pulling the dash in the same direction so the stroke wipes
 * away forwards rather than rewinding.
 */

const AMPLITUDE = 3.1; // vertical wobble in viewBox units
const SEGMENTS = 5;

/** Deterministic per-link jitter — stable across resizes, different per link. */
function noise(seed, i) {
	const x = Math.sin(seed * 41.7 + i * 17.3) * 43758.5453;
	return x - Math.floor(x); // 0..1
}

function buildPath(width, height, seed) {
	const mid = height / 2;
	const step = width / SEGMENTS;

	// Start slightly in from the edge and at a slight angle, the way a pen does.
	let d = `M ${(noise(seed, 0) * 4).toFixed(2)} ${(mid + (noise(seed, 1) - 0.5) * AMPLITUDE).toFixed(2)}`;

	for (let i = 1; i <= SEGMENTS; i++) {
		const x = step * i;
		const y = mid + (noise(seed, i + 2) - 0.5) * AMPLITUDE * 2;
		const cx = x - step / 2;
		const cy = mid + (noise(seed, i + 9) - 0.5) * AMPLITUDE * 2.6;
		d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
	}

	return d;
}

export function initSquiggles() {
	const links = [...document.querySelectorAll('[data-nav-link]')];
	if (!links.length) return;

	const reduced = prefersReducedMotion();
	const entries = links.map((link, index) => mount(link, index)).filter(Boolean);
	let active = null;

	function mount(link, index) {
		const slot = link.querySelector('.nav__squiggle');
		if (!slot) return null;

		const width = 100;
		const height = 12;

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		svg.setAttribute('preserveAspectRatio', 'none');
		svg.setAttribute('aria-hidden', 'true');

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', buildPath(width, height, index + 1));
		svg.appendChild(path);
		slot.replaceChildren(svg);

		const length = path.getTotalLength();
		gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

		return { link, path, length, seed: index + 1, width, height };
	}

	function activate(entry) {
		if (!entry || entry === active) return;
		if (active) deactivate(active);
		active = entry;
		entry.link.classList.add('is-current');

		gsap.killTweensOf(entry.path);

		if (reduced) {
			gsap.set(entry.path, { strokeDashoffset: 0 });
			return;
		}

		// Redraw with fresh jitter each time so repeat visits are never identical.
		entry.path.setAttribute('d', buildPath(entry.width, entry.height, entry.seed + Math.random()));
		const length = entry.path.getTotalLength();
		entry.length = length;

		gsap.fromTo(
			entry.path,
			{ strokeDasharray: length, strokeDashoffset: length },
			{ strokeDashoffset: 0, duration: 0.52, ease: 'power2.out' }
		);
	}

	function deactivate(entry) {
		entry.link.classList.remove('is-current');
		gsap.killTweensOf(entry.path);

		if (reduced) {
			gsap.set(entry.path, { strokeDashoffset: entry.length });
			return;
		}

		gsap.to(entry.path, {
			strokeDashoffset: -entry.length,
			duration: 0.34,
			ease: 'power2.in'
		});
	}

	const find = (link) => entries.find((entry) => entry.link === link);

	// Scroll position is the source of truth (nav.js emits this), but a click
	// should feel instant rather than waiting for the scroll to arrive.
	document.addEventListener('nav:active', (event) => activate(find(event.detail.link)));

	links.forEach((link) => {
		link.addEventListener('click', () => activate(find(link)));
	});

	onResize(() => {
		entries.forEach((entry) => {
			entry.path.setAttribute('d', buildPath(entry.width, entry.height, entry.seed));
			entry.length = entry.path.getTotalLength();
			const drawn = entry === active;
			gsap.set(entry.path, {
				strokeDasharray: entry.length,
				strokeDashoffset: drawn ? 0 : entry.length
			});
		});
	});
}
