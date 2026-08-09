// The page shapes auto-theme detection has to get right. `expect` is the scheme
// the player SHOULD resolve to given what the page actually looks like on screen
// — 'os' means it legitimately depends on the OS preference (the page opted into
// both schemes and paints nothing itself).
export const CASES = [
	{
		id: 'issue21',
		label: 'Issue #21 repro — <meta color-scheme="light dark">, no painted background',
		head: '<meta name="color-scheme" content="light dark">',
		expect: 'os',
	},
	{
		id: 'bare',
		label: 'Bare page — nothing declared, nothing painted',
		head: '',
		// Measured: Chrome paints its base background #121212 behind a page
		// that paints nothing, whenever the user prefers dark — so this really
		// does follow the OS preference.
		expect: 'os',
	},
	{
		id: 'light-only',
		label: 'Page opts out of dark (color-scheme: light)',
		head: '<style>:root { color-scheme: light }</style>',
		// Also measured: the base background still goes dark under OS dark,
		// even though the page declared `color-scheme: light`.
		expect: 'os',
	},
	{
		id: 'dark-scheme',
		label: 'Page opts into dark only (color-scheme: dark)',
		head: '<style>:root { color-scheme: dark }</style>',
		expect: 'dark',
	},
	{
		id: 'dark-body',
		label: 'Dark background painted on <body>',
		head: '<style>body { background: #111; color: #eee }</style>',
		expect: 'dark',
	},
	{
		id: 'dark-html',
		label: 'Dark background painted on <html> only (body transparent)',
		head: '<style>html { background: #0d0d0d; color: #eee }</style>',
		expect: 'dark',
	},
	{
		id: 'dark-wrapper',
		label: 'Dark background on a wrapper div, body transparent',
		head: '<style>#wrap { background: #141414; color: #eee; padding: 40px }</style>',
		wrap: true,
		expect: 'dark',
	},
	{
		id: 'dark-gradient',
		label: 'Dark gradient (background-image, no background-color)',
		head: '<style>body { background: linear-gradient(160deg, #0b1020, #131a2e); color: #e6e9f5 }</style>',
		expect: 'dark',
	},
	{
		id: 'light-gradient',
		label: 'Light gradient (background-image, no background-color)',
		head: '<style>body { background: linear-gradient(160deg, #fdfbf7, #eef2ff); color: #111 }</style>',
		// The page paints its own light surface over the browser's base
		// background, so an OS dark preference must not win here.
		expect: 'light',
	},
	{
		id: 'translucent-scrim',
		label: 'Translucent black scrim over white',
		head: '<style>body { background: #fff; color: #111 } #wrap { background: rgba(0,0,0,0.06); padding: 40px }</style>',
		wrap: true,
		expect: 'light',
	},
	{
		id: 'light-body',
		label: 'Light background painted on <body>',
		head: '<style>body { background: #fff; color: #111 }</style>',
		expect: 'light',
	},
	{
		id: 'tailwind-dark',
		label: 'Tailwind `dark` class on <html>',
		head: '<style>.dark #wrap { background: #0b0b0b; color: #eee; padding: 40px }</style>',
		htmlClass: 'dark',
		wrap: true,
		expect: 'dark',
	},
];

// A deterministic peak set so every shot renders the same waveform.
export const PEAKS = Array.from({ length: 120 }, (_, i) =>
	0.25 + 0.7 * Math.abs(Math.sin(i / 7)) * (0.5 + 0.5 * Math.cos(i / 23))
);

export function buildHtml(c) {
	const player = '<div id="host" style="max-width:640px;margin:0 auto"></div>';
	const body = c.wrap ? `<div id="wrap">${player}</div>` : player;
	return `<!doctype html>
<html lang="en"${c.htmlClass ? ` class="${c.htmlClass}"` : ''}>
<head>
<meta charset="utf-8">
${c.head}
<style>
  /* Only layout — never colour. Colour is entirely the case's business. */
  body { margin: 0; font: 14px -apple-system, system-ui, sans-serif; }
  #pad { padding: 48px 24px; }
</style>
</head>
<body><div id="pad">${body}</div></body>
</html>`;
}
