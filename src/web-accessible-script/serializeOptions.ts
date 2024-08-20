import { Integration, Options } from '@sentry/types';

export function serializeOptions(options: Options | undefined): Record<string, unknown> | undefined {
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
