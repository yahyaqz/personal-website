import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { split } from './split.js';
import { prefersReducedMotion, onResize } from './env.js';

const EASE = 'expo.out';

/**
 * Everything that enters on scroll. Two mechanisms only:
 *   1. masked type   — `[data-split]`, revealed line-by-line or word-by-word
 *   2. block reveals — `[data-reveal]`, a short rise + fade
 * Plus scrubbed parallax for imagery and the scroll-progress bar.
 */
export function initReveals() {
	const reduced = prefersReducedMotion();

	if (reduced) {
		// Show everything in its resting state and skip straight to the loops
		// that don't move (there are none) — nothing else to do.
		document.documentElement.classList.remove('anim');
		gsap.set('[data-split], [data-reveal], [data-hero]', { clearProps: 'all', opacity: 1 });
		initScrollProgress(true);
		return;
	}

	initHero();
	initSplitReveals();
	initBlockReveals();
	initParallax();
	initProjectFrames();
	initConceptReveals();
	initScrollProgress(false);
	initFooterWordmark();

	document.documentElement.classList.remove('anim');
}

/* ------------------------------------------------------------------ hero -- */

function initHero() {
	const title = document.querySelector('[data-hero="title"]');
	const lines = title ? title.querySelectorAll('.line__i') : [];
	const eyebrow = document.querySelector('[data-hero="eyebrow"]');
	const lede = document.querySelector('[data-hero="lede"]');
	const actions = document.querySelector('[data-hero="actions"]');
	const meta = document.querySelector('[data-hero="meta"]');

	gsap.set([eyebrow, lede, actions, meta], { opacity: 0, y: 24 });
	gsap.set(lines, { yPercent: 115, opacity: 1 });
	gsap.set(title, { opacity: 1 });

	const tl = gsap.timeline({ delay: 0.15, defaults: { ease: EASE } });

	tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.9 })
		.to(lines, { yPercent: 0, duration: 1.4, stagger: 0.11 }, '-=0.55')
		.to([lede, actions], { opacity: 1, y: 0, duration: 1, stagger: 0.09 }, '-=0.85')
		.to(meta, { opacity: 1, y: 0, duration: 0.9 }, '-=0.7');

	// Scroll-driven movement of the hero belongs to opening.js — it is part of
	// the pinned scene, not a separate parallax.
}

/* --------------------------------------------------------- masked type --- */

let splitTargets = [];

function buildSplits() {
	splitTargets = [];

	document.querySelectorAll('[data-split]').forEach((el) => {
		const parts = split(el);
		if (!parts || !parts.length) return;
		el.style.opacity = '1';
		splitTargets.push({ el, parts });
	});
}

function initSplitReveals() {
	buildSplits();

	splitTargets.forEach(({ el, parts }) => {
		gsap.set(parts, { yPercent: 115 });

		gsap.to(parts, {
			yPercent: 0,
			duration: 1.25,
			ease: EASE,
			stagger: 0.075,
			scrollTrigger: {
				trigger: el,
				start: 'top 88%',
				once: true
			}
		});
	});

	// A width change invalidates where the lines broke, so re-split and let the
	// already-visible headings settle in their resting position.
	onResize(() => {
		splitTargets.forEach(({ el }) => {
			const wasRevealed = el.getBoundingClientRect().top < window.innerHeight;
			const parts = split(el);
			if (!parts) return;
			gsap.set(parts, { yPercent: wasRevealed ? 0 : 115 });
		});
		ScrollTrigger.refresh();
	});
}

/* -------------------------------------------------------- block reveals -- */

function initBlockReveals() {
	document.querySelectorAll('[data-reveal]').forEach((el) => {
		gsap.set(el, { opacity: 0, y: 26 });
		gsap.to(el, {
			opacity: 1,
			y: 0,
			duration: 1.1,
			ease: EASE,
			scrollTrigger: { trigger: el, start: 'top 90%', once: true }
		});
	});
}

/* -------------------------------------------------------------- parallax -- */

