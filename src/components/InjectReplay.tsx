import browser from 'webextension-polyfill';
import { InjectReplayMessage } from '../types';
import { createResource, createSignal } from 'solid-js';
import type { replayIntegration } from '@sentry/browser';
import { JsonTextInput } from './JsonTextInput';
import { parseSemver } from '@sentry/utils';
import { getAvailableSdkVersions, getLatestSdkVersion } from '../utils/sdkVersions';

export function InjectReplay(props: { sdkVersion: string }) {
	const [replaysSessionSampleRate, setReplaysSessionSampleRate] = createSignal<number | undefined>(1);
	const [replaysOnErrorSampleRate, setReplaysOnErrorSampleRate] = createSignal<number | undefined>(undefined);
	const replaySignal = createSignal<Parameters<typeof replayIntegration>[0] | undefined>(undefined);

	const [versionSignal] = createResource(() => {
		return getFixedVersion(props.sdkVersion);
	});

	const submitForm = (event: Event) => {
		event.preventDefault();

		const version = versionSignal();

		if (!version) {
			window.alert('Version not available');
			return;
		}

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

async function getFixedVersion(version: string): Promise<string | undefined> {
	// SPECIAL CASES:
	// 1. For any unsupported v8 version, we use latest
	const { major, minor } = parseSemver(version);
	if (major === 8 && !getAvailableSdkVersions().includes(version)) {
		const latestVersion = getLatestSdkVersion();
		console.warn(`Unsupported SDK version: ${version}. Using ${latestVersion} version instead.`);
		return latestVersion;
	}

	if (major === 7 && (minor || 0) < 99) {
		console.error(`Unsupported SDK version: ${version}. Please use a version >= 7.99.0`);
		return undefined;
	}

	return version;
}
