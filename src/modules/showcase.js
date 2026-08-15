import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { hasFinePointer, prefersReducedMotion } from './env.js';

/* ==========================================================================
   The three interactions that demonstrate the service rather than decorate it:
   a before/after drag, a responsive device morph, and a cursor spotlight.
   ========================================================================== */

/* ------------------------- OUTDATED → OUTSTANDING ---------------------- */

/**
 * Draggable before/after reveal. One number — the split percentage — drives a
 * clip-path and the handle position through a CSS custom property, so pointer,
 * touch and keyboard all funnel through `setSplit()` and cannot disagree.
 */
export function initBeforeAfter() {
	const root = document.querySelector('[data-ba]');
	if (!root) return;

	const stage = root.querySelector('[data-ba-stage]');
	const grip = root.querySelector('[data-ba-grip]');
	const tagBefore = root.querySelector('[data-ba-tag-before]');
	const tagAfter = root.querySelector('[data-ba-tag-after]');
	if (!stage || !grip) return;

	let split = 50;

	function setSplit(next, animate = false) {
		split = Math.min(100, Math.max(0, next));

		if (animate && !prefersReducedMotion()) {
			gsap.to(root, { '--ba': `${split}%`, duration: 0.45, ease: 'expo.out' });
		} else {
			root.style.setProperty('--ba', `${split}%`);
		}

		grip.setAttribute('aria-valuenow', String(Math.round(split)));
		grip.setAttribute('aria-valuetext', `${Math.round(split)}% before, ${Math.round(100 - split)}% after`);

		// Fade each label out as its side is squeezed away.
		if (tagBefore) tagBefore.style.opacity = split < 14 ? '0' : '1';
		if (tagAfter) tagAfter.style.opacity = split > 86 ? '0' : '1';
	}

	const fromClientX = (clientX) => {
		const rect = stage.getBoundingClientRect();
		return ((clientX - rect.left) / rect.width) * 100;
	};

	let dragging = false;

	stage.addEventListener('pointerdown', (event) => {
		dragging = true;
		root.classList.add('is-dragging');
		stage.setPointerCapture(event.pointerId);
		setSplit(fromClientX(event.clientX));
	});

	stage.addEventListener('pointermove', (event) => {
		if (!dragging) return;
		event.preventDefault();
		setSplit(fromClientX(event.clientX));
	});

	const end = (event) => {
		if (!dragging) return;
		dragging = false;
		root.classList.remove('is-dragging');
		if (event.pointerId !== undefined && stage.hasPointerCapture?.(event.pointerId)) {
			stage.releasePointerCapture(event.pointerId);
		}
	};
	stage.addEventListener('pointerup', end);
	stage.addEventListener('pointercancel', end);

	// Keyboard: the grip is a real slider.
	grip.addEventListener('keydown', (event) => {
		const step = event.shiftKey ? 10 : 2;
		const moves = {
			ArrowLeft: -step,
			ArrowRight: step,
			ArrowDown: -step,
			ArrowUp: step,
			Home: -100,
			End: 100
		};
		if (!(event.key in moves)) return;
		event.preventDefault();
		setSplit(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : split + moves[event.key]);
	});

	// Clicking the grip itself must not also jump the split to the grip centre.
	grip.addEventListener('pointerdown', (event) => event.stopPropagation());
	grip.addEventListener('pointerdown', (event) => {
		dragging = true;
		root.classList.add('is-dragging');
		stage.setPointerCapture?.(event.pointerId);
	});

	setSplit(50);

	// An unprompted nudge on first sight so the control announces itself.
	if (!prefersReducedMotion()) {
		ScrollTrigger.create({
			trigger: root,
			start: 'top 70%',
			once: true,
			onEnter: () => {
				gsap
					.timeline({ defaults: { duration: 0.9, ease: 'expo.inOut' } })
					.fromTo(root, { '--ba': '50%' }, { '--ba': '72%' })
					.to(root, { '--ba': '38%' })
					.to(root, { '--ba': '50%', duration: 0.7 });
			}
		});
	}
}

/* ------------------------- RESPONSIVE DEVICE MORPH --------------------- */

/** Widths the preview shell morphs between, and what each is called. */
const DEVICES = {
	desktop: { width: '100%', ratio: 16 / 10, label: '1440px', narrow: false },
	tablet: { width: '52%', ratio: 4 / 3, label: '834px', narrow: false },
	mobile: { width: '25%', ratio: 9 / 17, label: '390px', narrow: true }
};

/**
 * Morphs a single browser shell between device widths rather than swapping
 * screenshots — the frame animates, and the wide/narrow artwork cross-fades
 * across the midpoint of that same tween.
 */
export function initDevices() {
	const root = document.querySelector('[data-devices]');
	if (!root) return;

	const shell = root.querySelector('[data-devices-shell]');
	const chrome = root.querySelector('[data-devices-chrome]');
	const caption = root.querySelector('[data-devices-caption]');
	const buttons = [...document.querySelectorAll('[data-device]')];
	if (!shell || !buttons.length) return;

	let current = 'desktop';

	function select(key) {
		const device = DEVICES[key];
		if (!device || key === current) return;
		current = key;

		buttons.forEach((button) => {
			const on = button.dataset.device === key;
			button.classList.toggle('is-active', on);
			button.setAttribute('aria-selected', String(on));
		});

		if (caption) caption.textContent = `Olea — ${device.label}`;

		// Phone chrome loses the address bar — it is a different object.
		if (chrome) chrome.style.opacity = device.narrow ? '0.35' : '1';

		// The morph is a CSS transition rather than a tween, deliberately: the
		// style attribute then always holds the true target, so the frame can
		// never end up a different size from what the caption claims (a tween
		// that is interrupted or never ticks would leave exactly that mismatch).
		// The embedded demo reflows to the new width on its own — that live
		// reflow is the whole point, so there is no artwork to swap.
		shell.style.width = device.width;
		shell.style.aspectRatio = String(device.ratio);
	}

	buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.device)));

	// Arrow-key navigation across the tablist.
	buttons.forEach((button, index) => {
		button.addEventListener('keydown', (event) => {
			const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
			if (!delta) return;
			event.preventDefault();
			const next = buttons[(index + delta + buttons.length) % buttons.length];
			next.focus();
			select(next.dataset.device);
		});
	});
}

