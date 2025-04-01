/* @refresh reload */
import './app.css';
import 'highlight.js/styles/github.css';

import browser from 'webextension-polyfill';
import { render } from 'solid-js/web';
import { HashRouter } from '@solidjs/router';
import { routes } from './routes';
import { Layout } from './layout';

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import { createResource, createSignal } from 'solid-js';
import { getLatestSdkVersion } from './utils/sdkVersions';
import { Options, SdkInfo } from '@sentry/types';
import { getMessageData, isClientMessage } from './utils/getMessageData';
import { ReplayData } from './types';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);

const root = document.getElementById('root')!;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error('Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?');
}

export const sdkInfoSignal = createSignal<SdkInfo | undefined>(undefined);
export const optionsSignal = createSignal<Options | undefined>(undefined);
export const replaySignal = createSignal<ReplayData | undefined>(undefined);
export const isLoadingSignal = createSignal(true);
export const isEnabledSignal = createSignal(false);

export const latestVersionResource = createResource(async () => {
	return getLatestSdkVersion();
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (sender.tab?.id !== browser.devtools.inspectedWindow.tabId) {
		return;
	}

	const data = getMessageData(message);

	if (isClientMessage(data)) {
		sdkInfoSignal[1](data.sdkMetadata?.sdk);
		optionsSignal[1](data.options);
		replaySignal[1](data.replay);
		isEnabledSignal[1](data.isEnabled);
		isLoadingSignal[1](false);
		sendResponse();
	}
});

const tabId = browser.devtools.inspectedWindow.tabId;

browser.scripting.executeScript({
	target: { tabId },
	files: ['src/content-script.js'],
});

// Whenever the tab is updated, we need to re-inject the content script
browser.tabs.onUpdated.addListener((updatedTabId, changeInfo, _tab) => {
	if (changeInfo.status === 'complete' && updatedTabId === tabId) {
		browser.scripting.executeScript({
			target: { tabId },
			files: ['src/content-script.js'],
		});
	}
});

render(() => <HashRouter root={Layout}>{routes}</HashRouter>, root);