function initParallax() {
	document.querySelectorAll('[data-parallax]').forEach((el) => {
		const strength = parseFloat(el.dataset.parallax) || 0;

		gsap.fromTo(
			el,
			{ yPercent: -strength / 2 },
			{
				yPercent: strength / 2,
				ease: 'none',
				scrollTrigger: {
					trigger: el.closest('.project') || el,
					start: 'top bottom',
					end: 'bottom top',
					scrub: 0.6
				}
			}
		);
	});
}

/**
 * Obermann-style project reveal. Each wide preview grows from a slight scale into
 * place as its row scrolls toward centre (scrubbed to scroll position, so it keeps
 * moving the whole way past), fades up once so it never pops in flat, and the
 * write-up beside it rises in on a stagger.
 */
function initProjectFrames() {
	document.querySelectorAll('.project').forEach((project) => {
		const media = project.querySelector('.project__media');
		const frame = project.querySelector('.project__frame');
		const text = project.querySelector('.project__text');
		const accent = project.dataset.accent;
		if (accent && frame) frame.style.setProperty('--tint', accent);

		// The pre-animation stylesheet hides the frame; reveal it now so the
		// preview is always visible (Obermann-style) and only its scale animates.
		gsap.set(frame, { opacity: 1 });

		// Grow into place, scrubbed to scroll — the signature "scroll past" motion.
		if (media) {
			gsap.fromTo(
				media,
				{ scale: 0.9 },
				{
					scale: 1,
					ease: 'none',
					scrollTrigger: {
						trigger: project,
						start: 'top 85%',
						end: 'center center',
						scrub: 0.85
					}
				}
			);
		}

		// The write-up (name uses data-split) rises in beside the preview.
		if (text) {
			const bits = text.querySelectorAll(
				'.project__index, .project__desc, .project__view'
			);
			gsap.fromTo(
				bits,
				{ opacity: 0, y: 24 },
				{
					opacity: 1,
					y: 0,
					duration: 0.9,
					stagger: 0.1,
					ease: EASE,
					scrollTrigger: { trigger: project, start: 'top 80%', once: true }
				}
			);
		}
	});
}

/** Concept studies clip-reveal and rise in a stagger as the grid enters view. */
function initConceptReveals() {
	const items = [...document.querySelectorAll('.concept:not(.is-hidden)')];
	if (!items.length) return;

	items.forEach((el, i) => {
		const img = el.querySelector('.concept__img');

		gsap.set(el, { opacity: 1 });
		const tl = gsap.timeline({
			scrollTrigger: { trigger: el, start: 'top 88%', once: true },
			defaults: { ease: EASE }
		});

		tl.fromTo(el, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 1 }).fromTo(
			img,
			{ clipPath: 'inset(100% 0% 0% 0%)', scale: 1.12 },
			{ clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.2 },
			0.05
		);
	});
}

/* -------------------------------------------------------- scroll progress -- */

function initScrollProgress(reduced) {
	const bar = document.querySelector('[data-scroll-progress]');
	if (!bar) return;

	if (reduced) {
		const update = () => {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
		};
		window.addEventListener('scroll', update, { passive: true });
		update();
		return;
	}

	gsap.to(bar, {
		scaleX: 1,
		ease: 'none',
		scrollTrigger: { start: 0, end: 'max', scrub: 0.25 }
	});
}

/* ------------------------------------------------------ footer wordmark -- */

function initFooterWordmark() {
	const word = document.querySelector('[data-footer-word]');
	if (!word) return;

	// The wordmark is an SVG so it can scale to the full footer width. Fit the
	// viewBox to the text's real bounding box (once the display font is loaded)
	// so the letters keep their natural proportions — width:100% then scales the
	// whole word uniformly, edge to edge, with no stretching.
	const text = word.querySelector('text');
	if (text) {
		const fit = () => {
			const box = text.getBBox();
			if (!box.width) return;
			const padY = box.height * 0.04;
			word.setAttribute(
				'viewBox',
				`${box.x} ${box.y - padY} ${box.width} ${box.height + padY * 2}`
			);
		};
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(fit);
		}
		fit();
	}

	gsap.fromTo(
		word,
		{ yPercent: 22, scale: 0.96 },
		{
			yPercent: 0,
			scale: 1,
			ease: 'none',
			scrollTrigger: {
				trigger: '.footer',
				start: 'top bottom',
				end: 'bottom bottom',
				scrub: 0.7
			}
		}
	);
}
