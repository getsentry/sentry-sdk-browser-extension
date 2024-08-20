import { normalize } from '@sentry/utils';
import { getLegacyHub } from './web-accessible-script/getLegacyHub';
import { getV8Client } from './web-accessible-script/getV8Client';
import { serializeOptions } from './web-accessible-script/serializeOptions';

/**
 * This file is injected by content-script.ts into the inspected page.
 * This is the only file that actually has access to the host window.
 *
 * It can receive messages from content-script.ts, and send messages to it.
 */

function sendUpdate(): void {
	const hubClient = getLegacyHub();
	const v8Client = getV8Client();

	const client = v8Client || hubClient;

	const sdkMetadata = client?.getSdkMetadata();
	const options = serializeOptions(client?.getOptions());

	if (document.hidden) {
		return;
	}

	try {
		window.postMessage(
			{
				from: 'sentry/web-accessible-script.js',
				json: JSON.stringify(
					normalize({
						type: 'CLIENT',
						sdkMetadata,
						options,
					}),
				),
			},
			'*',
		);
	} catch (error) {
		// swallow error here - TODO ??
	}
}

// We wait a second to give it time to settle
setTimeout(() => {
	sendUpdate();
}, 1000);

// We need to ensure to send a an update whenever the window becomes visible again
window.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		sendUpdate();
	}
});
