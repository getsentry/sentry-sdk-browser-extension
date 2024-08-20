import { isLoadingSignal, replaySignal } from '..';
import { OptionsTable } from '../components/OptionsTable';
import { ReplayData } from '../types';

export default function Replay() {
	const [replay] = replaySignal;
	const [isLoading] = isLoadingSignal;

	return <section>{isLoading() ? Loading() : Loaded(replay())}</section>;
}

function Loading() {
	return <div>Fetching SDK setup..</div>;
}

function Loaded(replay: ReplayData | undefined) {
	if (replay) {
		return WithReplay(replay);
	}
	return WithoutReplay();
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

function WithoutReplay() {
	return (
		<div>
			<p>Replay is not installed.</p>
		</div>
	);
}
