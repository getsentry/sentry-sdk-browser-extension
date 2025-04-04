import type { BrowserClient } from '@sentry/browser';

interface WindowWithVersionedCarrier extends Window {
	__SENTRY__?: {
		version?: string;
	} & Record<
		Exclude<string, 'version'>,
		{
			defaultCurrentScope?: {
				getClient(): BrowserClient;
			};
		}
	>;
}

export function getClient(): BrowserClient | undefined {
	const currentVersion = (window as WindowWithVersionedCarrier).__SENTRY__?.version;

	if (!currentVersion) {
		return undefined;
	}

	const carrier = (window as WindowWithVersionedCarrier).__SENTRY__?.[currentVersion];

	if (!carrier) {
		return undefined;
	}

	const client = carrier.defaultCurrentScope?.getClient();

	return client;
}
