export function injectCDNScriptTag(sdkBundleUrl: string, onSentryCDNScriptLoaded: () => void) {
	if (document.querySelector(`script[src="${sdkBundleUrl}"]`)) {
		return;
	}

	const firstScriptTagInDom = document.scripts[0];
	const cdnScriptTag = document.createElement('script') as HTMLScriptElement;
	cdnScriptTag.src = sdkBundleUrl;
	cdnScriptTag.crossOrigin = 'anonymous';

	// Once our SDK is loaded
	cdnScriptTag.addEventListener('load', onSentryCDNScriptLoaded, {
		once: true,
		passive: true,
	});
	firstScriptTagInDom.parentNode!.insertBefore(cdnScriptTag, firstScriptTagInDom);
}
