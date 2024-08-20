import browser from 'webextension-polyfill';
import { InjectSdkMessage } from './types';
import { isInjectSdkMessage } from './utils/getMessageData';

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

	// TEST THIS!
	/* setTimeout(() => {
		const data = {
			type: 'INJECT_SDK',
			version: '8.24.0',
			debug: true,
			dsn: 'https://33f3f99d7064495b95ccacfb9225bbbf@o447951.ingest.us.sentry.io/4504689757257728',
			enableReplay: true,
			enableTracing: true,
			enableFeedback: true,
		} satisfies InjectSdkMessage;

		window.postMessage({ from: 'sentry/content-script.js', json: data });
	}, 100); */
}

injectScript(browser.runtime.getURL('src/web-accessible-script.js'), 'body');

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	try {
		if (message.from !== 'sentry/devtools') {
			return;
		}

		const data = message.json;

		if (isInjectSdkMessage(data)) {
			console.log(data);
			window.postMessage({ from: 'sentry/content-script.js', json: data });
		}
	} finally {
		sendResponse();
	}
});

window.addEventListener(
	'message',
	(event) => {
		console.log('received message in content-script', event);
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
