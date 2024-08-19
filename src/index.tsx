/* @refresh reload */
import './app.css';

import browser from "webextension-polyfill";
import { render } from 'solid-js/web';
import { HashRouter } from '@solidjs/router';
import { routes } from './routes';
import { Layout } from './layout';

const root = document.getElementById('root')!;

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

const tabId = browser.devtools.inspectedWindow.tabId;

browser.scripting.executeScript({ 
  target: { tabId },
  files: ['src/content-script.js']
});

render(
  () => (
   <HashRouter root={Layout}>
    {routes}
  </HashRouter>
  ),
  root,
);