import { normalize } from '@sentry/utils';
import { getLegacyHub } from './web-accessible-script/getLegacyHub';
import { getV8Client } from './web-accessible-script/getV8Client';
import { serializeOptions } from './web-accessible-script/serializeOptions';
import { injectSentrySdk } from './web-accessible-script/injectSentry';
import { isInjectReplayMessage, isInjectSdkMessage, isUpdateConfigMessage } from './utils/getMessageData';
import { getReplayData } from './web-accessible-script/replay';
import { injectReplay } from './web-accessible-script/injectReplay';
import { updateSdkOptions } from './web-accessible-script/updateSdkOptions';
import { interceptEnvelopes } from './web-accessible-script/interceptEnvelopes';

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
	const options = serializeOptions(client, client?.getOptions());
	const replay = client ? getReplayData(client) : undefined;

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
						replay,
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

interceptEnvelopes();

window.addEventListener('message', (event) => {
	try {
		if (event.source !== window || event.data.from !== 'sentry/content-script.js') {
			return;
		}

		const data = event.data.json as Record<string, unknown>;

		if (isInjectSdkMessage(data)) {
			// Send update afterwards...
			injectSentrySdk(data).then(() => sendUpdate());
		}

		if (isInjectReplayMessage(data)) {
			const hubClient = getLegacyHub();
			const v8Client = getV8Client();

			const client = v8Client || hubClient;

			if (client) {
				injectReplay(client, data).then(() => sendUpdate());
			}
		}

		if (isUpdateConfigMessage(data)) {
			const hubClient = getLegacyHub();
			const v8Client = getV8Client();

			const client = v8Client || hubClient;

			if (client) {
				updateSdkOptions(client, data);
				sendUpdate();
			}
		}
	} catch {
		// ignore errors here...
	}
});

// We need to ensure to send a an update whenever the window becomes visible again
window.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		sendUpdate();
	}
});
