import { Client } from "@sentry/types"

interface WindowWithVersionedCarrier extends Window {
    __SENTRY__?: {
        version?: string;
    } & Record<Exclude<string, 'version'>, {
        defaultCurrentScope?: {
            getClient(): Client;
        }
    }>;
}

export function getV8Client(): Client | undefined {
    const currentVersion = (window as WindowWithVersionedCarrier).__SENTRY__?.version;

    if(!currentVersion) {
        return undefined;
    }

    const carrier = (window as WindowWithVersionedCarrier).__SENTRY__?.[currentVersion];

    if(!carrier) {
        return undefined;
    }

    const client = carrier.defaultCurrentScope?.getClient();

    return client;
}