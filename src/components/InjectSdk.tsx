import browser from 'webextension-polyfill';
import { InjectSdkMessage } from '../types';
import { createSignal } from 'solid-js';

export function InjectSdk(props: { latestSdkVersion: string }) {
	const [dsn, setDsn] = createSignal('');
	const [debug, setDebug] = createSignal(true);
	const [enableFeedback, setEnableFeedback] = createSignal(true);
	const [enableReplay, setEnableReplay] = createSignal(true);
	const [enableTracing, setEnableTracing] = createSignal(true);

	const storedDsn = window.localStorage.getItem('dsn');
	const storedDebug = window.localStorage.getItem('debug');
	const storedEnableFeedback = window.localStorage.getItem('enableFeedback');
	const storedEnableReplay = window.localStorage.getItem('enableReplay');
	const storedEnableTracing = window.localStorage.getItem('enableTracing');

	if (storedDsn) {
		setDsn(storedDsn);
	}

	if (storedDebug) {
		setDebug(JSON.parse(storedDebug));
	}
	if (storedEnableTracing) {
		setEnableTracing(JSON.parse(storedEnableTracing));
	}
	if (storedEnableFeedback) {
		setEnableFeedback(JSON.parse(storedEnableFeedback));
	}
	if (storedEnableReplay) {
		setEnableReplay(JSON.parse(storedEnableReplay));
	}

	const submitForm = (event: Event) => {
		event.preventDefault();

		const data: InjectSdkMessage = {
			type: 'INJECT_SDK',
			version: props.latestSdkVersion,
			dsn: dsn(),
			debug: debug(),
			enableFeedback: enableFeedback(),
			enableReplay: enableReplay(),
			enableTracing: enableTracing(),
		};

		injectSentrySdk(data);
	};

	return (
		<form onSubmit={submitForm}>
			<div class="form-item">
				<label for="dsn">DSN</label>
				<input
					type="text"
					name="dsn"
					value={dsn()}
					placeholder="https://xxx@yyy.ingest.us.sentry.io/zzz"
					onInput={(e) => {
						const value = e.target.value;
						window.localStorage.setItem('dsn', value);
						setDsn(value);
					}}
					required={true}
				/>
			</div>

			<div class="form-item">
				<input
					type="checkbox"
					id="debug"
					checked={debug()}
					onInput={(e) => {
						const value = e.target.checked;
						setDebug(value);
						window.localStorage.setItem('debug', JSON.stringify(value));
					}}
				/>
				<label for="debug">Debug</label>
			</div>

			<div class="form-item">
				<input
					type="checkbox"
					id="enable-tracing"
					checked={enableTracing()}
					onInput={(e) => {
						const value = e.target.checked;
						setEnableTracing(value);
						window.localStorage.setItem('enableTracing', JSON.stringify(value));
					}}
				/>
				<label for="enable-tracing">Enable Tracing</label>
			</div>

			<div class="form-item">
				<input
					type="checkbox"
					id="enable-replay"
					checked={enableReplay()}
					onInput={(e) => {
						const value = e.target.checked;
						setEnableReplay(value);
						window.localStorage.setItem('enableReplay', JSON.stringify(value));
					}}
				/>
				<label for="enable-replay">Enable Replay</label>
			</div>

			<div class="form-item">
				<input
					type="checkbox"
					id="enable-feedback"
					checked={enableFeedback()}
					onInput={(e) => {
						const value = e.target.checked;
						setEnableFeedback(value);
						window.localStorage.setItem('enableFeedback', JSON.stringify(value));
					}}
				/>
				<label for="enable-feedback">Enable Feedback</label>
			</div>

			<div class="form-item">
				<button type="submit">Inject Sentry SDK</button>
			</div>
		</form>
	);
}

function injectSentrySdk(data: InjectSdkMessage) {
	const tabId = browser.devtools.inspectedWindow.tabId;

	browser.tabs.sendMessage(tabId, {
		from: 'sentry/devtools',
		json: data,
	});
}
