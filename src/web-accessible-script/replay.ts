import { replayIntegration } from '@sentry/browser';
import { Client } from '@sentry/types';
import { ReplayData } from '../types';

export function getReplayData(client: Client): undefined | ReplayData {
	const replay = client.getIntegrationByName<ReturnType<typeof replayIntegration>>('Replay');

	if (!replay) {
		return undefined;
	}

	const replayId = replay.getReplayId();
	const internalReplay = replay['_replay'];

	return {
		replayId,
		isEnabled: !!replayId,
		isPaused: !!internalReplay?.isPaused(),
		recordingMode: internalReplay?.recordingMode,
		session: internalReplay?.session,
		options: internalReplay?.getOptions(),
	};
}
