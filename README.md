# Sentry SDK Browser Extension

**This is hackweek project. It is experimental as of now!**

This browser extension for Chrome allows you to debug the Sentry Browser SDK (as well as derivate SDKs like `@sentry/react`).

It allows you to:

- See what SDK & version is installed.
- See the SDK config that was used.
- Inject the SDK, if Sentry is not yet installed.
- See Replay config that was used, as well as the data of the currently running Replay.
- Inject the Replay SDK if it is not yet installed.
- Update the config of the SDK.
- Use Spotlight directly in the browser to see events and traces sent to Sentry.
