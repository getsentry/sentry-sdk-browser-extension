import { Client } from '@sentry/types';

interface WindowWithLegacyCarrier extends Window {
	__SENTRY__?: {
		hub?: {
			getClient(): Client;
			_version: string;
		};
	};
}

export function getLegacyHub(): Client | undefined {
	const hub = (window as WindowWithLegacyCarrier).__SENTRY__?.hub;

	if (hub) {
		return hub.getClient();
	}

	return undefined;
}
