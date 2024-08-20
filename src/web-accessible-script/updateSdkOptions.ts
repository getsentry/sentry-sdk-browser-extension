import { BrowserClient, BrowserOptions } from '@sentry/browser';
import { UpdateSdkConfigMessage } from '../types';

export function updateSdkOptions(client: BrowserClient, data: UpdateSdkConfigMessage) {
	// We mutate the existing options...
	const existingOptions = client.getOptions();

	const { options, dsn, debug } = data;

	if (options) {
		for (const key in options) {
			const value = options[key as keyof BrowserOptions];
			(existingOptions as any)[key] = value;
		}
	}

	if (dsn) {
		existingOptions.dsn = dsn;

		const transport = client.getTransport();
	}
}
