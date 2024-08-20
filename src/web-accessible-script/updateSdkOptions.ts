import { BrowserClient, BrowserOptions } from '@sentry/browser';
import { UpdateSdkConfigMessage } from '../types';
import { makeDsn, urlEncode } from '@sentry/utils';
import { DsnComponents, SdkInfo } from '@sentry/types';

export function updateSdkOptions(client: BrowserClient, data: UpdateSdkConfigMessage) {
	// We mutate the existing options...
	const existingOptions = client.getOptions();

	const { options, dsn } = data;

	if (options) {
		for (const key in options) {
			const value = options[key as keyof BrowserOptions];
			(existingOptions as any)[key] = value;
		}
	}

	if (dsn && dsn !== existingOptions.dsn) {
		updateDsn(client, dsn);
	}
}

function updateDsn(client: BrowserClient, dsn: string): void {
	// We mutate the existing options...
	const existingOptions = client.getOptions();

	existingOptions.dsn = dsn;

	const parsedDsn = makeDsn(dsn);

	if (parsedDsn) {
		const dsnProp = findDsnProp(client as unknown as Record<string, unknown>);
		const transportProp = findTransportProp(client as unknown as Record<string, unknown>);

		if (!dsnProp || !transportProp) {
			console.error('Could not find the minified DSN or transport prop on the client');
			return;
		}

		// @ts-expect-error We are mutating this anyhow...
		client[dsnProp] = parsedDsn;

		const url = getEnvelopeEndpointWithUrlEncodedAuth(
			parsedDsn,
			existingOptions.tunnel,
			existingOptions._metadata ? existingOptions._metadata.sdk : undefined,
		);

		const transport = existingOptions.transport({
			tunnel: existingOptions.tunnel,
			recordDroppedEvent: client.recordDroppedEvent.bind(client),
			...existingOptions.transportOptions,
			url,
		});

		// @ts-expect-error We are mutating this anyhow...
		client[transportProp] = transport;

		console.log(`Updated the DSN to the new value: ${dsn}`);
	}
}

function findDsnProp(options: Record<string, unknown>): string | undefined {
	for (const key in options) {
		// if not minified, we just use this
		if (key === '_dsn') {
			return key;
		}

		// Else, we check the shape of the value
		const value = options[key];

		if (value && typeof value === 'object' && 'host' in value && 'projectId' in value && 'publicKey' in value) {
			return key;
		}
	}

	return undefined;
}

function findTransportProp(options: Record<string, unknown>): string | undefined {
	for (const key in options) {
		// if not minified, we just use this
		if (key === '_transport') {
			return key;
		}

		// Else, we check the shape of the value
		const value = options[key];
		if (value && typeof value === 'object' && 'send' in value && 'flush' in value) {
			return key;
		}
	}

	return undefined;
}

// These are inlined from @sentry/core...
const SENTRY_API_VERSION = '7';

function getEnvelopeEndpointWithUrlEncodedAuth(dsn: DsnComponents, tunnel?: string, sdkInfo?: SdkInfo): string {
	return tunnel ? tunnel : `${_getIngestEndpoint(dsn)}?${_encodedAuth(dsn, sdkInfo)}`;
}

/** Returns the prefix to construct Sentry ingestion API endpoints. */
function getBaseApiEndpoint(dsn: DsnComponents): string {
	const protocol = dsn.protocol ? `${dsn.protocol}:` : '';
	const port = dsn.port ? `:${dsn.port}` : '';
	return `${protocol}//${dsn.host}${port}${dsn.path ? `/${dsn.path}` : ''}/api/`;
}

/** Returns the ingest API endpoint for target. */
function _getIngestEndpoint(dsn: DsnComponents): string {
	return `${getBaseApiEndpoint(dsn)}${dsn.projectId}/envelope/`;
}

/** Returns a URL-encoded string with auth config suitable for a query string. */
function _encodedAuth(dsn: DsnComponents, sdkInfo: SdkInfo | undefined): string {
	return urlEncode({
		// We send only the minimum set of required information. See
		// https://github.com/getsentry/sentry-javascript/issues/2572.
		sentry_key: dsn.publicKey,
		sentry_version: SENTRY_API_VERSION,
		...(sdkInfo && { sentry_client: `${sdkInfo.name}/${sdkInfo.version}` }),
	});
}
