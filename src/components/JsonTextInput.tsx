import { createSignal, Signal } from 'solid-js';

export function JsonTextInput(props: { signal: Signal<object | undefined>; inputName: string }) {
	const [isInvalid, setIsInvalid] = createSignal(false);

	return (
		<>
			{isInvalid() && <div class="error">Invalid JSON</div>}
			<textarea
				name={props.inputName}
				onInput={(e) => {
					const value = e.target.value;

					if (!value) {
						props.signal[1](undefined);
						setIsInvalid(false);
						return;
					}

					try {
						const json = JSON.parse(value);
						props.signal[1](json);
						setIsInvalid(false);
					} catch (error) {
						setIsInvalid(true);
					}
				}}
			>
				{JSON.stringify(props.signal[0](), null, 2)}
			</textarea>
		</>
	);
}
