import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './env.js';

/**
 * The opening scene: a pinned viewport whose two stages are scrubbed by scroll
 * position, so the hero does not scroll away — it transforms into the statement.
 *
 * One timeline, entirely scrub-driven, which is what makes it reverse correctly
 * when the visitor scrolls back up. Nothing here is time-based.
 *
 * Beats (t = 0 → 1 of the pinned distance):
 *   0.00–0.34  hero recedes: title lifts, shrinks, softens; stage dims out
 *   0.14–0.42  pink wash swells through the cut and falls back
 *   0.22–0.55  statement arrives: unmasks, scales down from oversize, sharpens
 *   0.54–0.66  pink stroke draws itself under "yourself"
 *   0.66–0.88  HOLD — nothing moves; the statement is simply read
 *   0.88–1.00  statement hands off upward into the work section
 *
 * The hold matters: without it the statement finishes leaving well before the
 * pin releases and the visitor scrolls through a blank screen.
 */
export function initOpening() {
	const section = document.querySelector('[data-opening]');
	if (!section) return;

	const viewport = section.querySelector('[data-opening-viewport]');
	const heroStage = section.querySelector('[data-stage="hero"]');
	const statementStage = section.querySelector('[data-stage="statement"]');
	const wash = section.querySelector('[data-opening-wash]');
	const statement = section.querySelector('[data-statement]');
	const statementLines = section.querySelectorAll('.statement__i');
	const statementLede = section.querySelector('[data-statement-lede]');
	const strokeSvg = section.querySelector('[data-statement-stroke]');

	const heroTitle = section.querySelector('.hero__title');
	const heroBits = [
		section.querySelector('[data-hero="eyebrow"]'),
		section.querySelector('[data-hero="lede"]'),
		section.querySelector('[data-hero="actions"]'),
		section.querySelector('[data-hero="meta"]')
	].filter(Boolean);

	const strokePath = buildStroke(strokeSvg);

	// --- Reduced motion: no pin, no scrub. Two plain screens, both legible. ---
	if (prefersReducedMotion()) {
		section.classList.add('is-static');
		gsap.set([statementStage, statement, statementLede], { clearProps: 'all', opacity: 1 });
		gsap.set(statementLines, { yPercent: 0, opacity: 1 });
		if (strokePath) gsap.set(strokePath, { strokeDashoffset: 0 });
		return;
	}

	const isPhone = window.matchMedia('(max-width: 48rem)').matches;
	// Blur is the one genuinely expensive property here, so phones go without.
	const blur = (px) => (isPhone ? {} : { filter: `blur(${px}px)` });

	gsap.set(statementStage, { opacity: 0 });
	gsap.set(statementLines, { yPercent: 118 });
	gsap.set(statement, { scale: 1.18, letterSpacing: '0.06em', ...blur(14) });
	gsap.set(statementLede, { opacity: 0, y: 34 });
	gsap.set(wash, { opacity: 0 });
	if (strokePath) gsap.set(strokePath, { strokeDashoffset: strokePath.dataset.length });

	const timeline = gsap.timeline({
		defaults: { ease: 'none' },
		scrollTrigger: {
			trigger: section,
			start: 'top top',
			// Pin distance. Longer = slower, more deliberate scene change.
			end: () => `+=${window.innerHeight * (isPhone ? 1.5 : 2.1)}`,
			pin: viewport,
			pinSpacing: true,
			scrub: 0.85,
			anticipatePin: 1,
			invalidateOnRefresh: true
		}
	});

	// --- Beat 1 — the hero recedes -----------------------------------------
	// Note the property split against the load-in animation in reveals.js: that
	// one owns `.line__i` yPercent and the bits' `y`/`opacity`; this one owns the
	// title wrapper's yPercent and the stage opacity. Nothing is animated twice.
	timeline
		.to(heroTitle, { yPercent: -34, scale: 0.86, ...blur(9), duration: 0.34 }, 0)
		.to(heroBits, { yPercent: -60, stagger: 0.035, duration: 0.24 }, 0)
		.to(heroStage, { opacity: 0, duration: 0.2 }, 0.16);

	// --- Beat 2 — pink swells through the cut ------------------------------
	timeline
		.to(wash, { opacity: 1, duration: 0.16 }, 0.14)
		.to(wash, { opacity: 0.16, duration: 0.22 }, 0.32);

	// --- Beat 3 — the statement arrives ------------------------------------
	timeline
		.to(statementStage, { opacity: 1, duration: 0.12 }, 0.22)
		.to(statementLines, { yPercent: 0, stagger: 0.06, duration: 0.32 }, 0.24)
		.to(statement, { scale: 1, letterSpacing: '-0.045em', ...blur(0), duration: 0.36 }, 0.24)
		.to(statementLede, { opacity: 1, y: 0, duration: 0.18 }, 0.46);

	// --- Beat 4 — the pink stroke signs it off ------------------------------
	if (strokePath) {
		timeline.to(strokePath, { strokeDashoffset: 0, duration: 0.12 }, 0.54);
	}

	// --- Beat 5 — hold, then hand off to the work section -------------------
	// Explicit empty time so the statement is readable rather than in transit.
	timeline
		.to(statementStage, { yPercent: -16, scale: 0.95, duration: 0.12 }, 0.88)
		.to(statementStage, { opacity: 0, duration: 0.09 }, 0.91)
		.to(wash, { opacity: 0, duration: 0.1 }, 0.9);

	// The first project starts uncovering while the statement is still leaving,
	// so the two sections overlap instead of queueing.
	const firstFrame = document.querySelector('.project .project__frame');
	if (firstFrame) {
		gsap.fromTo(
			firstFrame,
			{ yPercent: 6 },
			{
				yPercent: 0,
				ease: 'none',
				scrollTrigger: {
					trigger: section,
					start: 'bottom bottom',
					end: 'bottom top',
					scrub: 0.8
				}
			}
		);
	}
}

/**
 * The hand-drawn underline beneath "yourself" — same jittered-quadratic
 * construction as the nav squiggles, so the two read as one visual language.
 */
function buildStroke(svg) {
	if (!svg) return null;

	const width = 300;
	const height = 26;
	const mid = height * 0.62;
	const segments = 6;
	const step = width / segments;

	const wobble = (i) => Math.sin(i * 12.9898) * 43758.5453;
	const rand = (i) => wobble(i) - Math.floor(wobble(i));

	let d = `M 4 ${(mid + rand(1) * 3).toFixed(2)}`;
	for (let i = 1; i <= segments; i++) {
		const x = step * i;
		const y = mid + (rand(i + 3) - 0.5) * 7;
		const cx = x - step / 2;
		const cy = mid + (rand(i + 11) - 0.5) * 11;
		d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
	}

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', d);
	svg.appendChild(path);

	const length = path.getTotalLength();
	path.dataset.length = String(length);
	gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

	return path;
}
