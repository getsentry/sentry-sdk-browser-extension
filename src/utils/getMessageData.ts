import { ClientMessage, EnvelopeMessage, InjectReplayMessage, InjectSdkMessage, MessageData, UpdateSdkConfigMessage } from '../types';

export function getMessageData(message: unknown): MessageData | undefined {
	if (!message) {
		return undefined;
	}

	if (typeof message === 'object') {
		return parseMessageJson((message as Record<string, unknown>).json);
	}

	if (typeof message !== 'string') {
		return undefined;
	}

	try {
		const data = JSON.parse(message);
		const json = data.json;

		if (!json) {
			return undefined;
		}

		return getParsedMessageData(data);
	} catch {
		return undefined;
	}

	return undefined;
}

export function isClientMessage(message: any): message is ClientMessage {
	return message && message.type === 'CLIENT';
}

export function isInjectSdkMessage(message: any): message is InjectSdkMessage {
	return message && message.type === 'INJECT_SDK';
}

export function isInjectReplayMessage(message: any): message is InjectReplayMessage {
	return message && message.type === 'INJECT_REPLAY';
}

export function isUpdateConfigMessage(message: any): message is UpdateSdkConfigMessage {
	return message && message.type === 'UPDATE_SDK_CONFIG';
}

export function isEnvelopeMessage(message: any): message is EnvelopeMessage {
	return message && message.type === 'ENVELOPE';
}

function parseMessageJson(json: unknown): MessageData | undefined {
	if (!json) {
		return undefined;
	}

	if (typeof json === 'string') {
		try {
			const data = JSON.parse(json);
			return getParsedMessageData(data);
		} catch {}

		return undefined;
	}

	if (typeof json === 'object') {
		return getParsedMessageData(json as Record<string, unknown>);
	}

	return undefined;
}

function getParsedMessageData(data: Record<string, unknown>): MessageData | undefined {
	if (
		isClientMessage(data) ||
		isInjectReplayMessage(data) ||
		isInjectSdkMessage(data) ||
		isUpdateConfigMessage(data) ||
		isEnvelopeMessage(data)
	) {
		return data;
	}

	return undefined;
}
