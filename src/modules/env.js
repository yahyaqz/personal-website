/**
 * Environment probes. Every motion module asks these before doing anything, so
 * that "respect prefers-reduced-motion" and "no cursor on touch" are decided in
 * exactly one place.
 */

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

// `?static` forces the reduced-motion path — no smooth-scroll, no pinned/scrub
// scenes, everything in normal flow. Handy for screenshotting and for reviewing
// layout without the scroll choreography. Opt-in via the URL only.
const staticParam =
	typeof location !== 'undefined' && new URLSearchParams(location.search).has('static');

export const prefersReducedMotion = () => reduceQuery.matches || staticParam;
export const hasFinePointer = () => fineQuery.matches;

/** Re-run the page when the user flips either preference mid-session. */
export function onPreferenceChange(handler) {
	reduceQuery.addEventListener('change', handler);
	fineQuery.addEventListener('change', handler);
}

/** Debounced resize helper shared by the splitter and layout-sensitive modules. */
export function onResize(handler, wait = 200) {
	let id;
	let lastWidth = window.innerWidth;

	window.addEventListener('resize', () => {
		// Mobile browsers fire resize when the URL bar collapses; width-only
		// changes are the ones that actually invalidate a line split.
		if (window.innerWidth === lastWidth) return;
		lastWidth = window.innerWidth;
		clearTimeout(id);
		id = setTimeout(handler, wait);
	});
}
