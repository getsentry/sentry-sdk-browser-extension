import type * as SentryType from '@sentry/browser';
import { InjectReplayMessage } from '../types';

export async function injectReplay(client: SentryType.BrowserClient, data: InjectReplayMessage): Promise<void> {
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

			const replay = Sentry.replayIntegration({
				...data.replayOptions,
			});

			client.addIntegration(replay);

			console.log('Replay was injected successfully');

			// Wait a tick to resolve, as replay may need some time to initialize
			setTimeout(() => resolve(), 2);
		}

		setTimeout(onSentryCDNScriptLoaded, 1000);
	});
}
