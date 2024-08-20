import { Options, SdkInfo } from '@sentry/types';
import { createResource, createSignal, JSX } from 'solid-js';
import browser from 'webextension-polyfill';
import { getMessageData, isClientMessage } from '../utils/getMessageData';
import { CodeBlock, InlineCode } from '../components/CodeSnippet';
import { getLatestSdkVersion } from '../utils/getLatestSdkVersion';
import { InjectSdk } from '../components/InjectSdk';

export default function Home() {
	const [sdkInfo, setSdkInfo] = createSignal<SdkInfo | undefined>(undefined);
	const [options, setOptions] = createSignal<Options | undefined>(undefined);
	const [isLoading, setIsLoading] = createSignal(true);

	const [latestVersion] = createResource(async () => {
		return getLatestSdkVersion();
	});

	browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		const data = getMessageData(message);

		if (isClientMessage(data)) {
			setSdkInfo(data.sdkMetadata?.sdk);
			setOptions(data.options);
			setIsLoading(false);
		}

		sendResponse();
	});

	return <section>{isLoading() ? Loading() : Loaded(sdkInfo(), options(), latestVersion())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(sdkInfo: SdkInfo | undefined, options: Options | undefined, latestVersion: string | undefined) {
	if (sdkInfo && options) {
		return WithSdk(sdkInfo, options, latestVersion);
	}
	return WithoutSdk(latestVersion);
}

function WithSdk(sdkInfo: SdkInfo, options: Options, latestVersion: string | undefined) {
	const firstPackage = sdkInfo.packages?.length === 1 ? sdkInfo.packages[0] : undefined;

	return (
		<>
			<p>
				SDK <strong>{sdkInfo.name}</strong> with version <strong>{sdkInfo.version}</strong>
				{latestVersion && ` (Latest: ${latestVersion})`} detected.
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

function WithoutSdk(latestSdkVersion: string | undefined) {
	return (
		<div>
			<p>Sentry SDK not detected.</p>
			{latestSdkVersion && (
				<div>
					<InjectSdk latestSdkVersion={latestSdkVersion} />
				</div>
			)}
		</div>
	);
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
						<td>{serializeOption(value)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function serializeOption<Option extends keyof Options>(value: Options[Option]): string | JSX.Element {
	if (!value) {
		return `${value}`;
	}

	if (typeof value === 'object') {
		return CodeBlock({ code: JSON.stringify(value, null, 2) });
	}

	return InlineCode({ code: `${value}` });
}
