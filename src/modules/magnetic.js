import gsap from 'gsap';
import { hasFinePointer, prefersReducedMotion } from './env.js';

/**
 * Magnetic CTAs. The button follows the pointer by a fraction of the offset
 * while it is inside a padded hit area, and its label lags very slightly behind
 * the button itself so the effect reads as weight rather than jitter.
 */
export function initMagnetic() {
	initSweepOrigin();

	if (!hasFinePointer() || prefersReducedMotion()) return;

	const PULL = 0.32;
	const PAD = 28;

	document.querySelectorAll('[data-magnetic]').forEach((el) => {
		const label = el.querySelector('.btn__label') || el.firstElementChild;

		const moveX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
		const moveY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
		const labelX = label && gsap.quickTo(label, 'x', { duration: 0.7, ease: 'power3.out' });
		const labelY = label && gsap.quickTo(label, 'y', { duration: 0.7, ease: 'power3.out' });

		let active = false;

		const onMove = (event) => {
			const rect = el.getBoundingClientRect();
			const inside =
				event.clientX >= rect.left - PAD &&
				event.clientX <= rect.right + PAD &&
				event.clientY >= rect.top - PAD &&
				event.clientY <= rect.bottom + PAD;

			if (!inside) {
				if (active) release();
				return;
			}

			active = true;
			const dx = event.clientX - (rect.left + rect.width / 2);
			const dy = event.clientY - (rect.top + rect.height / 2);

			moveX(dx * PULL);
			moveY(dy * PULL);
			if (labelX) {
				labelX(dx * PULL * 0.35);
				labelY(dy * PULL * 0.35);
			}
		};

		const release = () => {
			active = false;
			moveX(0);
			moveY(0);
			if (labelX) {
				labelX(0);
				labelY(0);
			}
		};

		window.addEventListener('pointermove', onMove, { passive: true });
		el.addEventListener('pointerleave', release);
		el.addEventListener('blur', release);
	});
}

/**
 * Records where the pointer crossed a button's edge so the CSS fill can grow
 * from that exact point rather than always from the centre. Runs for every
 * button, magnetic or not, and is harmless on touch — the disc simply starts
 * wherever the tap landed.
 */
function initSweepOrigin() {
	document.querySelectorAll('.btn').forEach((btn) => {
		const mark = (event) => {
			const rect = btn.getBoundingClientRect();
			btn.style.setProperty('--bx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
			btn.style.setProperty('--by', `${((event.clientY - rect.top) / rect.height) * 100}%`);
		};

		btn.addEventListener('pointerenter', mark);
		// Keyboard focus has no coordinates; fall back to the centre.
		btn.addEventListener('focus', () => {
			btn.style.removeProperty('--bx');
			btn.style.removeProperty('--by');
		});
	});
}
