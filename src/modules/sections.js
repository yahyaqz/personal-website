import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { hasFinePointer, prefersReducedMotion } from './env.js';

/* ============================== SERVICES ============================== */

/**
 * Editorial service list. On a mouse the active row follows the pointer; on
 * touch it follows the scroll position so the list still animates.
 */
export function initServices() {
	const rows = [...document.querySelectorAll('[data-svc]')];
	if (!rows.length) return;

	if (hasFinePointer()) {
		rows.forEach((row) => {
			row.addEventListener('pointerenter', () => {
				rows.forEach((other) => other.classList.toggle('is-active', other === row));
			});
		});
		document
			.querySelector('[data-services]')
			?.addEventListener('pointerleave', () => rows.forEach((r) => r.classList.remove('is-active')));
		return;
	}

	rows.forEach((row) => {
		ScrollTrigger.create({
			trigger: row,
			start: 'top 65%',
			end: 'bottom 45%',
			onToggle: (self) => row.classList.toggle('is-active', self.isActive)
		});
	});
}

/* ============================== CONCEPTS ============================== */

/** Reveals the collapsed concept studies in place, without a reflow jump. */
export function initShowMore() {
	const button = document.querySelector('[data-show-more]');
	const label = document.querySelector('[data-show-more-label]');
	const extras = [...document.querySelectorAll('[data-concept-extra]')];
	if (!button || !extras.length) return;

	let open = false;

	button.addEventListener('click', () => {
		open = !open;
		button.setAttribute('aria-expanded', String(open));
		button.classList.toggle('is-open', open);
		if (label) label.textContent = open ? 'Show less' : 'Show more';

		if (open) {
			extras.forEach((el) => el.classList.remove('is-hidden'));

			if (prefersReducedMotion()) {
				ScrollTrigger.refresh();
				return;
			}

			gsap.fromTo(
				extras,
				{ opacity: 0, y: 42, clipPath: 'inset(12% 0% 12% 0%)' },
				{
					opacity: 1,
					y: 0,
					clipPath: 'inset(0% 0% 0% 0%)',
					duration: 1.05,
					ease: 'expo.out',
					stagger: 0.08,
					onComplete: () => ScrollTrigger.refresh()
				}
			);
			return;
		}

		if (prefersReducedMotion()) {
			extras.forEach((el) => el.classList.add('is-hidden'));
			ScrollTrigger.refresh();
			return;
		}

		gsap.to(extras, {
			opacity: 0,
			y: 24,
			duration: 0.45,
			ease: 'power2.in',
			stagger: { each: 0.05, from: 'end' },
			onComplete: () => {
				extras.forEach((el) => el.classList.add('is-hidden'));
				ScrollTrigger.refresh();
			}
		});
	});
}

/* =============================== PROCESS ============================== */

/**
 * Sticky process panel. The oversized number and label swap as each step
 * crosses the middle of the viewport, and the rule underneath fills.
 */
export function initProcess() {
	const steps = [...document.querySelectorAll('[data-step]')];
	const numEl = document.querySelector('[data-process-num]');
	const labelEl = document.querySelector('[data-process-label]');
	const barEl = document.querySelector('[data-process-bar]');
	if (!steps.length || !numEl || !labelEl) return;

	const reduced = prefersReducedMotion();
	let current = -1;

	const apply = (index) => {
		if (index === current) return;
		const forward = index > current;
		current = index;

		const step = steps[index];
		steps.forEach((s, i) => s.classList.toggle('is-active', i === index));

		if (barEl) barEl.style.transform = `scaleX(${(index + 1) / steps.length})`;

		const num = step.dataset.num;
		const label = step.dataset.label;

		if (reduced) {
			numEl.textContent = num;
			labelEl.textContent = label;
			return;
		}

		gsap
			.timeline({ defaults: { ease: 'expo.out' } })
			.to([numEl, labelEl], {
				yPercent: forward ? -110 : 110,
				opacity: 0,
				duration: 0.32,
				ease: 'power2.in'
			})
			.add(() => {
				numEl.textContent = num;
				labelEl.textContent = label;
			})
			.fromTo(
				[numEl, labelEl],
				{ yPercent: forward ? 110 : -110, opacity: 0 },
				{ yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05 }
			);
	};

	steps.forEach((step, index) => {
		ScrollTrigger.create({
			trigger: step,
			start: 'top 55%',
			end: 'bottom 55%',
			onToggle: (self) => self.isActive && apply(index)
		});
	});

	apply(0);
}

/* ================================= FAQ ================================ */

/** Height-animated accordion; one panel open at a time. */
export function initAccordion() {
	const items = [...document.querySelectorAll('[data-acc-item]')];
	if (!items.length) return;

	const reduced = prefersReducedMotion();

	const entries = items.map((item) => ({
		item,
		trigger: item.querySelector('.acc__trigger'),
		panel: item.querySelector('[data-acc-panel]'),
		tween: null
	}));

	entries.forEach((entry) => {
		if (!entry.trigger || !entry.panel) return;

		entry.trigger.addEventListener('click', () => {
			const isOpen = entry.trigger.getAttribute('aria-expanded') === 'true';
			entries.forEach((other) => other !== entry && close(other));
			isOpen ? close(entry) : open(entry);
		});
	});

	function open(entry) {
		entry.trigger.setAttribute('aria-expanded', 'true');
		entry.tween?.kill();

		if (reduced) {
			entry.panel.style.height = 'auto';
			return;
		}

		entry.tween = gsap.to(entry.panel, {
			height: 'auto',
			duration: 0.6,
			ease: 'expo.out',
			onComplete: () => ScrollTrigger.refresh()
		});

		gsap.fromTo(
			entry.panel.querySelector('.acc__body'),
			{ opacity: 0, y: 12 },
			{ opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', delay: 0.06 }
		);
	}

	function close(entry) {
		if (entry.trigger.getAttribute('aria-expanded') !== 'true') return;
		entry.trigger.setAttribute('aria-expanded', 'false');
		entry.tween?.kill();

		if (reduced) {
			entry.panel.style.height = '0px';
			return;
		}

		entry.tween = gsap.to(entry.panel, {
			height: 0,
			duration: 0.4,
			ease: 'power2.inOut',
			onComplete: () => ScrollTrigger.refresh()
		});
	}
}
