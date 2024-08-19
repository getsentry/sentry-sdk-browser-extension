import browser from "webextension-polyfill";

browser.devtools.panels.create("Sentry SDK", "icon/128.png", "src/index.html");
