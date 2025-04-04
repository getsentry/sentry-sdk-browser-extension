import type { SdkInfo } from '@sentry/core';
import { isLoadingSignal, optionsSignal, sdkInfoSignal } from '..';
import { OptionsTable } from '../components/OptionsTable';
import type { BrowserOptions } from '@sentry/browser';
import { UpdateConfig } from '../components/UpdateConfig';

export default function Config() {
	const [options] = optionsSignal;
	const [sdkInfo] = sdkInfoSignal;
	const [isLoading] = isLoadingSignal;

	return <section>{isLoading() ? Loading() : Loaded(sdkInfo(), options())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(sdkInfo: SdkInfo | undefined, options: BrowserOptions | undefined) {
	if (sdkInfo && options) {
		return WithSdk(sdkInfo, options);
	}
	return WithoutSdk();
}

function WithSdk(_sdkInfo: SdkInfo, options: BrowserOptions) {
	return (
		<>
			<h1>Update SDK Config</h1>
			<p>You can update the config of the SDK.</p>

			<details>
				<summary>Show current config</summary>
				<OptionsTable options={options as any} />
			</details>

			<UpdateConfig options={options} />
		</>
	);
}

function WithoutSdk() {
	return (
		<div>
			<p>Sentry SDK is not installed.</p>
		</div>
	);
}