/* ---------------------- PROJECT HOVER (mouse-follow) ------------------- */

/**
 * Project imagery drifts a few pixels toward the pointer while hovered, and the
 * title leans the opposite way. The offsets are tiny on purpose — it should
 * register as the image being alive, not as a parallax effect.
 */
export function initProjectHover() {
	if (!hasFinePointer() || prefersReducedMotion()) return;

	document.querySelectorAll('[data-project]').forEach((project) => {
		const frame = project.querySelector('.project__frame');
		const phone = project.querySelector('.project__phone');
		const name = project.querySelector('.project__name');
		if (!frame) return;

		const setters = {
			frameX: gsap.quickTo(frame, 'x', { duration: 0.9, ease: 'power3.out' }),
			frameY: gsap.quickTo(frame, 'y', { duration: 0.9, ease: 'power3.out' }),
			phoneX: phone && gsap.quickTo(phone, 'x', { duration: 1.1, ease: 'power3.out' }),
			phoneY: phone && gsap.quickTo(phone, 'y', { duration: 1.1, ease: 'power3.out' }),
			nameX: name && gsap.quickTo(name, 'x', { duration: 1.2, ease: 'power3.out' })
		};

		project.addEventListener(
			'pointermove',
			(event) => {
				if (event.pointerType !== 'mouse') return;
				const rect = project.getBoundingClientRect();
				const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
				const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;

				setters.frameX(dx * 18);
				setters.frameY(dy * 12);
				// The phone leads slightly further, which reads as depth.
				setters.phoneX?.(dx * 30);
				setters.phoneY?.(dy * 20);
				setters.nameX?.(dx * -10);
			},
			{ passive: true }
		);

		project.addEventListener('pointerleave', () => {
			setters.frameX(0);
			setters.frameY(0);
			setters.phoneX?.(0);
			setters.phoneY?.(0);
			setters.nameX?.(0);
		});
	});
}

/* ------------------------- EDITORIAL ODOMETER -------------------------- */

/**
 * The oversized project counter. Each slot holds a 0–9 column and rolling to a
 * new digit is a single transform, so 01 → 02 only moves the units column and
 * 09 → 10 moves both — the mechanical behaviour of a real odometer.
 *
 * Driven by class/transform rather than a tween, so the displayed number can
 * never disagree with the project you are actually looking at.
 */
export function initOdometer() {
	const root = document.querySelector('[data-odometer]');
	const projects = [...document.querySelectorAll('[data-project]')];
	if (!root || !projects.length) return;

	const slots = [...root.querySelectorAll('[data-odo-slot]')].map((slot) => {
		const col = document.createElement('span');
		col.className = 'odo__col';
		for (let i = 0; i <= 9; i++) {
			const digit = document.createElement('span');
			digit.textContent = String(i);
			col.appendChild(digit);
		}
		slot.appendChild(col);
		return col;
	});

	const show = (n) => {
		const digits = String(Math.min(99, n)).padStart(slots.length, '0').split('');
		slots.forEach((col, i) => {
			col.style.transform = `translateY(${-Number(digits[i]) * 10}%)`;
		});
	};

	projects.forEach((project, index) => {
		ScrollTrigger.create({
			trigger: project,
			start: 'top 60%',
			end: 'bottom 40%',
			onToggle: (self) => self.isActive && show(index + 1)
		});
	});

	show(1);
}

/* -------------------------- SCROLL COLOUR INVERSION -------------------- */

/**
 * Turns a section's whole colour world from ink to paper and back, tied to
 * scroll position rather than a threshold. Only `--invert` is animated — every
 * colour in the section derives from it via color-mix in base.css — so this is
 * one interpolated number, not a dozen competing tweens.
 */
export function initInversion() {
	const sections = [...document.querySelectorAll('[data-invert]')];
	if (!sections.length) return;

	const nav = document.querySelector('[data-nav]');
	const reduced = prefersReducedMotion();

	sections.forEach((section) => {
		if (reduced) {
			section.style.setProperty('--invert', '1');
			return;
		}

		// Fade in over the first screen, hold, fade back out over the last.
		gsap.fromTo(
			section,
			{ '--invert': 0 },
			{
				'--invert': 1,
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'top 85%',
					end: 'top 35%',
					scrub: 0.6
				}
			}
		);

		// Explicit endpoints and no immediate render: a plain `.to()` here would
		// capture 0 as its start (the entry tween's rendered state at creation)
		// and snap the chapter back to dark instead of fading it.
		gsap.fromTo(
			section,
			{ '--invert': 1 },
			{
				'--invert': 0,
				ease: 'none',
				immediateRender: false,
				scrollTrigger: {
					trigger: section,
					start: 'bottom 78%',
					end: 'bottom 18%',
					scrub: 0.6
				}
			}
		);

		// The fixed nav sits over the section, so it has to change with it.
		if (nav) {
			ScrollTrigger.create({
				trigger: section,
				start: 'top top+=76',
				end: 'bottom top+=76',
				onToggle: (self) => nav.classList.toggle('is-over-light', self.isActive)
			});
		}
	});
}

