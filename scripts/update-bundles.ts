import { parseSemver } from '@sentry/utils';
import latestDownloadedVersionInfo from '../src/web-accessible-script/bundles/latestVersion.json';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

const BUNDLE_VARIANTS = ['bundle.tracing.replay.feedback.js', 'replay.js'];

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

	updateVersions(newLatestVersion, newerVersions);

	console.log(`Updated to latest version ${newLatestVersion}`);
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
	console.log(`Downloading version ${version}...`);
	for (const bundleFile of BUNDLE_VARIANTS) {
		try {
			await downloadBundleFile(version, bundleFile);
		} catch (error) {
			// Special case: Replay was not published before 8.27.0, so we use this instead for versions between...
			if (error instanceof FetchError && bundleFile === 'replay.js' && error.statusCode === 403) {
				console.warn(`replay.js not found for version ${version}, using 8.27.0 instead...`);
				await downloadBundleFile('8.27.0', 'replay.js', version);
			}
		}
	}
}

class FetchError extends Error {
	public statusCode: number;

	constructor(public response: Response) {
		super(`Failed to fetch: ${response.status} ${response.statusText}`);
		this.statusCode = response.status;
	}
}

async function downloadBundleFile(version: string, bundleFile: string, storeAsVersion = version) {
	const url = `https://browser.sentry-cdn.com/${version}/${bundleFile}`;

	const res = await fetch(url);

	if (!res.ok) {
		throw new FetchError(res);
	}

	let body = await res.text();

	if (storeAsVersion !== version) {
		body = body.replace(`const SDK_VERSION = '${version}';`, `const SDK_VERSION = '${storeAsVersion}';`);
	}

	mkdirSync(path.join(process.cwd(), `src/web-accessible-script/bundles/${storeAsVersion}`), { recursive: true });
	writeFileSync(path.join(process.cwd(), `src/web-accessible-script/bundles/${storeAsVersion}/${bundleFile}`), body, 'utf-8');
}

function updateVersions(latestVersion: string, newVersions: string[]) {
	const previousVersions = latestDownloadedVersionInfo.versions;

	writeFileSync(
		path.join(process.cwd(), 'src/web-accessible-script/bundles/latestVersion.json'),
		JSON.stringify({ latestVersion, versions: Array.from(new Set([...previousVersions, ...newVersions])) }),
		'utf-8',
	);
}
