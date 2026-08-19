/**
 * POST /api/submit — Vercel serverless function (Node runtime).
 *
 * Sends two emails through Resend (https://resend.com) on each submission:
 *   1. An enquiry notification to you (OWNER_EMAIL).
 *   2. A confirmation to the person who filled the form.
 *
 * Configure in Vercel → Project → Settings → Environment Variables:
 *   RESEND_API_KEY  (required)  from https://resend.com/api-keys
 *   OWNER_EMAIL     (required)  inbox that receives enquiries (your real email)
 *   FROM_EMAIL      (optional)  verified Resend sender, e.g.
 *                               "Avero Designs <hello@averodesigns.com>".
 *                               Defaults to Resend's shared test sender, which
 *                               can only email YOUR OWN account address — so the
 *                               CLIENT confirmation is skipped until you set this
 *                               to an address on a domain you've verified in Resend.
 *
 * Incremental setup:
 *   • With just RESEND_API_KEY + OWNER_EMAIL you immediately get enquiry emails.
 *   • Add a verified domain + FROM_EMAIL to switch on client confirmations.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const esc = (s) =>
	String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', 'POST');
		return res.status(405).json({ success: false, message: 'Method not allowed' });
	}

	const KEY = process.env.RESEND_API_KEY;
	const OWNER = process.env.OWNER_EMAIL;
	const FROM = process.env.FROM_EMAIL || 'Avero Designs <onboarding@resend.dev>';
	// The shared test sender can't email arbitrary recipients — so client
	// confirmations only go out once FROM_EMAIL uses a verified domain.
	const canEmailClients = !/onboarding@resend\.dev/i.test(FROM);

	if (!KEY || !OWNER) {
		return res.status(501).json({ success: false, message: 'Email service not configured' });
	}

	let body = req.body;
	if (typeof body === 'string') {
		try { body = JSON.parse(body); } catch { body = {}; }
	}
	body = body || {};

	// Honeypot — silently accept and drop bots.
	if (body.botcheck) return res.status(200).json({ success: true });

	const name = String(body.name || '').trim();
	const email = String(body.email || '').trim();
	const service = String(body.service || '').trim();

	if (!name || !email || !service) {
		return res.status(400).json({ success: false, message: 'Missing required fields' });
	}
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		return res.status(400).json({ success: false, message: 'Invalid email address' });
	}

	const rows = {
		Name: name,
		Email: email,
		Phone: body.phone,
		Business: body.business,
		Website: body.website,
		Service: service,
		Budget: body.budget,
		Message: body.message
	};
	const table = `<table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif">${Object.entries(
		rows
	)
		.filter(([, v]) => String(v || '').trim())
		.map(
			([k, v]) =>
				`<tr><td style="font-weight:600;color:#555;vertical-align:top">${k}</td><td>${esc(v)}</td></tr>`
		)
		.join('')}</table>`;

	async function sendEmail(payload) {
		const r = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
		return r.json();
	}

	try {
		// 1) Notify the studio.
		await sendEmail({
			from: FROM,
			to: [OWNER],
			reply_to: email,
			subject: `New project enquiry — ${name}${body.business ? ' · ' + body.business : ''}`,
			html: `<h2 style="font-family:system-ui,sans-serif">New project enquiry</h2>${table}`
		});

		// 2) Confirm to the client (best-effort; needs a verified sending domain).
		let clientConfirmed = false;
		if (canEmailClients) {
			try {
				const first = esc(name.split(' ')[0] || name);
				await sendEmail({
					from: FROM,
					to: [email],
					subject: 'Thanks — we’ve received your enquiry · Avero Designs',
					html: `<div style="font-family:system-ui,sans-serif">
						<p>Hi ${first},</p>
						<p>Thanks for reaching out to <strong>Avero Designs</strong>. Your enquiry is in, and we’ll get back to you within one business day.</p>
						<p style="color:#555">A copy of what you sent:</p>
						${table}
						<p>— Avero Designs</p>
					</div>`
				});
				clientConfirmed = true;
			} catch (e) {
				// Domain likely not verified yet. The studio email already went out;
				// don't fail the whole request over the confirmation.
				console.error('Client confirmation skipped:', e.message);
			}
		}

		return res.status(200).json({ success: true, clientConfirmed });
	} catch (e) {
		console.error('Submit failed:', e.message);
		return res.status(502).json({ success: false, message: 'Could not send email' });
	}
}
