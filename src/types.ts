import type { SdkMetadata } from '@sentry/core';
import type { BrowserOptions, replayIntegration } from '@sentry/browser';

export interface ClientMessage {
	type: 'CLIENT';
	sdkMetadata: SdkMetadata;
	options: BrowserOptions;
	replay: ReplayData | undefined;
	isEnabled: boolean;
}

export interface InjectSdkMessage {
	type: 'INJECT_SDK';
	version: string;
	dsn: string;
	debug?: boolean;
	enableReplay?: boolean;
	enableTracing?: boolean;
	enableFeedback?: boolean;
	options?: BrowserOptions;
}

export interface UpdateSdkConfigMessage {
	type: 'UPDATE_SDK_CONFIG';
	dsn?: string;
	options?: BrowserOptions;
}

export interface InjectReplayMessage {
	type: 'INJECT_REPLAY';
	version: string;
	replaysSessionSampleRate?: number;
	replaysOnErrorSampleRate?: number;
	replayOptions?: Parameters<typeof replayIntegration>[0];
}

export interface EnvelopeMessage {
	type: 'ENVELOPE';
	envelope: string;
}

export interface ReplayData {
	replayId: string | undefined;
	isEnabled: boolean;
	isPaused: boolean;
	recordingMode: string | undefined;
	session: Record<string, unknown> | undefined;
	options: Record<string, unknown> | undefined;
}

export type MessageData = ClientMessage | InjectSdkMessage | InjectReplayMessage | UpdateSdkConfigMessage | EnvelopeMessage;
