import { SdkInfo } from '@sentry/types';
import { isLoadingSignal, replaySignal, sdkInfoSignal } from '..';
import { InjectReplay } from '../components/InjectReplay';
import { OptionsTable } from '../components/OptionsTable';
import { ReplayData } from '../types';

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
	return (
		<div>
			<p>Replay is not installed.</p>

			<div>{sdkInfo?.version ? <InjectReplay latestSdkVersion={sdkInfo.version} /> : <p>Could not detect SDK version.</p>}</div>
		</div>
	);
}
