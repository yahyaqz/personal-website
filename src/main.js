/* Fonts — self-hosted, subset by unicode-range, no runtime network dependency. */
import '@fontsource-variable/archivo/wght.css';
import '@fontsource-variable/inter/wght.css';
// Italic only — the serif appears exclusively as the emphasised words in
// display headings, so the upright cut would be 21 kB of dead weight.
import '@fontsource/instrument-serif/latin-400-italic.css';

import './styles/base.css';
import './styles/chrome.css';
import './styles/sections.css';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import { initSmoothScroll } from './modules/smoothScroll.js';
import { initReveals } from './modules/reveals.js';
import { initOpening } from './modules/opening.js';
import { initCursor } from './modules/cursor.js';
import { initTrail } from './modules/trail.js';
import { initMagnetic } from './modules/magnetic.js';
import { initNav } from './modules/nav.js';
import { initSquiggles } from './modules/squiggle.js';
import { initServices, initShowMore, initProcess, initAccordion } from './modules/sections.js';
import {
	initBeforeAfter,
	initDevices,
	initInversion,
	initOdometer,
	initProjectHover
} from './modules/showcase.js';
import { initPricing } from './modules/pricing.js';
import { initForm } from './modules/form.js';
import { initProjectModal } from './modules/modal.js';
import { initEmbeds } from './modules/embeds.js';

gsap.registerPlugin(ScrollTrigger);

function boot() {
	// Scroll engine first — every ScrollTrigger created afterwards reads its
	// position from Lenis.
	initSmoothScroll();

	initNav();
	initSquiggles();

	// initReveals runs the hero load-in; initOpening then builds the pinned
	// scrub on top of it. They animate disjoint properties — see opening.js.
	initReveals();
	initOpening();

	initCursor();
	initTrail();
	initMagnetic();
	initServices();
	initShowMore();
	initProcess();
	initAccordion();

	// The interactions that demonstrate the service, plus the chapter
	// inversion that frames them.
	initBeforeAfter();
	initDevices();
	initInversion();
	initOdometer();
	// Uses x/y in pixels; the scroll parallax uses yPercent, so they compose
	// rather than fight.
	initProjectHover();

	// Scale the live demo iframes to fill their portfolio frames.
	initEmbeds();

	initPricing();
	initForm();
	initProjectModal();

	// Webfonts change line lengths, which changes where every trigger fires.
	if (document.fonts?.ready) {
		document.fonts.ready.then(() => ScrollTrigger.refresh());
	}
	window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
	boot();
}

// Failsafe: if a module throws before `initReveals` clears the pre-animation
// class, the content must still become visible.
window.addEventListener('error', () => document.documentElement.classList.remove('anim'));
setTimeout(() => document.documentElement.classList.remove('anim'), 3000);
