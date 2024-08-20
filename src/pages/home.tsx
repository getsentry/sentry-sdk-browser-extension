import { Options, SdkInfo } from '@sentry/types';
import { InjectSdk } from '../components/InjectSdk';
import { isLoadingSignal, latestVersionResource, optionsSignal, sdkInfoSignal } from '..';
import { OptionsTable } from '../components/OptionsTable';

export default function Home() {
	const [sdkInfo] = sdkInfoSignal;
	const [options] = optionsSignal;
	const [isLoading] = isLoadingSignal;
	const [latestVersion] = latestVersionResource;

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
