import browser from 'webextension-polyfill';
import { UpdateSdkConfigMessage } from '../types';
import { createSignal } from 'solid-js';
import { BrowserOptions } from '@sentry/browser';
import { JsonTextInput } from './JsonTextInput';

export function UpdateConfig(props: { options: BrowserOptions }) {
	const [dsn, setDsn] = createSignal(props.options.dsn);
	const [additionalOptions, setAdditionalOptions] = createSignal<BrowserOptions | undefined>(undefined);

	const submitForm = (event: Event) => {
		event.preventDefault();

		const data: UpdateSdkConfigMessage = {
			type: 'UPDATE_SDK_CONFIG',
			dsn: dsn() || undefined,
			options: additionalOptions(),
		};

		updateConfig(data);
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
						setDsn(value);
					}}
					required={true}
				/>
			</div>

			<div class="form-item">
				<label for="additionalOptions">Other Options (JSON)</label>
				<JsonTextInput signal={[additionalOptions, setAdditionalOptions]} inputName="additionalOptions" />
			</div>

			<div class="form-item">
				<button type="submit">Update Sentry SDK Config</button>
			</div>
		</form>
	);
}

function updateConfig(data: UpdateSdkConfigMessage) {
	const tabId = browser.devtools.inspectedWindow.tabId;

	browser.tabs.sendMessage(tabId, {
		from: 'sentry/devtools',
		json: data,
	});
}
