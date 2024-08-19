import { Integration, Options, SdkInfo } from '@sentry/types';
import { createSignal } from 'solid-js';
import browser from 'webextension-polyfill';
import { ClientMessage } from '../types';
import { getMessageData } from '../utils/getMessageData';

export default function Home() {
	const [sdkInfo, setSdkInfo] = createSignal<SdkInfo | undefined>(undefined);
	const [options, setOptions] = createSignal<Options | undefined>(undefined);
	const [isLoading, setIsLoading] = createSignal(true);

	browser.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
		const data = getMessageData(message);

		if (isClientMessage(data)) {
			setSdkInfo(data.sdkMetadata?.sdk);
			setOptions(data.options);
			setIsLoading(false);
		}
	});

	if (isLoading()) {
		// Ensure we get data, even if the content script has already run
		browser.runtime.sendMessage({ json: { type: 'REQUEST_UPDATES' } });
	}

	return <section>{isLoading() ? Loading() : Loaded(sdkInfo(), options())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(sdkInfo: SdkInfo | undefined, options: Options | undefined) {
	if (sdkInfo && options) {
		return WithSdk(sdkInfo, options);
	}
	return WithoutSdk();
}

function WithSdk(sdkInfo: SdkInfo, options: Options) {
	return (
		<>
			<div>
				SDK {sdkInfo.name} with version {sdkInfo.version} loaded.
			</div>
			<ul>
				{Object.entries(options).map(([key, value]) => (
					<li>
						{key}: {serializeOption(key as keyof Options, value)}
					</li>
				))}
			</ul>
		</>
	);
}

function WithoutSdk() {
	return <div>Sentry SDK not detected.</div>;
}

function isClientMessage(message: any): message is ClientMessage {
	return message.type === 'CLIENT';
}

function serializeOption<Option extends keyof Options>(option: Option, value: Options[Option]): string {
	if (!value) {
		return `${value}`;
	}

	if (option === 'integrations' && Array.isArray(value)) {
		return value.map((integration) => serializeIntegration(integration)).join(', ');
	}

	if (option === 'defaultIntegrations' && Array.isArray(value)) {
		return value.map((integration) => serializeIntegration(integration)).join(', ');
	}

	if (typeof value === 'object') {
		return JSON.stringify(value, null, 2);
	}

	return `${value}`;
}

function serializeIntegration(integration: Integration): string {
	return integration.name;
}
