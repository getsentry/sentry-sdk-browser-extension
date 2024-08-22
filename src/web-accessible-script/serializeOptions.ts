import type { Client, Integration, Options } from '@sentry/types';

export function serializeOptions(client: Client | undefined, options: Options | undefined): Record<string, unknown> | undefined {
	if (!options || !client) {
		return undefined;
	}

	const opts: Record<string, unknown> = {
		...options,
	};

	if (options.transport) {
		opts.transport = serializeTransport(options.transport);
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

	const allIntegrations = getIntegrations(client).map(serializeIntegration);

	if (
		!Array.isArray(opts.integrations) ||
		JSON.stringify(allIntegrations.slice().sort()) !== JSON.stringify(opts.integrations.slice().sort())
	) {
		opts['[installedIntegrations]'] = allIntegrations;
	}

	return opts;
}

function getIntegrations(client: Client): Integration[] {
	// This should never be minified, we keep this intact because Replay needs it
	const integrationsHash = (client as any)['_integrations'] as undefined | Record<string, Integration>;

	if (!integrationsHash) {
		return [];
	}

	return Object.values(integrationsHash);
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
		return 'FetchTransport';
	}

	return `CustomTransport(${serialized})`;
}
