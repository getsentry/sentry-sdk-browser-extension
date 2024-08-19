import { Integration, Options, SdkInfo } from '@sentry/types';
import { createSignal, JSX } from 'solid-js';
import browser from 'webextension-polyfill';
import { getMessageData, isClientMessage } from '../utils/getMessageData';
import { CodeBlock, InlineCode } from '../components/CodeSnippet';
import { RequestUpdatesMessage } from '../types';

export default function Home() {
	const [sdkInfo, setSdkInfo] = createSignal<SdkInfo | undefined>(undefined);
	const [options, setOptions] = createSignal<Options | undefined>(undefined);
	const [isLoading, setIsLoading] = createSignal(true);

	const tabId = browser.devtools.inspectedWindow.tabId;

	browser.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
		const data = getMessageData(message);

		if (isClientMessage(data)) {
			setSdkInfo(data.sdkMetadata?.sdk);
			setOptions(data.options);
			setIsLoading(false);
		}
	});

	if (isLoading()) {
		const data: RequestUpdatesMessage = { type: 'REQUEST_UPDATES', tabId };

		// Ensure we get data, even if the content script has already run
		browser.runtime.sendMessage({ json: data });
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
	console.log(sdkInfo);

	const firstPackage = sdkInfo.packages?.length === 1 ? sdkInfo.packages[0] : undefined;

	return (
		<>
			<p>
				SDK <strong>{sdkInfo.name}</strong> with version <strong>{sdkInfo.version}</strong> detected.
				{firstPackage && (
					<>
						{' '}
						Installed from <strong>{firstPackage.name}</strong>.
					</>
				)}
			</p>

			<SdkOptions options={options} />
		</>
	);
}

function WithoutSdk() {
	return <div>Sentry SDK not detected.</div>;
}

function SdkOptions({ options }: { options: Options }) {
	return (
		<table>
			<thead>
				<tr>
					<th>Option</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{Object.entries(options).map(([key, value]) => (
					<tr>
						<td>{InlineCode({ code: key })}</td>
						<td>{serializeOption(key as keyof Options, value)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function serializeOption<Option extends keyof Options>(option: Option, value: Options[Option]): string | JSX.Element {
	if (!value) {
		return `${value}`;
	}

	if (typeof value === 'object') {
		return CodeBlock({ code: JSON.stringify(value, null, 2) });
	}

	return InlineCode({ code: `${value}` });
}

function serializeIntegration(integration: Integration): string {
	return integration.name;
}
