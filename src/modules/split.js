/**
 * Minimal text splitter. Produces the two-element structure the CSS masks rely
 * on: an overflow-hidden outer (`.line` / `.word`) and a transformable inner.
 *
 * Only plain-text elements are split — anything containing markup is left alone
 * and animated as a whole, which is why the hero's italic line is hand-authored
 * in the HTML instead.
 */

const ORIGINAL = 'splitOriginal';

function cache(el) {
	if (el.dataset[ORIGINAL] === undefined) {
		el.dataset[ORIGINAL] = el.textContent.trim().replace(/\s+/g, ' ');
	}
	return el.dataset[ORIGINAL];
}

export function splitWords(el) {
	const text = cache(el);
	el.textContent = '';
	const words = text.split(' ');

	return words.map((word, i) => {
		const outer = document.createElement('span');
		outer.className = 'word';
		const inner = document.createElement('span');
		inner.className = 'word__i';
		inner.textContent = word;
		outer.appendChild(inner);
		el.appendChild(outer);
		// A real space rather than a CSS margin: the accessible name and any
		// copied text must still read "Every screen", not "Everyscreen".
		if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
		return inner;
	});
}

export function splitLines(el) {
	const text = cache(el);

	// Pass 1 — lay every word out as an inline-block so the browser tells us
	// where the natural line breaks fall.
	el.textContent = '';
	const probes = text.split(' ').map((word, i, arr) => {
		const span = document.createElement('span');
		span.style.display = 'inline-block';
		span.textContent = word;
		el.appendChild(span);
		if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
		return span;
	});

	const groups = [];
	let lastTop = null;
	for (const probe of probes) {
		const top = probe.offsetTop;
		if (lastTop === null || Math.abs(top - lastTop) > 2) {
			groups.push([]);
			lastTop = top;
		}
		groups[groups.length - 1].push(probe.textContent);
	}

	// Pass 2 — rebuild as masked lines.
	el.textContent = '';
	return groups.map((words) => {
		const line = document.createElement('span');
		line.className = 'line';
		const inner = document.createElement('span');
		inner.className = 'line__i';
		inner.textContent = words.join(' ');
		line.appendChild(inner);
		el.appendChild(line);
		return inner;
	});
}

export function split(el) {
	if (el.children.length && !el.dataset[ORIGINAL]) return null;
	return el.dataset.split === 'words' ? splitWords(el) : splitLines(el);
}
