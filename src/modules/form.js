import gsap from 'gsap';
import { prefersReducedMotion } from './env.js';

/**
 * Contact form. Submissions POST straight to Web3Forms — which emails them to
 * CONTACT_EMAIL — as soon as WEB3FORMS_KEY is set. Until then they fall back to
 * the visitor's email client with every field pre-filled, so no enquiry is ever
 * lost and the site keeps working in the meantime.
 *
 * SET IT UP (≈2 min, free, no backend, no server to run):
 *   1. Go to https://web3forms.com and enter your inbox (contact@averodesigns.com).
 *   2. Web3Forms emails you an "access key" — paste it into WEB3FORMS_KEY below.
 *   3. Redeploy. Submissions now arrive straight in your inbox — no email app.
 *   4. (Optional, in the Web3Forms dashboard) turn on the "Auto-reply" so the
 *      client gets a confirmation email too, and lock the key to your domain.
 *
 * The key is safe to commit: Web3Forms keys are public by design and are
 * restricted to your allowed domain(s) in the dashboard.
 */
const WEB3FORMS_KEY = '86e03a49-a0e7-452a-bcf6-5dc232cf27f6'; // ← paste your Web3Forms access key here
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const CONTACT_EMAIL = 'contact@averodesigns.com';
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
 * Deliver a submission through the best available channel, in order:
 *   1. /api/submit  — our Vercel + Resend function (emails the studio AND sends
 *                     the client a confirmation). Preferred once deployed.
 *   2. Web3Forms    — no-backend fallback, so the form keeps working while the
 *                     Vercel function / Resend domain are still being set up.
 *   3. mailto:      — last resort, hands off to the visitor's email client.
 * Returns the method used ('endpoint' | 'mailto') so the caller can word the
 * confirmation accordingly.
 */
async function deliver(payload) {
	// 1) Our own Vercel + Resend endpoint.
	try {
		const res = await fetch('/api/submit', {
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		// Only treat it as delivered on a real JSON success — on the dev server
		// (no functions) this route returns HTML, which must fall through.
		const data = res.ok ? await res.json().catch(() => null) : null;
		if (data && data.success) return 'endpoint';
		console.warn('[form] /api/submit unavailable, falling back:', res.status);
	} catch (err) {
		console.warn('[form] /api/submit error, falling back:', err);
	}

	// 2) Web3Forms fallback.
	if (WEB3FORMS_KEY) {
		const res = await fetch(WEB3FORMS_ENDPOINT, {
			method: 'POST',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({
				access_key: WEB3FORMS_KEY,
				subject: `New project enquiry — ${payload.name || payload.business || 'Website'}`,
				from_name: 'Avero Designs website',
				// A reply from your inbox then goes straight back to the client.
				replyto: payload.email || '',
				...payload
			})
		});
		// Web3Forms can return 200 with { success: false } (e.g. spam/bad key),
		// so check the body, not just the HTTP status.
		const data = await res.json().catch(() => ({}));
		if (!res.ok || data.success === false) {
			throw new Error(data.message || `Form endpoint responded ${res.status}`);
		}
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
