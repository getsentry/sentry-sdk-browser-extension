/*! @sentry/replay 11.15.0 (2d1c4f1) | https://github.com/getsentry/sentry-javascript */
(function(__window) {
	var exports = {};
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// ../../node_modules/.pnpm/@sentry+conventions@0.33.0/node_modules/@sentry/conventions/dist/attributes.mjs
	const yb = "sentry.op";
	const _b = "sentry.origin";
	const Ob = "sentry.replay_id";
	const qb = "sentry.segment.name.source";
	// ../core/build/esm/utils/worldwide.js
	/** Get's the global object for the current JavaScript runtime */
	const GLOBAL_OBJ = globalThis;
	// ../core/build/esm/utils/version.js
	const SDK_VERSION = "11.15.0";
	// ../core/build/esm/carrier.js
	/**
	* Returns the global shim registry.
	*
	* FIXME: This function is problematic, because despite always returning a valid Carrier,
	* it has an optional `__SENTRY__` property, which then in turn requires us to always perform an unnecessary check
	* at the call-site. We always access the carrier through this function, so we can guarantee that `__SENTRY__` is there.
	**/
	function getMainCarrier() {
		getSentryCarrier(GLOBAL_OBJ);
		return GLOBAL_OBJ;
	}
	/** Will either get the existing sentry carrier, or create a new one. */
	function getSentryCarrier(carrier) {
		const __SENTRY__ = carrier.__SENTRY__ = carrier.__SENTRY__ || {};
		__SENTRY__.version = __SENTRY__.version || "11.15.0";
		return __SENTRY__[SDK_VERSION] = __SENTRY__["11.15.0"] || {};
	}
	/**
	* Returns a global singleton contained in the global `__SENTRY__[]` object.
	*
	* If the singleton doesn't already exist in `__SENTRY__`, it will be created using the given factory
	* function and added to the `__SENTRY__` object.
	*
	* @param name name of the global singleton on __SENTRY__
	* @param creator creator Factory function to create the singleton if it doesn't already exist on `__SENTRY__`
	* @param obj (Optional) The global object on which to look for `__SENTRY__`, if not `GLOBAL_OBJ`'s return value
	* @returns the singleton
	*/
	function getGlobalSingleton(name, creator, obj = GLOBAL_OBJ) {
		const __SENTRY__ = obj.__SENTRY__ = obj.__SENTRY__ || {};
		const carrier = __SENTRY__[SDK_VERSION] = __SENTRY__["11.15.0"] || {};
		return carrier[name] || (carrier[name] = creator());
	}
	// ../core/build/esm/utils/debug-logger.js
	/** Prefix for logging strings */
	const PREFIX$1 = "Sentry Logger ";
	/** This may be mutated by the console instrumentation. */
	const originalConsoleMethods = {};
	/**
	* Temporarily disable sentry console instrumentations.
	*
	* @param callback The function to run against the original `console` messages
	* @returns The results of the callback
	*/
	function consoleSandbox(callback) {
		if (!("console" in GLOBAL_OBJ)) return callback();
		const console = GLOBAL_OBJ.console;
		const wrappedFuncs = {};
		const wrappedLevels = Object.keys(originalConsoleMethods);
		wrappedLevels.forEach((level) => {
			const originalConsoleMethod = originalConsoleMethods[level];
			wrappedFuncs[level] = console[level];
			console[level] = originalConsoleMethod;
		});
		try {
			return callback();
		} finally {
			wrappedLevels.forEach((level) => {
				console[level] = wrappedFuncs[level];
			});
		}
	}
	function enable() {
		_getLoggerSettings().enabled = true;
	}
	function disable() {
		_getLoggerSettings().enabled = false;
	}
	function isEnabled() {
		return _getLoggerSettings().enabled;
	}
	function log(...args) {
		_maybeLog("log", ...args);
	}
	function warn(...args) {
		_maybeLog("warn", ...args);
	}
	function error(...args) {
		_maybeLog("error", ...args);
	}
	function _maybeLog(level, ...args) {
		if (isEnabled()) consoleSandbox(() => {
			GLOBAL_OBJ.console[level](`${PREFIX$1}[${level}]:`, ...args);
		});
	}
	function _getLoggerSettings() {
		return getGlobalSingleton("loggerSettings", () => ({ enabled: false }));
	}
	/**
	* This is a logger singleton which either logs things or no-ops if logging is not enabled.
	*/
	const debug$1 = {
		/** Enable logging. */
		enable,
		/** Disable logging. */
		disable,
		/** Check if logging is enabled. */
		isEnabled,
		/** Log a message. */
		log,
		/** Log a warning. */
		warn,
		/** Log an error. */
		error
	};
	// ../core/build/esm/utils/stacktrace.js
	const defaultFunctionName = "<anonymous>";
	/**
	* Safely extract function name from itself
	*/
	function getFunctionName(fn) {
		try {
			if (!fn || typeof fn !== "function") return defaultFunctionName;
			return fn.name || defaultFunctionName;
		} catch {
			return defaultFunctionName;
		}
	}
	// ../core/build/esm/instrument/handlers.js
	const handlers$2 = {};
	const instrumented$1 = {};
	/** Add a handler function. Returns a function to remove the handler. */
	function addHandler$1(type, handler) {
		handlers$2[type] = handlers$2[type] || [];
		handlers$2[type].push(handler);
		return () => {
			const typeHandlers = handlers$2[type];
			if (typeHandlers) {
				const index = typeHandlers.indexOf(handler);
				if (index !== -1) typeHandlers.splice(index, 1);
			}
		};
	}
	/** Maybe run an instrumentation function, unless it was already called. */
	function maybeInstrument(type, instrumentFn) {
		if (!instrumented$1[type]) {
			instrumented$1[type] = true;
			try {
				instrumentFn();
			} catch (e) {
				debug$1.error(`Error while instrumenting ${type}`, e);
			}
		}
	}
	/** Trigger handlers for a given instrumentation type. */
	function triggerHandlers$1(type, data) {
		const typeHandlers = type && handlers$2[type];
		if (!typeHandlers) return;
		for (const handler of typeHandlers) try {
			handler(data);
		} catch (e) {
			debug$1.error(`Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`, e);
		}
	}
	// ../core/build/esm/utils/is.js
	const objectToString = Object.prototype.toString;
	/**
	* Checks whether given value's type is one of a few Error or Error-like
	* {@link isError}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isError(wat) {
		switch (objectToString.call(wat)) {
			case "[object Error]":
			case "[object Exception]":
			case "[object DOMException]":
			case "[object WebAssembly.Exception]": return true;
			default: return isInstanceOf(wat, Error);
		}
	}
	/**
	* Checks whether given value is an instance of the given built-in class.
	*
	* @param wat The value to be checked
	* @param className
	* @returns A boolean representing the result.
	*/
	function isBuiltin(wat, className) {
		return objectToString.call(wat) === `[object ${className}]`;
	}
	/**
	* Checks whether given value's type is a string
	* {@link isString}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isString(wat) {
		return isBuiltin(wat, "String");
	}
	/**
	* Checks whether given string is parameterized
	* {@link isParameterizedString}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isParameterizedString(wat) {
		return typeof wat === "object" && wat !== null && "__sentry_template_string__" in wat && "__sentry_template_values__" in wat;
	}
	/**
	* Checks whether given value is a primitive (undefined, null, number, boolean, string, bigint, symbol)
	* {@link isPrimitive}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isPrimitive(wat) {
		return wat === null || isParameterizedString(wat) || typeof wat !== "object" && typeof wat !== "function";
	}
	/**
	* Checks whether given value's type is an object literal, or a class instance.
	* {@link isPlainObject}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isPlainObject(wat) {
		return isBuiltin(wat, "Object");
	}
	/**
	* Checks whether given value is a non-null object (i.e. `typeof` is `'object'` and it is not `null`).
	* Unlike {@link isPlainObject}, this also accepts arrays and class instances - it only rules out
	* `null`, primitives, and functions.
	* {@link isObjectLike}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isObjectLike(wat) {
		return typeof wat === "object" && wat !== null;
	}
	/**
	* Checks whether given value's type is an Event instance
	* {@link isEvent}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isEvent(wat) {
		return typeof Event !== "undefined" && isInstanceOf(wat, Event);
	}
	/**
	* Checks whether given value's type is an regexp
	* {@link isRegExp}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isRegExp(wat) {
		return isBuiltin(wat, "RegExp");
	}
	/**
	* Checks whether given value has a then function.
	* @param wat A value to be checked.
	*/
	function isThenable(wat) {
		return Boolean(wat?.then && typeof wat.then === "function");
	}
	function isInstanceOf(wat, base) {
		try {
			return wat instanceof base;
		} catch {
			return false;
		}
	}
	// ../core/build/esm/utils/object.js
	/**
	* Replace a method in an object with a wrapped version of itself.
	*
	* If the method on the passed object is not a function, the wrapper will not be applied.
	*
	* @param source An object that contains a method to be wrapped.
	* @param name The name of the method to be wrapped.
	* @param replacementFactory A higher-order function that takes the original version of the given method and returns a
	* wrapped version. Note: The function returned by `replacementFactory` needs to be a non-arrow function, in order to
	* preserve the correct value of `this`, and the original method must be called using `origMethod.call(this, <other
	* args>)` or `origMethod.apply(this, [<other args>])` (rather than being called directly), again to preserve `this`.
	* @returns void
	*/
	function fill(source, name, replacementFactory) {
		if (!(name in source)) return;
		const original = source[name];
		if (typeof original !== "function") return;
		const wrapped = replacementFactory(original);
		if (typeof wrapped === "function") markFunctionWrapped(wrapped, original);
		try {
			source[name] = wrapped;
		} catch {
			debug$1.log(`Failed to replace method "${String(name)}" in object`, source);
		}
	}
	/**
	* Defines a non-enumerable property on the given object.
	*
	* @param obj The object on which to set the property
	* @param name The name of the property to be set
	* @param value The value to which to set the property
	*/
	function addNonEnumerableProperty(obj, name, value) {
		try {
			Object.defineProperty(obj, name, {
				value,
				writable: true,
				configurable: true
			});
		} catch {
			debug$1.log(`Failed to add non-enumerable property "${String(name)}" to object`, obj);
		}
	}
	/**
	* Remembers the original function on the wrapped function and
	* patches up the prototype.
	*
	* @param wrapped the wrapper function
	* @param original the original function that gets wrapped
	*/
	function markFunctionWrapped(wrapped, original) {
		try {
			wrapped.prototype = original.prototype = original.prototype || {};
			addNonEnumerableProperty(wrapped, "__sentry_original__", original);
		} catch {}
	}
	/**
	* Transforms any `Error` or `Event` into a plain object with all of their enumerable properties, and some of their
	* non-enumerable properties attached.
	*
	* @param value Initial source that we have to transform in order for it to be usable by the serializer
	* @returns An Event or Error turned into an object - or the value argument itself, when value is neither an Event nor
	*  an Error.
	*/
	function convertToPlainObject(value) {
		if (isError(value)) return {
			message: value.message,
			name: value.name,
			stack: value.stack,
			...getOwnProperties(value)
		};
		if (isEvent(value)) {
			const { type, target, currentTarget, detail } = value;
			return {
				type,
				target,
				currentTarget,
				...detail ? { detail } : {},
				...getOwnProperties(value)
			};
		}
		return value;
	}
	/** Filters out all but an object's own properties */
	function getOwnProperties(obj) {
		if (isObjectLike(obj)) return Object.fromEntries(Object.entries(obj));
		return {};
	}
	// ../core/build/esm/utils/randomSafeContext.js
	let RESOLVED_RUNNER;
	/**
	* Simple wrapper that allows SDKs to *secretly* set context wrapper to generate safe random IDs in cache components contexts
	*/
	function withRandomSafeContext(cb) {
		if (RESOLVED_RUNNER !== void 0) return RESOLVED_RUNNER ? RESOLVED_RUNNER(cb) : cb();
		const sym = Symbol.for("__SENTRY_SAFE_RANDOM_ID_WRAPPER__");
		const globalWithSymbol = GLOBAL_OBJ;
		if (sym in globalWithSymbol && typeof globalWithSymbol[sym] === "function") {
			RESOLVED_RUNNER = globalWithSymbol[sym];
			return RESOLVED_RUNNER(cb);
		}
		RESOLVED_RUNNER = null;
		return cb();
	}
	/**
	* Identical to Math.random() but wrapped in withRandomSafeContext
	* to ensure safe random number generation in certain contexts (e.g., Next.js Cache Components).
	*/
	function safeMathRandom() {
		return withRandomSafeContext(() => Math.random());
	}
	/**
	* Identical to Date.now() but wrapped in withRandomSafeContext
	* to ensure safe time value generation in certain contexts (e.g., Next.js Cache Components).
	*/
	function safeDateNow() {
		return withRandomSafeContext(() => Date.now());
	}
	// ../core/build/esm/utils/normalizationHints.js
	/**
	* Internal symbols for normalization behavior. JSON and other structured user payloads cannot
	* carry these keys, so they cannot spoof SDK-only normalization hints.
	* We use Symbol.for to ensure that the symbols are the same across different modules/files.
	*/
	const SENTRY_SKIP_NORMALIZATION = Symbol.for("sentry.skipNormalization");
	const SENTRY_OVERRIDE_NORMALIZATION_DEPTH = Symbol.for("sentry.overrideNormalizationDepth");
	/** @internal */
	function hasSkipNormalizationHint(value) {
		return Boolean(value[SENTRY_SKIP_NORMALIZATION]);
	}
	/** @internal */
	function getNormalizationDepthOverrideHint(value) {
		const v = value[SENTRY_OVERRIDE_NORMALIZATION_DEPTH];
		return typeof v === "number" ? v : void 0;
	}
	/**
	* Recursively normalizes the given object.
	*
	* - Creates a copy to prevent original input mutation
	* - Skips non-enumerable properties
	* - When stringifying, calls `toJSON` if implemented
	* - Removes circular references
	* - Translates non-serializable values (`undefined`/`NaN`/functions) to serializable format
	* - Translates known global objects/classes to a string representations
	* - Takes care of `Error` object serialization
	* - Optionally limits depth of final output
	* - Optionally limits number of properties/elements included in any single object/array
	*
	* @param input The object to be normalized.
	* @param depth The max depth to which to normalize the object. (Anything deeper stringified whole.)
	* @param maxProperties The max number of elements or properties to be included in any single array or
	* object in the normalized output.
	* @returns A normalized version of the object, or `"**non-serializable**"` if any errors are thrown during normalization.
	*/
	function normalize(input, depth = 100, maxProperties = 1e400) {
		try {
			return visit("", input, depth, maxProperties);
		} catch (err) {
			return { ERROR: `**non-serializable** (${stringifyCaughtValue(err)})` };
		}
	}
	/**
	* Stringify a caught value for an error message. Template literals and other implicit
	* conversions throw on symbols and on objects with no usable `toString`, which is how
	* the values that end up here tend to be broken in the first place, so fall back to
	* fixed text instead of throwing again.
	*/
	function stringifyCaughtValue(err) {
		try {
			return String(err);
		} catch {
			return "unknown error";
		}
	}
	/**
	* Visits a node to perform normalization on it
	*
	* @param key The key corresponding to the given node
	* @param value The node to be visited
	* @param depth Optional number indicating the maximum recursion depth
	* @param maxProperties Optional maximum number of properties/elements included in any single object/array
	* @param memo Optional Memo class handling decycling
	*/
	function visit(key, value, depth = 1e400, maxProperties = 1e400, memo = memoBuilder()) {
		const [memoize, unmemoize] = memo;
		if (value == null || ["boolean", "string"].includes(typeof value) || typeof value === "number" && Number.isFinite(value)) return value;
		const stringified = stringifyValue(key, value);
		if (!stringified.startsWith("[object ")) return stringified;
		if (hasSkipNormalizationHint(value)) return value;
		const overrideDepth = getNormalizationDepthOverrideHint(value);
		const remainingDepth = overrideDepth !== void 0 ? overrideDepth : depth;
		if (remainingDepth === 0) return stringified.replace("object ", "");
		if (memoize(value)) return "[Circular ~]";
		const valueWithToJSON = value;
		if (valueWithToJSON && typeof valueWithToJSON.toJSON === "function") try {
			return visit("", valueWithToJSON.toJSON(), remainingDepth - 1, maxProperties, memo);
		} catch {}
		const normalized = Array.isArray(value) ? [] : {};
		let numAdded = 0;
		const visitable = convertToPlainObject(value);
		for (const visitKey in visitable) {
			if (!Object.prototype.hasOwnProperty.call(visitable, visitKey)) continue;
			if (numAdded >= maxProperties) {
				normalized[visitKey] = "[MaxProperties ~]";
				break;
			}
			const visitValue = visitable[visitKey];
			normalized[visitKey] = visit(visitKey, visitValue, remainingDepth - 1, maxProperties, memo);
			numAdded++;
		}
		unmemoize(value);
		return normalized;
	}
	/**
	* Stringify the given value. Handles various known special values and types.
	*
	* Not meant to be used on simple primitives which already have a string representation, as it will, for example, turn
	* the number 1231 into "[Object Number]", nor on `null`, as it will throw.
	*
	* @param value The value to stringify
	* @returns A stringified representation of the given value
	*/
	function stringifyValue(key, value) {
		try {
			if (typeof global !== "undefined" && value === global) return "[Global]";
			if (typeof value === "number" && !Number.isFinite(value)) return `[${value}]`;
			if (typeof value === "function") return `[Function: ${getFunctionName(value)}]`;
			if (typeof value === "symbol") return `[${String(value)}]`;
			if (typeof value === "bigint") return `[BigInt: ${String(value)}]`;
			return `[object ${getConstructorName(value)}]`;
		} catch (err) {
			return `**non-serializable** (${stringifyCaughtValue(err)})`;
		}
	}
	function getConstructorName(value) {
		const prototype = Object.getPrototypeOf(value);
		return prototype?.constructor ? prototype.constructor.name : "null prototype";
	}
	/**
	* Helper to decycle json objects
	*/
	function memoBuilder() {
		const inner = /* @__PURE__ */ new WeakSet();
		function memoize(obj) {
			if (inner.has(obj)) return true;
			inner.add(obj);
			return false;
		}
		function unmemoize(obj) {
			inner.delete(obj);
		}
		return [memoize, unmemoize];
	}
	// ../core/build/esm/utils/string.js
	/**
	* Truncates given string to the maximum characters count
	*
	* @param str An object that contains serializable values
	* @param max Maximum number of characters in truncated string (0 = unlimited)
	* @returns string Encoded
	*/
	function truncate(str, max = 0) {
		if (typeof str !== "string" || max === 0) return str;
		return str.length <= max ? str : `${str.slice(0, max)}...`;
	}
	/**
	* Checks if the given value matches a regex or string
	*
	* @param value The string to test
	* @param pattern Either a regex or a string against which `value` will be matched
	* @param requireExactStringMatch If true, `value` must match `pattern` exactly. If false, `value` will match
	* `pattern` if it contains `pattern`. Only applies to string-type patterns.
	*/
	function isMatchingPattern(value, pattern, requireExactStringMatch = false) {
		if (!isString(value)) return false;
		if (isRegExp(pattern)) return pattern.test(value);
		if (isString(pattern)) return requireExactStringMatch ? value === pattern : value.includes(pattern);
		if (typeof pattern === "function") return pattern(value);
		return false;
	}
	/**
	* Test the given string against an array of strings and regexes. By default, string matching is done on a
	* substring-inclusion basis rather than a strict equality basis
	*
	* @param testString The string to test
	* @param patterns The patterns against which to test the string
	* @param requireExactStringMatch If true, `testString` must match one of the given string patterns exactly in order to
	* count. If false, `testString` will match a string pattern if it contains that pattern.
	* @returns
	*/
	function stringMatchesSomePattern(testString, patterns = [], requireExactStringMatch = false) {
		for (const pattern of patterns) if (isMatchingPattern(testString, pattern, requireExactStringMatch)) return true;
		return false;
	}
	// ../core/build/esm/utils/misc.js
	function getCrypto() {
		const gbl = GLOBAL_OBJ;
		return gbl.crypto || gbl.msCrypto;
	}
	let emptyUuid;
	function getRandomByte() {
		return safeMathRandom() * 16;
	}
	/**
	* UUID4 generator
	* @param crypto Object that provides the crypto API.
	* @returns string Generated UUID4.
	*/
	function uuid4(crypto = getCrypto()) {
		try {
			if (crypto?.randomUUID) return withRandomSafeContext(() => crypto.randomUUID()).replace(/-/g, "");
		} catch {}
		if (!emptyUuid) emptyUuid = "10000000100040008000100000000000";
		return emptyUuid.replace(/[018]/g, (c) => (c ^ (getRandomByte() & 15) >> c / 4).toString(16));
	}
	/**
	* Adds exception mechanism data to the originally captured (root) exception of a given event.
	*
	* @hidden
	*/
	function addExceptionMechanismToCapturedException(event, newMechanism) {
		const exceptions = event.exception?.values;
		const capturedException = exceptions?.find((exception) => exception.mechanism?.exception_id === 0) ?? exceptions?.[0];
		if (!capturedException) return;
		applyExceptionMechanism(capturedException, newMechanism);
	}
	function applyExceptionMechanism(exception, newMechanism) {
		const defaultMechanism = {
			type: "generic",
			handled: true
		};
		const currentMechanism = exception.mechanism;
		exception.mechanism = {
			...defaultMechanism,
			...currentMechanism,
			...newMechanism
		};
		if (newMechanism && "data" in newMechanism) exception.mechanism.data = {
			...currentMechanism?.data,
			...newMechanism.data
		};
	}
	// ../core/build/esm/utils/time.js
	const ONE_SECOND_IN_MS = 1e3;
	/**
	* If `performance.timeOrigin + performance.now()` and `Date.now()` differ by more than this, we correct the time origin.
	*/
	const CLOCK_DRIFT_THRESHOLD_MS = 1e3;
	/**
	* Max number of time origins we store. When we hit it, we drop the oldest one, except the page load origin, which
	* the pageload span uses.
	*/
	const MAX_TIME_ORIGIN_SEGMENTS = 100;
	/**
	* Returns a timestamp in seconds since the UNIX epoch using the Date API.
	*/
	function dateTimestampInSeconds() {
		return safeDateNow() / ONE_SECOND_IN_MS;
	}
	/**
	* All time origins of the page, oldest first. Empty until the first `timestampInSeconds` call, or if the Performance
	* API is unavailable.
	*/
	let _timeOriginSegments = [];
	/**
	* Returns a wrapper around the native Performance API browser implementation, or undefined for browsers that do not
	* support the API.
	*
	* Wrapping the native API works around differences in behavior from different browsers.
	*/
	function createUnixTimestampInSecondsFunc() {
		const { performance } = GLOBAL_OBJ;
		if (!performance?.now || !performance.timeOrigin) {
			if (performance?.now) _timeOriginSegments = [{
				from: 0,
				origin: safeDateNow() - withRandomSafeContext(() => performance.now())
			}];
			return dateTimestampInSeconds;
		}
		let correctedTimeOrigin = performance.timeOrigin;
		_timeOriginSegments = [{
			from: 0,
			origin: correctedTimeOrigin
		}];
		let isFirstCall = true;
		let lastCheckedPerformanceNow = 0;
		return () => {
			return withRandomSafeContext(() => {
				const performanceNow = performance.now();
				const dateNow = Date.now();
				if (Math.abs(correctedTimeOrigin + performanceNow - dateNow) > CLOCK_DRIFT_THRESHOLD_MS) {
					correctedTimeOrigin = dateNow - performanceNow;
					if (isFirstCall) _timeOriginSegments = [{
						from: 0,
						origin: correctedTimeOrigin
					}];
					else {
						_timeOriginSegments.push({
							from: lastCheckedPerformanceNow,
							origin: correctedTimeOrigin
						});
						if (_timeOriginSegments.length > MAX_TIME_ORIGIN_SEGMENTS) _timeOriginSegments.splice(1, 1);
					}
				}
				isFirstCall = false;
				lastCheckedPerformanceNow = performanceNow;
				return (correctedTimeOrigin + performanceNow) / ONE_SECOND_IN_MS;
			});
		};
	}
	let _cachedTimestampInSecondsFn;
	let _checkedForDriftInThisTask = false;
	/**
	* Converts a `performance.now()` based, relative time in milliseconds (e.g. a `PerformanceEntry`'s `startTime`)
	* to a UNIX timestamp in seconds, matching {@link timestampInSeconds}.
	*
	* Corrects for clock drift via browserPerformanceTimeOrigin().
	*
	* Pass `entryStartTimeInMs` (also a `performance.now()` based time) to use the time origin that was valid at the entry's
	* start. Use it for all timings of one entry, so its duration stays correct.
	*
	* Returns `undefined` if the Performance API is unavailable.
	*/
	function performanceTimeToSeconds(monotonicTimeInMs, entryStartTimeInMs = monotonicTimeInMs) {
		const origin = browserPerformanceTimeOrigin(entryStartTimeInMs);
		return origin == null ? void 0 : (origin + monotonicTimeInMs) / ONE_SECOND_IN_MS;
	}
	/**
	* Returns a timestamp in seconds since the UNIX epoch using either the Performance or Date APIs, depending on the
	* availability of the Performance API.
	*
	* If the Performance API time and `Date.now()` differ by more than {@link CLOCK_DRIFT_THRESHOLD_MS} (e.g. after the
	* device slept), the time origin is corrected based on `Date.now()`.
	* See https://github.com/getsentry/sentry-javascript/issues/2590.
	*/
	function timestampInSeconds() {
		return (_cachedTimestampInSecondsFn ?? (_cachedTimestampInSecondsFn = createUnixTimestampInSecondsFunc()))();
	}
	/**
	* Returns the time origin in milliseconds that was valid at the given `performance.now()` time. Defaults to the page
	* load origin.
	*
	* Pass the time you want to convert, so entries that are reported late (e.g. INP on pagehide) are not shifted by a
	* drift that happened after they were recorded. Use the same time for all timings of one entry to keep its duration.
	*
	* Returns `undefined` if the Performance API is unavailable.
	*/
	function browserPerformanceTimeOrigin(monotonicTimeInMs = 0) {
		if (!_checkedForDriftInThisTask) {
			_checkedForDriftInThisTask = true;
			Promise.resolve().then(() => {
				_checkedForDriftInThisTask = false;
			});
			timestampInSeconds();
		}
		let segment;
		for (const candidate of _timeOriginSegments) {
			if (segment && candidate.from > monotonicTimeInMs) break;
			segment = candidate;
		}
		return segment?.origin;
	}
	// ../core/build/esm/session.js
	/**
	* Updates a session object with the properties passed in the context.
	*
	* Note that this function mutates the passed object and returns void.
	* (Had to do this instead of returning a new and updated session because closing and sending a session
	* makes an update to the session after it was passed to the sending logic.
	* @see Client.captureSession )
	*
	* @param session the `Session` to update
	* @param context the `SessionContext` holding the properties that should be updated in @param session
	*/
	function updateSession(session, context = {}) {
		if (context.user) {
			if (!session.ipAddress && context.user.ip_address) session.ipAddress = context.user.ip_address;
			if (!session.did && !context.did) session.did = context.user.id || context.user.email || context.user.username;
		}
		session.timestamp = context.timestamp || timestampInSeconds();
		if (context.abnormal_mechanism) session.abnormal_mechanism = context.abnormal_mechanism;
		if (context.ignoreDuration) session.ignoreDuration = context.ignoreDuration;
		if (context.sid) session.sid = context.sid.length === 32 ? context.sid : uuid4();
		if (context.init !== void 0) session.init = context.init;
		if (!session.did && context.did) session.did = `${context.did}`;
		if (typeof context.started === "number") session.started = context.started;
		if (session.ignoreDuration) session.duration = void 0;
		else if (typeof context.duration === "number") session.duration = context.duration;
		else {
			const duration = session.timestamp - session.started;
			session.duration = duration >= 0 ? duration : 0;
		}
		if (context.release) session.release = context.release;
		if (context.environment) session.environment = context.environment;
		if (!session.ipAddress && context.ipAddress) session.ipAddress = context.ipAddress;
		if (!session.userAgent && context.userAgent) session.userAgent = context.userAgent;
		if (typeof context.errors === "number") session.errors = context.errors;
		if (context.status) session.status = context.status;
	}
	// ../core/build/esm/utils/merge.js
	/**
	* Shallow merge two objects.
	* Does not mutate the passed in objects.
	* Undefined/empty values in the merge object will overwrite existing values.
	*
	* By default, this merges 2 levels deep.
	*/
	function merge(initialObj, mergeObj, levels = 2) {
		if (!mergeObj || typeof mergeObj !== "object" || levels <= 0) return mergeObj;
		if (initialObj && Object.keys(mergeObj).length === 0) return initialObj;
		const output = { ...initialObj };
		for (const key in mergeObj) if (Object.prototype.hasOwnProperty.call(mergeObj, key)) output[key] = merge(output[key], mergeObj[key], levels - 1);
		return output;
	}
	// ../core/build/esm/utils/propagationContext.js
	/**
	* Generate a random, valid trace ID.
	*/
	function generateTraceId() {
		return uuid4();
	}
	/**
	* Generate a random, valid span ID.
	*/
	function generateSpanId() {
		return uuid4().substring(16);
	}
	// ../core/build/esm/scope.js
	/**
	* Default value for maximum number of breadcrumbs added to an event.
	*/
	const DEFAULT_MAX_BREADCRUMBS = 100;
	/**
	* Holds additional event information.
	*/
	var Scope = class Scope {
		constructor() {
			this._notifyingListeners = false;
			this._scopeListeners = [];
			this._eventProcessors = [];
			this._breadcrumbs = [];
			this._attachments = [];
			this._user = {};
			this._tags = {};
			this._attributes = {};
			this._extra = {};
			this._contexts = {};
			this._sdkProcessingMetadata = {};
			addNonEnumerableProperty(this, "refs", {});
			this._propagationContext = {
				traceId: generateTraceId(),
				sampleRand: safeMathRandom()
			};
		}
		/**
		* Clone all data from this scope into a new scope.
		*/
		clone() {
			const newScope = new Scope();
			newScope._breadcrumbs = [...this._breadcrumbs];
			newScope._tags = { ...this._tags };
			newScope._attributes = { ...this._attributes };
			newScope._extra = { ...this._extra };
			newScope._contexts = { ...this._contexts };
			if (this._contexts.flags) newScope._contexts.flags = { values: [...this._contexts.flags.values] };
			newScope._user = this._user;
			newScope._level = this._level;
			newScope._session = this._session;
			newScope._transactionName = this._transactionName;
			newScope._fingerprint = this._fingerprint;
			newScope._eventProcessors = [...this._eventProcessors];
			newScope._attachments = [...this._attachments];
			newScope._sdkProcessingMetadata = { ...this._sdkProcessingMetadata };
			newScope._propagationContext = { ...this._propagationContext };
			newScope._client = this._client;
			newScope._lastEventId = this._lastEventId;
			newScope._conversationId = this._conversationId;
			newScope.refs = { ...this.refs };
			return newScope;
		}
		/**
		* Update the client assigned to this scope.
		* Note that not every scope will have a client assigned - isolation scopes & the global scope will generally not have a client,
		* as well as manually created scopes.
		*/
		setClient(client) {
			this._client = client;
		}
		/**
		* Set the ID of the last captured error event.
		* This is generally only captured on the isolation scope.
		*/
		setLastEventId(lastEventId) {
			this._lastEventId = lastEventId;
		}
		/**
		* Get the client assigned to this scope.
		*/
		getClient() {
			return this._client;
		}
		/**
		* Get the ID of the last captured error event.
		* This is generally only available on the isolation scope.
		*/
		lastEventId() {
			return this._lastEventId;
		}
		/**
		* @inheritDoc
		*/
		addScopeListener(callback) {
			this._scopeListeners.push(callback);
		}
		/**
		* Add an event processor that will be called before an event is sent.
		*/
		addEventProcessor(callback) {
			this._eventProcessors.push(callback);
			return this;
		}
		/**
		* Set the user for this scope.
		* Set to `null` to unset the user.
		*/
		setUser(user) {
			this._user = user || {
				email: void 0,
				id: void 0,
				ip_address: void 0,
				username: void 0
			};
			if (this._session) updateSession(this._session, { user });
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Get the user from this scope.
		*/
		getUser() {
			return this._user;
		}
		/**
		* Set the conversation ID for this scope.
		* Set to `null` to unset the conversation ID.
		*/
		setConversationId(conversationId) {
			this._conversationId = conversationId || void 0;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Set an object that will be merged into existing tags on the scope,
		* and will be sent as tags data with the event.
		*/
		setTags(tags) {
			this._tags = {
				...this._tags,
				...tags
			};
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Set a single tag that will be sent as tags data with the event.
		*/
		setTag(key, value) {
			return this.setTags({ [key]: value });
		}
		/**
		* Sets attributes onto the scope.
		*
		* These attributes are applied to logs, metrics and streamed spans.
		*
		* Supported attribute value types are `string`, `number`, `boolean`, `string[]`, `number[]` and `boolean[]`.
		*
		* @param newAttributes - The attributes to set on the scope, as key-value pairs.
		*
		* @example
		* ```typescript
		* scope.setAttributes({
		*   is_admin: true,
		*   payment_selection: 'credit_card',
		*   render_duration: 150,
		* });
		* ```
		*/
		setAttributes(newAttributes) {
			this._attributes = {
				...this._attributes,
				...newAttributes
			};
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Sets an attribute onto the scope.
		*
		* These attributes are applied to logs, metrics and streamed spans.
		*
		* Supported attribute value types are `string`, `number`, `boolean`, `string[]`, `number[]` and `boolean[]`.
		*
		* @param key - The attribute key.
		* @param value - The attribute value.
		*
		* @example
		* ```typescript
		* scope.setAttribute('is_admin', true);
		* scope.setAttribute('render_duration', 150);
		* ```
		*/
		setAttribute(key, value) {
			return this.setAttributes({ [key]: value });
		}
		/**
		* Removes the attribute with the given key from the scope.
		*
		* @param key - The attribute key.
		*
		* @example
		* ```typescript
		* scope.removeAttribute('is_admin');
		* ```
		*/
		removeAttribute(key) {
			if (key in this._attributes) {
				delete this._attributes[key];
				this._notifyScopeListeners();
			}
			return this;
		}
		/**
		* Set an object that will be merged into existing extra on the scope,
		* and will be sent as extra data with the event.
		*/
		setExtras(extras) {
			this._extra = {
				...this._extra,
				...extras
			};
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Set a single key:value extra entry that will be sent as extra data with the event.
		*/
		setExtra(key, extra) {
			this._extra = {
				...this._extra,
				[key]: extra
			};
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Sets the fingerprint on the scope to send with the events.
		* @param {string[]} fingerprint Fingerprint to group events in Sentry.
		*/
		setFingerprint(fingerprint) {
			this._fingerprint = fingerprint;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Sets the level on the scope for future events.
		*/
		setLevel(level) {
			this._level = level;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Sets the transaction name on the scope so that the name of e.g. taken server route or
		* the page location is attached to future events.
		*
		* IMPORTANT: Calling this function does NOT change the name of the currently active
		* root span. If you want to change the name of the active root span, use
		* `Sentry.updateSpanName(rootSpan, 'new name')` instead.
		*
		* By default, the SDK updates the scope's transaction name automatically on sensible
		* occasions, such as a page navigation or when handling a new request on the server.
		*/
		setTransactionName(name) {
			this._transactionName = name;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Sets context data with the given name.
		* Data passed as context will be normalized. You can also pass `null` to unset the context.
		* Note that context data will not be merged - calling `setContext` will overwrite an existing context with the same key.
		*/
		setContext(key, context) {
			if (context === null) delete this._contexts[key];
			else this._contexts[key] = context;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Set the session for the scope.
		*/
		setSession(session) {
			if (!session) delete this._session;
			else this._session = session;
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Get the session from the scope.
		*/
		getSession() {
			return this._session;
		}
		/**
		* Updates the scope with provided data. Can work in three variations:
		* - plain object containing updatable attributes
		* - Scope instance that'll extract the attributes from
		* - callback function that'll receive the current scope as an argument and allow for modifications
		*/
		update(captureContext) {
			if (!captureContext) return this;
			const scopeToMerge = typeof captureContext === "function" ? captureContext(this) : captureContext;
			const { tags, attributes, extra, user, contexts, level, fingerprint = [], propagationContext, conversationId } = (scopeToMerge instanceof Scope ? scopeToMerge.getScopeData() : isPlainObject(scopeToMerge) ? captureContext : void 0) || {};
			this._tags = {
				...this._tags,
				...tags
			};
			this._attributes = {
				...this._attributes,
				...attributes
			};
			this._extra = {
				...this._extra,
				...extra
			};
			this._contexts = {
				...this._contexts,
				...contexts
			};
			if (user && Object.keys(user).length) this._user = user;
			if (level) this._level = level;
			if (fingerprint.length) this._fingerprint = fingerprint;
			if (propagationContext) this._propagationContext = propagationContext;
			if (conversationId) this._conversationId = conversationId;
			return this;
		}
		/**
		* Adds a breadcrumb to the scope.
		* By default, the last 100 breadcrumbs are kept.
		*/
		addBreadcrumb(breadcrumb, maxBreadcrumbs) {
			const maxCrumbs = typeof maxBreadcrumbs === "number" ? maxBreadcrumbs : DEFAULT_MAX_BREADCRUMBS;
			if (maxCrumbs <= 0) return this;
			const mergedBreadcrumb = {
				timestamp: dateTimestampInSeconds(),
				...breadcrumb,
				message: breadcrumb.message ? truncate(breadcrumb.message, 2048) : breadcrumb.message
			};
			this._breadcrumbs.push(mergedBreadcrumb);
			if (this._breadcrumbs.length > maxCrumbs) this._breadcrumbs = this._breadcrumbs.slice(-maxCrumbs);
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Get the last breadcrumb of the scope.
		*/
		getLastBreadcrumb() {
			return this._breadcrumbs[this._breadcrumbs.length - 1];
		}
		/**
		* Clear all breadcrumbs from the scope.
		*/
		clearBreadcrumbs() {
			this._breadcrumbs = [];
			this._notifyScopeListeners();
			return this;
		}
		/**
		* Add an attachment to the scope.
		*/
		addAttachment(attachment) {
			this._attachments.push(attachment);
			return this;
		}
		/**
		* Clear all attachments from the scope.
		*/
		clearAttachments() {
			this._attachments = [];
			return this;
		}
		/**
		* Get the data of this scope, which should be applied to an event during processing.
		*/
		getScopeData() {
			return {
				breadcrumbs: this._breadcrumbs,
				attachments: this._attachments,
				contexts: this._contexts,
				tags: this._tags,
				attributes: this._attributes,
				extra: this._extra,
				user: this._user,
				level: this._level,
				fingerprint: this._fingerprint || [],
				eventProcessors: this._eventProcessors,
				propagationContext: this._propagationContext,
				sdkProcessingMetadata: this._sdkProcessingMetadata,
				transactionName: this._transactionName,
				conversationId: this._conversationId
			};
		}
		/**
		* Add data which will be accessible during event processing but won't get sent to Sentry.
		*/
		setSDKProcessingMetadata(newData) {
			this._sdkProcessingMetadata = merge(this._sdkProcessingMetadata, newData, 2);
			return this;
		}
		/**
		* Add propagation context to the scope, used for distributed tracing
		*/
		setPropagationContext(context) {
			this._propagationContext = context;
			return this;
		}
		/**
		* Get propagation context from the scope, used for distributed tracing
		*/
		getPropagationContext() {
			return this._propagationContext;
		}
		/**
		* Capture an exception for this scope.
		*
		* @returns {string} The id of the captured Sentry event.
		*/
		captureException(exception, hint) {
			const eventId = hint?.event_id || uuid4();
			if (!this._client) {
				debug$1.warn("No client configured on scope - will not capture exception!");
				return eventId;
			}
			const syntheticException = /* @__PURE__ */ new Error("Sentry syntheticException");
			this._client.captureException(exception, {
				originalException: exception,
				syntheticException,
				...hint,
				event_id: eventId
			}, this);
			return eventId;
		}
		/**
		* Capture a message for this scope.
		*
		* @returns {string} The id of the captured message.
		*/
		captureMessage(message, level, hint) {
			const eventId = hint?.event_id || uuid4();
			if (!this._client) {
				debug$1.warn("No client configured on scope - will not capture message!");
				return eventId;
			}
			const syntheticException = hint?.syntheticException ?? new Error(message);
			this._client.captureMessage(message, level, {
				originalException: message,
				syntheticException,
				...hint,
				event_id: eventId
			}, this);
			return eventId;
		}
		/**
		* Capture a Sentry event for this scope.
		*
		* @returns {string} The id of the captured event.
		*/
		captureEvent(event, hint) {
			const eventId = event.event_id || hint?.event_id || uuid4();
			if (!this._client) {
				debug$1.warn("No client configured on scope - will not capture event!");
				return eventId;
			}
			this._client.captureEvent(event, {
				...hint,
				event_id: eventId
			}, this);
			return eventId;
		}
		/**
		* This will be called on every set call.
		*/
		_notifyScopeListeners() {
			if (!this._notifyingListeners) {
				this._notifyingListeners = true;
				this._scopeListeners.forEach((callback) => {
					callback(this);
				});
				this._notifyingListeners = false;
			}
		}
	};
	// ../core/build/esm/defaultScopes.js
	/** Get the default current scope. */
	function getDefaultCurrentScope() {
		return getGlobalSingleton("defaultCurrentScope", () => new Scope());
	}
	/** Get the default isolation scope. */
	function getDefaultIsolationScope() {
		return getGlobalSingleton("defaultIsolationScope", () => new Scope());
	}
	// ../core/build/esm/tracing/constants.js
	const SUPPRESS_TRACING_KEY = "__SENTRY_SUPPRESS_TRACING__";
	// ../core/build/esm/utils/chain-and-copy-promiselike.js
	const isActualPromise = (p) => p instanceof Promise && !p[kChainedCopy];
	const kChainedCopy = Symbol("chained PromiseLike");
	/**
	* Copy the properties from a decorated promiselike object onto its chained
	* actual promise.
	*/
	const chainAndCopyPromiseLike = (original, onSuccess, onError) => {
		const chained = original.then((value) => {
			onSuccess(value);
			return value;
		}, (err) => {
			onError(err);
			throw err;
		});
		return isActualPromise(chained) && isActualPromise(original) ? chained : copyProps(original, chained);
	};
	const copyProps = (original, chained) => {
		if (!chained) return original;
		let mutated = false;
		for (const key in original) {
			if (key in chained) continue;
			mutated = true;
			const value = original[key];
			if (typeof value === "function") Object.defineProperty(chained, key, {
				value: (...args) => value.apply(original, args),
				enumerable: true,
				configurable: true,
				writable: true
			});
			else chained[key] = value;
		}
		if (mutated) Object.assign(chained, { [kChainedCopy]: true });
		return chained;
	};
	// ../core/build/esm/asyncContext/stackStrategy.js
	/**
	* This is an object that holds a stack of scopes.
	*/
	var AsyncContextStack = class {
		constructor(scope, isolationScope) {
			let assignedScope;
			if (!scope) assignedScope = new Scope();
			else assignedScope = scope;
			let assignedIsolationScope;
			if (!isolationScope) assignedIsolationScope = new Scope();
			else assignedIsolationScope = isolationScope;
			this._stack = [{ scope: assignedScope }];
			this._isolationScope = assignedIsolationScope;
		}
		/**
		* Fork a scope for the stack.
		*/
		withScope(callback) {
			const scope = this._pushScope();
			let maybePromiseResult;
			try {
				maybePromiseResult = callback(scope);
			} catch (e) {
				this._popScope();
				throw e;
			}
			if (isThenable(maybePromiseResult)) return chainAndCopyPromiseLike(maybePromiseResult, () => this._popScope(), () => this._popScope());
			this._popScope();
			return maybePromiseResult;
		}
		/**
		* Get the client of the stack.
		*/
		getClient() {
			return this.getStackTop().client;
		}
		/**
		* Returns the scope of the top stack.
		*/
		getScope() {
			return this.getStackTop().scope;
		}
		/**
		* Get the isolation scope for the stack.
		*/
		getIsolationScope() {
			return this._isolationScope;
		}
		/**
		* Returns the topmost scope layer in the order domain > local > process.
		*/
		getStackTop() {
			return this._stack[this._stack.length - 1];
		}
		/**
		* Push a scope to the stack.
		*/
		_pushScope() {
			const scope = this.getScope().clone();
			this._stack.push({
				client: this.getClient(),
				scope
			});
			return scope;
		}
		/**
		* Pop a scope from the stack.
		*/
		_popScope() {
			if (this._stack.length <= 1) return false;
			return !!this._stack.pop();
		}
	};
	/**
	* Get the global async context stack.
	* This will be removed during the v8 cycle and is only here to make migration easier.
	*/
	function getAsyncContextStack() {
		const sentry = getSentryCarrier(getMainCarrier());
		return sentry.stack = sentry.stack || new AsyncContextStack(getDefaultCurrentScope(), getDefaultIsolationScope());
	}
	function withScope(callback) {
		return getAsyncContextStack().withScope(callback);
	}
	function withSetScope(scope, callback) {
		const stack = getAsyncContextStack();
		return stack.withScope(() => {
			stack.getStackTop().scope = scope;
			return callback(scope);
		});
	}
	function withIsolationScope(callback) {
		return getAsyncContextStack().withScope(() => {
			return callback(getAsyncContextStack().getIsolationScope());
		});
	}
	/**
	* Get the stack-based async context strategy.
	*/
	function getStackAsyncContextStrategy() {
		return {
			suppressTracing: suppressTracingInStack,
			withIsolationScope,
			withScope,
			withSetScope,
			withSetIsolationScope: (_isolationScope, callback) => {
				return withIsolationScope(callback);
			},
			getCurrentScope: () => getAsyncContextStack().getScope(),
			getIsolationScope: () => getAsyncContextStack().getIsolationScope()
		};
	}
	/**
	* In stack-based ACS, we do not wait for the callback to finish before we reset the metadata
	* the reason for this is that otherwise, in the stack this can lead to very weird behavior
	* as there is only a single top scope, if the callback takes longer to finish,
	* other, unrelated spans may also be suppressed, which we do not want
	* so instead, we only suppress tracing synchronoysly in the stack.
	*/
	function suppressTracingInStack(callback) {
		return withScope((scope) => {
			scope.setSDKProcessingMetadata({ [SUPPRESS_TRACING_KEY]: true });
			const res = callback();
			scope.setSDKProcessingMetadata({ [SUPPRESS_TRACING_KEY]: void 0 });
			return res;
		});
	}
	// ../core/build/esm/asyncContext/index.js
	/**
	* Get the current async context strategy.
	* If none has been setup, the default will be used.
	*/
	function getAsyncContextStrategy(carrier) {
		const sentry = getSentryCarrier(carrier);
		if (sentry.acs) return sentry.acs;
		return getStackAsyncContextStrategy();
	}
	// ../core/build/esm/currentScopes.js
	/**
	* Get the external propagation context, if a provider has been registered.
	*/
	function getExternalPropagationContext() {
		return getSentryCarrier(getMainCarrier()).externalPropagationContextProvider?.();
	}
	/**
	* Get the currently active scope.
	*/
	function getCurrentScope() {
		return getAsyncContextStrategy(getMainCarrier()).getCurrentScope();
	}
	/**
	* Get the currently active isolation scope.
	* The isolation scope is active for the current execution context.
	*/
	function getIsolationScope() {
		return getAsyncContextStrategy(getMainCarrier()).getIsolationScope();
	}
	/**
	* Get the global scope.
	* This scope is applied to _all_ events.
	*/
	function getGlobalScope() {
		return getGlobalSingleton("globalScope", () => new Scope());
	}
	/**
	* Get the currently active client.
	*/
	function getClient() {
		return getCurrentScope().getClient();
	}
	/**
	* Get a trace context for the given scope.
	*/
	function getTraceContextFromScope(scope) {
		const externalContext = getExternalPropagationContext();
		if (externalContext) return {
			trace_id: externalContext.traceId,
			span_id: externalContext.spanId
		};
		const { traceId, parentSpanId, propagationSpanId } = scope.getPropagationContext();
		const traceContext = {
			trace_id: traceId,
			span_id: propagationSpanId || generateSpanId()
		};
		if (parentSpanId) traceContext.parent_span_id = parentSpanId;
		return traceContext;
	}
	// ../core/build/esm/types/spanStatus.js
	const SPAN_STATUS_TYPES = [
		"ok",
		"deadline_exceeded",
		"unauthenticated",
		"permission_denied",
		"not_found",
		"resource_exhausted",
		"invalid_argument",
		"unimplemented",
		"unavailable",
		"internal_error",
		"unknown_error",
		"cancelled",
		"already_exists",
		"failed_precondition",
		"aborted",
		"out_of_range",
		"data_loss"
	];
	// ../core/build/esm/tracing/spanstatus.js
	function isStatusErrorMessageValid(message) {
		return message !== "ok" && SPAN_STATUS_TYPES.includes(message);
	}
	// ../core/build/esm/utils/weakRef.js
	/**
	* Resolves a potentially weak reference, returning the underlying object
	* or undefined if the reference has been garbage collected.
	*
	* @param ref - A MaybeWeakRef or undefined
	* @returns The referenced object, or undefined if GC'd or ref was undefined
	*/
	function derefWeakRef(ref) {
		if (!ref) return;
		if (typeof ref === "object" && "deref" in ref && typeof ref.deref === "function") try {
			return ref.deref();
		} catch {
			return;
		}
		return ref;
	}
	// ../core/build/esm/tracing/utils.js
	const SCOPE_ON_START_SPAN_FIELD = "_sentryScope";
	const ISOLATION_SCOPE_ON_START_SPAN_FIELD = "_sentryIsolationScope";
	/**
	* Grabs the scope and isolation scope off a span that were active when the span was started.
	* If WeakRef was used and scopes have been garbage collected, returns undefined for those scopes.
	*/
	function getCapturedScopesOnSpan(span) {
		const spanWithScopes = span;
		return {
			scope: spanWithScopes[SCOPE_ON_START_SPAN_FIELD],
			isolationScope: derefWeakRef(spanWithScopes[ISOLATION_SCOPE_ON_START_SPAN_FIELD])
		};
	}
	// ../core/build/esm/utils/baggage.js
	/**
	* Takes a baggage header and turns it into Dynamic Sampling Context, by extracting all the "sentry-" prefixed values
	* from it.
	*
	* @param baggageHeader A very bread definition of a baggage header as it might appear in various frameworks.
	* @returns The Dynamic Sampling Context that was found on `baggageHeader`, if there was any, `undefined` otherwise.
	*/
	function baggageHeaderToDynamicSamplingContext(baggageHeader) {
		const baggageObject = parseBaggageHeader(baggageHeader);
		if (!baggageObject) return;
		const dynamicSamplingContext = Object.entries(baggageObject).reduce((acc, [key, value]) => {
			if (key.startsWith("sentry-")) {
				const nonPrefixedKey = key.slice(7);
				acc[nonPrefixedKey] = value;
			}
			return acc;
		}, {});
		if (Object.keys(dynamicSamplingContext).length > 0) return dynamicSamplingContext;
		else return;
	}
	/**
	* Take a baggage header and parse it into an object.
	*/
	function parseBaggageHeader(baggageHeader) {
		if (!baggageHeader || !isString(baggageHeader) && !Array.isArray(baggageHeader)) return;
		if (Array.isArray(baggageHeader)) return baggageHeader.reduce((acc, curr) => {
			const currBaggageObject = baggageHeaderToObject(curr);
			Object.entries(currBaggageObject).forEach(([key, value]) => {
				acc[key] = value;
			});
			return acc;
		}, {});
		return baggageHeaderToObject(baggageHeader);
	}
	/**
	* Will parse a baggage header, which is a simple key-value map, into a flat object.
	*
	* @param baggageHeader The baggage header to parse.
	* @returns a flat object containing all the key-value pairs from `baggageHeader`.
	*/
	function baggageHeaderToObject(baggageHeader) {
		return baggageHeader.split(",").map((baggageEntry) => {
			const eqIdx = baggageEntry.indexOf("=");
			if (eqIdx === -1) return [];
			return [baggageEntry.slice(0, eqIdx), baggageEntry.slice(eqIdx + 1)].map((keyOrValue) => {
				try {
					return decodeURIComponent(keyOrValue.trim());
				} catch {
					return;
				}
			});
		}).reduce((acc, [key, value]) => {
			if (key && value) acc[key] = value;
			return acc;
		}, {});
	}
	// ../core/build/esm/utils/dsn.js
	/** Regular expression used to extract org ID from a DSN host. */
	const ORG_ID_REGEX = /^o(\d+)\./;
	/**
	* Renders the string representation of this Dsn.
	*
	* By default, this will render the public representation without the password
	* component. To get the deprecated private representation, set `withPassword`
	* to true.
	*
	* @param withPassword When set to true, the password will be included.
	*/
	function dsnToString(dsn, withPassword = false) {
		const { host, path, pass, port, projectId, protocol, publicKey } = dsn;
		return `${protocol}://${publicKey}${withPassword && pass ? `:${pass}` : ""}@${host}${port ? `:${port}` : ""}/${path ? `${path}/` : path}${projectId}`;
	}
	/**
	* Extract the org ID from a DSN host.
	*
	* @param host The host from a DSN
	* @returns The org ID if found, undefined otherwise
	*/
	function extractOrgIdFromDsnHost(host) {
		return host.match(ORG_ID_REGEX)?.[1];
	}
	/**
	*  Returns the organization ID of the client.
	*
	*  The organization ID is extracted from the DSN. If the client options include a `orgId`, this will always take precedence.
	*/
	function extractOrgIdFromClient(client) {
		const options = client.getOptions();
		const { host } = client.getDsn() || {};
		let org_id;
		if (options.orgId) org_id = String(options.orgId);
		else if (host) org_id = extractOrgIdFromDsnHost(host);
		return org_id;
	}
	// ../core/build/esm/utils/parseSampleRate.js
	/**
	* Parse a sample rate from a given value.
	* This will either return a boolean or number sample rate, if the sample rate is valid (between 0 and 1).
	* If a string is passed, we try to convert it to a number.
	*
	* Any invalid sample rate will return `undefined`.
	*/
	function parseSampleRate(sampleRate) {
		if (typeof sampleRate === "boolean") return Number(sampleRate);
		const rate = typeof sampleRate === "string" ? parseFloat(sampleRate) : sampleRate;
		if (typeof rate !== "number" || isNaN(rate) || rate < 0 || rate > 1) return;
		return rate;
	}
	// ../core/build/esm/utils/spanOnScope.js
	const SCOPE_SPAN_FIELD = "span";
	/**
	* Get the active span for a given scope.
	* NOTE: This should NOT be used directly, but is only used internally by the trace methods.
	*/
	function _getSpanForScope(scope) {
		return derefWeakRef(scope.refs[SCOPE_SPAN_FIELD]);
	}
	// ../core/build/esm/utils/spanUtils.js
	/**
	* Convert a span to a trace context, which can be sent as the `trace` context in a non-transaction event.
	*/
	function spanToTraceContext(span) {
		const { spanId, traceId: trace_id, isRemote } = span.spanContext();
		const parent_span_id = isRemote ? spanId : spanToStaticSpanJSON(span).parent_span_id;
		const scope = getCapturedScopesOnSpan(span).scope;
		return {
			parent_span_id,
			span_id: isRemote ? scope?.getPropagationContext().propagationSpanId || generateSpanId() : spanId,
			trace_id
		};
	}
	/**
	*  Converts the span links array to a flattened version to be sent within an envelope.
	*
	*  If the links array is empty, it returns `undefined` so the empty value can be dropped before it's sent.
	*/
	function convertSpanLinksForEnvelope(links) {
		if (links && links.length > 0) return links.map(({ context: { spanId, traceId, traceFlags, ...restContext }, attributes }) => ({
			span_id: spanId,
			trace_id: traceId,
			sampled: traceFlags === 1,
			attributes,
			...restContext
		}));
		else return;
	}
	/**
	* Converts the span links array to a flattened version with serialized attributes for V2 spans.
	*
	* If the links array is empty, it returns `undefined` so the empty value can be dropped before it's sent.
	*/
	function getStreamedSpanLinks(links) {
		if (links?.length) return links.map(({ context: { spanId, traceId, traceFlags }, attributes }) => ({
			span_id: spanId,
			trace_id: traceId,
			sampled: traceFlags === 1,
			attributes
		}));
		else return;
	}
	/**
	* Convert a span time input into a timestamp in seconds.
	*/
	function spanTimeInputToSeconds(input) {
		if (typeof input === "number") return ensureTimestampInSeconds(input);
		if (Array.isArray(input)) return input[0] + input[1] / 1e9;
		if (input instanceof Date) return ensureTimestampInSeconds(input.getTime());
		return timestampInSeconds();
	}
	/**
	* Converts a timestamp to second, if it was in milliseconds, or keeps it as second.
	*/
	function ensureTimestampInSeconds(timestamp) {
		return timestamp > 9999999999 ? timestamp / 1e3 : timestamp;
	}
	/**
	* Convert a span to a static JSON representation.
	*/
	function spanToStaticSpanJSON(span) {
		if (spanIsSentrySpan(span)) return span.getStaticSpanJSON();
		const { spanId: span_id, traceId: trace_id } = span.spanContext();
		if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
			const { attributes, startTime, name, endTime, status, links } = span;
			return {
				span_id,
				trace_id,
				data: attributes,
				description: name,
				parent_span_id: getOtelParentSpanId(span),
				start_timestamp: spanTimeInputToSeconds(startTime),
				timestamp: spanTimeInputToSeconds(endTime) || void 0,
				status: getStatusMessage(status),
				op: attributes[yb],
				origin: attributes[_b],
				links: convertSpanLinksForEnvelope(links)
			};
		}
		return {
			span_id,
			trace_id,
			start_timestamp: 0,
			status: "ok",
			data: {}
		};
	}
	/**
	* Convert a span to a JSON representation.
	*/
	function spanToJSON(span) {
		if (spanIsSentrySpan(span)) return span.getSpanJSON();
		const { spanId: span_id, traceId: trace_id } = span.spanContext();
		if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
			const { attributes, startTime, name, endTime, status, links } = span;
			return {
				name,
				span_id,
				trace_id,
				parent_span_id: getOtelParentSpanId(span),
				start_timestamp: spanTimeInputToSeconds(startTime),
				end_timestamp: spanTimeInputToSeconds(endTime) || void 0,
				is_segment: spanIsSegment(span),
				status: getSimpleStatus(status),
				attributes: addStatusMessageAttribute(attributes, status),
				links: getStreamedSpanLinks(links)
			};
		}
		return {
			span_id,
			trace_id,
			start_timestamp: 0,
			name: "",
			status: "ok",
			is_segment: spanIsSegment(span),
			attributes: {}
		};
	}
	/**
	* In preparation for the next major of OpenTelemetry, we want to support
	* looking up the parent span id according to the new API
	* In OTel v1, the parent span id is accessed as `parentSpanId`
	* In OTel v2, the parent span id is accessed as `spanId` on the `parentSpanContext`
	*/
	function getOtelParentSpanId(span) {
		return "parentSpanId" in span ? span.parentSpanId : "parentSpanContext" in span ? span.parentSpanContext?.spanId : void 0;
	}
	function spanIsOpenTelemetrySdkTraceBaseSpan(span) {
		const castSpan = span;
		return !!castSpan.attributes && !!castSpan.startTime && !!castSpan.name && !!castSpan.endTime && !!castSpan.status;
	}
	/**
	* Sadly, due to circular dependency checks we cannot actually import the Span class here and check for instanceof.
	* :( So instead we approximate this by checking if it has the `getSpanJSON` method.
	*/
	function spanIsSentrySpan(span) {
		return typeof span.getSpanJSON === "function";
	}
	/**
	* Returns true if a span is sampled.
	* In most cases, you should just use `span.isRecording()` instead.
	* However, this has a slightly different semantic, as it also returns false if the span is finished.
	* So in the case where this distinction is important, use this method.
	*/
	function spanIsSampled(span) {
		const { traceFlags } = span.spanContext();
		return traceFlags === 1;
	}
	/** Get the status message to use for a JSON representation of a span. */
	function getStatusMessage(status) {
		if (!status || status.code === 0) return "ok";
		if (status.code === 1) return "ok";
		return status.message && isStatusErrorMessageValid(status.message) ? status.message : "internal_error";
	}
	/**
	* Convert the various statuses to the simple ones expected by Sentry for streamed spans ('ok' is default).
	*/
	function getSimpleStatus(status) {
		return !status || status.code === 1 || status.code === 0 || status.message === "cancelled" ? "ok" : "error";
	}
	/**
	* Returns the span's attributes with the SENTRY_STATUS_MESSAGE attribute added
	* if the span has an error status message worth preserving.
	*
	* An explicitly set attribute is never overwritten.
	*/
	function addStatusMessageAttribute(attributes, status) {
		const statusMessage = getSimpleStatus(status) === "error" ? status?.message : void 0;
		return {
			...statusMessage && { ["sentry.status.message"]: statusMessage },
			...attributes
		};
	}
	const ROOT_SPAN_FIELD = "_sentryRootSpan";
	/**
	* Returns the root span of a given span.
	*/
	const getRootSpan = INTERNAL_getSegmentSpan;
	/**
	* Returns the segment span of a given span.
	*/
	function INTERNAL_getSegmentSpan(span) {
		return span[ROOT_SPAN_FIELD] || span;
	}
	/**
	* Whether the given span is the segment span, i.e. it has no parent within its trace.
	*/
	function spanIsSegment(span) {
		return span === INTERNAL_getSegmentSpan(span);
	}
	/**
	* Returns the currently active span.
	*/
	function getActiveSpan(scope) {
		const acs = getAsyncContextStrategy(getMainCarrier());
		if (acs.getActiveSpan) return acs.getActiveSpan(scope);
		return _getSpanForScope(scope || getCurrentScope());
	}
	// ../core/build/esm/utils/hasSpansEnabled.js
	/**
	* Determines if span recording is currently enabled.
	*
	* Spans are recorded when at least one of `tracesSampleRate` and `tracesSampler`
	* is defined in the SDK config. This function does not make any assumption about
	* sampling decisions, it only checks if the SDK is configured to record spans.
	*
	* Important: This function only determines if span recording is enabled. Trace
	* continuation and propagation is separately controlled and not covered by this function.
	* If this function returns `false`, traces can still be propagated (which is what
	* we refer to by "Tracing without Performance")
	* @see https://develop.sentry.dev/sdk/telemetry/traces/tracing-without-performance/
	*
	* @param maybeOptions An SDK options object to be passed to this function.
	* If this option is not provided, the function will use the current client's options.
	*/
	function hasSpansEnabled(maybeOptions) {
		if (typeof __SENTRY_TRACING__ === "boolean" && !__SENTRY_TRACING__) return false;
		const options = maybeOptions || getClient()?.getOptions();
		return !!options && (options.tracesSampleRate != null || !!options.tracesSampler);
	}
	// ../core/build/esm/tracing/sentryNonRecordingSpan.js
	const NON_RECORDING_SPAN_FIELD = Symbol.for("sentry.nonRecordingSpan");
	/**
	* Whether the given span is a {@link SentryNonRecordingSpan}.
	*/
	function spanIsNonRecordingSpan(span) {
		return !!span && span[NON_RECORDING_SPAN_FIELD] === true;
	}
	// ../core/build/esm/tracing/dynamicSamplingContext.js
	/**
	* If you change this value, also update the terser plugin config to
	* avoid minification of the object property!
	*/
	const FROZEN_DSC_FIELD = "_frozenDsc";
	/**
	* Creates a dynamic sampling context from a client.
	*
	* Dispatches the `createDsc` lifecycle hook as a side effect.
	*/
	function getDynamicSamplingContextFromClient(trace_id, client) {
		const options = client.getOptions();
		const { publicKey: public_key } = client.getDsn() || {};
		const dsc = {
			environment: options.environment || "production",
			release: options.release,
			public_key,
			trace_id,
			org_id: extractOrgIdFromClient(client)
		};
		client.emit("createDsc", dsc);
		return dsc;
	}
	/**
	* Get the dynamic sampling context for the currently active scopes.
	*/
	function getDynamicSamplingContextFromScope(client, scope) {
		if (getExternalPropagationContext()) return;
		const propagationContext = scope.getPropagationContext();
		return propagationContext.dsc || getDynamicSamplingContextFromClient(propagationContext.traceId, client);
	}
	/**
	* Creates a dynamic sampling context from a span (and client and scope)
	*
	* @param span the span from which a few values like the root span name and sample rate are extracted.
	*
	* @returns a dynamic sampling context
	*/
	function getDynamicSamplingContextFromSpan(span) {
		const client = getClient();
		if (!client) return {};
		const rootSpan = getRootSpan(span);
		const rootSpanJson = spanToStaticSpanJSON(rootSpan);
		const rootSpanAttributes = rootSpanJson.data;
		const traceState = rootSpan.spanContext().traceState;
		const rootSpanSampleRate = traceState?.get("sentry.sample_rate") ?? rootSpanAttributes["sentry.sample_rate"] ?? rootSpanAttributes["sentry.previous_trace_sample_rate"];
		function applyLocalSampleRateToDsc(dsc) {
			if (typeof rootSpanSampleRate === "number" || typeof rootSpanSampleRate === "string") dsc.sample_rate = `${rootSpanSampleRate}`;
			return dsc;
		}
		const frozenDsc = rootSpan[FROZEN_DSC_FIELD];
		if (frozenDsc) return applyLocalSampleRateToDsc(frozenDsc);
		const isNonRecordingRoot = spanIsNonRecordingSpan(rootSpan);
		const isIgnoredRoot = isNonRecordingRoot && rootSpan.dropReason === "ignored";
		if (isNonRecordingRoot && (!hasSpansEnabled(client.getOptions()) || isIgnoredRoot)) {
			const capturedScope = getCapturedScopesOnSpan(rootSpan).scope;
			const scopeDsc = capturedScope && getDynamicSamplingContextFromScope(client, capturedScope);
			if (scopeDsc) {
				const dsc = { ...scopeDsc };
				if (isIgnoredRoot) dsc.sampled = "false";
				return applyLocalSampleRateToDsc(dsc);
			}
		}
		const traceStateDsc = traceState?.get("sentry.dsc");
		const dscOnTraceState = traceStateDsc && baggageHeaderToDynamicSamplingContext(traceStateDsc);
		if (dscOnTraceState) return applyLocalSampleRateToDsc(dscOnTraceState);
		const dsc = getDynamicSamplingContextFromClient(span.spanContext().traceId, client);
		const source = rootSpanAttributes[qb];
		const name = rootSpanJson.description;
		if (source !== "url" && name) dsc.transaction = name;
		if (hasSpansEnabled()) {
			dsc.sampled = String(spanIsSampled(rootSpan));
			dsc.sample_rand = traceState?.get("sentry.sample_rand") ?? getCapturedScopesOnSpan(rootSpan).scope?.getPropagationContext().sampleRand.toString();
		}
		applyLocalSampleRateToDsc(dsc);
		client.emit("createDsc", dsc, rootSpan);
		return dsc;
	}
	// ../core/build/esm/utils/scopeData.js
	/**
	* Applies data from the scope to the event and runs all event processors on it.
	*/
	function applyScopeDataToEvent(event, data) {
		const { fingerprint, breadcrumbs, sdkProcessingMetadata } = data;
		applyDataToEvent(event, data);
		applyFingerprintToEvent(event, fingerprint);
		applyBreadcrumbsToEvent(event, breadcrumbs);
		applySdkMetadataToEvent(event, sdkProcessingMetadata);
	}
	/** Merge data of two scopes together. */
	function mergeScopeData(data, mergeData) {
		const { extra, tags, attributes, user, contexts, level, sdkProcessingMetadata, breadcrumbs, fingerprint, eventProcessors, attachments, propagationContext, transactionName } = mergeData;
		mergeAndOverwriteScopeData(data, "extra", extra);
		mergeAndOverwriteScopeData(data, "tags", tags);
		mergeAndOverwriteScopeData(data, "attributes", attributes);
		mergeAndOverwriteScopeData(data, "user", user);
		mergeAndOverwriteScopeData(data, "contexts", contexts);
		data.sdkProcessingMetadata = merge(data.sdkProcessingMetadata, sdkProcessingMetadata, 2);
		if (level) data.level = level;
		if (transactionName) data.transactionName = transactionName;
		if (breadcrumbs.length) data.breadcrumbs = [...data.breadcrumbs, ...breadcrumbs];
		if (fingerprint.length) data.fingerprint = [...data.fingerprint, ...fingerprint];
		if (eventProcessors.length) data.eventProcessors = [...data.eventProcessors, ...eventProcessors];
		if (attachments.length) data.attachments = [...data.attachments, ...attachments];
		data.propagationContext = {
			...data.propagationContext,
			...propagationContext
		};
	}
	/**
	* Merges certain scope data. Undefined values will overwrite any existing values.
	* Exported only for tests.
	*/
	function mergeAndOverwriteScopeData(data, prop, mergeVal) {
		data[prop] = merge(data[prop], mergeVal, 1);
	}
	/**
	* Get the scope data for the current scope after merging with the
	* global scope and isolation scope.
	*
	* @param currentScope - The current scope.
	* @returns The scope data.
	*/
	function getCombinedScopeData(isolationScope, currentScope) {
		const scopeData = getGlobalScope().getScopeData();
		isolationScope && mergeScopeData(scopeData, isolationScope.getScopeData());
		currentScope && mergeScopeData(scopeData, currentScope.getScopeData());
		return scopeData;
	}
	function applyDataToEvent(event, data) {
		const { extra, tags, user, contexts, level, transactionName } = data;
		if (Object.keys(extra).length) event.extra = {
			...extra,
			...event.extra
		};
		if (Object.keys(tags).length) event.tags = {
			...tags,
			...event.tags
		};
		if (Object.keys(user).length) event.user = {
			...user,
			...event.user
		};
		if (Object.keys(contexts).length) event.contexts = {
			...contexts,
			...event.contexts
		};
		if (level) event.level = level;
		if (transactionName && event.type !== "transaction") event.transaction = transactionName;
	}
	function applyBreadcrumbsToEvent(event, breadcrumbs) {
		const mergedBreadcrumbs = [...event.breadcrumbs || [], ...breadcrumbs];
		event.breadcrumbs = mergedBreadcrumbs.length ? mergedBreadcrumbs : void 0;
	}
	function applySdkMetadataToEvent(event, sdkProcessingMetadata) {
		event.sdkProcessingMetadata = {
			...event.sdkProcessingMetadata,
			...sdkProcessingMetadata
		};
	}
	/** Apply a given span to the event. */
	function applySpanToEvent(event, span) {
		event.contexts = {
			trace: spanToTraceContext(span),
			...event.contexts
		};
		event.sdkProcessingMetadata = {
			dynamicSamplingContext: getDynamicSamplingContextFromSpan(span),
			...event.sdkProcessingMetadata
		};
		const transactionName = spanToStaticSpanJSON(getRootSpan(span)).description;
		if (transactionName && !event.transaction && event.type === "transaction") event.transaction = transactionName;
	}
	/**
	* Applies fingerprint from the scope to the event if there's one,
	* uses message if there's one instead or get rid of empty fingerprint
	*/
	function applyFingerprintToEvent(event, fingerprint) {
		event.fingerprint = event.fingerprint ? Array.isArray(event.fingerprint) ? event.fingerprint : [event.fingerprint] : [];
		if (fingerprint) event.fingerprint = event.fingerprint.concat(fingerprint);
		if (!event.fingerprint.length) delete event.fingerprint;
	}
	// ../core/build/esm/utils/safeCallback.js
	/**
	* Invokes a user-provided callback (e.g. `beforeSend`, `tracesSampler`, an integration hook) so that
	* neither a synchronous throw nor a rejected promise escapes into the caller. On failure the error is
	* logged and `fallback(error)` supplies the result instead.
	*
	* Not for `startSpan` bodies: those must re-throw and are handled by `handleCallbackErrors`.
	*
	* @param message - Logged via `debug.error` together with the error. Pass it as `DEBUG_BUILD ? '...' : ''`
	*   so the string is tree-shaken from non-debug bundles.
	* @param fn - Invokes the callback.
	* @param fallback - Produces the result to use when the callback throws or rejects.
	*/
	function safeCallback(message, fn, fallback) {
		let result;
		try {
			result = fn();
		} catch (error) {
			return recover(message, error, fallback);
		}
		if (isThenable(result)) return result.then(void 0, (error) => recover(message, error, fallback));
		return result;
	}
	function recover(message, error, fallback) {
		debug$1.error(message, error);
		return fallback(error);
	}
	// ../core/build/esm/tracing/spans/captureSpan.js
	/**
	* Safely set attributes on a span JSON.
	* If an attribute already exists, it will not be overwritten.
	*/
	function safeSetSpanJSONAttributes(spanJSON, newAttributes) {
		const originalAttributes = spanJSON.attributes ?? (spanJSON.attributes = {});
		Object.entries(newAttributes).forEach(([key, value]) => {
			if (value != null && !(key in originalAttributes)) originalAttributes[key] = value;
		});
	}
	// ../core/build/esm/utils/envelope.js
	/**
	* Creates an envelope.
	* Make sure to always explicitly provide the generic to this function
	* so that the envelope types resolve correctly.
	*/
	function createEnvelope(headers, items = []) {
		return [headers, items];
	}
	/** Extracts the minimal SDK info from the metadata or an events */
	function getSdkMetadataForEnvelopeHeader(metadataOrEvent) {
		if (!metadataOrEvent?.sdk) return;
		const { name, version } = metadataOrEvent.sdk;
		return {
			name,
			version
		};
	}
	/**
	* Creates event envelope headers, based on event, sdk info and tunnel
	* Note: This function was extracted from the core package to make it available in Replay
	*/
	function createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn) {
		const dynamicSamplingContext = event.sdkProcessingMetadata?.dynamicSamplingContext;
		return {
			event_id: event.event_id,
			sent_at: new Date(safeDateNow()).toISOString(),
			...sdkInfo && { sdk: sdkInfo },
			...!!tunnel && dsn && { dsn: dsnToString(dsn) },
			...dynamicSamplingContext && { trace: dynamicSamplingContext }
		};
	}
	/**
	* Maps an event type to the data category used for client reports.
	*/
	function getDataCategoryByType(type) {
		return type === "replay_event" ? "replay" : type || "error";
	}
	// ../core/build/esm/utils/env.js
	/**
	* Figures out if we're building a browser bundle.
	*
	* @returns true if this is a browser bundle build.
	*/
	function isBrowserBundle() {
		return true;
	}
	// ../core/build/esm/utils/node.js
	/**
	* NOTE: In order to avoid circular dependencies, if you add a function to this module and it needs to print something,
	* you must either a) use `console.log` rather than the `debug` singleton, or b) put your function elsewhere.
	*/
	/**
	* Checks whether we're in the Node.js or Browser environment
	*
	* @returns Answer to given question
	*/
	function isNodeEnv() {
		return !isBrowserBundle() && Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
	}
	// ../core/build/esm/utils/isBrowser.js
	/**
	* Returns true if we are in the browser.
	*/
	function isBrowser() {
		return typeof window !== "undefined" && (!isNodeEnv() || isElectronNodeRenderer());
	}
	function isElectronNodeRenderer() {
		return GLOBAL_OBJ.process?.type === "renderer";
	}
	// ../core/build/esm/utils/errorSpanAttribution.js
	/**
	* The trace context of the span an error escaped, keyed by the error itself.
	*
	* We store the trace context rather than the span because that is the shape we apply to the event
	* later, and it snapshots the span as it failed instead of reading it back once it has ended.
	*/
	const escapedSpanTraceContexts = /* @__PURE__ */ new WeakMap();
	/**
	* A `WeakMap` can only be keyed by an object, so an error thrown as a primitive (`throw 'boom'`)
	* has nothing we can hang the span on and is left unattributed.
	*/
	function toWeakMapKey(error) {
		return isPrimitive(error) ? void 0 : error;
	}
	/**
	* Attribute an error event to the span the error escaped, if we recorded one.
	*
	* This only applies within the error's own trace. The stored span id is meaningless in another
	* trace, and the event's dynamic sampling context (which the envelope header is built from) is
	* derived from the root span of the trace the event is already on. Rewriting the trace id here
	* would leave the envelope header and body naming different traces.
	*/
	function applyEscapedErrorSpanToEvent(event, hint, scope) {
		const key = toWeakMapKey(hint.originalException);
		const traceContext = key && escapedSpanTraceContexts.get(key);
		if (!traceContext) return;
		const eventTraceContext = event.contexts?.trace;
		if ((eventTraceContext?.trace_id ?? (scope && getTraceContextFromScope(scope).trace_id)) !== traceContext.trace_id) return;
		event.contexts = {
			...event.contexts,
			trace: {
				...eventTraceContext,
				...traceContext
			}
		};
	}
	// ../core/build/esm/utils/debounce.js
	/**
	* Heavily simplified debounce function based on lodash.debounce.
	*
	* This function takes a callback function (@param fun) and delays its invocation
	* by @param wait milliseconds. Optionally, a maxWait can be specified in @param options,
	* which ensures that the callback is invoked at least once after the specified max. wait time.
	*
	* @param func the function whose invocation is to be debounced
	* @param wait the minimum time until the function is invoked after it was called once
	* @param options the options object, which can contain the `maxWait` property
	*
	* @returns the debounced version of the function, which needs to be called at least once to start the
	*          debouncing process. Subsequent calls will reset the debouncing timer and, in case @paramfunc
	*          was already invoked in the meantime, return @param func's return value.
	*          The debounced function has two additional properties:
	*          - `flush`: Invokes the debounced function immediately and returns its return value
	*          - `cancel`: Cancels the debouncing process and resets the debouncing timer
	*/
	function debounce$1(func, wait, options) {
		let callbackReturnValue;
		let timerId;
		let maxTimerId;
		const maxWait = options?.maxWait ? Math.max(options.maxWait, wait) : 0;
		const setTimeoutImpl = options?.setTimeoutImpl || setTimeout;
		function invokeFunc() {
			cancelTimers();
			callbackReturnValue = func();
			return callbackReturnValue;
		}
		function cancelTimers() {
			timerId !== void 0 && clearTimeout(timerId);
			maxTimerId !== void 0 && clearTimeout(maxTimerId);
			timerId = maxTimerId = void 0;
		}
		function flush() {
			if (timerId !== void 0 || maxTimerId !== void 0) return invokeFunc();
			return callbackReturnValue;
		}
		function debounced() {
			if (timerId) clearTimeout(timerId);
			timerId = setTimeoutImpl(invokeFunc, wait);
			if (maxWait && maxTimerId === void 0) maxTimerId = setTimeoutImpl(invokeFunc, maxWait);
			return callbackReturnValue;
		}
		debounced.cancel = cancelTimers;
		debounced.flush = flush;
		return debounced;
	}
	// ../core/build/esm/utils/syncpromise.js
	/** SyncPromise internal states */
	const STATE_PENDING = 0;
	const STATE_RESOLVED = 1;
	const STATE_REJECTED = 2;
	/**
	* Creates a resolved sync promise.
	*
	* @param value the value to resolve the promise with
	* @returns the resolved sync promise
	*/
	function resolvedSyncPromise(value) {
		return new SyncPromise((resolve) => {
			resolve(value);
		});
	}
	/**
	* Creates a rejected sync promise.
	*
	* @param value the value to reject the promise with
	* @returns the rejected sync promise
	*/
	function rejectedSyncPromise(reason) {
		return new SyncPromise((_, reject) => {
			reject(reason);
		});
	}
	/**
	* Thenable class that behaves like a Promise and follows it's interface
	* but is not async internally
	*/
	var SyncPromise = class SyncPromise {
		constructor(executor) {
			this._state = STATE_PENDING;
			this._handlers = [];
			this._runExecutor(executor);
		}
		/** @inheritdoc */
		then(onfulfilled, onrejected) {
			return new SyncPromise((resolve, reject) => {
				this._handlers.push([
					false,
					(result) => {
						if (!onfulfilled) resolve(result);
						else try {
							resolve(onfulfilled(result));
						} catch (e) {
							reject(e);
						}
					},
					(reason) => {
						if (!onrejected) reject(reason);
						else try {
							resolve(onrejected(reason));
						} catch (e) {
							reject(e);
						}
					}
				]);
				this._executeHandlers();
			});
		}
		/** @inheritdoc */
		catch(onrejected) {
			return this.then((val) => val, onrejected);
		}
		/** @inheritdoc */
		finally(onfinally) {
			return new SyncPromise((resolve, reject) => {
				let val;
				let isRejected;
				return this.then((value) => {
					isRejected = false;
					val = value;
					if (onfinally) onfinally();
				}, (reason) => {
					isRejected = true;
					val = reason;
					if (onfinally) onfinally();
				}).then(() => {
					if (isRejected) {
						reject(val);
						return;
					}
					resolve(val);
				});
			});
		}
		/** Excute the resolve/reject handlers. */
		_executeHandlers() {
			if (this._state === STATE_PENDING) return;
			const cachedHandlers = this._handlers.slice();
			this._handlers = [];
			cachedHandlers.forEach((handler) => {
				if (handler[0]) return;
				if (this._state === STATE_RESOLVED) handler[1](this._value);
				if (this._state === STATE_REJECTED) handler[2](this._value);
				handler[0] = true;
			});
		}
		/** Run the executor for the SyncPromise. */
		_runExecutor(executor) {
			const setResult = (state, value) => {
				if (this._state !== STATE_PENDING) return;
				if (isThenable(value)) {
					value.then(resolve, reject);
					return;
				}
				this._state = state;
				this._value = value;
				this._executeHandlers();
			};
			const resolve = (value) => {
				setResult(STATE_RESOLVED, value);
			};
			const reject = (reason) => {
				setResult(STATE_REJECTED, reason);
			};
			try {
				executor(resolve, reject);
			} catch (e) {
				reject(e);
			}
		}
	};
	// ../core/build/esm/eventProcessors.js
	/**
	* Process an array of event processors, returning the processed event (or `null` if the event was dropped).
	*/
	function notifyEventProcessors(processors, event, hint, index = 0, onDrop) {
		try {
			const result = _notifyEventProcessors(event, hint, processors, index, onDrop);
			return isThenable(result) ? result : resolvedSyncPromise(result);
		} catch (error) {
			return rejectedSyncPromise(error);
		}
	}
	function _notifyEventProcessors(event, hint, processors, index, onDrop) {
		const processor = processors[index];
		if (!event || !processor) return event;
		const processorName = `Event processor "${processor.id || "?"}"`;
		let callbackError = false;
		const result = safeCallback(`${processorName} threw an error, dropping event:`, () => processor({ ...event }, hint), () => {
			callbackError = true;
			return null;
		});
		result === null && debug$1.log(`${processorName} dropped event`);
		if (isThenable(result)) return result.then((final) => {
			if (!final) {
				onDrop?.(callbackError ? "callback_error" : "event_processor");
				return null;
			}
			return _notifyEventProcessors(final, hint, processors, index + 1, onDrop);
		});
		if (!result) {
			onDrop?.(callbackError ? "callback_error" : "event_processor");
			return null;
		}
		return _notifyEventProcessors(result, hint, processors, index + 1, onDrop);
	}
	// ../core/build/esm/utils/debug-ids.js
	let parsedStackResults;
	let lastSentryKeysCount;
	let lastNativeKeysCount;
	let cachedFilenameDebugIds;
	/**
	* Returns a map of filenames to debug identifiers.
	* Supports both proprietary _sentryDebugIds and native _debugIds (e.g., from Vercel) formats.
	*/
	function getFilenameToDebugIdMap(stackParser) {
		const sentryDebugIdMap = GLOBAL_OBJ._sentryDebugIds;
		const nativeDebugIdMap = GLOBAL_OBJ._debugIds;
		if (!sentryDebugIdMap && !nativeDebugIdMap) return {};
		const sentryDebugIdKeys = sentryDebugIdMap ? Object.keys(sentryDebugIdMap) : [];
		const nativeDebugIdKeys = nativeDebugIdMap ? Object.keys(nativeDebugIdMap) : [];
		if (cachedFilenameDebugIds && sentryDebugIdKeys.length === lastSentryKeysCount && nativeDebugIdKeys.length === lastNativeKeysCount) return cachedFilenameDebugIds;
		lastSentryKeysCount = sentryDebugIdKeys.length;
		lastNativeKeysCount = nativeDebugIdKeys.length;
		cachedFilenameDebugIds = {};
		if (!parsedStackResults) parsedStackResults = {};
		const processDebugIds = (debugIdKeys, debugIdMap) => {
			for (const key of debugIdKeys) {
				const debugId = debugIdMap[key];
				const result = parsedStackResults?.[key];
				if (result && cachedFilenameDebugIds && debugId) {
					cachedFilenameDebugIds[result[0]] = debugId;
					if (parsedStackResults) parsedStackResults[key] = [result[0], debugId];
				} else if (debugId) {
					const parsedStack = stackParser(key);
					for (let i = parsedStack.length - 1; i >= 0; i--) {
						const filename = parsedStack[i]?.filename;
						if (filename && cachedFilenameDebugIds && parsedStackResults) {
							cachedFilenameDebugIds[filename] = debugId;
							parsedStackResults[key] = [filename, debugId];
							break;
						}
					}
				}
			}
		};
		if (sentryDebugIdMap) processDebugIds(sentryDebugIdKeys, sentryDebugIdMap);
		if (nativeDebugIdMap) processDebugIds(nativeDebugIdKeys, nativeDebugIdMap);
		return cachedFilenameDebugIds;
	}
	// ../core/build/esm/utils/eventUtils.js
	function isInternalException(hint) {
		return hint.data?.__sentry__ === true;
	}
	// ../core/build/esm/utils/prepareEvent.js
	/**
	* Adds common information to events.
	*
	* The information includes release and environment from `options`,
	* breadcrumbs and context (extra, tags and user) from the scope.
	*
	* Information that is already present in the event is never overwritten. For
	* nested objects, such as the context, keys are merged.
	*
	* @param event The original event.
	* @param hint May contain additional information about the original exception.
	* @param scope A scope containing event metadata.
	* @returns A new event with more information, or `null` if an event processor dropped it (or threw). In that case the
	*   drop has already been recorded on the client, so callers must not record it again.
	* @hidden
	*/
	function prepareEvent(options, event, hint, scope, client, isolationScope) {
		const { normalizeDepth = 3, normalizeMaxBreadth = 1e3 } = options;
		const prepared = {
			...event,
			event_id: event.event_id || hint.event_id || uuid4(),
			timestamp: event.timestamp || dateTimestampInSeconds()
		};
		const integrations = hint.integrations || options.integrations.map((i) => i.name);
		applyClientOptions(prepared, options);
		applyIntegrationsMetadata(prepared, integrations);
		if (client) client.emit("applyFrameMetadata", event);
		if (event.type === void 0) applyDebugIds(prepared, options.stackParser);
		const finalScope = getFinalScope(scope, hint.captureContext);
		if (hint.mechanism) addExceptionMechanismToCapturedException(prepared, hint.mechanism);
		const clientEventProcessors = client ? client.getEventProcessors() : [];
		const data = getCombinedScopeData(isolationScope, finalScope);
		const attachments = [...hint.attachments || [], ...data.attachments];
		if (attachments.length) hint.attachments = attachments;
		applyScopeDataToEvent(prepared, data);
		const span = getActiveSpan(finalScope);
		if (span) applySpanToEvent(prepared, span);
		applyEscapedErrorSpanToEvent(prepared, hint, finalScope);
		const eventProcessors = [...clientEventProcessors, ...data.eventProcessors];
		const isTransaction = event.type === "transaction";
		const spanCountBeforeProcessing = event.spans?.length || 0;
		return (isInternalException(hint) ? resolvedSyncPromise(prepared) : notifyEventProcessors(eventProcessors, prepared, hint, 0, (reason) => {
			if (!client) return;
			client.recordDroppedEvent(reason, getDataCategoryByType(event.type));
			if (isTransaction) client.recordDroppedEvent(reason, "span", 1 + spanCountBeforeProcessing);
		})).then((evt) => {
			if (!evt) return null;
			if (isTransaction && client) {
				const droppedSpanCount = spanCountBeforeProcessing - (evt.spans?.length || 0);
				if (droppedSpanCount > 0) client.recordDroppedEvent("event_processor", "span", droppedSpanCount);
			}
			applyDebugMeta(evt);
			if (typeof normalizeDepth === "number" && normalizeDepth > 0) return normalizeEvent(evt, normalizeDepth, normalizeMaxBreadth);
			return evt;
		});
	}
	/**
	* Enhances event using the client configuration.
	* It takes care of all "static" values like environment, release and `dist`,
	* as well as truncating overly long values.
	*
	* Only exported for tests.
	*
	* @param event event instance to be enhanced
	*/
	function applyClientOptions(event, options) {
		const { environment, release, dist, maxValueLength } = options;
		event.environment = event.environment || environment || "production";
		if (!event.release && release) event.release = release;
		if (!event.dist && dist) event.dist = dist;
		const request = event.request;
		if (request?.url && maxValueLength) request.url = truncate(request.url, maxValueLength);
		if (maxValueLength) event.exception?.values?.forEach((exception) => {
			if (exception.value) exception.value = truncate(exception.value, maxValueLength);
		});
	}
	/**
	* Puts debug IDs into the stack frames of an error event.
	*/
	function applyDebugIds(event, stackParser) {
		const filenameDebugIdMap = getFilenameToDebugIdMap(stackParser);
		event.exception?.values?.forEach((exception) => {
			exception.stacktrace?.frames?.forEach((frame) => {
				if (frame.filename) frame.debug_id = filenameDebugIdMap[frame.filename];
			});
		});
	}
	/**
	* Moves debug IDs from the stack frames of an error event into the debug_meta field.
	*/
	function applyDebugMeta(event) {
		const filenameDebugIdMap = {};
		event.exception?.values?.forEach((exception) => {
			exception.stacktrace?.frames?.forEach((frame) => {
				if (frame.debug_id) {
					if (frame.abs_path) filenameDebugIdMap[frame.abs_path] = frame.debug_id;
					else if (frame.filename) filenameDebugIdMap[frame.filename] = frame.debug_id;
					delete frame.debug_id;
				}
			});
		});
		if (Object.keys(filenameDebugIdMap).length === 0) return;
		event.debug_meta = event.debug_meta || {};
		event.debug_meta.images = event.debug_meta.images || [];
		const images = event.debug_meta.images;
		Object.entries(filenameDebugIdMap).forEach(([filename, debug_id]) => {
			images.push({
				type: "sourcemap",
				code_file: filename,
				debug_id
			});
		});
	}
	/**
	* This function adds all used integrations to the SDK info in the event.
	* @param event The event that will be filled with all integrations.
	*/
	function applyIntegrationsMetadata(event, integrationNames) {
		if (integrationNames.length > 0) {
			event.sdk = event.sdk || {};
			event.sdk.integrations = [...event.sdk.integrations || [], ...integrationNames];
		}
	}
	/**
	* Applies `normalize` function on necessary `Event` attributes to make them safe for serialization.
	* Normalized keys:
	* - `breadcrumbs.data`
	* - `user`
	* - `contexts`
	* - `extra`
	* @param event Event
	* @returns Normalized event
	*/
	function normalizeEvent(event, depth, maxBreadth) {
		if (!event) return null;
		const normalized = {
			...event,
			...event.breadcrumbs && { breadcrumbs: event.breadcrumbs.map((b) => ({
				...b,
				...b.data && { data: normalize(b.data, depth, maxBreadth) }
			})) },
			...event.user && { user: normalize(event.user, depth, maxBreadth) },
			...event.contexts && { contexts: normalize(event.contexts, depth, maxBreadth) },
			...event.extra && { extra: normalize(event.extra, depth, maxBreadth) }
		};
		if (event.contexts?.trace && normalized.contexts) {
			normalized.contexts.trace = event.contexts.trace;
			if (event.contexts.trace.data) normalized.contexts.trace.data = normalize(event.contexts.trace.data, depth, maxBreadth);
		}
		if (event.spans) normalized.spans = event.spans.map((span) => {
			return {
				...span,
				...span.data && { data: normalize(span.data, depth, maxBreadth) }
			};
		});
		if (event.contexts?.flags && normalized.contexts) normalized.contexts.flags = normalize(event.contexts.flags, 3, maxBreadth);
		return normalized;
	}
	function getFinalScope(scope, captureContext) {
		if (!captureContext) return scope;
		const finalScope = scope ? scope.clone() : new Scope();
		finalScope.update(captureContext);
		return finalScope;
	}
	/**
	* Parse either an `EventHint` directly, or convert a `CaptureContext` to an `EventHint`.
	* This is used to allow to update method signatures that used to accept a `CaptureContext` but should now accept an `EventHint`.
	*/
	function parseEventHintOrCaptureContext(hint) {
		if (!hint) return;
		if (hintIsScopeOrFunction(hint)) return { captureContext: hint };
		if (hintIsScopeContext(hint)) return { captureContext: hint };
		return hint;
	}
	function hintIsScopeOrFunction(hint) {
		return hint instanceof Scope || typeof hint === "function";
	}
	const captureContextKeys = [
		"user",
		"level",
		"extra",
		"contexts",
		"tags",
		"fingerprint",
		"propagationContext"
	];
	function hintIsScopeContext(hint) {
		return Object.keys(hint).some((key) => captureContextKeys.includes(key));
	}
	// ../core/build/esm/exports.js
	/**
	* Captures an exception event and sends it to Sentry.
	*
	* @param exception The exception to capture.
	* @param hint Optional additional data to attach to the Sentry event.
	* @returns the id of the captured Sentry event.
	*/
	function captureException(exception, hint) {
		return getCurrentScope().captureException(exception, parseEventHintOrCaptureContext(hint));
	}
	/**
	* Sets context data with the given name.
	* @param name of the context
	* @param context Any kind of data. This data will be normalized.
	*/
	function setContext(name, context) {
		getIsolationScope().setContext(name, context);
	}
	/**
	* Add an event processor.
	* This will be added to the current isolation scope, ensuring any event that is processed in the current execution
	* context will have the processor applied.
	*/
	function addEventProcessor(callback) {
		getIsolationScope().addEventProcessor(callback);
	}
	// ../core/build/esm/utils/ratelimit.js
	const DEFAULT_RETRY_AFTER = 6e4;
	/**
	* Extracts Retry-After value from the request header or returns default value
	* @param header string representation of 'Retry-After' header
	* @param now current unix timestamp
	*
	*/
	function parseRetryAfterHeader(header, now = safeDateNow()) {
		const headerDelay = parseInt(`${header}`, 10);
		if (!isNaN(headerDelay)) return headerDelay * 1e3;
		const headerDate = Date.parse(`${header}`);
		if (!isNaN(headerDate)) return headerDate - now;
		return DEFAULT_RETRY_AFTER;
	}
	/**
	* Gets the time that the given category is disabled until for rate limiting.
	* In case no category-specific limit is set but a general rate limit across all categories is active,
	* that time is returned.
	*
	* @return the time in ms that the category is disabled until or 0 if there's no active rate limit.
	*/
	function disabledUntil(limits, dataCategory) {
		return limits[dataCategory] || limits.all || 0;
	}
	/**
	* Checks if a category is rate limited
	*/
	function isRateLimited(limits, dataCategory, now = safeDateNow()) {
		return disabledUntil(limits, dataCategory) > now;
	}
	/**
	* Update ratelimits from incoming headers.
	*
	* @return the updated RateLimits object.
	*/
	function updateRateLimits(limits, response, now = safeDateNow()) {
		const updatedRateLimits = { ...limits };
		forEachRateLimit(response, now, (category, until) => {
			updatedRateLimits[category] = Math.max(updatedRateLimits[category] || 0, until);
		});
		return updatedRateLimits;
	}
	/**
	* Calls `extendRateLimit` with the category and deadline of each rate limit in the response.
	*/
	function forEachRateLimit({ statusCode, headers }, now, extendRateLimit) {
		const rateLimitHeader = headers?.["x-sentry-rate-limits"];
		const retryAfterHeader = headers?.["retry-after"];
		if (rateLimitHeader)
 /**
		* rate limit headers are of the form
		*     <header>,<header>,..
		* where each <header> is of the form
		*     <retry_after>: <categories>: <scope>: <reason_code>: <namespaces>
		* where
		*     <retry_after> is a delay in seconds
		*     <categories> is the event type(s) (error, transaction, etc) being rate limited and is of the form
		*         <category>;<category>;...
		*     <scope> is what's being limited (org, project, or key) - ignored by SDK
		*     <reason_code> is an arbitrary string like "org_quota" - ignored by SDK
		*     <namespaces> Semicolon-separated list of metric namespace identifiers. Defines which namespace(s) will be affected.
		*         Only present if rate limit applies to the metric_bucket data category.
		*/
		for (const limit of rateLimitHeader.trim().split(",")) {
			const [retryAfter, categories, , , namespaces] = limit.split(":", 5);
			const headerDelay = parseInt(retryAfter, 10);
			const delay = (!isNaN(headerDelay) ? headerDelay : 60) * 1e3;
			if (!categories) extendRateLimit("all", now + delay);
			else for (const category of categories.split(";")) if (category === "metric_bucket") {
				if (!namespaces || namespaces.split(";").includes("custom")) extendRateLimit(category, now + delay);
			} else extendRateLimit(category, now + delay);
		}
		else if (retryAfterHeader) extendRateLimit("all", now + parseRetryAfterHeader(retryAfterHeader, now));
		else if (statusCode === 429) extendRateLimit("all", now + 6e4);
	}
	// ../core/build/esm/utils/url.js
	const DEFAULT_BASE_URL = "thismessage:/";
	/**
	* Checks if the URL object is relative
	*
	* @param url - The URL object to check
	* @returns True if the URL object is relative, false otherwise
	*/
	function isURLObjectRelative(url) {
		return "isRelative" in url;
	}
	/**
	* Parses string to a URL object
	*
	* @param url - The URL to parse
	* @returns The parsed URL object or undefined if the URL is invalid
	*/
	function parseStringToURLObject(url, urlBase) {
		const isRelative = url.indexOf("://") <= 0 && url.indexOf("//") !== 0;
		const base = urlBase ?? (isRelative ? DEFAULT_BASE_URL : void 0);
		try {
			if ("canParse" in URL && !URL.canParse(url, base)) return;
			const fullUrlObject = new URL(url, base);
			if (isRelative) return {
				isRelative,
				pathname: fullUrlObject.pathname,
				search: fullUrlObject.search,
				hash: fullUrlObject.hash
			};
			return fullUrlObject;
		} catch {}
	}
	// ../core/build/esm/utils/isSentryRequestUrl.js
	/**
	* Checks whether given url points to Sentry server
	*
	* @param url url to verify
	*/
	function isSentryRequestUrl(url, client) {
		const dsn = client?.getDsn();
		const tunnel = client?.getOptions().tunnel;
		return checkDsn(url, dsn) || checkTunnel(url, tunnel);
	}
	function checkTunnel(url, tunnel) {
		if (!tunnel) return false;
		return removeTrailingSlash(url) === removeTrailingSlash(tunnel);
	}
	function checkDsn(url, dsn) {
		const urlParts = parseStringToURLObject(url);
		if (!urlParts || isURLObjectRelative(urlParts)) return false;
		if (!dsn) return false;
		return hostnameMatchesDsnHost(urlParts.hostname, dsn.host) && /(^|&|\?)sentry_key=/.test(urlParts.search);
	}
	function hostnameMatchesDsnHost(hostname, dsnHost) {
		return hostname === dsnHost || dsnHost.length > 0 && hostname.endsWith(`.${dsnHost}`);
	}
	function removeTrailingSlash(str) {
		return str[str.length - 1] === "/" ? str.slice(0, -1) : str;
	}
	// ../core/build/esm/breadcrumbs.js
	/**
	* Default maximum number of breadcrumbs added to an event. Can be overwritten
	* with {@link Options.maxBreadcrumbs}.
	*/
	const DEFAULT_BREADCRUMBS = 100;
	/**
	* Records a new breadcrumb which will be attached to future events.
	*
	* Breadcrumbs will be added to subsequent events to provide more context on
	* user's actions prior to an error or crash.
	*/
	function addBreadcrumb(breadcrumb, hint) {
		const client = getClient();
		const isolationScope = getIsolationScope();
		if (!client) return;
		const { beforeBreadcrumb = null, maxBreadcrumbs = DEFAULT_BREADCRUMBS } = client.getOptions();
		if (maxBreadcrumbs <= 0) return;
		const mergedBreadcrumb = {
			timestamp: dateTimestampInSeconds(),
			...breadcrumb
		};
		const finalBreadcrumb = beforeBreadcrumb ? safeCallback("The `beforeBreadcrumb` callback threw an error, dropping the breadcrumb:", () => consoleSandbox(() => beforeBreadcrumb(mergedBreadcrumb, hint)), () => null) : mergedBreadcrumb;
		if (finalBreadcrumb === null) return;
		if (client.emit) client.emit("beforeAddBreadcrumb", finalBreadcrumb, hint);
		isolationScope.addBreadcrumb(finalBreadcrumb, maxBreadcrumbs);
	}
	// ../core/build/esm/utils/severity.js
	/**
	* Converts a string-based level into a `SeverityLevel`, normalizing it along the way.
	*
	* @param level String representation of desired `SeverityLevel`.
	* @returns The `SeverityLevel` corresponding to the given string, or 'log' if the string isn't a valid level.
	*/
	function severityLevelFromString(level) {
		return level === "warn" ? "warning" : [
			"fatal",
			"error",
			"warning",
			"log",
			"info",
			"debug"
		].includes(level) ? level : "log";
	}
	// ../core/build/esm/utils/supports.js
	/**
	* isNative checks if the given function is a native implementation
	*/
	function isNativeFunction(func) {
		return func && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
	}
	// src/constants.ts
	const WINDOW$1 = GLOBAL_OBJ;
	const REPLAY_SESSION_KEY = "sentryReplaySession";
	const REPLAY_EVENT_NAME = "replay_event";
	const UNABLE_TO_SEND_REPLAY = "Unable to send Replay";
	const SESSION_IDLE_PAUSE_DURATION = 3e5;
	const SESSION_IDLE_EXPIRE_DURATION = 9e5;
	/** Default flush delays */
	const DEFAULT_FLUSH_MIN_DELAY = 5e3;
	const DEFAULT_FLUSH_MAX_DELAY = 5500;
	const BUFFER_CHECKOUT_TIME = 6e4;
	const RETRY_BASE_INTERVAL = 5e3;
	const NETWORK_BODY_MAX_SIZE = 15e4;
	const CONSOLE_ARG_MAX_SIZE = 5e3;
	const SLOW_CLICK_THRESHOLD = 3e3;
	/** When encountering a total segment size exceeding this size, stop the replay (as we cannot properly ingest it). */
	const REPLAY_MAX_EVENT_BUFFER_SIZE = 2e7;
	/** Replays must be min. 5s long before we send them. */
	const MIN_REPLAY_DURATION = 4999;
	const MIN_REPLAY_DURATION_LIMIT = 5e4;
	/** The max. length of a replay. */
	const MAX_REPLAY_DURATION = 36e5;
	// ../../node_modules/.pnpm/@sentry+rrweb@2.46.0/node_modules/@sentry/rrweb/dist/canvas-manager-BUXy0PTw.js
	var __defProp = Object.defineProperty;
	var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, {
		enumerable: true,
		configurable: true,
		writable: true,
		value
	}) : obj[key] = value;
	var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
	var NodeType$1 = /* @__PURE__ */ ((NodeType2) => {
		NodeType2[NodeType2["Document"] = 0] = "Document";
		NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
		NodeType2[NodeType2["Element"] = 2] = "Element";
		NodeType2[NodeType2["Text"] = 3] = "Text";
		NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
		NodeType2[NodeType2["Comment"] = 5] = "Comment";
		return NodeType2;
	})(NodeType$1 || {});
	function isElement$1(n) {
		return n.nodeType === n.ELEMENT_NODE;
	}
	function isShadowRoot(n) {
		const host = n?.host;
		return Boolean(host?.shadowRoot === n);
	}
	function isNativeShadowDom(shadowRoot) {
		return Object.prototype.toString.call(shadowRoot) === "[object ShadowRoot]";
	}
	function fixBrowserCompatibilityIssuesInCSS(cssText) {
		if (cssText.includes(" background-clip: text;") && !cssText.includes(" -webkit-background-clip: text;")) cssText = cssText.replace(/\sbackground-clip:\s*text;/g, " -webkit-background-clip: text; background-clip: text;");
		return cssText;
	}
	function escapeImportStatement(rule) {
		const { cssText } = rule;
		if (cssText.split("\"").length < 3) return cssText;
		const statement = ["@import", `url(${JSON.stringify(rule.href)})`];
		if (rule.layerName === "") statement.push(`layer`);
		else if (rule.layerName) statement.push(`layer(${rule.layerName})`);
		if (rule.supportsText) statement.push(`supports(${rule.supportsText})`);
		if (rule.media.length) statement.push(rule.media.mediaText);
		return statement.join(" ") + ";";
	}
	function stringifyStylesheet(s) {
		try {
			const rules = s.rules || s.cssRules;
			return rules ? fixBrowserCompatibilityIssuesInCSS(Array.from(rules, stringifyRule).join("")) : null;
		} catch (error) {
			return null;
		}
	}
	function fixAllCssProperty(rule) {
		let styles = "";
		for (let i = 0; i < rule.style.length; i++) {
			const styleDeclaration = rule.style;
			const attribute = styleDeclaration[i];
			const isImportant = styleDeclaration.getPropertyPriority(attribute);
			styles += `${attribute}:${styleDeclaration.getPropertyValue(attribute)}${isImportant ? ` !important` : ""};`;
		}
		return `${rule.selectorText} { ${styles} }`;
	}
	function stringifyRule(rule) {
		let importStringified;
		if (isCSSImportRule(rule)) try {
			importStringified = stringifyStylesheet(rule.styleSheet) || escapeImportStatement(rule);
		} catch (error) {}
		else if (isCSSStyleRule(rule)) {
			let cssText = rule.cssText;
			const needsSafariColonFix = rule.selectorText.includes(":");
			const needsAllFix = typeof rule.style["all"] === "string" && rule.style["all"];
			if (needsAllFix) cssText = fixAllCssProperty(rule);
			if (needsSafariColonFix) cssText = fixSafariColons(cssText);
			if (needsSafariColonFix || needsAllFix) return cssText;
		}
		return importStringified || rule.cssText;
	}
	function fixSafariColons(cssStringified) {
		return cssStringified.replace(/(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm, "$1\\$2");
	}
	function isCSSImportRule(rule) {
		return "styleSheet" in rule;
	}
	function isCSSStyleRule(rule) {
		return "selectorText" in rule;
	}
	var Mirror = class {
		constructor() {
			__publicField(this, "idNodeMap", /* @__PURE__ */ new Map());
			__publicField(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
		}
		getId(n) {
			if (!n) return -1;
			return this.getMeta(n)?.id ?? -1;
		}
		getNode(id) {
			return this.idNodeMap.get(id) || null;
		}
		getIds() {
			return Array.from(this.idNodeMap.keys());
		}
		getMeta(n) {
			return this.nodeMetaMap.get(n) || null;
		}
		removeNodeFromMap(n) {
			const id = this.getId(n);
			this.idNodeMap.delete(id);
			if (n.childNodes) n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
			if (isElement$1(n) && n.shadowRoot) this.removeNodeFromMap(n.shadowRoot);
		}
		has(id) {
			return this.idNodeMap.has(id);
		}
		hasNode(node) {
			return this.nodeMetaMap.has(node);
		}
		add(n, meta) {
			const id = meta.id;
			this.idNodeMap.set(id, n);
			this.nodeMetaMap.set(n, meta);
		}
		replace(id, n) {
			const oldNode = this.getNode(id);
			if (oldNode) {
				const meta = this.nodeMetaMap.get(oldNode);
				if (meta) this.nodeMetaMap.set(n, meta);
			}
			this.idNodeMap.set(id, n);
		}
		reset() {
			this.idNodeMap = /* @__PURE__ */ new Map();
			this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
		}
	};
	function createMirror() {
		return new Mirror();
	}
	function shouldMaskInput({ maskInputOptions, tagName, type }) {
		if (tagName === "OPTION") tagName = "SELECT";
		return Boolean(maskInputOptions[tagName.toLowerCase()] || type && maskInputOptions[type] || type === "password" || tagName === "INPUT" && !type && maskInputOptions["text"]);
	}
	function maskInputValue({ isMasked, element, value, maskInputFn }) {
		let text = value || "";
		if (!isMasked) return text;
		if (maskInputFn) text = maskInputFn(text, element);
		return "*".repeat(text.length);
	}
	function toLowerCase(str) {
		return str.toLowerCase();
	}
	function toUpperCase(str) {
		return str.toUpperCase();
	}
	const ORIGINAL_ATTRIBUTE_NAME = "__rrweb_original__";
	function is2DCanvasBlank(canvas) {
		const ctx = canvas.getContext("2d");
		if (!ctx) return true;
		const chunkSize = 50;
		for (let x = 0; x < canvas.width; x += chunkSize) for (let y = 0; y < canvas.height; y += chunkSize) {
			const getImageData = ctx.getImageData;
			const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData ? getImageData[ORIGINAL_ATTRIBUTE_NAME] : getImageData;
			if (new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer).some((pixel) => pixel !== 0)) return false;
		}
		return true;
	}
	function getInputType(element) {
		const type = element.type;
		return element.hasAttribute("data-rr-is-password") ? "password" : type ? toLowerCase(type) : null;
	}
	function getInputValue(el, tagName, type) {
		if (tagName === "INPUT" && (type === "radio" || type === "checkbox")) return el.getAttribute("value") || "";
		return el.value;
	}
	function extractFileExtension(path, baseURL) {
		let url;
		try {
			url = new URL(path, baseURL ?? window.location.href);
		} catch (err) {
			return null;
		}
		return url.pathname.match(/\.([0-9a-z]+)(?:$)/i)?.[1] ?? null;
	}
	const cachedImplementations$1 = {};
	function getImplementation$1(name) {
		const cached = cachedImplementations$1[name];
		if (cached) return cached;
		const windowImpl = window[name].bind(window);
		let impl = windowImpl;
		const document2 = window.document;
		if (document2 && typeof document2.createElement === "function") try {
			const sandbox = document2.createElement("iframe");
			sandbox.hidden = true;
			document2.head.appendChild(sandbox);
			const contentWindow = sandbox.contentWindow;
			if (contentWindow && contentWindow[name]) {
				const sandboxImpl = contentWindow[name].bind(window);
				impl = (...args) => {
					try {
						return sandboxImpl(...args);
					} catch {
						cachedImplementations$1[name] = windowImpl;
						return windowImpl(...args);
					}
				};
			}
			document2.head.removeChild(sandbox);
		} catch (e) {}
		return cachedImplementations$1[name] = impl;
	}
	function setTimeout$1$1(...rest) {
		return getImplementation$1("setTimeout")(...rest);
	}
	function clearTimeout$1(...rest) {
		return getImplementation$1("clearTimeout")(...rest);
	}
	function getIFrameContentDocument$1(iframe) {
		try {
			return iframe.contentDocument;
		} catch {}
	}
	function getIFrameContentWindow$1(iframe) {
		try {
			return iframe.contentWindow;
		} catch {}
	}
	let _id = 1;
	const tagNameRegex = /* @__PURE__ */ new RegExp("[^a-z0-9-_:]");
	function genId() {
		return _id++;
	}
	function getValidTagName(element) {
		if (element instanceof HTMLFormElement) return "form";
		const processedTagName = toLowerCase(element.tagName);
		if (tagNameRegex.test(processedTagName)) return "div";
		return processedTagName;
	}
	function extractOrigin(url) {
		let origin = "";
		if (url.indexOf("//") > -1) origin = url.split("/").slice(0, 3).join("/");
		else origin = url.split("/")[0];
		origin = origin.split("?")[0];
		return origin;
	}
	let canvasService;
	let canvasCtx;
	const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
	const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
	const URL_WWW_MATCH = /^www\..*/i;
	const DATA_URI = /^(data:)([^,]*),(.*)/i;
	function filterCSSPropertiesFromInlineStyle(cssText, ignoredProperties) {
		if (!cssText || ignoredProperties.size === 0) return cssText;
		try {
			const properties = cssText.split(";");
			const filteredProperties = [];
			for (let property of properties) {
				property = property.trim();
				if (!property) continue;
				const colonIndex = property.indexOf(":");
				if (colonIndex === -1) {
					filteredProperties.push(property);
					continue;
				}
				const propertyName = property.slice(0, colonIndex).trim();
				if (!ignoredProperties.has(propertyName)) filteredProperties.push(property);
			}
			return filteredProperties.join("; ") + (filteredProperties.length > 0 && cssText.endsWith(";") ? ";" : "");
		} catch (error) {
			console.warn("Error filtering CSS properties:", error);
			return cssText;
		}
	}
	function absoluteToStylesheet(cssText, href) {
		return (cssText || "").replace(URL_IN_CSS_REF, (origin, quote1, path1, quote2, path2, path3) => {
			const filePath = path1 || path2 || path3;
			const maybeQuote = quote1 || quote2 || "";
			if (!filePath) return origin;
			if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) return `url(${maybeQuote}${filePath}${maybeQuote})`;
			if (DATA_URI.test(filePath)) return `url(${maybeQuote}${filePath}${maybeQuote})`;
			if (filePath[0] === "/") return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
			const stack = href.split("/");
			const parts = filePath.split("/");
			stack.pop();
			for (const part of parts) if (part === ".") continue;
			else if (part === "..") stack.pop();
			else stack.push(part);
			return `url(${maybeQuote}${stack.join("/")}${maybeQuote})`;
		});
	}
	const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
	const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
	function getAbsoluteSrcsetString(doc, attributeValue) {
		if (attributeValue.trim() === "") return attributeValue;
		let pos = 0;
		function collectCharacters(regEx) {
			let chars2;
			const match = regEx.exec(attributeValue.substring(pos));
			if (match) {
				chars2 = match[0];
				pos += chars2.length;
				return chars2;
			}
			return "";
		}
		const output = [];
		while (true) {
			collectCharacters(SRCSET_COMMAS_OR_SPACES);
			if (pos >= attributeValue.length) break;
			let url = collectCharacters(SRCSET_NOT_SPACES);
			if (url.slice(-1) === ",") {
				url = absoluteToDoc(doc, url.substring(0, url.length - 1));
				output.push(url);
			} else {
				let descriptorsStr = "";
				url = absoluteToDoc(doc, url);
				let inParens = false;
				while (true) {
					const c = attributeValue.charAt(pos);
					if (c === "") {
						output.push((url + descriptorsStr).trim());
						break;
					} else if (!inParens) {
						if (c === ",") {
							pos += 1;
							output.push((url + descriptorsStr).trim());
							break;
						} else if (c === "(") inParens = true;
					} else if (c === ")") inParens = false;
					descriptorsStr += c;
					pos += 1;
				}
			}
		}
		return output.join(", ");
	}
	const cachedDocument = /* @__PURE__ */ new WeakMap();
	function absoluteToDoc(doc, attributeValue) {
		if (!attributeValue || attributeValue.trim() === "") return attributeValue;
		return getHref(doc, attributeValue);
	}
	function isSVGElement(el) {
		return Boolean(el.tagName === "svg" || el.ownerSVGElement);
	}
	function getHref(doc, customHref) {
		let a = cachedDocument.get(doc);
		if (!a) {
			a = doc.createElement("a");
			cachedDocument.set(doc, a);
		}
		if (!customHref) customHref = "";
		else if (customHref.startsWith("blob:") || customHref.startsWith("data:")) return customHref;
		a.setAttribute("href", customHref);
		return a.href;
	}
	function transformAttribute(doc, tagName, name, value, element, maskAttributeFn, ignoreCSSAttributes) {
		if (!value) return value;
		if (name === "src" || name === "href" && !(tagName === "use" && value[0] === "#")) return absoluteToDoc(doc, value);
		else if (name === "xlink:href" && value[0] !== "#") return absoluteToDoc(doc, value);
		else if (name === "background" && (tagName === "table" || tagName === "td" || tagName === "th")) return absoluteToDoc(doc, value);
		else if (name === "srcset") return getAbsoluteSrcsetString(doc, value);
		else if (name === "style") {
			let processedStyle = absoluteToStylesheet(value, getHref(doc));
			if (ignoreCSSAttributes && ignoreCSSAttributes.size > 0) processedStyle = filterCSSPropertiesFromInlineStyle(processedStyle, ignoreCSSAttributes);
			return processedStyle;
		} else if (tagName === "object" && name === "data") return absoluteToDoc(doc, value);
		if (typeof maskAttributeFn === "function") return maskAttributeFn(name, value, element);
		return value;
	}
	function ignoreAttribute(tagName, name, _value) {
		return (tagName === "video" || tagName === "audio") && name === "autoplay";
	}
	function _isBlockedElement(element, blockClass, blockSelector, unblockSelector) {
		try {
			if (unblockSelector && element.matches(unblockSelector)) return false;
			if (typeof blockClass === "string") {
				if (element.classList.contains(blockClass)) return true;
			} else for (let eIndex = element.classList.length; eIndex--;) if (blockClass.test(element.classList[eIndex])) return true;
			if (blockSelector) return element.matches(blockSelector);
		} catch (e) {}
		return false;
	}
	function elementClassMatchesRegex(el, regex) {
		for (let eIndex = el.classList.length; eIndex--;) if (regex.test(el.classList[eIndex])) return true;
		return false;
	}
	function distanceToMatch(node, matchPredicate, limit = 1e400, distance = 0) {
		if (!node) return -1;
		if (isShadowRoot(node)) return distanceToMatch(node.host, matchPredicate, limit, distance + 1);
		if (node.nodeType !== node.ELEMENT_NODE) return -1;
		if (distance > limit) return -1;
		if (matchPredicate(node)) return distance;
		return distanceToMatch(node.parentNode, matchPredicate, limit, distance + 1);
	}
	function createMatchPredicate(className, selector) {
		return (node) => {
			const el = node;
			if (el === null) return false;
			try {
				if (className) {
					if (typeof className === "string") {
						if (el.matches(`.${className}`)) return true;
					} else if (elementClassMatchesRegex(el, className)) return true;
				}
				if (selector && el.matches(selector)) return true;
				return false;
			} catch {
				return false;
			}
		};
	}
	function needMaskingText(node, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, maskAllText) {
		try {
			const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
			if (el === null) return false;
			if (el.tagName === "INPUT") {
				const autocomplete = el.getAttribute("autocomplete");
				if ([
					"current-password",
					"new-password",
					"cc-number",
					"cc-exp",
					"cc-exp-month",
					"cc-exp-year",
					"cc-csc"
				].includes(autocomplete)) return true;
			}
			let maskDistance = -1;
			let unmaskDistance = -1;
			if (maskAllText) {
				unmaskDistance = distanceToMatch(el, createMatchPredicate(unmaskTextClass, unmaskTextSelector));
				if (unmaskDistance < 0) return true;
				maskDistance = distanceToMatch(el, createMatchPredicate(maskTextClass, maskTextSelector), unmaskDistance >= 0 ? unmaskDistance : 1e400);
			} else {
				maskDistance = distanceToMatch(el, createMatchPredicate(maskTextClass, maskTextSelector));
				if (maskDistance < 0) return false;
				unmaskDistance = distanceToMatch(el, createMatchPredicate(unmaskTextClass, unmaskTextSelector), maskDistance >= 0 ? maskDistance : 1e400);
			}
			return maskDistance >= 0 ? unmaskDistance >= 0 ? maskDistance <= unmaskDistance : true : unmaskDistance >= 0 ? false : !!maskAllText;
		} catch (e) {}
		return !!maskAllText;
	}
	function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
		const win = getIFrameContentWindow$1(iframeEl);
		if (!win) return;
		let fired = false;
		let readyState;
		try {
			readyState = win.document.readyState;
		} catch (error) {
			return;
		}
		if (readyState !== "complete") {
			const timer = setTimeout$1$1(() => {
				if (!fired) {
					listener();
					fired = true;
				}
			}, iframeLoadTimeout);
			iframeEl.addEventListener("load", () => {
				clearTimeout$1(timer);
				fired = true;
				listener();
			});
			return;
		}
		const blankUrl = "about:blank";
		if (win.location.href !== blankUrl || iframeEl.src === blankUrl || iframeEl.src === "") {
			setTimeout$1$1(listener, 0);
			return iframeEl.addEventListener("load", listener);
		}
		iframeEl.addEventListener("load", listener);
	}
	function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
		let fired = false;
		let styleSheetLoaded;
		try {
			styleSheetLoaded = link.sheet;
		} catch (error) {
			styleSheetLoaded = null;
		}
		if (styleSheetLoaded) return;
		const timer = setTimeout$1$1(() => {
			if (!fired) {
				listener();
				fired = true;
			}
		}, styleSheetLoadTimeout);
		link.addEventListener("load", () => {
			clearTimeout$1(timer);
			fired = true;
			listener();
		});
	}
	function serializeNode(n, options) {
		const { doc, mirror, blockClass, blockSelector, unblockSelector, maskAllText, maskAttributeFn, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, inlineStylesheet, maskInputOptions = {}, maskTextFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, ignoreCSSAttributes } = options;
		const rootId = getRootId(doc, mirror);
		switch (n.nodeType) {
			case n.DOCUMENT_NODE: if (n.compatMode !== "CSS1Compat") return {
				type: NodeType$1.Document,
				childNodes: [],
				compatMode: n.compatMode
			};
			else return {
				type: NodeType$1.Document,
				childNodes: []
			};
			case n.DOCUMENT_TYPE_NODE: return {
				type: NodeType$1.DocumentType,
				name: n.name,
				publicId: n.publicId,
				systemId: n.systemId,
				rootId
			};
			case n.ELEMENT_NODE: return serializeElementNode(n, {
				doc,
				blockClass,
				blockSelector,
				unblockSelector,
				inlineStylesheet,
				maskAttributeFn,
				maskInputOptions,
				maskInputFn,
				dataURLOptions,
				inlineImages,
				recordCanvas,
				keepIframeSrcFn,
				newlyAddedElement,
				rootId,
				maskTextClass,
				unmaskTextClass,
				maskTextSelector,
				unmaskTextSelector,
				ignoreCSSAttributes
			});
			case n.TEXT_NODE: return serializeTextNode(n, {
				doc,
				maskAllText,
				maskTextClass,
				unmaskTextClass,
				maskTextSelector,
				unmaskTextSelector,
				maskTextFn,
				maskInputOptions,
				maskInputFn,
				rootId
			});
			case n.CDATA_SECTION_NODE: return {
				type: NodeType$1.CDATA,
				textContent: "",
				rootId
			};
			case n.COMMENT_NODE: return {
				type: NodeType$1.Comment,
				textContent: n.textContent || "",
				rootId
			};
			default: return false;
		}
	}
	function getRootId(doc, mirror) {
		if (!mirror.hasNode(doc)) return void 0;
		const docId = mirror.getId(doc);
		return docId === 1 ? void 0 : docId;
	}
	function serializeTextNode(n, options) {
		const { maskAllText, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, maskTextFn, maskInputOptions, maskInputFn, rootId } = options;
		const parentTagName = n.parentNode && n.parentNode.tagName;
		let textContent = n.textContent;
		const isStyle = parentTagName === "STYLE" ? true : void 0;
		const isScript = parentTagName === "SCRIPT" ? true : void 0;
		const isTextarea = parentTagName === "TEXTAREA" ? true : void 0;
		if (isStyle && textContent) {
			try {
				if (n.nextSibling || n.previousSibling) {} else if (n.parentNode.sheet?.cssRules) textContent = stringifyStylesheet(n.parentNode.sheet);
			} catch (err) {
				console.warn(`Cannot get CSS styles from text's parentNode. Error: ${err}`, n);
			}
			textContent = absoluteToStylesheet(textContent, getHref(options.doc));
		}
		if (isScript) textContent = "SCRIPT_PLACEHOLDER";
		const forceMask = needMaskingText(n, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, maskAllText);
		if (!isStyle && !isScript && !isTextarea && textContent && forceMask) textContent = maskTextFn ? maskTextFn(textContent, n.parentElement) : textContent.replace(/[\S]/g, "*");
		if (isTextarea && textContent && (maskInputOptions.textarea || forceMask)) textContent = maskInputFn ? maskInputFn(textContent, n.parentNode) : textContent.replace(/[\S]/g, "*");
		if (parentTagName === "OPTION" && textContent) textContent = maskInputValue({
			isMasked: needMaskingText(n, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, shouldMaskInput({
				type: null,
				tagName: parentTagName,
				maskInputOptions
			})),
			element: n,
			value: textContent,
			maskInputFn
		});
		return {
			type: NodeType$1.Text,
			textContent: textContent || "",
			isStyle,
			rootId
		};
	}
	function serializeElementNode(n, options) {
		const { doc, blockClass, blockSelector, unblockSelector, inlineStylesheet, maskInputOptions = {}, maskAttributeFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, rootId, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, ignoreCSSAttributes } = options;
		const needBlock = _isBlockedElement(n, blockClass, blockSelector, unblockSelector);
		const tagName = getValidTagName(n);
		let attributes = {};
		const len = n.attributes.length;
		for (let i = 0; i < len; i++) {
			const attr = n.attributes[i];
			if (attr.name && !ignoreAttribute(tagName, attr.name, attr.value)) attributes[attr.name] = transformAttribute(doc, tagName, toLowerCase(attr.name), attr.value, n, maskAttributeFn, ignoreCSSAttributes);
		}
		if (tagName === "link" && inlineStylesheet) {
			const stylesheet = Array.from(doc.styleSheets).find((s) => {
				return s.href === n.href;
			});
			let cssText = null;
			if (stylesheet) cssText = stringifyStylesheet(stylesheet);
			if (cssText) {
				attributes.rel = null;
				attributes.href = null;
				attributes.crossorigin = null;
				attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
			}
		}
		if (tagName === "style" && n.sheet && !(n.innerText || n.textContent || "").trim().length) {
			const cssText = stringifyStylesheet(n.sheet);
			if (cssText) attributes._cssText = absoluteToStylesheet(cssText, getHref(doc));
		}
		if (tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "option") {
			const el = n;
			const type = getInputType(el);
			const value = getInputValue(el, toUpperCase(tagName), type);
			const checked = el.checked;
			if (type !== "submit" && type !== "button" && (value || attributes.value)) {
				const forceMask = needMaskingText(el, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, shouldMaskInput({
					type,
					tagName: toUpperCase(tagName),
					maskInputOptions
				}));
				attributes.value = maskInputValue({
					isMasked: forceMask,
					element: el,
					value,
					maskInputFn
				});
			}
			if (checked) attributes.checked = checked;
		}
		if (tagName === "option") {
			if (n.selected && !maskInputOptions["select"]) attributes.selected = true;
			else delete attributes.selected;
		}
		if (tagName === "canvas" && recordCanvas) {
			if (n.__context === "2d") {
				if (!is2DCanvasBlank(n)) attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
			} else if (!("__context" in n)) {
				const canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
				const blankCanvas = doc.createElement("canvas");
				blankCanvas.width = n.width;
				blankCanvas.height = n.height;
				if (canvasDataURL !== blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality)) attributes.rr_dataURL = canvasDataURL;
			}
		}
		if (tagName === "img" && inlineImages) {
			if (!canvasService) {
				canvasService = doc.createElement("canvas");
				canvasCtx = canvasService.getContext("2d");
			}
			const image = n;
			const imageSrc = image.currentSrc || image.getAttribute("src") || "<unknown-src>";
			const priorCrossOrigin = image.crossOrigin;
			const recordInlineImage = () => {
				image.removeEventListener("load", recordInlineImage);
				try {
					canvasService.width = image.naturalWidth;
					canvasService.height = image.naturalHeight;
					canvasCtx.drawImage(image, 0, 0);
					attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
				} catch (err) {
					if (image.crossOrigin !== "anonymous") {
						image.crossOrigin = "anonymous";
						if (image.complete && image.naturalWidth !== 0) recordInlineImage();
						else image.addEventListener("load", recordInlineImage);
						return;
					} else console.warn(`Cannot inline img src=${imageSrc}! Error: ${err}`);
				}
				if (image.crossOrigin === "anonymous") priorCrossOrigin ? attributes.crossOrigin = priorCrossOrigin : image.removeAttribute("crossorigin");
			};
			if (image.complete && image.naturalWidth !== 0) recordInlineImage();
			else image.addEventListener("load", recordInlineImage);
		}
		if (tagName === "audio" || tagName === "video") {
			attributes.rr_mediaState = n.paused ? "paused" : "played";
			attributes.rr_mediaCurrentTime = n.currentTime;
		}
		if (!newlyAddedElement) {
			if (n.scrollLeft) attributes.rr_scrollLeft = n.scrollLeft;
			if (n.scrollTop) attributes.rr_scrollTop = n.scrollTop;
		}
		if (needBlock) {
			const { width, height } = n.getBoundingClientRect();
			attributes = {
				class: attributes.class,
				rr_width: `${width}px`,
				rr_height: `${height}px`
			};
		}
		if (tagName === "iframe" && !keepIframeSrcFn(attributes.src)) {
			if (!needBlock && !getIFrameContentDocument$1(n)) attributes.rr_src = attributes.src;
			delete attributes.src;
		}
		let isCustomElement;
		try {
			if (customElements.get(tagName)) isCustomElement = true;
		} catch (e) {}
		return {
			type: NodeType$1.Element,
			tagName,
			attributes,
			childNodes: [],
			isSVG: isSVGElement(n) || void 0,
			needBlock,
			rootId,
			isCustom: isCustomElement
		};
	}
	function lowerIfExists(maybeAttr) {
		if (maybeAttr === void 0 || maybeAttr === null) return "";
		else return maybeAttr.toLowerCase();
	}
	function slimDOMExcluded(sn, slimDOMOptions) {
		if (slimDOMOptions.comment && sn.type === NodeType$1.Comment) return true;
		else if (sn.type === NodeType$1.Element) {
			if (slimDOMOptions.script && (sn.tagName === "script" || sn.tagName === "link" && (sn.attributes.rel === "preload" || sn.attributes.rel === "modulepreload") || sn.tagName === "link" && sn.attributes.rel === "prefetch" && typeof sn.attributes.href === "string" && extractFileExtension(sn.attributes.href) === "js")) return true;
			else if (slimDOMOptions.headFavicon && (sn.tagName === "link" && sn.attributes.rel === "shortcut icon" || sn.tagName === "meta" && (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) || lowerIfExists(sn.attributes.name) === "application-name" || lowerIfExists(sn.attributes.rel) === "icon" || lowerIfExists(sn.attributes.rel) === "apple-touch-icon" || lowerIfExists(sn.attributes.rel) === "shortcut icon"))) return true;
			else if (sn.tagName === "meta") {
				if (slimDOMOptions.headMetaDescKeywords && lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) return true;
				else if (slimDOMOptions.headMetaSocial && (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) || lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) || lowerIfExists(sn.attributes.name) === "pinterest")) return true;
				else if (slimDOMOptions.headMetaRobots && (lowerIfExists(sn.attributes.name) === "robots" || lowerIfExists(sn.attributes.name) === "googlebot" || lowerIfExists(sn.attributes.name) === "bingbot")) return true;
				else if (slimDOMOptions.headMetaHttpEquiv && sn.attributes["http-equiv"] !== void 0) return true;
				else if (slimDOMOptions.headMetaAuthorship && (lowerIfExists(sn.attributes.name) === "author" || lowerIfExists(sn.attributes.name) === "generator" || lowerIfExists(sn.attributes.name) === "framework" || lowerIfExists(sn.attributes.name) === "publisher" || lowerIfExists(sn.attributes.name) === "progid" || lowerIfExists(sn.attributes.property).match(/^article:/) || lowerIfExists(sn.attributes.property).match(/^product:/))) return true;
				else if (slimDOMOptions.headMetaVerification && (lowerIfExists(sn.attributes.name) === "google-site-verification" || lowerIfExists(sn.attributes.name) === "yandex-verification" || lowerIfExists(sn.attributes.name) === "csrf-token" || lowerIfExists(sn.attributes.name) === "p:domain_verify" || lowerIfExists(sn.attributes.name) === "verify-v1" || lowerIfExists(sn.attributes.name) === "verification" || lowerIfExists(sn.attributes.name) === "shopify-checkout-api-token")) return true;
			}
		}
		return false;
	}
	function serializeNodeWithId(n, options) {
		const { doc, mirror, blockClass, blockSelector, unblockSelector, maskAllText, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, skipChild = false, inlineStylesheet = true, maskInputOptions = {}, maskAttributeFn, maskTextFn, maskInputFn, slimDOMOptions, dataURLOptions = {}, inlineImages = false, recordCanvas = false, onSerialize, onIframeLoad, iframeLoadTimeout = 5e3, onBlockedImageLoad, onStylesheetLoad, stylesheetLoadTimeout = 5e3, keepIframeSrcFn = () => false, newlyAddedElement = false, ignoreCSSAttributes } = options;
		let { preserveWhiteSpace = true } = options;
		const _serializedNode = serializeNode(n, {
			doc,
			mirror,
			blockClass,
			blockSelector,
			maskAllText,
			unblockSelector,
			maskTextClass,
			unmaskTextClass,
			maskTextSelector,
			unmaskTextSelector,
			inlineStylesheet,
			maskInputOptions,
			maskAttributeFn,
			maskTextFn,
			maskInputFn,
			dataURLOptions,
			inlineImages,
			recordCanvas,
			keepIframeSrcFn,
			newlyAddedElement,
			ignoreCSSAttributes
		});
		if (!_serializedNode) {
			console.warn(n, "not serialized");
			return null;
		}
		let id;
		if (mirror.hasNode(n)) id = mirror.getId(n);
		else if (slimDOMExcluded(_serializedNode, slimDOMOptions) || !preserveWhiteSpace && _serializedNode.type === NodeType$1.Text && !_serializedNode.isStyle && !_serializedNode.textContent.trim().length) id = -2;
		else id = genId();
		const serializedNode = Object.assign(_serializedNode, { id });
		mirror.add(n, serializedNode);
		if (id === -2) return null;
		if (onSerialize) onSerialize(n);
		let recordChild = !skipChild;
		if (serializedNode.type === NodeType$1.Element) {
			recordChild = recordChild && !serializedNode.needBlock;
			const shadowRoot = n.shadowRoot;
			if (shadowRoot && isNativeShadowDom(shadowRoot)) serializedNode.isShadowHost = true;
		}
		if ((serializedNode.type === NodeType$1.Document || serializedNode.type === NodeType$1.Element) && recordChild) {
			if (slimDOMOptions.headWhitespace && serializedNode.type === NodeType$1.Element && serializedNode.tagName === "head") preserveWhiteSpace = false;
			const bypassOptions = {
				doc,
				mirror,
				blockClass,
				blockSelector,
				maskAllText,
				unblockSelector,
				maskTextClass,
				unmaskTextClass,
				maskTextSelector,
				unmaskTextSelector,
				skipChild,
				inlineStylesheet,
				maskInputOptions,
				maskAttributeFn,
				maskTextFn,
				maskInputFn,
				slimDOMOptions,
				dataURLOptions,
				inlineImages,
				recordCanvas,
				preserveWhiteSpace,
				onSerialize,
				onIframeLoad,
				iframeLoadTimeout,
				onBlockedImageLoad,
				onStylesheetLoad,
				stylesheetLoadTimeout,
				keepIframeSrcFn,
				ignoreCSSAttributes
			};
			const childNodes = n.childNodes ? Array.from(n.childNodes) : [];
			for (const childN of childNodes) {
				const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
				if (serializedChildNode) serializedNode.childNodes.push(serializedChildNode);
			}
			if (isElement$1(n) && n.shadowRoot) for (const childN of Array.from(n.shadowRoot.childNodes)) {
				const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
				if (serializedChildNode) {
					isNativeShadowDom(n.shadowRoot) && (serializedChildNode.isShadow = true);
					serializedNode.childNodes.push(serializedChildNode);
				}
			}
		}
		if (n.parentNode && isShadowRoot(n.parentNode) && isNativeShadowDom(n.parentNode)) serializedNode.isShadow = true;
		if (serializedNode.type === NodeType$1.Element && serializedNode.tagName === "iframe" && !serializedNode.needBlock) onceIframeLoaded(n, () => {
			const iframeDoc = getIFrameContentDocument$1(n);
			if (iframeDoc && onIframeLoad) {
				const serializedIframeNode = serializeNodeWithId(iframeDoc, {
					doc: iframeDoc,
					mirror,
					blockClass,
					blockSelector,
					unblockSelector,
					maskAllText,
					maskTextClass,
					unmaskTextClass,
					maskTextSelector,
					unmaskTextSelector,
					skipChild: false,
					inlineStylesheet,
					maskInputOptions,
					maskAttributeFn,
					maskTextFn,
					maskInputFn,
					slimDOMOptions,
					dataURLOptions,
					inlineImages,
					recordCanvas,
					preserveWhiteSpace,
					onSerialize,
					onIframeLoad,
					iframeLoadTimeout,
					onStylesheetLoad,
					stylesheetLoadTimeout,
					keepIframeSrcFn,
					ignoreCSSAttributes
				});
				if (serializedIframeNode) onIframeLoad(n, serializedIframeNode);
			}
		}, iframeLoadTimeout);
		if (serializedNode.type === NodeType$1.Element && serializedNode.tagName === "img" && !n.complete && serializedNode.needBlock) {
			const image = n;
			const updateImageDimensions = () => {
				if (image.isConnected && !image.complete && onBlockedImageLoad) try {
					const rect = image.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) onBlockedImageLoad(image, serializedNode, rect);
				} catch (error) {}
				image.removeEventListener("load", updateImageDimensions);
			};
			if (image.isConnected) image.addEventListener("load", updateImageDimensions);
		}
		if (serializedNode.type === NodeType$1.Element && serializedNode.tagName === "link" && typeof serializedNode.attributes.rel === "string" && (serializedNode.attributes.rel === "stylesheet" || serializedNode.attributes.rel === "preload" && typeof serializedNode.attributes.href === "string" && extractFileExtension(serializedNode.attributes.href) === "css")) onceStylesheetLoaded(n, () => {
			if (onStylesheetLoad) {
				const serializedLinkNode = serializeNodeWithId(n, {
					doc,
					mirror,
					blockClass,
					blockSelector,
					unblockSelector,
					maskAllText,
					maskTextClass,
					unmaskTextClass,
					maskTextSelector,
					unmaskTextSelector,
					skipChild: false,
					inlineStylesheet,
					maskInputOptions,
					maskAttributeFn,
					maskTextFn,
					maskInputFn,
					slimDOMOptions,
					dataURLOptions,
					inlineImages,
					recordCanvas,
					preserveWhiteSpace,
					onSerialize,
					onIframeLoad,
					iframeLoadTimeout,
					onStylesheetLoad,
					stylesheetLoadTimeout,
					keepIframeSrcFn,
					ignoreCSSAttributes
				});
				if (serializedLinkNode) onStylesheetLoad(n, serializedLinkNode);
			}
		}, stylesheetLoadTimeout);
		if (serializedNode.type === NodeType$1.Element) delete serializedNode.needBlock;
		return serializedNode;
	}
	function snapshot(n, options) {
		const { mirror = new Mirror(), blockClass = "rr-block", blockSelector = null, unblockSelector = null, maskAllText = false, maskTextClass = "rr-mask", unmaskTextClass = null, maskTextSelector = null, unmaskTextSelector = null, inlineStylesheet = true, inlineImages = false, recordCanvas = false, maskAllInputs = false, maskAttributeFn, maskTextFn, maskInputFn, slimDOM = false, dataURLOptions, preserveWhiteSpace, onSerialize, onIframeLoad, iframeLoadTimeout, onBlockedImageLoad, onStylesheetLoad, stylesheetLoadTimeout, keepIframeSrcFn = () => false, ignoreCSSAttributes = /* @__PURE__ */ new Set([]) } = options || {};
		return serializeNodeWithId(n, {
			doc: n,
			mirror,
			blockClass,
			blockSelector,
			unblockSelector,
			maskAllText,
			maskTextClass,
			unmaskTextClass,
			maskTextSelector,
			unmaskTextSelector,
			skipChild: false,
			inlineStylesheet,
			maskInputOptions: maskAllInputs === true ? {
				color: true,
				date: true,
				"datetime-local": true,
				email: true,
				month: true,
				number: true,
				range: true,
				search: true,
				tel: true,
				text: true,
				time: true,
				url: true,
				week: true,
				hidden: true,
				textarea: true,
				select: true
			} : maskAllInputs === false ? {} : maskAllInputs,
			maskAttributeFn,
			maskTextFn,
			maskInputFn,
			slimDOMOptions: slimDOM === true || slimDOM === "all" ? {
				script: true,
				comment: true,
				headFavicon: true,
				headWhitespace: true,
				headMetaDescKeywords: slimDOM === "all",
				headMetaSocial: true,
				headMetaRobots: true,
				headMetaHttpEquiv: true,
				headMetaAuthorship: true,
				headMetaVerification: true
			} : slimDOM === false ? {} : slimDOM,
			dataURLOptions,
			inlineImages,
			recordCanvas,
			preserveWhiteSpace,
			onSerialize,
			onIframeLoad,
			iframeLoadTimeout,
			onBlockedImageLoad,
			onStylesheetLoad,
			stylesheetLoadTimeout,
			keepIframeSrcFn,
			newlyAddedElement: false,
			ignoreCSSAttributes
		});
	}
	new RegExp(/([^\\]):hover/.source, "g");
	function on(type, fn, target = document) {
		const options = {
			capture: true,
			passive: true
		};
		target.addEventListener(type, fn, options);
		return () => target.removeEventListener(type, fn, options);
	}
	const DEPARTED_MIRROR_ACCESS_WARNING = "Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";
	let _mirror = {
		map: {},
		getId() {
			console.error(DEPARTED_MIRROR_ACCESS_WARNING);
			return -1;
		},
		getNode() {
			console.error(DEPARTED_MIRROR_ACCESS_WARNING);
			return null;
		},
		removeNodeFromMap() {
			console.error(DEPARTED_MIRROR_ACCESS_WARNING);
		},
		has() {
			console.error(DEPARTED_MIRROR_ACCESS_WARNING);
			return false;
		},
		reset() {
			console.error(DEPARTED_MIRROR_ACCESS_WARNING);
		}
	};
	if (typeof window !== "undefined" && window.Proxy && window.Reflect) _mirror = new Proxy(_mirror, { get(target, prop, receiver) {
		if (prop === "map") console.error(DEPARTED_MIRROR_ACCESS_WARNING);
		return Reflect.get(target, prop, receiver);
	} });
	function throttle$1(func, wait, options = {}) {
		let timeout = null;
		let previous = 0;
		return function(...args) {
			const now = Date.now();
			if (!previous && options.leading === false) previous = now;
			const remaining = wait - (now - previous);
			const context = this;
			if (remaining <= 0 || remaining > wait) {
				if (timeout) {
					clearTimeout$2(timeout);
					timeout = null;
				}
				previous = now;
				func.apply(context, args);
			} else if (!timeout && options.trailing !== false) timeout = setTimeout$2(() => {
				previous = options.leading === false ? 0 : Date.now();
				timeout = null;
				func.apply(context, args);
			}, remaining);
		};
	}
	function hookSetter(target, key, d, isRevoked, win = window) {
		const original = win.Object.getOwnPropertyDescriptor(target, key);
		win.Object.defineProperty(target, key, isRevoked ? d : { set(value) {
			setTimeout$2(() => {
				d.set.call(this, value);
			}, 0);
			if (original && original.set) original.set.call(this, value);
		} });
		return () => hookSetter(target, key, original || {}, true);
	}
	function patch(source, name, replacement) {
		try {
			if (!(name in source)) return () => {};
			const original = source[name];
			const wrapped = replacement(original);
			if (typeof wrapped === "function") {
				wrapped.prototype = wrapped.prototype || {};
				Object.defineProperties(wrapped, { __rrweb_original__: {
					enumerable: false,
					value: original
				} });
			}
			source[name] = wrapped;
			return () => {
				source[name] = original;
			};
		} catch {
			return () => {};
		}
	}
	let nowTimestamp = Date.now;
	if (!/* @__PURE__ */ /[1-9][0-9]{12}/.test(Date.now().toString())) nowTimestamp = () => (/* @__PURE__ */ new Date()).getTime();
	function getWindowScroll(win) {
		const doc = win.document;
		return {
			left: doc.scrollingElement ? doc.scrollingElement.scrollLeft : win.pageXOffset !== void 0 ? win.pageXOffset : doc?.documentElement.scrollLeft || doc?.body?.parentElement?.scrollLeft || doc?.body?.scrollLeft || 0,
			top: doc.scrollingElement ? doc.scrollingElement.scrollTop : win.pageYOffset !== void 0 ? win.pageYOffset : doc?.documentElement.scrollTop || doc?.body?.parentElement?.scrollTop || doc?.body?.scrollTop || 0
		};
	}
	function getWindowHeight() {
		return window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body && document.body.clientHeight;
	}
	function getWindowWidth() {
		return window.innerWidth || document.documentElement && document.documentElement.clientWidth || document.body && document.body.clientWidth;
	}
	function closestElementOfNode$1(node) {
		if (!node) return null;
		try {
			return node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
		} catch (error) {
			return null;
		}
	}
	function isBlocked(node, blockClass, blockSelector, unblockSelector, checkAncestors) {
		if (!node) return false;
		const el = closestElementOfNode$1(node);
		if (!el) return false;
		const blockedPredicate = createMatchPredicate(blockClass, blockSelector);
		if (!checkAncestors) {
			const isUnblocked = unblockSelector && el.matches(unblockSelector);
			return blockedPredicate(el) && !isUnblocked;
		}
		const blockDistance = distanceToMatch(el, blockedPredicate);
		let unblockDistance = -1;
		if (blockDistance < 0) return false;
		if (unblockSelector) unblockDistance = distanceToMatch(el, createMatchPredicate(null, unblockSelector));
		if (blockDistance > -1 && unblockDistance < 0) return true;
		return blockDistance < unblockDistance;
	}
	function isSerialized(n, mirror) {
		return mirror.getId(n) !== -1;
	}
	function isIgnored(n, mirror) {
		return mirror.getId(n) === -2;
	}
	function isAncestorRemoved(target, mirror) {
		if (isShadowRoot(target)) return false;
		const id = mirror.getId(target);
		if (!mirror.has(id)) return true;
		if (target.parentNode && target.parentNode.nodeType === target.DOCUMENT_NODE) return false;
		if (!target.parentNode) return true;
		return isAncestorRemoved(target.parentNode, mirror);
	}
	function legacy_isTouchEvent(event) {
		return Boolean(event.changedTouches);
	}
	function polyfill(win = window) {
		if ("NodeList" in win && !win.NodeList.prototype.forEach) win.NodeList.prototype.forEach = Array.prototype.forEach;
		if ("DOMTokenList" in win && !win.DOMTokenList.prototype.forEach) win.DOMTokenList.prototype.forEach = Array.prototype.forEach;
		if (!Node.prototype.contains) Node.prototype.contains = (...args) => {
			let node = args[0];
			if (!(0 in args)) throw new TypeError("1 argument is required");
			do
				if (this === node) return true;
			while (node = node && node.parentNode);
			return false;
		};
	}
	function isSerializedIframe(n, mirror) {
		return Boolean(n.nodeName === "IFRAME" && mirror.getMeta(n));
	}
	function isSerializedStylesheet(n, mirror) {
		return Boolean(n.nodeName === "LINK" && n.nodeType === n.ELEMENT_NODE && n.getAttribute && n.getAttribute("rel") === "stylesheet" && mirror.getMeta(n));
	}
	function hasShadowRoot(n) {
		return Boolean(n?.shadowRoot);
	}
	var StyleSheetMirror = class {
		constructor() {
			this.id = 1;
			this.styleIDMap = /* @__PURE__ */ new WeakMap();
			this.idStyleMap = /* @__PURE__ */ new Map();
		}
		getId(stylesheet) {
			return this.styleIDMap.get(stylesheet) ?? -1;
		}
		has(stylesheet) {
			return this.styleIDMap.has(stylesheet);
		}
		/**
		* @returns If the stylesheet is in the mirror, returns the id of the stylesheet. If not, return the new assigned id.
		*/
		add(stylesheet, id) {
			if (this.has(stylesheet)) return this.getId(stylesheet);
			let newId;
			if (id === void 0) newId = this.id++;
			else newId = id;
			this.styleIDMap.set(stylesheet, newId);
			this.idStyleMap.set(newId, stylesheet);
			return newId;
		}
		getStyle(id) {
			return this.idStyleMap.get(id) || null;
		}
		reset() {
			this.styleIDMap = /* @__PURE__ */ new WeakMap();
			this.idStyleMap = /* @__PURE__ */ new Map();
			this.id = 1;
		}
		generateId() {
			return this.id++;
		}
	};
	function getShadowHost(n) {
		let shadowHost = null;
		if (n.getRootNode?.()?.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.getRootNode().host) shadowHost = n.getRootNode().host;
		return shadowHost;
	}
	function getRootShadowHost(n) {
		let rootShadowHost = n;
		let shadowHost;
		while (shadowHost = getShadowHost(rootShadowHost)) rootShadowHost = shadowHost;
		return rootShadowHost;
	}
	function shadowHostInDom(n) {
		const doc = n.ownerDocument;
		if (!doc) return false;
		const shadowHost = getRootShadowHost(n);
		return doc.contains(shadowHost);
	}
	function inDom(n) {
		const doc = n.ownerDocument;
		if (!doc) return false;
		return doc.contains(n) || shadowHostInDom(n);
	}
	const cachedImplementations$2 = {};
	function getImplementation(name) {
		const cached = cachedImplementations$2[name];
		if (cached) return cached;
		const windowImpl = window[name].bind(window);
		let impl = windowImpl;
		const document2 = window.document;
		if (document2 && typeof document2.createElement === "function") try {
			const sandbox = document2.createElement("iframe");
			sandbox.hidden = true;
			document2.head.appendChild(sandbox);
			const contentWindow = sandbox.contentWindow;
			if (contentWindow && contentWindow[name]) {
				const sandboxImpl = contentWindow[name].bind(window);
				impl = (...args) => {
					try {
						return sandboxImpl(...args);
					} catch {
						cachedImplementations$2[name] = windowImpl;
						return windowImpl(...args);
					}
				};
			}
			document2.head.removeChild(sandbox);
		} catch (e) {}
		return cachedImplementations$2[name] = impl;
	}
	function onRequestAnimationFrame(...rest) {
		return getImplementation("requestAnimationFrame")(...rest);
	}
	function setTimeout$2(...rest) {
		return getImplementation("setTimeout")(...rest);
	}
	function clearTimeout$2(...rest) {
		return getImplementation("clearTimeout")(...rest);
	}
	function runAll(handlers) {
		const errors = [];
		for (const handler of handlers) try {
			handler();
		} catch (error) {
			errors.push(error);
		}
		return errors;
	}
	var EventType = /* @__PURE__ */ ((EventType2) => {
		EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
		EventType2[EventType2["Load"] = 1] = "Load";
		EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
		EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
		EventType2[EventType2["Meta"] = 4] = "Meta";
		EventType2[EventType2["Custom"] = 5] = "Custom";
		EventType2[EventType2["Plugin"] = 6] = "Plugin";
		return EventType2;
	})(EventType || {});
	var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
		IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
		IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
		IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
		IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
		IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
		IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
		IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
		IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
		IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
		IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
		IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
		IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
		IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
		IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
		IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
		IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
		IncrementalSource2[IncrementalSource2["CustomElement"] = 16] = "CustomElement";
		return IncrementalSource2;
	})(IncrementalSource || {});
	var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
		MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
		MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
		MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
		MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
		MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
		MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
		MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
		MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
		MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
		MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
		MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
		return MouseInteractions2;
	})(MouseInteractions || {});
	var PointerTypes = /* @__PURE__ */ ((PointerTypes2) => {
		PointerTypes2[PointerTypes2["Mouse"] = 0] = "Mouse";
		PointerTypes2[PointerTypes2["Pen"] = 1] = "Pen";
		PointerTypes2[PointerTypes2["Touch"] = 2] = "Touch";
		return PointerTypes2;
	})(PointerTypes || {});
	var MediaInteractions = /* @__PURE__ */ ((MediaInteractions2) => {
		MediaInteractions2[MediaInteractions2["Play"] = 0] = "Play";
		MediaInteractions2[MediaInteractions2["Pause"] = 1] = "Pause";
		MediaInteractions2[MediaInteractions2["Seeked"] = 2] = "Seeked";
		MediaInteractions2[MediaInteractions2["VolumeChange"] = 3] = "VolumeChange";
		MediaInteractions2[MediaInteractions2["RateChange"] = 4] = "RateChange";
		return MediaInteractions2;
	})(MediaInteractions || {});
	let errorHandler;
	function registerErrorHandler(handler) {
		errorHandler = handler;
	}
	function unregisterErrorHandler() {
		errorHandler = void 0;
	}
	const callbackWrapper = (cb) => {
		if (!errorHandler) return cb;
		const rrwebWrapped = ((...rest) => {
			try {
				return cb(...rest);
			} catch (error) {
				if (errorHandler && errorHandler(error) === true) return () => {};
				throw error;
			}
		});
		return rrwebWrapped;
	};
	var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var lookup = typeof Uint8Array === "undefined" ? [] : /* @__PURE__ */ new Uint8Array(256);
	for (var i$1 = 0; i$1 < chars.length; i$1++) lookup[chars.charCodeAt(i$1)] = i$1;
	var CanvasManagerNoop = class {
		reset() {}
		freeze() {}
		unfreeze() {}
		lock() {}
		unlock() {}
		snapshot() {}
		addWindow() {}
		addShadowRoot() {}
		resetShadowRoots() {}
	};
	// ../../node_modules/.pnpm/@sentry+rrweb@2.46.0/node_modules/@sentry/rrweb/dist/rrweb.js
	function getIFrameContentDocument(iframe) {
		try {
			return iframe.contentDocument;
		} catch (e2) {}
	}
	function getIFrameContentWindow(iframe) {
		try {
			return iframe.contentWindow;
		} catch (e2) {}
	}
	var StyleDeclarationParser = class {
		constructor(doc) {
			this.doc = doc;
			this.unattachedDoc = null;
		}
		parse(styleText) {
			return this.parseWithConstructableStylesheet(styleText) || this.parseWithDetachedElement(styleText);
		}
		parseWithConstructableStylesheet(styleText) {
			if (typeof CSSStyleSheet === "undefined" || typeof CSSStyleSheet.prototype.replaceSync !== "function") return null;
			try {
				const sheet = new CSSStyleSheet();
				sheet.replaceSync(`x { ${styleText} }`);
				const rule = sheet.cssRules[0];
				if (!rule || rule.type !== CSSRule.STYLE_RULE) return null;
				return rule.style;
			} catch {
				return null;
			}
		}
		parseWithDetachedElement(styleText) {
			const old = this.getUnattachedDoc().createElement("span");
			old.setAttribute("style", styleText);
			return old.style;
		}
		getUnattachedDoc() {
			if (!this.unattachedDoc) try {
				this.unattachedDoc = document.implementation.createHTMLDocument();
			} catch {
				this.unattachedDoc = this.doc;
			}
			return this.unattachedDoc;
		}
	};
	function isNodeInLinkedList(n2) {
		return "__ln" in n2;
	}
	var DoubleLinkedList = class {
		constructor() {
			this.length = 0;
			this.head = null;
			this.tail = null;
		}
		get(position) {
			if (position >= this.length) throw new Error("Position outside of list range");
			let current = this.head;
			for (let index = 0; index < position; index++) current = current?.next || null;
			return current;
		}
		addNode(n2) {
			const node = {
				value: n2,
				previous: null,
				next: null
			};
			n2.__ln = node;
			if (n2.previousSibling && isNodeInLinkedList(n2.previousSibling)) {
				const current = n2.previousSibling.__ln.next;
				node.next = current;
				node.previous = n2.previousSibling.__ln;
				n2.previousSibling.__ln.next = node;
				if (current) current.previous = node;
			} else if (n2.nextSibling && isNodeInLinkedList(n2.nextSibling) && n2.nextSibling.__ln.previous) {
				const current = n2.nextSibling.__ln.previous;
				node.previous = current;
				node.next = n2.nextSibling.__ln;
				n2.nextSibling.__ln.previous = node;
				if (current) current.next = node;
			} else {
				if (this.head) this.head.previous = node;
				node.next = this.head;
				this.head = node;
			}
			if (node.next === null) this.tail = node;
			this.length++;
		}
		removeNode(n2) {
			const current = n2.__ln;
			if (!this.head) return;
			if (!current.previous) {
				this.head = current.next;
				if (this.head) this.head.previous = null;
				else this.tail = null;
			} else {
				current.previous.next = current.next;
				if (current.next) current.next.previous = current.previous;
				else this.tail = current.previous;
			}
			if (n2.__ln) delete n2.__ln;
			this.length--;
		}
	};
	const moveKey = (id, parentId) => `${id}@${parentId}`;
	var MutationBuffer = class {
		constructor() {
			this.frozen = false;
			this.locked = false;
			this.texts = [];
			this.attributes = [];
			this.attributeMap = /* @__PURE__ */ new WeakMap();
			this.removes = [];
			this.mapRemoves = [];
			this.movedMap = {};
			this.addedSet = /* @__PURE__ */ new Set();
			this.movedSet = /* @__PURE__ */ new Set();
			this.droppedSet = /* @__PURE__ */ new Set();
			this.processMutations = (mutations) => {
				mutations.forEach(this.processMutation);
				this.emit();
			};
			this.emit = () => {
				if (this.frozen || this.locked) return;
				const adds = [];
				const addedIds = /* @__PURE__ */ new Set();
				const addList = new DoubleLinkedList();
				const getNextId = (n2) => {
					let ns = n2;
					let nextId = -2;
					while (nextId === -2) {
						ns = ns && ns.nextSibling;
						nextId = ns && this.mirror.getId(ns);
					}
					return nextId;
				};
				const pushAdd = (n2) => {
					if (!n2.parentNode || !inDom(n2)) return;
					const parentId = isShadowRoot(n2.parentNode) ? this.mirror.getId(getShadowHost(n2)) : this.mirror.getId(n2.parentNode);
					const nextId = getNextId(n2);
					if (parentId === -1 || nextId === -1) return addList.addNode(n2);
					const sn = serializeNodeWithId(n2, {
						doc: this.doc,
						mirror: this.mirror,
						blockClass: this.blockClass,
						blockSelector: this.blockSelector,
						maskAllText: this.maskAllText,
						unblockSelector: this.unblockSelector,
						maskTextClass: this.maskTextClass,
						unmaskTextClass: this.unmaskTextClass,
						maskTextSelector: this.maskTextSelector,
						unmaskTextSelector: this.unmaskTextSelector,
						skipChild: true,
						newlyAddedElement: true,
						inlineStylesheet: this.inlineStylesheet,
						maskInputOptions: this.maskInputOptions,
						maskAttributeFn: this.maskAttributeFn,
						maskTextFn: this.maskTextFn,
						maskInputFn: this.maskInputFn,
						slimDOMOptions: this.slimDOMOptions,
						dataURLOptions: this.dataURLOptions,
						recordCanvas: this.recordCanvas,
						inlineImages: this.inlineImages,
						onSerialize: (currentN) => {
							if (isSerializedIframe(currentN, this.mirror) && !isBlocked(currentN, this.blockClass, this.blockSelector, this.unblockSelector, false)) this.iframeManager.addIframe(currentN);
							if (isSerializedStylesheet(currentN, this.mirror)) this.stylesheetManager.trackLinkElement(currentN);
							if (hasShadowRoot(n2)) this.shadowDomManager.addShadowRoot(n2.shadowRoot, this.doc);
						},
						onIframeLoad: (iframe, childSn) => {
							if (isBlocked(iframe, this.blockClass, this.blockSelector, this.unblockSelector, false)) return;
							this.iframeManager.attachIframe(iframe, childSn);
							const contentWindow = getIFrameContentWindow(iframe);
							if (contentWindow) this.canvasManager.addWindow(contentWindow);
							this.shadowDomManager.observeAttachShadow(iframe);
						},
						onStylesheetLoad: (link, childSn) => {
							this.stylesheetManager.attachLinkElement(link, childSn);
						},
						onBlockedImageLoad: (_imageEl, serializedNode, { width, height }) => {
							this.mutationCb({
								adds: [],
								removes: [],
								texts: [],
								attributes: [{
									id: serializedNode.id,
									attributes: { style: {
										width: `${width}px`,
										height: `${height}px`
									} }
								}]
							});
						},
						ignoreCSSAttributes: this.ignoreCSSAttributes
					});
					if (sn) {
						adds.push({
							parentId,
							nextId,
							node: sn
						});
						addedIds.add(sn.id);
					}
				};
				while (this.mapRemoves.length) {
					const removedNode = this.mapRemoves.shift();
					this.mirror.removeNodeFromMap(removedNode);
					this.shadowDomManager.removeShadowRootsFor(removedNode);
				}
				for (const n2 of this.movedSet) {
					if (isParentRemoved(this.removes, n2, this.mirror) && !this.movedSet.has(n2.parentNode)) continue;
					pushAdd(n2);
				}
				for (const n2 of this.addedSet) if (!isAncestorInSet(this.droppedSet, n2) && !isParentRemoved(this.removes, n2, this.mirror)) pushAdd(n2);
				else if (isAncestorInSet(this.movedSet, n2)) pushAdd(n2);
				else this.droppedSet.add(n2);
				let candidate = null;
				while (addList.length) {
					let node = null;
					if (candidate) {
						const parentId = this.mirror.getId(candidate.value.parentNode);
						const nextId = getNextId(candidate.value);
						if (parentId !== -1 && nextId !== -1) node = candidate;
					}
					if (!node) {
						let tailNode = addList.tail;
						while (tailNode) {
							const _node = tailNode;
							tailNode = tailNode.previous;
							if (_node) {
								const parentId = this.mirror.getId(_node.value.parentNode);
								if (getNextId(_node.value) === -1) continue;
								else if (parentId !== -1) {
									node = _node;
									break;
								} else {
									const unhandledNode = _node.value;
									if (unhandledNode.parentNode && unhandledNode.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
										const shadowHost = unhandledNode.parentNode.host;
										if (this.mirror.getId(shadowHost) !== -1) {
											node = _node;
											break;
										}
									}
								}
							}
						}
					}
					if (!node) {
						while (addList.head) addList.removeNode(addList.head.value);
						break;
					}
					candidate = node.previous;
					addList.removeNode(node.value);
					pushAdd(node.value);
				}
				const payload = {
					texts: this.texts.map((text) => ({
						id: this.mirror.getId(text.node),
						value: text.value
					})).filter((text) => !addedIds.has(text.id)).filter((text) => this.mirror.has(text.id)),
					attributes: this.attributes.map((attribute) => {
						const { attributes } = attribute;
						if (typeof attributes.style === "string") {
							const diffAsStr = JSON.stringify(attribute.styleDiff);
							const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
							if (diffAsStr.length < attributes.style.length) {
								if ((diffAsStr + unchangedAsStr).split("var(").length === attributes.style.split("var(").length) attributes.style = attribute.styleDiff;
							}
						}
						return {
							id: this.mirror.getId(attribute.node),
							attributes
						};
					}).filter((attribute) => !addedIds.has(attribute.id)).filter((attribute) => this.mirror.has(attribute.id)),
					removes: this.removes,
					adds
				};
				if (!payload.texts.length && !payload.attributes.length && !payload.removes.length && !payload.adds.length) return;
				this.texts = [];
				this.attributes = [];
				this.attributeMap = /* @__PURE__ */ new WeakMap();
				this.removes = [];
				this.addedSet = /* @__PURE__ */ new Set();
				this.movedSet = /* @__PURE__ */ new Set();
				this.droppedSet = /* @__PURE__ */ new Set();
				this.movedMap = {};
				this.mutationCb(payload);
			};
			this.processMutation = (m) => {
				if (isIgnored(m.target, this.mirror)) return;
				switch (m.type) {
					case "characterData": {
						const value = m.target.textContent;
						if (!isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) && value !== m.oldValue) this.texts.push({
							value: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector, this.unmaskTextClass, this.unmaskTextSelector, this.maskAllText) && value ? this.maskTextFn ? this.maskTextFn(value, closestElementOfNode$1(m.target)) : value.replace(/[\S]/g, "*") : value,
							node: m.target
						});
						break;
					}
					case "attributes": {
						const target = m.target;
						let attributeName = m.attributeName;
						let value = m.target.getAttribute(attributeName);
						if (attributeName === "value") {
							const type = getInputType(target);
							const tagName = target.tagName;
							value = getInputValue(target, tagName, type);
							const isInputMasked = shouldMaskInput({
								maskInputOptions: this.maskInputOptions,
								tagName,
								type
							});
							value = maskInputValue({
								isMasked: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector, this.unmaskTextClass, this.unmaskTextSelector, isInputMasked),
								element: target,
								value,
								maskInputFn: this.maskInputFn
							});
						}
						if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) || value === m.oldValue) return;
						let item = this.attributeMap.get(m.target);
						if (target.tagName === "IFRAME" && attributeName === "src" && !this.keepIframeSrcFn(value)) {
							if (!getIFrameContentDocument(target)) attributeName = "rr_src";
							else return;
						}
						if (!item) {
							item = {
								node: m.target,
								attributes: {},
								styleDiff: {},
								_unchangedStyles: {}
							};
							this.attributes.push(item);
							this.attributeMap.set(m.target, item);
						}
						if (attributeName === "type" && target.tagName === "INPUT" && (m.oldValue || "").toLowerCase() === "password") target.setAttribute("data-rr-is-password", "true");
						if (!ignoreAttribute(target.tagName, attributeName)) {
							item.attributes[attributeName] = transformAttribute(this.doc, toLowerCase(target.tagName), toLowerCase(attributeName), value, target, this.maskAttributeFn);
							if (attributeName === "style") {
								const oldStyle = m.oldValue ? this.styleDeclarationParser.parse(m.oldValue) : null;
								for (const pname of Array.from(target.style)) {
									const newValue = target.style.getPropertyValue(pname);
									const newPriority = target.style.getPropertyPriority(pname);
									if (newValue !== (oldStyle?.getPropertyValue(pname) || "") || newPriority !== (oldStyle?.getPropertyPriority(pname) || "")) {
										if (newPriority === "") item.styleDiff[pname] = newValue;
										else item.styleDiff[pname] = [newValue, newPriority];
									} else item._unchangedStyles[pname] = [newValue, newPriority];
								}
								if (oldStyle) {
									for (const pname of Array.from(oldStyle)) if (target.style.getPropertyValue(pname) === "") item.styleDiff[pname] = false;
								}
							}
						}
						break;
					}
					case "childList":
						if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, true)) return;
						m.addedNodes.forEach((n2) => this.genAdds(n2, m.target));
						m.removedNodes.forEach((n2) => {
							const nodeId = this.mirror.getId(n2);
							const parentId = isShadowRoot(m.target) ? this.mirror.getId(m.target.host) : this.mirror.getId(m.target);
							if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) || isIgnored(n2, this.mirror) || !isSerialized(n2, this.mirror)) return;
							if (this.addedSet.has(n2)) {
								deepDelete(this.addedSet, n2);
								this.droppedSet.add(n2);
							} else if (this.addedSet.has(m.target) && nodeId === -1);
							else if (isAncestorRemoved(m.target, this.mirror));
							else if (this.movedSet.has(n2) && this.movedMap[moveKey(nodeId, parentId)]) deepDelete(this.movedSet, n2);
							else this.removes.push({
								parentId,
								id: nodeId,
								isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target) ? true : void 0
							});
							this.mapRemoves.push(n2);
						});
				}
			};
			this.genAdds = (n2, target) => {
				if (this.processedNodeManager.inOtherBuffer(n2, this)) return;
				if (this.addedSet.has(n2) || this.movedSet.has(n2)) return;
				if (this.mirror.hasNode(n2)) {
					if (isIgnored(n2, this.mirror)) return;
					this.movedSet.add(n2);
					let targetId = null;
					if (target && this.mirror.hasNode(target)) targetId = this.mirror.getId(target);
					if (targetId && targetId !== -1) this.movedMap[moveKey(this.mirror.getId(n2), targetId)] = true;
				} else {
					this.addedSet.add(n2);
					this.droppedSet.delete(n2);
				}
				if (!isBlocked(n2, this.blockClass, this.blockSelector, this.unblockSelector, false)) {
					if (n2.childNodes) n2.childNodes.forEach((childN) => this.genAdds(childN));
					if (hasShadowRoot(n2)) n2.shadowRoot.childNodes.forEach((childN) => {
						this.processedNodeManager.add(childN, this);
						this.genAdds(childN, n2);
					});
				}
			};
		}
		init(options) {
			[
				"mutationCb",
				"blockClass",
				"blockSelector",
				"unblockSelector",
				"maskAllText",
				"maskTextClass",
				"unmaskTextClass",
				"maskTextSelector",
				"unmaskTextSelector",
				"inlineStylesheet",
				"maskInputOptions",
				"maskAttributeFn",
				"maskTextFn",
				"maskInputFn",
				"keepIframeSrcFn",
				"recordCanvas",
				"inlineImages",
				"slimDOMOptions",
				"dataURLOptions",
				"doc",
				"mirror",
				"iframeManager",
				"stylesheetManager",
				"shadowDomManager",
				"canvasManager",
				"processedNodeManager",
				"ignoreCSSAttributes"
			].forEach((key) => {
				this[key] = options[key];
			});
			this.styleDeclarationParser = new StyleDeclarationParser(this.doc);
		}
		freeze() {
			this.frozen = true;
			this.canvasManager.freeze();
		}
		unfreeze() {
			this.frozen = false;
			this.canvasManager.unfreeze();
			this.emit();
		}
		isFrozen() {
			return this.frozen;
		}
		lock() {
			this.locked = true;
			this.canvasManager.lock();
		}
		unlock() {
			this.locked = false;
			this.canvasManager.unlock();
			this.emit();
		}
		reset() {
			this.shadowDomManager.reset();
			this.canvasManager.reset();
		}
		/**
		* Drops mirror entries for removals this buffer has not emitted yet,
		* without emitting anything. Used when the buffer's root is torn down.
		*/
		release(pending) {
			pending.forEach((m) => {
				if (m.type === "childList") m.removedNodes.forEach((n2) => this.mapRemoves.push(n2));
			});
			while (this.mapRemoves.length) {
				const removedNode = this.mapRemoves.shift();
				if (inDom(removedNode)) continue;
				this.mirror.removeNodeFromMap(removedNode);
				this.shadowDomManager.removeShadowRootsFor(removedNode);
			}
		}
	};
	function deepDelete(addsSet, n2) {
		addsSet.delete(n2);
		n2.childNodes?.forEach((childN) => deepDelete(addsSet, childN));
	}
	function isParentRemoved(removes, n2, mirror2) {
		if (removes.length === 0) return false;
		return _isParentRemoved(removes, n2, mirror2);
	}
	function _isParentRemoved(removes, n2, mirror2) {
		let node = n2.parentNode;
		while (node) {
			const parentId = mirror2.getId(node);
			if (removes.some((r2) => r2.id === parentId)) return true;
			node = node.parentNode;
		}
		return false;
	}
	function isAncestorInSet(set, n2) {
		if (set.size === 0) return false;
		return _isAncestorInSet(set, n2);
	}
	function _isAncestorInSet(set, n2) {
		const { parentNode } = n2;
		if (!parentNode) return false;
		if (set.has(parentNode)) return true;
		return _isAncestorInSet(set, parentNode);
	}
	const mutationBuffers = [];
	function forEachMutationBuffer(cb) {
		[...mutationBuffers].forEach(cb);
	}
	const observerBuffers = /* @__PURE__ */ new WeakMap();
	function getEventTarget$1(event) {
		try {
			if ("composedPath" in event) {
				const path = event.composedPath();
				if (path.length) return path[0];
			} else if ("path" in event && event.path.length) return event.path[0];
		} catch {}
		return event && event.target;
	}
	function initMutationObserver(options, rootEl) {
		const mutationBuffer = new MutationBuffer();
		mutationBuffers.push(mutationBuffer);
		mutationBuffer.init(options);
		let mutationObserverCtor = window.MutationObserver || window.__rrMutationObserver;
		const angularZoneSymbol = window?.Zone?.__symbol__?.("MutationObserver");
		if (angularZoneSymbol && window[angularZoneSymbol]) mutationObserverCtor = window[angularZoneSymbol];
		const { onMutation, blockClass, blockSelector, unblockSelector } = options;
		const onMutationHelpers = { isBlocked: (node) => isBlocked(node, blockClass, blockSelector, unblockSelector, true) };
		const observer = new mutationObserverCtor(callbackWrapper((mutations) => {
			let toProcess = mutations;
			if (onMutation) {
				const result = onMutation(mutations, onMutationHelpers);
				if (result === false) return;
				if (Array.isArray(result)) toProcess = result;
			}
			mutationBuffer.processMutations(toProcess);
		}));
		observer.observe(rootEl, {
			attributes: true,
			attributeOldValue: true,
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true
		});
		observerBuffers.set(observer, mutationBuffer);
		return observer;
	}
	function removeMutationBuffer(observer) {
		const pending = observer.takeRecords();
		observer.disconnect();
		const buffer = observerBuffers.get(observer);
		if (buffer) {
			buffer.release(pending);
			const index = mutationBuffers.indexOf(buffer);
			if (index !== -1) mutationBuffers.splice(index, 1);
			observerBuffers.delete(observer);
		}
	}
	function initMoveObserver({ mousemoveCb, sampling, doc, mirror: mirror2 }) {
		if (sampling.mousemove === false) return () => {};
		const threshold = typeof sampling.mousemove === "number" ? sampling.mousemove : 50;
		const callbackThreshold = typeof sampling.mousemoveCallback === "number" ? sampling.mousemoveCallback : 500;
		let positions = [];
		let timeBaseline;
		const wrappedCb = throttle$1(callbackWrapper((source) => {
			const totalOffset = Date.now() - timeBaseline;
			mousemoveCb(positions.map((p) => {
				p.timeOffset -= totalOffset;
				return p;
			}), source);
			positions = [];
			timeBaseline = null;
		}), callbackThreshold);
		const updatePosition = callbackWrapper(throttle$1(callbackWrapper((evt) => {
			const target = getEventTarget$1(evt);
			const { clientX, clientY } = legacy_isTouchEvent(evt) ? evt.changedTouches[0] : evt;
			if (!timeBaseline) timeBaseline = nowTimestamp();
			positions.push({
				x: clientX,
				y: clientY,
				id: mirror2.getId(target),
				timeOffset: nowTimestamp() - timeBaseline
			});
			wrappedCb(typeof DragEvent !== "undefined" && evt instanceof DragEvent ? IncrementalSource.Drag : evt instanceof MouseEvent ? IncrementalSource.MouseMove : IncrementalSource.TouchMove);
		}), threshold, { trailing: false }));
		const handlers = [
			on("mousemove", updatePosition, doc),
			on("touchmove", updatePosition, doc),
			on("drag", updatePosition, doc)
		];
		return callbackWrapper(() => {
			handlers.forEach((h) => h());
		});
	}
	function initMouseInteractionObserver({ mouseInteractionCb, doc, mirror: mirror2, blockClass, blockSelector, unblockSelector, sampling }) {
		if (sampling.mouseInteraction === false) return () => {};
		const disableMap = sampling.mouseInteraction === true || sampling.mouseInteraction === void 0 ? {} : sampling.mouseInteraction;
		const handlers = [];
		let currentPointerType = null;
		const getHandler = (eventKey) => {
			return (event) => {
				const target = getEventTarget$1(event);
				if (isBlocked(target, blockClass, blockSelector, unblockSelector, true)) return;
				let pointerType = null;
				let thisEventKey = eventKey;
				if ("pointerType" in event) {
					switch (event.pointerType) {
						case "mouse":
							pointerType = PointerTypes.Mouse;
							break;
						case "touch":
							pointerType = PointerTypes.Touch;
							break;
						case "pen": pointerType = PointerTypes.Pen;
					}
					if (pointerType === PointerTypes.Touch) {
						if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) thisEventKey = "TouchStart";
						else if (MouseInteractions[eventKey] === MouseInteractions.MouseUp) thisEventKey = "TouchEnd";
					} else if (pointerType === PointerTypes.Pen);
				} else if (legacy_isTouchEvent(event)) pointerType = PointerTypes.Touch;
				if (pointerType !== null) {
					currentPointerType = pointerType;
					if (thisEventKey.startsWith("Touch") && pointerType === PointerTypes.Touch || thisEventKey.startsWith("Mouse") && pointerType === PointerTypes.Mouse) pointerType = null;
				} else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
					pointerType = currentPointerType;
					currentPointerType = null;
				}
				const e2 = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
				if (!e2) return;
				const id = mirror2.getId(target);
				const { clientX, clientY } = e2;
				callbackWrapper(mouseInteractionCb)({
					type: MouseInteractions[thisEventKey],
					id,
					x: clientX,
					y: clientY,
					...pointerType !== null && { pointerType }
				});
			};
		};
		Object.keys(MouseInteractions).filter((key) => Number.isNaN(Number(key)) && !key.endsWith("_Departed") && disableMap[key] !== false).forEach((eventKey) => {
			let eventName = toLowerCase(eventKey);
			const handler = getHandler(eventKey);
			if (window.PointerEvent) switch (MouseInteractions[eventKey]) {
				case MouseInteractions.MouseDown:
				case MouseInteractions.MouseUp:
					eventName = eventName.replace("mouse", "pointer");
					break;
				case MouseInteractions.TouchStart:
				case MouseInteractions.TouchEnd: return;
			}
			handlers.push(on(eventName, handler, doc));
		});
		return callbackWrapper(() => {
			handlers.forEach((h) => h());
		});
	}
	function initScrollObserver({ scrollCb, doc, mirror: mirror2, blockClass, blockSelector, unblockSelector, sampling }) {
		return on("scroll", callbackWrapper(throttle$1(callbackWrapper((evt) => {
			const target = getEventTarget$1(evt);
			if (!target || isBlocked(target, blockClass, blockSelector, unblockSelector, true)) return;
			const id = mirror2.getId(target);
			if (target === doc && doc.defaultView) {
				const scrollLeftTop = getWindowScroll(doc.defaultView);
				scrollCb({
					id,
					x: scrollLeftTop.left,
					y: scrollLeftTop.top
				});
			} else scrollCb({
				id,
				x: target.scrollLeft,
				y: target.scrollTop
			});
		}), sampling.scroll || 100)), doc);
	}
	function initViewportResizeObserver({ viewportResizeCb }, { win }) {
		let lastH = -1;
		let lastW = -1;
		return on("resize", callbackWrapper(throttle$1(callbackWrapper(() => {
			const height = getWindowHeight();
			const width = getWindowWidth();
			if (lastH !== height || lastW !== width) {
				viewportResizeCb({
					width: Number(width),
					height: Number(height)
				});
				lastH = height;
				lastW = width;
			}
		}), 200)), win);
	}
	const INPUT_TAGS = [
		"INPUT",
		"TEXTAREA",
		"SELECT"
	];
	const lastInputValueMap = /* @__PURE__ */ new WeakMap();
	function initInputObserver({ inputCb, doc, mirror: mirror2, blockClass, blockSelector, unblockSelector, ignoreClass, ignoreSelector, maskInputOptions, maskInputFn, sampling, userTriggeredOnInput, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector }) {
		function eventHandler(event) {
			let target = getEventTarget$1(event);
			const userTriggered = event.isTrusted;
			const tagName = target && toUpperCase(target.tagName);
			if (tagName === "OPTION") target = target.parentElement;
			if (!target || !tagName || INPUT_TAGS.indexOf(tagName) < 0 || isBlocked(target, blockClass, blockSelector, unblockSelector, true)) return;
			const el = target;
			if (el.classList.contains(ignoreClass) || ignoreSelector && el.matches(ignoreSelector)) return;
			const type = getInputType(target);
			let text = getInputValue(el, tagName, type);
			let isChecked = false;
			const isInputMasked = shouldMaskInput({
				maskInputOptions,
				tagName,
				type
			});
			const forceMask = needMaskingText(target, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, isInputMasked);
			if (type === "radio" || type === "checkbox") isChecked = target.checked;
			text = maskInputValue({
				isMasked: forceMask,
				element: target,
				value: text,
				maskInputFn
			});
			cbWithDedup(target, userTriggeredOnInput ? {
				text,
				isChecked,
				userTriggered
			} : {
				text,
				isChecked
			});
			const name = target.name;
			if (type === "radio" && name && isChecked) doc.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((el2) => {
				if (el2 !== target) {
					const text2 = maskInputValue({
						isMasked: forceMask,
						element: el2,
						value: getInputValue(el2, tagName, type),
						maskInputFn
					});
					cbWithDedup(el2, userTriggeredOnInput ? {
						text: text2,
						isChecked: !isChecked,
						userTriggered: false
					} : {
						text: text2,
						isChecked: !isChecked
					});
				}
			});
		}
		function cbWithDedup(target, v2) {
			const lastInputValue = lastInputValueMap.get(target);
			if (!lastInputValue || lastInputValue.text !== v2.text || lastInputValue.isChecked !== v2.isChecked) {
				lastInputValueMap.set(target, v2);
				const id = mirror2.getId(target);
				callbackWrapper(inputCb)({
					...v2,
					id
				});
			}
		}
		const handlers = (sampling.input === "last" ? ["change"] : ["input", "change"]).map((eventName) => on(eventName, callbackWrapper(eventHandler), doc));
		const currentWindow = doc.defaultView;
		if (!currentWindow) return () => {
			handlers.forEach((h) => h());
		};
		const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(currentWindow.HTMLInputElement.prototype, "value");
		const hookProperties = [
			[currentWindow.HTMLInputElement.prototype, "value"],
			[currentWindow.HTMLInputElement.prototype, "checked"],
			[currentWindow.HTMLSelectElement.prototype, "value"],
			[currentWindow.HTMLTextAreaElement.prototype, "value"],
			[currentWindow.HTMLSelectElement.prototype, "selectedIndex"],
			[currentWindow.HTMLOptionElement.prototype, "selected"]
		];
		if (propertyDescriptor && propertyDescriptor.set) handlers.push(...hookProperties.map((p) => hookSetter(p[0], p[1], { set() {
			callbackWrapper(eventHandler)({
				target: this,
				isTrusted: false
			});
		} }, false, currentWindow)));
		return callbackWrapper(() => {
			handlers.forEach((h) => h());
		});
	}
	function getNestedCSSRulePositions(rule) {
		const positions = [];
		function recurse(childRule, pos) {
			if (hasNestedCSSRule("CSSGroupingRule") && childRule.parentRule instanceof CSSGroupingRule || hasNestedCSSRule("CSSMediaRule") && childRule.parentRule instanceof CSSMediaRule || hasNestedCSSRule("CSSSupportsRule") && childRule.parentRule instanceof CSSSupportsRule || hasNestedCSSRule("CSSConditionRule") && childRule.parentRule instanceof CSSConditionRule) {
				const index = Array.from(childRule.parentRule.cssRules).indexOf(childRule);
				pos.unshift(index);
			} else if (childRule.parentStyleSheet) {
				const index = Array.from(childRule.parentStyleSheet.cssRules).indexOf(childRule);
				pos.unshift(index);
			}
			return pos;
		}
		return recurse(rule, positions);
	}
	function getIdAndStyleId(sheet, mirror2, styleMirror) {
		let id, styleId;
		if (!sheet) return {};
		if (sheet.ownerNode) id = mirror2.getId(sheet.ownerNode);
		else styleId = styleMirror.getId(sheet);
		return {
			styleId,
			id
		};
	}
	function initStyleSheetObserver({ styleSheetRuleCb, mirror: mirror2, stylesheetManager }, { win }) {
		if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) return () => {};
		const insertRule = win.CSSStyleSheet.prototype.insertRule;
		win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, { apply: callbackWrapper((target, thisArg, argumentsList) => {
			const [rule, index] = argumentsList;
			const { id, styleId } = getIdAndStyleId(thisArg, mirror2, stylesheetManager.styleMirror);
			if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
				id,
				styleId,
				adds: [{
					rule,
					index
				}]
			});
			return target.apply(thisArg, argumentsList);
		}) });
		const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
		win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, { apply: callbackWrapper((target, thisArg, argumentsList) => {
			const [index] = argumentsList;
			const { id, styleId } = getIdAndStyleId(thisArg, mirror2, stylesheetManager.styleMirror);
			if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
				id,
				styleId,
				removes: [{ index }]
			});
			return target.apply(thisArg, argumentsList);
		}) });
		let replace;
		if (win.CSSStyleSheet.prototype.replace) {
			replace = win.CSSStyleSheet.prototype.replace;
			win.CSSStyleSheet.prototype.replace = new Proxy(replace, { apply: callbackWrapper((target, thisArg, argumentsList) => {
				const [text] = argumentsList;
				const { id, styleId } = getIdAndStyleId(thisArg, mirror2, stylesheetManager.styleMirror);
				if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
					id,
					styleId,
					replace: text
				});
				return target.apply(thisArg, argumentsList);
			}) });
		}
		let replaceSync;
		if (win.CSSStyleSheet.prototype.replaceSync) {
			replaceSync = win.CSSStyleSheet.prototype.replaceSync;
			win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, { apply: callbackWrapper((target, thisArg, argumentsList) => {
				const [text] = argumentsList;
				const { id, styleId } = getIdAndStyleId(thisArg, mirror2, stylesheetManager.styleMirror);
				if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
					id,
					styleId,
					replaceSync: text
				});
				return target.apply(thisArg, argumentsList);
			}) });
		}
		const supportedNestedCSSRuleTypes = {};
		if (canMonkeyPatchNestedCSSRule("CSSGroupingRule")) supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
		else {
			if (canMonkeyPatchNestedCSSRule("CSSMediaRule")) supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
			if (canMonkeyPatchNestedCSSRule("CSSConditionRule")) supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
			if (canMonkeyPatchNestedCSSRule("CSSSupportsRule")) supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
		}
		const unmodifiedFunctions = {};
		Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
			unmodifiedFunctions[typeKey] = {
				insertRule: type.prototype.insertRule,
				deleteRule: type.prototype.deleteRule
			};
			type.prototype.insertRule = new Proxy(unmodifiedFunctions[typeKey].insertRule, { apply: callbackWrapper((target, thisArg, argumentsList) => {
				const [rule, index] = argumentsList;
				const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror2, stylesheetManager.styleMirror);
				if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
					id,
					styleId,
					adds: [{
						rule,
						index: [...getNestedCSSRulePositions(thisArg), index || 0]
					}]
				});
				return target.apply(thisArg, argumentsList);
			}) });
			type.prototype.deleteRule = new Proxy(unmodifiedFunctions[typeKey].deleteRule, { apply: callbackWrapper((target, thisArg, argumentsList) => {
				const [index] = argumentsList;
				const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror2, stylesheetManager.styleMirror);
				if (id && id !== -1 || styleId && styleId !== -1) styleSheetRuleCb({
					id,
					styleId,
					removes: [{ index: [...getNestedCSSRulePositions(thisArg), index] }]
				});
				return target.apply(thisArg, argumentsList);
			}) });
		});
		return callbackWrapper(() => {
			win.CSSStyleSheet.prototype.insertRule = insertRule;
			win.CSSStyleSheet.prototype.deleteRule = deleteRule;
			replace && (win.CSSStyleSheet.prototype.replace = replace);
			replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
			Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
				type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
				type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
			});
		});
	}
	function initAdoptedStyleSheetObserver({ mirror: mirror2, stylesheetManager }, host) {
		let hostId = null;
		if (host.nodeName === "#document") hostId = mirror2.getId(host);
		else hostId = mirror2.getId(host.host);
		const patchTarget = host.nodeName === "#document" ? host.defaultView?.Document : host.ownerDocument?.defaultView?.ShadowRoot;
		const originalPropertyDescriptor = patchTarget?.prototype ? Object.getOwnPropertyDescriptor(patchTarget?.prototype, "adoptedStyleSheets") : void 0;
		const previousAdoptedStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(host, "adoptedStyleSheets");
		if (hostId === null || hostId === -1 || !patchTarget || !originalPropertyDescriptor || previousAdoptedStyleSheetsDescriptor?.configurable === false || !Object.isExtensible(host)) return () => {};
		let adoptedStyleSheetsOverrideIsActive = true;
		const adoptedStyleSheetsSetter = function(sheets) {
			originalPropertyDescriptor.set?.call(this, sheets);
			if (adoptedStyleSheetsOverrideIsActive && hostId !== null && hostId !== -1) try {
				stylesheetManager.adoptStyleSheets(sheets, hostId);
			} catch (e2) {}
		};
		Object.defineProperty(host, "adoptedStyleSheets", {
			configurable: true,
			enumerable: originalPropertyDescriptor.enumerable,
			get() {
				return originalPropertyDescriptor.get?.call(this);
			},
			set: adoptedStyleSheetsSetter
		});
		return callbackWrapper(() => {
			adoptedStyleSheetsOverrideIsActive = false;
			if (Object.getOwnPropertyDescriptor(host, "adoptedStyleSheets")?.set !== adoptedStyleSheetsSetter) return;
			if (previousAdoptedStyleSheetsDescriptor) Reflect.defineProperty(host, "adoptedStyleSheets", previousAdoptedStyleSheetsDescriptor);
			else Reflect.deleteProperty(host, "adoptedStyleSheets");
		});
	}
	function initStyleDeclarationObserver({ styleDeclarationCb, mirror: mirror2, ignoreCSSAttributes, stylesheetManager }, { win }) {
		const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
		win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, { apply: callbackWrapper((target, thisArg, argumentsList) => {
			const [property, value, priority] = argumentsList;
			if (ignoreCSSAttributes.has(property)) return setProperty.apply(thisArg, [
				property,
				value,
				priority
			]);
			const { id, styleId } = getIdAndStyleId(thisArg.parentRule?.parentStyleSheet, mirror2, stylesheetManager.styleMirror);
			if (id && id !== -1 || styleId && styleId !== -1) styleDeclarationCb({
				id,
				styleId,
				set: {
					property,
					value,
					priority
				},
				index: getNestedCSSRulePositions(thisArg.parentRule)
			});
			return target.apply(thisArg, argumentsList);
		}) });
		const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
		win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, { apply: callbackWrapper((target, thisArg, argumentsList) => {
			const [property] = argumentsList;
			if (ignoreCSSAttributes.has(property)) return removeProperty.apply(thisArg, [property]);
			const { id, styleId } = getIdAndStyleId(thisArg.parentRule?.parentStyleSheet, mirror2, stylesheetManager.styleMirror);
			if (id && id !== -1 || styleId && styleId !== -1) styleDeclarationCb({
				id,
				styleId,
				remove: { property },
				index: getNestedCSSRulePositions(thisArg.parentRule)
			});
			return target.apply(thisArg, argumentsList);
		}) });
		return callbackWrapper(() => {
			win.CSSStyleDeclaration.prototype.setProperty = setProperty;
			win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
		});
	}
	function initMediaInteractionObserver({ mediaInteractionCb, blockClass, blockSelector, unblockSelector, mirror: mirror2, sampling, doc }) {
		const handler = callbackWrapper((type) => throttle$1(callbackWrapper((event) => {
			const target = getEventTarget$1(event);
			if (!target || isBlocked(target, blockClass, blockSelector, unblockSelector, true)) return;
			const { currentTime, volume, muted, playbackRate } = target;
			mediaInteractionCb({
				type,
				id: mirror2.getId(target),
				currentTime,
				volume,
				muted,
				playbackRate
			});
		}), sampling.media || 500));
		const handlers = [
			on("play", handler(MediaInteractions.Play), doc),
			on("pause", handler(MediaInteractions.Pause), doc),
			on("seeked", handler(MediaInteractions.Seeked), doc),
			on("volumechange", handler(MediaInteractions.VolumeChange), doc),
			on("ratechange", handler(MediaInteractions.RateChange), doc)
		];
		return callbackWrapper(() => {
			handlers.forEach((h) => h());
		});
	}
	function initFontObserver({ fontCb, doc }) {
		const win = doc.defaultView;
		if (!win) return () => {};
		const handlers = [];
		const fontMap = /* @__PURE__ */ new WeakMap();
		const originalFontFace = win.FontFace;
		win.FontFace = function FontFace2(family, source, descriptors) {
			const fontFace = new originalFontFace(family, source, descriptors);
			fontMap.set(fontFace, {
				family,
				buffer: typeof source !== "string",
				descriptors,
				fontSource: typeof source === "string" ? source : JSON.stringify(Array.from(new Uint8Array(source)))
			});
			return fontFace;
		};
		const restoreHandler = patch(doc.fonts, "add", function(original) {
			return function(fontFace) {
				setTimeout$2(callbackWrapper(() => {
					const p = fontMap.get(fontFace);
					if (p) {
						fontCb(p);
						fontMap.delete(fontFace);
					}
				}), 0);
				return original.apply(this, [fontFace]);
			};
		});
		handlers.push(() => {
			win.FontFace = originalFontFace;
		});
		handlers.push(restoreHandler);
		return callbackWrapper(() => {
			handlers.forEach((h) => h());
		});
	}
	function initSelectionObserver(param) {
		const { doc, mirror: mirror2, blockClass, blockSelector, unblockSelector, selectionCb } = param;
		let collapsed = true;
		const updateSelection = callbackWrapper(() => {
			const selection = doc.getSelection();
			if (!selection || collapsed && selection?.isCollapsed) return;
			collapsed = selection.isCollapsed || false;
			const ranges = [];
			const count = selection.rangeCount || 0;
			for (let i2 = 0; i2 < count; i2++) {
				const { startContainer, startOffset, endContainer, endOffset } = selection.getRangeAt(i2);
				if (isBlocked(startContainer, blockClass, blockSelector, unblockSelector, true) || isBlocked(endContainer, blockClass, blockSelector, unblockSelector, true)) continue;
				ranges.push({
					start: mirror2.getId(startContainer),
					startOffset,
					end: mirror2.getId(endContainer),
					endOffset
				});
			}
			selectionCb({ ranges });
		});
		updateSelection();
		return on("selectionchange", updateSelection);
	}
	function initCustomElementObserver({ doc, customElementCb }) {
		const win = doc.defaultView;
		if (!win || !win.customElements) return () => {};
		return patch(win.customElements, "define", function(original) {
			return function(name, constructor, options) {
				try {
					customElementCb({ define: { name } });
				} catch (e2) {}
				return original.apply(this, [
					name,
					constructor,
					options
				]);
			};
		});
	}
	function initObservers(o2, _hooks = {}) {
		const currentWindow = o2.doc.defaultView;
		if (!currentWindow) return () => {};
		let mutationObserver;
		if (o2.recordDOM) mutationObserver = initMutationObserver(o2, o2.doc);
		const mousemoveHandler = initMoveObserver(o2);
		const mouseInteractionHandler = initMouseInteractionObserver(o2);
		const scrollHandler = initScrollObserver(o2);
		const viewportResizeHandler = initViewportResizeObserver(o2, { win: currentWindow });
		const inputHandler = initInputObserver(o2);
		const mediaInteractionHandler = initMediaInteractionObserver(o2);
		let styleSheetObserver = () => {};
		let adoptedStyleSheetObserver = () => {};
		let styleDeclarationObserver = () => {};
		let fontObserver = () => {};
		if (o2.recordDOM) {
			styleSheetObserver = initStyleSheetObserver(o2, { win: currentWindow });
			adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o2, o2.doc);
			styleDeclarationObserver = initStyleDeclarationObserver(o2, { win: currentWindow });
			if (o2.collectFonts) fontObserver = initFontObserver(o2);
		}
		const selectionObserver = initSelectionObserver(o2);
		const customElementObserver = initCustomElementObserver(o2);
		const pluginHandlers = [];
		for (const plugin of o2.plugins) pluginHandlers.push(plugin.observer(plugin.callback, currentWindow, plugin.options));
		return callbackWrapper(() => {
			const errors = runAll([
				() => forEachMutationBuffer((b) => b.reset()),
				() => mutationObserver?.disconnect(),
				mousemoveHandler,
				mouseInteractionHandler,
				scrollHandler,
				viewportResizeHandler,
				inputHandler,
				mediaInteractionHandler,
				styleSheetObserver,
				adoptedStyleSheetObserver,
				styleDeclarationObserver,
				fontObserver,
				selectionObserver,
				customElementObserver,
				...pluginHandlers
			]);
			if (errors.length > 0) throw errors[0];
		});
	}
	function hasNestedCSSRule(prop) {
		return typeof window[prop] !== "undefined";
	}
	function canMonkeyPatchNestedCSSRule(prop) {
		return Boolean(typeof window[prop] !== "undefined" && window[prop].prototype && "insertRule" in window[prop].prototype && "deleteRule" in window[prop].prototype);
	}
	var CrossOriginIframeMirror = class {
		constructor(generateIdFn) {
			this.generateIdFn = generateIdFn;
			this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
			this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
		}
		getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
			const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
			const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
			let id = idToRemoteIdMap.get(remoteId);
			if (!id) {
				id = this.generateIdFn();
				idToRemoteIdMap.set(remoteId, id);
				remoteIdToIdMap.set(id, remoteId);
			}
			return id;
		}
		getIds(iframe, remoteId) {
			const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
			const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
			return remoteId.map((id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap));
		}
		getRemoteId(iframe, id, map) {
			const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
			if (typeof id !== "number") return id;
			const remoteId = remoteIdToIdMap.get(id);
			if (!remoteId) return -1;
			return remoteId;
		}
		getRemoteIds(iframe, ids) {
			const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
			return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
		}
		reset(iframe) {
			if (!iframe) {
				this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
				this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
				return;
			}
			this.iframeIdToRemoteIdMap.delete(iframe);
			this.iframeRemoteIdToIdMap.delete(iframe);
		}
		getIdToRemoteIdMap(iframe) {
			let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
			if (!idToRemoteIdMap) {
				idToRemoteIdMap = /* @__PURE__ */ new Map();
				this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
			}
			return idToRemoteIdMap;
		}
		getRemoteIdToIdMap(iframe) {
			let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
			if (!remoteIdToIdMap) {
				remoteIdToIdMap = /* @__PURE__ */ new Map();
				this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
			}
			return remoteIdToIdMap;
		}
	};
	var IframeManager = class {
		constructor(options) {
			this.iframes = /* @__PURE__ */ new WeakMap();
			this.crossOriginIframeMap = /* @__PURE__ */ new WeakMap();
			this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
			this.crossOriginIframeRootIdMap = /* @__PURE__ */ new WeakMap();
			this.mutationCb = options.mutationCb;
			this.wrappedEmit = options.wrappedEmit;
			this.stylesheetManager = options.stylesheetManager;
			this.recordCrossOriginIframes = options.recordCrossOriginIframes;
			this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(this.stylesheetManager.styleMirror.generateId.bind(this.stylesheetManager.styleMirror));
			this.mirror = options.mirror;
			if (this.recordCrossOriginIframes) window.addEventListener("message", this.handleMessage.bind(this));
		}
		addIframe(iframeEl) {
			this.iframes.set(iframeEl, true);
			const contentWindow = getIFrameContentWindow(iframeEl);
			if (contentWindow) this.crossOriginIframeMap.set(contentWindow, iframeEl);
		}
		addLoadListener(cb) {
			this.loadListener = cb;
		}
		attachIframe(iframeEl, childSn) {
			this.mutationCb({
				adds: [{
					parentId: this.mirror.getId(iframeEl),
					nextId: null,
					node: childSn
				}],
				removes: [],
				texts: [],
				attributes: [],
				isAttachIframe: true
			});
			if (this.recordCrossOriginIframes) getIFrameContentWindow(iframeEl)?.addEventListener("message", this.handleMessage.bind(this));
			this.loadListener?.(iframeEl);
			const iframeDoc = getIFrameContentDocument(iframeEl);
			if (iframeDoc && iframeDoc.adoptedStyleSheets && iframeDoc.adoptedStyleSheets.length > 0) this.stylesheetManager.adoptStyleSheets(iframeDoc.adoptedStyleSheets, this.mirror.getId(iframeDoc));
		}
		handleMessage(message) {
			const crossOriginMessageEvent = message;
			if (crossOriginMessageEvent.data.type !== "rrweb" || crossOriginMessageEvent.origin !== crossOriginMessageEvent.data.origin) return;
			if (!message.source) return;
			const iframeEl = this.crossOriginIframeMap.get(message.source);
			if (!iframeEl) return;
			const transformedEvent = this.transformCrossOriginEvent(iframeEl, crossOriginMessageEvent.data.event);
			if (transformedEvent) this.wrappedEmit(transformedEvent, crossOriginMessageEvent.data.isCheckout);
		}
		transformCrossOriginEvent(iframeEl, e2) {
			switch (e2.type) {
				case EventType.FullSnapshot: {
					this.crossOriginIframeMirror.reset(iframeEl);
					this.crossOriginIframeStyleMirror.reset(iframeEl);
					this.replaceIdOnNode(e2.data.node, iframeEl);
					const rootId = e2.data.node.id;
					this.crossOriginIframeRootIdMap.set(iframeEl, rootId);
					this.patchRootIdOnNode(e2.data.node, rootId);
					return {
						timestamp: e2.timestamp,
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.Mutation,
							adds: [{
								parentId: this.mirror.getId(iframeEl),
								nextId: null,
								node: e2.data.node
							}],
							removes: [],
							texts: [],
							attributes: [],
							isAttachIframe: true
						}
					};
				}
				case EventType.Meta:
				case EventType.Load:
				case EventType.DomContentLoaded: return false;
				case EventType.Plugin: return e2;
				case EventType.Custom:
					this.replaceIds(e2.data.payload, iframeEl, [
						"id",
						"parentId",
						"previousId",
						"nextId"
					]);
					return e2;
				case EventType.IncrementalSnapshot: switch (e2.data.source) {
					case IncrementalSource.Mutation:
						e2.data.adds.forEach((n2) => {
							this.replaceIds(n2, iframeEl, [
								"parentId",
								"nextId",
								"previousId"
							]);
							this.replaceIdOnNode(n2.node, iframeEl);
							const rootId = this.crossOriginIframeRootIdMap.get(iframeEl);
							rootId && this.patchRootIdOnNode(n2.node, rootId);
						});
						e2.data.removes.forEach((n2) => {
							this.replaceIds(n2, iframeEl, ["parentId", "id"]);
						});
						e2.data.attributes.forEach((n2) => {
							this.replaceIds(n2, iframeEl, ["id"]);
						});
						e2.data.texts.forEach((n2) => {
							this.replaceIds(n2, iframeEl, ["id"]);
						});
						return e2;
					case IncrementalSource.Drag:
					case IncrementalSource.TouchMove:
					case IncrementalSource.MouseMove:
						e2.data.positions.forEach((p) => {
							this.replaceIds(p, iframeEl, ["id"]);
						});
						return e2;
					case IncrementalSource.ViewportResize: return false;
					case IncrementalSource.MediaInteraction:
					case IncrementalSource.MouseInteraction:
					case IncrementalSource.Scroll:
					case IncrementalSource.CanvasMutation:
					case IncrementalSource.Input:
						this.replaceIds(e2.data, iframeEl, ["id"]);
						return e2;
					case IncrementalSource.StyleSheetRule:
					case IncrementalSource.StyleDeclaration:
						this.replaceIds(e2.data, iframeEl, ["id"]);
						this.replaceStyleIds(e2.data, iframeEl, ["styleId"]);
						return e2;
					case IncrementalSource.Font: return e2;
					case IncrementalSource.Selection:
						e2.data.ranges.forEach((range) => {
							this.replaceIds(range, iframeEl, ["start", "end"]);
						});
						return e2;
					case IncrementalSource.AdoptedStyleSheet:
						this.replaceIds(e2.data, iframeEl, ["id"]);
						this.replaceStyleIds(e2.data, iframeEl, ["styleIds"]);
						e2.data.styles?.forEach((style) => {
							this.replaceStyleIds(style, iframeEl, ["styleId"]);
						});
						return e2;
				}
			}
			return false;
		}
		replace(iframeMirror, obj, iframeEl, keys) {
			for (const key of keys) {
				if (!Array.isArray(obj[key]) && typeof obj[key] !== "number") continue;
				if (Array.isArray(obj[key])) obj[key] = iframeMirror.getIds(iframeEl, obj[key]);
				else obj[key] = iframeMirror.getId(iframeEl, obj[key]);
			}
			return obj;
		}
		replaceIds(obj, iframeEl, keys) {
			return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
		}
		replaceStyleIds(obj, iframeEl, keys) {
			return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
		}
		replaceIdOnNode(node, iframeEl) {
			this.replaceIds(node, iframeEl, ["id", "rootId"]);
			if ("childNodes" in node) node.childNodes.forEach((child) => {
				this.replaceIdOnNode(child, iframeEl);
			});
		}
		patchRootIdOnNode(node, rootId) {
			if (node.type !== NodeType$1.Document && !node.rootId) node.rootId = rootId;
			if ("childNodes" in node) node.childNodes.forEach((child) => {
				this.patchRootIdOnNode(child, rootId);
			});
		}
	};
	var ShadowDomManager = class {
		constructor(options) {
			this.shadowDoms = /* @__PURE__ */ new WeakSet();
			this.shadowRootTeardowns = /* @__PURE__ */ new Map();
			this.restoreHandlers = [];
			this.mutationCb = options.mutationCb;
			this.scrollCb = options.scrollCb;
			this.bypassOptions = options.bypassOptions;
			this.mirror = options.mirror;
			this.init();
		}
		init() {
			this.reset();
			this.patchAttachShadow(Element, document);
		}
		addShadowRoot(shadowRoot, doc) {
			if (!isNativeShadowDom(shadowRoot)) return;
			if (this.shadowDoms.has(shadowRoot)) return;
			this.shadowDoms.add(shadowRoot);
			const teardowns = [];
			this.shadowRootTeardowns.set(shadowRoot, teardowns);
			this.bypassOptions.canvasManager.addShadowRoot(shadowRoot);
			const observer = initMutationObserver({
				...this.bypassOptions,
				doc,
				mutationCb: this.mutationCb,
				mirror: this.mirror,
				shadowDomManager: this
			}, shadowRoot);
			teardowns.push(() => removeMutationBuffer(observer));
			teardowns.push(initScrollObserver({
				...this.bypassOptions,
				scrollCb: this.scrollCb,
				doc: shadowRoot,
				mirror: this.mirror
			}));
			setTimeout$2(() => {
				if (this.shadowRootTeardowns.get(shadowRoot) !== teardowns) return;
				if (shadowRoot.adoptedStyleSheets && shadowRoot.adoptedStyleSheets.length > 0) this.bypassOptions.stylesheetManager.adoptStyleSheets(shadowRoot.adoptedStyleSheets, this.mirror.getId(shadowRoot.host));
				teardowns.push(initAdoptedStyleSheetObserver({
					mirror: this.mirror,
					stylesheetManager: this.bypassOptions.stylesheetManager
				}, shadowRoot));
			}, 0);
		}
		/** Disconnects one shadow root and forgets it. */
		removeShadowRoot(shadowRoot) {
			const teardowns = this.shadowRootTeardowns.get(shadowRoot);
			if (teardowns) {
				teardowns.forEach((teardown) => {
					try {
						teardown();
					} catch (e2) {}
				});
				this.shadowRootTeardowns.delete(shadowRoot);
			}
			this.shadowDoms.delete(shadowRoot);
		}
		removeShadowRootsFor(node) {
			if (this.shadowRootTeardowns.size === 0) return;
			if (hasShadowRoot(node)) {
				const shadowRoot = node.shadowRoot;
				if (this.shadowDoms.has(shadowRoot) && !inDom(node)) this.removeShadowRoot(shadowRoot);
				this.removeShadowRootsFor(shadowRoot);
			}
			node.childNodes?.forEach((child) => this.removeShadowRootsFor(child));
		}
		/**
		* Monkey patch 'attachShadow' of an IFrameElement to observe newly added shadow doms.
		*/
		observeAttachShadow(iframeElement) {
			const iframeDoc = getIFrameContentDocument(iframeElement);
			const iframeWindow = getIFrameContentWindow(iframeElement);
			if (!iframeDoc || !iframeWindow) return;
			let iframeElementConstructor;
			try {
				iframeElementConstructor = iframeWindow.Element;
			} catch (e2) {
				return;
			}
			if (!iframeElementConstructor) return;
			this.patchAttachShadow(iframeElementConstructor, iframeDoc);
		}
		/**
		* Patch 'attachShadow' to observe newly added shadow doms.
		*/
		patchAttachShadow(element, doc) {
			const manager = this;
			this.restoreHandlers.push(patch(element.prototype, "attachShadow", function(original) {
				return function(option) {
					const shadowRoot = original.call(this, option);
					if (this.shadowRoot && inDom(this)) manager.addShadowRoot(this.shadowRoot, doc);
					return shadowRoot;
				};
			}));
		}
		reset() {
			this.restoreHandlers.forEach((handler) => {
				try {
					handler();
				} catch (e2) {}
			});
			this.restoreHandlers = [];
			this.shadowRootTeardowns.forEach((teardowns) => {
				teardowns.forEach((teardown) => {
					try {
						teardown();
					} catch (e2) {}
				});
			});
			this.shadowRootTeardowns = /* @__PURE__ */ new Map();
			this.shadowDoms = /* @__PURE__ */ new WeakSet();
			this.bypassOptions.canvasManager.resetShadowRoots();
		}
	};
	var StylesheetManager = class {
		constructor(options) {
			this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
			this.styleMirror = new StyleSheetMirror();
			this.mutationCb = options.mutationCb;
			this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
		}
		attachLinkElement(linkEl, childSn) {
			if ("_cssText" in childSn.attributes) this.mutationCb({
				adds: [],
				removes: [],
				texts: [],
				attributes: [{
					id: childSn.id,
					attributes: childSn.attributes
				}]
			});
			this.trackLinkElement(linkEl);
		}
		trackLinkElement(linkEl) {
			if (this.trackedLinkElements.has(linkEl)) return;
			this.trackedLinkElements.add(linkEl);
			this.trackStylesheetInLinkElement(linkEl);
		}
		adoptStyleSheets(sheets, hostId) {
			if (sheets.length === 0) return;
			const adoptedStyleSheetData = {
				id: hostId,
				styleIds: []
			};
			const styles = [];
			for (const sheet of sheets) {
				let styleId;
				if (!this.styleMirror.has(sheet)) {
					styleId = this.styleMirror.add(sheet);
					styles.push({
						styleId,
						rules: Array.from(sheet.rules || CSSRule, (r2, index) => ({
							rule: stringifyRule(r2),
							index
						}))
					});
				} else styleId = this.styleMirror.getId(sheet);
				adoptedStyleSheetData.styleIds.push(styleId);
			}
			if (styles.length > 0) adoptedStyleSheetData.styles = styles;
			this.adoptedStyleSheetCb(adoptedStyleSheetData);
		}
		reset() {
			this.styleMirror.reset();
			this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
		}
		trackStylesheetInLinkElement(_linkEl) {}
	};
	var ProcessedNodeManager = class {
		constructor() {
			this.nodeMap = /* @__PURE__ */ new WeakMap();
			this.active = false;
		}
		inOtherBuffer(node, thisBuffer) {
			const buffers = this.nodeMap.get(node);
			return buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer);
		}
		add(node, buffer) {
			if (!this.active) {
				this.active = true;
				onRequestAnimationFrame(() => {
					this.nodeMap = /* @__PURE__ */ new WeakMap();
					this.active = false;
				});
			}
			this.nodeMap.set(node, (this.nodeMap.get(node) || /* @__PURE__ */ new Set()).add(buffer));
		}
		destroy() {}
	};
	let wrappedEmit;
	let _takeFullSnapshot;
	try {
		if (Array.from([1], (x) => x * 2)[0] !== 2) {
			const cleanFrame = document.createElement("iframe");
			document.body.appendChild(cleanFrame);
			Array.from = cleanFrame.contentWindow?.Array.from || Array.from;
			document.body.removeChild(cleanFrame);
		}
	} catch (err) {
		console.debug("Unable to override Array.from", err);
	}
	const mirror = createMirror();
	function record(options = {}) {
		const { emit, checkoutEveryNms, checkoutEveryNth, blockClass = "rr-block", blockSelector = null, unblockSelector = null, ignoreClass = "rr-ignore", ignoreSelector = null, maskAllText = false, maskTextClass = "rr-mask", unmaskTextClass = null, maskTextSelector = null, unmaskTextSelector = null, inlineStylesheet = true, maskAllInputs, maskInputOptions: _maskInputOptions, slimDOMOptions: _slimDOMOptions, maskAttributeFn, maskInputFn, maskTextFn, maxCanvasSize = null, packFn, sampling = {}, dataURLOptions = {}, mousemoveWait, recordDOM = true, recordCanvas = false, recordCrossOriginIframes = false, recordAfter = options.recordAfter === "DOMContentLoaded" ? options.recordAfter : "load", userTriggeredOnInput = false, collectFonts = false, inlineImages = false, plugins, keepIframeSrcFn = () => false, ignoreCSSAttributes = /* @__PURE__ */ new Set([]), errorHandler, onMutation, getCanvasManager } = options;
		registerErrorHandler(errorHandler);
		const inEmittingFrame = recordCrossOriginIframes ? window.parent === window : true;
		let passEmitsToParent = false;
		if (!inEmittingFrame) try {
			if (window.parent.document) passEmitsToParent = false;
		} catch (e2) {
			passEmitsToParent = true;
		}
		if (inEmittingFrame && !emit) throw new Error("emit function is required");
		if (!inEmittingFrame && !passEmitsToParent) return () => {};
		if (mousemoveWait !== void 0 && sampling.mousemove === void 0) sampling.mousemove = mousemoveWait;
		mirror.reset();
		const maskInputOptions = maskAllInputs === true ? {
			color: true,
			date: true,
			"datetime-local": true,
			email: true,
			month: true,
			number: true,
			range: true,
			search: true,
			tel: true,
			text: true,
			time: true,
			url: true,
			week: true,
			hidden: true,
			textarea: true,
			select: true,
			radio: true,
			checkbox: true
		} : _maskInputOptions !== void 0 ? _maskInputOptions : {};
		const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === "all" ? {
			script: true,
			comment: true,
			headFavicon: true,
			headWhitespace: true,
			headMetaSocial: true,
			headMetaRobots: true,
			headMetaHttpEquiv: true,
			headMetaVerification: true,
			headMetaAuthorship: _slimDOMOptions === "all",
			headMetaDescKeywords: _slimDOMOptions === "all"
		} : _slimDOMOptions ? _slimDOMOptions : {};
		polyfill();
		let lastFullSnapshotTimestamp = 0;
		let incrementalSnapshotCount = 0;
		let failedSnapshotCount = 0;
		const eventProcessor = (e2) => {
			for (const plugin of plugins || []) if (plugin.eventProcessor) e2 = plugin.eventProcessor(e2);
			if (packFn && !passEmitsToParent) e2 = packFn(e2);
			return e2;
		};
		wrappedEmit = (r2, isCheckout) => {
			const e2 = r2;
			e2.timestamp = nowTimestamp();
			if (mutationBuffers[0]?.isFrozen() && e2.type !== EventType.FullSnapshot && !(e2.type === EventType.IncrementalSnapshot && e2.data.source === IncrementalSource.Mutation)) forEachMutationBuffer((buf) => buf.unfreeze());
			if (inEmittingFrame) emit?.(eventProcessor(e2), isCheckout);
			else if (passEmitsToParent) {
				const message = {
					type: "rrweb",
					event: eventProcessor(e2),
					origin: window.location.origin,
					isCheckout
				};
				window.parent.postMessage(message, "*");
			}
			if (e2.type === EventType.FullSnapshot) {
				lastFullSnapshotTimestamp = e2.timestamp;
				incrementalSnapshotCount = 0;
				failedSnapshotCount = 0;
			} else if (e2.type === EventType.IncrementalSnapshot) {
				if (e2.data.source === IncrementalSource.Mutation && e2.data.isAttachIframe) return;
				incrementalSnapshotCount++;
				const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
				const exceedTime = checkoutEveryNms && lastFullSnapshotTimestamp && e2.timestamp - lastFullSnapshotTimestamp > checkoutEveryNms;
				if (exceedCount || exceedTime) takeFullSnapshot2(true);
			}
		};
		const wrappedMutationEmit = (m) => {
			wrappedEmit({
				type: EventType.IncrementalSnapshot,
				data: {
					source: IncrementalSource.Mutation,
					...m
				}
			});
		};
		const wrappedScrollEmit = (p) => wrappedEmit({
			type: EventType.IncrementalSnapshot,
			data: {
				source: IncrementalSource.Scroll,
				...p
			}
		});
		const wrappedCanvasMutationEmit = (p) => wrappedEmit({
			type: EventType.IncrementalSnapshot,
			data: {
				source: IncrementalSource.CanvasMutation,
				...p
			}
		});
		const wrappedAdoptedStyleSheetEmit = (a2) => wrappedEmit({
			type: EventType.IncrementalSnapshot,
			data: {
				source: IncrementalSource.AdoptedStyleSheet,
				...a2
			}
		});
		const stylesheetManager = new StylesheetManager({
			mutationCb: wrappedMutationEmit,
			adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit
		});
		const iframeManager = new IframeManager({
			mirror,
			mutationCb: wrappedMutationEmit,
			stylesheetManager,
			recordCrossOriginIframes,
			wrappedEmit
		});
		for (const plugin of plugins || []) if (plugin.getMirror) plugin.getMirror({
			nodeMirror: mirror,
			crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
			crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror
		});
		const processedNodeManager = new ProcessedNodeManager();
		const canvasManager = _getCanvasManager(getCanvasManager, {
			mirror,
			win: window,
			mutationCb: (p) => wrappedEmit({
				type: EventType.IncrementalSnapshot,
				data: {
					source: IncrementalSource.CanvasMutation,
					...p
				}
			}),
			recordCanvas,
			blockClass,
			blockSelector,
			unblockSelector,
			maxCanvasSize,
			sampling: sampling["canvas"],
			dataURLOptions,
			errorHandler
		});
		const shadowDomManager = new ShadowDomManager({
			mutationCb: wrappedMutationEmit,
			scrollCb: wrappedScrollEmit,
			bypassOptions: {
				onMutation,
				blockClass,
				blockSelector,
				unblockSelector,
				maskAllText,
				maskTextClass,
				unmaskTextClass,
				maskTextSelector,
				unmaskTextSelector,
				inlineStylesheet,
				maskInputOptions,
				dataURLOptions,
				maskAttributeFn,
				maskTextFn,
				maskInputFn,
				recordCanvas,
				inlineImages,
				sampling,
				slimDOMOptions,
				iframeManager,
				stylesheetManager,
				canvasManager,
				keepIframeSrcFn,
				processedNodeManager,
				ignoreCSSAttributes
			},
			mirror
		});
		const takeFullSnapshot2 = (isCheckout = false) => {
			if (!recordDOM) return;
			wrappedEmit({
				type: EventType.Meta,
				data: {
					href: window.location.href,
					width: getWindowWidth(),
					height: getWindowHeight()
				}
			}, isCheckout);
			stylesheetManager.reset();
			shadowDomManager.init();
			forEachMutationBuffer((buf) => buf.lock());
			let snapshotEmitted = false;
			try {
				const node = snapshot(document, {
					mirror,
					blockClass,
					blockSelector,
					unblockSelector,
					maskAllText,
					maskTextClass,
					unmaskTextClass,
					maskTextSelector,
					unmaskTextSelector,
					inlineStylesheet,
					maskAllInputs: maskInputOptions,
					maskAttributeFn,
					maskInputFn,
					maskTextFn,
					slimDOM: slimDOMOptions,
					dataURLOptions,
					recordCanvas,
					inlineImages,
					onSerialize: (n2) => {
						if (isSerializedIframe(n2, mirror)) iframeManager.addIframe(n2);
						if (isSerializedStylesheet(n2, mirror)) stylesheetManager.trackLinkElement(n2);
						if (hasShadowRoot(n2)) shadowDomManager.addShadowRoot(n2.shadowRoot, document);
					},
					onIframeLoad: (iframe, childSn) => {
						iframeManager.attachIframe(iframe, childSn);
						const contentWindow = getIFrameContentWindow(iframe);
						if (contentWindow) canvasManager.addWindow(contentWindow);
						shadowDomManager.observeAttachShadow(iframe);
					},
					onStylesheetLoad: (linkEl, childSn) => {
						stylesheetManager.attachLinkElement(linkEl, childSn);
					},
					onBlockedImageLoad: (_imageEl, serializedNode, { width, height }) => {
						wrappedMutationEmit({
							adds: [],
							removes: [],
							texts: [],
							attributes: [{
								id: serializedNode.id,
								attributes: { style: {
									width: `${width}px`,
									height: `${height}px`
								} }
							}]
						});
					},
					keepIframeSrcFn,
					ignoreCSSAttributes
				});
				if (!node) return console.warn("Failed to snapshot the document");
				wrappedEmit({
					type: EventType.FullSnapshot,
					data: {
						node,
						initialOffset: getWindowScroll(window)
					}
				});
				snapshotEmitted = true;
			} finally {
				if (!snapshotEmitted) {
					failedSnapshotCount++;
					if (checkoutEveryNms) {
						const retryDelay = Math.min(1e3 * 2 ** (failedSnapshotCount - 1), checkoutEveryNms);
						lastFullSnapshotTimestamp = nowTimestamp() - checkoutEveryNms + retryDelay;
					}
					incrementalSnapshotCount = 0;
				}
				forEachMutationBuffer((buf) => buf.unlock());
			}
			if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0) stylesheetManager.adoptStyleSheets(document.adoptedStyleSheets, mirror.getId(document));
		};
		_takeFullSnapshot = takeFullSnapshot2;
		try {
			const handlers = [];
			const observe = (doc) => {
				return callbackWrapper(initObservers)({
					onMutation,
					mutationCb: wrappedMutationEmit,
					mousemoveCb: (positions, source) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source,
							positions
						}
					}),
					mouseInteractionCb: (d) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.MouseInteraction,
							...d
						}
					}),
					scrollCb: wrappedScrollEmit,
					viewportResizeCb: (d) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.ViewportResize,
							...d
						}
					}),
					inputCb: (v2) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.Input,
							...v2
						}
					}),
					mediaInteractionCb: (p) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.MediaInteraction,
							...p
						}
					}),
					styleSheetRuleCb: (r2) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.StyleSheetRule,
							...r2
						}
					}),
					styleDeclarationCb: (r2) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.StyleDeclaration,
							...r2
						}
					}),
					canvasMutationCb: wrappedCanvasMutationEmit,
					fontCb: (p) => wrappedEmit({
						type: EventType.IncrementalSnapshot,
						data: {
							source: IncrementalSource.Font,
							...p
						}
					}),
					selectionCb: (p) => {
						wrappedEmit({
							type: EventType.IncrementalSnapshot,
							data: {
								source: IncrementalSource.Selection,
								...p
							}
						});
					},
					customElementCb: (c2) => {
						wrappedEmit({
							type: EventType.IncrementalSnapshot,
							data: {
								source: IncrementalSource.CustomElement,
								...c2
							}
						});
					},
					blockClass,
					ignoreClass,
					ignoreSelector,
					maskAllText,
					maskTextClass,
					unmaskTextClass,
					maskTextSelector,
					unmaskTextSelector,
					maskInputOptions,
					inlineStylesheet,
					sampling,
					recordDOM,
					recordCanvas,
					inlineImages,
					userTriggeredOnInput,
					collectFonts,
					doc,
					maskAttributeFn,
					maskInputFn,
					maskTextFn,
					keepIframeSrcFn,
					blockSelector,
					unblockSelector,
					slimDOMOptions,
					dataURLOptions,
					mirror,
					iframeManager,
					stylesheetManager,
					shadowDomManager,
					processedNodeManager,
					canvasManager,
					ignoreCSSAttributes,
					plugins: plugins?.filter((p) => p.observer)?.map((p) => ({
						observer: p.observer,
						options: p.options,
						callback: (payload) => wrappedEmit({
							type: EventType.Plugin,
							data: {
								plugin: p.name,
								payload
							}
						})
					})) || []
				}, {});
			};
			iframeManager.addLoadListener((iframeEl) => {
				try {
					handlers.push(observe(iframeEl.contentDocument));
				} catch (error) {
					console.warn(error);
				}
			});
			const init = () => {
				takeFullSnapshot2();
				handlers.push(observe(document));
			};
			if (document.readyState === "interactive" || document.readyState === "complete") init();
			else {
				handlers.push(on("DOMContentLoaded", () => {
					wrappedEmit({
						type: EventType.DomContentLoaded,
						data: {}
					});
					if (recordAfter === "DOMContentLoaded") init();
				}));
				handlers.push(on("load", () => {
					wrappedEmit({
						type: EventType.Load,
						data: {}
					});
					if (recordAfter === "load") init();
				}, window));
			}
			return () => {
				const errors = runAll([
					...handlers,
					() => processedNodeManager.destroy(),
					() => {
						_takeFullSnapshot = void 0;
					},
					unregisterErrorHandler
				]);
				if (errors.length > 0) throw errors[0];
			};
		} catch (error) {
			console.warn(error);
		}
	}
	function takeFullSnapshot(isCheckout) {
		if (!_takeFullSnapshot) throw new Error("please take full snapshot after start recording");
		_takeFullSnapshot(isCheckout);
	}
	record.mirror = mirror;
	record.takeFullSnapshot = takeFullSnapshot;
	function _getCanvasManager(getCanvasManagerFn, options) {
		try {
			return getCanvasManagerFn ? getCanvasManagerFn(options) : new CanvasManagerNoop();
		} catch {
			console.warn("Unable to initialize CanvasManager");
			return new CanvasManagerNoop();
		}
	}
	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation.
	
	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.
	
	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */
	var n$1;
	(function(t2) {
		t2[t2.NotStarted = 0] = "NotStarted", t2[t2.Running = 1] = "Running", t2[t2.Stopped = 2] = "Stopped";
	})(n$1 || (n$1 = {}));
	// \0@oxc-project+runtime@0.158.0/helpers/esm/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	// \0@oxc-project+runtime@0.158.0/helpers/esm/toPrimitive.js
	function toPrimitive(t, e) {
		if ("object" != _typeof(t) || !t) return t;
		var r;
		if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
			var i = r.call(t, e || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === e ? String : Number)(t);
	}
	// \0@oxc-project+runtime@0.158.0/helpers/esm/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	// \0@oxc-project+runtime@0.158.0/helpers/esm/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	// ../../node_modules/.pnpm/web-vitals@6.2.3/node_modules/web-vitals/dist/web-vitals.js
	let t$1 = -1;
	const n = () => t$1;
	const e = (n) => {
		addEventListener("pageshow", (e) => {
			e.persisted && (t$1 = e.timeStamp, n(e));
		}, !0);
	};
	const i = (t, n, e, i) => {
		let o, s;
		return (a) => {
			n.value >= 0 && (a || i) && (s = n.value - (o ?? 0), (s || void 0 === o) && (o = n.value, n.delta = s, n.rating = ((t, n) => t > n[1] ? "poor" : t > n[0] ? "needs-improvement" : "good")(n.value, e), t(n)));
		};
	};
	const o = (t) => {
		requestAnimationFrame(() => requestAnimationFrame(() => t()));
	};
	const s = () => {
		const t = performance.getEntriesByType("navigation")[0];
		if (t && t.responseStart > 0 && t.responseStart < performance.now()) return t;
	};
	const a = () => s()?.activationStart ?? 0;
	let r = -1;
	const c = /* @__PURE__ */ new Set();
	const f = () => "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0;
	const h = (t) => {
		if ("hidden" === document.visibilityState) {
			if ("visibilitychange" === t.type) for (const t of c) t();
			isFinite(r) || (r = "visibilitychange" === t.type ? t.timeStamp : 0, removeEventListener("prerenderingchange", h, !0));
		}
	};
	const d = (t = !1) => {
		if (t && (r = 1 / 0), r < 0) {
			const t = a();
			r = (document.prerendering ? void 0 : globalThis.performance.getEntriesByType("visibility-state").find((n) => "hidden" === n.name && n.startTime >= t)?.startTime) ?? f(), addEventListener("visibilitychange", h, !0), addEventListener("prerenderingchange", h, !0), e(() => {
				setTimeout(() => {
					r = f();
				});
			});
		}
		return {
			get firstHiddenTime() {
				return r;
			},
			onHidden(t) {
				c.add(t);
			}
		};
	};
	const l = (t, e = -1, i, o = 0, r, c, f) => {
		const h = s(), d = h?.navigationId || 0;
		let l = "navigate";
		i ? l = i : n() >= 0 ? l = "back-forward-cache" : h && (document.prerendering || a() > 0 ? l = "prerender" : document.wasDiscarded ? l = "restore" : h.type && (l = h.type.replace(/_/g, "-")));
		return {
			name: t,
			value: e,
			rating: "good",
			delta: 0,
			entries: [],
			id: `v6-${Date.now()}-${Math.floor(8999999999999 * Math.random()) + 0xe8d4a51000}`,
			navigationType: l,
			navigationId: o || d,
			navigationInteractionId: r,
			navigationURL: c || h?.name,
			navigationStartTime: f || 0
		};
	};
	const g = /* @__PURE__ */ new WeakMap();
	function u(t, n) {
		let e = g.get(n);
		return e || (e = /* @__PURE__ */ new WeakMap(), g.set(n, e)), e.get(t) || e.set(t, new n()), e.get(t);
	}
	var v = class {
		constructor() {
			_defineProperty(this, "t", void 0);
			_defineProperty(this, "i", 0);
			_defineProperty(this, "o", []);
		}
		h(t) {
			if (t.hadRecentInput) return;
			const n = this.o[0], e = this.o.at(-1);
			this.i && n && e && t.startTime - e.startTime < 1e3 && t.startTime - n.startTime < 5e3 ? (this.i += t.value, this.o.push(t)) : (this.i = t.value, this.o = [t]), this.t?.(t);
		}
	};
	const m = (t, n, e = {}) => {
		try {
			const i = t.filter((t) => PerformanceObserver.supportedEntryTypes.includes(t));
			if (i.length > 0) {
				const t = new PerformanceObserver((t) => {
					queueMicrotask(() => {
						const e = t.getEntries();
						i.length > 1 && e.sort((t, n) => t.startTime + t.duration - (n.startTime + n.duration)), n(e);
					});
				});
				for (const n of i) t.observe({
					type: n,
					buffered: !0,
					...e
				});
				return t;
			}
		} catch {}
	};
	const p = (t) => globalThis.PerformanceObserver?.supportedEntryTypes?.includes("soft-navigation") && "function" == typeof globalThis.PerformanceSoftNavigation?.prototype?.getLargestInteractionContentfulPaint && t && t.reportSoftNavs;
	const b = (t, n) => {
		if (t.set(n.navigationId, n), t.size > 2) {
			const n = t.keys().next().value;
			void 0 !== n && t.delete(n);
		}
	};
	const T = (t) => {
		let n = !1;
		return () => {
			n || (t(), n = !0);
		};
	};
	var y = class {
		constructor() {
			_defineProperty(this, "l", void 0);
		}
	};
	const _ = (t) => {
		document.prerendering ? addEventListener("prerenderingchange", t, !0) : t();
	};
	const E = [1800, 3e3];
	const M = (t, s = {}) => {
		const r = p(s);
		_(() => {
			const c = u(s, y), f = d();
			let h, g = l("FCP");
			const v = m(["paint"], (t) => {
				for (const n of t) "first-contentful-paint" === n.name && (v.disconnect(), n.startTime < f.firstHiddenTime && (g.value = Math.max(n.startTime - a(), 0), g.entries.push(n), g.navigationId = n.navigationId || g.navigationId, h(!0)));
			});
			if (v && (h = i(t, g, E, s.reportAllChanges), e((e) => {
				g = l("FCP", -1, "back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n()), h = i(t, g, E, s.reportAllChanges), o(() => {
					g.value = performance.now() - e.timeStamp, h(!0);
				});
			})), r) m(["soft-navigation"], (n) => {
				n.forEach((n) => {
					c.l && n.navigationId && b(c.l, n);
					const e = Math.max((n.presentationTime || n.paintTime || 0) - n.startTime, 0);
					g = l("FCP", e, "soft-navigation", n.navigationId, n.interactionId, n.name, n.startTime), h = i(t, g, E, s.reportAllChanges), h(!0);
				});
			}, s);
		});
	};
	const L = [.1, .25];
	const P = (t, s = {}) => {
		const a = d();
		M(T(() => {
			let r, c = l("CLS", 0);
			const f = u(s, v), h = (n, e, o, a, h) => {
				c = l("CLS", 0, n, e, o, a, h), f.i = 0, r = i(t, c, L, s.reportAllChanges);
			}, d = (t = !1) => {
				f.i > c.value && (c.value = f.i, c.entries = f.o), r(t);
			}, g = (t) => {
				d(!0), h("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
			}, b = (t) => {
				for (const n of t) "soft-navigation" !== n.entryType ? f.h(n) : g(n);
				d();
			}, T = ["layout-shift"];
			p(s) && T.push("soft-navigation");
			const y = m(T, b);
			y && (r = i(t, c, L, s.reportAllChanges), a.onHidden(() => {
				b(y.takeRecords()), r(!0);
			}), e(() => {
				h("back-forward-cache", c.navigationId, c.navigationInteractionId, c.navigationURL, n()), o(r);
			}), setTimeout(r));
		}));
	};
	let w = 0;
	let I = 1 / 0;
	let k = 0;
	const C = (t) => {
		for (const n of t) n.interactionId && (I = Math.min(I, n.interactionId), k = Math.max(k, n.interactionId), w = k ? (k - I) / 7 + 1 : 0);
	};
	let F;
	const N = () => F ? w : performance.interactionCount ?? 0;
	const B = () => {
		"interactionCount" in performance || F || (F = m(["event"], C, { durationThreshold: 0 }));
	};
	var S = class {
		constructor() {
			_defineProperty(this, "u", 0);
			_defineProperty(this, "v", []);
			_defineProperty(this, "m", /* @__PURE__ */ new Map());
			_defineProperty(this, "p", void 0);
			_defineProperty(this, "T", void 0);
		}
		_() {
			return N() - this.u;
		}
		M() {
			this.u = N(), this.v.length = 0, this.m.clear();
		}
		L(t) {
			const n = this._(), e = Math.min(this.v.length - 1, Math.floor(n / 50));
			return !n || -1 !== e || "soft-navigation" !== t && "back-forward-cache" !== t ? this.v[e] : {
				P: 8,
				id: -1,
				entries: []
			};
		}
		h(t) {
			if (this.p?.(t), !t.interactionId) return;
			const n = this.v.at(-1);
			let e = this.m.get(t.interactionId);
			if (e || this.v.length < 10 || t.duration > n.P) {
				if (e ? t.duration > e.P ? (e.entries = [t], e.P = t.duration) : t.duration === e.P && t.startTime === e.entries[0].startTime && e.entries.push(t) : (e = {
					id: t.interactionId,
					entries: [t],
					P: t.duration
				}, this.m.set(e.id, e), this.v.push(e)), this.v.sort((t, n) => n.P - t.P), this.v.length > 10) {
					const t = this.v.splice(10);
					for (const n of t) this.m.delete(n.id);
				}
				this.T?.(e);
			}
		}
	};
	const q = (t) => {
		const n = "requestIdleCallback" in globalThis ? 1e3 : 0, e = globalThis.requestIdleCallback || setTimeout, i = globalThis.cancelIdleCallback || clearTimeout;
		if ("hidden" === document.visibilityState) t();
		else {
			const o = T(t);
			let s = -1;
			const a = () => {
				i(s), o();
			};
			addEventListener("visibilitychange", a, {
				once: !0,
				capture: !0
			}), s = e(() => {
				removeEventListener("visibilitychange", a, { capture: !0 }), o();
			}, { timeout: n });
		}
	};
	const A = [200, 500];
	const x = (t, o = {}) => {
		if (!globalThis.PerformanceEventTiming || !("interactionId" in PerformanceEventTiming.prototype)) return;
		const s = d();
		_(() => {
			B();
			let a, r = l("INP");
			const c = u(o, S), f = (n, e, s, f, h) => {
				c.M(), r = l("INP", -1, n, e, s, f, h), a = i(t, r, A, o.reportAllChanges);
			}, h = () => {
				const t = c.L(r.navigationType);
				t && t.P !== r.value && (r.value = t.P, r.entries = t.entries, a());
			}, d = (t) => {
				h(), a(!0), f("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
			}, g = (t, n = !1) => {
				q(() => {
					for (const n of t) "soft-navigation" !== n.entryType ? c.h(n) : d(n);
					h(), n && a(!0);
				});
			}, v = ["event", "first-input"];
			p(o) && v.push("soft-navigation");
			const b = m(v, g, {
				...o,
				durationThreshold: o.durationThreshold ?? 40
			});
			a = i(t, r, A, o.reportAllChanges), b && (s.onHidden(() => {
				g(b.takeRecords(), !0);
			}), e(() => {
				f("back-forward-cache", r.navigationId, r.navigationInteractionId, r.navigationURL, n());
			}));
		});
	};
	var H = class {
		constructor() {
			_defineProperty(this, "p", void 0);
			_defineProperty(this, "l", void 0);
		}
		h(t) {
			this.p?.(t);
		}
	};
	const O = [2500, 4e3];
	const U = (t, s = {}) => {
		let r = !1;
		const c = p(s);
		_(() => {
			let f, h = d(), g = l("LCP");
			const v = u(s, H), p = (n, e, o, a, c) => {
				g = l("LCP", -1, n, e, o, a, c), f = i(t, g, O, s.reportAllChanges), r = !1, "soft-navigation" === n && (h = d(!0));
			}, T = (t) => {
				v.l && t.navigationId && b(v.l, t), r || f(!0), p("soft-navigation", t.navigationId, t.interactionId, t.name, t.startTime);
				const n = t.getLargestInteractionContentfulPaint?.();
				n && y([n]);
			}, y = (t) => {
				s.reportAllChanges || c || (t = t.slice(-1));
				for (const n of t) {
					if (!n) continue;
					if ("soft-navigation" === n.entryType) {
						T(n);
						continue;
					}
					let t = 0, e = [], i = n.startTime;
					if ("largest-contentful-paint" === n.entryType) t = Math.max(n.startTime - a(), 0), v.h(n), e = [n];
					else if ("interaction-contentful-paint" === n.entryType) {
						const o = n;
						if (!g.navigationId) continue;
						if ("interactionId" in o && o.interactionId != g.navigationInteractionId) continue;
						i = o.largestContentfulPaint?.renderTime || 0, t = Math.max(i - n.startTime, 0), o.largestContentfulPaint && (v.h(o.largestContentfulPaint), e = [o.largestContentfulPaint]);
					}
					i < h.firstHiddenTime && (g.value = t, g.entries = e, f());
				}
			}, _ = ["largest-contentful-paint"];
			c && _.push("interaction-contentful-paint", "soft-navigation");
			const E = m(_, y);
			if (E) {
				f = i(t, g, O, s.reportAllChanges);
				const a = [
					"keydown",
					"click",
					"visibilitychange"
				], h = (t) => {
					if (t.isTrusted && !r) {
						const t = g.id;
						q(() => {
							if (!r) {
								if (!c) {
									E.disconnect();
									for (const t of a) removeEventListener(t, h, { capture: !0 });
								}
								t === g.id && (r = !0, f(!0));
							}
						});
					}
				};
				for (const t of a) addEventListener(t, h, { capture: !0 });
				e((e) => {
					p("back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n()), f = i(t, g, O, s.reportAllChanges), o(() => {
						g.value = performance.now() - e.timeStamp, r = !0, f(!0);
					});
				});
			}
		});
	};
	// ../browser-utils/build/esm/instrumentation/performanceObserver.js
	const handlers$1 = {};
	const instrumented = {};
	let _previousCls;
	let _previousLcp;
	let _previousInp;
	const stopListeners = {};
	let _reportSoftNavs = false;
	/**
	* Add a callback that will be triggered when a CLS metric is available.
	* Returns a cleanup callback which can be called to remove the instrumentation handler.
	*
	* Pass `stopOnCallback = true` to stop listening for CLS when the cleanup callback is called.
	* This will lead to the CLS being finalized and frozen.
	*/
	function addClsInstrumentationHandler(callback, stopOnCallback = false) {
		return addMetricObserver("cls", callback, instrumentCls, _previousCls, stopOnCallback);
	}
	/**
	* Add a callback that will be triggered when a LCP metric is available.
	* Returns a cleanup callback which can be called to remove the instrumentation handler.
	*
	* Pass `stopOnCallback = true` to stop listening for LCP when the cleanup callback is called.
	* This will lead to the LCP being finalized and frozen.
	*/
	function addLcpInstrumentationHandler(callback, stopOnCallback = false) {
		return addMetricObserver("lcp", callback, instrumentLcp, _previousLcp, stopOnCallback);
	}
	/**
	* Add a callback that will be triggered when a INP metric is available.
	* Returns a cleanup callback which can be called to remove the instrumentation handler.
	*/
	function addInpInstrumentationHandler(callback) {
		return addMetricObserver("inp", callback, instrumentInp, _previousInp);
	}
	/**
	* Add a callback that will be triggered when a performance observer is triggered,
	* and receives the entries of the observer.
	* Returns a cleanup callback which can be called to remove the instrumentation handler.
	*/
	function addPerformanceInstrumentationHandler(type, callback) {
		addHandler(type, callback);
		if (!instrumented[type]) {
			instrumentPerformanceObserver(type);
			instrumented[type] = true;
		}
		return getCleanupCallback(type, callback);
	}
	/** Trigger all handlers of a given type. */
	function triggerHandlers(type, data) {
		const typeHandlers = handlers$1[type];
		if (!typeHandlers?.length) return;
		for (const handler of typeHandlers) try {
			handler(data);
		} catch (e) {
			debug$1.error(`Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`, e);
		}
	}
	/**
	* Wraps a metric callback so that metrics reported after a back/forward-cache restore are dropped
	* unless `enableBfcacheReporting` was called. See there for why they are off by default.
	*/
	function unlessBfcacheDisabled(callback) {
		return (metric) => {
			if (metric.navigationType === "back-forward-cache") return;
			callback(metric);
		};
	}
	function instrumentCls() {
		if (!("at" in Array.prototype)) return;
		return P(unlessBfcacheDisabled((metric) => {
			triggerHandlers("cls", { metric });
			_previousCls = metric;
		}), {
			reportAllChanges: true,
			reportSoftNavs: _reportSoftNavs
		});
	}
	function instrumentLcp() {
		return U(unlessBfcacheDisabled((metric) => {
			triggerHandlers("lcp", { metric });
			_previousLcp = metric;
		}), {
			reportAllChanges: true,
			reportSoftNavs: _reportSoftNavs
		});
	}
	function instrumentInp() {
		return x(unlessBfcacheDisabled((metric) => {
			triggerHandlers("inp", { metric });
			_previousInp = metric;
		}), { reportSoftNavs: _reportSoftNavs });
	}
	function addMetricObserver(type, callback, instrumentFn, previousValue, stopOnCallback = false) {
		addHandler(type, callback);
		if (!instrumented[type]) {
			instrumented[type] = true;
			Promise.resolve().then(() => {
				stopListeners[type] = instrumentFn();
			});
		}
		if (previousValue) callback({ metric: previousValue });
		return getCleanupCallback(type, callback, stopOnCallback);
	}
	function instrumentPerformanceObserver(type) {
		const options = {
			type,
			buffered: true
		};
		if (type === "event") options.durationThreshold = 0;
		try {
			if (PerformanceObserver.supportedEntryTypes.includes(type)) new PerformanceObserver((list) => {
				Promise.resolve().then(() => {
					triggerHandlers(type, { entries: list.getEntries() });
				});
			}).observe(options);
		} catch {}
	}
	function addHandler(type, handler) {
		handlers$1[type] = handlers$1[type] || [];
		handlers$1[type].push(handler);
	}
	function getCleanupCallback(type, callback, stopOnCleanup = false) {
		return () => {
			if (stopOnCleanup) stopListeners[type]?.();
			const typeHandlers = handlers$1[type];
			if (!typeHandlers) return;
			const index = typeHandlers.indexOf(callback);
			if (index !== -1) typeHandlers.splice(index, 1);
		};
	}
	// ../browser-utils/build/esm/types.js
	const WINDOW = GLOBAL_OBJ;
	// ../browser-utils/build/esm/htmlTreeAsString.js
	const DEFAULT_MAX_STRING_LENGTH = 80;
	const accessors = {};
	try {
		if (typeof Node !== "undefined") accessors.parentNode = Object.getOwnPropertyDescriptor(Node.prototype, "parentNode").get;
		if (typeof Element !== "undefined") {
			accessors.tagName = Object.getOwnPropertyDescriptor(Element.prototype, "tagName").get;
			accessors.id = Object.getOwnPropertyDescriptor(Element.prototype, "id").get;
			accessors.className = Object.getOwnPropertyDescriptor(Element.prototype, "className").get;
			accessors.getAttribute = Element.prototype.getAttribute;
		}
		if (typeof HTMLElement !== "undefined") accessors.dataset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "dataset").get;
	} catch {}
	function _safeRead(el, prop, arg) {
		const fn = accessors[prop];
		if (fn) try {
			return fn.call(el, arg);
		} catch {}
		const val = el[prop];
		return typeof val === "function" ? val.call(el, arg) : val;
	}
	/**
	* Given a child DOM element, returns a query-selector statement describing that
	* and its ancestors
	* e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
	* @returns generated DOM path
	*/
	function htmlTreeAsString(elem, options = {}) {
		if (!elem) return "<unknown>";
		try {
			let currentElem = elem;
			const MAX_TRAVERSE_HEIGHT = 5;
			const out = [];
			let height = 0;
			let len = 0;
			const separator = " > ";
			const sepLength = 3;
			let nextStr;
			const keyAttrs = Array.isArray(options) ? options : options.keyAttrs;
			const maskAttributeFn = Array.isArray(options) ? void 0 : options.maskAttributeFn;
			const maxStringLength = !Array.isArray(options) && options.maxStringLength || DEFAULT_MAX_STRING_LENGTH;
			while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
				nextStr = _htmlElementAsString(currentElem, keyAttrs, maskAttributeFn);
				if (nextStr === "html" || height > 1 && len + out.length * sepLength + nextStr.length >= maxStringLength) break;
				out.push(nextStr);
				len += nextStr.length;
				currentElem = _safeRead(currentElem, "parentNode");
			}
			return out.reverse().join(separator);
		} catch {
			return "<unknown>";
		}
	}
	/**
	* Returns a simple, query-selector representation of a DOM element
	* e.g. [HTMLElement] => input#foo.btn[name=baz]
	* @returns generated DOM path
	*/
	function _htmlElementAsString(el, keyAttrs, maskAttributeFn) {
		const out = [];
		const tagName = _safeRead(el, "tagName");
		if (!tagName) return "";
		if (typeof HTMLElement !== "undefined") {
			if (el instanceof HTMLElement) {
				const dataset = _safeRead(el, "dataset");
				if (dataset) {
					if (dataset["sentryComponent"]) return maskAttributeFn ? maskAttributeFn("data-sentry-component", dataset["sentryComponent"], el) : dataset["sentryComponent"];
					if (dataset["sentryElement"]) return maskAttributeFn ? maskAttributeFn("data-sentry-element", dataset["sentryElement"], el) : dataset["sentryElement"];
				}
			}
		}
		out.push(tagName.toLowerCase());
		const keyAttrPairs = keyAttrs?.length ? keyAttrs.filter((keyAttr) => _safeRead(el, "getAttribute", keyAttr)).map((keyAttr) => [keyAttr, _safeRead(el, "getAttribute", keyAttr)]) : null;
		if (keyAttrPairs?.length) keyAttrPairs.forEach(([key, value]) => {
			out.push(`[${key}="${maskAttributeFn && value ? maskAttributeFn(key, value, el) : value}"]`);
		});
		else {
			const id = _safeRead(el, "id");
			if (id) out.push(`#${maskAttributeFn ? maskAttributeFn("id", id, el) : id}`);
			const className = _safeRead(el, "className");
			if (className && isString(className)) {
				const classes = (maskAttributeFn ? maskAttributeFn("class", className, el) : className).split(/\s+/);
				for (const c of classes) out.push(`.${c}`);
			}
		}
		for (const k of [
			"aria-label",
			"type",
			"name",
			"title",
			"alt"
		]) {
			const attr = _safeRead(el, "getAttribute", k);
			if (attr) out.push(`[${k}="${maskAttributeFn ? maskAttributeFn(k, attr, el) : attr}"]`);
		}
		return out.join("");
	}
	// ../browser-utils/build/esm/getLocationHref.js
	/**
	* A safe form of location.href.
	*/
	function getLocationHref() {
		try {
			return WINDOW.document?.location.href ?? "";
		} catch {
			return "";
		}
	}
	// ../browser-utils/build/esm/instrumentation/dom.js
	const DEBOUNCE_DURATION = 1e3;
	let debounceTimerID;
	let lastCapturedEventType;
	let lastCapturedEventTargetId;
	function getCapture(options) {
		return typeof options === "boolean" ? options : !!options?.capture;
	}
	/**
	* Add an instrumentation handler for when a click or a keypress happens.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addClickKeypressInstrumentationHandler(handler) {
		const type = "dom";
		addHandler$1(type, handler);
		maybeInstrument(type, instrumentDOM);
	}
	/** Exported for tests only. */
	function instrumentDOM() {
		if (!WINDOW.document) return;
		const triggerDOMHandler = triggerHandlers$1.bind(null, "dom");
		const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
		WINDOW.document.addEventListener("click", globalDOMEventHandler, false);
		WINDOW.document.addEventListener("keypress", globalDOMEventHandler, false);
		["EventTarget", "Node"].forEach((target) => {
			const proto = WINDOW[target]?.prototype;
			if (!proto?.hasOwnProperty?.("addEventListener")) return;
			fill(proto, "addEventListener", function(originalAddEventListener) {
				return function(type, listener, options) {
					if ((type === "click" || type == "keypress") && listener) try {
						const handlers = this.__sentry_instrumentation_handlers__ = this.__sentry_instrumentation_handlers__ || {};
						const handlerForType = handlers[type] = handlers[type] || {
							captureListeners: /* @__PURE__ */ new WeakSet(),
							bubbleListeners: /* @__PURE__ */ new WeakSet(),
							listenerCount: 0
						};
						const capture = getCapture(options);
						if (!handlerForType.handler) {
							const handler = makeDOMEventHandler(triggerDOMHandler);
							handlerForType.handler = handler;
							handlerForType.capture = capture;
							originalAddEventListener.call(this, type, handler, handlerForType.capture);
						}
						const listeners = handlerForType[capture ? "captureListeners" : "bubbleListeners"];
						if (!listeners.has(listener)) {
							if (typeof options === "object" && (options?.once || options?.signal)) handlerForType.sticky = true;
							else {
								listeners.add(listener);
								handlerForType.listenerCount++;
							}
						}
					} catch {}
					return originalAddEventListener.call(this, type, listener, options);
				};
			});
			fill(proto, "removeEventListener", function(originalRemoveEventListener) {
				return function(type, listener, options) {
					if ((type === "click" || type == "keypress") && listener) try {
						const handlers = this.__sentry_instrumentation_handlers__ || {};
						const handlerForType = handlers[type];
						if (handlerForType?.[getCapture(options) ? "captureListeners" : "bubbleListeners"].delete(listener)) {
							if (!--handlerForType.listenerCount && !handlerForType.sticky) {
								originalRemoveEventListener.call(this, type, handlerForType.handler, handlerForType.capture);
								handlerForType.handler = void 0;
								delete handlers[type];
							}
							if (Object.keys(handlers).length === 0) delete this.__sentry_instrumentation_handlers__;
						}
					} catch {}
					return originalRemoveEventListener.call(this, type, listener, options);
				};
			});
		});
	}
	/**
	* Check whether the event is similar to the last captured one. For example, two click events on the same button.
	*/
	function isSimilarToLastCapturedEvent(event) {
		if (event.type !== lastCapturedEventType) return false;
		try {
			if (!event.target || event.target._sentryId !== lastCapturedEventTargetId) return false;
		} catch {}
		return true;
	}
	/**
	* Decide whether an event should be captured.
	* @param event event to be captured
	*/
	function shouldSkipDOMEvent(eventType, target) {
		if (eventType !== "keypress") return false;
		if (!target?.tagName) return true;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return false;
		return true;
	}
	/**
	* Wraps addEventListener to capture UI breadcrumbs
	*/
	function makeDOMEventHandler(handler, globalListener = false) {
		return (event) => {
			if (!event || event["_sentryCaptured"]) return;
			const target = getEventTarget(event);
			if (shouldSkipDOMEvent(event.type, target)) return;
			addNonEnumerableProperty(event, "_sentryCaptured", true);
			if (target && !target._sentryId) addNonEnumerableProperty(target, "_sentryId", uuid4());
			const name = event.type === "keypress" ? "input" : event.type;
			if (!isSimilarToLastCapturedEvent(event)) {
				handler({
					event,
					name,
					global: globalListener
				});
				lastCapturedEventType = event.type;
				lastCapturedEventTargetId = target ? target._sentryId : void 0;
			}
			clearTimeout(debounceTimerID);
			debounceTimerID = WINDOW.setTimeout(() => {
				lastCapturedEventTargetId = void 0;
				lastCapturedEventType = void 0;
			}, DEBOUNCE_DURATION);
		};
	}
	function getEventTarget(event) {
		try {
			return event.target;
		} catch {
			return null;
		}
	}
	// ../browser-utils/build/esm/instrumentation/history.js
	let lastHref;
	/**
	* Tells whether current environment supports History API
	* {@link supportsHistory}.
	*
	* @returns Answer to the given question.
	*/
	function supportsHistory() {
		return "history" in WINDOW && !!WINDOW.history;
	}
	/**
	* Add an instrumentation handler for when a fetch request happens.
	* The handler function is called once when the request starts and once when it ends,
	* which can be identified by checking if it has an `endTimestamp`.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addHistoryInstrumentationHandler(handler) {
		const type = "history";
		addHandler$1(type, handler);
		maybeInstrument(type, instrumentHistory);
	}
	/**
	* Exported just for testing
	*/
	function instrumentHistory() {
		WINDOW.addEventListener("popstate", () => {
			const to = WINDOW.location.href;
			const from = lastHref;
			lastHref = to;
			if (from === to) return;
			triggerHandlers$1("history", {
				from,
				to
			});
		});
		if (!supportsHistory()) return;
		function historyReplacementFunction(originalHistoryFunction) {
			return function(...args) {
				const url = args.length > 2 ? args[2] : void 0;
				if (url) {
					const from = lastHref;
					const to = getAbsoluteUrl(String(url));
					lastHref = to;
					if (from === to) return originalHistoryFunction.apply(this, args);
					triggerHandlers$1("history", {
						from,
						to
					});
				}
				return originalHistoryFunction.apply(this, args);
			};
		}
		fill(WINDOW.history, "pushState", historyReplacementFunction);
		fill(WINDOW.history, "replaceState", historyReplacementFunction);
	}
	function getAbsoluteUrl(urlOrPath) {
		try {
			return new URL(urlOrPath, WINDOW.location.origin).toString();
		} catch {
			return urlOrPath;
		}
	}
	// ../browser-utils/build/esm/getNativeImplementation.js
	const cachedImplementations = {};
	/**
	* Get the native implementation of a browser function.
	*
	* This can be used to ensure we get an unwrapped version of a function, in cases where a wrapped function can lead to problems.
	*
	* The following methods can be retrieved:
	* - `setTimeout`: This can be wrapped by e.g. Angular, causing change detection to be triggered.
	* - `fetch`: This can be wrapped by e.g. ad-blockers, causing an infinite loop when a request is blocked.
	*/
	function getNativeImplementation(name) {
		const cached = cachedImplementations[name];
		if (cached) return cached;
		let impl = WINDOW[name];
		if (isNativeFunction(impl)) return cachedImplementations[name] = impl.bind(WINDOW);
		const document = WINDOW.document;
		if (document && typeof document.createElement === "function") try {
			const sandbox = document.createElement("iframe");
			sandbox.hidden = true;
			document.head.appendChild(sandbox);
			const contentWindow = sandbox.contentWindow;
			if (contentWindow?.[name]) impl = contentWindow[name];
			document.head.removeChild(sandbox);
		} catch (e) {
			debug$1.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
		}
		if (!impl) return impl;
		return cachedImplementations[name] = impl.bind(WINDOW);
	}
	/**
	* Get an unwrapped `setTimeout` method.
	* This ensures that even if e.g. Angular wraps `setTimeout`, we get the native implementation,
	* avoiding triggering change detection.
	*/
	function setTimeout$1(...rest) {
		try {
			return getNativeImplementation("setTimeout")(...rest);
		} catch (e) {
			debug$1.warn("Could not use native setTimeout implementation, falling back to window.setTimeout: ", e);
			const fallback = WINDOW.setTimeout.bind(WINDOW);
			cachedImplementations.setTimeout = fallback;
			return fallback(...rest);
		}
	}
	// ../browser-utils/build/esm/instrumentation/xhr.js
	const SENTRY_XHR_DATA_KEY = "__sentry_xhr_v3__";
	// ../browser-utils/build/esm/networkUtils.js
	const ORIGINAL_REQ_BODY = Symbol.for("sentry__originalRequestBody");
	/**
	* Serializes FormData.
	*
	* This is a bit simplified, but gives us a decent estimate.
	* This converts e.g. { name: 'Anne Smith', age: 13 } to 'name=Anne+Smith&age=13'.
	*
	*/
	function serializeFormData(formData) {
		return new URLSearchParams(formData).toString();
	}
	/** Get the string representation of a body. */
	function getBodyString(body, _debug = debug$1) {
		try {
			if (typeof body === "string") return [body];
			if (body instanceof URLSearchParams) return [body.toString()];
			if (body instanceof FormData) return [serializeFormData(body)];
			if (!body) return [void 0];
		} catch (error) {
			_debug.error(error, "Failed to serialize body", body);
			return [void 0, "BODY_PARSE_ERROR"];
		}
		_debug.log("Skipping network body because of body type", body);
		return [void 0, "UNPARSEABLE_BODY_TYPE"];
	}
	/**
	* Parses the fetch arguments to extract the request payload.
	*
	* In case of a Request object, this function attempts to retrieve the original body by looking for a Sentry-patched symbol.
	*/
	function getFetchRequestArgBody(fetchArgs = []) {
		if (fetchArgs.length >= 2 && fetchArgs[1] && typeof fetchArgs[1] === "object" && "body" in fetchArgs[1]) return fetchArgs[1].body;
		if (fetchArgs.length >= 1 && fetchArgs[0] instanceof Request) {
			const originalBody = fetchArgs[0][ORIGINAL_REQ_BODY];
			if (originalBody !== void 0) return originalBody;
			return;
		}
	}
	/**
	* Parses XMLHttpRequest response headers into a Record.
	* Extracted from replay internals to be reusable.
	*/
	function parseXhrResponseHeaders(xhr) {
		let headers;
		try {
			headers = xhr.getAllResponseHeaders();
		} catch (error) {
			debug$1.error(error, "Failed to get xhr response headers", xhr);
			return {};
		}
		if (!headers) return {};
		return headers.split("\r\n").reduce((acc, line) => {
			const [key, value] = line.split(": ");
			if (value) acc[key.toLowerCase()] = value;
			return acc;
		}, {});
	}
	// src/util/timestamp.ts
	/**
	* Converts a timestamp to ms, if it was in s, or keeps it as ms.
	*/
	function timestampToMs(timestamp) {
		return timestamp > 9999999999 ? timestamp : timestamp * 1e3;
	}
	/**
	* Converts a timestamp to s, if it was in ms, or keeps it as s.
	*/
	function timestampToS(timestamp) {
		return timestamp > 9999999999 ? timestamp / 1e3 : timestamp;
	}
	// src/coreHandlers/util/addBreadcrumbEvent.ts
	/**
	* Add a breadcrumb event to replay.
	*/
	function addBreadcrumbEvent(replay, breadcrumb) {
		if (breadcrumb.category === "sentry.transaction") return;
		if (["ui.click", "ui.input"].includes(breadcrumb.category)) replay.triggerUserActivity();
		else replay.checkAndHandleExpiredSession();
		replay.addUpdate(() => {
			replay.throttledAddEvent({
				type: EventType.Custom,
				timestamp: (breadcrumb.timestamp || 0) * 1e3,
				data: {
					tag: "breadcrumb",
					payload: normalize(breadcrumb, 10, 1e3)
				}
			});
			return breadcrumb.category === "console";
		});
	}
	// src/coreHandlers/util/domUtils.ts
	const INTERACTIVE_SELECTOR = "button,a";
	/** Get the closest interactive parent element, or else return the given element. */
	function getClosestInteractive(element) {
		return element.closest(INTERACTIVE_SELECTOR) || element;
	}
	/**
	* For clicks, we check if the target is inside of a button or link
	* If so, we use this as the target instead
	* This is useful because if you click on the image in <button><img></button>,
	* The target will be the image, not the button, which we don't want here
	*/
	function getClickTargetNode(event) {
		const target = getTargetNode(event);
		if (!target || !(target instanceof Element)) return target;
		return getClosestInteractive(target);
	}
	/** Get the event target node. */
	function getTargetNode(event) {
		if (isEventWithTarget(event)) return event.target;
		return event;
	}
	function isEventWithTarget(event) {
		return isObjectLike(event) && "target" in event;
	}
	// src/coreHandlers/util/onWindowOpen.ts
	let handlers;
	/**
	* Register a handler to be called when `window.open()` is called.
	* Returns a cleanup function.
	*/
	function onWindowOpen(cb) {
		if (!handlers) {
			handlers = [];
			monkeyPatchWindowOpen();
		}
		handlers.push(cb);
		return () => {
			const pos = handlers ? handlers.indexOf(cb) : -1;
			if (pos > -1) handlers.splice(pos, 1);
		};
	}
	function monkeyPatchWindowOpen() {
		fill(WINDOW$1, "open", function(originalWindowOpen) {
			return function(...args) {
				if (handlers) try {
					handlers.forEach((handler) => handler());
				} catch {}
				return originalWindowOpen.apply(WINDOW$1, args);
			};
		});
	}
	// src/coreHandlers/handleClick.ts
	/** Any IncrementalSource for rrweb that we interpret as a kind of mutation. */
	const IncrementalMutationSources = /* @__PURE__ */ new Set([
		IncrementalSource.Mutation,
		IncrementalSource.StyleSheetRule,
		IncrementalSource.StyleDeclaration,
		IncrementalSource.AdoptedStyleSheet,
		IncrementalSource.CanvasMutation,
		IncrementalSource.Selection,
		IncrementalSource.MediaInteraction
	]);
	/** Handle a click. */
	function handleClick(clickDetector, clickBreadcrumb, node) {
		clickDetector.handleClick(clickBreadcrumb, node);
	}
	/** A click detector class that can be used to detect slow or rage clicks on elements. */
	var ClickDetector = class {
		constructor(replay, slowClickConfig, _addBreadcrumbEvent = addBreadcrumbEvent) {
			this._lastMutation = 0;
			this._lastScroll = 0;
			this._clicks = [];
			this._timeout = slowClickConfig.timeout / 1e3;
			this._threshold = slowClickConfig.threshold / 1e3;
			this._scrollTimeout = slowClickConfig.scrollTimeout / 1e3;
			this._replay = replay;
			this._ignoreSelector = slowClickConfig.ignoreSelector;
			this._addBreadcrumbEvent = _addBreadcrumbEvent;
		}
		/** Register click detection handlers on mutation or scroll. */
		addListeners() {
			const cleanupWindowOpen = onWindowOpen(() => {
				this._lastMutation = nowInSeconds();
			});
			this._teardown = () => {
				cleanupWindowOpen();
				this._clicks = [];
				this._lastMutation = 0;
				this._lastScroll = 0;
			};
		}
		/** Clean up listeners. */
		removeListeners() {
			if (this._teardown) this._teardown();
			if (this._checkClickTimeout) clearTimeout(this._checkClickTimeout);
		}
		/** @inheritDoc */
		handleClick(breadcrumb, node) {
			if (ignoreElement(node, this._ignoreSelector) || !isClickBreadcrumb(breadcrumb)) return;
			const newClick = {
				timestamp: timestampToS(breadcrumb.timestamp),
				clickBreadcrumb: breadcrumb,
				clickCount: 0,
				node
			};
			if (this._clicks.some((click) => click.node === newClick.node && Math.abs(click.timestamp - newClick.timestamp) < 1)) return;
			this._clicks.push(newClick);
			if (this._clicks.length === 1) this._scheduleCheckClicks();
		}
		/** @inheritDoc */
		registerMutation(timestamp = Date.now()) {
			this._lastMutation = timestampToS(timestamp);
		}
		/** @inheritDoc */
		registerScroll(timestamp = Date.now()) {
			this._lastScroll = timestampToS(timestamp);
		}
		/** @inheritDoc */
		registerClick(element) {
			const node = getClosestInteractive(element);
			this._handleMultiClick(node);
		}
		/** Count multiple clicks on elements. */
		_handleMultiClick(node) {
			this._getClicks(node).forEach((click) => {
				click.clickCount++;
			});
		}
		/** Get all pending clicks for a given node. */
		_getClicks(node) {
			return this._clicks.filter((click) => click.node === node);
		}
		/** Check the clicks that happened. */
		_checkClicks() {
			const timedOutClicks = [];
			const now = nowInSeconds();
			this._clicks.forEach((click) => {
				if (click.mutationAfter === void 0 && this._lastMutation) click.mutationAfter = click.timestamp <= this._lastMutation ? this._lastMutation - click.timestamp : void 0;
				if (click.scrollAfter === void 0 && this._lastScroll) click.scrollAfter = click.timestamp <= this._lastScroll ? this._lastScroll - click.timestamp : void 0;
				if (click.timestamp + this._timeout <= now) timedOutClicks.push(click);
			});
			for (const click of timedOutClicks) {
				const pos = this._clicks.indexOf(click);
				if (pos > -1) {
					this._generateBreadcrumbs(click);
					this._clicks.splice(pos, 1);
				}
			}
			if (this._clicks.length) this._scheduleCheckClicks();
		}
		/** Generate matching breadcrumb(s) for the click. */
		_generateBreadcrumbs(click) {
			const replay = this._replay;
			const hadScroll = click.scrollAfter !== void 0 && click.scrollAfter <= this._scrollTimeout;
			const hadMutation = click.mutationAfter !== void 0 && click.mutationAfter <= this._threshold;
			const isSlowClick = !hadScroll && !hadMutation;
			const { clickCount, clickBreadcrumb } = click;
			if (isSlowClick) {
				const timeAfterClickMs = Math.min(click.mutationAfter || this._timeout, this._timeout) * 1e3;
				const endReason = timeAfterClickMs < this._timeout * 1e3 ? "mutation" : "timeout";
				const breadcrumb = {
					type: "default",
					message: clickBreadcrumb.message,
					timestamp: clickBreadcrumb.timestamp,
					category: "ui.slowClickDetected",
					data: {
						...clickBreadcrumb.data,
						url: WINDOW$1.location.href,
						route: replay.getCurrentRoute(),
						timeAfterClickMs,
						endReason,
						clickCount: clickCount || 1
					}
				};
				this._addBreadcrumbEvent(replay, breadcrumb);
				return;
			}
			if (clickCount > 1) {
				const breadcrumb = {
					type: "default",
					message: clickBreadcrumb.message,
					timestamp: clickBreadcrumb.timestamp,
					category: "ui.multiClick",
					data: {
						...clickBreadcrumb.data,
						url: WINDOW$1.location.href,
						route: replay.getCurrentRoute(),
						clickCount,
						metric: true
					}
				};
				this._addBreadcrumbEvent(replay, breadcrumb);
			}
		}
		/** Schedule to check current clicks. */
		_scheduleCheckClicks() {
			if (this._checkClickTimeout) clearTimeout(this._checkClickTimeout);
			this._checkClickTimeout = setTimeout$1(() => this._checkClicks(), 1e3);
		}
	};
	const SLOW_CLICK_TAGS = [
		"A",
		"BUTTON",
		"INPUT"
	];
	/** exported for tests only */
	function ignoreElement(node, ignoreSelector) {
		if (!SLOW_CLICK_TAGS.includes(node.tagName)) return true;
		if (node.tagName === "INPUT" && !["submit", "button"].includes(node.getAttribute("type") || "")) return true;
		if (node.tagName === "A" && (node.hasAttribute("download") || node.hasAttribute("target") && node.getAttribute("target") !== "_self")) return true;
		if (ignoreSelector && node.matches(ignoreSelector)) return true;
		return false;
	}
	function isClickBreadcrumb(breadcrumb) {
		return !!(breadcrumb.data && typeof breadcrumb.data.nodeId === "number" && breadcrumb.timestamp);
	}
	function nowInSeconds() {
		return Date.now() / 1e3;
	}
	/** Update the click detector based on a recording event of rrweb. */
	function updateClickDetectorForRecordingEvent(clickDetector, event) {
		try {
			if (!isIncrementalEvent(event)) return;
			const { source } = event.data;
			if (IncrementalMutationSources.has(source)) clickDetector.registerMutation(event.timestamp);
			if (source === IncrementalSource.Scroll) clickDetector.registerScroll(event.timestamp);
			if (isIncrementalMouseInteraction(event)) {
				const { type, id } = event.data;
				const node = record.mirror.getNode(id);
				if (node instanceof HTMLElement && type === MouseInteractions.Click) clickDetector.registerClick(node);
			}
		} catch {}
	}
	function isIncrementalEvent(event) {
		return event.type === 3;
	}
	function isIncrementalMouseInteraction(event) {
		return event.data.source === IncrementalSource.MouseInteraction;
	}
	// src/util/createBreadcrumb.ts
	/**
	* Create a breadcrumb for a replay.
	*/
	function createBreadcrumb(breadcrumb) {
		return {
			timestamp: Date.now() / 1e3,
			type: "default",
			...breadcrumb
		};
	}
	// ../../node_modules/.pnpm/@sentry+rrweb-snapshot@2.46.0/node_modules/@sentry/rrweb-snapshot/dist/rrweb-snapshot.js
	var NodeType = /* @__PURE__ */ ((NodeType2) => {
		NodeType2[NodeType2["Document"] = 0] = "Document";
		NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
		NodeType2[NodeType2["Element"] = 2] = "Element";
		NodeType2[NodeType2["Text"] = 3] = "Text";
		NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
		NodeType2[NodeType2["Comment"] = 5] = "Comment";
		return NodeType2;
	})(NodeType || {});
	new RegExp(/([^\\]):hover/.source, "g");
	// src/coreHandlers/util/getAttributesToRecord.ts
	const ATTRIBUTES_TO_RECORD = /* @__PURE__ */ new Set([
		"id",
		"class",
		"aria-label",
		"role",
		"name",
		"alt",
		"title",
		"data-test-id",
		"data-testid",
		"disabled",
		"aria-disabled",
		"data-sentry-component"
	]);
	/**
	* Attributes that can end up in a click breadcrumb. This is `ATTRIBUTES_TO_RECORD` plus
	* `data-sentry-element`, which is not recorded itself but is used as a fallback for
	* `data-sentry-component`.
	*/
	const BREADCRUMB_RELEVANT_ATTRIBUTES = /* @__PURE__ */ new Set([...ATTRIBUTES_TO_RECORD, "data-sentry-element"]);
	/**
	* Inclusion list of attributes that we want to record from the DOM element
	*/
	function getAttributesToRecord(attributes) {
		const obj = {};
		for (const key in attributes) if (ATTRIBUTES_TO_RECORD.has(key)) {
			let normalizedKey = key;
			if (key === "data-testid" || key === "data-test-id") normalizedKey = "testId";
			obj[normalizedKey] = attributes[key];
		}
		if (!obj["data-sentry-component"] && attributes["data-sentry-element"]) obj["data-sentry-component"] = attributes["data-sentry-element"];
		return obj;
	}
	// src/coreHandlers/handleDom.ts
	const handleDomListener = (replay) => {
		return (handlerData) => {
			if (!replay.isEnabled()) return;
			const result = handleDom(handlerData, replay.getMaskAttributeFn());
			if (!result) return;
			const isClick = handlerData.name === "click";
			const event = isClick ? handlerData.event : void 0;
			if (isClick && replay.clickDetector && event?.target && !event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) handleClick(replay.clickDetector, result, getClickTargetNode(handlerData.event));
			addBreadcrumbEvent(replay, result);
		};
	};
	/** Get the base DOM breadcrumb. */
	function getBaseDomBreadcrumb(target, message) {
		const nodeId = record.mirror.getId(target);
		const node = nodeId && record.mirror.getNode(nodeId);
		const meta = node && record.mirror.getMeta(node);
		const element = meta && isElement(meta) ? meta : null;
		return {
			message,
			data: element ? {
				nodeId,
				node: {
					id: nodeId,
					tagName: element.tagName,
					textContent: Array.from(element.childNodes).map((node) => node.type === NodeType.Text && node.textContent).filter(Boolean).map((text) => text.trim()).join(""),
					attributes: getAttributesToRecord(element.attributes)
				}
			} : {}
		};
	}
	/**
	* An event handler to react to DOM events.
	* Exported for tests.
	*/
	function handleDom(handlerData, maskAttributeFn) {
		const { target, message } = getDomTarget(handlerData, maskAttributeFn);
		return createBreadcrumb({
			category: `ui.${handlerData.name}`,
			...getBaseDomBreadcrumb(target, message)
		});
	}
	function getDomTarget(handlerData, maskAttributeFn) {
		const isClick = handlerData.name === "click";
		let message;
		let target = null;
		try {
			target = isClick ? getClickTargetNode(handlerData.event) : getTargetNode(handlerData.event);
			message = htmlTreeAsString(target, {
				maxStringLength: 200,
				maskAttributeFn
			}) || "<unknown>";
		} catch {
			message = "<unknown>";
		}
		return {
			target,
			message
		};
	}
	function isElement(node) {
		return node.type === NodeType.Element;
	}
	// src/coreHandlers/handleKeyboardEvent.ts
	/** Handle keyboard events & create breadcrumbs. */
	function handleKeyboardEvent(replay, event) {
		if (!replay.isEnabled()) return;
		replay.updateUserActivity();
		const breadcrumb = getKeyboardBreadcrumb(event, replay.getMaskAttributeFn());
		if (!breadcrumb) return;
		addBreadcrumbEvent(replay, breadcrumb);
	}
	/** exported only for tests */
	function getKeyboardBreadcrumb(event, maskAttributeFn) {
		const { metaKey, shiftKey, ctrlKey, altKey, key, target } = event;
		if (!target || isInputElement(target) || !key) return null;
		if (!(metaKey || ctrlKey || altKey) && key.length === 1) return null;
		const message = htmlTreeAsString(target, {
			maxStringLength: 200,
			maskAttributeFn
		}) || "<unknown>";
		return createBreadcrumb({
			category: "ui.keyDown",
			message,
			data: {
				...getBaseDomBreadcrumb(target, message).data,
				metaKey,
				shiftKey,
				ctrlKey,
				altKey,
				key
			}
		});
	}
	function isInputElement(target) {
		return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
	}
	// src/util/createPerformanceEntries.ts
	const ENTRY_TYPES = {
		resource: createResourceEntry,
		paint: createPaintEntry,
		navigation: createNavigationEntry
	};
	/**
	* Handler creater for web vitals
	*/
	function webVitalHandler(getter, replay) {
		return ({ metric }) => void replay.replayPerformanceEntries.push(getter(metric));
	}
	/**
	* Create replay performance entries from the browser performance entries.
	*/
	function createPerformanceEntries(entries) {
		return entries.map(createPerformanceEntry).filter(Boolean);
	}
	function createPerformanceEntry(entry) {
		const entryType = ENTRY_TYPES[entry.entryType];
		if (!entryType) return null;
		return entryType(entry);
	}
	function getAbsoluteTime(time, entryStartTime = time) {
		return performanceTimeToSeconds(time, entryStartTime);
	}
	function createPaintEntry(entry) {
		const { duration, entryType, name, startTime } = entry;
		const start = getAbsoluteTime(startTime);
		return {
			type: entryType,
			name,
			start,
			end: start + duration,
			data: void 0
		};
	}
	function createNavigationEntry(entry) {
		const { entryType, name, decodedBodySize, duration, domComplete, encodedBodySize, domContentLoadedEventStart, domContentLoadedEventEnd, domInteractive, loadEventStart, loadEventEnd, redirectCount, startTime, transferSize, type } = entry;
		if (duration === 0) return null;
		return {
			type: `${entryType}.${type}`,
			start: getAbsoluteTime(startTime),
			end: getAbsoluteTime(domComplete, startTime),
			name,
			data: {
				size: transferSize,
				decodedBodySize,
				encodedBodySize,
				duration,
				domInteractive,
				domContentLoadedEventStart,
				domContentLoadedEventEnd,
				loadEventStart,
				loadEventEnd,
				domComplete,
				redirectCount
			}
		};
	}
	function createResourceEntry(entry) {
		const { entryType, initiatorType, name, responseEnd, startTime, decodedBodySize, encodedBodySize, responseStatus, transferSize } = entry;
		if (["fetch", "xmlhttprequest"].includes(initiatorType)) return null;
		return {
			type: `${entryType}.${initiatorType}`,
			start: getAbsoluteTime(startTime),
			end: getAbsoluteTime(responseEnd, startTime),
			name,
			data: {
				size: transferSize,
				statusCode: responseStatus,
				decodedBodySize,
				encodedBodySize
			}
		};
	}
	/**
	* Add a LCP event to the replay based on a LCP metric.
	*/
	function getLargestContentfulPaint(metric) {
		const lastEntry = metric.entries[metric.entries.length - 1];
		return getWebVital(metric, "largest-contentful-paint", lastEntry?.element ? [lastEntry.element] : void 0);
	}
	function isLayoutShift(entry) {
		return entry.sources !== void 0;
	}
	/**
	* Add a CLS event to the replay based on a CLS metric.
	*/
	function getCumulativeLayoutShift(metric) {
		const layoutShifts = [];
		const nodes = [];
		for (const entry of metric.entries) if (isLayoutShift(entry)) {
			const nodeIds = [];
			for (const source of entry.sources) if (source.node) {
				nodes.push(source.node);
				const nodeId = record.mirror.getId(source.node);
				if (nodeId) nodeIds.push(nodeId);
			}
			layoutShifts.push({
				value: entry.value,
				nodeIds: nodeIds.length ? nodeIds : void 0
			});
		}
		return getWebVital(metric, "cumulative-layout-shift", nodes, layoutShifts);
	}
	/**
	* Add an INP event to the replay based on an INP metric.
	*/
	function getInteractionToNextPaint(metric) {
		const lastEntry = metric.entries[metric.entries.length - 1];
		return getWebVital(metric, "interaction-to-next-paint", lastEntry?.target ? [lastEntry.target] : void 0);
	}
	/**
	* Add an web vital event to the replay based on the web vital metric.
	*/
	function getWebVital(metric, name, nodes, attributions) {
		const value = metric.value;
		const rating = metric.rating;
		const lastEntry = metric.entries[metric.entries.length - 1];
		const end = getAbsoluteTime(lastEntry?.startTime ?? (metric.navigationStartTime ?? 0) + value);
		return {
			type: "web-vital",
			name,
			start: end,
			end,
			data: {
				value,
				size: value,
				rating,
				nodeIds: nodes ? nodes.map((node) => record.mirror.getId(node)) : void 0,
				attributions
			}
		};
	}
	// src/coreHandlers/performanceObserver.ts
	/**
	* Sets up a PerformanceObserver to listen to all performance entry types.
	* Returns a callback to stop observing.
	*/
	function setupPerformanceObserver(replay) {
		function addPerformanceEntry(entry) {
			if (!replay.performanceEntries.includes(entry)) replay.performanceEntries.push(entry);
		}
		function onEntries({ entries }) {
			entries.forEach(addPerformanceEntry);
		}
		const clearCallbacks = [];
		[
			"navigation",
			"paint",
			"resource"
		].forEach((type) => {
			clearCallbacks.push(addPerformanceInstrumentationHandler(type, onEntries));
		});
		clearCallbacks.push(addLcpInstrumentationHandler(webVitalHandler(getLargestContentfulPaint, replay)), addClsInstrumentationHandler(webVitalHandler(getCumulativeLayoutShift, replay)), addInpInstrumentationHandler(webVitalHandler(getInteractionToNextPaint, replay)));
		return () => {
			clearCallbacks.forEach((clearCallback) => clearCallback());
		};
	}
	// ../replay-worker/build/esm/worker.ts
	var worker_default = "var e=Uint8Array,t=Uint16Array,n=Int32Array,r=new e([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new e([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new e([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=function(e,r){for(var i=new t(31),a=0;a<31;++a)i[a]=r+=1<<e[a-1];for(var o=new n(i[30]),a=1;a<30;++a)for(var s=i[a];s<i[a+1];++s)o[s]=s-i[a]<<5|a;return{b:i,r:o}},s=o(r,2),c=s.b,l=s.r;c[28]=258,l[258]=28;for(var u=o(i,0).r,d=new t(32768),f=0;f<32768;++f){var p=(f&43690)>>1|(f&21845)<<1;p=(p&52428)>>2|(p&13107)<<2,p=(p&61680)>>4|(p&3855)<<4,d[f]=((p&65280)>>8|(p&255)<<8)>>1}for(var m=(function(e,n,r){for(var i=e.length,a=0,o=new t(n);a<i;++a)e[a]&&++o[e[a]-1];var s=new t(n);for(a=1;a<n;++a)s[a]=s[a-1]+o[a-1]<<1;var c;if(r){c=new t(1<<n);var l=15-n;for(a=0;a<i;++a)if(e[a])for(var u=a<<4|e[a],f=n-e[a],p=s[e[a]-1]++<<f,m=p|(1<<f)-1;p<=m;++p)c[d[p]>>l]=u}else for(c=new t(i),a=0;a<i;++a)e[a]&&(c[a]=d[s[e[a]-1]++]>>15-e[a]);return c}),h=new e(288),f=0;f<144;++f)h[f]=8;for(var f=144;f<256;++f)h[f]=9;for(var f=256;f<280;++f)h[f]=7;for(var f=280;f<288;++f)h[f]=8;for(var g=new e(32),f=0;f<32;++f)g[f]=5;var _=m(h,9,0),v=m(g,5,0),y=function(e){return(e+7)/8|0},b=function(t,n,r){return(n==null||n<0)&&(n=0),(r==null||r>t.length)&&(r=t.length),new e(t.subarray(n,r))},x=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],S=function(e,t,n){var r=Error(t||x[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,S),!n)throw r;return r},C=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},w=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},T=function(n,r){for(var i=[],a=0;a<n.length;++a)n[a]&&i.push({s:a,f:n[a]});var o=i.length,s=i.slice();if(!o)return{t:k,l:0};if(o==1){var c=new e(i[0].s+1);return c[i[0].s]=1,{t:c,l:1}}i.sort(function(e,t){return e.f-t.f}),i.push({s:-1,f:25001});var l=i[0],u=i[1],d=0,f=1,p=2;for(i[0]={s:-1,f:l.f+u.f,l,r:u};f!=o-1;)l=i[i[d].f<i[p].f?d++:p++],u=i[d!=f&&i[d].f<i[p].f?d++:p++],i[f++]={s:-1,f:l.f+u.f,l,r:u};for(var m=s[0].s,a=1;a<o;++a)s[a].s>m&&(m=s[a].s);var h=new t(m+1),g=E(i[f-1],h,0);if(g>r){var a=0,_=0,v=g-r,y=1<<v;for(s.sort(function(e,t){return h[t.s]-h[e.s]||e.f-t.f});a<o;++a){var b=s[a].s;if(h[b]>r)_+=y-(1<<g-h[b]),h[b]=r;else break}for(_>>=v;_>0;){var x=s[a].s;h[x]<r?_-=1<<r-h[x]++-1:++a}for(;a>=0&&_;--a){var S=s[a].s;h[S]==r&&(--h[S],++_)}g=r}return{t:new e(h),l:g}},E=function(e,t,n){return e.s==-1?Math.max(E(e.l,t,n+1),E(e.r,t,n+1)):t[e.s]=n},ee=function(e){for(var n=e.length;n&&!e[--n];);for(var r=new t(++n),i=0,a=e[0],o=1,s=function(e){r[i++]=e},c=1;c<=n;++c)if(e[c]==a&&c!=n)++o;else{if(!a&&o>2){for(;o>138;o-=138)s(32754);o>2&&(s(o>10?o-11<<5|28690:o-3<<5|12305),o=0)}else if(o>3){for(s(a),--o;o>6;o-=6)s(8304);o>2&&(s(o-3<<5|8208),o=0)}for(;o--;)s(a);o=1,a=e[c]}return{c:r.subarray(0,i),n}},D=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},te=function(e,t,n){var r=n.length,i=y(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},O=function(e,n,o,s,c,l,u,d,f,p,y){C(n,y++,o),++c[256];for(var b=T(c,15),x=b.t,S=b.l,E=T(l,15),O=E.t,ne=E.l,k=ee(x),A=k.c,j=k.n,M=ee(O),N=M.c,P=M.n,F=new t(19),I=0;I<A.length;++I)++F[A[I]&31];for(var I=0;I<N.length;++I)++F[N[I]&31];for(var L=T(F,7),R=L.t,z=L.l,B=19;B>4&&!R[a[B-1]];--B);var V=p+5<<3,H=D(c,h)+D(l,g)+u,U=D(c,x)+D(l,O)+u+14+3*B+D(F,R)+2*F[16]+3*F[17]+7*F[18];if(f>=0&&V<=H&&V<=U)return te(n,y,e.subarray(f,f+p));var W,G,K,q;if(C(n,y,1+(U<H)),y+=2,U<H){W=m(x,S,0),G=x,K=m(O,ne,0),q=O;var re=m(R,z,0);C(n,y,j-257),C(n,y+5,P-1),C(n,y+10,B-4),y+=14;for(var I=0;I<B;++I)C(n,y+3*I,R[a[I]]);y+=3*B;for(var J=[A,N],Y=0;Y<2;++Y)for(var X=J[Y],I=0;I<X.length;++I){var Z=X[I]&31;C(n,y,re[Z]),y+=R[Z],Z>15&&(C(n,y,X[I]>>5&127),y+=X[I]>>12)}}else W=_,G=h,K=v,q=g;for(var I=0;I<d;++I){var Q=s[I];if(Q>255){var Z=Q>>18&31;w(n,y,W[Z+257]),y+=G[Z+257],Z>7&&(C(n,y,Q>>23&31),y+=r[Z]);var $=Q&31;w(n,y,K[$]),y+=q[$],$>3&&(w(n,y,Q>>5&8191),y+=i[$])}else w(n,y,W[Q]),y+=G[Q]}return w(n,y,W[256]),y+G[256]},ne=new n([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),k=new e(0),A=function(a,o,s,c,d,f){var p=f.z||a.length,m=new e(c+p+5*(1+Math.ceil(p/7e3))+d),h=m.subarray(c,m.length-d),g=f.l,_=(f.r||0)&7;if(o){_&&(h[0]=f.r>>3);for(var v=ne[o-1],x=v>>13,S=v&8191,C=(1<<s)-1,w=f.p||new t(32768),T=f.h||new t(C+1),E=Math.ceil(s/3),ee=2*E,D=function(e){return(a[e]^a[e+1]<<E^a[e+2]<<ee)&C},k=new n(25e3),A=new t(288),j=new t(32),M=0,N=0,P=f.i||0,F=0,I=f.w||0,L=0;P+2<p;++P){var R=D(P),z=P&32767,B=T[R];if(w[z]=B,T[R]=z,I<=P){var V=p-P;if((M>7e3||F>24576)&&(V>423||!g)){_=O(a,h,0,k,A,j,N,F,L,P-L,_),F=M=N=0,L=P;for(var H=0;H<286;++H)A[H]=0;for(var H=0;H<30;++H)j[H]=0}var U=2,W=0,G=S,K=z-B&32767;if(V>2&&R==D(P-K))for(var q=Math.min(x,V)-1,re=Math.min(32767,P),J=Math.min(258,V);K<=re&&--G&&z!=B;){if(a[P+U]==a[P+U-K]){for(var Y=0;Y<J&&a[P+Y]==a[P+Y-K];++Y);if(Y>U){if(U=Y,W=K,Y>q)break;for(var X=Math.min(K,Y-2),Z=0,H=0;H<X;++H){var Q=P-K+H&32767,$=Q-w[Q]&32767;$>Z&&(Z=$,B=Q)}}}z=B,B=w[z],K+=z-B&32767}if(W){k[F++]=268435456|l[U]<<18|u[W];var ie=l[U]&31,ae=u[W]&31;N+=r[ie]+i[ae],++A[257+ie],++j[ae],I=P+U,++M}else k[F++]=a[P],++A[a[P]]}}for(P=Math.max(P,I);P<p;++P)k[F++]=a[P],++A[a[P]];_=O(a,h,g,k,A,j,N,F,L,P-L,_),g||(f.r=_&7|h[_/8|0]<<3,_-=7,f.h=T,f.p=w,f.i=P,f.w=I)}else{for(var P=f.w||0;P<p+g;P+=65535){var oe=P+65535;oe>=p&&(h[_/8|0]=g,oe=p),_=te(h,_+1,a.subarray(P,oe))}f.i=p}return b(m,0,c+y(_)+d)},j=(function(){for(var e=new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e})(),M=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=j[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},N=function(){var e=1,t=0;return{p:function(n){for(var r=e,i=t,a=n.length|0,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=r+=n[o];r=(r&65535)+15*(r>>16),i=(i&65535)+15*(i>>16)}e=r,t=i},d:function(){return e%=65521,t%=65521,(e&255)<<24|(e&65280)<<8|(t&255)<<8|t>>8}}},P=function(t,n,r,i,a){if(!a&&(a={l:1},n.dictionary)){var o=n.dictionary.subarray(-32768),s=new e(o.length+t.length);s.set(o),s.set(t,o.length),t=s,a.w=o.length}return A(t,n.level==null?6:n.level,n.mem==null?a.l?Math.ceil(Math.max(8,Math.min(13,Math.log(t.length)))*1.5):20:12+n.mem,r,i,a)},F=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},I=function(e,t){var n=t.filename;if(e[0]=31,e[1]=139,e[2]=8,e[8]=t.level<2?4:t.level==9?2:0,e[9]=3,t.mtime!=0&&F(e,4,Math.floor(new Date(t.mtime||Date.now())/1e3)),n){e[3]=8;for(var r=0;r<=n.length;++r)e[r+10]=n.charCodeAt(r)}},L=function(e){return 10+(e.filename?e.filename.length+1:0)},R=function(e,t){var n=t.level,r=n==0?0:n<6?1:n==9?3:2;if(e[0]=120,e[1]=r<<6|(t.dictionary&&32),e[1]|=31-(e[0]<<8|e[1])%31,t.dictionary){var i=N();i.p(t.dictionary),F(e,2,i.d())}},z=function(){function t(t,n){if(typeof t==`function`&&(n=t,t={}),this.ondata=n,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new e(98304),this.o.dictionary){var r=this.o.dictionary.subarray(-32768);this.b.set(r,32768-r.length),this.s.i=32768-r.length}}return t.prototype.p=function(e,t){this.ondata(P(e,this.o,0,0,this.s),t)},t.prototype.push=function(t,n){this.ondata||S(5),this.s.l&&S(4);var r=t.length+this.s.z;if(r>this.b.length){if(r>2*this.b.length-32768){var i=new e(r&-32768);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;this.b.set(t.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(a),32768),this.s.z=t.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=n&1,(this.s.z>this.s.w+8191||n)&&(this.p(this.b,n||!1),this.s.w=this.s.i,this.s.i-=2),n&&(this.s=this.o={},this.b=k)},t.prototype.flush=function(t){if(this.ondata||S(5),this.s.l&&S(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,t){var n=new e(6);n[0]=this.s.r>>3;var r=te(n,this.s.r,k);this.s.r=0,this.ondata(n.subarray(0,r>>3),!1)}},t}();function B(e,t){t||(t={});var n=M(),r=e.length;n.p(e);var i=P(e,t,L(t),8),a=i.length;return I(i,t),F(i,a-8,n.d()),F(i,a-4,r),i}var V=function(){function e(e,t){this.c=N(),this.v=1,z.call(this,e,t)}return e.prototype.push=function(e,t){this.c.p(e),z.prototype.push.call(this,e,t)},e.prototype.p=function(e,t){var n=P(e,this.o,this.v&&(this.o.dictionary?6:2),t&&4,this.s);this.v&&(R(n,this.o),this.v=0),t&&F(n,n.length-4,this.c.d()),this.ondata(n,t)},e.prototype.flush=function(e){z.prototype.flush.call(this,e)},e}(),H=typeof TextEncoder<`u`&&new TextEncoder,U=typeof TextDecoder<`u`&&new TextDecoder;try{U.decode(k,{stream:!0})}catch{}var W=function(){function e(e){this.ondata=e}return e.prototype.push=function(e,t){this.ondata||S(5),this.d&&S(4),this.ondata(G(e),this.d=t||!1)},e}();function G(t,n){if(n){for(var r=new e(t.length),i=0;i<t.length;++i)r[i]=t.charCodeAt(i);return r}if(H)return H.encode(t);for(var a=t.length,o=new e(t.length+(t.length>>1)),s=0,c=function(e){o[s++]=e},i=0;i<a;++i){if(s+5>o.length){var l=new e(s+8+(a-i<<1));l.set(o),o=l}var u=t.charCodeAt(i);u<128||n?c(u):u<2048?(c(192|u>>6),c(128|u&63)):u>55295&&u<57344?(u=65536+(u&1047552)|t.charCodeAt(++i)&1023,c(240|u>>18),c(128|u>>12&63),c(128|u>>6&63),c(128|u&63)):(c(224|u>>12),c(128|u>>6&63),c(128|u&63))}return b(o,0,s)}var K=class{constructor(){this._init()}clear(){this._init()}addEvent(e){if(!e)throw Error(`Adding invalid event`);let t=this._hasEvents?`,`:``;this.stream.push(t+e),this._hasEvents=!0}finish(){this.stream.push(`]`,!0);let e=re(this._deflatedData);return this._init(),e}_init(){this._hasEvents=!1,this._deflatedData=[],this.deflate=new V,this.deflate.ondata=(e,t)=>{this._deflatedData.push(e)},this.stream=new W((e,t)=>{this.deflate.push(e,t)}),this.stream.push(`[`)}};function q(e){return B(G(e))}function re(e){let t=0;for(let n of e)t+=n.length;let n=new Uint8Array(t);for(let t=0,r=0,i=e.length;t<i;t++){let i=e[t];n.set(i,r),r+=i.length}return n}const J=new K,Y={clear:()=>{J.clear()},addEvent:e=>J.addEvent(e),finish:()=>J.finish(),compress:e=>q(e)};function X(e){let t=e.data.method,n=e.data.id,r=e.data.arg;if(t in Y&&typeof Y[t]==`function`)try{let e=Y[t](r);postMessage({id:n,method:t,success:!0,response:e})}catch(e){postMessage({id:n,method:t,success:!1,response:e.message}),console.error(e)}}addEventListener(`message`,X),postMessage({id:void 0,method:`init`,success:!0,response:void 0});";
	// ../replay-worker/build/esm/index.js
	function t() {
		let t = new Blob([worker_default], { type: `text/javascript` });
		return URL.createObjectURL(t);
	}
	// src/util/logger.ts
	const CONSOLE_LEVELS = [
		"log",
		"warn",
		"error"
	];
	const PREFIX = "[Replay] ";
	function _addBreadcrumb(message, level = "info") {
		addBreadcrumb({
			category: "console",
			data: { logger: "replay" },
			level,
			message: `${PREFIX}${message}`
		}, { level });
	}
	function makeReplayDebugLogger() {
		let _capture = false;
		let _trace = false;
		const _debug = {
			exception: () => void 0,
			infoTick: () => void 0,
			setConfig: (opts) => {
				_capture = !!opts.captureExceptions;
				_trace = !!opts.traceInternals;
			}
		};
		CONSOLE_LEVELS.forEach((name) => {
			_debug[name] = (...args) => {
				debug$1[name](PREFIX, ...args);
				if (_trace) _addBreadcrumb(args.join(""), severityLevelFromString(name));
			};
		});
		_debug.exception = (error, ...message) => {
			if (message.length && _debug.error) _debug.error(...message);
			debug$1.error(PREFIX, error);
			if (_capture) captureException(error, { mechanism: {
				handled: true,
				type: "auto.function.replay.debug"
			} });
			else if (_trace) _addBreadcrumb(error, "error");
		};
		_debug.infoTick = (...args) => {
			debug$1.log(PREFIX, ...args);
			if (_trace) setTimeout(() => _addBreadcrumb(args[0]), 0);
		};
		return _debug;
	}
	const debug = makeReplayDebugLogger();
	// src/eventBuffer/error.ts
	/** This error indicates that the event buffer size exceeded the limit.. */
	var EventBufferSizeExceededError = class extends Error {
		constructor() {
			super(`Event buffer exceeded maximum size of ${REPLAY_MAX_EVENT_BUFFER_SIZE}.`);
		}
	};
	/** This error indicates that the compression worker was intentionally destroyed (e.g. on session expiry). */
	var WorkerDestroyedError = class extends Error {
		constructor() {
			super("Worker destroyed");
		}
	};
	// src/eventBuffer/EventBufferArray.ts
	/**
	* A basic event buffer that does not do any compression.
	* Used as fallback if the compression worker cannot be loaded or is disabled.
	*/
	var EventBufferArray = class {
		constructor() {
			this.events = [];
			this._totalSize = 0;
			this.hasCheckout = false;
			this.waitForCheckout = false;
		}
		/** @inheritdoc */
		get hasEvents() {
			return this.events.length > 0;
		}
		/** @inheritdoc */
		get type() {
			return "sync";
		}
		/** @inheritdoc */
		destroy() {
			this.events = [];
		}
		/** @inheritdoc */
		async addEvent(event) {
			const eventSize = JSON.stringify(event).length;
			this._totalSize += eventSize;
			if (this._totalSize > 2e7) throw new EventBufferSizeExceededError();
			this.events.push(event);
		}
		/** @inheritdoc */
		finish() {
			return new Promise((resolve) => {
				const eventsRet = this.events;
				this.clear();
				resolve(JSON.stringify(eventsRet));
			});
		}
		/** @inheritdoc */
		clear() {
			this.events = [];
			this._totalSize = 0;
			this.hasCheckout = false;
		}
		/** @inheritdoc */
		getEarliestTimestamp() {
			let ts = null;
			for (const { timestamp } of this.events) if (ts === null || timestamp < ts) ts = timestamp;
			return ts === null ? ts : timestampToMs(ts);
		}
	};
	// src/eventBuffer/WorkerHandler.ts
	/**
	* Event buffer that uses a web worker to compress events.
	* Exported only for testing.
	*/
	var WorkerHandler = class {
		constructor(worker) {
			this._onMessage = ({ data }) => {
				const response = data;
				if (typeof response.id !== "number") return;
				const pending = this._pending.get(response.id);
				if (!pending || pending.method !== response.method) return;
				this._pending.delete(response.id);
				if (!response.success) {
					debug.error("Error in compression worker: ", response.response);
					pending.reject(/* @__PURE__ */ new Error("Error in compression worker"));
					return;
				}
				pending.resolve(response.response);
			};
			this._worker = worker;
			this._id = 0;
			this._pending = /* @__PURE__ */ new Map();
			this._worker.addEventListener("message", this._onMessage);
		}
		/**
		* Ensure the worker is ready (or not).
		* This will either resolve when the worker is ready, or reject if an error occurred.
		*/
		ensureReady() {
			if (this._ensureReadyPromise) return this._ensureReadyPromise;
			this._ensureReadyPromise = new Promise((resolve, reject) => {
				this._worker.addEventListener("message", ({ data }) => {
					if (data.success) resolve();
					else {
						debug.warn("Received worker message with unsuccessful status", data);
						reject(/* @__PURE__ */ new Error("Received worker message with unsuccessful status"));
					}
				}, { once: true });
				this._worker.addEventListener("error", (error) => {
					debug.warn("Failed to load Replay compression worker", error);
					reject(/* @__PURE__ */ new Error(`Failed to load Replay compression worker: ${error instanceof ErrorEvent && error.message ? error.message : "Unknown error. This can happen due to CSP policy restrictions, network issues, or the worker script failing to load."}`));
				}, { once: true });
			});
			return this._ensureReadyPromise;
		}
		/**
		* Destroy the worker.
		*/
		destroy() {
			debug.log("Destroying compression worker");
			this._worker.removeEventListener("message", this._onMessage);
			this._pending.forEach((pending) => pending.reject(new WorkerDestroyedError()));
			this._pending.clear();
			this._worker.terminate();
		}
		/**
		* Post message to worker and wait for response before resolving promise.
		*/
		postMessage(method, arg) {
			const id = this._getAndIncrementId();
			return new Promise((resolve, reject) => {
				this._pending.set(id, {
					method,
					resolve,
					reject
				});
				try {
					this._worker.postMessage({
						id,
						method,
						arg
					});
				} catch (error) {
					this._pending.delete(id);
					reject(error);
				}
			});
		}
		/** Get the current ID and increment it for the next call. */
		_getAndIncrementId() {
			return this._id++;
		}
	};
	// src/eventBuffer/EventBufferCompressionWorker.ts
	/**
	* Event buffer that uses a web worker to compress events.
	* Exported only for testing.
	*/
	var EventBufferCompressionWorker = class {
		constructor(worker) {
			this._worker = new WorkerHandler(worker);
			this._earliestTimestamp = null;
			this._totalSize = 0;
			this.hasCheckout = false;
			this.waitForCheckout = false;
		}
		/** @inheritdoc */
		get hasEvents() {
			return !!this._earliestTimestamp;
		}
		/** @inheritdoc */
		get type() {
			return "worker";
		}
		/**
		* Ensure the worker is ready (or not).
		* This will either resolve when the worker is ready, or reject if an error occurred.
		*/
		ensureReady() {
			return this._worker.ensureReady();
		}
		/**
		* Destroy the event buffer.
		*/
		destroy() {
			this._worker.destroy();
		}
		/**
		* Add an event to the event buffer.
		*
		* Returns true if event was successfully received and processed by worker.
		*/
		addEvent(event) {
			const timestamp = timestampToMs(event.timestamp);
			if (!this._earliestTimestamp || timestamp < this._earliestTimestamp) this._earliestTimestamp = timestamp;
			const data = JSON.stringify(event);
			this._totalSize += data.length;
			if (this._totalSize > 2e7) return Promise.reject(new EventBufferSizeExceededError());
			return this._sendEventToWorker(data);
		}
		/**
		* Finish the event buffer and return the compressed data.
		*/
		finish() {
			return this._finishRequest();
		}
		/** @inheritdoc */
		clear() {
			this._earliestTimestamp = null;
			this._totalSize = 0;
			this.hasCheckout = false;
			this._worker.postMessage("clear").then(null, (e) => {
				debug.exception(e, "Sending \"clear\" message to worker failed", e);
			});
		}
		/** @inheritdoc */
		getEarliestTimestamp() {
			return this._earliestTimestamp;
		}
		/**
		* Send the event to the worker.
		*/
		_sendEventToWorker(data) {
			return this._worker.postMessage("addEvent", data);
		}
		/**
		* Finish the request and return the compressed data from the worker.
		*/
		async _finishRequest() {
			const response = await this._worker.postMessage("finish");
			this._earliestTimestamp = null;
			this._totalSize = 0;
			return response;
		}
	};
	// src/eventBuffer/EventBufferProxy.ts
	/**
	* This proxy will try to use the compression worker, and fall back to use the simple buffer if an error occurs there.
	* This can happen e.g. if the worker cannot be loaded.
	* Exported only for testing.
	*/
	var EventBufferProxy = class {
		constructor(worker) {
			this._fallback = new EventBufferArray();
			this._compression = new EventBufferCompressionWorker(worker);
			this._used = this._fallback;
			this._ensureWorkerIsLoadedPromise = this._ensureWorkerIsLoaded();
		}
		/** @inheritdoc */
		get waitForCheckout() {
			return this._used.waitForCheckout;
		}
		/** @inheritdoc */
		get type() {
			return this._used.type;
		}
		/** @inheritDoc */
		get hasEvents() {
			return this._used.hasEvents;
		}
		/** @inheritdoc */
		get hasCheckout() {
			return this._used.hasCheckout;
		}
		/** @inheritdoc */
		set hasCheckout(value) {
			this._used.hasCheckout = value;
		}
		/** @inheritdoc */
		set waitForCheckout(value) {
			this._used.waitForCheckout = value;
		}
		/** @inheritDoc */
		destroy() {
			this._fallback.destroy();
			this._compression.destroy();
		}
		/** @inheritdoc */
		clear() {
			return this._used.clear();
		}
		/** @inheritdoc */
		getEarliestTimestamp() {
			return this._used.getEarliestTimestamp();
		}
		/**
		* Add an event to the event buffer.
		*
		* Returns true if event was successfully added.
		*/
		addEvent(event) {
			return this._used.addEvent(event);
		}
		/** @inheritDoc */
		async finish() {
			await this.ensureWorkerIsLoaded();
			return this._used.finish();
		}
		/** Ensure the worker has loaded. */
		ensureWorkerIsLoaded() {
			return this._ensureWorkerIsLoadedPromise;
		}
		/** Actually check if the worker has been loaded. */
		async _ensureWorkerIsLoaded() {
			try {
				await this._compression.ensureReady();
			} catch (error) {
				debug.exception(error, "Failed to load the compression worker, falling back to simple buffer");
				return;
			}
			await this._switchToCompressionWorker();
		}
		/** Switch the used buffer to the compression worker. */
		async _switchToCompressionWorker() {
			const { events, hasCheckout, waitForCheckout } = this._fallback;
			const addEventPromises = [];
			for (const event of events) addEventPromises.push(this._compression.addEvent(event));
			this._compression.hasCheckout = hasCheckout;
			this._compression.waitForCheckout = waitForCheckout;
			this._used = this._compression;
			try {
				await Promise.all(addEventPromises);
				this._fallback.clear();
			} catch (error) {
				if (error instanceof WorkerDestroyedError) return;
				debug.exception(error, "Failed to add events when switching buffers.");
			}
		}
	};
	// src/eventBuffer/index.ts
	/**
	* Create an event buffer for replays.
	*/
	function createEventBuffer({ useCompression, workerUrl: customWorkerUrl }) {
		if (useCompression && window.Worker) {
			const worker = _loadWorker(customWorkerUrl);
			if (worker) return worker;
		}
		debug.log("Using simple buffer");
		return new EventBufferArray();
	}
	function _loadWorker(customWorkerUrl) {
		try {
			const workerUrl = customWorkerUrl || _getWorkerUrl();
			if (!workerUrl) return;
			debug.log(`Using compression worker${customWorkerUrl ? ` from ${customWorkerUrl}` : ""}`);
			return new EventBufferProxy(new Worker(workerUrl));
		} catch (error) {
			debug.exception(error, "Failed to create compression worker");
		}
	}
	function _getWorkerUrl() {
		if (typeof __SENTRY_EXCLUDE_REPLAY_WORKER__ === "undefined" || !__SENTRY_EXCLUDE_REPLAY_WORKER__) return t();
		return "";
	}
	// src/util/hasSessionStorage.ts
	/** If sessionStorage is available. */
	function hasSessionStorage() {
		try {
			return "sessionStorage" in WINDOW$1 && !!WINDOW$1.sessionStorage;
		} catch {
			return false;
		}
	}
	// src/session/clearSession.ts
	/**
	* Removes the session from Session Storage and unsets session in replay instance
	*/
	function clearSession(replay) {
		deleteSession();
		replay.session = void 0;
	}
	/**
	* Deletes a session from storage
	*/
	function deleteSession() {
		if (!hasSessionStorage()) return;
		try {
			WINDOW$1.sessionStorage.removeItem(REPLAY_SESSION_KEY);
		} catch {}
	}
	// src/util/isSampled.ts
	/**
	* Given a sample rate, returns true if replay should be sampled.
	*
	* 1.0 = 100% sampling
	* 0.0 = 0% sampling
	*/
	function isSampled(sampleRate) {
		if (sampleRate === void 0) return false;
		return Math.random() < sampleRate;
	}
	// src/session/saveSession.ts
	/**
	* Save a session to session storage.
	*/
	function saveSession(session) {
		if (!hasSessionStorage()) return;
		try {
			WINDOW$1.sessionStorage.setItem(REPLAY_SESSION_KEY, JSON.stringify(session));
		} catch {}
	}
	// src/session/Session.ts
	/**
	* Get a session with defaults & applied sampling.
	*/
	function makeSession(session) {
		const now = Date.now();
		return {
			id: session.id || uuid4(),
			started: session.started || now,
			lastActivity: session.lastActivity || now,
			segmentId: session.segmentId || 0,
			sampled: session.sampled,
			previousSessionId: session.previousSessionId,
			dirty: session.dirty || false
		};
	}
	// src/session/createSession.ts
	/**
	* Get the sampled status for a session based on sample rates & current sampled status.
	*/
	function getSessionSampleType(sessionSampleRate, allowBuffering) {
		return isSampled(sessionSampleRate) ? "session" : allowBuffering ? "buffer" : false;
	}
	/**
	* Create a new session, which in its current implementation is a Sentry event
	* that all replays will be saved to as attachments. Currently, we only expect
	* one of these Sentry events per "replay session".
	*/
	function createSession({ sessionSampleRate, allowBuffering, stickySession = false }, { previousSessionId } = {}) {
		const session = makeSession({
			sampled: getSessionSampleType(sessionSampleRate, allowBuffering),
			previousSessionId
		});
		if (stickySession) saveSession(session);
		return session;
	}
	// src/session/fetchSession.ts
	/**
	* Fetches a session from storage
	*/
	function fetchSession() {
		if (!hasSessionStorage()) return null;
		try {
			const sessionStringFromStorage = WINDOW$1.sessionStorage.getItem(REPLAY_SESSION_KEY);
			if (!sessionStringFromStorage) return null;
			const sessionObj = JSON.parse(sessionStringFromStorage);
			debug.infoTick("Loading existing session");
			return makeSession(sessionObj);
		} catch {
			return null;
		}
	}
	// src/util/isExpired.ts
	/**
	* Given an initial timestamp and an expiry duration, checks to see if current
	* time should be considered as expired.
	*/
	function isExpired(initialTime, expiry, targetTime = +/* @__PURE__ */ new Date()) {
		if (initialTime === null || expiry === void 0 || expiry < 0) return true;
		if (expiry === 0) return false;
		return initialTime + expiry <= targetTime;
	}
	// src/util/isSessionExpired.ts
	/**
	* Checks to see if session is expired
	*/
	function isSessionExpired(session, { maxReplayDuration, sessionIdleExpire, targetTime = Date.now() }) {
		return isExpired(session.started, maxReplayDuration, targetTime) || isExpired(session.lastActivity, sessionIdleExpire, targetTime);
	}
	// src/session/shouldRefreshSession.ts
	/** If the session should be refreshed or not. */
	function shouldRefreshSession(session, { sessionIdleExpire, maxReplayDuration }) {
		if (!isSessionExpired(session, {
			sessionIdleExpire,
			maxReplayDuration
		})) return false;
		if (session.sampled === "buffer" && session.segmentId === 0) return false;
		return true;
	}
	// src/session/loadOrCreateSession.ts
	/**
	* Get or create a session, when initializing the replay.
	* Returns a session that may be unsampled.
	*/
	function loadOrCreateSession({ sessionIdleExpire, maxReplayDuration, previousSessionId }, sessionOptions) {
		const existingSession = sessionOptions.stickySession && fetchSession();
		if (!existingSession) {
			debug.infoTick("Creating new session");
			return createSession(sessionOptions, { previousSessionId });
		}
		if (!shouldRefreshSession(existingSession, {
			sessionIdleExpire,
			maxReplayDuration
		})) return existingSession;
		debug.infoTick("Session in sessionStorage is expired, creating new one...");
		return createSession(sessionOptions, { previousSessionId: existingSession.id });
	}
	// src/util/addEvent.ts
	function isCustomEvent(event) {
		return event.type === EventType.Custom;
	}
	/**
	* Add an event to the event buffer.
	* In contrast to `addEvent`, this does not return a promise & does not wait for the adding of the event to succeed/fail.
	* Instead this returns `true` if we tried to add the event, else false.
	* It returns `false` e.g. if we are paused, disabled, or out of the max replay duration.
	*
	* `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
	*/
	function addEventSync(replay, event, isCheckout) {
		if (!shouldAddEvent(replay, event)) return false;
		_addEvent(replay, event, isCheckout);
		return true;
	}
	/**
	* Add an event to the event buffer.
	* Resolves to `null` if no event was added, else to `void`.
	*
	* `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
	*/
	function addEvent(replay, event, isCheckout) {
		if (!shouldAddEvent(replay, event)) return Promise.resolve(null);
		return _addEvent(replay, event, isCheckout);
	}
	async function _addEvent(replay, event, isCheckout) {
		const { eventBuffer } = replay;
		if (!eventBuffer || eventBuffer.waitForCheckout && !isCheckout) return null;
		const isBufferMode = replay.recordingMode === "buffer";
		try {
			if (isCheckout && isBufferMode) eventBuffer.clear();
			if (isCheckout) {
				eventBuffer.hasCheckout = true;
				eventBuffer.waitForCheckout = false;
			}
			const eventAfterPossibleCallback = maybeApplyCallback(event, replay.getOptions().beforeAddRecordingEvent);
			if (!eventAfterPossibleCallback) return;
			return await eventBuffer.addEvent(eventAfterPossibleCallback);
		} catch (error) {
			if (!replay.isEnabled()) {
				replay.handleException(error);
				return null;
			}
			const isExceeded = error && error instanceof EventBufferSizeExceededError;
			const reason = isExceeded ? "eventBufferOverflow" : "eventBufferError";
			const client = getClient();
			if (client) client.recordDroppedEvent(isExceeded ? "buffer_overflow" : "internal_sdk_error", "replay");
			if (isExceeded && isBufferMode) {
				eventBuffer.clear();
				eventBuffer.waitForCheckout = true;
				return null;
			}
			replay.handleException(error);
			await replay.stop({ reason });
		}
	}
	/** Exported only for tests. */
	function shouldAddEvent(replay, event) {
		if (!replay.eventBuffer || replay.isPaused() || !replay.isEnabled()) return false;
		const timestampInMs = timestampToMs(event.timestamp);
		if (timestampInMs + replay.timeouts.sessionIdlePause < Date.now()) return false;
		if (timestampInMs > replay.getContext().initialTimestamp + replay.getOptions().maxReplayDuration) {
			debug.infoTick(`Skipping event with timestamp ${timestampInMs} because it is after maxReplayDuration`);
			return false;
		}
		return true;
	}
	function maybeApplyCallback(event, callback) {
		try {
			if (typeof callback === "function" && isCustomEvent(event)) return callback(event);
		} catch (error) {
			debug.exception(error, "An error occurred in the `beforeAddRecordingEvent` callback, skipping the event...");
			return null;
		}
		return event;
	}
	// src/coreHandlers/util/addSegmentDetailsToContext.ts
	const MAX_CONTEXT_VALUES = 100;
	function addSegmentDetailsToContext(replay, traceId, segmentName) {
		const replayContext = replay.getContext();
		if (traceId && replayContext.traceIds.size < MAX_CONTEXT_VALUES) replayContext.traceIds.add(traceId);
		if (segmentName && replayContext.segmentNames.size < MAX_CONTEXT_VALUES) replayContext.segmentNames.add(segmentName);
	}
	// src/coreHandlers/handleProcessSegmentSpan.ts
	function handleProcessSegmentSpan(replay) {
		return (spanJSON) => {
			if (!replay.isEnabled()) return;
			addSegmentDetailsToContext(replay, spanJSON.trace_id, spanJSON.name || void 0);
		};
	}
	// src/util/eventUtils.ts
	/** If the event is an error event */
	function isErrorEvent(event) {
		return !event.type;
	}
	/** If the event is a transaction event */
	function isTransactionEvent(event) {
		return event.type === "transaction";
	}
	/** If the event is an replay event */
	function isReplayEvent(event) {
		return event.type === "replay_event";
	}
	/** If the event is a feedback event */
	function isFeedbackEvent(event) {
		return event.type === "feedback";
	}
	// src/coreHandlers/handleAfterSendEvent.ts
	/**
	* Returns a listener to be added to `client.on('afterSendErrorEvent, listener)`.
	*/
	function handleAfterSendEvent(replay) {
		return (event, sendResponse) => {
			if (!replay.isEnabled() || !isErrorEvent(event) && !isTransactionEvent(event)) return;
			const statusCode = sendResponse.statusCode;
			if (!statusCode || statusCode < 200 || statusCode >= 300) return;
			if (isTransactionEvent(event)) {
				handleTransactionEvent(replay, event);
				return;
			}
			handleErrorEvent(replay, event);
		};
	}
	function handleTransactionEvent(replay, event) {
		addSegmentDetailsToContext(replay, event.contexts?.trace?.trace_id, event.transaction);
	}
	function handleErrorEvent(replay, event) {
		const replayContext = replay.getContext();
		if (event.event_id && replayContext.errorIds.size < 100) replayContext.errorIds.add(event.event_id);
		if (replay.recordingMode !== "buffer" || !event.tags?.replayId) return;
		const { beforeErrorSampling } = replay.getOptions();
		if (typeof beforeErrorSampling === "function" && !beforeErrorSampling(event)) return;
		setTimeout$1(async () => {
			try {
				await replay.sendBufferedReplayOrFlush();
			} catch (err) {
				replay.handleException(err);
			}
		});
	}
	// src/coreHandlers/handleBeforeSendEvent.ts
	/**
	* Returns a listener to be added to `client.on('afterSendErrorEvent, listener)`.
	*/
	function handleBeforeSendEvent(replay) {
		return (event) => {
			if (!replay.isEnabled() || !isErrorEvent(event)) return;
			handleHydrationError(replay, event);
		};
	}
	function handleHydrationError(replay, event) {
		const exceptionValue = event.exception?.values?.[0]?.value;
		if (typeof exceptionValue !== "string") return;
		if (exceptionValue.match(/(reactjs\.org\/docs\/error-decoder\.html\?invariant=|react\.dev\/errors\/)(418|419|422|423|425)/) || exceptionValue.match(/(does not match server-rendered HTML|Hydration failed because)/i)) addBreadcrumbEvent(replay, createBreadcrumb({
			category: "replay.hydrate-error",
			data: { url: getLocationHref() }
		}));
	}
	// src/coreHandlers/handleBreadcrumbs.ts
	/**
	* Handle breadcrumbs that Sentry captures, and make sure to capture relevant breadcrumbs to Replay as well.
	*/
	function handleBreadcrumbs(replay) {
		const client = getClient();
		if (!client) return;
		client.on("beforeAddBreadcrumb", (breadcrumb) => beforeAddBreadcrumb(replay, breadcrumb));
	}
	function beforeAddBreadcrumb(replay, breadcrumb) {
		if (!replay.isEnabled() || !isBreadcrumbWithCategory(breadcrumb)) return;
		const result = normalizeBreadcrumb(breadcrumb);
		if (result) addBreadcrumbEvent(replay, result);
	}
	/** Exported only for tests. */
	function normalizeBreadcrumb(breadcrumb) {
		if (!isBreadcrumbWithCategory(breadcrumb) || [
			"fetch",
			"xhr",
			"sentry.event",
			"sentry.transaction"
		].includes(breadcrumb.category) || breadcrumb.category.startsWith("ui.")) return null;
		if (breadcrumb.category === "console") return normalizeConsoleBreadcrumb(breadcrumb);
		return createBreadcrumb(breadcrumb);
	}
	/** exported for tests only */
	function normalizeConsoleBreadcrumb(breadcrumb) {
		const args = breadcrumb.data?.arguments;
		if (!Array.isArray(args) || args.length === 0) return createBreadcrumb(breadcrumb);
		let isTruncated = false;
		const normalizedArgs = args.map((arg) => {
			if (!arg) return arg;
			if (typeof arg === "string") {
				if (arg.length > 5e3) {
					isTruncated = true;
					return `${arg.slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
				}
				return arg;
			}
			if (typeof arg === "object") try {
				const normalizedArg = normalize(arg, 7);
				if (JSON.stringify(normalizedArg).length > 5e3) {
					isTruncated = true;
					return `${JSON.stringify(normalizedArg, null, 2).slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
				}
				return normalizedArg;
			} catch {}
			return arg;
		});
		return createBreadcrumb({
			...breadcrumb,
			data: {
				...breadcrumb.data,
				arguments: normalizedArgs,
				...isTruncated ? { _meta: { warnings: ["CONSOLE_ARG_TRUNCATED"] } } : {}
			}
		});
	}
	function isBreadcrumbWithCategory(breadcrumb) {
		return !!breadcrumb.category;
	}
	// src/util/isRrwebError.ts
	/**
	* Returns true if we think the given event is an error originating inside of rrweb.
	*/
	function isRrwebError(event, hint) {
		if (event.type || !event.exception?.values?.length) return false;
		if (hint.originalException?.__rrweb__) return true;
		return false;
	}
	// src/util/resetReplayIdOnDynamicSamplingContext.ts
	/**
	* Reset the `replay_id` field on the DSC.
	*/
	function resetReplayIdOnDynamicSamplingContext() {
		const dsc = getCurrentScope().getPropagationContext().dsc;
		if (dsc) delete dsc.replay_id;
		const activeSpan = getActiveSpan();
		if (activeSpan) {
			const dsc = getDynamicSamplingContextFromSpan(activeSpan);
			delete dsc.replay_id;
		}
	}
	/**
	* Set the `replay_id` field on the cached DSC.
	* This is needed after a session refresh because the cached DSC on the scope
	* (set by browserTracingIntegration when the idle span ended) persists across
	* session boundaries. Without updating it, the new session's replay_id would
	* never appear in DSC since `getDynamicSamplingContextFromClient` (and its
	* `createDsc` hook) is not called when a cached DSC already exists.
	*/
	function setReplayIdOnDynamicSamplingContext(replayId) {
		const dsc = getCurrentScope().getPropagationContext().dsc;
		if (dsc) dsc.replay_id = replayId;
		const activeSpan = getActiveSpan();
		if (activeSpan) {
			const dsc = getDynamicSamplingContextFromSpan(activeSpan);
			dsc.replay_id = replayId;
		}
	}
	// src/coreHandlers/util/addFeedbackBreadcrumb.ts
	/**
	* Add a feedback breadcrumb event to replay.
	*/
	function addFeedbackBreadcrumb(replay, event) {
		replay.triggerUserActivity();
		replay.addUpdate(() => {
			if (!event.timestamp) return true;
			replay.throttledAddEvent({
				type: EventType.Custom,
				timestamp: event.timestamp * 1e3,
				data: {
					tag: "breadcrumb",
					payload: {
						timestamp: event.timestamp,
						type: "default",
						category: "sentry.feedback",
						data: { feedbackId: event.event_id }
					}
				}
			});
			return false;
		});
	}
	// src/coreHandlers/util/shouldSampleForBufferEvent.ts
	/**
	* Determine if event should be sampled (only applies in buffer mode).
	* When an event is captured by `handleGlobalEvent`, when in buffer mode
	* we determine if we want to sample the error or not.
	*/
	function shouldSampleForBufferEvent(replay, event) {
		if (replay.recordingMode !== "buffer") return false;
		if (event.message === "Unable to send Replay") return false;
		if (!event.exception || event.type) return false;
		if (event.sdkProcessingMetadata?.hasDefaultSyntheticStacktrace) return false;
		return isSampled(replay.getOptions().errorSampleRate);
	}
	// src/coreHandlers/handleGlobalEvent.ts
	/**
	* Returns a listener to be added to `addEventProcessor(listener)`.
	*/
	function handleGlobalEventListener(replay) {
		return Object.assign((event, hint) => {
			if (replay.session && shouldRefreshSession(replay.session, {
				maxReplayDuration: replay.getOptions().maxReplayDuration,
				sessionIdleExpire: replay.timeouts.sessionIdleExpire
			})) resetReplayIdOnDynamicSamplingContext();
			if (!replay.isEnabled() || replay.isPaused()) return event;
			if (isReplayEvent(event)) {
				delete event.breadcrumbs;
				return event;
			}
			if (!isErrorEvent(event) && !isTransactionEvent(event) && !isFeedbackEvent(event)) return event;
			if (!replay.checkAndHandleExpiredSession()) {
				resetReplayIdOnDynamicSamplingContext();
				return event;
			}
			if (isFeedbackEvent(event)) {
				const sessionId = replay.getSessionId();
				const feedbackReplayId = event.contexts.feedback.replay_id;
				if (feedbackReplayId && feedbackReplayId !== sessionId) return event;
				replay.flush();
				event.contexts.feedback.replay_id = sessionId;
				addFeedbackBreadcrumb(replay, event);
				return event;
			}
			if (isRrwebError(event, hint) && !replay.getOptions()._experiments.captureExceptions) {
				debug.log("Ignoring error from rrweb internals", event);
				return null;
			}
			const isErrorEventSampled = shouldSampleForBufferEvent(replay, event);
			if (isErrorEventSampled || replay.recordingMode === "session") event.tags = {
				...event.tags,
				replayId: replay.getSessionId()
			};
			if (isErrorEventSampled && replay.recordingMode === "buffer" && replay.session?.sampled === "buffer") {
				const session = replay.session;
				session.dirty = true;
				if (replay.getOptions().stickySession) saveSession(session);
			}
			return event;
		}, { id: "Replay" });
	}
	// src/util/createPerformanceSpans.ts
	/**
	* Create a "span" for each performance entry.
	*/
	function createPerformanceSpans(replay, entries) {
		return entries.map(({ type, start, end, name, data }) => {
			const response = replay.throttledAddEvent({
				type: EventType.Custom,
				timestamp: start,
				data: {
					tag: "performanceSpan",
					payload: {
						op: type,
						description: name,
						startTimestamp: start,
						endTimestamp: end,
						data
					}
				}
			});
			return typeof response === "string" ? Promise.resolve(null) : response;
		});
	}
	// src/coreHandlers/handleHistory.ts
	function handleHistory(handlerData) {
		const { from, to } = handlerData;
		const now = Date.now() / 1e3;
		return {
			type: "navigation.push",
			start: now,
			end: now,
			name: to,
			data: { previous: from }
		};
	}
	/**
	* Returns a listener to be added to `addHistoryInstrumentationHandler(listener)`.
	*/
	function handleHistorySpanListener(replay) {
		return (handlerData) => {
			if (!replay.isEnabled()) return;
			const result = handleHistory(handlerData);
			if (result === null) return;
			replay.getContext().urls.push(result.name);
			replay.triggerUserActivity();
			replay.addUpdate(() => {
				createPerformanceSpans(replay, [result]);
				return false;
			});
		};
	}
	// src/util/shouldFilterRequest.ts
	/**
	* Check whether a given request URL should be filtered out. This is so we
	* don't log Sentry ingest requests.
	*/
	function shouldFilterRequest(replay, url) {
		if (replay.getOptions()._experiments.traceInternals) return false;
		return isSentryRequestUrl(url, getClient());
	}
	// src/coreHandlers/util/addNetworkBreadcrumb.ts
	/** Add a performance entry breadcrumb */
	function addNetworkBreadcrumb(replay, result) {
		if (!replay.isEnabled()) return;
		if (result === null) return;
		if (shouldFilterRequest(replay, result.name)) return;
		replay.addUpdate(() => {
			createPerformanceSpans(replay, [result]);
			return true;
		});
	}
	// src/coreHandlers/util/networkUtils.ts
	/** Get the size of a body. */
	function getBodySize(body) {
		if (!body) return;
		const textEncoder = new TextEncoder();
		try {
			if (typeof body === "string") return textEncoder.encode(body).length;
			if (body instanceof URLSearchParams) return textEncoder.encode(body.toString()).length;
			if (body instanceof FormData) {
				const formDataStr = serializeFormData(body);
				return textEncoder.encode(formDataStr).length;
			}
			if (body instanceof Blob) return body.size;
			if (body instanceof ArrayBuffer) return body.byteLength;
		} catch {}
	}
	/** Convert a Content-Length header to number/undefined.  */
	function parseContentLengthHeader(header) {
		if (!header) return;
		const size = parseInt(header, 10);
		return isNaN(size) ? void 0 : size;
	}
	/** Merge a warning into an existing network request/response. */
	function mergeWarning(info, warning) {
		if (!info) return {
			headers: {},
			size: void 0,
			_meta: { warnings: [warning] }
		};
		const newMeta = { ...info._meta };
		newMeta.warnings = [...newMeta.warnings || [], warning];
		info._meta = newMeta;
		return info;
	}
	/** Convert ReplayNetworkRequestData to a PerformanceEntry. */
	function makeNetworkReplayBreadcrumb(type, data) {
		if (!data) return null;
		const { startTimestamp, endTimestamp, url, method, statusCode, request, response } = data;
		return {
			type,
			start: startTimestamp / 1e3,
			end: endTimestamp / 1e3,
			name: url,
			data: {
				method,
				statusCode,
				request,
				response
			}
		};
	}
	/** Build the request or response part of a replay network breadcrumb that was skipped. */
	function buildSkippedNetworkRequestOrResponse(bodySize) {
		return {
			headers: {},
			size: bodySize,
			_meta: { warnings: ["URL_SKIPPED"] }
		};
	}
	/** Build the request or response part of a replay network breadcrumb. */
	function buildNetworkRequestOrResponse(headers, bodySize, body) {
		if (!bodySize && Object.keys(headers).length === 0) return;
		if (!bodySize) return { headers };
		if (!body) return {
			headers,
			size: bodySize
		};
		const info = {
			headers,
			size: bodySize
		};
		const { body: normalizedBody, warnings } = normalizeNetworkBody(body);
		info.body = normalizedBody;
		if (warnings?.length) info._meta = { warnings };
		return info;
	}
	/** Filter a set of headers */
	function getAllowedHeaders(headers, allowedHeaders) {
		return Object.entries(headers).reduce((filteredHeaders, [key, value]) => {
			const normalizedKey = key.toLowerCase();
			if (allowedHeaders.includes(normalizedKey) && headers[key]) filteredHeaders[normalizedKey] = value;
			return filteredHeaders;
		}, {});
	}
	function normalizeNetworkBody(body) {
		if (!body || typeof body !== "string") return { body };
		const exceedsSizeLimit = body.length > NETWORK_BODY_MAX_SIZE;
		const isProbablyJson = _strIsProbablyJson(body);
		if (exceedsSizeLimit) {
			const truncatedBody = body.slice(0, NETWORK_BODY_MAX_SIZE);
			if (isProbablyJson) return {
				body: truncatedBody,
				warnings: ["MAYBE_JSON_TRUNCATED"]
			};
			return {
				body: `${truncatedBody}…`,
				warnings: ["TEXT_TRUNCATED"]
			};
		}
		if (isProbablyJson) try {
			return { body: JSON.parse(body) };
		} catch {}
		return { body };
	}
	function _strIsProbablyJson(str) {
		const first = str[0];
		const last = str[str.length - 1];
		return first === "[" && last === "]" || first === "{" && last === "}";
	}
	/** Match an URL against a list of strings/Regex. */
	function urlMatches(url, urls) {
		return stringMatchesSomePattern(getFullUrl(url), urls);
	}
	/** exported for tests */
	function getFullUrl(url, baseURI = WINDOW$1.document.baseURI) {
		if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith(WINDOW$1.location.origin)) return url;
		const fixedUrl = new URL(url, baseURI);
		if (fixedUrl.origin !== new URL(baseURI).origin) return url;
		const fullUrl = fixedUrl.href;
		if (!url.endsWith("/") && fullUrl.endsWith("/")) return fullUrl.slice(0, -1);
		return fullUrl;
	}
	// src/coreHandlers/util/fetchUtils.ts
	/**
	* Capture a fetch breadcrumb to a replay.
	* This adds additional data (where appropriate).
	*/
	async function captureFetchBreadcrumbToReplay(breadcrumb, hint, options) {
		try {
			const result = makeNetworkReplayBreadcrumb("resource.fetch", await _prepareFetchData(breadcrumb, hint, options));
			addNetworkBreadcrumb(options.replay, result);
		} catch (error) {
			debug.exception(error, "Failed to capture fetch breadcrumb");
		}
	}
	/**
	* Enrich a breadcrumb with additional data.
	* This has to be sync & mutate the given breadcrumb,
	* as the breadcrumb is afterwards consumed by other handlers.
	*/
	function enrichFetchBreadcrumb(breadcrumb, hint) {
		const { input, response } = hint;
		const reqSize = getBodySize(input ? getFetchRequestArgBody(input) : void 0);
		const resSize = response ? parseContentLengthHeader(response.headers.get("content-length")) : void 0;
		if (reqSize !== void 0) breadcrumb.data.request_body_size = reqSize;
		if (resSize !== void 0) breadcrumb.data.response_body_size = resSize;
	}
	async function _prepareFetchData(breadcrumb, hint, options) {
		const now = Date.now();
		const { startTimestamp = now, endTimestamp = now } = hint;
		const { url, method, status_code: statusCode = 0, request_body_size: requestBodySize, response_body_size: responseBodySize } = breadcrumb.data;
		const captureDetails = urlMatches(url, options.networkDetailAllowUrls) && !urlMatches(url, options.networkDetailDenyUrls);
		return {
			startTimestamp,
			endTimestamp,
			url,
			method,
			statusCode,
			request: captureDetails ? _getRequestInfo(options, hint.input, requestBodySize) : buildSkippedNetworkRequestOrResponse(requestBodySize),
			response: await _getResponseInfo(captureDetails, options, hint.response, responseBodySize)
		};
	}
	function _getRequestInfo({ networkCaptureBodies, networkRequestHeaders }, input, requestBodySize) {
		const headers = input ? getRequestHeaders(input, networkRequestHeaders) : {};
		if (!networkCaptureBodies) return buildNetworkRequestOrResponse(headers, requestBodySize, void 0);
		const [bodyStr, warning] = getBodyString(getFetchRequestArgBody(input), debug);
		const data = buildNetworkRequestOrResponse(headers, requestBodySize, bodyStr);
		if (warning) return mergeWarning(data, warning);
		return data;
	}
	/** Exported only for tests. */
	async function _getResponseInfo(captureDetails, { networkCaptureBodies, networkResponseHeaders }, response, responseBodySize) {
		if (!captureDetails && responseBodySize !== void 0) return buildSkippedNetworkRequestOrResponse(responseBodySize);
		const headers = response ? getAllHeaders(response.headers, networkResponseHeaders) : {};
		if (!response || !networkCaptureBodies && responseBodySize !== void 0) return buildNetworkRequestOrResponse(headers, responseBodySize, void 0);
		const [bodyText, warning] = await _parseFetchResponseBody(response);
		const result = getResponseData(bodyText, {
			networkCaptureBodies,
			responseBodySize,
			captureDetails,
			headers
		});
		if (warning) return mergeWarning(result, warning);
		return result;
	}
	function getResponseData(bodyText, { networkCaptureBodies, responseBodySize, captureDetails, headers }) {
		try {
			const size = bodyText?.length && responseBodySize === void 0 ? getBodySize(bodyText) : responseBodySize;
			if (!captureDetails) return buildSkippedNetworkRequestOrResponse(size);
			if (networkCaptureBodies) return buildNetworkRequestOrResponse(headers, size, bodyText);
			return buildNetworkRequestOrResponse(headers, size, void 0);
		} catch (error) {
			debug.exception(error, "Failed to serialize response body");
			return buildNetworkRequestOrResponse(headers, responseBodySize, void 0);
		}
	}
	async function _parseFetchResponseBody(response) {
		const res = _tryCloneResponse(response);
		if (!res) return [void 0, "BODY_PARSE_ERROR"];
		try {
			return [await _tryGetResponseText(res)];
		} catch (error) {
			if (error instanceof Error && error.message.indexOf("Timeout") > -1) {
				debug.warn("Parsing text body from response timed out");
				return [void 0, "BODY_PARSE_TIMEOUT"];
			}
			debug.exception(error, "Failed to get text body from response");
			return [void 0, "BODY_PARSE_ERROR"];
		}
	}
	function getAllHeaders(headers, allowedHeaders) {
		const allHeaders = {};
		allowedHeaders.forEach((header) => {
			if (headers.get(header)) allHeaders[header] = headers.get(header);
		});
		return allHeaders;
	}
	function getRequestHeaders(fetchArgs, allowedHeaders) {
		if (fetchArgs.length === 1 && typeof fetchArgs[0] !== "string") return getHeadersFromOptions(fetchArgs[0], allowedHeaders);
		if (fetchArgs.length === 2) return getHeadersFromOptions(fetchArgs[1], allowedHeaders);
		return {};
	}
	function getHeadersFromOptions(input, allowedHeaders) {
		if (!input) return {};
		const headers = input.headers;
		if (!headers) return {};
		if (headers instanceof Headers) return getAllHeaders(headers, allowedHeaders);
		if (Array.isArray(headers)) return {};
		return getAllowedHeaders(headers, allowedHeaders);
	}
	function _tryCloneResponse(response) {
		try {
			return response.clone();
		} catch (error) {
			debug.exception(error, "Failed to clone response body");
		}
	}
	/**
	* Get the response body of a fetch request, or timeout after 500ms.
	* Fetch can return a streaming body, that may not resolve (or not for a long time).
	* If that happens, we rather abort after a short time than keep waiting for this.
	*/
	function _tryGetResponseText(response) {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout$1(() => reject(/* @__PURE__ */ new Error("Timeout while trying to read response body")), 500);
			_getResponseText(response).then((txt) => resolve(txt), (reason) => reject(reason)).finally(() => clearTimeout(timeout));
		});
	}
	async function _getResponseText(response) {
		return response.text();
	}
	// src/coreHandlers/util/xhrUtils.ts
	/**
	* Capture an XHR breadcrumb to a replay.
	* This adds additional data (where appropriate).
	*/
	async function captureXhrBreadcrumbToReplay(breadcrumb, hint, options) {
		try {
			const result = makeNetworkReplayBreadcrumb("resource.xhr", _prepareXhrData(breadcrumb, hint, options));
			addNetworkBreadcrumb(options.replay, result);
		} catch (error) {
			debug.exception(error, "Failed to capture xhr breadcrumb");
		}
	}
	/**
	* Enrich a breadcrumb with additional data.
	* This has to be sync & mutate the given breadcrumb,
	* as the breadcrumb is afterwards consumed by other handlers.
	*/
	function enrichXhrBreadcrumb(breadcrumb, hint) {
		const { xhr, input } = hint;
		if (!xhr) return;
		const reqSize = getBodySize(input);
		const resSize = xhr.getResponseHeader("content-length") ? parseContentLengthHeader(xhr.getResponseHeader("content-length")) : _getBodySize(xhr.response, xhr.responseType);
		if (reqSize !== void 0) breadcrumb.data.request_body_size = reqSize;
		if (resSize !== void 0) breadcrumb.data.response_body_size = resSize;
	}
	function _prepareXhrData(breadcrumb, hint, options) {
		const now = Date.now();
		const { startTimestamp = now, endTimestamp = now, input, xhr } = hint;
		const { url, method, status_code: statusCode = 0, request_body_size: requestBodySize, response_body_size: responseBodySize } = breadcrumb.data;
		if (!url) return null;
		if (!xhr || !urlMatches(url, options.networkDetailAllowUrls) || urlMatches(url, options.networkDetailDenyUrls)) return {
			startTimestamp,
			endTimestamp,
			url,
			method,
			statusCode,
			request: buildSkippedNetworkRequestOrResponse(requestBodySize),
			response: buildSkippedNetworkRequestOrResponse(responseBodySize)
		};
		const xhrInfo = xhr[SENTRY_XHR_DATA_KEY];
		const networkRequestHeaders = xhrInfo ? getAllowedHeaders(xhrInfo.request_headers, options.networkRequestHeaders) : {};
		const networkResponseHeaders = getAllowedHeaders(parseXhrResponseHeaders(xhr), options.networkResponseHeaders);
		const [requestBody, requestWarning] = options.networkCaptureBodies ? getBodyString(input, debug) : [void 0];
		const [responseBody, responseWarning] = options.networkCaptureBodies ? _getXhrResponseBody(xhr) : [void 0];
		const request = buildNetworkRequestOrResponse(networkRequestHeaders, requestBodySize, requestBody);
		const response = buildNetworkRequestOrResponse(networkResponseHeaders, responseBodySize, responseBody);
		return {
			startTimestamp,
			endTimestamp,
			url,
			method,
			statusCode,
			request: requestWarning ? mergeWarning(request, requestWarning) : request,
			response: responseWarning ? mergeWarning(response, responseWarning) : response
		};
	}
	function _getXhrResponseBody(xhr) {
		const errors = [];
		try {
			return [xhr.responseText];
		} catch (e) {
			errors.push(e);
		}
		try {
			return _parseXhrResponse(xhr.response, xhr.responseType);
		} catch (e) {
			errors.push(e);
		}
		debug.warn("Failed to get xhr response body", ...errors);
		return [void 0];
	}
	/**
	* Get the string representation of the XHR response.
	* Based on MDN, these are the possible types of the response:
	* string
	* ArrayBuffer
	* Blob
	* Document
	* POJO
	*
	* Exported only for tests.
	*/
	function _parseXhrResponse(body, responseType) {
		try {
			if (typeof body === "string") return [body];
			if (body instanceof Document) return [body.body.outerHTML];
			if (responseType === "json" && isObjectLike(body)) return [JSON.stringify(body)];
			if (!body) return [void 0];
		} catch (error) {
			debug.exception(error, "Failed to serialize body", body);
			return [void 0, "BODY_PARSE_ERROR"];
		}
		debug.log("Skipping network body because of body type", body);
		return [void 0, "UNPARSEABLE_BODY_TYPE"];
	}
	function _getBodySize(body, responseType) {
		try {
			return getBodySize(responseType === "json" && isObjectLike(body) ? JSON.stringify(body) : body);
		} catch {
			return;
		}
	}
	// src/coreHandlers/handleNetworkBreadcrumbs.ts
	/**
	* This method does two things:
	* - It enriches the regular XHR/fetch breadcrumbs with request/response size data
	* - It captures the XHR/fetch breadcrumbs to the replay
	*   (enriching it with further data that is _not_ added to the regular breadcrumbs)
	*/
	function handleNetworkBreadcrumbs(replay) {
		const client = getClient();
		try {
			const { networkDetailAllowUrls, networkDetailDenyUrls, networkCaptureBodies, networkRequestHeaders, networkResponseHeaders } = replay.getOptions();
			const options = {
				replay,
				networkDetailAllowUrls,
				networkDetailDenyUrls,
				networkCaptureBodies,
				networkRequestHeaders,
				networkResponseHeaders
			};
			if (client) client.on("beforeAddBreadcrumb", (breadcrumb, hint) => beforeAddNetworkBreadcrumb(options, breadcrumb, hint));
		} catch {}
	}
	/** just exported for tests */
	function beforeAddNetworkBreadcrumb(options, breadcrumb, hint) {
		if (!breadcrumb.data) return;
		try {
			if (_isXhrBreadcrumb(breadcrumb) && _isXhrHint(hint)) {
				enrichXhrBreadcrumb(breadcrumb, hint);
				captureXhrBreadcrumbToReplay(breadcrumb, hint, options);
			}
			if (_isFetchBreadcrumb(breadcrumb) && _isFetchHint(hint)) {
				enrichFetchBreadcrumb(breadcrumb, hint);
				captureFetchBreadcrumbToReplay(breadcrumb, hint, options);
			}
		} catch (e) {
			debug.exception(e, "Error when enriching network breadcrumb");
		}
	}
	function _isXhrBreadcrumb(breadcrumb) {
		return breadcrumb.category === "xhr";
	}
	function _isFetchBreadcrumb(breadcrumb) {
		return breadcrumb.category === "fetch";
	}
	function _isXhrHint(hint) {
		return hint?.xhr;
	}
	function _isFetchHint(hint) {
		return hint?.input !== void 0;
	}
	// src/util/addGlobalListeners.ts
	/**
	* Add global listeners that cannot be removed.
	*/
	function addGlobalListeners(replay) {
		const client = getClient();
		addClickKeypressInstrumentationHandler(handleDomListener(replay));
		addHistoryInstrumentationHandler(handleHistorySpanListener(replay));
		handleBreadcrumbs(replay);
		handleNetworkBreadcrumbs(replay);
		addEventProcessor(handleGlobalEventListener(replay));
		if (client) {
			client.on("beforeSendEvent", handleBeforeSendEvent(replay));
			client.on("afterSendEvent", handleAfterSendEvent(replay));
			client.on("createDsc", (dsc) => {
				const replayId = replay.getSessionId();
				if (replayId && replay.isEnabled() && replay.recordingMode === "session") {
					if (replay.checkAndHandleExpiredSession()) dsc.replay_id = replayId;
				}
			});
			client.on("processSegmentSpan", handleProcessSegmentSpan(replay));
			client.on("spanStart", (span) => {
				replay.lastActiveSpan = span;
			});
			client.on("spanEnd", (span) => {
				replay.lastActiveSpan = span;
			});
			let replayIdOnFeedbackOpen;
			client.on("beforeSendFeedback", async (feedbackEvent, options) => {
				const feedbackContext = feedbackEvent.contexts?.feedback;
				if (!options?.includeReplay || !feedbackContext) return;
				if (feedbackContext.source === "widget" && replayIdOnFeedbackOpen) {
					feedbackContext.replay_id = replayIdOnFeedbackOpen;
					replayIdOnFeedbackOpen = void 0;
					return;
				}
				const replayId = replay.getSessionId();
				if (replay.isEnabled() && replayId) {
					if (feedbackContext.source === "api") await replay.sendBufferedReplayOrFlush();
					feedbackContext.replay_id = replayId;
				}
			});
			client.on("openFeedbackWidget", async () => {
				replayIdOnFeedbackOpen = void 0;
				await replay.sendBufferedReplayOrFlush();
				replayIdOnFeedbackOpen = replay.isEnabled() ? replay.getSessionId() : void 0;
			});
		}
	}
	// src/util/addMemoryEntry.ts
	/**
	* Create a "span" for the total amount of memory being used by JS objects
	* (including v8 internal objects).
	*/
	async function addMemoryEntry(replay) {
		try {
			return await Promise.all(createPerformanceSpans(replay, [createMemoryEntry(WINDOW$1.performance.memory)]));
		} catch {
			return [];
		}
	}
	function createMemoryEntry(memoryEntry) {
		const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = memoryEntry;
		const time = Date.now() / 1e3;
		return {
			type: "memory",
			name: "memory",
			start: time,
			end: time,
			data: { memory: {
				jsHeapSizeLimit,
				totalJSHeapSize,
				usedJSHeapSize
			} }
		};
	}
	// src/util/debounce.ts
	/**
	* Heavily simplified debounce function based on lodash.debounce.
	*
	* This function takes a callback function (@param fun) and delays its invocation
	* by @param wait milliseconds. Optionally, a maxWait can be specified in @param options,
	* which ensures that the callback is invoked at least once after the specified max. wait time.
	*
	* @param func the function whose invocation is to be debounced
	* @param wait the minimum time until the function is invoked after it was called once
	* @param options the options object, which can contain the `maxWait` property
	*
	* @returns the debounced version of the function, which needs to be called at least once to start the
	*          debouncing process. Subsequent calls will reset the debouncing timer and, in case @paramfunc
	*          was already invoked in the meantime, return @param func's return value.
	*          The debounced function has two additional properties:
	*          - `flush`: Invokes the debounced function immediately and returns its return value
	*          - `cancel`: Cancels the debouncing process and resets the debouncing timer
	*/
	function debounce(func, wait, options) {
		return debounce$1(func, wait, {
			...options,
			setTimeoutImpl: setTimeout$1
		});
	}
	// src/util/getRecordingSamplingOptions.ts
	const NAVIGATOR = GLOBAL_OBJ.navigator;
	/**
	*  Disable sampling mousemove events on iOS browsers as this can cause blocking the main thread
	*  https://github.com/getsentry/sentry-javascript/issues/14534
	*/
	function getRecordingSamplingOptions() {
		if (/iPhone|iPad|iPod/i.test(NAVIGATOR?.userAgent ?? "") || /Macintosh/i.test(NAVIGATOR?.userAgent ?? "") && NAVIGATOR?.maxTouchPoints && NAVIGATOR?.maxTouchPoints > 1) return { sampling: { mousemove: false } };
		return {};
	}
	// src/util/handleRecordingEmit.ts
	/**
	* Handler for recording events.
	*
	* Adds to event buffer, and has varying flushing behaviors if the event was a checkout.
	*/
	function getHandleRecordingEmit(replay) {
		let hadFirstEvent = false;
		return (event, _isCheckout) => {
			try {
				if (!replay.checkAndHandleExpiredSession()) {
					debug.warn("Received replay event after session expired.");
					return;
				}
				const isCheckout = _isCheckout || !hadFirstEvent;
				hadFirstEvent = true;
				syncMirrorAttributesFromMutationEvent(event);
				if (replay.clickDetector) updateClickDetectorForRecordingEvent(replay.clickDetector, event);
				replay.addUpdate(() => {
					if (replay.recordingMode === "buffer" && isCheckout) replay.setInitialState();
					if (!addEventSync(replay, event, isCheckout)) return true;
					if (!isCheckout) return false;
					const session = replay.session;
					addSettingsEvent(replay, isCheckout);
					if (replay.recordingMode === "buffer" && session && replay.eventBuffer && !session.dirty) {
						const earliestEvent = replay.eventBuffer.getEarliestTimestamp();
						if (earliestEvent) {
							debug.log(`Updating session start time to earliest event in buffer to ${new Date(earliestEvent)}`);
							session.started = earliestEvent;
							if (replay.getOptions().stickySession) saveSession(session);
						}
					}
					if (session?.previousSessionId) return true;
					if (replay.recordingMode === "session") replay.flush();
					return true;
				});
			} catch (error) {
				replay.handleException(error);
			}
		};
	}
	function syncMirrorAttributesFromMutationEvent(event) {
		const data = event.data;
		if (event.type !== EventType.IncrementalSnapshot || !data || typeof data !== "object" || !("source" in data) || data.source !== IncrementalSource.Mutation || !("attributes" in data) || !Array.isArray(data.attributes)) return;
		for (const mutation of data.attributes) {
			const node = record.mirror.getNode(mutation.id);
			const meta = node && record.mirror.getMeta(node);
			if (!node || meta?.type !== NodeType.Element) continue;
			const attributes = { ...meta.attributes };
			let changed = false;
			for (const [attributeName, value] of Object.entries(mutation.attributes)) {
				if (!BREADCRUMB_RELEVANT_ATTRIBUTES.has(attributeName)) continue;
				if (value === null) delete attributes[attributeName];
				else attributes[attributeName] = value;
				changed = true;
			}
			if (changed) record.mirror.add(node, {
				...meta,
				attributes
			});
		}
	}
	/**
	* Exported for tests
	*/
	function createOptionsEvent(replay) {
		const options = replay.getOptions();
		return {
			type: EventType.Custom,
			timestamp: Date.now(),
			data: {
				tag: "options",
				payload: {
					shouldRecordCanvas: replay.isRecordingCanvas(),
					sessionSampleRate: options.sessionSampleRate,
					errorSampleRate: options.errorSampleRate,
					useCompressionOption: options.useCompression,
					blockAllMedia: options.blockAllMedia,
					maskAllText: options.maskAllText,
					maskAllInputs: options.maskAllInputs,
					useCompression: replay.eventBuffer ? replay.eventBuffer.type === "worker" : false,
					networkDetailHasUrls: options.networkDetailAllowUrls.length > 0,
					networkCaptureBodies: options.networkCaptureBodies,
					networkRequestHasHeaders: options.networkRequestHeaders.length > 0,
					networkResponseHasHeaders: options.networkResponseHeaders.length > 0
				}
			}
		};
	}
	/**
	* Add a "meta" event that contains a simplified view on current configuration
	* options. This should only be included on the first segment of a recording.
	*/
	function addSettingsEvent(replay, isCheckout) {
		if (!isCheckout || replay.session?.segmentId !== 0) return;
		addEventSync(replay, createOptionsEvent(replay), false);
	}
	// src/util/rrweb.ts
	/**
	* Vendored in from @sentry/rrweb.
	*
	* This is a copy of the function from rrweb, it is not nicely exported there.
	*/
	function closestElementOfNode(node) {
		if (!node) return null;
		try {
			return node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
		} catch {
			return null;
		}
	}
	// src/util/createReplayEnvelope.ts
	/**
	* Create a replay envelope ready to be sent.
	* This includes both the replay event, as well as the recording data.
	*/
	function createReplayEnvelope(replayEvent, recordingData, dsn, tunnel) {
		return createEnvelope(createEventEnvelopeHeaders(replayEvent, getSdkMetadataForEnvelopeHeader(replayEvent), tunnel, dsn), [[{ type: "replay_event" }, replayEvent], [{
			type: "replay_recording",
			length: typeof recordingData === "string" ? new TextEncoder().encode(recordingData).length : recordingData.length
		}, recordingData]]);
	}
	// src/util/prepareRecordingData.ts
	/**
	* Prepare the recording data ready to be sent.
	*/
	function prepareRecordingData({ recordingData, headers }) {
		let payloadWithSequence;
		const replayHeaders = `${JSON.stringify(headers)}
`;
		if (typeof recordingData === "string") payloadWithSequence = `${replayHeaders}${recordingData}`;
		else {
			const sequence = new TextEncoder().encode(replayHeaders);
			payloadWithSequence = new Uint8Array(sequence.length + recordingData.length);
			payloadWithSequence.set(sequence);
			payloadWithSequence.set(recordingData, sequence.length);
		}
		return payloadWithSequence;
	}
	// src/util/prepareReplayEvent.ts
	/**
	* Prepare a replay event & enrich it with the SDK metadata.
	*/
	async function prepareReplayEvent({ client, scope, replayId: event_id, event }) {
		const eventHint = {
			event_id,
			integrations: typeof client["_integrations"] === "object" && client["_integrations"] !== null && !Array.isArray(client["_integrations"]) ? Object.keys(client["_integrations"]) : void 0
		};
		client.emit("preprocessEvent", event, eventHint);
		const preparedEvent = await prepareEvent(client.getOptions(), event, eventHint, scope, client, getIsolationScope());
		if (!preparedEvent) return null;
		client.emit("postprocessEvent", preparedEvent, eventHint);
		preparedEvent.platform = preparedEvent.platform || "javascript";
		const { name, version, settings } = client.getSdkMetadata()?.sdk || {};
		preparedEvent.sdk = {
			...preparedEvent.sdk,
			name: name || "sentry.javascript.unknown",
			version: version || "0.0.0",
			settings
		};
		return preparedEvent;
	}
	// src/util/sendReplayRequest.ts
	/**
	* Send replay attachment using `fetch()`
	*/
	async function sendReplayRequest({ recordingData, replayId, segmentId: segment_id, eventContext, timestamp, session }) {
		const preparedRecordingData = prepareRecordingData({
			recordingData,
			headers: { segment_id }
		});
		const { urls, errorIds, traceIds, segmentNames, initialTimestamp } = eventContext;
		const client = getClient();
		const scope = getCurrentScope();
		const transport = client?.getTransport();
		const dsn = client?.getDsn();
		if (!client || !transport || !dsn || !session.sampled) return Promise.resolve({});
		const replayEvent = await prepareReplayEvent({
			scope,
			client,
			replayId,
			event: {
				type: REPLAY_EVENT_NAME,
				replay_start_timestamp: initialTimestamp / 1e3,
				timestamp: timestamp / 1e3,
				error_ids: errorIds,
				trace_ids: traceIds,
				segment_names: segmentNames,
				urls,
				replay_id: replayId,
				segment_id,
				replay_type: session.sampled
			}
		});
		if (!replayEvent) {
			debug.log("An event processor returned `null`, will not send event.");
			return Promise.resolve({});
		}
		delete replayEvent.sdkProcessingMetadata;
		const envelope = createReplayEnvelope(replayEvent, preparedRecordingData, dsn, client.getOptions().tunnel);
		let response;
		try {
			response = await transport.send(envelope);
		} catch (err) {
			const error = /* @__PURE__ */ new Error(UNABLE_TO_SEND_REPLAY);
			try {
				error.cause = err;
			} catch {}
			throw error;
		}
		const rateLimits = updateRateLimits({}, response);
		if (isRateLimited(rateLimits, "replay")) throw new RateLimitError(rateLimits);
		if (typeof response.statusCode === "number" && (response.statusCode < 200 || response.statusCode >= 300)) throw new TransportStatusCodeError(response.statusCode);
		return response;
	}
	/**
	* This error indicates that the transport returned an invalid status code.
	*/
	var TransportStatusCodeError = class extends Error {
		constructor(statusCode) {
			super(`Transport returned status code ${statusCode}`);
		}
	};
	/**
	* This error indicates that we hit a rate limit API error.
	*/
	var RateLimitError = class extends Error {
		constructor(rateLimits) {
			super("Rate limit hit");
			this.rateLimits = rateLimits;
		}
	};
	/**
	* This error indicates that the replay duration limit was exceeded and the session is too long.
	*
	*/
	var ReplayDurationLimitError = class extends Error {
		constructor() {
			super("Session is too long, not sending replay");
		}
	};
	// src/util/sendReplay.ts
	/**
	* Finalize and send the current replay event to Sentry
	*/
	async function sendReplay(replayData, retryConfig = {
		count: 0,
		interval: RETRY_BASE_INTERVAL
	}) {
		const { recordingData, onError } = replayData;
		if (!recordingData.length) return;
		try {
			await sendReplayRequest(replayData);
			return true;
		} catch (err) {
			if (err instanceof TransportStatusCodeError || err instanceof RateLimitError) throw err;
			setContext("Replays", { _retryCount: retryConfig.count });
			if (onError) onError(err);
			if (retryConfig.count >= 3) {
				const error = /* @__PURE__ */ new Error(`${UNABLE_TO_SEND_REPLAY} - max retries exceeded`);
				try {
					error.cause = err;
				} catch {}
				throw error;
			}
			retryConfig.interval *= ++retryConfig.count;
			return new Promise((resolve, reject) => {
				setTimeout$1(async () => {
					try {
						await sendReplay(replayData, retryConfig);
						resolve(true);
					} catch (err) {
						reject(err);
					}
				}, retryConfig.interval);
			});
		}
	}
	// src/util/throttle.ts
	const THROTTLED = "__THROTTLED";
	const SKIPPED = "__SKIPPED";
	/**
	* Create a throttled function off a given function.
	* When calling the throttled function, it will call the original function only
	* if it hasn't been called more than `maxCount` times in the last `durationSeconds`.
	*
	* Returns `THROTTLED` if throttled for the first time, after that `SKIPPED`,
	* or else the return value of the original function.
	*/
	function throttle(fn, maxCount, durationSeconds) {
		const counter = /* @__PURE__ */ new Map();
		const _cleanup = (now) => {
			const threshold = now - durationSeconds;
			counter.forEach((_value, key) => {
				if (key < threshold) counter.delete(key);
			});
		};
		const _getTotalCount = () => {
			return [...counter.values()].reduce((a, b) => a + b, 0);
		};
		let isThrottled = false;
		return (...rest) => {
			const now = Math.floor(Date.now() / 1e3);
			_cleanup(now);
			if (_getTotalCount() >= maxCount) {
				const wasThrottled = isThrottled;
				isThrottled = true;
				return wasThrottled ? SKIPPED : THROTTLED;
			}
			isThrottled = false;
			const count = counter.get(now) || 0;
			counter.set(now, count + 1);
			return fn(...rest);
		};
	}
	// src/replay.ts
	/**
	* The main replay container class, which holds all the state and methods for recording and sending replays.
	*/
	var ReplayContainer = class {
		constructor({ options, recordingOptions }) {
			this.eventBuffer = null;
			this.performanceEntries = [];
			this.replayPerformanceEntries = [];
			this.recordingMode = "session";
			this.timeouts = {
				sessionIdlePause: SESSION_IDLE_PAUSE_DURATION,
				sessionIdleExpire: SESSION_IDLE_EXPIRE_DURATION
			};
			this._lastActivity = Date.now();
			this._isEnabled = false;
			this._isPaused = false;
			this._requiresManualStart = false;
			this._hasInitializedCoreListeners = false;
			this._context = {
				errorIds: /* @__PURE__ */ new Set(),
				traceIds: /* @__PURE__ */ new Set(),
				segmentNames: /* @__PURE__ */ new Set(),
				urls: [],
				initialTimestamp: Date.now(),
				initialUrl: ""
			};
			this._recordingOptions = recordingOptions;
			this._options = options;
			this._debouncedFlush = debounce(() => this._flush(), this._options.flushMinDelay, { maxWait: this._options.flushMaxDelay });
			this._throttledAddEvent = throttle((event, isCheckout) => addEvent(this, event, isCheckout), 300, 5);
			const { slowClickTimeout, slowClickIgnoreSelectors } = this.getOptions();
			const slowClickConfig = slowClickTimeout ? {
				threshold: Math.min(SLOW_CLICK_THRESHOLD, slowClickTimeout),
				timeout: slowClickTimeout,
				scrollTimeout: 300,
				ignoreSelector: slowClickIgnoreSelectors ? slowClickIgnoreSelectors.join(",") : ""
			} : void 0;
			if (slowClickConfig) this.clickDetector = new ClickDetector(this, slowClickConfig);
			{
				const experiments = options._experiments;
				debug.setConfig({
					captureExceptions: !!experiments.captureExceptions,
					traceInternals: !!experiments.traceInternals
				});
			}
			this._handleVisibilityChange = () => {
				if (WINDOW$1.document.visibilityState === "visible") this._doChangeToForegroundTasks();
				else this._doChangeToBackgroundTasks();
			};
			/**
			* Handle when page is blurred
			*/
			this._handleWindowBlur = () => {
				const breadcrumb = createBreadcrumb({ category: "ui.blur" });
				this._doChangeToBackgroundTasks(breadcrumb);
			};
			this._handleWindowFocus = () => {
				const breadcrumb = createBreadcrumb({ category: "ui.focus" });
				this._doChangeToForegroundTasks(breadcrumb);
			};
			/** Ensure page remains active when a key is pressed. */
			this._handleKeyboardEvent = (event) => {
				handleKeyboardEvent(this, event);
			};
		}
		/** Get the event context. */
		getContext() {
			return this._context;
		}
		/** If recording is currently enabled. */
		isEnabled() {
			return this._isEnabled;
		}
		/** If recording is currently paused. */
		isPaused() {
			return this._isPaused;
		}
		/**
		* Determine if canvas recording is enabled
		*/
		isRecordingCanvas() {
			return Boolean(this._canvas);
		}
		/** Get the replay integration options. */
		getOptions() {
			return this._options;
		}
		getMaskAttributeFn() {
			return this._recordingOptions.maskAttributeFn;
		}
		/** A wrapper to conditionally capture exceptions. */
		handleException(error) {
			debug.exception(error);
			if (this._options.onError) this._options.onError(error);
		}
		/**
		* Initializes the plugin based on sampling configuration. Should not be
		* called outside of constructor.
		*/
		initializeSampling(previousSessionId) {
			const { errorSampleRate, sessionSampleRate } = this._options;
			const requiresManualStart = errorSampleRate <= 0 && sessionSampleRate <= 0;
			this._requiresManualStart = requiresManualStart;
			if (requiresManualStart) return;
			this._initializeSessionForSampling(previousSessionId);
			if (!this.session) {
				debug.exception(/* @__PURE__ */ new Error("Unable to initialize and create session"));
				return;
			}
			if (this.session.sampled === false) return;
			this.recordingMode = this.session.sampled === "buffer" && this.session.segmentId === 0 ? "buffer" : "session";
			debug.infoTick(`Starting replay in ${this.recordingMode} mode`);
			this._initializeRecording();
		}
		/**
		* Start a replay regardless of sampling rate. Calling this will always
		* create a new session. Will log a message if replay is already in progress.
		*
		* Creates or loads a session, attaches listeners to varying events (DOM,
		* _performanceObserver, Recording, Sentry SDK, etc)
		*/
		start() {
			if (this._isEnabled && this.recordingMode === "session") {
				debug.log("Recording is already in progress");
				return;
			}
			if (this._isEnabled && this.recordingMode === "buffer") {
				debug.log("Buffering is in progress, call `flush()` to save the replay");
				return;
			}
			debug.infoTick("Starting replay in session mode");
			this._updateUserActivity();
			const session = loadOrCreateSession({
				maxReplayDuration: this._options.maxReplayDuration,
				sessionIdleExpire: this.timeouts.sessionIdleExpire
			}, {
				stickySession: this._options.stickySession,
				sessionSampleRate: 1,
				allowBuffering: false
			});
			this.session = session;
			this.recordingMode = "session";
			this._initializeRecording();
		}
		/**
		* Start replay buffering. Buffers until `flush()` is called or, if
		* `replaysOnErrorSampleRate` > 0, an error occurs.
		*/
		startBuffering() {
			if (this._isEnabled) {
				debug.log("Buffering is in progress, call `flush()` to save the replay");
				return;
			}
			debug.infoTick("Starting replay in buffer mode");
			const session = loadOrCreateSession({
				sessionIdleExpire: this.timeouts.sessionIdleExpire,
				maxReplayDuration: this._options.maxReplayDuration
			}, {
				stickySession: this._options.stickySession,
				sessionSampleRate: 0,
				allowBuffering: true
			});
			this.session = session;
			this.recordingMode = "buffer";
			this._initializeRecording();
		}
		/**
		* Start recording.
		*
		* Note that this will cause a new DOM checkout
		*/
		startRecording() {
			try {
				const canvasOptions = this._canvas;
				this._stopRecording = record({
					...this._recordingOptions,
					...this.recordingMode === "buffer" ? { checkoutEveryNms: BUFFER_CHECKOUT_TIME } : this._options._experiments.continuousCheckout && { checkoutEveryNms: Math.max(36e4, this._options._experiments.continuousCheckout) },
					emit: getHandleRecordingEmit(this),
					...getRecordingSamplingOptions(),
					onMutation: this._onMutationHandler.bind(this),
					...canvasOptions ? {
						recordCanvas: canvasOptions.recordCanvas,
						getCanvasManager: canvasOptions.getCanvasManager,
						sampling: canvasOptions.sampling,
						dataURLOptions: canvasOptions.dataURLOptions
					} : {}
				});
			} catch (err) {
				this.handleException(err);
			}
		}
		/**
		* Stops the recording, if it was running.
		*
		* Returns true if it was previously stopped, or is now stopped,
		* otherwise false.
		*/
		stopRecording() {
			try {
				if (this._stopRecording) {
					this._stopRecording();
					this._stopRecording = void 0;
				}
				return true;
			} catch (err) {
				this.handleException(err);
				return false;
			}
		}
		/**
		* Currently, this needs to be manually called (e.g. for tests). Sentry SDK
		* does not support a teardown
		*/
		async stop({ forceFlush = false, reason } = {}) {
			if (!this._isEnabled) return;
			this._isEnabled = false;
			this.recordingMode = "buffer";
			const stopReason = reason ?? "manual";
			getClient()?.emit("replayEnd", {
				sessionId: this.session?.id,
				reason: stopReason
			});
			try {
				debug.log(`Stopping Replay triggered by ${stopReason}`);
				resetReplayIdOnDynamicSamplingContext();
				this._removeListeners();
				this.stopRecording();
				this._debouncedFlush.cancel();
				if (forceFlush) await this._flush({ force: true });
				this.eventBuffer?.destroy();
				this.eventBuffer = null;
				clearSession(this);
			} catch (err) {
				this.handleException(err);
			}
		}
		/**
		* Pause some replay functionality. See comments for `_isPaused`.
		* This differs from stop as this only stops DOM recording, it is
		* not as thorough of a shutdown as `stop()`.
		*/
		pause() {
			if (this._isPaused) return;
			this._isPaused = true;
			this.stopRecording();
			debug.log("Pausing replay");
		}
		/**
		* Resumes recording, see notes for `pause().
		*
		* Note that calling `startRecording()` here will cause a
		* new DOM checkout.`
		*/
		resume() {
			if (!this._isPaused || !this._checkSession()) return;
			this._isPaused = false;
			this.startRecording();
			debug.log("Resuming replay");
		}
		/**
		* If not in "session" recording mode, flush event buffer which will create a new replay.
		* Unless `continueRecording` is false, the replay will continue to record and
		* behave as a "session"-based replay.
		*
		* Otherwise, queue up a flush.
		*/
		async sendBufferedReplayOrFlush({ continueRecording = true } = {}) {
			if (this.recordingMode === "session") return this.flushImmediate();
			const activityTime = Date.now();
			debug.log("Converting buffer to session");
			await this.flushImmediate();
			const hasStoppedRecording = this.stopRecording();
			if (!continueRecording || !hasStoppedRecording) return;
			if (this.recordingMode === "session") return;
			this.recordingMode = "session";
			if (this.session) {
				this.session.dirty = false;
				this._updateUserActivity(activityTime);
				this._updateSessionActivity(activityTime);
				this._maybeSaveSession();
				setReplayIdOnDynamicSamplingContext(this.session.id);
			}
			this.startRecording();
		}
		/**
		* We want to batch uploads of replay events. Save events only if
		* `<flushMinDelay>` milliseconds have elapsed since the last event
		* *OR* if `<flushMaxDelay>` milliseconds have elapsed.
		*
		* Accepts a callback to perform side-effects and returns true to stop batch
		* processing and hand back control to caller.
		*/
		addUpdate(cb) {
			const cbResult = cb();
			if (this.recordingMode === "buffer" || !this._isEnabled) return;
			if (cbResult === true) return;
			this._debouncedFlush();
		}
		/**
		* Updates the user activity timestamp and resumes recording. This should be
		* called in an event handler for a user action that we consider as the user
		* being "active" (e.g. a mouse click).
		*/
		triggerUserActivity() {
			this._updateUserActivity();
			if (!this._stopRecording) {
				if (!this._checkSession()) return;
				this.resume();
				return;
			}
			this.checkAndHandleExpiredSession();
			this._updateSessionActivity();
		}
		/**
		* Updates the user activity timestamp *without* resuming
		* recording. Some user events (e.g. keydown) can be create
		* low-value replays that only contain the keypress as a
		* breadcrumb. Instead this would require other events to
		* create a new replay after a session has expired.
		*/
		updateUserActivity() {
			this._updateUserActivity();
			this._updateSessionActivity();
		}
		/**
		* Only flush if `this.recordingMode === 'session'`
		*/
		conditionalFlush() {
			if (this.recordingMode === "buffer") return Promise.resolve();
			return this.flushImmediate();
		}
		/**
		* Flush using debounce flush
		*/
		flush() {
			return this._debouncedFlush();
		}
		/**
		* Always flush via `_debouncedFlush` so that we do not have flushes triggered
		* from calling both `flush` and `_debouncedFlush`. Otherwise, there could be
		* cases of multiple flushes happening closely together.
		*/
		flushImmediate() {
			this._debouncedFlush();
			return this._debouncedFlush.flush();
		}
		/**
		* Cancels queued up flushes.
		*/
		cancelFlush() {
			this._debouncedFlush.cancel();
		}
		/** Get the current session (=replay) ID
		*
		* @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
		*/
		getSessionId(onlyIfSampled) {
			if (onlyIfSampled && this.session?.sampled === false) return;
			return this.session?.id;
		}
		/**
		* Checks if recording should be stopped due to user inactivity. Otherwise
		* check if session is expired and create a new session if so. Triggers a new
		* full snapshot on new session.
		*
		* Returns true if session is not expired, false otherwise.
		* @hidden
		*/
		checkAndHandleExpiredSession() {
			if (this._lastActivity && isExpired(this._lastActivity, this.timeouts.sessionIdlePause) && this.session?.sampled === "session") {
				this.pause();
				return;
			}
			if (!this._checkSession()) return false;
			return true;
		}
		/**
		* Capture some initial state that can change throughout the lifespan of the
		* replay. This is required because otherwise they would be captured at the
		* first flush.
		*/
		setInitialState() {
			const urlPath = `${WINDOW$1.location.pathname}${WINDOW$1.location.hash}${WINDOW$1.location.search}`;
			const url = `${WINDOW$1.location.origin}${urlPath}`;
			this.performanceEntries = [];
			this.replayPerformanceEntries = [];
			this._clearContext();
			this._context.initialUrl = url;
			this._context.initialTimestamp = Date.now();
			this._context.urls.push(url);
		}
		/**
		* Add a breadcrumb event, that may be throttled.
		* If it was throttled, we add a custom breadcrumb to indicate that.
		*/
		throttledAddEvent(event, isCheckout) {
			const res = this._throttledAddEvent(event, isCheckout);
			if (res === "__THROTTLED") {
				const breadcrumb = createBreadcrumb({ category: "replay.throttled" });
				this.addUpdate(() => {
					return !addEventSync(this, {
						type: 5,
						timestamp: breadcrumb.timestamp || 0,
						data: {
							tag: "breadcrumb",
							payload: breadcrumb,
							metric: true
						}
					});
				});
			}
			return res;
		}
		/**
		* This will get the parametrized route name of the current page.
		* This is only available if performance is enabled, and if an instrumented router is used.
		*/
		getCurrentRoute() {
			const lastActiveSpan = this.lastActiveSpan || getActiveSpan();
			const lastRootSpan = lastActiveSpan && getRootSpan(lastActiveSpan);
			if (!lastRootSpan) return;
			const spanJson = spanToJSON(lastRootSpan);
			const source = spanJson.attributes[qb];
			if (!source || !["route", "custom"].includes(source)) return;
			return spanJson.name;
		}
		/**
		* Initialize and start all listeners to varying events (DOM,
		* Performance Observer, Recording, Sentry SDK, etc)
		*/
		_initializeRecording() {
			this.setInitialState();
			this._updateSessionActivity();
			this.eventBuffer = createEventBuffer({
				useCompression: this._options.useCompression,
				workerUrl: this._options.workerUrl
			});
			this._removeListeners();
			this._addListeners();
			this._isEnabled = true;
			this._isPaused = false;
			if (this.session) getClient()?.emit("replayStart", {
				sessionId: this.session.id,
				recordingMode: this.recordingMode
			});
			this.startRecording();
			if (this.recordingMode === "session" && this.session) setReplayIdOnDynamicSamplingContext(this.session.id);
		}
		/**
		* Loads (or refreshes) the current session.
		*/
		_initializeSessionForSampling(previousSessionId) {
			const allowBuffering = this._options.errorSampleRate > 0;
			const session = loadOrCreateSession({
				sessionIdleExpire: this.timeouts.sessionIdleExpire,
				maxReplayDuration: this._options.maxReplayDuration,
				previousSessionId
			}, {
				stickySession: this._options.stickySession,
				sessionSampleRate: this._options.sessionSampleRate,
				allowBuffering
			});
			this.session = session;
		}
		/**
		* Checks and potentially refreshes the current session.
		* Returns false if session is not recorded.
		*/
		_checkSession() {
			if (!this.session) return false;
			const currentSession = this.session;
			if (shouldRefreshSession(currentSession, {
				sessionIdleExpire: this.timeouts.sessionIdleExpire,
				maxReplayDuration: this._options.maxReplayDuration
			})) {
				this._refreshSession(currentSession);
				return false;
			}
			return true;
		}
		/**
		* Refresh a session with a new one.
		* This stops the current session (without forcing a flush, as that would never work since we are expired),
		* and then does a new sampling based on the refreshed session.
		*/
		async _refreshSession(session) {
			if (!this._isEnabled) return;
			await this.stop({ reason: "sessionExpired" });
			this.initializeSampling(session.id);
		}
		/**
		* Adds listeners to record events for the replay
		*/
		_addListeners() {
			try {
				WINDOW$1.document.addEventListener("visibilitychange", this._handleVisibilityChange);
				WINDOW$1.addEventListener("blur", this._handleWindowBlur);
				WINDOW$1.addEventListener("focus", this._handleWindowFocus);
				WINDOW$1.addEventListener("keydown", this._handleKeyboardEvent);
				if (this.clickDetector) this.clickDetector.addListeners();
				if (!this._hasInitializedCoreListeners) {
					addGlobalListeners(this);
					this._hasInitializedCoreListeners = true;
				}
			} catch (err) {
				this.handleException(err);
			}
			this._performanceCleanupCallback = setupPerformanceObserver(this);
		}
		/**
		* Cleans up listeners that were created in `_addListeners`
		*/
		_removeListeners() {
			try {
				WINDOW$1.document.removeEventListener("visibilitychange", this._handleVisibilityChange);
				WINDOW$1.removeEventListener("blur", this._handleWindowBlur);
				WINDOW$1.removeEventListener("focus", this._handleWindowFocus);
				WINDOW$1.removeEventListener("keydown", this._handleKeyboardEvent);
				if (this.clickDetector) this.clickDetector.removeListeners();
				if (this._performanceCleanupCallback) this._performanceCleanupCallback();
			} catch (err) {
				this.handleException(err);
			}
		}
		/**
		* Tasks to run when we consider a page to be hidden (via blurring and/or visibility)
		*/
		_doChangeToBackgroundTasks(breadcrumb) {
			if (!this.session) return;
			if (shouldRefreshSession(this.session, {
				maxReplayDuration: this._options.maxReplayDuration,
				sessionIdleExpire: this.timeouts.sessionIdleExpire
			})) {
				resetReplayIdOnDynamicSamplingContext();
				return;
			}
			if (breadcrumb) this._createCustomBreadcrumb(breadcrumb);
			this.conditionalFlush();
		}
		/**
		* Tasks to run when we consider a page to be visible (via focus and/or visibility)
		*/
		_doChangeToForegroundTasks(breadcrumb) {
			if (!this.session) return;
			if (!this.checkAndHandleExpiredSession()) {
				debug.log("Document has become active, but session has expired");
				return;
			}
			if (breadcrumb) this._createCustomBreadcrumb(breadcrumb);
		}
		/**
		* Update user activity (across session lifespans)
		*/
		_updateUserActivity(_lastActivity = Date.now()) {
			this._lastActivity = _lastActivity;
		}
		/**
		* Updates the session's last activity timestamp
		*/
		_updateSessionActivity(_lastActivity = Date.now()) {
			if (this.session) {
				this.session.lastActivity = _lastActivity;
				this._maybeSaveSession();
			}
		}
		/**
		* Helper to create (and buffer) a replay breadcrumb from a core SDK breadcrumb
		*/
		_createCustomBreadcrumb(breadcrumb) {
			this.addUpdate(() => {
				this.throttledAddEvent({
					type: EventType.Custom,
					timestamp: breadcrumb.timestamp || 0,
					data: {
						tag: "breadcrumb",
						payload: breadcrumb
					}
				});
			});
		}
		/**
		* Observed performance events are added to `this.performanceEntries`. These
		* are included in the replay event before it is finished and sent to Sentry.
		*/
		_addPerformanceEntries() {
			let performanceEntries = createPerformanceEntries(this.performanceEntries).concat(this.replayPerformanceEntries);
			this.performanceEntries = [];
			this.replayPerformanceEntries = [];
			if (this._requiresManualStart) {
				const initialTimestampInSeconds = this._context.initialTimestamp / 1e3;
				performanceEntries = performanceEntries.filter((entry) => entry.start >= initialTimestampInSeconds);
			}
			return Promise.all(createPerformanceSpans(this, performanceEntries));
		}
		/**
		* Clear _context
		*/
		_clearContext() {
			this._context.errorIds.clear();
			this._context.traceIds.clear();
			this._context.segmentNames.clear();
			this._context.urls = [];
		}
		/** Update the initial timestamp based on the buffer content. */
		_updateInitialTimestampFromEventBuffer() {
			const { session, eventBuffer } = this;
			if (!session || !eventBuffer || this._requiresManualStart) return;
			if (session.segmentId) return;
			const earliestEvent = eventBuffer.getEarliestTimestamp();
			if (earliestEvent && earliestEvent < this._context.initialTimestamp) this._context.initialTimestamp = earliestEvent;
		}
		/**
		* Return and clear _context
		*/
		_popEventContext() {
			const _context = {
				initialTimestamp: this._context.initialTimestamp,
				initialUrl: this._context.initialUrl,
				errorIds: Array.from(this._context.errorIds),
				traceIds: Array.from(this._context.traceIds),
				segmentNames: Array.from(this._context.segmentNames),
				urls: this._context.urls
			};
			this._clearContext();
			return _context;
		}
		/**
		* Flushes replay event buffer to Sentry.
		*
		* Performance events are only added right before flushing - this is
		* due to the buffered performance observer events.
		*
		* Should never be called directly, only by `flush`
		*/
		async _runFlush() {
			const replayId = this.getSessionId();
			if (!this.session || !this.eventBuffer || !replayId) {
				debug.error("No session or eventBuffer found to flush.");
				return;
			}
			await this._addPerformanceEntries();
			if (!this.eventBuffer?.hasEvents) return;
			await addMemoryEntry(this);
			if (!this.eventBuffer) return;
			if (replayId !== this.getSessionId()) return;
			try {
				this._updateInitialTimestampFromEventBuffer();
				const timestamp = Date.now();
				if (timestamp - this._context.initialTimestamp > this._options.maxReplayDuration + 3e4) throw new ReplayDurationLimitError();
				const eventContext = this._popEventContext();
				const segmentId = this.session.segmentId++;
				this._maybeSaveSession();
				await sendReplay({
					replayId,
					recordingData: await this.eventBuffer.finish(),
					segmentId,
					eventContext,
					session: this.session,
					timestamp,
					onError: (err) => this.handleException(err)
				});
			} catch (err) {
				this.handleException(err);
				this.stop({ reason: "sendError" });
				const client = getClient();
				if (client) {
					let dropReason;
					if (err instanceof RateLimitError) dropReason = "ratelimit_backoff";
					else if (err instanceof ReplayDurationLimitError) dropReason = "invalid";
					else dropReason = "send_error";
					client.recordDroppedEvent(dropReason, "replay");
				}
			}
		}
		/**
		* Flush recording data to Sentry. Creates a lock so that only a single flush
		* can be active at a time. Do not call this directly.
		*/
		async _flush({ force = false } = {}) {
			if (!this._isEnabled && !force) return;
			if (!this.checkAndHandleExpiredSession()) {
				debug.error("Attempting to finish replay event after session expired.");
				return;
			}
			if (!this.session) return;
			const start = this.session.started;
			const duration = Date.now() - start;
			this._debouncedFlush.cancel();
			const tooShort = duration < this._options.minReplayDuration;
			const tooLong = duration > this._options.maxReplayDuration + 5e3;
			if (tooShort || tooLong) {
				debug.log(`Session duration (${Math.floor(duration / 1e3)}s) is too ${tooShort ? "short" : "long"}, not sending replay.`);
				if (tooShort) this._debouncedFlush();
				return;
			}
			const eventBuffer = this.eventBuffer;
			if (eventBuffer && this.session.segmentId === 0 && !eventBuffer.hasCheckout) debug.log("Flushing initial segment without checkout.");
			const _flushInProgress = !!this._flushLock;
			if (!this._flushLock) this._flushLock = this._runFlush();
			try {
				await this._flushLock;
			} catch (err) {
				this.handleException(err);
			} finally {
				this._flushLock = void 0;
				if (_flushInProgress) this._debouncedFlush();
			}
		}
		/** Save the session, if it is sticky */
		_maybeSaveSession() {
			if (this.session && this._options.stickySession) saveSession(this.session);
		}
		/** Handler for rrweb.record.onMutation */
		_onMutationHandler(mutations) {
			const { ignoreMutations } = this._options._experiments;
			if (ignoreMutations?.length) {
				if (mutations.some((mutation) => {
					const el = closestElementOfNode(mutation.target);
					const selector = ignoreMutations.join(",");
					return el?.matches(selector);
				})) return false;
			}
			const count = mutations.length;
			const mutationLimit = this._options.mutationLimit;
			const mutationBreadcrumbLimit = this._options.mutationBreadcrumbLimit;
			const overMutationLimit = mutationLimit && count > mutationLimit;
			if (count > mutationBreadcrumbLimit || overMutationLimit) {
				const breadcrumb = createBreadcrumb({
					category: "replay.mutations",
					data: {
						count,
						limit: overMutationLimit
					}
				});
				this._createCustomBreadcrumb(breadcrumb);
			}
			if (overMutationLimit) {
				this.stop({
					reason: "mutationLimit",
					forceFlush: this.recordingMode === "session"
				});
				return false;
			}
			return true;
		}
	};
	// src/util/getPrivacyOptions.ts
	function getOption(selectors, defaultSelectors) {
		return [...selectors, ...defaultSelectors].join(",");
	}
	/**
	* Returns privacy related configuration for use in rrweb
	*/
	function getPrivacyOptions({ mask, unmask, block, unblock, ignore }) {
		return {
			maskTextSelector: getOption(mask, [".sentry-mask", "[data-sentry-mask]"]),
			unmaskTextSelector: getOption(unmask, []),
			blockSelector: getOption(block, [
				".sentry-block",
				"[data-sentry-block]",
				...["base", "iframe[srcdoc]:not([src])"]
			]),
			unblockSelector: getOption(unblock, []),
			ignoreSelector: getOption(ignore, [
				".sentry-ignore",
				"[data-sentry-ignore]",
				"input[type=\"file\"]"
			])
		};
	}
	// src/util/maskAttribute.ts
	/**
	* Masks an attribute if necessary, otherwise return attribute value as-is.
	* Keys listed in `maskAttributes` are masked even when `maskAllText` is false;
	* masking `value` on submit/button inputs without listing `value` still requires `maskAllText`.
	*/
	function maskAttribute({ el, key, maskAttributes, maskAllText, privacyOptions, value }) {
		if (privacyOptions.unmaskTextSelector && el.matches(privacyOptions.unmaskTextSelector)) return value;
		const masksNamedAttribute = maskAttributes.includes(key);
		const masksSubmitButtonValue = maskAllText && key === "value" && el.tagName === "INPUT" && ["submit", "button"].includes(el.getAttribute("type") || "");
		if (masksNamedAttribute || masksSubmitButtonValue) return value.replace(/[\S]/g, "*");
		return value;
	}
	// src/integration.ts
	const MEDIA_SELECTORS = "img,image,svg,video,object,picture,embed,map,audio,link[rel=\"icon\"],link[rel=\"apple-touch-icon\"]";
	const DEFAULT_NETWORK_HEADERS = [
		"content-length",
		"content-type",
		"accept"
	];
	const ORIGINAL_BODY = Symbol.for("sentry__originalRequestBody");
	let _initialized = false;
	let _isRequestInstrumented = false;
	/**
	* Instruments the global Request constructor to store the original body.
	* This allows us to retrieve the original body value later, since Request
	* converts string bodies to ReadableStreams.
	*/
	function _INTERNAL_instrumentRequestInterface() {
		if (typeof Request === "undefined" || _isRequestInstrumented) return;
		const OriginalRequest = Request;
		try {
			const SentryRequest = function(input, init) {
				const request = new OriginalRequest(input, init);
				if (init?.body != null) request[ORIGINAL_BODY] = init.body;
				return request;
			};
			SentryRequest.prototype = OriginalRequest.prototype;
			GLOBAL_OBJ.Request = SentryRequest;
			_isRequestInstrumented = true;
		} catch {}
	}
	/**
	* Sentry integration for [Session Replay](https://sentry.io/for/session-replay/).
	*
	* See the [Replay documentation](https://docs.sentry.io/platforms/javascript/guides/session-replay/) for more information.
	*
	* @example
	*
	* ```
	* Sentry.init({
	*   dsn: '__DSN__',
	*   integrations: [Sentry.replayIntegration()],
	* });
	* ```
	*/
	const replayIntegration = ((options) => {
		return new Replay(options);
	});
	/**
	* Replay integration
	*/
	var Replay = class {
		constructor({ flushMinDelay = DEFAULT_FLUSH_MIN_DELAY, flushMaxDelay = DEFAULT_FLUSH_MAX_DELAY, minReplayDuration = MIN_REPLAY_DURATION, maxReplayDuration = MAX_REPLAY_DURATION, stickySession = true, useCompression = true, workerUrl, _experiments = {}, maskAllText = true, maskAllInputs = true, blockAllMedia = true, mutationBreadcrumbLimit = 750, mutationLimit = 1e4, slowClickTimeout = 7e3, slowClickIgnoreSelectors = [], networkDetailAllowUrls = [], networkDetailDenyUrls = [], networkCaptureBodies = true, networkRequestHeaders = [], networkResponseHeaders = [], mask = [], maskAttributes = [
			"title",
			"placeholder",
			"aria-label"
		], unmask = [], block = [], unblock = [], ignore = [], maskFn, beforeAddRecordingEvent, beforeErrorSampling, onError, attachRawBodyFromRequest = false } = {}) {
			this.name = "Replay";
			const privacyOptions = getPrivacyOptions({
				mask,
				unmask,
				block,
				unblock,
				ignore
			});
			this._recordingOptions = {
				maskAllInputs,
				maskAllText,
				maskInputOptions: { password: true },
				maskTextFn: maskFn,
				maskInputFn: maskFn,
				maskAttributeFn: (key, value, el) => maskAttribute({
					maskAttributes,
					maskAllText,
					privacyOptions,
					key,
					value,
					el
				}),
				...privacyOptions,
				slimDOMOptions: "all",
				inlineStylesheet: true,
				inlineImages: false,
				collectFonts: true,
				errorHandler: (err) => {
					try {
						err.__rrweb__ = true;
					} catch {}
				},
				recordCrossOriginIframes: Boolean(_experiments.recordCrossOriginIframes)
			};
			this._initialOptions = {
				flushMinDelay,
				flushMaxDelay,
				minReplayDuration: Math.min(minReplayDuration, MIN_REPLAY_DURATION_LIMIT),
				maxReplayDuration: Math.min(maxReplayDuration, MAX_REPLAY_DURATION),
				stickySession,
				useCompression,
				workerUrl,
				blockAllMedia,
				maskAllInputs,
				maskAllText,
				mutationBreadcrumbLimit,
				mutationLimit,
				slowClickTimeout,
				slowClickIgnoreSelectors,
				networkDetailAllowUrls,
				networkDetailDenyUrls,
				networkCaptureBodies,
				networkRequestHeaders: _getMergedNetworkHeaders(networkRequestHeaders),
				networkResponseHeaders: _getMergedNetworkHeaders(networkResponseHeaders),
				beforeAddRecordingEvent,
				beforeErrorSampling,
				onError,
				attachRawBodyFromRequest,
				_experiments
			};
			if (this._initialOptions.blockAllMedia) {
				this._recordingOptions.blockSelector = !this._recordingOptions.blockSelector ? MEDIA_SELECTORS : `${this._recordingOptions.blockSelector},${MEDIA_SELECTORS}`;
				this._recordingOptions.ignoreCSSAttributes = /* @__PURE__ */ new Set(["background-image"]);
			}
			if (this._isInitialized && isBrowser()) throw new Error("Multiple Sentry Session Replay instances are not supported");
			this._isInitialized = true;
		}
		/** If replay has already been initialized */
		get _isInitialized() {
			return _initialized;
		}
		/** Update _isInitialized */
		set _isInitialized(value) {
			_initialized = value;
		}
		/**
		* Setup and initialize replay container
		*/
		afterAllSetup(client) {
			if (!isBrowser() || this._replay) return;
			if (this._initialOptions.attachRawBodyFromRequest) _INTERNAL_instrumentRequestInterface();
			this._setup(client);
			this._initialize(client);
		}
		/**
		* Start a replay regardless of sampling rate. Calling this will always
		* create a new session. Will log a message if replay is already in progress.
		*
		* Creates or loads a session, attaches listeners to varying events (DOM,
		* PerformanceObserver, Recording, Sentry SDK, etc)
		*/
		start() {
			if (!this._replay) return;
			this._replay.start();
		}
		/**
		* Start replay buffering. Buffers until `flush()` is called or, if
		* `replaysOnErrorSampleRate` > 0, until an error occurs.
		*/
		startBuffering() {
			if (!this._replay) return;
			this._replay.startBuffering();
		}
		/**
		* Currently, this needs to be manually called (e.g. for tests). Sentry SDK
		* does not support a teardown
		*
		* @param options.flush - Whether to flush the pending replay segment when stopping.
		* When recording in `session` mode, `stop()` flushes the buffered-but-unsent segment by
		* default (`flush: true`), matching the previous behavior. Pass `flush: false` to stop
		* recording without sending that pending segment — useful when a user withdraws consent
		* and no further data should leave the browser.
		*
		* Note: `flush: false` only prevents the *pending* (final) segment from being sent. It does
		* **not** retract segments that were already sent earlier during `session` recording.
		*/
		stop(options) {
			if (!this._replay) return Promise.resolve();
			return this._replay.stop({
				forceFlush: options?.flush ?? this._replay.recordingMode === "session",
				reason: "manual"
			});
		}
		/**
		* If not in "session" recording mode, flush event buffer which will create a new replay.
		* If replay is not enabled, a new session replay is started.
		* Unless `continueRecording` is false, the replay will continue to record and
		* behave as a "session"-based replay.
		*
		* Otherwise, queue up a flush.
		*/
		flush(options) {
			if (!this._replay) return Promise.resolve();
			if (!this._replay.isEnabled()) {
				this._replay.start();
				return Promise.resolve();
			}
			return this._replay.sendBufferedReplayOrFlush(options);
		}
		/**
		* Get the current session ID.
		*
		* @param onlyIfSampled - If true, will only return the session ID if the session is sampled.
		*
		*/
		getReplayId(onlyIfSampled) {
			if (!this._replay?.isEnabled()) return;
			return this._replay.getSessionId(onlyIfSampled);
		}
		/**
		* Get the current recording mode. This can be either `session` or `buffer`.
		*
		* `session`: Recording the whole session, sending it continuously
		* `buffer`: Always keeping the last 60s of recording, requires:
		*   - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
		*   - or calling `flush()` to send the replay
		*/
		getRecordingMode() {
			if (!this._replay?.isEnabled()) return;
			return this._replay.recordingMode;
		}
		processSpan(span) {
			const replayId = this.getReplayId(true);
			if (replayId) {
				safeSetSpanJSONAttributes(span, { [Ob]: replayId });
				if (this.getRecordingMode() === "buffer") safeSetSpanJSONAttributes(span, { "sentry._internal.replay_is_buffering": true });
			}
		}
		/**
		* Initializes replay.
		*/
		_initialize(client) {
			if (!this._replay) return;
			this._maybeLoadFromReplayCanvasIntegration(client);
			this._replay.initializeSampling();
		}
		/** Setup the integration. */
		_setup(client) {
			const finalOptions = loadReplayOptionsFromClient(this._initialOptions, client);
			this._replay = new ReplayContainer({
				options: finalOptions,
				recordingOptions: this._recordingOptions
			});
		}
		/** Get canvas options from ReplayCanvas integration, if it is also added. */
		_maybeLoadFromReplayCanvasIntegration(client) {
			try {
				const canvasIntegration = client.getIntegrationByName("ReplayCanvas");
				if (!canvasIntegration) return;
				this._replay["_canvas"] = canvasIntegration.getOptions();
			} catch {}
		}
	};
	/** Parse Replay-related options from SDK options */
	function loadReplayOptionsFromClient(initialOptions, client) {
		const opt = client.getOptions();
		const finalOptions = {
			sessionSampleRate: 0,
			errorSampleRate: 0,
			...initialOptions
		};
		const replaysSessionSampleRate = parseSampleRate(opt.replaysSessionSampleRate);
		const replaysOnErrorSampleRate = parseSampleRate(opt.replaysOnErrorSampleRate);
		if (replaysSessionSampleRate == null && replaysOnErrorSampleRate == null) consoleSandbox(() => {
			console.warn("Replay is disabled because neither `replaysSessionSampleRate` nor `replaysOnErrorSampleRate` are set.");
		});
		if (replaysSessionSampleRate != null) finalOptions.sessionSampleRate = replaysSessionSampleRate;
		if (replaysOnErrorSampleRate != null) finalOptions.errorSampleRate = replaysOnErrorSampleRate;
		return finalOptions;
	}
	function _getMergedNetworkHeaders(headers) {
		return [...DEFAULT_NETWORK_HEADERS, ...headers.map((header) => header.toLowerCase())];
	}
	// src/util/getReplay.ts
	/**
	* This is a small utility to get a type-safe instance of the Replay integration.
	*/
	function getReplay() {
		return getClient()?.getIntegrationByName("Replay");
	}
	exports.getReplay = getReplay;
	exports.replayIntegration = replayIntegration;
	// Add this module's exports to the global `Sentry.Integrations`
	__window.Sentry = __window.Sentry || {};
	__window.Sentry.Integrations = __window.Sentry.Integrations || {};
	for (var key in exports) if (Object.prototype.hasOwnProperty.call(exports, key)) {
		__window.Sentry.Integrations[key] = exports[key];
		__window.Sentry[key] = exports[key];
	}
})(window);

//# sourceMappingURL=replay.js.map