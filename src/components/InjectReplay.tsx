import browser from 'webextension-polyfill';
import { InjectReplayMessage } from '../types';
import { createSignal } from 'solid-js';
import type { replayIntegration } from '@sentry/browser';

export function InjectReplay(props: { latestSdkVersion: string }) {
	const [replaysSessionSampleRate, setReplaysSessionSampleRate] = createSignal<number | undefined>(1);
	const [replaysOnErrorSampleRate, setReplaysOnErrorSampleRate] = createSignal<number | undefined>(undefined);
	const [replayOptions, setReplayOptions] = createSignal<Parameters<typeof replayIntegration>[0] | undefined>(undefined);

	const submitForm = (event: Event) => {
		event.preventDefault();

		const data: InjectReplayMessage = {
			type: 'INJECT_REPLAY',
			replaysOnErrorSampleRate: replaysOnErrorSampleRate(),
			replaysSessionSampleRate: replaysSessionSampleRate(),
			replayOptions: replayOptions(),
			version: props.latestSdkVersion,
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
				<textarea
					name="replayOptions"
					onInput={(e) => {
						const value = e.target.value;

						if (!value) {
							setReplayOptions(undefined);
							return;
						}

						try {
							const json = JSON.parse(value);
							setReplayOptions(json);
						} catch (error) {
							// skip...
						}
					}}
				>
					{JSON.stringify(replayOptions(), null, 2)}
				</textarea>
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
