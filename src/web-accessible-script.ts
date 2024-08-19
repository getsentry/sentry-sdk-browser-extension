import { getLegacyHub } from './web-accessible-script/getLegacyHub';
import { getV8Client } from './web-accessible-script/getV8Client';

const hubClient = getLegacyHub();
const v8Client = getV8Client();

const client = v8Client || hubClient;

const sdkMetadata = client?.getSdkMetadata();
const options = client?.getOptions();

window.postMessage(
	{
		from: 'sentry/web-accessible-script.js',
		json: JSON.stringify({
			type: 'CLIENT',
			sdkMetadata,
			options,
		}),
	},
	'*',
);
