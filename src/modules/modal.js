import gsap from 'gsap';
import { prefersReducedMotion } from './env.js';
import { lockScroll } from './smoothScroll.js';

/**
 * The "Start a project" dialog. Any [data-project-open] control opens it instead
 * of scrolling to the contact section (the section still exists as a no-JS
 * fallback — the triggers are anchors to #contact). Standard modal manners:
 * scrim + Esc to close, scroll lock, focus moved in and returned, focus trapped.
 */
export function initProjectModal() {
	const modal = document.querySelector('[data-project-modal]');
	if (!modal) return;

	const dialog = modal.querySelector('.modal__dialog');
	const openers = [...document.querySelectorAll('[data-project-open]')];
	const closers = [...modal.querySelectorAll('[data-modal-close]')];
	const reduced = prefersReducedMotion();

	let open = false;
	let lastFocused = null;

	// Hidden but present: visibility (via autoAlpha) + inert keep it out of the
	// tab order and off the screen until asked for.
	gsap.set(modal, { autoAlpha: 0 });
	modal.inert = true;

	const fields = () =>
		[...dialog.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')].filter(
			(el) => !el.disabled && el.offsetParent !== null
		);

	function setOpen(next, opener) {
		if (next === open) return;
		open = next;
		modal.setAttribute('aria-hidden', String(!open));
		modal.inert = !open;
		document.body.classList.toggle('modal-open', open);
		lockScroll(open);

		if (open) {
			lastFocused = opener || document.activeElement;
			if (reduced) {
				gsap.set(modal, { autoAlpha: 1 });
				gsap.set(dialog, { opacity: 1, y: 0, scale: 1 });
			} else {
				gsap.to(modal, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' });
				gsap.fromTo(
					dialog,
					{ opacity: 0, y: 48, scale: 0.985 },
					{ opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'expo.out' }
				);
			}
			// Move focus into the dialog once it is visible.
			const first = dialog.querySelector('input, select, textarea, button');
			window.setTimeout(() => first?.focus({ preventScroll: true }), reduced ? 0 : 140);
		} else {
			if (reduced) {
				gsap.set(modal, { autoAlpha: 0 });
			} else {
				gsap.to(dialog, { opacity: 0, y: 24, duration: 0.25, ease: 'power2.in' });
				gsap.to(modal, { autoAlpha: 0, duration: 0.32, ease: 'power2.in', delay: 0.04 });
			}
			lastFocused?.focus?.({ preventScroll: true });
		}
	}

	openers.forEach((btn) =>
		btn.addEventListener('click', (event) => {
			event.preventDefault();
			// Stop the smooth-scroll anchor handler (bound on document) from also
			// jumping to #contact — the modal is the whole point.
			event.stopPropagation();
			setOpen(true, btn);
		})
	);

	closers.forEach((btn) => btn.addEventListener('click', () => setOpen(false)));

	document.addEventListener('keydown', (event) => {
		if (!open) return;

		if (event.key === 'Escape') {
			setOpen(false);
			return;
		}

		// Trap focus inside the dialog.
		if (event.key === 'Tab') {
			const items = fields();
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
	});

	// Close a beat after a successful submission (form.js announces it), so the
	// visitor sees the confirmation first.
	modal.addEventListener('project:submitted', () => {
		window.setTimeout(() => open && setOpen(false), 2600);
	});
}
