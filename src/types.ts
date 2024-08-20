import { Options, SdkMetadata } from '@sentry/types';

export interface ClientMessage {
	type: 'CLIENT';
	sdkMetadata: SdkMetadata;
	options: Options;
}

export type MessageData = ClientMessage;
