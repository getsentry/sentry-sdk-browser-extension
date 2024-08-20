import browser from 'webextension-polyfill';
import { isInjectReplayMessage, isInjectSdkMessage, isUpdateConfigMessage } from './utils/getMessageData';

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

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	try {
		if (message.from !== 'sentry/devtools') {
			return;
		}

		const data = message.json;

		if (isInjectSdkMessage(data) || isInjectReplayMessage(data) || isUpdateConfigMessage(data)) {
			window.postMessage({ from: 'sentry/content-script.js', json: data });
		}
	} finally {
		sendResponse();
	}
});

window.addEventListener(
	'message',
	(event) => {
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
