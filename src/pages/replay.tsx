import { parseSemver, type SdkInfo } from '@sentry/core';
import { isLoadingSignal, replaySignal, sdkInfoSignal } from '..';
import { InjectReplay } from '../components/InjectReplay';
import { OptionsTable } from '../components/OptionsTable';
import { ReplayData } from '../types';
import { getAvailableSdkVersions, getLatestSdkVersion } from '../utils/sdkVersions';

export default function Replay() {
	const [replay] = replaySignal;
	const [sdkInfo] = sdkInfoSignal;
	const [isLoading] = isLoadingSignal;

	return <section>{isLoading() ? Loading() : Loaded(replay(), sdkInfo())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(replay: ReplayData | undefined, sdkInfo: SdkInfo | undefined) {
	if (replay && sdkInfo) {
		return WithReplay(replay);
	}
	return WithoutReplay(sdkInfo);
}

function WithReplay(replay: ReplayData) {
	return (
		<>
			<h1>Session Replay</h1>
			<p>replayIntegration is installed.</p>

			<OptionsTable options={replay as any} />
		</>
	);
}

function WithoutReplay(sdkInfo: SdkInfo | undefined) {
	const version = sdkInfo?.version;

	const replayVersion = version && getSupportedReplayVersion(version);

	return (
		<div>
			<p>Replay is not installed.</p>

			<div>
				{version ? (
					replayVersion ? (
						<>
							(replayVersion !== version ? <p>Using latest available version of replay: {replayVersion}</p> : null)
							<InjectReplay sdkVersion={replayVersion} />
						</>
					) : (
						<p>
							Detected SDK version {version} is not compatible. Only v7.99.0 to v{getLatestSdkVersion()} are supported.
						</p>
					)
				) : (
					<p>Could not detect SDK version.</p>
				)}
			</div>
		</div>
	);
}

function getSupportedReplayVersion(version: string): string | undefined {
	if (getAvailableSdkVersions().includes(version)) {
		return version;
	}

	const latestVersion = getLatestSdkVersion();
	const currentSemver = parseSemver(version);
	const latestSemver = parseSemver(latestVersion);

	// If the version is _newer_ than the latest version, we just assume it is supported and use the latest version instead.
	if (
		currentSemver &&
		latestSemver &&
		currentSemver.major === latestSemver.major &&
		(currentSemver.minor || 0) >= (latestSemver.minor || 0)
	) {
		return latestVersion;
	}

	return undefined;
}
