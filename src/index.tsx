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
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);

const root = document.getElementById('root')!;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error('Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?');
}

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
