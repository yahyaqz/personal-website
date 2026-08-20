import gsap from 'gsap';
import { prefersReducedMotion } from './env.js';

/* ==========================================================================
   PRICING CONFIG — this object is the only place prices are defined.

   The "+$xx" labels in the markup are rendered from `addons` on load, so you
   never have to keep a number in two places. All values are CAD.
   ========================================================================== */
export const PRICING = {
	/** Foundation: everything the client already has, rebuilt into a modern,
	 *  professional, polished and advanced website. Includes the first page. */
	base: 500,

	/** Charged for every page beyond the first. */
	perPage: 150,

	/** Page-slider bounds. The top of the scale is presented as "20+". */
	minPages: 1,
	maxPages: 20,
	defaultPages: 5,

	/** Add-ons, keyed by the `data-opt` value in the markup.
	 *  Website Maintenance is $100/mo OR $1,000 one-time; the one-time figure is
	 *  what folds into this one-time estimate. */
	addons: {
		logo: { label: 'Logo Design', price: 75 },
		motion: { label: 'Advanced Animations', price: 100 },
		care: { label: 'Website Maintenance', price: 1000 }
	},

	/**
	 * The formula. Change this if you want tiered or non-linear pricing —
	 * everything on screen is derived from what it returns.
	 */
	compute({ pages, selected }) {
		const extraPages = Math.max(0, pages - PRICING.minPages);
		const pagesCost = extraPages * PRICING.perPage;

		const addons = [...selected].map((key) => ({ key, ...PRICING.addons[key] }));
		const addonsCost = addons.reduce((sum, addon) => sum + addon.price, 0);

		return {
			extraPages,
			pagesCost,
			addons,
			total: PRICING.base + pagesCost + addonsCost
		};
	}
};

const money = (value) => value.toLocaleString('en-CA', { maximumFractionDigits: 0 });

/**
 * Live project estimator. State is (pages, selected add-ons); every input path
 * funnels through `render()` so the slider, stepper and buttons can never
 * disagree about the total.
 */
export function initPricing() {
	const root = document.querySelector('[data-calc]');
	if (!root) return;

	const range = root.querySelector('[data-pages-range]');
	const fill = root.querySelector('[data-pages-fill]');
	const value = root.querySelector('[data-pages-value]');
	const dec = root.querySelector('[data-pages-dec]');
	const inc = root.querySelector('[data-pages-inc]');
	const basePrice = root.querySelector('[data-base-price]');
	const totalEl = root.querySelector('[data-total]');
	const linesEl = root.querySelector('[data-calc-lines]');
	const readoutCount = root.querySelector('[data-pages-readout]');
	const readoutPrice = root.querySelector('[data-readout-price]');
	const options = [...root.querySelectorAll('[data-opt]')];

	const reduced = prefersReducedMotion();

	range.min = String(PRICING.minPages);
	range.max = String(PRICING.maxPages);
	range.value = String(PRICING.defaultPages);
	if (basePrice) basePrice.textContent = `$${money(PRICING.base)}`;

	// Print each add-on's price from the config so the label and the maths can
	// never drift apart.
	options.forEach((button) => {
		const addon = PRICING.addons[button.dataset.opt];
		const label = button.querySelector('[data-opt-price]');
		if (addon && label) label.textContent = `+$${money(addon.price)}`;
	});

	const state = {
		pages: PRICING.defaultPages,
		selected: new Set()
	};

	// Animated counter — GSAP tweens a plain number and we format each frame.
	const counter = { value: 0 };
	let counterTween = null;

	function setTotal(next) {
		// Write the real figure first. The count-up below is decoration, and a
		// tween cannot be trusted to deliver a number the visitor acts on — in a
		// backgrounded tab requestAnimationFrame stops and it would never land.
		totalEl.textContent = money(next);

		if (reduced) {
			counter.value = next;
			return;
		}

		counterTween?.kill();
		counterTween = gsap.fromTo(
			counter,
			{ value: counter.value },
			{
				value: next,
				duration: 0.7,
				ease: 'expo.out',
				// Without this, GSAP renders the *start* value the moment the tween
				// is created and overwrites the correct figure written above.
				immediateRender: false,
				onUpdate: () => {
					totalEl.textContent = money(Math.round(counter.value));
				},
				onComplete: () => {
					totalEl.textContent = money(next);
				}
			}
		);

		gsap.fromTo(
			totalEl.parentElement,
			{ scale: 0.985 },
			{ scale: 1, duration: 0.5, ease: 'expo.out' }
		);
	}

	const calculate = () => PRICING.compute(state);
	const builder = initBuilder(root);

	function renderLines({ extraPages, pagesCost, addons }) {
		const rows = [`<li><span>Foundation</span><span>$${money(PRICING.base)}</span></li>`];

		if (extraPages > 0) {
			rows.push(
				`<li><span>Additional pages <em>× ${extraPages}</em></span><span>$${money(pagesCost)}</span></li>`
			);
		}

		addons.forEach((addon) => {
			rows.push(`<li data-line-addon><span>${addon.label}</span><span>$${money(addon.price)}</span></li>`);
		});

		linesEl.innerHTML = rows.join('');

		if (!reduced) {
			gsap.fromTo(
				linesEl.querySelectorAll('li'),
				{ opacity: 0, y: 6 },
				{ opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.035 }
			);
		}
	}

	function render() {
		const result = calculate();

		value.textContent = String(state.pages);
		range.value = String(state.pages);

		const atMax = state.pages >= PRICING.maxPages;
		const pagesLabel = `${state.pages}${atMax ? '+' : ''} ${state.pages === 1 ? 'Page' : 'Pages'}`;
		range.setAttribute('aria-valuetext', `${pagesLabel}, estimated $${money(result.total)} CAD`);

		if (readoutCount) readoutCount.textContent = pagesLabel;
		if (readoutPrice) readoutPrice.textContent = `$${money(result.total)} CAD`;

		const progress =
			(state.pages - PRICING.minPages) / (PRICING.maxPages - PRICING.minPages);

		// Same reasoning as the total: the resting position is set outright, and
		// the tween only smooths the journey there.
		if (fill) {
			const from = Number(gsap.getProperty(fill, 'scaleX')) || 0;
			fill.style.transform = `scaleX(${progress})`;
			if (!reduced) {
				gsap.fromTo(
					fill,
					{ scaleX: from },
					{ scaleX: progress, duration: 0.45, ease: 'expo.out', immediateRender: false }
				);
			}
		}

		dec.disabled = state.pages <= PRICING.minPages;
		inc.disabled = state.pages >= PRICING.maxPages;

		renderLines(result);
		setTotal(result.total);
		builder?.update(state);
	}

	function setPages(next) {
		const clamped = Math.min(PRICING.maxPages, Math.max(PRICING.minPages, next));
		if (clamped === state.pages) return;
		state.pages = clamped;
		render();
	}

	range.addEventListener('input', () => setPages(Number(range.value)));
	dec.addEventListener('click', () => setPages(state.pages - 1));
	inc.addEventListener('click', () => setPages(state.pages + 1));

	options.forEach((button) => {
		button.addEventListener('click', () => {
			const key = button.dataset.opt;
			const nowOn = !state.selected.has(key);

			nowOn ? state.selected.add(key) : state.selected.delete(key);
			button.setAttribute('aria-pressed', String(nowOn));

			if (!reduced) {
				gsap.fromTo(
					button,
					{ scale: 0.985 },
					{ scale: 1, duration: 0.45, ease: 'expo.out' }
				);
			}

			render();
		});
	});

	// Seed the counter from the real starting total so the first tween has a
	// sensible origin rather than counting up from zero on load.
	counter.value = PRICING.base;
	render();
}

