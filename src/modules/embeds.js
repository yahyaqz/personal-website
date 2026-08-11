/**
 * Live portfolio previews.
 *
 * Each `[data-embed]` iframe renders a real demo site (public/demos/<slug>) at
 * its natural design width, then is scaled to fill its frame — so the tiles are
 * the actual, crisp sites at any size rather than flat screenshots. The frame
 * clips the overflow; the surrounding link owns the click (the iframe has
 * pointer-events: none in CSS).
 */
export function initEmbeds() {
	const embeds = document.querySelectorAll('[data-embed]');
	if (!embeds.length) return;

	function fit(frame) {
		const iframe = frame.querySelector('[data-embed]');
		if (!iframe) return;

		const designWidth = parseFloat(iframe.dataset.embedW) || 1440;
		const frameWidth = frame.clientWidth;
		const frameHeight = frame.clientHeight;
		if (!frameWidth || !frameHeight) return;

		const scale = frameWidth / designWidth;
		iframe.style.width = `${designWidth}px`;
		// Height in design px so that, once scaled, it covers the frame exactly.
		iframe.style.height = `${frameHeight / scale}px`;
		iframe.style.transform = `scale(${scale})`;
	}

	embeds.forEach((iframe) => {
		const frame = iframe.parentElement;
		fit(frame);

		// Re-fit on frame resize (fluid width, rotation, zoom).
		if ('ResizeObserver' in window) {
			new ResizeObserver(() => fit(frame)).observe(frame);
		}
		// An aspect-ratio frame can report 0 height until layout settles; the
		// load event is a reliable second pass.
		iframe.addEventListener('load', () => fit(frame));
	});
}
