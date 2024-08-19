import browser from 'webextension-polyfill';
import { ClientMessage, MessageFromBackground } from './types';
import { getMessageData, isClientMessage, isRequestUpdatesMessage } from './utils/getMessageData';

/**
 * This runs in the background of the extension and listens for messages from the content script.
 * It caches the latest messages from the content script, and broadcasts them to the extension application.
 * The application can request up-to-date messages by triggering a message itself.
 */

let latestClientMessage: ClientMessage | undefined;

browser.runtime.onInstalled.addListener((details) => {
	console.log('Extension installed:', details);

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (isFromBackground(message)) {
			return;
		}

		const data = getMessageData(message);

		if (isClientMessage(data)) {
			latestClientMessage = data;
		}

		if (isRequestUpdatesMessage(data)) {
			sendUpdates();
		}

		sendResponse();
	});
});

function sendUpdates() {
	if (latestClientMessage) {
		browser.runtime.sendMessage({ json: latestClientMessage, fromBackground: true });
	}
}

function isFromBackground(message: unknown): message is MessageFromBackground {
	if (!message) {
		return false;
	}

	if (typeof message === 'object') {
		return (message as MessageFromBackground).fromBackground === true;
	}

	if (typeof message === 'string') {
		try {
			const data = JSON.parse(message);
			return data.fromBackground === true;
		} catch {}
	}

	return false;
}
