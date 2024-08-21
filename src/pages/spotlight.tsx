import * as SpotlightJs from '@spotlightjs/overlay';
import browser from 'webextension-polyfill';
import { getMessageData, isEnvelopeMessage } from '../utils/getMessageData';
import { onCleanup } from 'solid-js';

const SPOTLIGHT_SELECTOR = '#sentry-spotlight-root';

export default function Spotlight() {
	const existingSpotlight = document.querySelector(SPOTLIGHT_SELECTOR);

	if (!existingSpotlight) {
		SpotlightJs.init({
			fullPage: true,
			injectImmediately: true,
			showTriggerButton: false,
			integrations: [
				SpotlightJs.sentry({
					injectIntoSDK: false,
					sidecarUrl: '',
				}),
			],
			showClearEventsButton: false,
			sidecarUrl: '',
			skipSidecar: true,
		});

		const listener = ((message, sender, sendResponse) => {
			if (sender.tab?.id !== browser.devtools.inspectedWindow.tabId) {
				return;
			}

			const data = getMessageData(message);

			if (isEnvelopeMessage(data)) {
				SpotlightJs.trigger('sentry:addEnvelope', data.envelope);
				sendResponse();
			}
		}) satisfies Parameters<typeof browser.runtime.onMessage.addListener>[0];

		browser.runtime.onMessage.addListener(listener);
	} else {
		existingSpotlight.classList.remove('force-hidden');
	}

	onCleanup(() => {
		const element = document.querySelector('#sentry-spotlight-root');
		if (element) {
			element.classList.add('force-hidden');
		}
	});

	return <></>;
}
