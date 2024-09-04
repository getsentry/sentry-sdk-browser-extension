import browser from 'webextension-polyfill';
import { InjectReplayMessage } from '../types';
import { createSignal } from 'solid-js';
import type { replayIntegration } from '@sentry/browser';
import { JsonTextInput } from './JsonTextInput';

export function InjectReplay(props: { sdkVersion: string }) {
	const [replaysSessionSampleRate, setReplaysSessionSampleRate] = createSignal<number | undefined>(1);
	const [replaysOnErrorSampleRate, setReplaysOnErrorSampleRate] = createSignal<number | undefined>(undefined);
	const replaySignal = createSignal<Parameters<typeof replayIntegration>[0] | undefined>(undefined);

	const version = props.sdkVersion;

	const submitForm = (event: Event) => {
		event.preventDefault();

		const data: InjectReplayMessage = {
			type: 'INJECT_REPLAY',
			replaysOnErrorSampleRate: replaysOnErrorSampleRate(),
			replaysSessionSampleRate: replaysSessionSampleRate(),
			replayOptions: replaySignal[0](),
			version,
		};

		injectReplaySdk(data);
	};

	return (
		<form onSubmit={submitForm}>
			<div class="form-item">
				<label for="replaysSessionSampleRate">replaysSessionSampleRate</label>
				<input
					type="number"
					name="replaysSessionSampleRate"
					value={replaysSessionSampleRate()}
					min={0}
					max={1}
					step={0.01}
					onInput={(e) => {
						const value = e.target.value;
						setReplaysSessionSampleRate(value ? parseFloat(value) : undefined);
					}}
				/>
			</div>

			<div class="form-item">
				<label for="replaysOnErrorSampleRate">replaysOnErrorSampleRate</label>
				<input
					type="number"
					name="replaysOnErrorSampleRate"
					value={replaysOnErrorSampleRate()}
					min={0}
					max={1}
					step={0.01}
					onInput={(e) => {
						const value = e.target.value;
						setReplaysOnErrorSampleRate(value ? parseFloat(value) : undefined);
					}}
				/>
			</div>

			<div class="form-item">
				<label for="replayOptions">Other Options (JSON)</label>
				<JsonTextInput signal={replaySignal} inputName="replayOptions" />
			</div>

			<div class="form-item">
				<button type="submit">Inject Session Replay SDK</button>
			</div>
		</form>
	);
}

function injectReplaySdk(data: InjectReplayMessage) {
	const tabId = browser.devtools.inspectedWindow.tabId;

	browser.tabs.sendMessage(tabId, {
		from: 'sentry/devtools',
		json: data,
	});
}