/* ==========================================================================
   Live package visualisation.

   Pages become nodes on a small site map, add-ons become badges, and
   "Advanced Animations" makes the map itself move. It reads the same state
   object as the price, so the picture and the number can never disagree.
   ========================================================================== */

/** Add-ons that show as a badge, and the glyph each one gets. */
const BADGES = {
	logo: '◆',
	care: '⟳'
};

/** How many page nodes to draw before switching to a "+N" summary chip. */
const MAX_NODES = 11;

function initBuilder(root) {
	const figure = root.querySelector('[data-builder]');
	if (!figure) return null;

	const pagesEl = figure.querySelector('[data-builder-pages]');
	const badgesEl = figure.querySelector('[data-builder-badges]');
	const linksSvg = figure.querySelector('[data-builder-links]');
	const homeEl = figure.querySelector('[data-builder-home]');

	let lastCount = -1;

	function drawLinks() {
		if (!linksSvg || !homeEl) return;

		const canvas = linksSvg.parentElement.getBoundingClientRect();
		const home = homeEl.getBoundingClientRect();
		const nodes = [...pagesEl.children];

		const hx = home.left - canvas.left + home.width / 2;
		const hy = home.bottom - canvas.top;

		linksSvg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
		linksSvg.innerHTML = nodes
			.map((node) => {
				const r = node.getBoundingClientRect();
				const x = r.left - canvas.left + r.width / 2;
				const y = r.top - canvas.top;
				const mid = hy + (y - hy) / 2;
				return `<path d="M${hx} ${hy} C ${hx} ${mid}, ${x} ${mid}, ${x} ${y}"/>`;
			})
			.join('');
	}

	function update(state) {
		// Page nodes: the home page is drawn separately, so this is pages - 1.
		const extra = Math.max(0, state.pages - 1);
		const shown = Math.min(extra, MAX_NODES);

		if (extra !== lastCount) {
			lastCount = extra;
			pagesEl.replaceChildren();

			for (let i = 0; i < shown; i++) {
				const node = document.createElement('li');
				node.className = 'builder__page';
				node.style.animationDelay = `${Math.min(i, 8) * 0.03}s`;
				node.innerHTML = '<span></span><span></span>';
				pagesEl.appendChild(node);
			}

			if (extra > MAX_NODES) {
				const more = document.createElement('li');
				more.className = 'builder__badge';
				more.textContent = `+${extra - MAX_NODES}`;
				pagesEl.appendChild(more);
			}

			requestAnimationFrame(drawLinks);
		}

		// Add-on badges
		badgesEl.replaceChildren();
		Object.keys(BADGES).forEach((key) => {
			if (!state.selected.has(key)) return;
			const badge = document.createElement('li');
			badge.className = 'builder__badge';
			badge.innerHTML = `<span aria-hidden="true">${BADGES[key]}</span>${PRICING.addons[key].label}`;
			badgesEl.appendChild(badge);
		});

		figure.classList.toggle('is-animated', state.selected.has('motion'));
	}

	window.addEventListener('resize', () => requestAnimationFrame(drawLinks));

	return { update };
}
