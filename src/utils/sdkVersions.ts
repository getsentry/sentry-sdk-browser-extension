import latestDownloadedVersionInfo from '../web-accessible-script/bundles/latestVersion.json';

export function getLatestSdkVersion() {
	return latestDownloadedVersionInfo.latestVersion;
}

export function getAvailableSdkVersions() {
	return latestDownloadedVersionInfo.versions;
}
