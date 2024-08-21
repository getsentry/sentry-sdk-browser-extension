import { Client } from '@sentry/types';
import { EnvelopeMessage } from '../types';
import { serializeEnvelope } from '@sentry/utils';
import { getLegacyHub } from './getLegacyHub';
import { getV8Client } from './getV8Client';

export function interceptEnvelopes(): undefined {
	const hubClient = getLegacyHub();
	const v8Client = getV8Client();

	const client = v8Client || hubClient;

	// Try to connect again in 1s, until we actually get a client
	if (client) {
		interceptEnvelopesForClient(client);
	} else {
		setTimeout(() => interceptEnvelopes(), 1000);
	}
}

function interceptEnvelopesForClient(client: Client): void {
	console.log('INTERCEPT ENVELOPES!');
	client.on('beforeEnvelope', (envelope) => {
		const serializedEnvelope = serializeEnvelope(envelope);

		console.log('serialized envelope...', serializeEnvelope);

		// We only handle string envelopes for now - we skip replay
		if (typeof serializedEnvelope !== 'string') {
			return;
		}

		try {
			const data = {
				type: 'ENVELOPE',
				envelope: serializedEnvelope,
			} satisfies EnvelopeMessage;

			window.postMessage(
				{
					from: 'sentry/web-accessible-script.js',
					json: JSON.stringify(data),
				},
				'*',
			);
		} catch (error) {
			// swallow error here - TODO ??
		}
	});
}
