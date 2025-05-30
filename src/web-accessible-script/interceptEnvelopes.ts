import { EnvelopeMessage } from '../types';
import { serializeEnvelope, Client } from '@sentry/core';
import { getLegacyHub } from './getLegacyHub';
import { getClient } from './getClient';

export function interceptEnvelopes(): undefined {
	const hubClient = getLegacyHub();
	const _client = getClient();

	const client = _client || hubClient;

	// Try to connect again in 1s, until we actually get a client
	if (client) {
		interceptEnvelopesForClient(client);
	} else {
		setTimeout(() => interceptEnvelopes(), 1000);
	}
}

function interceptEnvelopesForClient(client: Client): void {
	client.on('beforeEnvelope', (envelope) => {
		const serializedEnvelope = serializeEnvelope(envelope);

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
