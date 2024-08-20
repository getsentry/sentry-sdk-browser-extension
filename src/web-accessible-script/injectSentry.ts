import type * as SentryType from '@sentry/browser';
import { InjectSdkMessage } from '../types';
import { Integration } from '@sentry/types';

function injectCDNScriptTag(sdkBundleUrl: string, onSentryCDNScriptLoaded: () => void) {
	if (document.querySelector(`script[src="${sdkBundleUrl}"]`)) {
		return;
	}

	// Create a `script` tag with provided SDK `url` and attach it just before the first, already existing `script` tag
	// Scripts that are dynamically created and added to the document are async by default,
	// they don't block rendering and execute as soon as they download, meaning they could
	// come out in the wrong order. Because of that we don't need async=1 as GA does.
	// it was probably(?) a legacy behavior that they left to not modify few years old snippet
	// https://www.html5rocks.com/en/tutorials/speed/script-loading/
	const firstScriptTagInDom = document.scripts[0];
	const cdnScriptTag = document.createElement('script') as HTMLScriptElement;
	cdnScriptTag.src = sdkBundleUrl;
	cdnScriptTag.crossOrigin = 'anonymous';

	// Once our SDK is loaded
	cdnScriptTag.addEventListener('load', onSentryCDNScriptLoaded, {
		once: true,
		passive: true,
	});
	firstScriptTagInDom.parentNode!.insertBefore(cdnScriptTag, firstScriptTagInDom);
}

function buildSdkBundleUrl({ version, debug, enableFeedback, enableReplay, enableTracing }: InjectSdkMessage): string {
	const bundleParts = [`https://browser.sentry-cdn.com/${version}/bundle`];

	if (enableTracing) {
		bundleParts.push('tracing');
	}
	if (enableReplay) {
		bundleParts.push('replay');
	}
	if (enableFeedback) {
		bundleParts.push('feedback');
	}
	if (!debug) {
		bundleParts.push('min');
	}

	bundleParts.push('js');

	return bundleParts.join('.');
}

export function injectSentrySdk(data: InjectSdkMessage): Promise<void> {
	const { dsn, options, debug, enableFeedback, enableReplay, enableTracing } = data;

	const sdkBundleUrl = buildSdkBundleUrl(data);

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

		injectCDNScriptTag(sdkBundleUrl, onSentryCDNScriptLoaded);
	});
}
