import { parseSemver } from '@sentry/utils';
import latestDownloadedVersionInfo from '../src/web-accessible-script/bundles/latestVersion.json';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

(async function run() {
	const latestDownloadedVersion = latestDownloadedVersionInfo.latestVersion;

	const versions = JSON.parse(execSync('npm view @sentry/browser versions --json').toString());

	const { major, minor, patch } = parseSemver(latestDownloadedVersion);

	if (major == null || minor == null || patch == null) {
		throw new Error(`Could not parse latest downloaded version: ${latestDownloadedVersion}`);
	}

	const newerVersions = getNewerVersions(versions, { major, minor, patch });

	if (newerVersions.length === 0) {
		console.log('No new versions available, nothing to do.');
		return;
	}

	for (const version of newerVersions) {
		await downloadVersion(version);
	}

	const newLatestVersion = newerVersions.sort((a: string, b: string) => {
		const parsedA = parseSemver(a);
		const parsedB = parseSemver(b);

		if (parsedA.major !== parsedB.major) {
			return (parsedB.major || 0) - (parsedA.major || 0);
		}

		if (parsedA.minor !== parsedB.minor) {
			return (parsedB.minor || 0) - (parsedA.minor || 0);
		}

		return (parsedB.patch || 0) - (parsedA.patch || 0);
	})[0];

	updateLatestVersion(newLatestVersion);
})();

function getNewerVersions(versions: string[], { major, minor, patch }: { major: number; minor: number; patch: number }): string[] {
	return versions.filter((version: string) => {
		const parsedVersion = parseSemver(version);

		if (parsedVersion.major == null || parsedVersion.minor == null || parsedVersion.patch == null || parsedVersion.prerelease) {
			return false;
		}

		if (parsedVersion.major > major) {
			return true;
		}

		if (parsedVersion.major === major && parsedVersion.minor > minor) {
			return true;
		}

		if (parsedVersion.major === major && parsedVersion.minor === minor && parsedVersion.patch > patch) {
			return true;
		}

		return false;
	});
}

async function downloadVersion(version: string) {
	const url = `https://browser.sentry-cdn.com/${version}/bundle.tracing.replay.feedback.js`;

	const res = await fetch(url);
	const body = await res.text();

	mkdirSync(path.join(process.cwd(), `src/web-accessible-script/bundles/${version}`), { recursive: true });
	writeFileSync(path.join(process.cwd(), `src/web-accessible-script/bundles/${version}/bundle.tracing.replay.feedback.js`), body, 'utf-8');
}

function updateLatestVersion(latestVersion: string) {
	writeFileSync(
		path.join(process.cwd(), 'src/web-accessible-script/bundles/latestVersion.json'),
		JSON.stringify({ latestVersion }),
		'utf-8',
	);
}
