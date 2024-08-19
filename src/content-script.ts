import browser from "webextension-polyfill";

function injectScript(filePath: string, tag: string) {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', filePath);
    node.appendChild(script);
}

injectScript(browser.runtime.getURL('src/web-accessible-script.js'), 'body');


window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }

  if (event.data.from && (event.data.from === "sentry/web-accessible-script.js")) {
    browser.runtime.sendMessage({ json: event.data.json });
  }
}, false);