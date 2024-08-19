import browser from 'webextension-polyfill';
import { ClientMessage, MessageFromBackground } from './types';
import { getMessageData, isClientMessage, isRequestUpdatesMessage } from './utils/getMessageData';

/**
 * This runs in the background of the extension and listens for messages from the content script.
 * It caches the latest messages from the content script, and broadcasts them to the extension application.
 * The application can request up-to-date messages by triggering a message itself.
 */

const latestClientMessage = new Map<number, ClientMessage | undefined>();

browser.runtime.onInstalled.addListener((details) => {
	console.log('Extension installed:', details);

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		const tabId = sender.tab?.id;

		if (isFromBackground(message)) {
			sendResponse();
			return;
		}

		const data = getMessageData(message);

		if (isClientMessage(data) && tabId) {
			console.log('caching it for ', tabId);
			latestClientMessage.set(tabId, data);
		}

		if (isRequestUpdatesMessage(data)) {
			sendUpdates(data.tabId, false);
		}

		sendResponse();
	});

	browser.tabs.onActivated.addListener((tabInfo) => {
		sendUpdates(tabInfo.tabId);
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
		if (changeInfo.status === 'complete') {
			console.log('deleting it for...', tabId);
			latestClientMessage.delete(tabId);
		}
	});
});

function sendUpdates(tabId: number, force = true) {
	const data = latestClientMessage.get(tabId);
	if (data && !force) {
		browser.runtime.sendMessage({ json: data, fromBackground: true });
	} else if (force) {
		browser.runtime.sendMessage({ json: { type: data?.type }, fromBackground: true });
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
