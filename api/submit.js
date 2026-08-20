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

/* ==========================================================================
   Branded HTML email — inline styles + tables only, for client compatibility
   (Gmail/Apple Mail/Outlook). Colours are pulled from the Avero brand: warm
   ink, cream, and the coral of the logo mark.
   ========================================================================== */
const C = {
	ink: '#15100E',
	cream: '#F1ECE3',
	warmWhite: '#FBF9F5',
	card: '#FFFFFF',
	text: '#2A2320',
	muted: '#8C837C',
	faint: '#B3ABA2',
	line: '#EBE4DB',
	coral: '#E4897A',
	coralDeep: '#C56A57'
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const firstNameOf = (name) => esc(String(name).trim().split(/\s+/)[0] || name);

function linkify(key, value) {
	const v = esc(value);
	if (key === 'Email') {
		return `<a href="mailto:${v}" style="color:${C.coralDeep};text-decoration:none">${v}</a>`;
	}
	if (key === 'Website') {
		const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
		return `<a href="${esc(href)}" style="color:${C.coralDeep};text-decoration:none">${v}</a>`;
	}
	return v;
}

/** Two-column label/value rows for the submitted fields (skips Message). */
function detailRows(rows) {
	const cell = `padding:11px 0;border-bottom:1px solid ${C.line};vertical-align:top`;
	return Object.entries(rows)
		.filter(([k, v]) => k !== 'Message' && String(v || '').trim())
		.map(
			([k, v]) => `<tr>
				<td style="${cell};width:132px;font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${C.muted}">${k}</td>
				<td style="${cell};font:400 15px/1.5 ${FONT};color:${C.text}">${linkify(k, v)}</td>
			</tr>`
		)
		.join('');
}

/** Quoted message block with a coral rule. */
function messageBlock(message) {
	const m = String(message || '').trim();
	if (!m) return '';
	return `<div style="margin:22px 0 0;padding:16px 18px;background:${C.cream};border-left:3px solid ${C.coral};border-radius:2px">
		<div style="font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${C.muted};margin-bottom:6px">Message</div>
		<div style="font:400 15px/1.6 ${FONT};color:${C.text}">${esc(m).replace(/\n/g, '<br>')}</div>
	</div>`;
}

/** Wraps body content in the branded shell (header, accent rule, footer). */
function shell({ origin, preheader, eyebrow, heading, intro, bodyHtml }) {
	const logo = `${origin}/avero-monogram.png`;
	return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:${C.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:28px 12px">
	<tr><td align="center">
		<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${C.card};border:1px solid ${C.line};border-radius:14px;overflow:hidden">
			<tr><td style="background:${C.ink};padding:24px 32px">
				<img src="${logo}" alt="" width="30" height="34" style="display:inline-block;vertical-align:middle;border:0;height:34px;width:auto">
				<span style="display:inline-block;vertical-align:middle;margin-left:12px;font:700 17px/1 ${FONT};letter-spacing:.22em;color:${C.cream}">AVERO</span><span style="display:inline-block;vertical-align:middle;margin-left:7px;font:400 17px/1 ${FONT};letter-spacing:.22em;color:${C.coral}">DESIGNS</span>
			</td></tr>
			<tr><td style="height:3px;background:${C.coral};font-size:0;line-height:0">&nbsp;</td></tr>
			<tr><td style="padding:34px 32px 30px">
				${eyebrow ? `<div style="font:600 11px/1.4 ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${C.coralDeep};margin-bottom:12px">${esc(eyebrow)}</div>` : ''}
				<h1 style="margin:0 0 ${intro ? '12px' : '20px'};font:600 24px/1.25 ${FONT};color:${C.ink};letter-spacing:-.01em">${heading}</h1>
				${intro ? `<p style="margin:0 0 24px;font:400 15px/1.6 ${FONT};color:${C.muted}">${intro}</p>` : ''}
				${bodyHtml}
			</td></tr>
			<tr><td style="background:${C.warmWhite};border-top:1px solid ${C.line};padding:22px 32px">
				<div style="font:600 13px/1.5 ${FONT};color:${C.text}">Avero Designs</div>
				<div style="font:400 12px/1.6 ${FONT};color:${C.muted}">Premium web design &amp; digital identity · Calgary, AB<br><a href="mailto:hello@averodesigns.com" style="color:${C.muted};text-decoration:underline">hello@averodesigns.com</a></div>
			</td></tr>
		</table>
		<div style="font:400 11px/1.5 ${FONT};color:${C.faint};margin-top:16px">Sent by the Avero Designs website</div>
	</td></tr>
</table>
</body></html>`;
}

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

	const origin =
		'https://' +
		(req.headers['x-forwarded-host'] ||
			req.headers.host ||
			'personal-website-ten-red-96.vercel.app');

	// Fields shown to the studio (full detail). Message renders separately below.
	const rows = {
		Name: name,
		Email: email,
		Phone: body.phone,
		Business: body.business,
		Website: body.website,
		Service: service,
		Budget: body.budget
	};

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
		const ownerBody = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows(
			rows
		)}</table>${messageBlock(body.message)}
			<div style="margin-top:28px">
				<a href="mailto:${esc(email)}?subject=${encodeURIComponent(
					`Re: your Avero Designs enquiry`
				)}" style="display:inline-block;background:${C.ink};color:${C.cream};font:600 14px/1 ${FONT};text-decoration:none;padding:14px 24px;border-radius:9px">Reply to ${firstNameOf(
					name
				)} &rarr;</a>
			</div>`;
		await sendEmail({
			from: FROM,
			to: [OWNER],
			reply_to: email,
			subject: `New enquiry · ${name}${body.business ? ' — ' + body.business : ''}`,
			html: shell({
				origin,
				preheader: `New enquiry from ${name}${body.business ? ' at ' + body.business : ''} — reply-to is set to their email.`,
				eyebrow: 'New project enquiry',
				heading: esc(name),
				intro: `Reached out through your website${
					body.business ? ' · ' + esc(body.business) : ''
				}. Reply-to is set to their address — just hit reply, or use the button below.`,
				bodyHtml: ownerBody
			})
		});

		// 2) Confirm to the client (best-effort; needs a verified sending domain).
		let clientConfirmed = false;
		if (canEmailClients) {
			try {
				const first = firstNameOf(name);
				// A lighter summary for the client — they know their own contact
				// details, so lead with what the project is.
				const clientRows = {
					Service: service,
					Business: body.business,
					Website: body.website,
					Budget: body.budget
				};
				const clientBody = `<p style="margin:0 0 22px;font:400 15px/1.65 ${FONT};color:${C.text}">We&rsquo;ve received your enquiry and a member of the studio will get back to you within <strong>one business day</strong>. Here&rsquo;s a copy for your records:</p>
					<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows(
						clientRows
					)}</table>${messageBlock(body.message)}
					<p style="margin:28px 0 0;font:400 15px/1.65 ${FONT};color:${C.text}">Talk soon,<br><strong>The Avero Designs team</strong></p>`;
				await sendEmail({
					from: FROM,
					to: [email],
					subject: 'We’ve received your enquiry · Avero Designs',
					html: shell({
						origin,
						preheader: `Thanks ${first} — we’ll be in touch within one business day.`,
						heading: `Thanks, ${first}.`,
						bodyHtml: clientBody
					})
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
