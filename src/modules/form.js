import gsap from 'gsap';
import { prefersReducedMotion } from './env.js';

/**
 * Contact form. Submissions POST to FORM_ENDPOINT when one is set; until then
 * they hand off to the visitor's email client with everything pre-filled, so no
 * enquiry is ever lost. To receive submissions straight to your inbox, create a
 * free form at https://formspree.io (or Getform/Basin/Web3Forms), paste its URL
 * into FORM_ENDPOINT below, and you're done — no other change needed.
 */
const FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxxxxx'
const CONTACT_EMAIL = 'hello@kontoradesigns.com';
export function initForm() {
	const form = document.querySelector('[data-form]');
	if (!form) return;

	const status = form.querySelector('[data-form-status]');
	const submit = form.querySelector('[type="submit"]');
	const reduced = prefersReducedMotion();

	const required = [...form.querySelectorAll('[required]')];

	required.forEach((input) => {
		input.addEventListener('blur', () => validate(input));
		input.addEventListener('input', () => {
			if (input.closest('.field')?.classList.contains('is-invalid')) validate(input);
		});
	});

	form.addEventListener('submit', async (event) => {
		event.preventDefault();

		const invalid = required.filter((input) => !validate(input));

		if (invalid.length) {
			say(`Please complete the highlighted field${invalid.length > 1 ? 's' : ''}.`, true);
			const first = invalid[0];
			first.focus();
			if (!reduced) {
				gsap.fromTo(
					first.closest('.field'),
					{ x: -6 },
					{ x: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }
				);
			}
			return;
		}

		submit.disabled = true;
		say('Sending…');

		try {
			const method = await deliver(Object.fromEntries(new FormData(form)));
			form.reset();
			form
				.querySelectorAll('.field')
				.forEach((field) => field.classList.remove('is-invalid'));
			say(
				method === 'mailto'
					? 'Opening your email app — hit send and your enquiry is on its way.'
					: "Thank you — your inquiry is in. We'll reply within one business day."
			);
			// Lets the project modal (if this form lives inside it) close itself.
			form.dispatchEvent(new CustomEvent('project:submitted', { bubbles: true }));
		} catch {
			say(`Something went wrong. Please email ${CONTACT_EMAIL} instead.`, true);
		} finally {
			submit.disabled = false;
		}
	});

	function validate(input) {
		const field = input.closest('.field');
		const ok = input.value.trim() !== '' && input.checkValidity();
		field?.classList.toggle('is-invalid', !ok);
		return ok;
	}

	function say(message, isError = false) {
		if (!status) return;
		status.textContent = message;
		status.style.color = isError ? '#e0714f' : '';
		status.classList.add('is-visible');
	}
}

/**
 * Deliver a submission. Returns the method used ('endpoint' | 'mailto') so the
 * caller can word the confirmation accordingly. Throws on a failed POST.
 */
async function deliver(payload) {
	if (FORM_ENDPOINT) {
		const res = await fetch(FORM_ENDPOINT, {
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) throw new Error(`Form endpoint responded ${res.status}`);
		return 'endpoint';
	}

	// No endpoint configured yet — open the visitor's mail client, pre-addressed
	// to the studio with every field filled in, so the enquiry still gets sent.
	const subject = `New project enquiry — ${payload.name || payload.business || 'Website'}`;
	const body = Object.entries(payload)
		.filter(([, value]) => String(value).trim() !== '')
		.map(([key, value]) => `${key[0].toUpperCase() + key.slice(1)}: ${value}`)
		.join('\n');
	window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
		subject
	)}&body=${encodeURIComponent(body)}`;
	return 'mailto';
}
