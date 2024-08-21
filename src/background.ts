import browser from 'webextension-polyfill';
import { getMessageData, isEnvelopeMessage } from './utils/getMessageData';

browser.runtime.onInstalled.addListener((details) => {
	console.log('Extension installed:', details);
});
