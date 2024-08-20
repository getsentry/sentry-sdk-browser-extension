import { SdkMetadata } from '@sentry/types';
import { BrowserOptions } from '@sentry/browser';

export interface ClientMessage {
	type: 'CLIENT';
	sdkMetadata: SdkMetadata;
	options: BrowserOptions;
}

export type MessageData = ClientMessage;

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
