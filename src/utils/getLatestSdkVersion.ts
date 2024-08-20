export async function getLatestSdkVersion(sdkName = 'sentry.javascript.browser') {
	const res = await fetch('https://release-registry.services.sentry.io/sdks');
	const json: Record<string, { version: string } | undefined> = await res.json();

	const jsSdk = json[sdkName];
	return jsSdk?.version;
}
