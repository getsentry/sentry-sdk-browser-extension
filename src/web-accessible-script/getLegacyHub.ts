import type { BrowserClient } from '@sentry/browser';

interface WindowWithLegacyCarrier extends Window {
	__SENTRY__?: {
		hub?: {
			getClient(): BrowserClient;
			_version: string;
		};
	};
}

export function getLegacyHub(): BrowserClient | undefined {
	const hub = (window as WindowWithLegacyCarrier).__SENTRY__?.hub;

	if (hub) {
		return hub.getClient();
	}

	return undefined;
}
