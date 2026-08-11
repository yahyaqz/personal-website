import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';

let lenis = null;
let anchorTimer = null;

/**
 * Lenis drives the scroll position, GSAP's ticker drives Lenis, and every
 * ScrollTrigger updates from Lenis' scroll event. Wiring it in that order is
 * what keeps scrubbed animations from lagging a frame behind the page.
 */
export function initSmoothScroll() {
	if (prefersReducedMotion()) {
		// Native scrolling only. Anchor jumps still work via CSS-free JS below.
		bindAnchors();
		return null;
	}

	lenis = new Lenis({
		// Lenis damps toward the target with a time-constant of ~1/(lerp*60)s.
		// The old 0.095 meant ~175ms of catch-up on every wheel tick — smooth,
		// but it read as lag/delay. 0.2 (~80ms) still glides but tracks the
		// input closely enough to feel direct. Raise further toward native feel.
		lerp: 0.2,
		// A touch more travel per notch so the page keeps up with intent.
		wheelMultiplier: 1.1,
		touchMultiplier: 1.6,
		smoothWheel: true,
		// Touch devices already have momentum scrolling; doubling it feels wrong.
		syncTouch: false
	});

	lenis.on('scroll', ScrollTrigger.update);

	gsap.ticker.add((time) => lenis.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	// Deliberately no scrollerProxy: Lenis drives the real window scroll, so
	// ScrollTrigger already reads the correct position — and registering a proxy
	// here breaks pinning in the opening scene.

	bindAnchors();
	return lenis;
}

export const getLenis = () => lenis;

/** Freeze the page behind the mobile menu without a layout-shifting overflow flip. */
export function lockScroll(locked) {
	if (lenis) {
		locked ? lenis.stop() : lenis.start();
	} else {
		document.body.style.overflow = locked ? 'hidden' : '';
	}
}

// easeInOutCubic — accelerates off the mark and settles without the long,
// laggy tail Lenis' default scrollTo easing leaves on short jumps.
const anchorEase = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function scrollTo(target, opts = {}) {
	if (lenis) {
		// Scale the duration to the distance so a jump to the next section is
		// quick while a jump across the whole page still feels deliberate —
		// a fixed duration made short hops feel sluggish and long hops rushed.
		const el = typeof target === 'string' ? document.querySelector(target) : target;
		const to = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + lenis.scroll : 0;
		const distance = Math.abs(to - lenis.scroll);
		const duration = Math.min(1.2, Math.max(0.6, distance / 3200));

		// Stop clear of the fixed bar so the section heading isn't parked behind
		// it (the bar stays visible through the jump). Anything above the hero
		// guard — i.e. #top — wants the very top, not an inset.
		const bar = document.querySelector('[data-nav]');
		const clearance = typeof target === 'number' ? 0 : bar ? bar.offsetHeight + 8 : 76;

		// Freeze the nav auto-hide for the length of the trip (nav.js watches this
		// flag) so the bar doesn't fight the programmatic scroll.
		const root = document.documentElement;
		root.classList.add('is-anchoring');
		// Guaranteed release: if the user grabs the wheel mid-jump, Lenis abandons
		// the tween without firing onComplete, which would strand the flag and
		// leave the nav auto-hide disabled. A timed fallback can't be orphaned.
		clearTimeout(anchorTimer);
		const release = () => {
			clearTimeout(anchorTimer);
			root.classList.remove('is-anchoring');
		};
		anchorTimer = setTimeout(release, duration * 1000 + 120);

		lenis.scrollTo(target, {
			offset: -clearance,
			duration,
			easing: anchorEase,
			...opts,
			onComplete: () => {
				release();
				opts.onComplete?.();
			}
		});
	} else {
		const el = typeof target === 'string' ? document.querySelector(target) : target;
		if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'auto', block: 'start' });
		else window.scrollTo(0, 0);
	}
}

function bindAnchors() {
	document.addEventListener('click', (event) => {
		const link = event.target.closest('a[href^="#"]');
		if (!link) return;

		const id = link.getAttribute('href');
		if (!id || id === '#') return;

		const target = document.querySelector(id);
		if (!target) return;

		event.preventDefault();
		scrollTo(id === '#top' ? 0 : target);

		// Keep the keyboard where the eye went.
		target.setAttribute('tabindex', '-1');
		target.focus({ preventScroll: true });
	});
}
