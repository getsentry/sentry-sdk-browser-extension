import type { SdkInfo } from '@sentry/core';
import type { BrowserOptions } from '@sentry/browser';
import { InjectSdk } from '../components/InjectSdk';
import { isLoadingSignal, isEnabledSignal, latestVersionResource, optionsSignal, sdkInfoSignal } from '..';
import { OptionsTable } from '../components/OptionsTable';

export default function Home() {
	const [sdkInfo] = sdkInfoSignal;
	const [options] = optionsSignal;
	const [isLoading] = isLoadingSignal;
	const [isEnabled] = isEnabledSignal;
	const [latestVersion] = latestVersionResource;

	return <section>{isLoading() ? Loading() : Loaded(sdkInfo(), options(), latestVersion(), isEnabled())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(sdkInfo: SdkInfo | undefined, options: BrowserOptions | undefined, latestVersion: string | undefined, isEnabled: boolean) {
	if (sdkInfo && options) {
		return WithSdk(sdkInfo, options, latestVersion, isEnabled);
	}
	return WithoutSdk(latestVersion);
}

function WithSdk(sdkInfo: SdkInfo, options: BrowserOptions, latestVersion: string | undefined, isEnabled: boolean) {
	const firstPackage = sdkInfo.packages?.length === 1 ? sdkInfo.packages[0] : undefined;

	return (
		<>
			<h1>Sentry SDK</h1>

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

			{!isEnabled && (
				<p>
					<strong>SDK is disabled</strong>
				</p>
			)}

			<OptionsTable options={options as Record<string, unknown>} />
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
