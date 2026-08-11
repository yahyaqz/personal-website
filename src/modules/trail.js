import { hasFinePointer, prefersReducedMotion } from './env.js';

/**
 * Pink ribbon cursor trail.
 *
 * Not particles: a single continuous stroke through the recent path of a
 * spring-damped "head" that chases the pointer. Because the head lags the
 * cursor, direction changes come out as curves rather than corners, and the
 * stroke tapers to nothing at the tail so it reads as ink running out.
 *
 * Drawn on one canvas with quadratic segments between point midpoints — no DOM
 * churn, and the loop parks itself the moment the ribbon has fully collapsed.
 */

const POINTS = 26; // ribbon length in samples
const CHASE = 0.34; // how hard the head follows the pointer (elasticity)
const MAX_WIDTH = 7; // px at the head
const CORE = '238, 126, 155'; // --pink
const GLOW = '247, 180, 196'; // --pink-soft

export function initTrail() {
	if (!hasFinePointer() || prefersReducedMotion()) return;

	const canvas = document.querySelector('[data-trail]');
	if (!canvas) return;

	const ctx = canvas.getContext('2d', { alpha: true });
	if (!ctx) return;

	let dpr = 1;
	let width = 0;
	let height = 0;

	const resize = () => {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(height * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	resize();
	window.addEventListener('resize', resize);

	const pointer = { x: -100, y: -100 };
	const head = { x: -100, y: -100 };
	const trail = [];

	let running = false;
	let seen = false;
	let idleFrames = 0;

	window.addEventListener(
		'pointermove',
		(event) => {
			if (event.pointerType !== 'mouse') return;
			pointer.x = event.clientX;
			pointer.y = event.clientY;

			if (!seen) {
				seen = true;
				head.x = pointer.x;
				head.y = pointer.y;
				canvas.classList.add('is-active');
			}

			idleFrames = 0;
			if (!running) {
				running = true;
				requestAnimationFrame(frame);
			}
		},
		{ passive: true }
	);

	// A trail hanging in mid-air after the pointer leaves looks broken.
	document.addEventListener('pointerleave', () => canvas.classList.remove('is-active'));
	document.addEventListener('pointerenter', () => seen && canvas.classList.add('is-active'));

	function frame() {
		head.x += (pointer.x - head.x) * CHASE;
		head.y += (pointer.y - head.y) * CHASE;

		trail.push({ x: head.x, y: head.y });
		while (trail.length > POINTS) trail.shift();

		draw();

		// Park the loop once the ribbon has caught up and collapsed onto itself,
		// so an idle page costs nothing.
		const settled = Math.hypot(pointer.x - head.x, pointer.y - head.y) < 0.4;
		idleFrames = settled ? idleFrames + 1 : 0;

		if (idleFrames > POINTS + 6) {
			running = false;
			trail.length = 0;
			ctx.clearRect(0, 0, width, height);
			return;
		}

		requestAnimationFrame(frame);
	}

	function draw() {
		ctx.clearRect(0, 0, width, height);
		if (trail.length < 3) return;

		// Two passes: a wide soft halo, then the bright core on top. Cheaper and
		// crisper than shadowBlur.
		stroke(MAX_WIDTH * 2.8, GLOW, 0.16);
		stroke(MAX_WIDTH, CORE, 0.62);
	}

	function stroke(maxWidth, rgb, maxAlpha) {
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		for (let i = 1; i < trail.length - 1; i++) {
			const t = i / (trail.length - 1); // 0 at the tail, 1 at the head
			const prev = trail[i - 1];
			const curr = trail[i];
			const next = trail[i + 1];

			// Curve through each sample using the midpoints as anchors — this is
			// what turns a jagged sample path into a smooth ribbon.
			const from = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
			const to = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };

			ctx.beginPath();
			ctx.moveTo(from.x, from.y);
			ctx.quadraticCurveTo(curr.x, curr.y, to.x, to.y);
			ctx.lineWidth = Math.max(0.1, maxWidth * t * t);
			ctx.strokeStyle = `rgba(${rgb}, ${maxAlpha * t})`;
			ctx.stroke();
		}
	}
}
