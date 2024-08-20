import browser from 'webextension-polyfill';

/**
 * This file is injected when the extension panel is opened (index.tsx).
 * It is responsilbe ot inject the web-accessible-script.js file into the inspected page,
 * which is the script that has access to the host window.
 *
 * This file receives messages sent from the web-accessible-script.js file and forwards them to the extension.
 */

function injectScript(filePath: string, tag: string) {
	// Bail if the script already exists
	if (document.querySelector(`script[src="${filePath}"]`)) {
		return;
	}

	const node = document.getElementsByTagName(tag)[0];
	const script = document.createElement('script');
	script.setAttribute('type', 'text/javascript');
	script.setAttribute('src', filePath);
	node.appendChild(script);
}

injectScript(browser.runtime.getURL('src/web-accessible-script.js'), 'body');

window.addEventListener(
	'message',
	(event) => {
		console.log('event', event);
		// We only accept messages from ourselves
		if (event.source !== window) {
			return;
		}

		if (event.data.from && event.data.from === 'sentry/web-accessible-script.js') {
			browser.runtime.sendMessage({ json: event.data.json }).catch(() => {
				// TODO: swallow error here?
			});
		}
	},
	false,
);
