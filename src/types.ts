import { Options, SdkMetadata } from "@sentry/types";

export interface MessageFromBackground {
    fromBackground: true;
}

export interface ClientMessage {
    type: 'CLIENT';
    sdkMetadata: SdkMetadata;
    options: Options;
} 

export interface RequestUpdatesMessage {
    type: 'REQUEST_UPDATES';
}

export type MessageData = ClientMessage | RequestUpdatesMessage;