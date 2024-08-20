import type * as SentryType from '@sentry/browser';
import { InjectReplayMessage } from '../types';
import { injectCDNScriptTag } from './injectCdnScriptTag';

export async function injectReplay(client: SentryType.BrowserClient, data: InjectReplayMessage): Promise<void> {
	const cdnUrl = buildCdnUrl(data.version);

	return new Promise<void>((resolve, reject) => {
		function onSentryCDNScriptLoaded() {
			const Sentry = (window as { Sentry?: typeof SentryType }).Sentry;

			if (!Sentry) {
				reject(new Error('Sentry could not be loaded!'));
				return;
			}

			if (!Sentry.replayIntegration) {
				reject(new Error('Replay integration not available!'));
				return;
			}

			// We just mutate the client options here...
			client.getOptions().replaysSessionSampleRate = data.replaysSessionSampleRate;
			client.getOptions().replaysOnErrorSampleRate = data.replaysOnErrorSampleRate;

			client.addIntegration(
				Sentry.replayIntegration({
					...data.replayOptions,
				}),
			);

			console.log('Replay was injected successfully');

			// Wait a tick to resolve, as replay may need some time to initialize
			setTimeout(() => resolve(), 2);
		}

		injectCDNScriptTag(cdnUrl, onSentryCDNScriptLoaded);
	});
}

function buildCdnUrl(version: string): string {
	return `https://browser.sentry-cdn.com/${fixVersion(version)}/replay.min.js`;
}

// HACK ALARM
// We forgot to publish this in v8, so versions > 7 and < 8.27.0 will not work
// as a workaround, we just force it to 8.27.0
function fixVersion(version: string): string {
	if (hasNoReplayBundle(version)) {
		return '8.27.0';
	}

	return version;
}

function hasNoReplayBundle(version: string): boolean {
	const parts = version.split('.');

	if (parts.length === 3 && parts[0] === '8') {
		const minor = parseInt(parts[1], 10);
		if (minor < 27) {
			return true;
		}
	}
	return false;
}
