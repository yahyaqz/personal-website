import gsap from 'gsap';
import { hasFinePointer, prefersReducedMotion } from './env.js';

/**
 * Two-part cursor: a dot that tracks the pointer almost exactly, and a ring
 * that trails behind and swells into a label over interactive targets.
 *
 * Never mounted on touch or coarse-pointer devices.
 */

/** `data-cursor` values that swell the ring into a labelled pill. Other values
 *  (`link`, `hide`) are handled as states, not labels. */
const LABELS = {
	view: 'View Project ↗',
	peek: 'View'
};

export function initCursor() {
	if (!hasFinePointer() || prefersReducedMotion()) return;

	const root = document.querySelector('[data-cursor-root]');
	const dot = document.querySelector('[data-cursor-dot]');
	const ring = document.querySelector('[data-cursor-ring]');
	const label = document.querySelector('[data-cursor-label]');
	if (!root || !dot || !ring) return;

	const dotX = gsap.quickTo(dot, 'x', { duration: 0.14, ease: 'power3.out' });
	const dotY = gsap.quickTo(dot, 'y', { duration: 0.14, ease: 'power3.out' });
	const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' });
	const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' });

	let shown = false;

	window.addEventListener(
		'pointermove',
		(event) => {
			if (event.pointerType !== 'mouse') return;

			if (!shown) {
				shown = true;
				root.classList.add('is-active');
				gsap.set([dot, ring], { x: event.clientX, y: event.clientY });
			}

			dotX(event.clientX);
			dotY(event.clientY);
			ringX(event.clientX);
			ringY(event.clientY);
		},
		{ passive: true }
	);

	document.addEventListener('pointerleave', () => root.classList.remove('is-active'));
	document.addEventListener('pointerenter', () => shown && root.classList.add('is-active'));

	// Resolve the cursor state from whatever is under the pointer.
	document.addEventListener(
		'pointerover',
		(event) => {
			const target = event.target instanceof Element ? event.target : null;
			if (!target) return;

			const flagged = target.closest('[data-cursor]');
			const key = flagged?.dataset.cursor;

			if (key === 'hide') return setState(null, 'hidden');
			if (key && LABELS[key]) return setState(LABELS[key], 'label', 72);
			if (key === 'link' || target.closest('a, button, input, select, textarea, label')) {
				return setState(null, 'grow');
			}
			setState(null, 'idle');
		},
		{ passive: true }
	);

	function setState(text, mode, size = 44) {
		root.classList.toggle('is-hidden', mode === 'hidden');
		root.classList.toggle('is-label', mode === 'label');

		if (text !== null && label) label.textContent = text;

		const scale = mode === 'grow' ? 1.55 : 1;
		gsap.to(ring, {
			width: mode === 'label' ? size * 1.9 : 44,
			height: mode === 'label' ? size : 44,
			margin: mode === 'label' ? `${-size / 2}px 0 0 ${-size * 0.95}px` : '-22px 0 0 -22px',
			borderRadius: mode === 'label' ? '999px' : '999px',
			scale,
			duration: 0.4,
			ease: 'power3.out'
		});
		gsap.to(dot, { scale: mode === 'grow' ? 0 : 1, duration: 0.3, ease: 'power3.out' });
	}
}
