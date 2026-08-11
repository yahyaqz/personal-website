import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';
import { lockScroll, scrollTo } from './smoothScroll.js';

/**
 * Navigation behaviour:
 *   • hides on scroll down, returns on scroll up
 *   • condenses to a translucent bar once the hero is behind you
 *   • inverts over the light pricing chapter
 *   • marks the section you are currently reading
 *   • unrolls a full-screen menu below 60rem
 */
export function initNav() {
	const nav = document.querySelector('[data-nav]');
	if (!nav) return;

	initScrollBehaviour(nav);
	initActiveLinks();
	initMenu(nav);
	initBackToTop();
}

function initScrollBehaviour(nav) {
	const reduced = prefersReducedMotion();
	const hero = document.querySelector('.opening__viewport');

	// Track the bar's own state so a continuous scroll doesn't spawn a fresh
	// tween every frame — that churn (dozens of competing yPercent tweens) is
	// what read as "choppy". We only tween on an actual show⇄hide transition,
	// and `overwrite` clears any in-flight tween so the two never fight.
	let hidden = false;
	let lastY = 0;

	const show = () => {
		if (!hidden) return;
		hidden = false;
		gsap.to(nav, { yPercent: 0, duration: 0.5, ease: 'power3.out', overwrite: true });
	};
	const hide = () => {
		if (hidden) return;
		hidden = true;
		gsap.to(nav, { yPercent: -100, duration: 0.45, ease: 'power3.in', overwrite: true });
	};

	ScrollTrigger.create({
		start: 0,
		end: 'max',
		onUpdate(self) {
			const y = self.scroll();
			nav.classList.toggle('is-stuck', y > 40);

			// Hold the bar in place during menu use and click-to-scroll jumps, so
			// a programmatic scroll never triggers the auto-hide mid-flight.
			if (
				reduced ||
				document.body.classList.contains('menu-open') ||
				document.documentElement.classList.contains('is-anchoring')
			) {
				lastY = y;
				return;
			}

			// Never hide while still inside the hero — the jump reads as a glitch.
			if (y < (hero?.offsetHeight || 600) * 0.5) {
				show();
				lastY = y;
				return;
			}

			// Ignore sub-pixel jitter from the smooth-scroll easing; only real
			// intent (a few px of travel) flips the bar's direction.
			const delta = y - lastY;
			if (Math.abs(delta) < 6) return;
			delta > 0 ? hide() : show();
			lastY = y;
		}
	});

	// Invert the bar while it overlaps a light-themed section.
	document.querySelectorAll('[data-theme="light"]').forEach((section) => {
		ScrollTrigger.create({
			trigger: section,
			start: 'top top+=76',
			end: 'bottom top+=76',
			onToggle: (self) => nav.classList.toggle('is-over-light', self.isActive)
		});
	});
}

/**
 * Tracks which section is being read and announces it. squiggle.js listens and
 * owns the `is-current` class plus the drawn indicator — this only decides
 * *which* link is active, never how it looks.
 */
function initActiveLinks() {
	const links = [...document.querySelectorAll('[data-nav-link]')];

	links.forEach((link) => {
		const id = link.getAttribute('href');
		const section = document.querySelector(id);
		if (!section) return;

		ScrollTrigger.create({
			trigger: section,
			start: 'top center',
			end: 'bottom center',
			onToggle(self) {
				if (!self.isActive) return;
				document.dispatchEvent(new CustomEvent('nav:active', { detail: { link } }));
			}
		});
	});
}

function initMenu(nav) {
	const toggle = document.querySelector('[data-menu-toggle]');
	const menu = document.querySelector('[data-menu]');
	if (!toggle || !menu) return;

	const words = menu.querySelectorAll('.menu__word');
	const meta = menu.querySelectorAll('.menu__idx, .menu__foot > *');
	let open = false;

	gsap.set(menu, { clipPath: 'inset(0% 0% 100% 0%)' });
	menu.hidden = false;
	menu.setAttribute('aria-hidden', 'true');
	// The panel is clipped, not display:none, so without `inert` its links stay
	// in the tab order while invisible.
	menu.inert = true;
	gsap.set(words, { yPercent: 110 });
	gsap.set(meta, { opacity: 0 });

	const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
	tl.to(menu, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75 })
		.to(words, { yPercent: 0, duration: 0.9, stagger: 0.06 }, 0.12)
		.to(meta, { opacity: 1, duration: 0.6, stagger: 0.03 }, 0.35);

	if (prefersReducedMotion()) tl.duration(0.01);

	function setOpen(next) {
		open = next;
		toggle.setAttribute('aria-expanded', String(open));
		toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
		menu.setAttribute('aria-hidden', String(!open));
		menu.inert = !open;
		document.body.classList.toggle('menu-open', open);
		nav.classList.toggle('is-menu-open', open);
		lockScroll(open);
		open ? tl.play() : tl.reverse();
	}

	toggle.addEventListener('click', () => setOpen(!open));

	menu.addEventListener('click', (event) => {
		const link = event.target.closest('a[href^="#"]');
		if (!link) return;
		// Close first so the page is not scrolling behind a covering panel, but
		// start the scroll as soon as the panel has cleared the top of the
		// viewport — a longer wait made the tap feel unresponsive.
		setOpen(false);
		const id = link.getAttribute('href');
		gsap.delayedCall(prefersReducedMotion() ? 0 : 0.2, () =>
			scrollTo(document.querySelector(id))
		);
		event.preventDefault();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && open) {
			setOpen(false);
			toggle.focus();
		}
	});

	// Leaving the mobile breakpoint with the menu open would strand the lock.
	window.matchMedia('(min-width: 60.0625rem)').addEventListener('change', (event) => {
		if (event.matches && open) setOpen(false);
	});
}

function initBackToTop() {
	const button = document.querySelector('[data-scroll-top]');
	if (!button) return;
	button.addEventListener('click', () => scrollTo(0));
}
