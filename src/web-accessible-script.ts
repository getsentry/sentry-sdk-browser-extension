import { normalize } from '@sentry/utils';
import { getLegacyHub } from './web-accessible-script/getLegacyHub';
import { getV8Client } from './web-accessible-script/getV8Client';
import { Integration, Options } from '@sentry/types';

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
		console.error(error);
	}
}

sendUpdate();

let updateTimer: number | undefined;

updateTimer = setInterval(() => {
	sendUpdate();
}, 5000);

// We need to ensure to send a an update whenever the window becomes visible again
window.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		sendUpdate();

		updateTimer = setInterval(() => {
			sendUpdate();
		}, 5000);
	} else {
		clearInterval(updateTimer);
	}
});

function serializeTransport(transport: Options['transport']): string | undefined {
	if (!transport) {
		return undefined;
	}

	const serialized = `${transport}`;

	// VERY simple check to see if this is our fetch transport...
	if (serialized.includes('fetch')) {
		//return 'FetchTransport';
	}

	return `CustomTransport(${serialized})`;
}

function serializeOptions(options: Options | undefined): Record<string, unknown> | undefined {
	if (!options) {
		return undefined;
	}

	const opts: Record<string, unknown> = {
		...options,
	};

	if (options.transport) {
		opts.transport = serializeTransport(options.transport);
	}

	if (options.stackParser) {
		opts.stackParser = serializeStackParser(options.stackParser);
	}

	if (options.integrations) {
		opts.integrations = serializeIntegrations(options.integrations);
	}

	if (options.defaultIntegrations) {
		const defaultIntegrations = serializeIntegrations(options.defaultIntegrations);

		if (defaultIntegrations && JSON.stringify(defaultIntegrations) !== JSON.stringify(opts.integrations)) {
			opts.defaultIntegrations = defaultIntegrations;
		} else {
			opts.defaultIntegrations = undefined;
		}
	}

	return opts;
}

function serializeStackParser(stackParser: Options['stackParser']): string | undefined {
	if (!stackParser) {
		return undefined;
	}

	const serialized = `${stackParser}`;

	if (serialized.includes('/sentryWrapped/.test')) {
		return 'DefaultStackParser';
	}

	return `CustomStackParser(${serialized})`;
}

function serializeIntegration(integration: Integration): string {
	return integration.name;
}

function serializeIntegrations(integrations: Options['integrations']): string | string[] | undefined {
	if (!integrations) {
		return undefined;
	}

	if (Array.isArray(integrations)) {
		return integrations.map((integration) => serializeIntegration(integration));
	}

	if (typeof integrations === 'function') {
		return `${integrations}`;
	}

	return undefined;
}
