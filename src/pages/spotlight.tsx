import * as SpotlightJs from '@spotlightjs/overlay';
import browser from 'webextension-polyfill';
import { getMessageData, isEnvelopeMessage } from '../utils/getMessageData';

export default function Spotlight() {
	SpotlightJs.init({
		fullPage: true,
		injectImmediately: true,
		showTriggerButton: false,
		integrations: [SpotlightJs.sentry({ injectIntoSDK: false })],
		showClearEventsButton: false,
	});

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		const data = getMessageData(message);

		if (isEnvelopeMessage(data)) {
			SpotlightJs.trigger('sentry:addEnvelope', data.envelope);
			sendResponse();
		}
	});

	return <></>;
}
