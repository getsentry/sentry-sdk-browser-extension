import type * as SentryType from '@sentry/browser';
import { InjectSdkMessage } from '../types';
import { Integration } from '@sentry/types';

export function injectSentrySdk(data: InjectSdkMessage): Promise<void> {
	const { dsn, options, debug, enableFeedback, enableReplay, enableTracing } = data;

	return new Promise<void>((resolve, reject) => {
		function onSentryCDNScriptLoaded() {
			const Sentry = (window as { Sentry?: typeof SentryType }).Sentry;

			if (!Sentry) {
				reject(new Error('Sentry could not be loaded!'));
				return;
			}

			console.log('Sentry SDK CDN bundle injected, initializing Sentry...');

			const integrations: Integration[] = [];
			const additionalOptions: Partial<SentryType.BrowserOptions> = {};

			if (enableTracing) {
				integrations.push(Sentry.browserTracingIntegration());
				additionalOptions.tracesSampleRate = 1.0;
			}
			if (enableReplay) {
				integrations.push(Sentry.replayIntegration());
				additionalOptions.replaysSessionSampleRate = 1.0;
			}
			if (enableFeedback) {
				integrations.push(Sentry.feedbackIntegration());
			}

			Sentry.init({
				dsn,
				debug,
				integrations,
				...additionalOptions,
				...options,
			});

			resolve();
		}

		setTimeout(onSentryCDNScriptLoaded, 1000);
	});
}
