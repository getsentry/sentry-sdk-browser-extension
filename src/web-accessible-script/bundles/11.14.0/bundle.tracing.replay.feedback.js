/*! @sentry/browser (Performance Monitoring, Replay, and Feedback) 11.14.0 (ff1ae8a) | https://github.com/getsentry/sentry-javascript */
var Sentry = (function(exports) {
	exports = window.Sentry || {};
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	// ../core/build/esm/utils/worldwide.js
	/** Get's the global object for the current JavaScript runtime */
	const GLOBAL_OBJ = globalThis;
	// ../core/build/esm/utils/version.js
	const SDK_VERSION = "11.14.0";
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
		__SENTRY__.version = __SENTRY__.version || "11.14.0";
		return __SENTRY__[SDK_VERSION] = __SENTRY__["11.14.0"] || {};
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
		const carrier = __SENTRY__[SDK_VERSION] = __SENTRY__["11.14.0"] || {};
		return carrier[name] || (carrier[name] = creator());
	}
	// ../core/build/esm/utils/debug-logger.js
	const CONSOLE_LEVELS$1 = [
		"debug",
		"info",
		"warn",
		"error",
		"log",
		"assert",
		"trace"
	];
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
	function isEnabled$1() {
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
		if (isEnabled$1()) consoleSandbox(() => {
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
		isEnabled: isEnabled$1,
		/** Log a message. */
		log,
		/** Log a warning. */
		warn,
		/** Log an error. */
		error
	};
	// ../core/build/esm/utils/stacktrace.js
	const STACKTRACE_FRAME_LIMIT = 50;
	const WEBPACK_ERROR_REGEXP = /\(error: (.*)\)/;
	const STRIP_FRAME_REGEXP = /captureMessage|captureException/;
	/**
	* Creates a stack parser with the supplied line parsers
	*
	* StackFrames are returned in the correct order for Sentry Exception
	* frames and with Sentry SDK internal frames removed from the top and bottom
	*
	*/
	function createStackParser(...parsers) {
		const sortedParsers = parsers.sort((a, b) => a[0] - b[0]).map((p) => p[1]);
		return (stack, skipFirstLines = 0, framesToPop = 0) => {
			const frames = [];
			const lines = stack.split("\n");
			for (let i = skipFirstLines; i < lines.length; i++) {
				let line = lines[i];
				if (line.length > 1024) line = line.slice(0, 1024);
				const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, "$1") : line;
				if (cleanedLine.includes("Error: ")) continue;
				for (const parser of sortedParsers) {
					const frame = parser(cleanedLine);
					if (frame) {
						frames.push(frame);
						break;
					}
				}
				if (frames.length >= STACKTRACE_FRAME_LIMIT + framesToPop) break;
			}
			return stripSentryFramesAndReverse(frames.slice(framesToPop));
		};
	}
	/**
	* Gets a stack parser implementation from Options.stackParser
	* @see Options
	*
	* If options contains an array of line parsers, it is converted into a parser
	*/
	function stackParserFromStackParserOptions(stackParser) {
		if (Array.isArray(stackParser)) return createStackParser(...stackParser);
		return stackParser;
	}
	/**
	* Removes Sentry frames from the top and bottom of the stack if present and enforces a limit of max number of frames.
	* Assumes stack input is ordered from top to bottom and returns the reverse representation so call site of the
	* function that caused the crash is the last frame in the array.
	* @hidden
	*/
	function stripSentryFramesAndReverse(stack) {
		if (!stack.length) return [];
		const localStack = Array.from(stack);
		if (/sentryWrapped/.test(getLastStackFrame(localStack).function || "")) localStack.pop();
		localStack.reverse();
		if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || "")) {
			localStack.pop();
			if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || "")) localStack.pop();
		}
		return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map((frame) => ({
			...frame,
			filename: frame.filename || getLastStackFrame(localStack).filename,
			function: frame.function || "?"
		}));
	}
	function getLastStackFrame(arr) {
		return arr[arr.length - 1] || {};
	}
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
	/**
	* Get's stack frames from an event without needing to check for undefined properties.
	*/
	function getFramesFromEvent(event) {
		const exception = event.exception;
		if (exception) {
			const frames = [];
			try {
				exception.values.forEach((value) => {
					if (value.stacktrace.frames) frames.push(...value.stacktrace.frames);
				});
				return frames;
			} catch {
				return;
			}
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
	// ../core/build/esm/instrument/globalError.js
	let _oldOnErrorHandler = null;
	/**
	* Add an instrumentation handler for when an error is captured by the global error handler.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addGlobalErrorInstrumentationHandler(handler) {
		const type = "error";
		addHandler$1(type, handler);
		maybeInstrument(type, instrumentError);
	}
	function instrumentError() {
		_oldOnErrorHandler = GLOBAL_OBJ.onerror;
		GLOBAL_OBJ.onerror = function(msg, url, line, column, error) {
			triggerHandlers$1("error", {
				column,
				error,
				line,
				msg,
				url
			});
			if (_oldOnErrorHandler) return _oldOnErrorHandler.apply(this, arguments);
			return false;
		};
		GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
	}
	// ../core/build/esm/instrument/globalUnhandledRejection.js
	let _oldOnUnhandledRejectionHandler = null;
	/**
	* Add an instrumentation handler for when an unhandled promise rejection is captured.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addGlobalUnhandledRejectionInstrumentationHandler(handler) {
		const type = "unhandledrejection";
		addHandler$1(type, handler);
		maybeInstrument(type, instrumentUnhandledRejection);
	}
	function instrumentUnhandledRejection() {
		_oldOnUnhandledRejectionHandler = GLOBAL_OBJ.onunhandledrejection;
		GLOBAL_OBJ.onunhandledrejection = function(e) {
			triggerHandlers$1("unhandledrejection", e);
			if (_oldOnUnhandledRejectionHandler) return _oldOnUnhandledRejectionHandler.apply(this, arguments);
			return true;
		};
		GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
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
	* Checks whether given value's type is ErrorEvent
	* {@link isErrorEvent}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isErrorEvent$2(wat) {
		return isBuiltin(wat, "ErrorEvent");
	}
	/**
	* Checks whether given value's type is DOMError
	* {@link isDOMError}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isDOMError(wat) {
		return isBuiltin(wat, "DOMError");
	}
	/**
	* Checks whether given value's type is DOMException
	* {@link isDOMException}.
	*
	* @param wat A value to be checked.
	* @returns A boolean representing the result.
	*/
	function isDOMException(wat) {
		return isBuiltin(wat, "DOMException");
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
	/**
	* Checks whether the given parameter is a Standard Web API Request instance.
	*
	* Returns false if Request is not available in the current runtime.
	*/
	function isRequest(request) {
		return typeof Request !== "undefined" && isInstanceOf(request, Request);
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
	* This extracts the original function if available.  See
	* `markFunctionWrapped` for more information.
	*
	* @param func the function to unwrap
	* @returns the unwrapped version of the function if available.
	*/
	function getOriginalFunction(func) {
		return func.__sentry_original__;
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
	/**
	* Given any captured exception, extract its keys and create a sorted
	* and truncated list that will be used inside the event message.
	* eg. `Non-error exception captured with keys: foo, bar, baz`
	*/
	function extractExceptionKeysForMessage(exception) {
		const keys = Object.keys(convertToPlainObject(exception));
		keys.sort();
		return !keys[0] ? "[object has no keys]" : keys.join(", ");
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
	// ../core/build/esm/utils/normalize.js
	let stringifier;
	/**
	* Set a custom stringifier for the normalize function.
	* If this returns a non-empty string, it will be used instead of the default stringification.
	* Return undefined to fall back to the generic behavior.
	*/
	function setNormalizeStringifier(newStringifier) {
		stringifier = newStringifier;
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
	/** JSDoc */
	function normalizeToSize(object, depth = 3, maxSize = 102400) {
		const normalized = normalize(object, depth);
		if (jsonSize(normalized) > maxSize) return normalizeToSize(object, depth - 1, maxSize);
		return normalized;
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
			if (stringifier) {
				const stringified = stringifier(value);
				if (stringified) return stringified;
			}
			if (typeof global !== "undefined" && value === global) return "[Global]";
			if (typeof value === "number" && !Number.isFinite(value)) return `[${value}]`;
			if (typeof value === "function") return `[Function: ${getFunctionName(value)}]`;
			if (typeof value === "symbol") return `[${String(value)}]`;
			if (typeof value === "bigint") return `[BigInt: ${String(value)}]`;
			return `[object ${getConstructorName$1(value)}]`;
		} catch (err) {
			return `**non-serializable** (${stringifyCaughtValue(err)})`;
		}
	}
	function getConstructorName$1(value) {
		const prototype = Object.getPrototypeOf(value);
		return prototype?.constructor ? prototype.constructor.name : "null prototype";
	}
	/** Calculates bytes size of input string */
	function utf8Length(value) {
		return ~-encodeURI(value).split(/%..|./).length;
	}
	/** Calculates bytes size of input object */
	function jsonSize(value) {
		return utf8Length(JSON.stringify(value));
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
	* Coerce a value to a string without ever throwing. Strings pass through unchanged (so an
	* already-serialized value isn't double-encoded and a plain string isn't wrapped in quotes);
	* anything else is `JSON.stringify`-ed, falling back to `fallback` if that throws (e.g. on
	* circular references or `BigInt`). Returns `undefined` for values `JSON.stringify` itself drops
	* (top-level `undefined`, functions, symbols), matching `JSON.stringify`'s own runtime behavior.
	*
	* @param value the value to stringify
	* @param fallback returned when serialization throws, or, if a function, called with `value` to
	*   produce the fallback. Defaults to `'[unserializable]'`.
	*/
	function stringify(value, fallback = "[unserializable]") {
		if (typeof value === "string") return value;
		try {
			return JSON.stringify(value);
		} catch {
			return typeof fallback === "function" ? fallback(value) : fallback;
		}
	}
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
	* Join values in array
	* @param input array of values to be joined together
	* @param delimiter string to be placed in-between values
	* @returns Joined values
	*/
	function safeJoin(input, delimiter) {
		if (!Array.isArray(input)) return "";
		const output = [];
		for (let i = 0; i < input.length; i++) {
			const value = input[i];
			if (isPrimitive(value)) output.push(String(value));
			else if (value instanceof Error) output.push(value.message ? `${value.name}: ${value.message}` : value.name);
			else output.push(stringifyValue(void 0, value));
		}
		return output.join(delimiter);
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
	function getFirstException(event) {
		return event.exception?.values?.[0];
	}
	/**
	* Extracts either message or type+value from an event that can be used for user-facing logs
	* @returns event's description
	*/
	function getEventDescription(event) {
		const { message, event_id: eventId } = event;
		if (message) return message;
		const firstException = getFirstException(event);
		if (firstException) {
			if (firstException.type && firstException.value) return `${firstException.type}: ${firstException.value}`;
			return firstException.type || firstException.value || eventId || "<unknown>";
		}
		return eventId || "<unknown>";
	}
	/**
	* Adds exception values, type and value to an synthetic Exception.
	* @param event The event to modify.
	* @param value Value of the exception.
	* @param type Type of the exception.
	* @hidden
	*/
	function addExceptionTypeValue(event, value, type) {
		const exception = event.exception = event.exception || {};
		const values = exception.values = exception.values || [];
		const firstException = values[0] = values[0] || {};
		if (!firstException.value) firstException.value = value || "";
		if (!firstException.type) firstException.type = type || "Error";
	}
	/**
	* Adds exception mechanism data to a given event. Uses defaults if the second parameter is not passed.
	*
	* @param event The event to modify.
	* @param newMechanism Mechanism data to add to the event.
	* @hidden
	*/
	function addExceptionMechanism(event, newMechanism) {
		const firstException = getFirstException(event);
		if (!firstException) return;
		applyExceptionMechanism(firstException, newMechanism);
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
	/**
	* Checks whether or not we've already captured the given exception (note: not an identical exception - the very object
	* in question), and marks it captured if not.
	*
	* This is useful because it's possible for an error to get captured by more than one mechanism. After we intercept and
	* record an error, we rethrow it (assuming we've intercepted it before it's reached the top-level global handlers), so
	* that we don't interfere with whatever effects the error might have had were the SDK not there. At that point, because
	* the error has been rethrown, it's possible for it to bubble up to some other code we've instrumented. If it's not
	* caught after that, it will bubble all the way up to the global handlers (which of course we also instrument). This
	* function helps us ensure that even if we encounter the same error more than once, we only record it the first time we
	* see it.
	*
	* The client runs this check for every captured exception, also when `dedupeIntegration` is not active.
	* `dedupeIntegration` drops equal events that come from different error objects.
	*
	* Note: It will ignore primitives (always return `false` and not mark them as seen), as properties can't be set on
	* them. {@link: Object.objectify} can be used on exceptions to convert any that are primitives into their equivalent
	* object wrapper forms so that this check will always work. However, because we need to flag the exact object which
	* will get rethrown, and because that rethrowing happens outside of the event processing pipeline, the objectification
	* must be done before the exception captured.
	*
	* @param A thrown exception to check or flag as having been seen
	* @returns `true` if the exception has already been captured, `false` if not (with the side effect of marking it seen)
	*/
	function checkOrSetAlreadyCaught(exception) {
		if (isAlreadyCaptured(exception)) return true;
		try {
			addNonEnumerableProperty(exception, "__sentry_captured__", true);
		} catch {}
		return false;
	}
	/**
	* Checks whether we've already captured the given exception (note: not an identical exception - the very object).
	* It is considered already captured if it has the `__sentry_captured__` property set to `true`.
	*
	* @internal Only considered for internal usage
	*/
	function isAlreadyCaptured(exception) {
		try {
			return exception.__sentry_captured__;
		} catch {}
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
	/**
	* Returns `performance.now()` in milliseconds, or `undefined` if the Performance API is unavailable.
	*/
	function safePerformanceNow() {
		const { performance } = GLOBAL_OBJ;
		return performance?.now ? withRandomSafeContext(() => performance.now()) : void 0;
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
	* Creates a new `Session` object by setting certain default parameters. If optional @param context
	* is passed, the passed properties are applied to the session object.
	*
	* @param context (optional) additional properties to be applied to the returned session object
	*
	* @returns a new `Session` object
	*/
	function makeSession$1(context) {
		const startingTime = timestampInSeconds();
		const session = {
			sid: uuid4(),
			init: true,
			timestamp: startingTime,
			started: startingTime,
			duration: 0,
			status: "ok",
			errors: 0,
			ignoreDuration: false,
			toJSON: () => sessionToJSON(session)
		};
		if (context) updateSession(session, context);
		return session;
	}
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
	/**
	* Closes a session by setting its status and updating the session object with it.
	* Internally calls `updateSession` to update the passed session object.
	*
	* Note that this function mutates the passed session (@see updateSession for explanation).
	*
	* @param session the `Session` object to be closed
	* @param status the `SessionStatus` with which the session was closed. If you don't pass a status,
	*               this function will keep the previously set status, unless it was `'ok'` in which case
	*               it is changed to `'exited'`.
	*/
	function closeSession(session, status) {
		let context = {};
		if (status) context = { status };
		else if (session.status === "ok") context = { status: "exited" };
		updateSession(session, context);
	}
	/**
	* Serializes a passed session object to a JSON object with a slightly different structure.
	* This is necessary because the Sentry backend requires a slightly different schema of a session
	* than the one the JS SDKs use internally.
	*
	* @param session the session to be converted
	*
	* @returns a JSON object of the passed session
	*/
	function sessionToJSON(session) {
		return {
			sid: `${session.sid}`,
			init: session.init,
			started: (/* @__PURE__ */ new Date(session.started * 1e3)).toISOString(),
			timestamp: (/* @__PURE__ */ new Date(session.timestamp * 1e3)).toISOString(),
			status: session.status,
			errors: session.errors,
			did: typeof session.did === "number" || typeof session.did === "string" ? `${session.did}` : void 0,
			duration: session.duration,
			abnormal_mechanism: session.abnormal_mechanism,
			attrs: {
				release: session.release,
				environment: session.environment,
				ip_address: session.ipAddress,
				user_agent: session.userAgent
			}
		};
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
	function withScope$1(callback) {
		return getAsyncContextStack().withScope(callback);
	}
	function withSetScope(scope, callback) {
		const stack = getAsyncContextStack();
		return stack.withScope(() => {
			stack.getStackTop().scope = scope;
			return callback(scope);
		});
	}
	function withIsolationScope$1(callback) {
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
			withIsolationScope: withIsolationScope$1,
			withScope: withScope$1,
			withSetScope,
			withSetIsolationScope: (_isolationScope, callback) => {
				return withIsolationScope$1(callback);
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
		return withScope$1((scope) => {
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
	// ../core/build/esm/attributes.js
	/**
	* Type-guard: The attribute object has the shape the official attribute object (value, type, unit).
	* https://develop.sentry.dev/sdk/telemetry/scopes/#setting-attributes
	*/
	function isAttributeObject(maybeObj) {
		return typeof maybeObj === "object" && maybeObj != null && !Array.isArray(maybeObj) && Object.keys(maybeObj).includes("value");
	}
	/**
	* Converts an attribute value to a typed attribute value.
	*
	* For now, we support primitive values and arrays, either raw or inside attribute objects.
	* If @param useFallback is true, we stringify other non-primitive values to a string attribute
	* value. Otherwise we return `undefined` for unsupported values.
	*
	* @param value - The value of the passed attribute.
	* @param useFallback - If true, unsupported values will be stringified to a string attribute value.
	*                      Defaults to false. In this case, `undefined` is returned for unsupported values.
	* @returns The typed attribute.
	*/
	function attributeValueToTypedAttributeValue(rawValue, useFallback) {
		const { value, unit } = isAttributeObject(rawValue) ? rawValue : {
			value: rawValue,
			unit: void 0
		};
		const attributeValue = getTypedAttributeValue(value);
		const checkedUnit = unit && typeof unit === "string" ? { unit } : {};
		if (attributeValue) return {
			...attributeValue,
			...checkedUnit
		};
		if (!useFallback || useFallback === "skip-undefined" && value === void 0) return;
		let stringValue = "";
		try {
			stringValue = JSON.stringify(value) ?? "";
		} catch {}
		return {
			value: stringValue,
			type: "string",
			...checkedUnit
		};
	}
	/**
	* Serializes raw attributes to typed attributes as expected in our envelopes.
	*
	* @param attributes The raw attributes to serialize.
	* @param fallback   If true, unsupported values will be stringified to a string attribute value.
	*                   Defaults to false. In this case, `undefined` is returned for unsupported values.
	*
	* @returns The serialized attributes.
	*/
	function serializeAttributes(attributes, fallback = false) {
		const serializedAttributes = {};
		for (const [key, value] of Object.entries(attributes ?? {})) {
			const typedValue = attributeValueToTypedAttributeValue(value, fallback);
			if (typedValue) serializedAttributes[key] = typedValue;
		}
		return serializedAttributes;
	}
	/**
	* Estimates the serialized byte size of {@link Attributes},
	* with a couple of heuristics for performance.
	*/
	function estimateTypedAttributesSizeInBytes(attributes) {
		if (!attributes) return 0;
		let weight = 0;
		for (const [key, attr] of Object.entries(attributes)) {
			weight += key.length * 2;
			weight += attr.type.length * 2;
			weight += (attr.unit?.length ?? 0) * 2;
			const val = attr.value;
			if (Array.isArray(val)) weight += estimatePrimitiveSizeInBytes(val[0]) * val.length;
			else if (isPrimitive(val)) weight += estimatePrimitiveSizeInBytes(val);
			else weight += 100;
		}
		return weight;
	}
	function estimatePrimitiveSizeInBytes(value) {
		if (typeof value === "string") return value.length * 2;
		else if (typeof value === "boolean") return 4;
		else if (typeof value === "number") return 8;
		return 0;
	}
	/**
	* NOTE: We return typed attributes for primitives and arrays:
	*  - Relay currently only supports arrays consisting of primitive values. Attributes with non-conforming arrays are dropped by Relay, so runtime type validation in the SDK is unnecessary.
	*  - Objects are not supported yet and product support is still TBD.
	*/
	function getTypedAttributeValue(value) {
		if (Array.isArray(value)) return {
			value,
			type: "array"
		};
		const primitiveType = typeof value === "string" ? "string" : typeof value === "boolean" ? "boolean" : typeof value === "number" && !Number.isNaN(value) ? Number.isInteger(value) ? "integer" : "double" : null;
		if (primitiveType) return {
			value,
			type: primitiveType
		};
	}
	// ../core/build/esm/currentScopes.js
	/**
	* Get the external propagation context, if a provider has been registered.
	*/
	function getExternalPropagationContext() {
		return getSentryCarrier(getMainCarrier()).externalPropagationContextProvider?.();
	}
	/**
	* Check if an external propagation context provider has been registered.
	*/
	function hasExternalPropagationContext() {
		return getSentryCarrier(getMainCarrier()).externalPropagationContextProvider !== void 0;
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
	* Either creates a new active scope, or sets the given scope as active scope in the given callback.
	*/
	function withScope(...rest) {
		const acs = getAsyncContextStrategy(getMainCarrier());
		if (rest.length === 2) {
			const [scope, callback] = rest;
			if (!scope) return acs.withScope(callback);
			return acs.withSetScope(scope, callback);
		}
		return acs.withScope(rest[0]);
	}
	/**
	* Either creates a new active isolation scope, or sets the given isolation scope as active scope in the given callback.
	*/
	function withIsolationScope(...rest) {
		const acs = getAsyncContextStrategy(getMainCarrier());
		if (rest.length === 2) {
			const [isolationScope, callback] = rest;
			if (!isolationScope) return acs.withIsolationScope(callback);
			return acs.withSetIsolationScope(isolationScope, callback);
		}
		return acs.withIsolationScope(rest[0]);
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
	// ../core/build/esm/semanticAttributes.js
	/**
	* Attributes that holds the sample rate that was locally applied to a span.
	* If this attribute is not defined, it means that the span inherited a sampling decision.
	*
	* NOTE: Is only defined on root spans.
	*/
	const SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = "sentry.sample_rate";
	/**
	* Attribute holding the sample rate of the previous trace.
	* This is used to sample consistently across subsequent traces in the browser SDK.
	*
	* Note: Only defined on root spans, if opted into consistent sampling
	*/
	const SEMANTIC_ATTRIBUTE_SENTRY_PREVIOUS_TRACE_SAMPLE_RATE = "sentry.previous_trace_sample_rate";
	/**
	* Use this attribute to represent the operation of a span.
	* @deprecated Use `SENTRY_OP` from `@sentry/conventions/attributes` instead.
	*/
	const SEMANTIC_ATTRIBUTE_SENTRY_OP = "sentry.op";
	/**
	* Use this attribute to represent the origin of a span.
	* @deprecated Use `SENTRY_ORIGIN` from `@sentry/conventions/attributes` instead.
	*/
	const SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = "sentry.origin";
	/** The unit of a measurement, which may be stored as a TimedEvent. */
	const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT = "sentry.measurement_unit";
	/** The value of a measurement, which may be stored as a TimedEvent. */
	const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE = "sentry.measurement_value";
	/**
	* A custom span name set by users guaranteed to be taken over any automatically
	* inferred name. This attribute is removed before the span is sent.
	*
	* @internal only meant for internal SDK usage
	* @hidden
	*/
	const SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME = "sentry.custom_span_name";
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
	// ../../node_modules/.pnpm/@sentry+conventions@0.33.0/node_modules/@sentry/conventions/dist/attributes.mjs
	const Q$1 = "angular.version";
	const Zt = "browser.navigation.id";
	const $t = "browser.navigation.type";
	const ei = "browser.paint.type";
	const ti = "browser.performance.navigation.activation_start";
	const ii = "browser.performance.time_origin";
	const si = "browser.script.invoker";
	const ri = "browser.script.invoker_type";
	const ni = "browser.script.source_char_position";
	const vi = "browser.web_vital.lcp.element";
	const Ni = "browser.web_vital.ttfb.request_time";
	const fa = "code.file.path";
	const ka = "code.function.name";
	const Oa = "connectionType";
	const wa = "culture.calendar";
	const Ra = "culture.locale";
	const Na = "culture.timezone";
	const is = "deviceMemory";
	const Ts = "device.memory.estimated_capacity";
	const Rs = "device.processor_count";
	const js = "effectiveConnectionType";
	const Fr = "gen_ai.conversation.id";
	const Mo = "hardwareConcurrency";
	const tl = "http.request.connection_end";
	const il = "http.request.connect_start";
	const rl = "http.request.domain_lookup_end";
	const nl = "http.request.domain_lookup_start";
	const ll = "http.request.fetch_start";
	const ul = "http.request.method";
	const ml = "http.request.redirect_end";
	const bl = "http.request.redirect_start";
	const gl = "http.request.request_start";
	const _l = "http.request.response_end";
	const hl = "http.request.response_start";
	const fl = "http.request.same_origin";
	const vl = "http.request.secure_connection_start";
	const kl = "http.request.time_to_first_byte";
	const Sl = "http.request.worker_start";
	const Tl = "http.response.body.decoded_size";
	const El = "http.response.body.size";
	const Rl = "http.response.size";
	const Nl = "http.response.status_code";
	const op = "lcp.element";
	const lp = "lcp.id";
	const pp = "lcp.loadTime";
	const cp = "lcp.renderTime";
	const up = "lcp.size";
	const dp = "lcp.url";
	const Au = "network.connection.effective_type";
	const xu = "network.connection.rtt";
	const Ru = "network.connection.type";
	const Du = "network.protocol.name";
	const Lu = "network.protocol.version";
	const hd = "performance.activationStart";
	const fd = "performance.timeOrigin";
	const Wd = "react.version";
	const tm = "resource.render_blocking_status";
	const Im = "sentry.cancellation_reason";
	const Bm = "sentry.environment";
	const Wm = "sentry.exclusive_time";
	const Zm = "sentry.idle_span_finish_reason";
	const $m = "sentry.is_localhost";
	const ib = "sentry.link.type";
	const yb = "sentry.op";
	const _b = "sentry.origin";
	const hb = "sentry.pageload.span_id";
	const vb = "sentry.profiler_id";
	const kb = "sentry.profile_id";
	const Eb = "sentry.release";
	const Ob$1 = "sentry.replay_id";
	const Ab = "sentry.sdk.integrations";
	const xb = "sentry.sdk.name";
	const Rb = "sentry.sdk.version";
	const Nb = "sentry.segment.id";
	const Pb = "sentry.segment.name";
	const qb$1 = "sentry.segment.name.source";
	const Vb = "sentry.trace_lifecycle";
	const Qb = "sentry.transaction";
	const rg = "server.address";
	const lg = "server.port";
	const yg = "state.type";
	const Hg = "ui.component_name";
	const oy = "url.domain";
	const ly = "url.fragment";
	const py = "url.full";
	const cy = "url.path";
	const yy = "url.query";
	const hy = "url.scheme";
	const vy = "user_agent.original";
	const ky = "user.email";
	const xy = "user.id";
	const Ry = "user.ip_address";
	const Ny = "user.name";
	// ../core/build/esm/tracing/spanstatus.js
	function isStatusErrorMessageValid(message) {
		return message !== "ok" && SPAN_STATUS_TYPES.includes(message);
	}
	/**
	* Converts a HTTP status code into a sentry status with a message.
	*
	* @param httpStatus The HTTP response status code.
	* @returns The span status or internal_error.
	*/
	function getSpanStatusFromHttpCode(httpStatus) {
		if (httpStatus < 400 && httpStatus >= 100) return { code: 1 };
		if (httpStatus >= 400 && httpStatus < 500) switch (httpStatus) {
			case 401: return {
				code: 2,
				message: "unauthenticated"
			};
			case 403: return {
				code: 2,
				message: "permission_denied"
			};
			case 404: return {
				code: 2,
				message: "not_found"
			};
			case 409: return {
				code: 2,
				message: "already_exists"
			};
			case 413: return {
				code: 2,
				message: "failed_precondition"
			};
			case 429: return {
				code: 2,
				message: "resource_exhausted"
			};
			case 499: return {
				code: 2,
				message: "cancelled"
			};
			default: return {
				code: 2,
				message: "invalid_argument"
			};
		}
		if (httpStatus >= 500 && httpStatus < 600) switch (httpStatus) {
			case 501: return {
				code: 2,
				message: "unimplemented"
			};
			case 503: return {
				code: 2,
				message: "unavailable"
			};
			case 504: return {
				code: 2,
				message: "deadline_exceeded"
			};
			default: return {
				code: 2,
				message: "internal_error"
			};
		}
		return {
			code: 2,
			message: "internal_error"
		};
	}
	/**
	* Sets the Http status attributes on the current span based on the http code.
	* Additionally, the span's status is updated, depending on the http code.
	*/
	function setHttpStatus(span, httpStatus) {
		span.setAttribute(Nl, httpStatus);
		const spanStatus = getSpanStatusFromHttpCode(httpStatus);
		if (spanStatus.message !== "unknown_error") span.setStatus(spanStatus);
	}
	// ../core/build/esm/utils/weakRef.js
	/**
	* Creates a weak reference to an object if WeakRef is available,
	* otherwise returns the object directly.
	*
	* This is useful for breaking circular references while maintaining
	* compatibility with environments that don't support WeakRef (e.g., older browsers).
	*
	* @param value - The object to create a weak reference to
	* @returns A WeakRef wrapper if available, or the original object as fallback
	*/
	function makeWeakRef(value) {
		try {
			const WeakRefImpl = GLOBAL_OBJ.WeakRef;
			if (typeof WeakRefImpl === "function") return new WeakRefImpl(value);
		} catch {}
		return value;
	}
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
	const TRACER_PROVIDER_SPAN_FIELD = Symbol.for("sentry.tracerProviderSpan");
	/** Store the scope & isolation scope for a span, which can the be used when it is finished. */
	function setCapturedScopesOnSpan(span, scope, isolationScope) {
		if (span) {
			addNonEnumerableProperty(span, ISOLATION_SCOPE_ON_START_SPAN_FIELD, makeWeakRef(isolationScope));
			addNonEnumerableProperty(span, SCOPE_ON_START_SPAN_FIELD, scope);
		}
	}
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
	/** Whether a span was created by the `SentryTracerProvider` (see {@link markSpanAsTracerProviderSpan}). */
	function spanIsTracerProviderSpan(span) {
		return span[TRACER_PROVIDER_SPAN_FIELD] === true;
	}
	// ../core/build/esm/utils/baggage.js
	const SENTRY_BAGGAGE_KEY_PREFIX = "sentry-";
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
	* Turns a Dynamic Sampling Object into a baggage header by prefixing all the keys on the object with "sentry-".
	*
	* @param dynamicSamplingContext The Dynamic Sampling Context to turn into a header. For convenience and compatibility
	* with the `getDynamicSamplingContext` method on the Transaction class ,this argument can also be `undefined`. If it is
	* `undefined` the function will return `undefined`.
	* @returns a baggage header, created from `dynamicSamplingContext`, or `undefined` either if `dynamicSamplingContext`
	* was `undefined`, or if `dynamicSamplingContext` didn't contain any values.
	*/
	function dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext) {
		if (!dynamicSamplingContext) return;
		return objectToBaggageHeader(Object.entries(dynamicSamplingContext).reduce((acc, [dscKey, dscValue]) => {
			if (dscValue) acc[`${SENTRY_BAGGAGE_KEY_PREFIX}${dscKey}`] = dscValue;
			return acc;
		}, {}));
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
	/**
	* Turns a flat object (key-value pairs) into a baggage header, which is also just key-value pairs.
	*
	* @param object The object to turn into a baggage header.
	* @returns a baggage header string, or `undefined` if the object didn't have any values, since an empty baggage header
	* is not spec compliant.
	*/
	function objectToBaggageHeader(object) {
		if (Object.keys(object).length === 0) return;
		return Object.entries(object).reduce((baggageHeader, [objectKey, objectValue], currentIndex) => {
			const baggageEntry = `${encodeURIComponent(objectKey)}=${encodeURIComponent(objectValue)}`;
			const newBaggageHeader = currentIndex === 0 ? baggageEntry : `${baggageHeader},${baggageEntry}`;
			if (newBaggageHeader.length > 8192) {
				debug$1.warn(`Not adding key: ${objectKey} with val: ${objectValue} to baggage header due to exceeding baggage size limits.`);
				return baggageHeader;
			} else return newBaggageHeader;
		}, "");
	}
	// ../core/build/esm/utils/dsn.js
	/** Regular expression used to extract org ID from a DSN host. */
	const ORG_ID_REGEX = /^o(\d+)\./;
	/** Regular expression used to parse a Dsn. */
	const DSN_REGEX = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)((?:\[[:.%\w]+\]|[\w.-]+))(?::(\d+))?\/(.+)/;
	function isValidProtocol(protocol) {
		return protocol === "http" || protocol === "https";
	}
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
	* Parses a Dsn from a given string.
	*
	* @param str A Dsn as string
	* @returns Dsn as DsnComponents or undefined if @param str is not a valid DSN string
	*/
	function dsnFromString(str) {
		const match = DSN_REGEX.exec(str);
		if (!match) {
			consoleSandbox(() => {
				console.error(`Invalid Sentry Dsn: ${str}`);
			});
			return;
		}
		const [protocol, publicKey, pass = "", host = "", port = "", lastPath = ""] = match.slice(1);
		let path = "";
		let projectId = lastPath;
		const split = projectId.split("/");
		if (split.length > 1) {
			path = split.slice(0, -1).join("/");
			projectId = split.pop();
		}
		if (projectId) {
			const projectMatch = projectId.match(/^\d+/);
			if (projectMatch) projectId = projectMatch[0];
		}
		return dsnFromComponents({
			host,
			pass,
			path,
			projectId,
			port,
			protocol,
			publicKey
		});
	}
	function dsnFromComponents(components) {
		return {
			protocol: components.protocol,
			publicKey: components.publicKey || "",
			pass: components.pass || "",
			host: components.host,
			port: components.port || "",
			path: components.path || "",
			projectId: components.projectId
		};
	}
	function validateDsn(dsn) {
		const { port, projectId, protocol } = dsn;
		if ([
			"protocol",
			"publicKey",
			"host",
			"projectId"
		].find((component) => {
			if (!dsn[component]) {
				debug$1.error(`Invalid Sentry Dsn: ${component} missing`);
				return true;
			}
			return false;
		})) return false;
		if (!projectId.match(/^\d+$/)) {
			debug$1.error(`Invalid Sentry Dsn: Invalid projectId ${projectId}`);
			return false;
		}
		if (!isValidProtocol(protocol)) {
			debug$1.error(`Invalid Sentry Dsn: Invalid protocol ${protocol}`);
			return false;
		}
		if (port && isNaN(parseInt(port, 10))) {
			debug$1.error(`Invalid Sentry Dsn: Invalid port ${port}`);
			return false;
		}
		return true;
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
	/**
	* Creates a valid Sentry Dsn object, identifying a Sentry instance and project.
	* @returns a valid DsnComponents object or `undefined` if @param from is an invalid DSN source
	*/
	function makeDsn(from) {
		const components = typeof from === "string" ? dsnFromString(from) : dsnFromComponents(from);
		if (!components || !validateDsn(components)) return;
		return components;
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
	// ../core/build/esm/utils/tracing.js
	const TRACEPARENT_REGEXP = /* @__PURE__ */ new RegExp("^[ \\t]*([0-9a-f]{32})?-?([0-9a-f]{16})?-?([01])?[ \\t]*$");
	/**
	* Extract transaction context data from a `sentry-trace` header.
	*
	* This is terrible naming but the function has nothing to do with the W3C traceparent header.
	* It can only parse the `sentry-trace` header and extract the "trace parent" data.
	*
	* @param traceparent Traceparent string
	*
	* @returns Object containing data from the header, or undefined if traceparent string is malformed
	*/
	function extractTraceparentData(traceparent) {
		if (!traceparent) return;
		const matches = traceparent.match(TRACEPARENT_REGEXP);
		if (!matches) return;
		let parentSampled;
		if (matches[3] === "1") parentSampled = true;
		else if (matches[3] === "0") parentSampled = false;
		return {
			traceId: matches[1],
			parentSampled,
			parentSpanId: matches[2]
		};
	}
	/**
	* Create a propagation context from incoming headers or
	* creates a minimal new one if the headers are undefined.
	*/
	function propagationContextFromHeaders(sentryTrace, baggage) {
		const traceparentData = extractTraceparentData(sentryTrace);
		const dynamicSamplingContext = baggageHeaderToDynamicSamplingContext(baggage);
		if (!traceparentData?.traceId) return {
			traceId: generateTraceId(),
			sampleRand: safeMathRandom()
		};
		const sampleRand = getSampleRandFromTraceparentAndDsc(traceparentData, dynamicSamplingContext);
		if (dynamicSamplingContext) dynamicSamplingContext.sample_rand = sampleRand.toString();
		const { traceId, parentSpanId, parentSampled } = traceparentData;
		return {
			traceId,
			parentSpanId,
			sampled: parentSampled,
			dsc: dynamicSamplingContext || {},
			sampleRand
		};
	}
	/**
	* Create sentry-trace header from span context values.
	*/
	function generateSentryTraceHeader(traceId = generateTraceId(), spanId = generateSpanId(), sampled) {
		let sampledString = "";
		if (sampled !== void 0) sampledString = sampled ? "-1" : "-0";
		return `${traceId}-${spanId}${sampledString}`;
	}
	/**
	* Creates a W3C traceparent header from the given trace and span ids.
	*/
	function generateTraceparentHeader(traceId = generateTraceId(), spanId = generateSpanId(), sampled) {
		return `00-${traceId}-${spanId}-${sampled ? "01" : "00"}`;
	}
	/**
	* Given any combination of an incoming trace, generate a sample rand based on its defined semantics.
	*
	* Read more: https://develop.sentry.dev/sdk/telemetry/traces/#propagated-random-value
	*/
	function getSampleRandFromTraceparentAndDsc(traceparentData, dsc) {
		const parsedSampleRand = parseSampleRate(dsc?.sample_rand);
		if (parsedSampleRand !== void 0) return parsedSampleRand;
		const parsedSampleRate = parseSampleRate(dsc?.sample_rate);
		if (parsedSampleRate && traceparentData?.parentSampled !== void 0) return traceparentData.parentSampled ? safeMathRandom() * parsedSampleRate : parsedSampleRate + safeMathRandom() * (1 - parsedSampleRate);
		else return safeMathRandom();
	}
	/**
	* Determines whether a new trace should be continued based on the provided baggage org ID and the client's `strictTraceContinuation` option.
	* If the trace should not be continued, a new trace will be started.
	*
	* The result is dependent on the `strictTraceContinuation` option in the client.
	* See https://develop.sentry.dev/sdk/telemetry/traces/#stricttracecontinuation
	*/
	function shouldContinueTrace(client, baggageOrgId) {
		const clientOrgId = extractOrgIdFromClient(client);
		if (baggageOrgId && clientOrgId && baggageOrgId !== clientOrgId) {
			debug$1.log(`Won't continue trace because org IDs don't match (incoming baggage: ${baggageOrgId}, SDK options: ${clientOrgId})`);
			return false;
		}
		if (client.getOptions().strictTraceContinuation || false) {
			if (baggageOrgId && !clientOrgId || !baggageOrgId && clientOrgId) {
				debug$1.log(`Starting a new trace because strict trace continuation is enabled but one org ID is missing (incoming baggage: ${baggageOrgId}, Sentry client: ${clientOrgId})`);
				return false;
			}
		}
		return true;
	}
	// ../core/build/esm/utils/spanOnScope.js
	const SCOPE_SPAN_FIELD = "span";
	/**
	* Set the active span for a given scope.
	* NOTE: This should NOT be used directly, but is only used internally by the trace methods.
	*/
	function _setSpanForScope(scope, span) {
		if (span) scope.refs[SCOPE_SPAN_FIELD] = makeWeakRef(span);
		else delete scope.refs[SCOPE_SPAN_FIELD];
	}
	/**
	* Get the active span for a given scope.
	* NOTE: This should NOT be used directly, but is only used internally by the trace methods.
	*/
	function _getSpanForScope(scope) {
		return derefWeakRef(scope.refs[SCOPE_SPAN_FIELD]);
	}
	// ../core/build/esm/utils/spanUtils.js
	/**
	* Convert a span to a trace context, which can be sent as the `trace` context in an event.
	* By default, this will only include trace_id, span_id & parent_span_id.
	* If `includeAllData` is true, it will also include data, op, status & origin.
	*/
	function spanToTransactionTraceContext(span) {
		const { spanId: span_id, traceId: trace_id } = span.spanContext();
		const { data, op, parent_span_id, status, origin, links } = spanToStaticSpanJSON(span);
		return {
			parent_span_id,
			span_id,
			trace_id,
			data,
			op,
			status,
			origin,
			links
		};
	}
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
	* Convert a Span to a Sentry trace header.
	*/
	function spanToTraceHeader(span) {
		const { traceId, spanId } = span.spanContext();
		return generateSentryTraceHeader(traceId, spanId, spanIsSampled(span));
	}
	/**
	* Convert a Span to a W3C traceparent header.
	*/
	function spanToTraceparentHeader(span) {
		const { traceId, spanId } = span.spanContext();
		return generateTraceparentHeader(traceId, spanId, spanIsSampled(span));
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
	* Convert an OpenTelemetry time input into a timestamp in seconds.
	*
	* OpenTelemetry numbers are always milliseconds, either since the epoch or since the performance time origin
	* (`performance.now()`).
	*/
	function otelTimeInputToSeconds(input) {
		if (typeof input !== "number") return spanTimeInputToSeconds(input);
		if (input < 0xe8d4a51000) return performanceTimeToSeconds(input) ?? timestampInSeconds();
		return input / 1e3;
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
	/**
	* Converts a {@link StreamedSpanJSON} to a {@link SerializedSpan}.
	* This is the final serialized span format that is sent to Sentry.
	* The returned serilaized spans must not be consumed by users or SDK integrations.
	*/
	function streamedSpanJsonToSerializedSpan(spanJson) {
		return {
			...spanJson,
			end_timestamp: spanJson.end_timestamp ?? spanJson.start_timestamp,
			attributes: serializeAttributes(spanJson.attributes),
			links: spanJson.links?.map((link) => ({
				...link,
				attributes: serializeAttributes(link.attributes)
			}))
		};
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
	const CHILD_SPANS_FIELD = "_sentryChildSpans";
	const ROOT_SPAN_FIELD = "_sentryRootSpan";
	/**
	* Adds an opaque child span reference to a span.
	*/
	function addChildSpanToSpan(span, childSpan) {
		const rootSpan = span[ROOT_SPAN_FIELD] || span;
		addNonEnumerableProperty(childSpan, ROOT_SPAN_FIELD, rootSpan);
		childSpan.setAttribute(qb$1, void 0);
		if (!spanIsSampled(span)) return;
		if (!span.isRecording() && !rootSpan.isRecording()) return;
		if (span[CHILD_SPANS_FIELD]) span[CHILD_SPANS_FIELD].add(childSpan);
		else addNonEnumerableProperty(span, CHILD_SPANS_FIELD, /* @__PURE__ */ new Set([childSpan]));
	}
	/** This is only used internally by Idle Spans. */
	function removeChildSpanFromSpan(span, childSpan) {
		if (span[CHILD_SPANS_FIELD]) span[CHILD_SPANS_FIELD].delete(childSpan);
	}
	/**
	* Returns an array of the given span and all of its descendants.
	*/
	function getSpanDescendants(span) {
		const resultSet = /* @__PURE__ */ new Set();
		function addSpanChildren(span) {
			if (resultSet.has(span)) return;
			else if (spanIsSampled(span)) {
				resultSet.add(span);
				const childSpans = span[CHILD_SPANS_FIELD] ? Array.from(span[CHILD_SPANS_FIELD]) : [];
				for (const childSpan of childSpans) addSpanChildren(childSpan);
			}
		}
		addSpanChildren(span);
		return Array.from(resultSet);
	}
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
	/**
	* Updates the name of the given span and ensures that the span name is not
	* overwritten by the Sentry SDK.
	*
	* Use this function instead of `span.updateName()` if you want to make sure that
	* your name is kept. For some spans, for example root `http.server` spans the
	* Sentry SDK would otherwise overwrite the span name with a high-quality name
	* it infers when the span ends.
	*
	* Use this function in server code or when your span is started on the server
	* and on the client (browser). If you only update a span name on the client,
	* you can also use `span.updateName()` the SDK does not overwrite the name.
	*
	* @param span - The span to update the name of.
	* @param name - The name to set on the span.
	*/
	function updateSpanName(span, name) {
		span.updateName(name);
		span.setAttributes({ [SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME]: name });
		INTERNAL_setSegmentNameSourceIfSegment(span, "custom");
	}
	/**
	* Sets `sentry.segment.name.source` only when `span` is the segment span.
	* No-op for child spans — the attribute must exclusively live on the segment.
	*/
	function INTERNAL_setSegmentNameSourceIfSegment(span, source) {
		if (spanIsSegment(span)) span.setAttribute(qb$1, source);
	}
	// ../core/build/esm/tracing/errors.js
	let errorsInstrumented = false;
	/**
	* Ensure that global errors automatically set the active span status.
	*/
	function registerSpanErrorInstrumentation() {
		if (errorsInstrumented) return;
		/**
		* If an error or unhandled promise occurs, we mark the active root span as failed
		*/
		function errorCallback() {
			const activeSpan = getActiveSpan();
			const rootSpan = activeSpan && getRootSpan(activeSpan);
			if (rootSpan) {
				const message = "internal_error";
				debug$1.log(`[Tracing] Root span: ${message} -> Global error occurred`);
				rootSpan.setStatus({
					code: 2,
					message
				});
			}
		}
		errorsInstrumented = true;
		addGlobalErrorInstrumentationHandler(errorCallback);
		addGlobalUnhandledRejectionInstrumentationHandler(errorCallback);
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
	// ../core/build/esm/utils/should-ignore-span.js
	function logIgnoredSpan(droppedSpan) {
		debug$1.log(`Ignoring span ${droppedSpan.op} - ${droppedSpan.description} because it matches \`ignoreSpans\`.`);
	}
	/**
	* Check if a span should be ignored based on the ignoreSpans configuration.
	*/
	function shouldIgnoreSpan(span, ignoreSpans) {
		if (!ignoreSpans?.length) return false;
		for (const pattern of ignoreSpans) {
			if (isStringOrRegExp(pattern)) {
				if (span.description && isMatchingPattern(span.description, pattern)) {
					logIgnoredSpan(span);
					return true;
				}
				continue;
			}
			if (!pattern.name && !pattern.op && !(!!pattern.attributes && Object.keys(pattern.attributes).length > 0)) continue;
			const nameMatches = pattern.name ? span.description && isMatchingPattern(span.description, pattern.name) : true;
			const opMatches = pattern.op ? span.op && isMatchingPattern(span.op, pattern.op) : true;
			const attrsMatch = pattern.attributes ? Object.entries(pattern.attributes).every(([key, valuePattern]) => _matchesAttributeValue(span.attributes?.[key], valuePattern)) : true;
			if (nameMatches && opMatches && attrsMatch) {
				logIgnoredSpan(span);
				return true;
			}
		}
		return false;
	}
	function _matchesAttributeValue(actual, pat) {
		if (typeof actual === "string" && (typeof pat === "string" || pat instanceof RegExp)) return isMatchingPattern(actual, pat);
		if (Array.isArray(actual) && Array.isArray(pat)) return actual.length === pat.length && actual.every((v, i) => v === pat[i]);
		return actual === pat;
	}
	/**
	* Takes a list of spans, and a span that was dropped, and re-parents the child spans of the dropped span to the parent of the dropped span, if possible.
	* This mutates the spans array in place!
	*/
	function reparentChildSpans(spans, dropSpan) {
		const droppedSpanParentId = dropSpan.parent_span_id;
		const droppedSpanId = dropSpan.span_id;
		if (!droppedSpanParentId) return;
		for (const span of spans) if (span.parent_span_id === droppedSpanId) span.parent_span_id = droppedSpanParentId;
	}
	function isStringOrRegExp(value) {
		return typeof value === "string" || value instanceof RegExp;
	}
	// ../core/build/esm/integration.js
	const installedIntegrations = [];
	/**
	* Remove duplicates from the given array, preferring the last instance of any duplicate. Not guaranteed to
	* preserve the order of integrations in the array.
	*
	* @private
	*/
	function filterDuplicates(integrations) {
		const integrationsByName = {};
		integrations.forEach((currentInstance) => {
			const { name } = currentInstance;
			const existingInstance = integrationsByName[name];
			if (existingInstance && !existingInstance.isDefaultInstance && currentInstance.isDefaultInstance) return;
			integrationsByName[name] = currentInstance;
		});
		return Object.values(integrationsByName);
	}
	/** Gets integrations to install */
	function getIntegrationsToSetup(options) {
		const defaultIntegrations = options.defaultIntegrations || [];
		const userIntegrations = options.integrations;
		defaultIntegrations.forEach((integration) => {
			integration.isDefaultInstance = true;
		});
		let integrations;
		if (Array.isArray(userIntegrations)) integrations = [...defaultIntegrations, ...userIntegrations];
		else if (typeof userIntegrations === "function") {
			const resolvedUserIntegrations = userIntegrations(defaultIntegrations);
			integrations = Array.isArray(resolvedUserIntegrations) ? resolvedUserIntegrations : [resolvedUserIntegrations];
		} else integrations = defaultIntegrations;
		return filterDuplicates(integrations);
	}
	/**
	* Given a list of integration instances this installs them all. When `withDefaults` is set to `true` then all default
	* integrations are added unless they were already provided before.
	* @param integrations array of integration instances
	* @param withDefault should enable default integrations
	*/
	function setupIntegrations(client, integrations) {
		const integrationIndex = {};
		integrations.forEach((integration) => {
			if (integration?.beforeSetup) integration.beforeSetup(client);
		});
		integrations.forEach((integration) => {
			if (integration) setupIntegration(client, integration, integrationIndex);
		});
		return integrationIndex;
	}
	/**
	* Execute the `afterAllSetup` hooks of the given integrations.
	*/
	function afterSetupIntegrations(client, integrations) {
		for (const integration of integrations) if (integration?.afterAllSetup) integration.afterAllSetup(client);
	}
	/** Setup a single integration.  */
	function setupIntegration(client, integration, integrationIndex) {
		if (integrationIndex[integration.name]) {
			debug$1.log(`Integration skipped because it was already installed: ${integration.name}`);
			return;
		}
		integrationIndex[integration.name] = integration;
		if (!installedIntegrations.includes(integration.name) && typeof integration.setupOnce === "function") {
			integration.setupOnce();
			installedIntegrations.push(integration.name);
		}
		if (integration.setup && typeof integration.setup === "function") integration.setup(client);
		if (typeof integration.preprocessEvent === "function") {
			const callback = integration.preprocessEvent.bind(integration);
			client.on("preprocessEvent", (event, hint) => callback(event, hint, client));
		}
		if (typeof integration.processEvent === "function") {
			const callback = integration.processEvent.bind(integration);
			const processor = Object.assign((event, hint) => callback(event, hint, client), { id: integration.name });
			client.addEventProcessor(processor);
		}
		["processSpan", "processSegmentSpan"].forEach((hook) => {
			const callback = integration[hook];
			if (typeof callback === "function") client.on(hook, (span) => callback.call(integration, span, client));
		});
		debug$1.log(`Integration installed: ${integration.name}`);
	}
	/** Add an integration to the current scope's client. */
	function addIntegration(integration) {
		const client = getClient();
		if (!client) {
			debug$1.warn(`Cannot add integration "${integration.name}" because no SDK Client is available.`);
			return;
		}
		client.addIntegration(integration);
	}
	/**
	* Define an integration function that can be used to create an integration instance.
	* Note that this by design hides the implementation details of the integration, as they are considered internal.
	*/
	function defineIntegration(fn) {
		return fn;
	}
	// ../core/build/esm/constants.js
	const DEFAULT_ENVIRONMENT = "production";
	// ../core/build/esm/tracing/sentryNonRecordingSpan.js
	const NON_RECORDING_SPAN_FIELD = Symbol.for("sentry.nonRecordingSpan");
	/**
	* A Sentry Span that is non-recording, meaning it will not be sent to Sentry.
	*/
	var SentryNonRecordingSpan = class {
		constructor(spanContext = {}) {
			this._traceId = spanContext.traceId || generateTraceId();
			this._spanId = spanContext.spanId || generateSpanId();
			this.dropReason = spanContext.dropReason;
			addNonEnumerableProperty(this, NON_RECORDING_SPAN_FIELD, true);
		}
		/** @inheritdoc */
		spanContext() {
			return {
				spanId: this._spanId,
				traceId: this._traceId,
				traceFlags: 0
			};
		}
		/** @inheritdoc */
		end(_timestamp) {}
		/** @inheritdoc */
		setAttribute(_key, _value) {
			return this;
		}
		/** @inheritdoc */
		setAttributes(_values) {
			return this;
		}
		/** @inheritdoc */
		setStatus(_status) {
			return this;
		}
		/** @inheritdoc */
		updateName(_name) {
			return this;
		}
		/** @inheritdoc */
		isRecording() {
			return false;
		}
		/** @inheritdoc */
		addEvent(_name, _attributesOrStartTime, _startTime) {
			return this;
		}
		/** @inheritDoc */
		addLink(_link) {
			return this;
		}
		/** @inheritDoc */
		addLinks(_links) {
			return this;
		}
		/**
		* This should generally not be used,
		* but we need it for being compliant with the OTEL Span interface.
		*
		* @hidden
		* @internal
		*/
		recordException(_exception, _time) {}
	};
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
	* Freeze the given DSC on the given span.
	*/
	function freezeDscOnSpan(span, dsc) {
		addNonEnumerableProperty(span, FROZEN_DSC_FIELD, dsc);
	}
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
		const source = rootSpanAttributes[qb$1];
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
	/**
	* Convert a Span to a baggage header.
	*/
	function spanToBaggageHeader(span) {
		return dynamicSamplingContextToSentryBaggageHeader(getDynamicSamplingContextFromSpan(span));
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
	// ../core/build/esm/tracing/spans/beforeSendSpan.js
	/**
	* A wrapper to use the static, transaction-based span format in your `beforeSendSpan` callback.
	*
	* When using `traceLifecycle: 'static'`, wrap your callback with this function
	* to receive and return a static span instead of a {@link StreamedSpanJSON}.
	*
	* @example
	*
	* Sentry.init({
	*   traceLifecycle: 'static',
	*   beforeSendSpan: withStaticSpan((span) => {
	*     // span is of type SpanJSON
	*     return span;
	*   }),
	* });
	*
	* @param callback - A {@link BeforeSendStaticSpanCallback} that receives and returns a static span.
	* @returns A callback that is compatible with the `beforeSendSpan` option when using `traceLifecycle: 'static'`.
	*/
	function withStaticSpan(callback) {
		addNonEnumerableProperty(callback, "_static", true);
		return callback;
	}
	/**
	* A wrapper to explicitly use the streamed span format in your `beforeSendSpan` callback.
	*
	* @deprecated `beforeSendSpan` callbacks receive {@link StreamedSpanJSON} by default.
	* This function returns the callback unchanged and will be removed in SDK version 12.
	*
	* @param callback - The callback function that receives and returns a {@link StreamedSpanJSON}.
	* @returns The provided callback.
	*/
	function withStreamedSpan(callback) {
		return callback;
	}
	/**
	* Typesafe check to identify if a `beforeSendSpan` callback expects the static span JSON format.
	*
	* @param callback - The `beforeSendSpan` callback to check.
	* @returns `true` if the callback was wrapped with {@link withStaticSpan}.
	*/
	function isStaticBeforeSendSpanCallback(callback) {
		return !!callback && typeof callback === "function" && "_static" in callback && !!callback._static;
	}
	/**
	* Apply a user-provided beforeSendSpan callback to a span JSON.
	*/
	function applyBeforeSendSpanCallback(span, beforeSendSpan) {
		return safeCallback("The `beforeSendSpan` callback threw an error, sending the span unmodified:", () => beforeSendSpan(span), () => span) || span;
	}
	// ../core/build/esm/tracing/spans/spanJsonToStreamedSpan.js
	/**
	* Converts a v1 SpanJSON (from a legacy transaction) to a serialized v2 StreamedSpan.
	*/
	function spanJsonToSerializedStreamedSpan(span) {
		return streamedSpanJsonToSerializedSpan({
			trace_id: span.trace_id,
			span_id: span.span_id,
			parent_span_id: span.parent_span_id,
			name: span.description || "",
			start_timestamp: span.start_timestamp,
			end_timestamp: span.timestamp,
			status: !span.status || span.status === "ok" || span.status === "cancelled" ? "ok" : "error",
			is_segment: false,
			attributes: { ...span.data },
			links: span.links
		});
	}
	// ../core/build/esm/tracing/spans/scopeContextAttributes.js
	/**
	* Convert known scope contexts set by SDK integrations to span attributes.
	* Only maps context keys that are relevant to browser SDKs.
	* Server-only contexts (aws, gcp, trpc) are handled
	* by processSegmentSpan hooks in their respective packages.
	*/
	function scopeContextsToSpanAttributes(contexts) {
		const attrs = {};
		const { response, profile, cloud_resource, culture, state } = contexts;
		if (response) {
			if (response.status_code != null) attrs[Nl] = response.status_code;
			if (response.body_size != null) attrs[El] = response.body_size;
		}
		if (profile) {
			if (profile.profile_id) attrs[kb] = profile.profile_id;
			if (profile.profiler_id) attrs[vb] = profile.profiler_id;
		}
		if (cloud_resource) {
			for (const [key, value] of Object.entries(cloud_resource)) if (value != null) attrs[key] = value;
		}
		if (culture) {
			if (culture.locale) attrs[Ra] = culture.locale;
			if (culture.timezone) attrs[Na] = culture.timezone;
		}
		if (state?.state && typeof state.state.type === "string") attrs[yg] = state.state.type;
		const angular = contexts["angular"];
		if (angular) {
			const version = angular["version"];
			if (typeof version === "string" || typeof version === "number") attrs[Q$1] = version;
		}
		const react = contexts["react"];
		if (react) {
			const version = react["version"];
			if (typeof version === "string" || typeof version === "number") attrs[Wd] = version;
		}
		return attrs;
	}
	// ../core/build/esm/tracing/spans/captureSpan.js
	/**
	* Captures a span and returns a JSON representation to be enqueued for sending.
	*
	* IMPORTANT: This function converts the span to JSON immediately to avoid writing
	* to an already-ended OTel span instance (which is blocked by the OTel Span class).
	*
	* @returns the final serialized span with a reference to its segment span. This reference
	* is needed later on to compute the DSC and the final segment name for the span envelope.
	*/
	function captureSpan(span, client) {
		const spanJSON = spanToJSON(span);
		if (spanJSON.attributes) delete spanJSON.attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
		const segmentSpan = INTERNAL_getSegmentSpan(span);
		const serializedSegmentSpan = spanToJSON(segmentSpan);
		const { isolationScope: spanIsolationScope, scope: spanScope } = getCapturedScopesOnSpan(span);
		const finalScopeData = getCombinedScopeData(spanIsolationScope, spanScope);
		applyCommonSpanAttributes(spanJSON, serializedSegmentSpan, client, finalScopeData);
		client.emit("preprocessSpan", spanJSON);
		if (spanJSON.is_segment) {
			applyScopeToSegmentSpan(spanJSON, finalScopeData);
			applySdkMetadataToSegmentSpan(spanJSON, client);
			client.emit("processSegmentSpan", spanJSON);
		}
		client.emit("processSpan", spanJSON);
		const { beforeSendSpan, traceLifecycle } = client.getOptions();
		return {
			...streamedSpanJsonToSerializedSpan(traceLifecycle !== "static" && beforeSendSpan && !isStaticBeforeSendSpanCallback(beforeSendSpan) ? applyBeforeSendSpanCallback(spanJSON, beforeSendSpan) : spanJSON),
			_segmentSpan: segmentSpan,
			_segmentNameAtCapture: serializedSegmentSpan.name
		};
	}
	function applyScopeToSegmentSpan(segmentSpanJSON, scopeData) {
		safeSetSpanJSONAttributes(segmentSpanJSON, scopeContextsToSpanAttributes(scopeData.contexts));
	}
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
	function applySdkMetadataToSegmentSpan(segmentSpanJSON, client) {
		const integrationNames = client.getIntegrationNames();
		if (!integrationNames.length) return;
		safeSetSpanJSONAttributes(segmentSpanJSON, { [Ab]: integrationNames });
	}
	function commonSpanAttributes(serializedSegmentSpan, client, scopeData, includeScopeAttributes = true) {
		const sdk = client.getSdkMetadata();
		const { release, environment } = client.getOptions();
		return {
			[Vb]: "stream",
			[Pb]: serializedSegmentSpan.name,
			[Nb]: serializedSegmentSpan.span_id,
			[xb]: sdk?.sdk?.name,
			[Rb]: sdk?.sdk?.version,
			[Eb]: release,
			[Bm]: environment || "production",
			[xy]: scopeData.user?.id,
			[ky]: scopeData.user?.email,
			[Ry]: scopeData.user?.ip_address,
			[Ny]: scopeData.user?.username,
			...includeScopeAttributes ? scopeData.attributes : void 0
		};
	}
	function applyCommonSpanAttributes(spanJSON, serializedSegmentSpan, client, scopeData) {
		safeSetSpanJSONAttributes(spanJSON, commonSpanAttributes(serializedSegmentSpan, client, scopeData));
	}
	/**
	* Captures a standalone span whose `beforeSendSpan` callback expects the v1 {@link SpanJSON} format
	* (i.e. the user opted out of span streaming). The span is serialized to v1, the common attributes are
	* applied, the callback runs in its native format, and the result is converted forward to a serialized
	* v2 span. This mirrors how gen_ai spans reach the v2 span path from a static transaction (a plain
	* conversion, no `processSpan` hooks), so there is never a reverse v2 -> v1 conversion.
	*
	* TODO(standalone): remove once the static (transaction) trace lifecycle is dropped.
	*/
	function captureStandaloneSpanWithStaticCallback(span, client, beforeSendSpan) {
		const spanJSON = spanToStaticSpanJSON(span);
		const serializedSegmentSpan = spanToJSON(INTERNAL_getSegmentSpan(span));
		const { isolationScope: spanIsolationScope, scope: spanScope } = getCapturedScopesOnSpan(span);
		const commonAttributes = commonSpanAttributes(serializedSegmentSpan, client, getCombinedScopeData(spanIsolationScope, spanScope), false);
		Object.entries(commonAttributes).forEach(([key, value]) => {
			if (value != null && !(key in spanJSON.data)) spanJSON.data[key] = value;
		});
		return spanJsonToSerializedStreamedSpan(applyBeforeSendSpanCallback(spanJSON, beforeSendSpan));
	}
	// ../core/build/esm/tracing/spans/hasSpanStreamingEnabled.js
	/**
	* Determines if span streaming is enabled for the given client
	*/
	function hasSpanStreamingEnabled(client) {
		return client.getOptions().traceLifecycle === "stream";
	}
	// ../core/build/esm/utils/timer.js
	/**
	* Calls `unref` on a timer, if the method is available on @param timer.
	*
	* `unref()` is used to allow processes to exit immediately, even if the timer
	* is still running and hasn't resolved yet.
	*
	* Use this in places where code can run on browser or server, since browsers
	* do not support `unref`.
	*/
	function safeUnref(timer) {
		if (typeof timer === "object" && typeof timer.unref === "function") timer.unref();
		return timer;
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
	/**
	* Add an item to an envelope.
	* Make sure to always explicitly provide the generic to this function
	* so that the envelope types resolve correctly.
	*/
	function addItemToEnvelope(envelope, newItem) {
		const [headers, items] = envelope;
		return [headers, [...items, newItem]];
	}
	/**
	* Convenience function to loop through the items and item types of an envelope.
	* (This function was mostly created because working with envelope types is painful at the moment)
	*
	* If the callback returns true, the rest of the items will be skipped.
	*/
	function forEachEnvelopeItem(envelope, callback) {
		const envelopeItems = envelope[1];
		for (const envelopeItem of envelopeItems) {
			const envelopeItemType = envelopeItem[0].type;
			if (callback(envelopeItem, envelopeItemType)) return true;
		}
		return false;
	}
	/**
	* Returns true if the envelope contains any of the given envelope item types
	*/
	function envelopeContainsItemType(envelope, types) {
		return forEachEnvelopeItem(envelope, (_, type) => types.includes(type));
	}
	/**
	* Encode a string to UTF8 array.
	*/
	function encodeUTF8(input) {
		const carrier = getSentryCarrier(GLOBAL_OBJ);
		return carrier.encodePolyfill ? carrier.encodePolyfill(input) : new TextEncoder().encode(input);
	}
	/**
	* Serializes an envelope.
	*/
	function serializeEnvelope(envelope) {
		const [envHeaders, items] = envelope;
		let parts = JSON.stringify(envHeaders);
		function append(next) {
			if (typeof parts === "string") parts = typeof next === "string" ? parts + next : [encodeUTF8(parts), next];
			else parts.push(typeof next === "string" ? encodeUTF8(next) : next);
		}
		for (const item of items) {
			const [itemHeaders, payload] = item;
			append(`\n${JSON.stringify(itemHeaders)}\n`);
			if (typeof payload === "string" || payload instanceof Uint8Array) append(payload);
			else {
				let stringifiedPayload;
				try {
					stringifiedPayload = JSON.stringify(payload);
				} catch {
					stringifiedPayload = JSON.stringify(normalize(payload));
				}
				append(stringifiedPayload);
			}
		}
		return typeof parts === "string" ? parts : concatBuffers(parts);
	}
	function concatBuffers(buffers) {
		const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
		const merged = new Uint8Array(totalLength);
		let offset = 0;
		for (const buffer of buffers) {
			merged.set(buffer, offset);
			offset += buffer.length;
		}
		return merged;
	}
	/**
	* Creates attachment envelope items
	*/
	function createAttachmentEnvelopeItem(attachment) {
		const buffer = typeof attachment.data === "string" ? encodeUTF8(attachment.data) : attachment.data;
		return [{
			type: "attachment",
			length: buffer.length,
			filename: attachment.filename,
			content_type: attachment.contentType,
			attachment_type: attachment.attachmentType
		}, buffer];
	}
	const DATA_CATEGORY_OVERRIDES = {
		sessions: "session",
		event: "error",
		client_report: "internal",
		user_report: "default",
		profile_chunk: "profile",
		replay_event: "replay",
		replay_recording: "replay",
		check_in: "monitor",
		raw_security: "security",
		log: "log_item",
		metric: "trace_metric"
	};
	function _isOverriddenType(type) {
		return type in DATA_CATEGORY_OVERRIDES;
	}
	/**
	* Maps the type of an envelope item to a data category.
	*/
	function envelopeItemTypeToDataCategory(type) {
		return _isOverriddenType(type) ? DATA_CATEGORY_OVERRIDES[type] : type;
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
	/**
	* Get source of SDK.
	*/
	function getSDKSource() {
		return "cdn";
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
	// ../core/build/esm/tracing/spans/envelope.js
	/**
	* Creates a span v2 span streaming envelope
	*/
	function createStreamedSpanEnvelope(serializedSpans, dsc, client) {
		const options = client.getOptions();
		const dsn = client.getDsn();
		const tunnel = options.tunnel;
		const sdk = getSdkMetadataForEnvelopeHeader(options._metadata);
		return createEnvelope({
			sent_at: new Date(safeDateNow()).toISOString(),
			...dscHasRequiredProps(dsc) && { trace: dsc },
			...sdk && { sdk },
			...!!tunnel && dsn && { dsn: dsnToString(dsn) }
		}, [createSpanContainerItem(serializedSpans, client)]);
	}
	/**
	* Builds a span v2 container envelope item from already-serialized streamed spans.
	*/
	function createSpanContainerItem(serializedSpans, client) {
		const inferSetting = client.getDataCollectionOptions().userInfo ? "auto" : "never";
		return [{
			type: "span",
			item_count: serializedSpans.length,
			content_type: "application/vnd.sentry.items.span.v2+json"
		}, {
			version: 2,
			ingest_settings: isBrowser() ? {
				infer_ip: inferSetting,
				infer_user_agent: inferSetting
			} : void 0,
			items: serializedSpans
		}];
	}
	function dscHasRequiredProps(dsc) {
		return !!dsc.trace_id && !!dsc.public_key;
	}
	// ../core/build/esm/tracing/spans/estimateSize.js
	/**
	* Estimates the serialized byte size of a {@link SerializedStreamedSpan}.
	*
	* Uses 2 bytes per character as a UTF-16 approximation, and 8 bytes per number.
	* The estimate is intentionally conservative and may be slightly lower than the
	* actual byte size on the wire.
	* We compensate for this by setting the span buffers internal limit well below the limit
	* of how large an actual span v2 envelope may be.
	*/
	function estimateSerializedSpanSizeInBytes(span) {
		let weight = 156;
		weight += span.name.length * 2;
		weight += estimateTypedAttributesSizeInBytes(span.attributes);
		if (span.links && span.links.length > 0) {
			const attributes = span.links[0]?.attributes;
			const linkWeight = 100 + (attributes ? estimateTypedAttributesSizeInBytes(attributes) : 0);
			weight += linkWeight * span.links.length;
		}
		return weight;
	}
	// ../core/build/esm/tracing/spans/spanBuffer.js
	/**
	* We must not send more than 1000 spans in one envelope.
	* Otherwise the envelope is dropped by Relay.
	*/
	const MAX_SPANS_PER_ENVELOPE = 1e3;
	const MAX_TRACE_WEIGHT_IN_BYTES = 5e6;
	/**
	* A buffer for serialized streamed span JSON objects that flushes them to Sentry in Span v2 envelopes.
	* Handles per-trace timeout-based flushing, size thresholds, and graceful shutdown.
	* Also handles computation of the Dynamic Sampling Context (DSC) for the trace, if it wasn't yet
	* frozen onto the segment span.
	*
	* For this, we need the reference to the segment span instance, from
	* which we compute the DSC. Doing this in the buffer ensures that we compute the DSC as late as possible,
	* allowing span name and data updates up to this point. Worth noting here that the segment span is likely
	* still active and modifyable when child spans are added to the buffer.
	*/
	var SpanBuffer = class {
		constructor(client, options) {
			this._traceBuckets = /* @__PURE__ */ new Map();
			this._client = client;
			const { maxSpanLimit, flushInterval, maxTraceWeightInBytes } = options ?? {};
			this._maxSpanLimit = maxSpanLimit && maxSpanLimit > 0 && maxSpanLimit <= MAX_SPANS_PER_ENVELOPE ? maxSpanLimit : MAX_SPANS_PER_ENVELOPE;
			this._flushInterval = flushInterval && flushInterval > 0 ? flushInterval : 5e3;
			this._maxTraceWeight = maxTraceWeightInBytes && maxTraceWeightInBytes > 0 ? maxTraceWeightInBytes : MAX_TRACE_WEIGHT_IN_BYTES;
			this._client.on("flush", () => {
				this.drain();
			});
			this._client.on("close", () => {
				this._traceBuckets.forEach((bucket) => {
					clearTimeout(bucket.timeout);
				});
				this._traceBuckets.clear();
			});
		}
		/**
		* Add a span to the buffer.
		*/
		add(spanJSON) {
			const traceId = spanJSON.trace_id;
			let bucket = this._traceBuckets.get(traceId);
			if (!bucket) {
				bucket = {
					spans: /* @__PURE__ */ new Set(),
					size: 0,
					timeout: safeUnref(setTimeout(() => {
						this.flush(traceId);
					}, this._flushInterval))
				};
				this._traceBuckets.set(traceId, bucket);
			}
			bucket.spans.add(spanJSON);
			bucket.size += estimateSerializedSpanSizeInBytes(spanJSON);
			if (bucket.spans.size >= this._maxSpanLimit || bucket.size >= this._maxTraceWeight) this.flush(traceId);
		}
		/**
		* Drain and flush all buffered traces.
		*/
		drain() {
			if (!this._traceBuckets.size) return;
			debug$1.log(`Flushing span tree map with ${this._traceBuckets.size} traces`);
			this._traceBuckets.forEach((_, traceId) => {
				this.flush(traceId);
			});
		}
		/**
		* Flush spans of a specific trace.
		* In contrast to {@link SpanBuffer.drain}, this method does not flush all traces, but only the one with the given traceId.
		*/
		flush(traceId) {
			const bucket = this._traceBuckets.get(traceId);
			if (!bucket) return;
			if (!bucket.spans.size) {
				this._removeTrace(traceId);
				return;
			}
			const spans = Array.from(bucket.spans);
			const segmentSpan = spans[0]?._segmentSpan;
			if (!segmentSpan) {
				debug$1.warn("No segment span reference found on span JSON, cannot compute DSC");
				this._removeTrace(traceId);
				return;
			}
			const dsc = getDynamicSamplingContextFromSpan(segmentSpan);
			const currentSegmentNames = /* @__PURE__ */ new Map();
			const getCurrentSegmentName = (span) => {
				let name = currentSegmentNames.get(span);
				if (name === void 0) {
					name = spanToJSON(span).name;
					currentSegmentNames.set(span, name);
				}
				return name;
			};
			const cleanedSpans = spans.map((spanJSON) => {
				const { _segmentSpan, _segmentNameAtCapture, ...cleanSpanJSON } = spanJSON;
				refreshSegmentName(cleanSpanJSON, _segmentNameAtCapture, () => getCurrentSegmentName(_segmentSpan));
				return cleanSpanJSON;
			});
			const envelope = createStreamedSpanEnvelope(cleanedSpans, dsc, this._client);
			debug$1.log(`Sending span envelope for trace ${traceId} with ${cleanedSpans.length} spans`);
			this._client.sendEnvelope(envelope).then(null, (reason) => {
				debug$1.error("Error while sending streamed span envelope:", reason);
			});
			this._removeTrace(traceId);
		}
		_removeTrace(traceId) {
			const bucket = this._traceBuckets.get(traceId);
			if (bucket) clearTimeout(bucket.timeout);
			this._traceBuckets.delete(traceId);
		}
	};
	/**
	* Spans are captured when they end, but the segment span can still be renamed afterwards
	* (e.g. once the route is known). Only replace the value we set at capture time, so that
	* values set by users or `beforeSendSpan` are kept.
	*/
	function refreshSegmentName(spanJSON, segmentNameAtCapture, getCurrentSegmentName) {
		const segmentNameAttribute = spanJSON.attributes[Pb];
		if (segmentNameAtCapture === void 0 || segmentNameAttribute?.value !== segmentNameAtCapture) return;
		const currentSegmentName = getCurrentSegmentName();
		if (currentSegmentName !== segmentNameAtCapture) spanJSON.attributes[Pb] = {
			...segmentNameAttribute,
			value: currentSegmentName
		};
	}
	// ../core/build/esm/integrations/spanStreaming.js
	const INTEGRATION_NAME$14 = "SpanStreaming";
	const spanStreamingIntegration = defineIntegration((options = {}) => {
		const flushOnSegmentEnd = options.flushOnSegmentEnd ?? true;
		return {
			name: INTEGRATION_NAME$14,
			setup(client) {
				if (!hasSpanStreamingEnabled(client)) {
					debug$1.log(`[SpanStreaming] \`traceLifecycle\` is "static", skipping setup.`);
					return;
				}
				const buffer = new SpanBuffer(client);
				client.on("afterSpanEnd", (span) => {
					if (!spanIsSampled(span)) return;
					buffer.add(captureSpan(span, client));
				});
				client.on("flushTraceSpans", (traceId) => {
					buffer.flush(traceId);
				});
				if (flushOnSegmentEnd) client.on("afterSegmentSpanEnd", (segmentSpan) => {
					const traceId = segmentSpan.spanContext().traceId;
					safeUnref(setTimeout(() => {
						buffer.flush(traceId);
					}, 500));
				});
			}
		};
	});
	// ../core/build/esm/utils/handleCallbackErrors.js
	/**
	* Wrap a callback function with error handling.
	* If an error is thrown, it will be passed to the `onError` callback and re-thrown.
	*
	* If the return value of the function is a promise, it will be handled with `maybeHandlePromiseRejection`.
	*
	* If an `onFinally` callback is provided, this will be called when the callback has finished
	* - so if it returns a promise, once the promise resolved/rejected,
	* else once the callback has finished executing.
	* The `onFinally` callback will _always_ be called, no matter if an error was thrown or not.
	*/
	function handleCallbackErrors(fn, onError, onFinally = () => {}, onSuccess = () => {}) {
		let maybePromiseResult;
		try {
			maybePromiseResult = fn();
		} catch (e) {
			onError(e);
			onFinally();
			throw e;
		}
		return maybeHandlePromiseRejection(maybePromiseResult, onError, onFinally, onSuccess);
	}
	/**
	* Maybe handle a promise rejection.
	* This expects to be given a value that _may_ be a promise, or any other value.
	* If it is a promise, and it rejects, it will call the `onError` callback.
	*
	* For thenable objects with extra methods (like jQuery's jqXHR),
	* this function preserves those methods by wrapping the original thenable in a Proxy
	* that intercepts .then() calls to apply error handling while forwarding all other
	* properties to the original object.
	* This allows code like `startSpan(() => $.ajax(...)).abort()` to work correctly.
	*/
	function maybeHandlePromiseRejection(value, onError, onFinally, onSuccess) {
		if (isThenable(value)) return chainAndCopyPromiseLike(value, (result) => {
			onFinally();
			onSuccess(result);
		}, (err) => {
			onError(err);
			onFinally();
		});
		onFinally();
		onSuccess(value);
		return value;
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
	* Remember which span an error escaped, so a later `captureException` can attribute the error to
	* the span that actually failed instead of whichever span happens to be active at capture time.
	*
	* The first span to see the error wins: as an error unwinds through nested spans, the innermost
	* one is the one that failed. Unsampled spans are skipped because they are never sent, so their
	* span id would point at a span that does not exist. Sampling rather than `isRecording()` is what
	* matters here: a span ended before the error escaped it, which is the norm for `startSpanManual`,
	* has stopped recording but is still sent.
	*/
	function recordEscapedErrorSpan(error, span) {
		const key = toWeakMapKey(error);
		if (!key || !spanIsSampled(span) || escapedSpanTraceContexts.has(key)) return;
		escapedSpanTraceContexts.set(key, spanToTraceContext(span));
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
	// ../core/build/esm/tracing/logSpans.js
	/**
	* Print a log message for a started span.
	*/
	function logSpanStart(span) {
		const { description = "< unknown name >", op = "< unknown op >", parent_span_id: parentSpanId } = spanToStaticSpanJSON(span);
		const { spanId } = span.spanContext();
		const sampled = spanIsSampled(span);
		const rootSpan = getRootSpan(span);
		const isRootSpan = rootSpan === span;
		const header = `[Tracing] Starting ${sampled ? "sampled" : "unsampled"} ${isRootSpan ? "root " : ""}span`;
		const infoParts = [
			`op: ${op}`,
			`name: ${description}`,
			`ID: ${spanId}`
		];
		if (parentSpanId) infoParts.push(`parent ID: ${parentSpanId}`);
		if (!isRootSpan) {
			const { op, description } = spanToStaticSpanJSON(rootSpan);
			infoParts.push(`root ID: ${rootSpan.spanContext().spanId}`);
			if (op) infoParts.push(`root op: ${op}`);
			if (description) infoParts.push(`root description: ${description}`);
		}
		debug$1.log(`${header}
  ${infoParts.join("\n  ")}`);
	}
	/**
	* Print a log message for an ended span.
	*/
	function logSpanEnd(span) {
		const { description = "< unknown name >", op = "< unknown op >" } = spanToStaticSpanJSON(span);
		const { spanId } = span.spanContext();
		const msg = `[Tracing] Finishing "${op}" ${getRootSpan(span) === span ? "root " : ""}span "${description}" with ID ${spanId}`;
		debug$1.log(msg);
	}
	// ../core/build/esm/tracing/sampling.js
	/**
	* Makes a sampling decision for the given options.
	*
	* Called every time a root span is created. Only root spans which emerge with a `sampled` value of `true` will be
	* sent to Sentry.
	*/
	function sampleSpan(options, samplingContext, sampleRand) {
		if (!hasSpansEnabled(options)) return [false];
		const resolved = resolveSampleRate(options, samplingContext);
		if (!resolved) return [
			false,
			void 0,
			void 0,
			"callback_error"
		];
		const [sampleRate, localSampleRateWasApplied] = resolved;
		const parsedSampleRate = parseSampleRate(sampleRate);
		if (parsedSampleRate === void 0) {
			debug$1.warn(`[Tracing] Discarding root span because of invalid sample rate. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(sampleRate)} of type ${JSON.stringify(typeof sampleRate)}.`);
			return [false];
		}
		if (!parsedSampleRate) {
			debug$1.log(`[Tracing] Discarding transaction because ${typeof options.tracesSampler === "function" ? "tracesSampler returned 0 or false" : "a negative sampling decision was inherited or tracesSampleRate is set to 0"}`);
			return [
				false,
				parsedSampleRate,
				localSampleRateWasApplied
			];
		}
		const shouldSample = sampleRand < parsedSampleRate;
		if (!shouldSample) debug$1.log(`[Tracing] Discarding transaction because it's not included in the random sample (sampling rate = ${Number(sampleRate)})`);
		return [
			shouldSample,
			parsedSampleRate,
			localSampleRateWasApplied
		];
	}
	/**
	* Prefers `tracesSampler`. If it throws, falls back to the parent decision, then `tracesSampleRate`.
	* Returns `undefined` when there is nothing to fall back to.
	*/
	function resolveSampleRate(options, samplingContext) {
		const { tracesSampler, tracesSampleRate } = options;
		if (typeof tracesSampler === "function") {
			const samplerResult = safeCallback("The `tracesSampler` callback threw an error, falling back to the parent sampling decision or `tracesSampleRate`:", () => [tracesSampler({
				...samplingContext,
				inheritOrSampleWith: (fallbackSampleRate) => {
					if (typeof samplingContext.parentSampleRate === "number") return samplingContext.parentSampleRate;
					if (typeof samplingContext.parentSampled === "boolean") return Number(samplingContext.parentSampled);
					return fallbackSampleRate;
				}
			}), true], () => void 0);
			if (samplerResult) return samplerResult;
		}
		if (samplingContext.parentSampled !== void 0) return [samplingContext.parentSampled];
		if (typeof tracesSampleRate !== "undefined") return [tracesSampleRate, true];
	}
	// ../core/build/esm/tracing/measurement.js
	/**
	* Adds a measurement to the active transaction on the current global scope. You can optionally pass in a different span
	* as the 4th parameter.
	*/
	function setMeasurement(name, value, unit, activeSpan = getActiveSpan()) {
		const rootSpan = activeSpan && getRootSpan(activeSpan);
		if (rootSpan) {
			debug$1.log(`[Measurement] Setting measurement on root span: ${name} = ${value} ${unit}`);
			rootSpan.addEvent(name, {
				[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: value,
				[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: unit
			});
		}
	}
	/**
	* Convert timed events to measurements.
	*/
	function timedEventsToMeasurements(events) {
		if (!events || events.length === 0) return;
		const measurements = {};
		events.forEach((event) => {
			const attributes = event.attributes || {};
			const unit = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT];
			const value = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE];
			if (typeof unit === "string" && typeof value === "number") measurements[event.name] = {
				value,
				unit
			};
		});
		return measurements;
	}
	// ../core/build/esm/tracing/segmentSpanCaptureStrategy.js
	/** Get the global segment-span capture strategy, or `undefined` when none is registered. */
	function getSegmentSpanCaptureStrategy() {
		return getSentryCarrier(getMainCarrier()).segmentSpanCaptureStrategy;
	}
	// ../core/build/esm/tracing/sentrySpan.js
	const MAX_SPAN_COUNT = 1e3;
	/**
	* Span contains all data about a span
	*/
	var SentrySpan = class {
		/**
		* You should never call the constructor manually, always use `Sentry.startSpan()`
		* or other span methods.
		* @internal
		* @hideconstructor
		* @hidden
		*/
		constructor(spanContext = {}) {
			this._traceId = spanContext.traceId || generateTraceId();
			this._spanId = spanContext.spanId || generateSpanId();
			if (spanContext.startTimestamp) this._startTime = spanContext.startTimestamp;
			else {
				this._startTime = timestampInSeconds();
				this._startPerformanceNow = safePerformanceNow();
			}
			this._links = spanContext.links;
			this._attributes = {};
			this.setAttributes({
				[_b]: "manual",
				[yb]: spanContext.op,
				...spanContext.attributes
			});
			this._name = spanContext.name;
			if (spanContext.parentSpanId) this._parentSpanId = spanContext.parentSpanId;
			if ("sampled" in spanContext) this._sampled = spanContext.sampled;
			this._events = [];
			this._isStandaloneSpan = spanContext.isStandalone;
		}
		/** @inheritDoc */
		addLink(link) {
			if (this._frozen) return this;
			if (this._links) this._links.push(link);
			else this._links = [link];
			return this;
		}
		/** @inheritDoc */
		addLinks(links) {
			if (this._frozen) return this;
			if (this._links) this._links.push(...links);
			else this._links = links;
			return this;
		}
		/**
		* This should generally not be used,
		* but it is needed for being compliant with the OTEL Span interface.
		*
		* @hidden
		* @internal
		*/
		recordException(_exception, _time) {}
		/** @inheritdoc */
		spanContext() {
			const { _spanId: spanId, _traceId: traceId, _sampled: sampled } = this;
			return {
				spanId,
				traceId,
				traceFlags: sampled ? 1 : 0
			};
		}
		/** @inheritdoc */
		setAttribute(key, value) {
			if (this._frozen) return this;
			if (key === "sentry.segment.name.source" && value !== void 0 && !spanIsSegment(this)) {
				debug$1.warn("[Tracing] Ignoring name source on a child span: this attribute is only valid on the root span.");
				return this;
			}
			if (value === void 0) delete this._attributes[key];
			else this._attributes[key] = value;
			return this;
		}
		/** @inheritdoc */
		setAttributes(attributes) {
			Object.keys(attributes).forEach((key) => this.setAttribute(key, attributes[key]));
			return this;
		}
		/**
		* This should generally not be used,
		* but we need it for browser tracing where we want to adjust the start time afterwards.
		* USE THIS WITH CAUTION!
		*
		* @hidden
		* @internal
		*/
		updateStartTime(timeInput) {
			if (this._frozen) return;
			this._startTime = timeInputToSeconds(this, timeInput);
			this._startPerformanceNow = void 0;
		}
		/**
		* @inheritDoc
		*/
		setStatus(value) {
			if (this._frozen) return this;
			this._status = value;
			return this;
		}
		/**
		* @inheritDoc
		*/
		updateName(name) {
			if (this._frozen) return this;
			this._name = name;
			INTERNAL_setSegmentNameSourceIfSegment(this, "custom");
			return this;
		}
		/** @inheritdoc */
		end(endTimestamp) {
			if (this._endTime) return;
			this._endTime = endTimestamp == null ? this._getEndTimeFromDuration() : timeInputToSeconds(this, endTimestamp);
			logSpanEnd(this);
			this._onSpanEnded();
			this._frozen = spanIsTracerProviderSpan(this);
		}
		/**
		* Get JSON representation of this span.
		*
		* @hidden
		* @internal This method is purely for internal purposes and should not be used outside
		* of SDK code. If you need to get a JSON representation of a span,
		* use `spanToJSON(span)` instead.
		*/
		getStaticSpanJSON() {
			return {
				data: this._attributes,
				description: this._name,
				op: this._attributes[yb],
				parent_span_id: this._parentSpanId,
				span_id: this._spanId,
				start_timestamp: this._startTime,
				status: getStatusMessage(this._status),
				timestamp: this._endTime,
				trace_id: this._traceId,
				origin: this._attributes[_b],
				profile_id: this._attributes[kb],
				exclusive_time: this._attributes[Wm],
				measurements: timedEventsToMeasurements(this._events),
				links: convertSpanLinksForEnvelope(this._links)
			};
		}
		/**
		* Get {@link StreamedSpanJSON} representation of this span.
		*
		* @hidden
		* @internal This method is purely for internal purposes and should not be used outside
		* of SDK code. If you need to get a JSON representation of a span,
		* use `spanToJSON(span)` instead.
		*/
		getSpanJSON() {
			return {
				name: this._name ?? "",
				span_id: this._spanId,
				trace_id: this._traceId,
				parent_span_id: this._parentSpanId,
				start_timestamp: this._startTime,
				end_timestamp: this._endTime,
				is_segment: spanIsSegment(this),
				status: getSimpleStatus(this._status),
				attributes: addStatusMessageAttribute(this._attributes, this._status),
				links: getStreamedSpanLinks(this._links)
			};
		}
		/** @inheritdoc */
		isRecording() {
			return !this._endTime && !!this._sampled;
		}
		/**
		* @inheritdoc
		*/
		addEvent(name, attributesOrStartTime, startTime) {
			if (this._frozen) return this;
			debug$1.log("[Tracing] Adding an event to span:", name);
			const time = isSpanTimeInput(attributesOrStartTime) ? attributesOrStartTime : startTime || void 0;
			const attributes = isSpanTimeInput(attributesOrStartTime) ? {} : attributesOrStartTime || {};
			const event = {
				name,
				time: timeInputToSeconds(this, time),
				attributes
			};
			this._events.push(event);
			return this;
		}
		/**
		* Whether this span is sent on its own (as a v2 streamed span) rather than as part of a
		* transaction. Used internally; see `_isStandaloneSpan`.
		* @internal
		*/
		isStandaloneSpan() {
			return !!this._isStandaloneSpan;
		}
		/**
		* Returns the start time plus the `performance.now()` time since the span started.
		*
		* This way, the duration is correct even if the time origin was corrected while the span was running (e.g. after the
		* device slept), and it can never be negative.
		*/
		_getEndTimeFromDuration() {
			const performanceNow = safePerformanceNow();
			if (this._startPerformanceNow == null || performanceNow == null) return timestampInSeconds();
			return this._startTime + (performanceNow - this._startPerformanceNow) / 1e3;
		}
		/** Emit `spanEnd` when the span is ended. */
		_onSpanEnded() {
			const client = getClient();
			client?.emit("spanEnd", this);
			if (this._isStandaloneSpan) {
				if (!client) return;
				if (this._sampled) {
					sendStandaloneSpan(this, client);
					return;
				}
				debug$1.log("[Tracing] Discarding standalone span because its trace was not chosen to be sampled.");
				return;
			}
			client?.emit("afterSpanEnd", this);
			const rootSpan = getRootSpan(this);
			if (rootSpan !== this) {
				const strategy = getSegmentSpanCaptureStrategy();
				if (strategy) {
					const scope = getCapturedScopesOnSpan(this).scope || getCurrentScope();
					strategy.onChildSpanEnded(this, rootSpan, (options) => this._convertSpanToTransaction(options), scope);
				}
				return;
			}
			if (client && hasSpanStreamingEnabled(client)) {
				client.emit("afterSegmentSpanEnd", this);
				return;
			}
			const scope = getCapturedScopesOnSpan(this).scope || getCurrentScope();
			const strategy = getSegmentSpanCaptureStrategy();
			if (strategy) strategy.onSegmentSpanEnded((options) => this._convertSpanToTransaction(options), scope);
			else {
				const transactionEvent = this._convertSpanToTransaction();
				if (transactionEvent) scope.captureEvent(transactionEvent);
			}
		}
		/**
		* Finish the transaction & prepare the event to send to Sentry.
		*/
		_convertSpanToTransaction(options = {}) {
			if (!isFullFinishedSpan(spanToStaticSpanJSON(this))) return;
			if (!this._name) {
				debug$1.warn("Transaction has no name, falling back to `<unlabeled transaction>`.");
				this._name = "<unlabeled transaction>";
			}
			const { scope: capturedSpanScope, isolationScope: capturedSpanIsolationScope } = getCapturedScopesOnSpan(this);
			const normalizedRequest = capturedSpanScope?.getScopeData().sdkProcessingMetadata?.normalizedRequest;
			if (this._sampled !== true) return;
			options.onSpanCaptured?.(this);
			const spans = [];
			let droppedUnfinishedSpanCount = 0;
			for (const descendant of getSpanDescendants(this)) {
				if (descendant === this || isStandaloneSpan(descendant) || options.isSpanAlreadyCaptured?.(descendant)) continue;
				const spanJSON = spanToStaticSpanJSON(descendant);
				if (!isFullFinishedSpan(spanJSON)) {
					if (!options.onSpanCaptured) droppedUnfinishedSpanCount++;
					continue;
				}
				options.onSpanCaptured?.(descendant);
				spans.push(spanJSON);
			}
			const client = capturedSpanScope?.getClient() || getClient();
			if (droppedUnfinishedSpanCount) client?.recordDroppedEvent("invalid", "span", droppedUnfinishedSpanCount);
			if (spans.length > MAX_SPAN_COUNT) client?.recordDroppedEvent("buffer_overflow", "span", spans.length - MAX_SPAN_COUNT);
			const source = this._attributes[qb$1];
			delete this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
			let hasGenAiSpans = false;
			spans.forEach((span) => {
				delete span.data[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
				if (span.op?.startsWith("gen_ai.")) hasGenAiSpans = true;
			});
			const transaction = {
				contexts: { trace: spanToTransactionTraceContext(this) },
				spans: spans.length > MAX_SPAN_COUNT ? spans.sort((a, b) => a.start_timestamp - b.start_timestamp).slice(0, MAX_SPAN_COUNT) : spans,
				start_timestamp: this._startTime,
				timestamp: this._endTime,
				transaction: this._name,
				type: "transaction",
				sdkProcessingMetadata: {
					capturedSpanScope,
					capturedSpanIsolationScope,
					dynamicSamplingContext: getDynamicSamplingContextFromSpan(this),
					hasGenAiSpans
				},
				request: normalizedRequest,
				...source && { transaction_info: { source } }
			};
			const measurements = timedEventsToMeasurements(this._events);
			if (measurements && Object.keys(measurements).length) {
				debug$1.log("[Measurements] Adding measurements to transaction event", JSON.stringify(measurements, void 0, 2));
				transaction.measurements = measurements;
			}
			return transaction;
		}
	};
	function timeInputToSeconds(span, input) {
		return spanIsTracerProviderSpan(span) ? otelTimeInputToSeconds(input) : spanTimeInputToSeconds(input);
	}
	function isSpanTimeInput(value) {
		return value && typeof value === "number" || value instanceof Date || Array.isArray(value);
	}
	function isFullFinishedSpan(input) {
		return !!input.start_timestamp && !!input.timestamp && !!input.span_id && !!input.trace_id;
	}
	/**
	* `SentrySpan`s can be sent on their own (as a v2 streamed span) rather than as part of a transaction.
	*
	* TODO(standalone): remove once the static (transaction) trace lifecycle is dropped.
	*/
	function isStandaloneSpan(span) {
		return span instanceof SentrySpan && span.isStandaloneSpan();
	}
	/**
	* Sends a single span on its own, as a v2 streamed span envelope.
	*
	* Used for standalone spans (e.g. a late INP web vital when span streaming is disabled): they are
	* not part of a transaction and are not handled by the span streaming buffer, so we serialize and
	* send them here directly.
	*
	* TODO(standalone): remove once the static (transaction) trace lifecycle is dropped.
	*/
	function sendStandaloneSpan(span, client) {
		const { beforeSendSpan, traceLifecycle } = client.getOptions();
		if (traceLifecycle === "static" && isStaticBeforeSendSpanCallback(beforeSendSpan)) {
			const serializedSpan = captureStandaloneSpanWithStaticCallback(span, client, beforeSendSpan);
			const dsc = getDynamicSamplingContextFromSpan(span);
			client.sendEnvelope(createStreamedSpanEnvelope([serializedSpan], dsc, client));
			return;
		}
		const { _segmentSpan, _segmentNameAtCapture, ...serializedSpan } = captureSpan(span, client);
		const dsc = getDynamicSamplingContextFromSpan(_segmentSpan);
		client.sendEnvelope(createStreamedSpanEnvelope([serializedSpan], dsc, client));
	}
	// ../core/build/esm/tracing/trace.js
	/**
	* Wraps a function with a transaction/span and finishes the span after the function is done.
	* The created span is the active span and will be used as parent by other spans created inside the function
	* and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
	*
	* If you want to create a span that is not set as active, use {@link startInactiveSpan}.
	*
	* You'll always get a span passed to the callback,
	* it may just be a non-recording span if the span is not sampled or if tracing is disabled.
	*/
	function startSpan$1(options, callback) {
		const spanArguments = parseSentrySpanArguments(options);
		const { forceTransaction, parentSpan: customParentSpan, scope: customScope } = options;
		const customForkedScope = customScope?.clone();
		return withScope(customForkedScope, () => {
			return getActiveSpanWrapper(customParentSpan)(() => {
				const scope = getCurrentScope();
				const parentSpan = getParentSpan(customScope ?? scope, customParentSpan);
				const client = getClient();
				const activeSpan = options.onlyIfParent && !parentSpan ? startMissingRequiredParentSpan(scope, client) : createChildOrRootSpan({
					parentSpan,
					spanArguments,
					forceTransaction,
					scope
				});
				return runCallback(activeSpan, !spanIsIgnored(activeSpan) || !parentSpan, () => callback(activeSpan), () => activeSpan.end());
			});
		});
	}
	/**
	* Similar to `Sentry.startSpan`. Wraps a function with a transaction/span, but does not finish the span
	* after the function is done automatically. Use `span.end()` to end the span.
	*
	* The created span is the active span and will be used as parent by other spans created inside the function
	* and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
	*
	* You'll always get a span passed to the callback,
	* it may just be a non-recording span if the span is not sampled or if tracing is disabled.
	*/
	function startSpanManual$1(options, callback) {
		const spanArguments = parseSentrySpanArguments(options);
		const { forceTransaction, parentSpan: customParentSpan, scope: customScope } = options;
		const customForkedScope = customScope?.clone();
		return withScope(customForkedScope, () => {
			return getActiveSpanWrapper(customParentSpan)(() => {
				const scope = getCurrentScope();
				const parentSpan = getParentSpan(customScope ?? scope, customParentSpan);
				const activeSpan = options.onlyIfParent && !parentSpan ? startMissingRequiredParentSpan(scope, getClient()) : createChildOrRootSpan({
					parentSpan,
					spanArguments,
					forceTransaction,
					scope
				});
				return runCallback(activeSpan, !spanIsIgnored(activeSpan) || !parentSpan, () => callback(activeSpan, () => activeSpan.end()));
			});
		});
	}
	/**
	* Creates a span. This span is not set as active, so will not get automatic instrumentation spans
	* as children or be able to be accessed via `Sentry.getActiveSpan()`.
	*
	* If you want to create a span that is set as active, use {@link startSpan}.
	*
	* This function will always return a span,
	* it may just be a non-recording span if the span is not sampled or if tracing is disabled.
	*/
	function startInactiveSpan$1(options) {
		const spanArguments = parseSentrySpanArguments(options);
		const { forceTransaction, parentSpan: customParentSpan, scope: customScope } = options;
		return (customScope ? (callback) => withScope(customScope, callback) : customParentSpan !== void 0 ? (callback) => withActiveSpan(customParentSpan, callback) : (callback) => callback())(() => {
			const scope = getCurrentScope();
			const parentSpan = getParentSpan(customScope ?? scope, customParentSpan);
			const client = getClient();
			if (options.onlyIfParent && !parentSpan) return startMissingRequiredParentSpan(scope, client);
			return createChildOrRootSpan({
				parentSpan,
				spanArguments,
				forceTransaction,
				scope
			});
		});
	}
	/**
	* Continue a trace from `sentry-trace` and `baggage` values.
	* These values can be obtained from incoming request headers, or in the browser from `<meta name="sentry-trace">`
	* and `<meta name="baggage">` HTML tags.
	*
	* Spans started with `startSpan`, `startSpanManual` and `startInactiveSpan`, within the callback will automatically
	* be attached to the incoming trace.
	*/
	const continueTrace = (options, callback) => {
		const acs = getAsyncContextStrategy(getMainCarrier());
		if (acs.continueTrace) return acs.continueTrace(options, callback);
		const { sentryTrace, baggage } = options;
		const client = getClient();
		const incomingDsc = baggageHeaderToDynamicSamplingContext(baggage);
		if (client && !shouldContinueTrace(client, incomingDsc?.org_id)) return startNewTrace(callback);
		return withScope((scope) => {
			const propagationContext = propagationContextFromHeaders(sentryTrace, baggage);
			scope.setPropagationContext(propagationContext);
			return withActiveSpan(null, callback);
		});
	};
	/**
	* Forks the current scope and sets the provided span as active span in the context of the provided callback. Can be
	* passed `null` to start an entirely new span tree.
	*
	* @param span Spans started in the context of the provided callback will be children of this span. If `null` is passed,
	* spans started within the callback will not be attached to a parent span.
	* @param callback Execution context in which the provided span will be active. Is passed the newly forked scope.
	* @returns the value returned from the provided callback function.
	*/
	function withActiveSpan(span, callback) {
		const acs = getAcs();
		if (acs.withActiveSpan) return acs.withActiveSpan(span, callback);
		return withScope((scope) => {
			_setSpanForScope(scope, span || void 0);
			return callback(scope);
		});
	}
	/** Suppress tracing in the given callback, ensuring no spans are generated inside of it. */
	function suppressTracing(callback) {
		const acs = getAcs();
		if (acs.suppressTracing) return acs.suppressTracing(callback);
		return withScope((scope) => {
			scope.setSDKProcessingMetadata({ [SUPPRESS_TRACING_KEY]: true });
			return callback();
		});
	}
	/** Check if tracing is suppressed. */
	function isTracingSuppressed(scope = getCurrentScope()) {
		const acs = getAcs();
		if (acs.isTracingSuppressed) return acs.isTracingSuppressed(scope);
		return scope.getScopeData().sdkProcessingMetadata[SUPPRESS_TRACING_KEY] === true;
	}
	/**
	* Starts a new trace for the duration of the provided callback. Spans started within the
	* callback will be part of the new trace instead of a potentially previously started trace.
	*
	* Important: Only use this function if you want to override the default trace lifetime and
	* propagation mechanism of the SDK for the duration and scope of the provided callback.
	* The newly created trace will also be the root of a new distributed trace, for example if
	* you make http requests within the callback.
	* This function might be useful if the operation you want to instrument should not be part
	* of a potentially ongoing trace.
	*
	* Default behavior:
	* - Server-side: A new trace is started for each incoming request.
	* - Browser: A new trace is started for each page our route. Navigating to a new route
	*            or page will automatically create a new trace.
	*/
	function startNewTrace(callback) {
		const acs = getAcs();
		if (acs.startNewTrace) return acs.startNewTrace(callback);
		return withActiveSpan(null, () => {
			return withScope((scope) => {
				scope.setPropagationContext({
					traceId: generateTraceId(),
					sampleRand: safeMathRandom()
				});
				debug$1.log(`Starting a new trace with id ${scope.getPropagationContext().traceId}`);
				return callback();
			});
		});
	}
	/**
	* The placeholder returned from `startSpan*` when `onlyIfParent` is set but there is no parent span.
	* It carries the current trace id and captured scopes so the trace data it propagates (and any nested
	* span that resolves it as its root via `getRootSpan`) reads its DSC from the scope, preserving a
	* continued trace's DSC instead of fabricating a fresh client one. Also records the dropped-span outcome.
	*/
	function startMissingRequiredParentSpan(scope, client) {
		client?.recordDroppedEvent("no_parent_span", "span");
		const span = new SentryNonRecordingSpan({
			dropReason: "no_parent_span",
			traceId: scope.getPropagationContext().traceId
		});
		setCapturedScopesOnSpan(span, scope, getIsolationScope());
		return span;
	}
	function createChildOrRootSpan({ parentSpan: resolvedParentSpan, spanArguments, forceTransaction, scope: currentScope }) {
		const isolationScope = getIsolationScope();
		const spanScope = {
			scope: currentScope,
			parentSpan: resolvedParentSpan
		};
		getClient()?.emit("prepareSpanScope", spanScope);
		const { scope, parentSpan } = spanScope;
		if (!hasSpansEnabled()) {
			const scopePropagationContext = scope.getPropagationContext();
			const span = new SentryNonRecordingSpan({ traceId: parentSpan ? parentSpan.spanContext().traceId : scopePropagationContext.traceId });
			if (parentSpan && !forceTransaction) addChildSpanToSpan(parentSpan, span);
			setCapturedScopesOnSpan(span, scope, isolationScope);
			return span;
		}
		const client = getClient();
		if (_shouldIgnoreStreamedSpan(client, spanArguments)) {
			if (!isTracingSuppressed(scope)) client?.recordDroppedEvent("ignored", "span");
			const ignoredSpan = new SentryNonRecordingSpan({
				dropReason: "ignored",
				traceId: parentSpan?.spanContext().traceId ?? scope.getPropagationContext().traceId
			});
			if (parentSpan && !forceTransaction) addChildSpanToSpan(parentSpan, ignoredSpan);
			setCapturedScopesOnSpan(ignoredSpan, scope, isolationScope);
			return ignoredSpan;
		}
		let span;
		if (parentSpan && !forceTransaction) {
			span = _startChildSpan(parentSpan, scope, spanArguments, isolationScope);
			addChildSpanToSpan(parentSpan, span);
		} else if (parentSpan) {
			const dsc = getDynamicSamplingContextFromSpan(parentSpan);
			const { traceId, spanId: parentSpanId } = parentSpan.spanContext();
			const parentSampled = spanIsSampled(parentSpan);
			span = _startRootSpan({
				traceId,
				parentSpanId,
				...spanArguments
			}, scope, isolationScope, parentSampled);
			freezeDscOnSpan(span, dsc);
		} else {
			const { traceId, dsc, parentSpanId, sampled: parentSampled, sampleRand } = scope.getPropagationContext();
			span = _startRootSpan({
				traceId,
				parentSpanId,
				...spanArguments
			}, scope, isolationScope, parentSampled);
			if (dsc) {
				const dscWithSampleRand = Object.keys(dsc).length === 0 && sampleRand !== void 0 ? { sample_rand: sampleRand.toString() } : dsc;
				freezeDscOnSpan(span, dscWithSampleRand);
			}
		}
		logSpanStart(span);
		return span;
	}
	/**
	* This converts StartSpanOptions to SentrySpanArguments.
	* For the most part (for now) we accept the same options,
	* but some of them need to be transformed.
	*/
	function parseSentrySpanArguments(options) {
		const initialCtx = {
			isStandalone: options.experimental?.standalone,
			...options
		};
		if (options.op) initialCtx.attributes = {
			[yb]: options.op,
			...options.attributes
		};
		if (options.startTime) {
			const ctx = { ...initialCtx };
			ctx.startTimestamp = spanTimeInputToSeconds(options.startTime);
			delete ctx.startTime;
			return ctx;
		}
		return initialCtx;
	}
	function getAcs() {
		return getAsyncContextStrategy(getMainCarrier());
	}
	/**
	* Runs the callback with the span active. When the async context strategy bridges to an ambient
	* context (OTel), activation must go through it so the span lands on that context and
	* instrumentation-created child spans nest under it; the scope alone is not consulted there.
	*/
	function _startRootSpan(spanArguments, scope, isolationScope, parentSampled) {
		const client = getClient();
		const options = client?.getOptions() || {};
		const { name = "" } = spanArguments;
		const mutableSpanSamplingData = {
			spanAttributes: { ...spanArguments.attributes },
			spanName: name,
			parentSampled
		};
		client?.emit("beforeSampling", mutableSpanSamplingData, { decision: false });
		const finalParentSampled = mutableSpanSamplingData.parentSampled ?? parentSampled;
		const finalAttributes = mutableSpanSamplingData.spanAttributes;
		const currentPropagationContext = scope.getPropagationContext();
		const _isTracingSuppressed = isTracingSuppressed(scope);
		const [sampled, sampleRate, localSampleRateWasApplied, dropReason] = _isTracingSuppressed ? [false] : sampleSpan(options, {
			name,
			parentSampled: finalParentSampled,
			attributes: finalAttributes,
			normalizedRequest: isolationScope.getScopeData().sdkProcessingMetadata.normalizedRequest,
			parentSampleRate: parseSampleRate(currentPropagationContext.dsc?.sample_rate)
		}, currentPropagationContext.sampleRand);
		const rootSpan = new SentrySpan({
			...spanArguments,
			attributes: {
				[qb$1]: "custom",
				[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE]: sampleRate !== void 0 && localSampleRateWasApplied ? sampleRate : void 0,
				...finalAttributes
			},
			sampled
		});
		if (!sampled && client && !_isTracingSuppressed) {
			debug$1.log("[Tracing] Discarding root span because its trace was not chosen to be sampled.");
			const outcomeReason = dropReason || "sample_rate";
			if (!hasSpanStreamingEnabled(client) && !spanArguments.isStandalone) client.recordDroppedEvent(outcomeReason, "transaction");
			client.recordDroppedEvent(outcomeReason, "span");
		}
		setCapturedScopesOnSpan(rootSpan, scope, isolationScope);
		if (client) client.emit("spanStart", rootSpan);
		return rootSpan;
	}
	/**
	* Creates a new `Span` while setting the current `Span.id` as `parentSpanId`.
	* This inherits the sampling decision from the parent span.
	*/
	function _startChildSpan(parentSpan, scope, spanArguments, isolationScope) {
		const { spanId, traceId } = parentSpan.spanContext();
		const _isTracingSuppressed = isTracingSuppressed(scope);
		const sampled = _isTracingSuppressed ? false : spanIsSampled(parentSpan);
		const childSpan = sampled ? new SentrySpan({
			...spanArguments,
			parentSpanId: spanId,
			traceId,
			sampled
		}) : new SentryNonRecordingSpan({ traceId });
		addChildSpanToSpan(parentSpan, childSpan);
		setCapturedScopesOnSpan(childSpan, scope, isolationScope);
		const client = getClient();
		if (!client) return childSpan;
		if (spanIsNonRecordingSpan(childSpan)) {
			if (spanIsNonRecordingSpan(parentSpan) && parentSpan.dropReason) {
				childSpan.dropReason = parentSpan.dropReason;
				client.recordDroppedEvent(parentSpan.dropReason, "span");
			} else if (!_isTracingSuppressed) {
				childSpan.dropReason = "sample_rate";
				client.recordDroppedEvent("sample_rate", "span");
			}
		}
		client.emit("spanStart", childSpan);
		return childSpan;
	}
	function getParentSpan(scope, customParentSpan) {
		if (customParentSpan) return customParentSpan;
		if (customParentSpan === null) return;
		const span = getActiveSpan(scope);
		if (!span) return;
		const client = getClient();
		if ((client ? client.getOptions() : {}).parentSpanIsAlwaysRootSpan) return getRootSpan(span);
		return span;
	}
	function getActiveSpanWrapper(parentSpan) {
		return parentSpan !== void 0 ? (callback) => {
			return withActiveSpan(parentSpan, callback);
		} : (callback) => callback();
	}
	function _shouldIgnoreStreamedSpan(client, spanArguments) {
		const ignoreSpans = client?.getOptions().ignoreSpans;
		if (!client || !hasSpanStreamingEnabled(client) || !ignoreSpans?.length) return false;
		return shouldIgnoreSpan({
			description: spanArguments.name || "",
			op: spanArguments.attributes?.["sentry.op"] || spanArguments.op,
			attributes: spanArguments.attributes
		}, ignoreSpans);
	}
	/**
	* Whether a span is an ignored (`ignoreSpans`) placeholder. Such a span must not be set as the active
	* span when it has a parent, so its children attach to that parent and get re-parented rather than
	* dropped with it. Shared with the OTel-based provider so both span pipelines apply the same rule.
	*/
	function spanIsIgnored(span) {
		return spanIsNonRecordingSpan(span) && span.dropReason === "ignored";
	}
	function runCallback(span, makeSpanActive, callback, finallyCallback) {
		return (makeSpanActive ? (callback) => {
			return withActiveSpan(span, () => {
				const scope = getCurrentScope();
				const creationScope = getCapturedScopesOnSpan(span).scope;
				if (creationScope) scope.setPropagationContext(creationScope.getPropagationContext());
				setCapturedScopesOnSpan(span, scope, getIsolationScope());
				return callback();
			});
		} : (callback) => callback())(() => handleCallbackErrors(() => callback(), (error) => {
			recordEscapedErrorSpan(error, span);
			const { status } = spanToStaticSpanJSON(span);
			if (span.isRecording() && status === "ok") span.setStatus({
				code: 2,
				message: "internal_error"
			});
		}, finallyCallback));
	}
	// ../core/build/esm/tracing/browserSpanApi.js
	/**
	* Browser variants of the span-start APIs.
	*
	* These exist purely so that the span streaming integration is only reachable from code that can
	* actually start a span. `@sentry/browser`'s `init()` deliberately doesn't reference spanStreamingIntegration,
	* so error-only apps tree-shake the entire span streaming graph away without needing
	* the `__SENTRY_TRACING__` flag.
	*/
	const clientsWithIntegration = /* @__PURE__ */ new WeakSet();
	/**
	* Lazily install the browser span streaming integration.
	*
	* Defaults to the current client; pass one explicitly from integration hooks, where the client being
	* set up isn't necessarily the current one.
	*
	* @internal
	*/
	function _INTERNAL_ensureBrowserSpanStreaming(client = getClient()) {
		if (!client || clientsWithIntegration.has(client) || !hasSpanStreamingEnabled(client)) return;
		clientsWithIntegration.add(client);
		client.addIntegration(spanStreamingIntegration());
	}
	/**
	* Wraps a function with a span and finishes the span after the function is done.
	*
	* See {@link startSpan} in `@sentry/core` for details.
	*/
	function startSpan(options, callback) {
		_INTERNAL_ensureBrowserSpanStreaming();
		return startSpan$1(options, callback);
	}
	/**
	* Similar to `startSpan`, but forces the span to be ended manually.
	*
	* See {@link startSpanManual} in `@sentry/core` for details.
	*/
	function startSpanManual(options, callback) {
		_INTERNAL_ensureBrowserSpanStreaming();
		return startSpanManual$1(options, callback);
	}
	/**
	* Creates a span that is not set as active.
	*
	* See {@link startInactiveSpan} in `@sentry/core` for details.
	*/
	function startInactiveSpan(options) {
		_INTERNAL_ensureBrowserSpanStreaming();
		return startInactiveSpan$1(options);
	}
	// ../core/build/esm/tracing/idleSpan.js
	const TRACING_DEFAULTS = {
		idleTimeout: 1e3,
		finalTimeout: 3e4,
		childSpanTimeout: 15e3
	};
	const FINISH_REASON_HEARTBEAT_FAILED = "heartbeatFailed";
	const FINISH_REASON_IDLE_TIMEOUT = "idleTimeout";
	const FINISH_REASON_FINAL_TIMEOUT = "finalTimeout";
	const FINISH_REASON_EXTERNAL_FINISH = "externalFinish";
	/**
	* An idle span is a span that automatically finishes. It does this by tracking child spans as activities.
	* An idle span is always the active span.
	*/
	function startIdleSpan(startSpanOptions, options = {}) {
		const client = getClient();
		_INTERNAL_ensureBrowserSpanStreaming(client);
		const activities = /* @__PURE__ */ new Map();
		let _finished = false;
		let _idleTimeoutID;
		let _childSpanTimeoutID;
		let _finishReason = FINISH_REASON_EXTERNAL_FINISH;
		let _autoFinishAllowed = !options.disableAutoFinish;
		const _cleanupHooks = [];
		const { idleTimeout = TRACING_DEFAULTS.idleTimeout, finalTimeout = TRACING_DEFAULTS.finalTimeout, childSpanTimeout = TRACING_DEFAULTS.childSpanTimeout, trimIdleSpanEndTimestamp = true } = options;
		const scope = getCurrentScope();
		if (!client || !hasSpansEnabled()) {
			const span = new SentryNonRecordingSpan({ traceId: scope.getPropagationContext().traceId });
			setCapturedScopesOnSpan(span, scope, getIsolationScope());
			return span;
		}
		const previousActiveSpan = getActiveSpan();
		const span = startInactiveSpan$1(startSpanOptions);
		_setSpanForScope(getCurrentScope(), span);
		debug$1.log("[Tracing] Started span is an idle span");
		span.end = new Proxy(span.end, { apply(target, thisArg, args) {
			client.emit("beforeIdleSpanEnd", span);
			if (spanIsNonRecordingSpan(thisArg)) return;
			const [definedEndTimestamp, ...rest] = args;
			const spanEndTimestamp = spanTimeInputToSeconds(definedEndTimestamp || timestampInSeconds());
			const spans = getSpanDescendants(span).filter((child) => child !== span);
			const spanJson = spanToStaticSpanJSON(span);
			if (!spans.length || !trimIdleSpanEndTimestamp) {
				onIdleSpanEnded(spanEndTimestamp);
				return Reflect.apply(target, thisArg, [spanEndTimestamp, ...rest]);
			}
			const ignoreSpans = client.getOptions().ignoreSpans;
			const latestSpanEndTimestamp = spans?.reduce((acc, current) => {
				const currentSpanJson = spanToStaticSpanJSON(current);
				if (!currentSpanJson.timestamp) return acc;
				if (ignoreSpans && shouldIgnoreSpan({
					description: currentSpanJson.description,
					op: currentSpanJson.op,
					attributes: currentSpanJson.data
				}, ignoreSpans)) return acc;
				return acc ? Math.max(acc, currentSpanJson.timestamp) : currentSpanJson.timestamp;
			}, void 0);
			const spanStartTimestamp = spanJson.start_timestamp;
			const endTimestamp = Math.min(spanStartTimestamp ? spanStartTimestamp + finalTimeout / 1e3 : 1e400, Math.max(spanStartTimestamp || -1e400, Math.min(spanEndTimestamp, latestSpanEndTimestamp || 1e400)));
			onIdleSpanEnded(endTimestamp);
			return Reflect.apply(target, thisArg, [endTimestamp, ...rest]);
		} });
		/**
		* Cancels the existing idle timeout, if there is one.
		*/
		function _cancelIdleTimeout() {
			if (_idleTimeoutID) {
				clearTimeout(_idleTimeoutID);
				_idleTimeoutID = void 0;
			}
		}
		/**
		* Cancels the existing child span timeout, if there is one.
		*/
		function _cancelChildSpanTimeout() {
			if (_childSpanTimeoutID) {
				clearTimeout(_childSpanTimeoutID);
				_childSpanTimeoutID = void 0;
			}
		}
		/**
		* Restarts idle timeout, if there is no running idle timeout it will start one.
		*/
		function _restartIdleTimeout(endTimestamp) {
			_cancelIdleTimeout();
			_idleTimeoutID = setTimeout(() => {
				if (!_finished && activities.size === 0 && _autoFinishAllowed) {
					_finishReason = FINISH_REASON_IDLE_TIMEOUT;
					span.end(endTimestamp);
				}
			}, idleTimeout);
		}
		/**
		* Restarts child span timeout, if there is none running it will start one.
		*/
		function _restartChildSpanTimeout(endTimestamp) {
			_cancelChildSpanTimeout();
			_childSpanTimeoutID = setTimeout(() => {
				if (!_finished && _autoFinishAllowed) {
					_finishReason = FINISH_REASON_HEARTBEAT_FAILED;
					span.end(endTimestamp);
				}
			}, childSpanTimeout);
		}
		/**
		* Start tracking a specific activity.
		* @param spanId The span id that represents the activity
		*/
		function _pushActivity(spanId) {
			_cancelIdleTimeout();
			activities.set(spanId, true);
			_restartChildSpanTimeout(timestampInSeconds() + childSpanTimeout / 1e3);
		}
		/**
		* Remove an activity from usage
		* @param spanId The span id that represents the activity
		*/
		function _popActivity(spanId) {
			if (activities.has(spanId)) activities.delete(spanId);
			if (activities.size === 0) {
				_restartIdleTimeout(timestampInSeconds() + idleTimeout / 1e3);
				_cancelChildSpanTimeout();
			}
		}
		function onIdleSpanEnded(endTimestamp) {
			_finished = true;
			activities.clear();
			_cleanupHooks.forEach((cleanup) => cleanup());
			_setSpanForScope(scope, previousActiveSpan);
			const spanJSON = spanToStaticSpanJSON(span);
			const { start_timestamp: startTimestamp } = spanJSON;
			if (!startTimestamp) return;
			if (!spanJSON.data["sentry.idle_span_finish_reason"]) span.setAttribute(Zm, _finishReason);
			const currentStatus = spanJSON.status;
			if (!currentStatus || currentStatus === "unknown") span.setStatus({ code: 1 });
			debug$1.log(`[Tracing] Idle span "${spanJSON.op}" finished`);
			const childSpans = getSpanDescendants(span).filter((child) => child !== span);
			let discardedSpans = 0;
			childSpans.forEach((childSpan) => {
				if (childSpan.isRecording()) {
					childSpan.setStatus({
						code: 2,
						message: "cancelled"
					});
					childSpan.end(endTimestamp);
					debug$1.log("[Tracing] Cancelling span since span ended early", JSON.stringify(childSpan, void 0, 2));
				}
				const { timestamp: childEndTimestamp = 0, start_timestamp: childStartTimestamp = 0 } = spanToStaticSpanJSON(childSpan);
				const spanStartedBeforeIdleSpanEnd = childStartTimestamp <= endTimestamp;
				const timeoutWithMarginOfError = (finalTimeout + idleTimeout) / 1e3;
				const spanEndedBeforeFinalTimeout = childEndTimestamp - childStartTimestamp <= timeoutWithMarginOfError;
				{
					const stringifiedSpan = JSON.stringify(childSpan, void 0, 2);
					if (!spanStartedBeforeIdleSpanEnd) debug$1.log("[Tracing] Discarding span since it happened after idle span was finished", stringifiedSpan);
					else if (!spanEndedBeforeFinalTimeout) debug$1.log("[Tracing] Discarding span since it finished after idle span final timeout", stringifiedSpan);
				}
				if (!spanEndedBeforeFinalTimeout || !spanStartedBeforeIdleSpanEnd) {
					removeChildSpanFromSpan(span, childSpan);
					discardedSpans++;
				}
			});
			if (discardedSpans > 0) span.setAttribute("sentry.idle_span_discarded_spans", discardedSpans);
		}
		_cleanupHooks.push(client.on("spanStart", (startedSpan) => {
			if (_finished || startedSpan === span || !!spanToJSON(startedSpan).end_timestamp || startedSpan instanceof SentrySpan && startedSpan.isStandaloneSpan()) return;
			if (getSpanDescendants(span).includes(startedSpan)) _pushActivity(startedSpan.spanContext().spanId);
		}));
		_cleanupHooks.push(client.on("spanEnd", (endedSpan) => {
			if (_finished) return;
			_popActivity(endedSpan.spanContext().spanId);
		}));
		_cleanupHooks.push(client.on("idleSpanEnableAutoFinish", (spanToAllowAutoFinish) => {
			if (spanToAllowAutoFinish === span) {
				_autoFinishAllowed = true;
				_restartIdleTimeout();
				if (activities.size) _restartChildSpanTimeout();
			}
		}));
		if (!options.disableAutoFinish) _restartIdleTimeout();
		setTimeout(() => {
			if (!_finished) {
				span.setStatus({
					code: 2,
					message: "deadline_exceeded"
				});
				_finishReason = FINISH_REASON_FINAL_TIMEOUT;
				span.end();
			}
		}, finalTimeout);
		return span;
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
	// ../../node_modules/.pnpm/@sentry+conventions@0.33.0/node_modules/@sentry/conventions/dist/op.mjs
	const e$1 = "pageload";
	const E$1 = "navigation";
	const _$1 = "navigation.redirect";
	const u$1 = "resource.other";
	const s$1 = "browser.paint";
	const S$1 = "browser.unload_event";
	const d$1 = "browser.redirect";
	const l$1 = "browser.dom_content_loaded_event";
	const D$1 = "browser.load_event";
	const L$1 = "browser.connect";
	const p$1 = "browser.tls_ssl";
	const P$1 = "browser.cache";
	const m$1 = "browser.dns";
	const M$1 = "browser.request";
	const b$1 = "browser.response";
	const h$1 = "ui.long_task";
	const q$1 = "ui.long_animation_frame";
	const H$1 = "ui.interaction.click";
	const Q = "ui.interaction.hover";
	const k$1 = "ui.interaction.drag";
	const K = "ui.interaction.press";
	const j = "ui.webvital.lcp";
	const J = "ui.webvital.cls";
	const CE = "http.client";
	const nE = "http.client.stream";
	// ../core/build/esm/tracing/spans/spanNames.js
	/**
	* Fallback name for pageload spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#browser-pageload
	*/
	const PAGELOAD_SPAN_NAME_FALLBACK = "Pageload";
	/**
	* Fallback name for navigation spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#browser-navigation
	*/
	const NAVIGATION_SPAN_NAME_FALLBACK = "Navigation";
	/**
	* Fallback name for ui.long_task and ui.long_animation_frame spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#ui-main-ui-thread-blocked
	*/
	const UI_LONG_TASK_SPAN_NAME_FALLBACK = "Main UI thread blocked";
	/**
	* Fallback name for ui.interaction.click spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#ui-click-interaction
	*/
	const UI_INTERACTION_CLICK_SPAN_NAME_FALLBACK = "Click";
	/**
	* Fallback name for ui.interaction.hover spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#ui-hover-interaction
	*/
	const UI_INTERACTION_HOVER_SPAN_NAME_FALLBACK = "Hover";
	/**
	* Fallback name for ui.interaction.drag spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#ui-drag-interaction
	*/
	const UI_INTERACTION_DRAG_SPAN_NAME_FALLBACK = "Drag";
	/**
	* Fallback name for ui.interaction.press spans when no better-suited span name is available.
	* @see https://conventions.sentry.dev/names/#ui-key-press-interaction
	*/
	const UI_INTERACTION_PRESS_SPAN_NAME_FALLBACK = "Key press";
	/**
	* Span names for the browser navigation timing ops, keyed by op. None of these ops has an attribute
	* template, so the static name is the only name they can get.
	* @see https://conventions.sentry.dev/names/#browser-navigation-timing
	*/
	const BROWSER_NAVIGATION_TIMING_SPAN_NAMES = {
		[P$1]: "Cache lookup",
		[m$1]: "DNS lookup",
		[L$1]: "Connect",
		[p$1]: "TLS handshake",
		[d$1]: "Redirect",
		[M$1]: "Request",
		[b$1]: "Response",
		[S$1]: "Unload event",
		[l$1]: "DOMContentLoaded event",
		[D$1]: "Load event"
	};
	// ../core/build/esm/envelope.js
	/**
	* Apply SdkInfo (name, version, packages, integrations) to the corresponding event key.
	* Merge with existing data if any.
	*
	* @internal, exported only for testing
	**/
	function _enhanceEventWithSdkInfo(event, newSdkInfo) {
		if (!newSdkInfo) return event;
		const eventSdkInfo = event.sdk || {};
		event.sdk = {
			...eventSdkInfo,
			name: eventSdkInfo.name || newSdkInfo.name,
			version: eventSdkInfo.version || newSdkInfo.version,
			integrations: [...event.sdk?.integrations || [], ...newSdkInfo.integrations || []],
			packages: [...event.sdk?.packages || [], ...newSdkInfo.packages || []],
			settings: event.sdk?.settings || newSdkInfo.settings ? {
				...event.sdk?.settings,
				...newSdkInfo.settings
			} : void 0
		};
		return event;
	}
	/** Creates an envelope from a Session */
	function createSessionEnvelope(session, dsn, metadata, tunnel) {
		const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
		return createEnvelope({
			sent_at: new Date(safeDateNow()).toISOString(),
			...sdkInfo && { sdk: sdkInfo },
			...!!tunnel && dsn && { dsn: dsnToString(dsn) }
		}, ["aggregates" in session ? [{ type: "sessions" }, session] : [{ type: "session" }, session.toJSON()]]);
	}
	/**
	* Create an Envelope from an event.
	*/
	function createEventEnvelope(event, dsn, metadata, tunnel) {
		const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
		const eventType = event.type && event.type !== "replay_event" ? event.type : "event";
		_enhanceEventWithSdkInfo(event, metadata?.sdk);
		const envelopeHeaders = createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn);
		delete event.sdkProcessingMetadata;
		return createEnvelope(envelopeHeaders, [[{ type: eventType }, event]]);
	}
	// ../core/build/esm/utils/data-collection/filtering-snippets.js
	const FILTERED_VALUE = "[Filtered]";
	const SENSITIVE_KEY_SNIPPETS = [
		"auth",
		"token",
		"secret",
		"session",
		"password",
		"passwd",
		"pwd",
		"key",
		"jwt",
		"bearer",
		"sso",
		"saml",
		"csrf",
		"xsrf",
		"credentials",
		"sid",
		"identity",
		"set-cookie",
		"cookie"
	];
	// ../core/build/esm/utils/data-collection/filterKeyValueData.js
	function isSensitiveKey(lower, denySnippets) {
		return denySnippets.some((snippet) => lower.includes(snippet));
	}
	function shouldFilterDataKey(key, behavior, additionalDenyTerms) {
		if (behavior === false) return true;
		const lowerKey = key.toLowerCase();
		if (isSensitiveKey(lowerKey, additionalDenyTerms != null ? [...SENSITIVE_KEY_SNIPPETS, ...additionalDenyTerms] : SENSITIVE_KEY_SNIPPETS)) return true;
		if (behavior === true) return false;
		const matchesConfiguredTerm = ("deny" in behavior ? behavior.deny : behavior.allow).some((term) => lowerKey.includes(term.toLowerCase()));
		return "deny" in behavior ? matchesConfiguredTerm : !matchesConfiguredTerm;
	}
	/**
	* Filters a key-value record according to a `CollectBehavior`.
	*
	* Key names are always preserved. Values are either kept, replaced with
	* `[Filtered]`, or the entire record is dropped (off mode).
	*
	* @param additionalDenyTerms - Additional sensitive snippets to check beyond the built-in denylist.
	*/
	function filterKeyValueData(data, behavior, additionalDenyTerms) {
		if (behavior === false) return {};
		const result = {};
		for (const key of Object.keys(data)) result[key] = shouldFilterDataKey(key, behavior, additionalDenyTerms) ? FILTERED_VALUE : data[key];
		return result;
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
	/**
	* Get a list of possible event messages from a Sentry event.
	*/
	function getPossibleEventMessages(event) {
		const possibleMessages = [];
		if (event.message) possibleMessages.push(event.message);
		try {
			const lastException = event.exception.values[event.exception.values.length - 1];
			if (lastException?.value) {
				possibleMessages.push(lastException.value);
				if (lastException.type) possibleMessages.push(`${lastException.type}: ${lastException.value}`);
			}
		} catch {}
		return possibleMessages;
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
	* Captures a message event and sends it to Sentry.
	*
	* @param message The message to send to Sentry.
	* @param captureContext Define the level of the message or pass in additional data to attach to the message.
	* @returns the id of the captured message.
	*/
	function captureMessage(message, captureContext) {
		const level = typeof captureContext === "string" ? captureContext : void 0;
		const hint = typeof captureContext !== "string" ? { captureContext } : void 0;
		return getCurrentScope().captureMessage(message, level, hint);
	}
	/**
	* Captures a manually created event and sends it to Sentry.
	*
	* @param event The event to send to Sentry.
	* @param hint Optional additional data to attach to the Sentry event.
	* @returns the id of the captured event.
	*/
	function captureEvent(event, hint) {
		return getCurrentScope().captureEvent(event, hint);
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
	* Set an object that will be merged sent as extra data with the event.
	* @param extras Extras object to merge into current context.
	*/
	function setExtras(extras) {
		getIsolationScope().setExtras(extras);
	}
	/**
	* Set key:value that will be sent as extra data with the event.
	* @param key String of extra
	* @param extra Any kind of data. This data will be normalized.
	*/
	function setExtra(key, extra) {
		getIsolationScope().setExtra(key, extra);
	}
	/**
	* Set an object that will be merged sent as tags data with the event.
	* @param tags Tags context object to merge into current context.
	*/
	function setTags(tags) {
		getIsolationScope().setTags(tags);
	}
	/**
	* Set key:value that will be sent as tags data with the event.
	*
	* Can also be used to unset a tag, by passing `undefined`.
	*
	* @param key String key of tag
	* @param value Value of tag
	*/
	function setTag(key, value) {
		getIsolationScope().setTag(key, value);
	}
	/**
	* Sets attributes on the isolation scope.
	*
	* These attributes are applied to logs, metrics and streamed spans.
	*
	* Supported attribute value types are `string`, `number`, `boolean`, `string[]`, `number[]` and `boolean[]`.
	*
	* @param attributes - The attributes to set on the scope, as key-value pairs.
	*
	* @example
	* ```typescript
	* Sentry.setAttributes({
	*   is_admin: true,
	*   payment_selection: 'credit_card',
	*   render_duration: 150,
	* });
	* ```
	*/
	function setAttributes(attributes) {
		getIsolationScope().setAttributes(attributes);
	}
	/**
	* Sets an attribute on the isolation scope.
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
	* Sentry.setAttribute('is_admin', true);
	* Sentry.setAttribute('render_duration', 150);
	* ```
	*/
	function setAttribute(key, value) {
		getIsolationScope().setAttribute(key, value);
	}
	/**
	* Updates user context information for future events.
	*
	* @param user User context object to be set in the current context. Pass `null` to unset the user.
	*/
	function setUser(user) {
		getIsolationScope().setUser(user);
	}
	/**
	* Sets the conversation ID for the current isolation scope.
	*
	* @param conversationId The conversation ID to set. Pass `null` or `undefined` to unset the conversation ID.
	*/
	function setConversationId(conversationId) {
		getIsolationScope().setConversationId(conversationId);
	}
	/**
	* The last error event id of the isolation scope.
	*
	* Warning: This function really returns the last recorded error event id on the current
	* isolation scope. If you call this function after handling a certain error and another error
	* is captured in between, the last one is returned instead of the one you might expect.
	* Also, ids of events that were never sent to Sentry (for example because
	* they were dropped by sampling or `beforeSend`) could be returned.
	*
	* @returns The last event id of the isolation scope.
	*/
	function lastEventId() {
		return getIsolationScope().lastEventId();
	}
	/**
	* Call `flush()` on the current client, if there is one. See {@link Client.flush}.
	*
	* @param timeout Maximum time in ms the client should wait to flush its event queue. Omitting this parameter will cause
	* the client to wait until all events are sent before resolving the promise.
	* @returns A promise which resolves to `true` if the queue successfully drains before the timeout, or `false` if it
	* doesn't (or if there's no client defined).
	*/
	async function flush(timeout) {
		const client = getClient();
		if (client) return client.flush(timeout);
		debug$1.warn("Cannot flush events. No client defined.");
		return Promise.resolve(false);
	}
	/**
	* Call `close()` on the current client, if there is one, and unbind it from the current scope.
	* See {@link Client.close}.
	*
	* @param timeout Maximum time in ms the client should wait to flush its event queue before shutting down. Omitting this
	* parameter will cause the client to wait until all events are sent before disabling itself.
	* @returns A promise which resolves to `true` if the queue successfully drains before the timeout, or `false` if it
	* doesn't (or if there's no client defined).
	*/
	async function close(timeout) {
		const scope = getCurrentScope();
		const client = scope.getClient();
		if (client) {
			const result = await client.close(timeout);
			if (scope.getClient() === client) scope.setClient(void 0);
			return result;
		}
		debug$1.warn("Cannot flush events and disable SDK. No client defined.");
		return Promise.resolve(false);
	}
	/**
	* Returns true if Sentry has been properly initialized.
	*/
	function isInitialized() {
		return !!getClient();
	}
	/** If the SDK is initialized & enabled. */
	function isEnabled() {
		const client = getClient();
		return client?.getOptions().enabled !== false && !!client?.getTransport();
	}
	/**
	* Add an event processor.
	* This will be added to the current isolation scope, ensuring any event that is processed in the current execution
	* context will have the processor applied.
	*/
	function addEventProcessor(callback) {
		getIsolationScope().addEventProcessor(callback);
	}
	/**
	* Start a session on the current isolation scope.
	*
	* @param context (optional) additional properties to be applied to the returned session object
	*
	* @returns the new active session
	*/
	function startSession(context) {
		const isolationScope = getIsolationScope();
		const { user } = getCombinedScopeData(isolationScope, getCurrentScope());
		let userAgent = GLOBAL_OBJ.navigator?.userAgent;
		if (userAgent) {
			const headerCollection = getClient()?.getDataCollectionOptions().httpHeaders.request ?? true;
			userAgent = filterKeyValueData({ "User-Agent": userAgent }, headerCollection)["User-Agent"];
		}
		const session = makeSession$1({
			user,
			userAgent,
			...context
		});
		const currentSession = isolationScope.getSession();
		if (currentSession?.status === "ok") updateSession(currentSession, { status: "exited" });
		endSession();
		isolationScope.setSession(session);
		return session;
	}
	/**
	* End the session on the current isolation scope.
	*/
	function endSession() {
		const isolationScope = getIsolationScope();
		const session = getCurrentScope().getSession() || isolationScope.getSession();
		if (session) closeSession(session);
		_sendSessionUpdate();
		isolationScope.setSession();
	}
	/**
	* Sends the current Session on the scope
	*/
	function _sendSessionUpdate() {
		const isolationScope = getIsolationScope();
		const client = getClient();
		const session = isolationScope.getSession();
		if (session && client) client.captureSession(session);
	}
	/**
	* Sends the current session on the scope to Sentry
	*
	* @param end If set the session will be marked as exited and removed from the scope.
	*            Defaults to `false`.
	*/
	function captureSession(end = false) {
		if (end) {
			endSession();
			return;
		}
		_sendSessionUpdate();
	}
	// ../core/build/esm/api.js
	/** Returns the prefix to construct Sentry ingestion API endpoints. */
	function getBaseApiEndpoint(dsn) {
		const protocol = dsn.protocol ? `${dsn.protocol}:` : "";
		const port = dsn.port ? `:${dsn.port}` : "";
		return `${protocol}//${dsn.host}${port}${dsn.path ? `/${dsn.path}` : ""}/api/`;
	}
	/** Returns the ingest API endpoint for target. */
	function _getIngestEndpoint(dsn) {
		return `${getBaseApiEndpoint(dsn)}${dsn.projectId}/envelope/`;
	}
	/** Returns a URL-encoded string with auth config suitable for a query string. */
	function _encodedAuth(dsn, sdkInfo) {
		const params = { sentry_version: "7" };
		if (dsn.publicKey) params.sentry_key = dsn.publicKey;
		if (sdkInfo) params.sentry_client = `${sdkInfo.name}/${sdkInfo.version}`;
		return new URLSearchParams(params).toString();
	}
	/**
	* Returns the envelope endpoint URL with auth in the query string.
	*
	* Sending auth as part of the query string and not as custom HTTP headers avoids CORS preflight requests.
	*/
	function getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel, sdkInfo) {
		return tunnel ? tunnel : `${_getIngestEndpoint(dsn)}?${_encodedAuth(dsn, sdkInfo)}`;
	}
	/** Returns the url to the report dialog endpoint. */
	function getReportDialogEndpoint(dsnLike, dialogOptions) {
		const dsn = makeDsn(dsnLike);
		if (!dsn) return "";
		const endpoint = `${getBaseApiEndpoint(dsn)}embed/error-page/`;
		let encodedOptions = `dsn=${dsnToString(dsn)}`;
		for (const key in dialogOptions) {
			if (key === "dsn") continue;
			if (key === "onClose" || key === "onError") continue;
			if (key === "user") {
				const user = dialogOptions.user;
				if (!user) continue;
				if (user.name) encodedOptions += `&name=${encodeURIComponent(user.name)}`;
				if (user.email) encodedOptions += `&email=${encodeURIComponent(user.email)}`;
			} else encodedOptions += `&${encodeURIComponent(key)}=${encodeURIComponent(dialogOptions[key])}`;
		}
		return `${endpoint}?${encodedOptions}`;
	}
	// ../core/build/esm/tracing/spans/extractGenAiSpans.js
	/**
	* Extracts gen_ai spans from a transaction event, converts them to span v2 format,
	* and returns them as a SpanContainerItem.
	*
	* Only applies to static mode (non-streaming) transactions.
	*
	* WARNING: This function mutates `event.spans` by removing the extracted gen_ai spans
	* from the array. Call this before creating the event envelope so the transaction
	* item does not include the extracted spans.
	*/
	function extractGenAiSpansFromEvent(event, client) {
		if (event.type !== "transaction" || !event.spans?.length || !event.sdkProcessingMetadata?.hasGenAiSpans || hasSpanStreamingEnabled(client)) return;
		const genAiSpans = [];
		const remainingSpans = [];
		for (const span of event.spans) if (span.op?.startsWith("gen_ai.")) genAiSpans.push(spanJsonToSerializedStreamedSpan(span));
		else remainingSpans.push(span);
		if (genAiSpans.length === 0) return;
		event.spans = remainingSpans;
		return createSpanContainerItem(genAiSpans, client);
	}
	// ../core/build/esm/utils/promisebuffer.js
	const SENTRY_BUFFER_FULL_ERROR = Symbol.for("SentryBufferFullError");
	/**
	* Creates an new PromiseBuffer object with the specified limit
	* @param limit max number of promises that can be stored in the buffer
	*/
	function makePromiseBuffer(limit = 100) {
		const buffer = /* @__PURE__ */ new Set();
		function isReady() {
			return buffer.size < limit;
		}
		/**
		* Remove a promise from the queue.
		*
		* @param task Can be any PromiseLike<T>
		* @returns Removed promise.
		*/
		function remove(task) {
			buffer.delete(task);
		}
		/**
		* Add a promise (representing an in-flight action) to the queue, and set it to remove itself on fulfillment.
		*
		* @param taskProducer A function producing any PromiseLike<T>; In previous versions this used to be `task:
		*        PromiseLike<T>`, but under that model, Promises were instantly created on the call-site and their executor
		*        functions therefore ran immediately. Thus, even if the buffer was full, the action still happened. By
		*        requiring the promise to be wrapped in a function, we can defer promise creation until after the buffer
		*        limit check.
		* @returns The original promise.
		*/
		function add(taskProducer) {
			if (!isReady()) return rejectedSyncPromise(SENTRY_BUFFER_FULL_ERROR);
			const task = taskProducer();
			buffer.add(task);
			task.then(() => remove(task), () => remove(task));
			return task;
		}
		/**
		* Wait for all promises in the queue to resolve or for timeout to expire, whichever comes first.
		*
		* @param timeout The time, in ms, after which to resolve to `false` if the queue is still non-empty. Passing `0` (or
		* not passing anything) will make the promise wait as long as it takes for the queue to drain before resolving to
		* `true`.
		* @returns A promise which will resolve to `true` if the queue is already empty or drains before the timeout, and
		* `false` otherwise
		*/
		function drain(timeout) {
			if (!buffer.size) return resolvedSyncPromise(true);
			const drainPromise = Promise.allSettled(Array.from(buffer)).then(() => true);
			if (!timeout) return drainPromise;
			const promises = [drainPromise, new Promise((resolve) => safeUnref(setTimeout(() => resolve(false), timeout)))];
			return Promise.race(promises);
		}
		return {
			get $() {
				return Array.from(buffer);
			},
			add,
			drain
		};
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
	// ../core/build/esm/transports/base.js
	/**
	* Creates an instance of a Sentry `Transport`
	*
	* @param options
	* @param makeRequest
	*/
	function createTransport(options, makeRequest, buffer = makePromiseBuffer(options.bufferSize || 64)) {
		let rateLimits = {};
		const flush = (timeout) => buffer.drain(timeout);
		function recordItemLoss(reason, [headers, payload], type) {
			const dataCategory = envelopeItemTypeToDataCategory(type);
			if (type === "transaction") options.recordDroppedEvent(reason, "span", (payload.spans?.length ?? 0) + 1);
			options.recordDroppedEvent(reason, dataCategory, typeof headers.item_count === "number" ? headers.item_count : 1);
		}
		function send(envelope) {
			const filteredEnvelopeItems = [];
			forEachEnvelopeItem(envelope, (item, type) => {
				if (isRateLimited(rateLimits, envelopeItemTypeToDataCategory(type))) recordItemLoss("ratelimit_backoff", item, type);
				else filteredEnvelopeItems.push(item);
			});
			if (filteredEnvelopeItems.length === 0) return Promise.resolve({});
			const filteredEnvelope = createEnvelope(envelope[0], filteredEnvelopeItems);
			const recordEnvelopeLoss = (reason) => {
				if (envelopeContainsItemType(filteredEnvelope, ["client_report"])) {
					debug$1.warn(`Dropping client report. Will not send outcomes (reason: ${reason}).`);
					return;
				}
				forEachEnvelopeItem(filteredEnvelope, (item, type) => {
					recordItemLoss(reason, item, type);
				});
			};
			const requestTask = () => makeRequest({ body: serializeEnvelope(filteredEnvelope) }).then((response) => {
				if (response.statusCode === 413) {
					debug$1.error("Sentry responded with status code 413. Envelope was discarded due to exceeding size limits.");
					recordEnvelopeLoss("send_error");
					return response;
				}
				if (response.statusCode !== void 0 && (response.statusCode < 200 || response.statusCode >= 300)) debug$1.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
				rateLimits = updateRateLimits(rateLimits, response);
				return response;
			}, (error) => {
				recordEnvelopeLoss("network_error");
				debug$1.error("Encountered error running transport request:", error);
				throw error;
			});
			return buffer.add(requestTask).then((result) => result, (error) => {
				if (error === SENTRY_BUFFER_FULL_ERROR) {
					debug$1.error("Skipped sending event because buffer is full.");
					recordEnvelopeLoss("queue_overflow");
					return Promise.resolve({});
				} else throw error;
			});
		}
		return {
			send,
			flush
		};
	}
	// ../core/build/esm/utils/clientreport.js
	/**
	* Creates client report envelope
	* @param discarded_events An array of discard events
	* @param dsn A DSN that can be set on the header. Optional.
	*/
	function createClientReportEnvelope(discarded_events, dsn, timestamp) {
		const clientReportItem = [{ type: "client_report" }, {
			timestamp: timestamp || dateTimestampInSeconds(),
			discarded_events
		}];
		return createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
	}
	// ../core/build/esm/utils/transactionEvent.js
	/**
	* Converts a transaction event to a span JSON object.
	*/
	function convertTransactionEventToSpanJson(event) {
		const { trace_id, parent_span_id, span_id, status, origin, data, op, links } = event.contexts?.trace ?? {};
		return {
			data: data ?? {},
			description: event.transaction,
			op,
			parent_span_id,
			span_id: span_id ?? "",
			start_timestamp: event.start_timestamp ?? 0,
			status: status ?? "ok",
			timestamp: event.timestamp,
			trace_id: trace_id ?? "",
			origin,
			links,
			profile_id: data?.[kb],
			exclusive_time: data?.[Wm],
			measurements: event.measurements,
			is_segment: true
		};
	}
	/**
	* Converts a span JSON object to a transaction event.
	*/
	function convertSpanJsonToTransactionEvent(span) {
		return {
			type: "transaction",
			timestamp: span.timestamp,
			start_timestamp: span.start_timestamp,
			transaction: span.description,
			contexts: { trace: {
				trace_id: span.trace_id,
				span_id: span.span_id,
				parent_span_id: span.parent_span_id,
				op: span.op,
				status: span.status,
				origin: span.origin,
				links: span.links,
				data: {
					...span.data,
					...span.profile_id && { ["sentry.profile_id"]: span.profile_id },
					...span.exclusive_time && { ["sentry.exclusive_time"]: span.exclusive_time }
				}
			} },
			measurements: span.measurements
		};
	}
	// ../core/build/esm/utils/warnAboutIgnoredTransactionOptions.js
	/**
	* Warns about `beforeSendTransaction` and `ignoreTransactions` being ignored because span streaming is enabled.
	*
	* Both options are tied to the transaction event that span streaming no longer produces, so they silently
	* stop taking effect when users upgrade. Since that's easy to miss, this warning bypasses the `debug` logger
	* (which is opt-in and stripped from non-debug bundles) and writes to the console directly.
	*/
	function maybeWarnAboutIgnoredTransactionOptions(options) {
		if (options.traceLifecycle !== "stream" || !(options.beforeSendTransaction || options.ignoreTransactions?.length)) return;
		consoleSandbox(() => {
			console.warn("[Sentry] `beforeSendTransaction` and `ignoreTransactions` are ignored with `traceLifecycle: 'stream'` (enabled by default). Use `beforeSendSpan` and `ignoreSpans` instead, or set `traceLifecycle: 'static'`.");
		});
	}
	// ../core/build/esm/utils/data-collection/resolveDataCollectionOptions.js
	const DEFAULTS = {
		userInfo: true,
		cookies: true,
		httpHeaders: {
			request: true,
			response: true
		},
		httpBodies: [
			"incomingRequest",
			"outgoingRequest",
			"incomingResponse",
			"outgoingResponse"
		],
		urlQueryParams: true,
		graphQL: {
			document: true,
			variables: true
		},
		genAI: {
			inputs: true,
			outputs: true
		},
		mcp: {
			inputs: true,
			outputs: true
		},
		databaseQueryData: true,
		queues: true,
		stackFrameVariables: true,
		frameContextLines: 5
	};
	function isCollectBehavior(value) {
		return typeof value === "boolean" || "allow" in value || "deny" in value;
	}
	function resolveHttpHeaders(httpHeaders) {
		if (httpHeaders === void 0) return { ...DEFAULTS.httpHeaders };
		if (isCollectBehavior(httpHeaders)) return {
			request: httpHeaders,
			response: httpHeaders
		};
		return {
			request: httpHeaders.request ?? DEFAULTS.httpHeaders.request,
			response: httpHeaders.response ?? DEFAULTS.httpHeaders.response
		};
	}
	/**
	* Resolves the effective `DataCollection` configuration from client options.
	*
	* Precedence:
	* 1. Spec defaults
	* 2. Fields explicitly set in `dataCollection`
	*/
	function resolveDataCollectionOptions(options) {
		const dc = options.dataCollection ?? {};
		return {
			userInfo: dc.userInfo ?? DEFAULTS.userInfo,
			cookies: dc.cookies ?? DEFAULTS.cookies,
			httpHeaders: resolveHttpHeaders(dc.httpHeaders),
			httpBodies: dc.httpBodies ?? DEFAULTS.httpBodies,
			urlQueryParams: dc.urlQueryParams ?? DEFAULTS.urlQueryParams,
			graphQL: {
				document: dc.graphQL?.document ?? DEFAULTS.graphQL.document,
				variables: dc.graphQL?.variables ?? DEFAULTS.graphQL.variables
			},
			genAI: {
				inputs: dc.genAI?.inputs ?? DEFAULTS.genAI.inputs,
				outputs: dc.genAI?.outputs ?? DEFAULTS.genAI.outputs
			},
			mcp: {
				inputs: dc.mcp?.inputs ?? DEFAULTS.mcp.inputs,
				outputs: dc.mcp?.outputs ?? DEFAULTS.mcp.outputs
			},
			databaseQueryData: dc.databaseQueryData ?? DEFAULTS.databaseQueryData,
			queues: dc.queues ?? DEFAULTS.queues,
			stackFrameVariables: dc.stackFrameVariables ?? DEFAULTS.stackFrameVariables,
			frameContextLines: dc.frameContextLines ?? DEFAULTS.frameContextLines
		};
	}
	// ../core/build/esm/client.js
	const ALREADY_SEEN_ERROR = "Not capturing exception because it's already been captured.";
	const MISSING_RELEASE_FOR_SESSION_ERROR = "Discarded session because of missing or non-string release";
	const INTERNAL_ERROR_SYMBOL = Symbol.for("SentryInternalError");
	const DO_NOT_SEND_EVENT_SYMBOL = Symbol.for("SentryDoNotSendEventError");
	const CLOSED_CLIENT_SYMBOL = Symbol.for("SentryClosedClient");
	/**
	* Whether `close()` was called on the given client.
	*
	* @hidden
	*/
	function isClientClosed(client) {
		return CLOSED_CLIENT_SYMBOL in client;
	}
	function _makeInternalError(message) {
		return {
			message,
			[INTERNAL_ERROR_SYMBOL]: true
		};
	}
	function _makeDoNotSendEventError(message) {
		return {
			message,
			[DO_NOT_SEND_EVENT_SYMBOL]: true
		};
	}
	function _makeSampledOutError(sampleRate) {
		return _makeDoNotSendEventError(`Discarding event because it's not included in the random sample (sampling rate = ${sampleRate})`);
	}
	function _isInternalError(error) {
		return isObjectLike(error) && INTERNAL_ERROR_SYMBOL in error;
	}
	function _isDoNotSendEventError(error) {
		return isObjectLike(error) && DO_NOT_SEND_EVENT_SYMBOL in error;
	}
	/**
	* Base implementation for all JavaScript SDK clients.
	*
	* Call the constructor with the corresponding options
	* specific to the client subclass. To access these options later, use
	* {@link Client.getOptions}.
	*
	* If a Dsn is specified in the options, it will be parsed and stored. Use
	* {@link Client.getDsn} to retrieve the Dsn at any moment. In case the Dsn is
	* invalid, the constructor will throw a {@link SentryException}. Note that
	* without a valid Dsn, the SDK will not send any events to Sentry.
	*
	* Before sending an event, it is passed through
	* {@link Client._prepareEvent} to add SDK information and scope data
	* (breadcrumbs and context). To add more custom information, override this
	* method and extend the resulting prepared event.
	*
	* To issue automatically created events (e.g. via instrumentation), use
	* {@link Client.captureEvent}. It will prepare the event and pass it through
	* the callback lifecycle. To issue auto-breadcrumbs, use
	* {@link Client.addBreadcrumb}.
	*
	* @example
	* class NodeClient extends Client<NodeOptions> {
	*   public constructor(options: NodeOptions) {
	*     super(options);
	*   }
	*
	*   // ...
	* }
	*/
	var Client = class {
		/**
		* Initializes this client instance.
		*
		* @param options Options for the client.
		*/
		constructor(options) {
			this._options = {
				attachStacktrace: true,
				...options,
				traceLifecycle: options.traceLifecycle === "static" ? "static" : "stream"
			};
			this._integrations = {};
			this._numProcessing = 0;
			this._outcomes = {};
			this._hooks = {};
			this._eventProcessors = [];
			this._promiseBuffer = makePromiseBuffer(options.transportOptions?.bufferSize ?? 64);
			this._dataCollection = resolveDataCollectionOptions(options);
			this._unhandledSessionStatus = "crashed";
			this._attachStacktraceIsDefault = options.attachStacktrace === void 0;
			if (options.dsn) this._dsn = makeDsn(options.dsn);
			else debug$1.warn("No DSN provided, client will not send events.");
			const { beforeSendSpan, traceLifecycle } = this._options;
			if (beforeSendSpan && isStaticBeforeSendSpanCallback(beforeSendSpan) !== (traceLifecycle === "static")) consoleSandbox(() => {
				console.warn(`Ignoring \`beforeSendSpan\`: ${traceLifecycle === "static" ? "wrap it with" : "remove"} \`Sentry.withStaticSpan\` to use it with \`traceLifecycle: "${traceLifecycle}"\`.`);
			});
			if (this._dsn) {
				const url = getEnvelopeEndpointWithUrlEncodedAuth(this._dsn, options.tunnel, options._metadata ? options._metadata.sdk : void 0);
				this._transport = options.transport({
					tunnel: this._options.tunnel,
					recordDroppedEvent: this.recordDroppedEvent.bind(this),
					...options.transportOptions,
					url
				});
			}
		}
		/**
		* Captures an exception event and sends it to Sentry.
		*
		* Unlike `captureException` exported from every SDK, this method requires that you pass it the current scope.
		*/
		captureException(exception, hint, scope) {
			const eventId = uuid4();
			if (checkOrSetAlreadyCaught(exception)) {
				debug$1.log(ALREADY_SEEN_ERROR);
				return eventId;
			}
			const hintWithEventId = {
				event_id: eventId,
				...hint
			};
			this._process(() => this.eventFromException(exception, hintWithEventId).then((event) => this._captureEvent(event, hintWithEventId, scope)).then((res) => res), "error");
			return hintWithEventId.event_id;
		}
		/**
		* Captures a message event and sends it to Sentry.
		*
		* Unlike `captureMessage` exported from every SDK, this method requires that you pass it the current scope.
		*/
		captureMessage(message, level, hint, currentScope) {
			const hintWithEventId = {
				event_id: uuid4(),
				...hint
			};
			const eventMessage = isParameterizedString(message) ? message : String(message);
			const isMessage = isPrimitive(message);
			const promisedEvent = isMessage ? this.eventFromMessage(eventMessage, level, hintWithEventId).then((event) => {
				if (event.exception && this._attachStacktraceIsDefault) event.sdkProcessingMetadata = {
					...event.sdkProcessingMetadata,
					hasDefaultSyntheticStacktrace: true
				};
				return event;
			}) : this.eventFromException(message, hintWithEventId);
			this._process(() => promisedEvent.then((event) => this._captureEvent(event, hintWithEventId, currentScope)), isMessage ? "unknown" : "error");
			return hintWithEventId.event_id;
		}
		/**
		* Captures a manually created event and sends it to Sentry.
		*
		* Unlike `captureEvent` exported from every SDK, this method requires that you pass it the current scope.
		*/
		captureEvent(event, hint, currentScope) {
			const eventId = uuid4();
			if (hint?.originalException && checkOrSetAlreadyCaught(hint.originalException)) {
				debug$1.log(ALREADY_SEEN_ERROR);
				return eventId;
			}
			const hintWithEventId = {
				event_id: eventId,
				...hint
			};
			const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
			const capturedSpanScope = sdkProcessingMetadata.capturedSpanScope;
			const capturedSpanIsolationScope = sdkProcessingMetadata.capturedSpanIsolationScope;
			const dataCategory = getDataCategoryByType(event.type);
			this._process(() => this._captureEvent(event, hintWithEventId, capturedSpanScope || currentScope, capturedSpanIsolationScope), dataCategory);
			return hintWithEventId.event_id;
		}
		/**
		* Captures a session.
		*/
		captureSession(session) {
			this.sendSession(session);
			updateSession(session, { init: false });
		}
		/**
		* Get the current Dsn.
		*/
		getDsn() {
			return this._dsn;
		}
		/**
		* Get the current options.
		*/
		getOptions() {
			return this._options;
		}
		/**
		* Get the resolved data collection configuration.
		*/
		getDataCollectionOptions() {
			return this._dataCollection;
		}
		/**
		* Get the SDK metadata.
		* @see SdkMetadata
		*/
		getSdkMetadata() {
			return this._options._metadata;
		}
		/**
		* Returns the transport that is used by the client.
		* Please note that the transport gets lazy initialized so it will only be there once the first event has been sent.
		*/
		getTransport() {
			return this._transport;
		}
		/**
		* Wait for all events to be sent or the timeout to expire, whichever comes first.
		*
		* @param timeout Maximum time in ms the client should wait for events to be flushed. Omitting this parameter will
		*   cause the client to wait until all events are sent before resolving the promise.
		* @returns A promise that will resolve with `true` if all events are sent before the timeout, or `false` if there are
		* still events in the queue when the timeout is reached.
		*/
		async flush(timeout) {
			const transport = this._transport;
			this.emit("flush");
			if (!transport) return true;
			const clientFinished = await this._isClientDoneProcessing(timeout);
			const transportFlushed = await transport.flush(timeout);
			return clientFinished && transportFlushed;
		}
		/**
		* Flush the event queue and set the client to `enabled = false`. See {@link Client.flush}.
		*
		* @param {number} timeout Maximum time in ms the client should wait before shutting down. Omitting this parameter will cause
		*   the client to wait until all events are sent before disabling itself.
		* @returns {Promise<boolean>} A promise which resolves to `true` if the flush completes successfully before the timeout, or `false` if
		* it doesn't.
		*/
		async close(timeout) {
			Object.defineProperty(this, CLOSED_CLIENT_SYMBOL, { value: true });
			const result = await this.flush(timeout);
			this.getOptions().enabled = false;
			this.emit("close");
			return result;
		}
		/**
		* Get all installed event processors.
		*/
		getEventProcessors() {
			return this._eventProcessors;
		}
		/**
		* Adds an event processor that applies to any event processed by this client.
		*/
		addEventProcessor(eventProcessor) {
			this._eventProcessors.push(eventProcessor);
		}
		/**
		* Initialize this client.
		* Call this after the client was set on a scope.
		*/
		init() {
			if (this._isEnabled() || this._options.integrations.some(({ name }) => name.startsWith("Spotlight"))) {
				this._setupIntegrations();
				maybeWarnAboutIgnoredTransactionOptions(this._options);
			}
		}
		/**
		* Gets an installed integration by its name.
		*
		* @returns {Integration|undefined} The installed integration or `undefined` if no integration with that `name` was installed.
		*/
		getIntegrationByName(integrationName) {
			return this._integrations[integrationName];
		}
		/**
		* Returns the names of all installed integrations.
		*/
		getIntegrationNames() {
			return Object.keys(this._integrations);
		}
		/**
		* Add an integration to the client.
		* This can be used to e.g. lazy load integrations.
		* In most cases, this should not be necessary,
		* and you're better off just passing the integrations via `integrations: []` at initialization time.
		* However, if you find the need to conditionally load & add an integration, you can use `addIntegration` to do so.
		*/
		addIntegration(integration) {
			const isAlreadyInstalled = this._integrations[integration.name];
			if (!isAlreadyInstalled && integration.beforeSetup) integration.beforeSetup(this);
			setupIntegration(this, integration, this._integrations);
			if (!isAlreadyInstalled) afterSetupIntegrations(this, [integration]);
		}
		/**
		* Send a fully prepared event to Sentry.
		*/
		sendEvent(event, hint = {}) {
			this.emit("beforeSendEvent", event, hint);
			const genAiSpanItem = extractGenAiSpansFromEvent(event, this);
			let env = createEventEnvelope(event, this._dsn, this._options._metadata, this._options.tunnel);
			if (!isInternalException(hint)) for (const attachment of hint.attachments || []) env = addItemToEnvelope(env, createAttachmentEnvelopeItem(attachment));
			if (genAiSpanItem) env = addItemToEnvelope(env, genAiSpanItem);
			this.sendEnvelope(env).then((sendResponse) => this.emit("afterSendEvent", event, sendResponse));
		}
		/**
		* Send a session or session aggregrates to Sentry.
		*/
		sendSession(session) {
			const { release: clientReleaseOption, environment: clientEnvironmentOption = DEFAULT_ENVIRONMENT } = this._options;
			if ("aggregates" in session) {
				const sessionAttrs = session.attrs || {};
				if (!sessionAttrs.release && !clientReleaseOption) {
					debug$1.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
					return;
				}
				sessionAttrs.release = sessionAttrs.release || clientReleaseOption;
				sessionAttrs.environment = sessionAttrs.environment || clientEnvironmentOption;
				session.attrs = sessionAttrs;
			} else {
				if (!session.release && !clientReleaseOption) {
					debug$1.warn(MISSING_RELEASE_FOR_SESSION_ERROR);
					return;
				}
				session.release = session.release || clientReleaseOption;
				session.environment = session.environment || clientEnvironmentOption;
			}
			this.emit("beforeSendSession", session);
			const env = createSessionEnvelope(session, this._dsn, this._options._metadata, this._options.tunnel);
			this.sendEnvelope(env);
		}
		/**
		* Record on the client that an event got dropped (ie, an event that will not be sent to Sentry).
		*/
		recordDroppedEvent(reason, category, count = 1) {
			if (this._options.sendClientReports) {
				const key = `${reason}:${category}`;
				debug$1.log(`Recording outcome: "${key}"${count > 1 ? ` (${count} times)` : ""}`);
				this._outcomes[key] = (this._outcomes[key] || 0) + count;
			}
		}
		/**
		* Register a hook on this client.
		*/
		on(hook, callback) {
			const hookCallbacks = this._hooks[hook] = this._hooks[hook] || /* @__PURE__ */ new Set();
			const uniqueCallback = (...args) => callback(...args);
			hookCallbacks.add(uniqueCallback);
			return () => {
				hookCallbacks.delete(uniqueCallback);
			};
		}
		/**
		* Emit a hook that was previously registered via `on()`.
		*/
		emit(hook, ...rest) {
			const callbacks = this._hooks[hook];
			if (callbacks) callbacks.forEach((callback) => callback(...rest));
		}
		/**
		* Send an envelope to Sentry.
		*/
		async sendEnvelope(envelope) {
			this.emit("beforeEnvelope", envelope);
			if (this._isEnabled() && this._transport) try {
				const result = await this._transport.send(envelope);
				this.emit("afterEnvelope", envelope);
				return result;
			} catch (reason) {
				debug$1.error("Error while sending envelope:", reason);
				return {};
			}
			debug$1.error("Transport disabled");
			return {};
		}
		/**
		* Register a cleanup function to be called when the client is disposed.
		* This is useful for integrations that need to clean up global state.
		*
		* NOTE: This is a no-op in the base `Client` class. Subclasses like `ServerRuntimeClient`
		* override this method to actually register and execute cleanup callbacks.
		*/
		registerCleanup(callback) {}
		/**
		* Disposes of the client and releases all resources.
		*
		* Subclasses should override this method to clean up their own resources, including invoking
		* any callbacks registered via {@link Client.registerCleanup}. The base implementation is a
		* no-op and does NOT execute registered cleanup callbacks.
		*
		* After calling dispose(), the client should not be used anymore.
		*/
		dispose() {}
		/** Setup integrations for this client. */
		_setupIntegrations() {
			const { integrations } = this._options;
			this._integrations = setupIntegrations(this, integrations);
			afterSetupIntegrations(this, integrations);
		}
		/** Updates existing session based on the provided event */
		_updateSessionFromEvent(session, event) {
			let unhandled = event.level === "fatal";
			let errored = false;
			const exceptions = event.exception?.values;
			if (exceptions) {
				errored = true;
				unhandled = false;
				for (const ex of exceptions) if (ex.mechanism?.handled === false) {
					unhandled = true;
					break;
				}
			}
			const sessionNonTerminal = session.status === "ok";
			if (sessionNonTerminal && session.errors === 0 || sessionNonTerminal && unhandled) {
				updateSession(session, {
					...unhandled && { status: this._unhandledSessionStatus },
					errors: session.errors || Number(errored || unhandled)
				});
				this.captureSession(session);
			}
		}
		/**
		* Determine if the client is finished processing. Returns a promise because it will wait `timeout` ms before saying
		* "no" (resolving to `false`) in order to give the client a chance to potentially finish first.
		*
		* @param timeout The time, in ms, after which to resolve to `false` if the client is still busy. Passing `0` (or not
		* passing anything) will make the promise wait as long as it takes for processing to finish before resolving to
		* `true`.
		* @returns A promise which will resolve to `true` if processing is already done or finishes before the timeout, and
		* `false` otherwise
		*/
		async _isClientDoneProcessing(timeout) {
			let ticked = 0;
			while (!timeout || ticked < timeout) {
				await new Promise((resolve) => setTimeout(resolve, 1));
				if (!this._numProcessing) return true;
				ticked++;
			}
			return false;
		}
		/** Determines whether this SDK is enabled and a transport is present. */
		_isEnabled() {
			return this.getOptions().enabled !== false && this._transport !== void 0;
		}
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
		* @param currentScope A scope containing event metadata.
		* @returns A new event with more information.
		*/
		_prepareEvent(event, hint, currentScope, isolationScope) {
			const options = this.getOptions();
			const integrations = this.getIntegrationNames();
			if (!hint.integrations && integrations.length) hint.integrations = integrations;
			this.emit("preprocessEvent", event, hint);
			if (!event.type) isolationScope.setLastEventId(event.event_id || hint.event_id);
			return prepareEvent(options, event, hint, currentScope, this, isolationScope).then((evt) => {
				if (evt === null) return evt;
				this.emit("postprocessEvent", evt, hint);
				evt.contexts = {
					trace: {
						...evt.contexts?.trace,
						...getTraceContextFromScope(currentScope)
					},
					...evt.contexts
				};
				evt.sdkProcessingMetadata = {
					dynamicSamplingContext: getDynamicSamplingContextFromScope(this, currentScope),
					...evt.sdkProcessingMetadata
				};
				return evt;
			});
		}
		/**
		* Processes the event and logs an error in case of rejection
		* @param event
		* @param hint
		* @param scope
		*/
		_captureEvent(event, hint = {}, currentScope = getCurrentScope(), isolationScope = getIsolationScope()) {
			if (isErrorEvent$1(event)) debug$1.log(`Captured error event \`${getPossibleEventMessages(event)[0] || "<unknown>"}\``);
			return this._processEvent(event, hint, currentScope, isolationScope).then((finalEvent) => {
				return finalEvent.event_id;
			}, (reason) => {
				if (_isDoNotSendEventError(reason)) debug$1.log(reason.message);
				else if (_isInternalError(reason)) debug$1.warn(reason.message);
				else debug$1.warn(reason);
			});
		}
		/**
		* Processes an event (either error or message) and sends it to Sentry.
		*
		* This also adds breadcrumbs and context information to the event. However,
		* platform specific meta data (such as the User's IP address) must be added
		* by the SDK implementor.
		*
		*
		* @param event The event to send to Sentry.
		* @param hint May contain additional information about the original exception.
		* @param currentScope A scope containing event metadata.
		* @returns A SyncPromise that resolves with the event or rejects in case event was/will not be send.
		*/
		_processEvent(event, hint, currentScope, isolationScope) {
			const options = this.getOptions();
			const { sampleRate } = options;
			const isTransaction = isTransactionEvent$1(event);
			const isError = isErrorEvent$1(event);
			const beforeSendLabel = `before send for type \`${event.type || "error"}\``;
			let beforeSendDropReason = "before_send";
			let ignoredSpanCount = 0;
			const parsedSampleRate = typeof sampleRate === "undefined" ? void 0 : parseSampleRate(sampleRate);
			const isSampledOut = isError && typeof parsedSampleRate === "number" && safeMathRandom() > parsedSampleRate;
			const dataCategory = getDataCategoryByType(event.type);
			let preparedSpanCount = 0;
			const session = currentScope.getSession() || isolationScope.getSession();
			if (isSampledOut && session?.status !== "ok") {
				this.recordDroppedEvent("sample_rate", "error");
				return rejectedSyncPromise(_makeSampledOutError(sampleRate));
			}
			return this._prepareEvent(event, hint, currentScope, isolationScope).then((prepared) => {
				if (prepared === null) throw _makeDoNotSendEventError("An event processor returned `null`, will not send event.");
				preparedSpanCount = prepared.spans?.length || 0;
				if (isInternalException(hint)) return prepared;
				return processBeforeSend(options, prepared, hint, (reason) => {
					beforeSendDropReason = reason;
				}, (count) => {
					ignoredSpanCount = count;
				});
			}).then((processedEvent) => {
				if (ignoredSpanCount) this.recordDroppedEvent("ignored", "span", ignoredSpanCount);
				if (!isPlainObject(processedEvent) || processedEvent === null) {
					this.recordDroppedEvent(beforeSendDropReason, dataCategory);
					if (isTransaction) this.recordDroppedEvent(beforeSendDropReason, "span", 1 + preparedSpanCount - ignoredSpanCount);
					if (processedEvent !== null) throw _makeInternalError(`${beforeSendLabel} must return \`null\` or a valid event.`);
					throw _makeDoNotSendEventError(`${beforeSendDropReason === "ignored" ? "Transaction matched `ignoreSpans`" : `${beforeSendLabel} ${beforeSendDropReason === "callback_error" ? "threw an error" : "returned `null`"}`}, will not send event.`);
				}
				if (isError && session) this._updateSessionFromEvent(session, processedEvent);
				if (isSampledOut) {
					this.recordDroppedEvent("sample_rate", "error");
					throw _makeSampledOutError(sampleRate);
				}
				if (isTransaction) {
					const droppedSpanCount = preparedSpanCount - ignoredSpanCount - (processedEvent.spans?.length || 0);
					if (droppedSpanCount > 0) this.recordDroppedEvent("before_send", "span", droppedSpanCount);
				}
				const transactionInfo = processedEvent.transaction_info;
				if (isTransaction && transactionInfo && processedEvent.transaction !== event.transaction) {
					const source = "custom";
					processedEvent.transaction_info = {
						...transactionInfo,
						source
					};
				}
				this.sendEvent(processedEvent, hint);
				return processedEvent;
			}).then(null, (reason) => {
				if (_isDoNotSendEventError(reason) || _isInternalError(reason)) throw reason;
				this.captureException(reason, {
					mechanism: {
						handled: false,
						type: "internal"
					},
					data: { __sentry__: true },
					originalException: reason
				});
				throw _makeInternalError(`Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.\nReason: ${reason}`);
			});
		}
		/**
		* Occupies the client with processing and event
		*/
		_process(taskProducer, dataCategory) {
			this._numProcessing++;
			this._promiseBuffer.add(taskProducer).then((value) => {
				this._numProcessing--;
				return value;
			}, (reason) => {
				this._numProcessing--;
				if (reason === SENTRY_BUFFER_FULL_ERROR) this.recordDroppedEvent("queue_overflow", dataCategory);
				return reason;
			});
		}
		/**
		* Clears outcomes on this client and returns them.
		*/
		_clearOutcomes() {
			const outcomes = this._outcomes;
			this._outcomes = {};
			return Object.entries(outcomes).map(([key, quantity]) => {
				const [reason, category] = key.split(":");
				return {
					reason,
					category,
					quantity
				};
			});
		}
		/**
		* Sends client reports as an envelope.
		*/
		_flushOutcomes() {
			debug$1.log("Flushing outcomes...");
			const outcomes = this._clearOutcomes();
			if (outcomes.length === 0) {
				debug$1.log("No outcomes to send");
				return;
			}
			if (!this._dsn) {
				debug$1.log("No dsn provided, will not send outcomes");
				return;
			}
			debug$1.log("Sending outcomes:", outcomes);
			const envelope = createClientReportEnvelope(outcomes, this._options.tunnel && dsnToString(this._dsn));
			this.sendEnvelope(envelope);
		}
	};
	/**
	* Process the matching `beforeSendXXX` callback.
	*/
	function processBeforeSend(options, event, hint, onDrop, onIgnoredSpans) {
		const { beforeSend, ignoreSpans, beforeSendTransaction } = options;
		const beforeSendSpan = isStaticBeforeSendSpanCallback(options.beforeSendSpan) && options.beforeSendSpan;
		let processedEvent = event;
		if (isErrorEvent$1(processedEvent) && beforeSend) {
			const errorEvent = processedEvent;
			return safeCallback("The `beforeSend` callback threw an error, dropping the event:", () => beforeSend(errorEvent, hint), () => {
				onDrop("callback_error");
				return null;
			});
		}
		if (isTransactionEvent$1(processedEvent)) {
			if (beforeSendSpan || ignoreSpans) {
				const rootSpanJson = convertTransactionEventToSpanJson(processedEvent);
				if (ignoreSpans?.length && shouldIgnoreSpan({
					description: rootSpanJson.description,
					op: rootSpanJson.op,
					attributes: rootSpanJson.data
				}, ignoreSpans)) {
					onDrop("ignored");
					return null;
				}
				if (beforeSendSpan) processedEvent = merge(event, convertSpanJsonToTransactionEvent(applyBeforeSendSpanCallback(rootSpanJson, beforeSendSpan)));
				if (processedEvent.spans) {
					const processedSpans = [];
					const initialSpans = processedEvent.spans;
					for (const span of initialSpans) {
						if (ignoreSpans?.length && shouldIgnoreSpan({
							description: span.description,
							op: span.op,
							attributes: span.data
						}, ignoreSpans)) {
							reparentChildSpans(initialSpans, span);
							continue;
						}
						if (beforeSendSpan) processedSpans.push(applyBeforeSendSpanCallback(span, beforeSendSpan));
						else processedSpans.push(span);
					}
					onIgnoredSpans(initialSpans.length - processedSpans.length);
					processedEvent.spans = processedSpans;
				}
			}
			if (beforeSendTransaction) return safeCallback("The `beforeSendTransaction` callback threw an error, dropping the event:", () => beforeSendTransaction(processedEvent, hint), () => {
				onDrop("callback_error");
				return null;
			});
		}
		return processedEvent;
	}
	function isErrorEvent$1(event) {
		return event.type === void 0;
	}
	function isTransactionEvent$1(event) {
		return event.type === "transaction";
	}
	// ../core/build/esm/sdk.js
	/**
	* Internal function to create a new SDK client instance. The client is
	* installed and then bound to the current scope.
	*
	* @param clientClass The client class to instantiate.
	* @param options Options to pass to the client.
	*/
	function initAndBind(clientClass, options) {
		if (options.debug === true) debug$1.enable();
		warnIfClientIsActive();
		getCurrentScope().update(options.initialScope);
		const client = new clientClass(options);
		setCurrentClient(client);
		client.init();
		return client;
	}
	/**
	* Returns the client bound to the current scope, unless it is closed.
	*
	* @hidden
	*/
	function getActiveClient() {
		const client = getClient();
		return client && !isClientClosed(client) ? client : void 0;
	}
	/**
	* Warns when `init()` runs while a client is still bound. The new client
	* replaces it, but the old client stays alive, so the two can mix state.
	*
	* @hidden
	*/
	function warnIfClientIsActive() {
		if (getActiveClient()) consoleSandbox(() => {
			console.warn("[Sentry] `Sentry.init()` was called more than once. The new client replaces the active client, but the active client is not closed, so state from both can mix. Call `Sentry.init()` only once, or call `await Sentry.close()` before you call it again.");
		});
	}
	/**
	* Make the given client the current client.
	*/
	function setCurrentClient(client) {
		getCurrentScope().setClient(client);
	}
	// ../core/build/esm/utils/data-collection/filterQueryParams.js
	/**
	* Filters a query parameter string according to a `CollectBehavior`.
	*
	* Parameter names are decoded for filtering, while the original encoding, order, and duplicate keys are preserved.
	*/
	function filterQueryParams(queryString, behavior) {
		if (!queryString || behavior === false) return;
		return queryString.split("&").map((pair) => {
			const separatorIndex = pair.indexOf("=");
			const encodedKey = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
			const key = new URLSearchParams(`${encodedKey}=`).keys().next().value;
			return key !== void 0 && shouldFilterDataKey(key, behavior) ? `${encodedKey}=${FILTERED_VALUE}` : pair;
		}).join("&");
	}
	// ../core/build/esm/utils/data-collection/filterUrlQuery.js
	/**
	* Applies a `CollectBehavior` to the query string of a full URL, leaving every other URL component
	* (scheme, host, path, fragment) untouched.
	*
	* The query is located by string offsets rather than by parsing, so the URL is returned byte-for-byte
	* apart from the query itself. This keeps relative URLs, non-HTTP schemes and unusual encodings intact,
	* none of which survive a `URL` round-trip.
	*
	* Returns the URL with its query filtered, or with the query removed entirely when collection is off.
	*/
	function filterUrlQuery(url, behavior) {
		const fragmentStart = url.indexOf("#");
		const queryEnd = fragmentStart === -1 ? url.length : fragmentStart;
		const queryStart = url.indexOf("?");
		if (queryStart === -1 || queryStart > queryEnd) return url;
		const prefix = url.slice(0, queryStart);
		const query = url.slice(queryStart + 1, queryEnd);
		const suffix = url.slice(queryEnd);
		const filtered = filterQueryParams(query, behavior);
		return filtered ? `${prefix}?${filtered}${suffix}` : `${prefix}${suffix}`;
	}
	// ../core/build/esm/utils/data-collection/filterCollectedUrl.js
	function urlQueryParamsBehavior(client) {
		return (client ?? getClient())?.getDataCollectionOptions().urlQueryParams ?? true;
	}
	function filterCollectedUrl(url, client) {
		return url === void 0 ? void 0 : filterUrlQuery(url, urlQueryParamsBehavior(client));
	}
	/**
	* Applies `dataCollection.urlQueryParams` to a query string the SDK collected itself, for use as
	* `url.query`. Returns `undefined` when the query must not be collected at all.
	*
	* See {@link filterCollectedUrl} for why this is a helper and why passing `client` is preferred.
	*/
	function filterCollectedUrlQuery(query, client) {
		return query ? filterQueryParams(query, urlQueryParamsBehavior(client)) : void 0;
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
	/**
	* Takes a URL object and returns a sanitized string which is safe to use as span name
	* see: https://develop.sentry.dev/sdk/data-handling/#structuring-data
	*/
	function getSanitizedUrlStringFromUrlObject(url) {
		if (isURLObjectRelative(url)) return url.pathname;
		const newUrl = new URL(url);
		newUrl.search = "";
		newUrl.hash = "";
		if (["80", "443"].includes(newUrl.port)) newUrl.port = "";
		if (newUrl.password) newUrl.password = "%filtered%";
		if (newUrl.username) newUrl.username = "%filtered%";
		return newUrl.toString();
	}
	/**
	* Normalizes a query string for the `url.query` attribute, which is specced without the leading `?`.
	*
	* Accepts either a raw query string (`URL.search`, which includes the `?`) or an already-stripped one.
	* Empty results become `undefined` so callers can assign the return value to an attribute
	* unconditionally — setting an attribute to `undefined` is a no-op.
	*/
	function getUrlQuery(query) {
		return query?.replace(/^\?/, "") || void 0;
	}
	/**
	* Normalizes a fragment for the `url.fragment` attribute, which is specced without the leading `#`.
	*
	* Accepts either a raw fragment (`URL.hash`, which includes the `#`) or an already-stripped one.
	* Empty results become `undefined` so callers can assign the return value to an attribute
	* unconditionally — setting an attribute to `undefined` is a no-op.
	*/
	function getUrlFragment(fragment) {
		return fragment?.replace(/^#/, "") || void 0;
	}
	/**
	* The domain a request goes to, for the `url.domain` attribute and low-cardinality span names.
	*
	* Relative URLs need a `base` to resolve against — browsers have the page origin, server runtimes do
	* not. URLs with no domain at all, such as data URLs, return `undefined`.
	*/
	function getUrlDomain(url, base) {
		try {
			return new URL(url, base).hostname || void 0;
		} catch {
			return;
		}
	}
	/**
	* Parses string form of URL into an object
	* // borrowed from https://tools.ietf.org/html/rfc3986#appendix-B
	* // intentionally using regex and not <a/> href parsing trick because React Native and other
	* // environments where DOM might not be available
	* @returns parsed URL object
	*/
	function parseUrl(url) {
		if (!url) return {};
		const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);
		if (!match) return {};
		const query = match[6] || "";
		const fragment = match[8] || "";
		return {
			host: match[4],
			path: match[5],
			protocol: match[2],
			search: query,
			hash: fragment,
			relative: match[5] + query + fragment
		};
	}
	/**
	* Strip the query string and fragment off of a given URL or path (if present)
	*
	* @param urlPath Full URL or path, including possible query string and/or fragment
	* @returns URL or path without query string or fragment
	*/
	function stripUrlQueryAndFragment(urlPath) {
		return urlPath.split(/[?#]/, 1)[0];
	}
	/**
	* Strips the content from a data URL, returning a placeholder with the MIME type.
	*
	* Data URLs can be very long (e.g. base64 encoded scripts for Web Workers),
	* with little valuable information, often leading to envelopes getting dropped due
	* to size limit violations. Therefore, we strip data URLs and replace them with a
	* placeholder.
	*
	* @param url - The URL to process
	* @param includeDataPrefix - If true, includes the first 10 characters of the data stream
	*                            for debugging (e.g., to identify magic bytes like WASM's AGFzbQ).
	*                            Defaults to true.
	* @returns For data URLs, returns a short format like `data:text/javascript;base64,SGVsbG8gV2... [truncated]`.
	*          For non-data URLs, returns the original URL unchanged.
	*/
	function stripDataUrlContent(url, includeDataPrefix = true) {
		if (url.startsWith("data:")) {
			const match = url.match(/^data:([^;,]+)/);
			const mimeType = match ? match[1] : "text/plain";
			const isBase64 = url.includes(";base64,");
			const dataStart = url.indexOf(",");
			let dataPrefix = "";
			if (includeDataPrefix && dataStart !== -1) {
				const data = url.slice(dataStart + 1);
				dataPrefix = data.length > 10 ? `${data.slice(0, 10)}... [truncated]` : data;
			}
			return `data:${mimeType}${isBase64 ? ",base64" : ""}${dataPrefix ? `,${dataPrefix}` : ""}`;
		}
		return url;
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
	// ../core/build/esm/utils/parameterize.js
	/**
	* Tagged template function which returns parameterized representation of the message
	* For example: parameterize`This is a log statement with ${x} and ${y} params`, would return:
	* "__sentry_template_string__": 'This is a log statement with %s and %s params',
	* "__sentry_template_values__": ['first', 'second']
	*
	* @param strings An array of string values splitted between expressions
	* @param values Expressions extracted from template string
	*
	* @returns A `ParameterizedString` object that can be passed into `captureMessage` or Sentry.logger.X methods.
	*/
	function parameterize(strings, ...values) {
		const cooked = strings.map((str, i) => str ?? strings.raw[i]);
		const formatted = new String(String.raw({ raw: cooked }, ...values));
		formatted.__sentry_template_string__ = cooked.join("\0").replace(/%/g, "%%").replace(/\0/g, "%s");
		formatted.__sentry_template_values__ = values;
		return formatted;
	}
	// ../core/build/esm/utils/hash.js
	/**
	* 32-bit FNV-1a. Keep this algorithm stable: tunnel paths must match across SDK versions.
	*/
	function fnv1a32(input) {
		let hash = 2166136261;
		for (let i = 0; i < input.length; i++) {
			hash ^= input.charCodeAt(i);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(36);
	}
	// ../core/build/esm/utils/tunnel.js
	/**
	* Returns the same-origin tunnel path for a DSN, e.g. `/k3x9q2a`, by default the active client's. Browser and server
	* derive it independently, and as a hash it gives ad-blocker filter lists nothing to match.
	*/
	function getTunnelPath(dsn) {
		const components = dsn ? makeDsn(dsn) : getClient()?.getDsn();
		return components ? `/${fnv1a32(dsnToString(components))}` : void 0;
	}
	/**
	* Normalizes a base path to `/app`, or `''` for the root.
	*/
	function normalizeTunnelBasePath(basePath) {
		const path = (basePath?.startsWith("./") ? basePath.slice(1) : basePath ?? "").replace(/\/$/, "");
		return !path || path.startsWith("/") ? path : `/${path}`;
	}
	// ../core/build/esm/utils/ipAddress.js
	/**
	* @internal
	*/
	function addAutoIpAddressToSession(session) {
		if ("aggregates" in session) {
			if (session.attrs?.["ip_address"] === void 0) session.attrs = {
				...session.attrs,
				ip_address: "{{auto}}"
			};
		} else if (session.ipAddress === void 0) session.ipAddress = "{{auto}}";
	}
	// ../core/build/esm/utils/sdkMetadata.js
	/**
	* Preserve user-provided option keys before SDK wrappers add defaults.
	* @internal
	*/
	function captureOptionsSetByUser(options) {
		if (options._metadata?.optionsSetByUser) return options;
		return {
			...options,
			_metadata: {
				...options._metadata,
				optionsSetByUser: Object.keys(options).filter((key) => key !== "_metadata").sort()
			}
		};
	}
	/**
	* A builder for the SDK metadata in the options for the SDK initialization.
	*
	* Note: This function is identical to `buildMetadata` in Remix and NextJS and SvelteKit.
	* We don't extract it for bundle size reasons.
	* @see https://github.com/getsentry/sentry-javascript/pull/7404
	* @see https://github.com/getsentry/sentry-javascript/pull/4196
	*
	* If you make changes to this function consider updating the others as well.
	*
	* @param options SDK options object that gets mutated
	* @param names list of package names
	*/
	function applySdkMetadata(options, name, names = [name], source = "npm") {
		const sdk = (options._metadata = options._metadata || {}).sdk = options._metadata.sdk || {};
		if (!sdk.name) {
			sdk.name = `sentry.javascript.${name}`;
			sdk.packages = names.map((name) => ({
				name: `${source}:@sentry/${name}`,
				version: SDK_VERSION
			}));
			sdk.version = SDK_VERSION;
		}
	}
	// ../core/build/esm/utils/traceData.js
	/**
	* Extracts trace propagation data from the current span or from the client's scope (via transaction or propagation
	* context) and serializes it to `sentry-trace` and `baggage` values. These values can be used to propagate
	* a trace via our tracing Http headers or Html `<meta>` tags.
	*
	* This function also applies some validation to the generated sentry-trace and baggage values to ensure that
	* only valid strings are returned.
	*
	* When an external propagation context is registered (e.g. via the OTLP integration) and there is no active
	* Sentry span, this function returns an empty object to defer outgoing request propagation to the external
	* propagator (e.g. an OpenTelemetry propagator).
	*
	* If (@param options.propagateTraceparent) is `true`, the function will also generate a `traceparent` value,
	* following the W3C traceparent header format.
	*
	* @returns an object with the tracing data values. The object keys are the name of the tracing key to be used as header
	* or meta tag name.
	*/
	function getTraceData(options = {}) {
		const client = options.client || getClient();
		if (!isEnabled() || !client) return {};
		const acs = getAsyncContextStrategy(getMainCarrier());
		if (acs.getTraceData) return acs.getTraceData(options);
		const scope = options.scope || getCurrentScope();
		const span = options.span || getActiveSpan();
		const isTwpPlaceholder = spanIsNonRecordingSpan(span) && !hasSpansEnabled(client.getOptions());
		if (!span && hasExternalPropagationContext()) return {};
		const sentryTrace = span && !isTwpPlaceholder ? spanToTraceHeader(span) : scopeToTraceHeader(scope);
		const baggage = dynamicSamplingContextToSentryBaggageHeader(span ? getDynamicSamplingContextFromSpan(span) : getDynamicSamplingContextFromScope(client, scope));
		if (!TRACEPARENT_REGEXP.test(sentryTrace)) {
			debug$1.warn("Invalid sentry-trace data. Cannot generate trace data");
			return {};
		}
		const traceData = {
			"sentry-trace": sentryTrace,
			baggage
		};
		if (options.propagateTraceparent) traceData.traceparent = span && !isTwpPlaceholder ? spanToTraceparentHeader(span) : scopeToTraceparentHeader(scope);
		return traceData;
	}
	/**
	* Get a sentry-trace header value for the given scope.
	*/
	function scopeToTraceHeader(scope) {
		const { traceId, sampled, propagationSpanId } = scope.getPropagationContext();
		return generateSentryTraceHeader(traceId, propagationSpanId, sampled);
	}
	function scopeToTraceparentHeader(scope) {
		const { traceId, sampled, propagationSpanId } = scope.getPropagationContext();
		return generateTraceparentHeader(traceId, propagationSpanId, sampled);
	}
	// ../core/build/esm/utils/tracePropagationTargets.js
	const NORMALIZED_REGEXP_CACHE = /* @__PURE__ */ new WeakMap();
	/**
	* Returns an equivalent RegExp that ignores case and is safe to `test()` repeatedly.
	*
	* The `g` and `y` flags are dropped because they make `test()` stateful via `lastIndex`, which would make a target
	* match only every other request. Results are cached since targets are matched once per outgoing request.
	*/
	function normalizeRegExpTarget(pattern) {
		const flags = `${pattern.flags.replace(/[gy]/g, "")}${pattern.ignoreCase ? "" : "i"}`;
		if (flags === pattern.flags) return pattern;
		const cached = NORMALIZED_REGEXP_CACHE.get(pattern);
		if (cached) return cached;
		const normalizedPattern = new RegExp(pattern.source, flags);
		NORMALIZED_REGEXP_CACHE.set(pattern, normalizedPattern);
		return normalizedPattern;
	}
	/**
	* Check if a value matches any of the given `tracePropagationTargets`.
	*
	* The value is usually a URL, but it can be anything a propagation decision is made on, such as a
	* Cloudflare binding name. String targets match as a substring unless `requireExactStringMatch` is set.
	*
	* Matching is case-insensitive: URL normalization (e.g. `new URL()`) lower-cases the origin, so a target
	* written with the same casing as the request (`'myApi.com'`, `/^myApi\.com/`) would otherwise never match.
	*/
	function matchesTracePropagationTargets(value, tracePropagationTargets, requireExactStringMatch = false) {
		const lowerCaseValue = value.toLowerCase();
		for (const target of tracePropagationTargets) if (isString(target)) {
			const lowerCaseTarget = target.toLowerCase();
			if (requireExactStringMatch ? lowerCaseValue === lowerCaseTarget : lowerCaseValue.includes(lowerCaseTarget)) return true;
		} else if (isRegExp(target) && normalizeRegExpTarget(target).test(value)) return true;
		return false;
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
	// ../core/build/esm/integrations/functiontostring.js
	const INTEGRATION_NAME$13 = "FunctionToString";
	const SETUP_CLIENTS = /* @__PURE__ */ new WeakMap();
	const _functionToStringIntegration = (() => {
		return {
			name: INTEGRATION_NAME$13,
			setupOnce() {
				const callOriginalFunctionToString = Function.prototype.call.bind(Function.prototype.toString);
				const hasOwnProperty = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
				try {
					Function.prototype.toString = function() {
						let unwrappedFunction;
						try {
							if (SETUP_CLIENTS.has(getClient()) && hasOwnProperty(this, "__sentry_original__")) unwrappedFunction = getOriginalFunction(this);
						} catch {}
						return callOriginalFunctionToString(unwrappedFunction ?? this);
					};
				} catch {}
			},
			setup(client) {
				SETUP_CLIENTS.set(client, true);
			}
		};
	});
	/**
	* Patch toString calls to return proper name for wrapped functions.
	*
	* ```js
	* Sentry.init({
	*   integrations: [
	*     functionToStringIntegration(),
	*   ],
	* });
	* ```
	*/
	const functionToStringIntegration = defineIntegration(_functionToStringIntegration);
	// ../core/build/esm/integrations/eventFilters.js
	const DEFAULT_IGNORE_ERRORS = [
		/^Script error\.?$/,
		/^Javascript error: Script error\.? on line 0$/,
		/^ResizeObserver loop completed with undelivered notifications.$/,
		/^Cannot redefine property: googletag$/,
		/^Can't find variable: gmo$/,
		/^undefined is not an object \(evaluating 'a\.[A-Z]'\)$/,
		/can't redefine non-configurable property "solana"/,
		/vv\(\)\.getRestrictions is not a function/,
		/Can't find variable: _AutofillCallbackHandler/,
		/Object Not Found Matching Id:\d+, MethodName:simulateEvent/,
		/Java exception was raised during method invocation$/,
		/Java object is gone$/
	];
	const INTEGRATION_NAME$12 = "EventFilters";
	/**
	* An integration that filters out events (errors and transactions) based on:
	*
	* - (Errors) A curated list of known low-value or irrelevant errors (see {@link DEFAULT_IGNORE_ERRORS})
	* - (Errors) A list of error messages or urls/filenames passed in via
	*   - Top level Sentry.init options (`ignoreErrors`, `denyUrls`, `allowUrls`)
	*   - The same options passed to the integration directly via @param options
	* - (Transactions/Spans) A list of root span (transaction) names passed in via
	*   - Top level Sentry.init option (`ignoreTransactions`)
	*   - The same option passed to the integration directly via @param options
	*
	* Events filtered by this integration will not be sent to Sentry.
	*/
	const eventFiltersIntegration = defineIntegration((options = {}) => {
		let mergedOptions;
		return {
			name: INTEGRATION_NAME$12,
			setup(client) {
				mergedOptions = _mergeOptions(options, client.getOptions());
			},
			processEvent(event, _hint, client) {
				if (!mergedOptions) mergedOptions = _mergeOptions(options, client.getOptions());
				return _shouldDropEvent$1(event, mergedOptions) ? null : event;
			}
		};
	});
	function _mergeOptions(internalOptions = {}, clientOptions = {}) {
		return {
			allowUrls: [...internalOptions.allowUrls || [], ...clientOptions.allowUrls || []],
			denyUrls: [...internalOptions.denyUrls || [], ...clientOptions.denyUrls || []],
			ignoreErrors: [
				...internalOptions.ignoreErrors || [],
				...clientOptions.ignoreErrors || [],
				...internalOptions.disableErrorDefaults ? [] : DEFAULT_IGNORE_ERRORS
			],
			ignoreTransactions: [...internalOptions.ignoreTransactions || [], ...clientOptions.ignoreTransactions || []]
		};
	}
	function _shouldDropEvent$1(event, options) {
		if (!event.type) {
			if (_isIgnoredError(event, options.ignoreErrors)) {
				debug$1.warn(`Event dropped due to being matched by \`ignoreErrors\` option.\nEvent: ${getEventDescription(event)}`);
				return true;
			}
			if (_isUselessError(event)) {
				debug$1.warn(`Event dropped due to not having an error message, error type or stacktrace.\nEvent: ${getEventDescription(event)}`);
				return true;
			}
			if (_isDeniedUrl(event, options.denyUrls)) {
				debug$1.warn(`Event dropped due to being matched by \`denyUrls\` option.\nEvent: ${getEventDescription(event)}.\nUrl: ${_getEventFilterUrl(event)}`);
				return true;
			}
			if (!_isAllowedUrl(event, options.allowUrls)) {
				debug$1.warn(`Event dropped due to not being matched by \`allowUrls\` option.\nEvent: ${getEventDescription(event)}.\nUrl: ${_getEventFilterUrl(event)}`);
				return true;
			}
		} else if (event.type === "transaction") {
			if (_isIgnoredTransaction(event, options.ignoreTransactions)) {
				debug$1.warn(`Event dropped due to being matched by \`ignoreTransactions\` option.\nEvent: ${getEventDescription(event)}`);
				return true;
			}
		}
		return false;
	}
	function _isIgnoredError(event, ignoreErrors) {
		if (!ignoreErrors?.length) return false;
		return getPossibleEventMessages(event).some((message) => stringMatchesSomePattern(message, ignoreErrors));
	}
	function _isIgnoredTransaction(event, ignoreTransactions) {
		if (!ignoreTransactions?.length) return false;
		const name = event.transaction;
		return name ? stringMatchesSomePattern(name, ignoreTransactions) : false;
	}
	function _isDeniedUrl(event, denyUrls) {
		if (!denyUrls?.length) return false;
		const url = _getEventFilterUrl(event);
		return !url ? false : stringMatchesSomePattern(url, denyUrls);
	}
	function _isAllowedUrl(event, allowUrls) {
		if (!allowUrls?.length) return true;
		const url = _getEventFilterUrl(event);
		return !url ? true : stringMatchesSomePattern(url, allowUrls);
	}
	function _getLastValidUrl(frames = []) {
		for (let i = frames.length - 1; i >= 0; i--) {
			const frame = frames[i];
			if (frame && frame.filename !== "<anonymous>" && frame.filename !== "[native code]") return frame.filename || null;
		}
		return null;
	}
	function _getEventFilterUrl(event) {
		try {
			const frames = [...event.exception?.values ?? []].reverse().find((value) => value.mechanism?.parent_id === void 0 && value.stacktrace?.frames?.length)?.stacktrace?.frames;
			return frames ? _getLastValidUrl(frames) : null;
		} catch {
			debug$1.error(`Cannot extract url for event ${getEventDescription(event)}`);
			return null;
		}
	}
	function _isUselessError(event) {
		if (!event.exception?.values?.length) return false;
		return !event.message && !event.exception.values.some((value) => value.stacktrace || value.type && value.type !== "Error" || value.value);
	}
	// ../core/build/esm/utils/aggregate-errors.js
	/**
	* Creates exceptions inside `event.exception.values` for errors that are nested on properties based on the `key` parameter.
	*/
	function applyAggregateErrorsToEvent(exceptionFromErrorImplementation, parser, key, limit, event, hint) {
		if (!event.exception?.values || !hint || !isError(hint.originalException)) return;
		const originalException = event.exception.values.length > 0 ? event.exception.values[event.exception.values.length - 1] : void 0;
		if (originalException) event.exception.values = aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, hint.originalException, key, event.exception.values, originalException, 0);
	}
	function aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, error, key, prevExceptions, exception, exceptionId) {
		if (prevExceptions.length >= limit + 1) return prevExceptions;
		let newExceptions = [...prevExceptions];
		if (isError(error[key])) {
			applyExceptionGroupFieldsForParentException(exception, exceptionId, error);
			const newException = exceptionFromErrorImplementation(parser, error[key]);
			const newExceptionId = newExceptions.length;
			applyExceptionGroupFieldsForChildException(newException, key, newExceptionId, exceptionId);
			newExceptions = aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, error[key], key, [newException, ...newExceptions], newException, newExceptionId);
		}
		if (isExceptionGroup(error)) error.errors.forEach((childError, i) => {
			if (newExceptions.length < limit + 1 && isError(childError)) {
				applyExceptionGroupFieldsForParentException(exception, exceptionId, error);
				const newException = exceptionFromErrorImplementation(parser, childError);
				const newExceptionId = newExceptions.length;
				applyExceptionGroupFieldsForChildException(newException, `errors[${i}]`, newExceptionId, exceptionId);
				newExceptions = aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, childError, key, [newException, ...newExceptions], newException, newExceptionId);
			}
		});
		if (isSuppressedError(error)) ["error", "suppressed"].forEach((property) => {
			const childError = error[property];
			if (newExceptions.length < limit + 1 && isError(childError)) {
				applyExceptionGroupFieldsForParentException(exception, exceptionId, error);
				const newException = exceptionFromErrorImplementation(parser, childError);
				const newExceptionId = newExceptions.length;
				applyExceptionGroupFieldsForChildException(newException, property, newExceptionId, exceptionId);
				newExceptions = aggregateExceptionsFromError(exceptionFromErrorImplementation, parser, limit, childError, key, [newException, ...newExceptions], newException, newExceptionId);
			}
		});
		return newExceptions;
	}
	function isExceptionGroup(error) {
		return Array.isArray(error.errors);
	}
	function isSuppressedError(error) {
		return "error" in error && "suppressed" in error;
	}
	function applyExceptionGroupFieldsForParentException(exception, exceptionId, error) {
		exception.mechanism = {
			handled: true,
			type: "auto.core.linked_errors",
			...isExceptionGroup(error) && { is_exception_group: true },
			...exception.mechanism,
			exception_id: exceptionId
		};
	}
	function applyExceptionGroupFieldsForChildException(exception, source, exceptionId, parentId) {
		exception.mechanism = {
			handled: true,
			...exception.mechanism,
			type: "chained",
			source,
			exception_id: exceptionId,
			parent_id: parentId
		};
	}
	// ../core/build/esm/utils/eventbuilder.js
	function hasSentryFetchUrlHost(error) {
		return isError(error) && "__sentry_fetch_url_host__" in error && typeof error.__sentry_fetch_url_host__ === "string";
	}
	/**
	* Enhances the error message with the hostname for better Sentry error reporting.
	* This allows third-party packages to still match on the original error message,
	* while Sentry gets the enhanced version with context.
	*
	* Only used internally
	* @hidden
	*/
	function _enhanceErrorWithSentryInfo(error) {
		const message = errorMessageToString(error.message);
		if (hasSentryFetchUrlHost(error)) return `${message} (${error.__sentry_fetch_url_host__})`;
		return message;
	}
	function errorMessageToString(message) {
		if (typeof message === "string") return message;
		if (message == null) return "";
		if (isPrimitive(message)) return String(message);
		if (isPlainObject(message) || Array.isArray(message)) {
			const json = stringify(message, "");
			if (json) return json;
		}
		return stringifyValue(void 0, message);
	}
	// ../core/build/esm/instrument/console.js
	/**
	* Filter out console messages that match the given strings or regular expressions.
	* These will neither be passed to the handler, and they will also not be logged to the user, unless they have debug enabled.
	* This is a set to avoid duplicate integration setups to add the same filter multiple times.
	*/
	const _filter = /* @__PURE__ */ new Set([]);
	/**
	* Add an instrumentation handler for when a console.xxx method is called.
	* Returns a function to remove the handler.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addConsoleInstrumentationHandler(handler) {
		const type = "console";
		const removeHandler = addHandler$1(type, handler);
		maybeInstrument(type, instrumentConsole);
		return removeHandler;
	}
	/**
	* Add a filter to the console instrumentation to filter out console messages that match the given strings or regular expressions.
	* Returns a function to remove the filter.
	*/
	function addConsoleInstrumentationFilter(filter) {
		for (const f of filter) _filter.add(f);
		return () => {
			for (const f of filter) _filter.delete(f);
		};
	}
	const instrumentedLevels = /* @__PURE__ */ new Set();
	/** Only exported for tests. */
	function instrumentConsole() {
		if (!("console" in GLOBAL_OBJ)) return;
		CONSOLE_LEVELS$1.forEach(function(level) {
			if (instrumentedLevels.has(level) || !(level in GLOBAL_OBJ.console)) return;
			instrumentedLevels.add(level);
			fill(GLOBAL_OBJ.console, level, function(originalConsoleMethod) {
				originalConsoleMethods[level] = originalConsoleMethod;
				return function(...args) {
					const firstArg = args[0];
					const log = originalConsoleMethods[level];
					const isFiltered = _filter.size && typeof firstArg === "string" && stringMatchesSomePattern(firstArg, _filter);
					if (!isFiltered) triggerHandlers$1("console", {
						args,
						level
					});
					if (!isFiltered || debug$1.isEnabled()) log?.apply(GLOBAL_OBJ.console, args);
				};
			});
		});
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
	// ../core/build/esm/integrations/dedupe.js
	const INTEGRATION_NAME$11 = "Dedupe";
	const _dedupeIntegration = (() => {
		let previousEvent;
		return {
			name: INTEGRATION_NAME$11,
			processEvent(currentEvent) {
				if (currentEvent.type) return currentEvent;
				try {
					if (_shouldDropEvent(currentEvent, previousEvent)) {
						debug$1.warn("Event dropped due to being a duplicate of previously captured event.");
						return null;
					}
				} catch {}
				return previousEvent = currentEvent;
			}
		};
	});
	/**
	* Drops an error or message event if it is equal to the previous error or message event.
	* Two events are equal if they have the same message (or the same exception type and value),
	* the same stack trace and the same fingerprint.
	*
	* A repeated `captureException` of the same error object is dropped by the client, also without
	* this integration (see `checkOrSetAlreadyCaught`).
	*/
	const dedupeIntegration = defineIntegration(_dedupeIntegration);
	/** only exported for tests. */
	function _shouldDropEvent(currentEvent, previousEvent) {
		if (!previousEvent) return false;
		if (_isSameMessageEvent(currentEvent, previousEvent)) return true;
		if (_isSameExceptionEvent(currentEvent, previousEvent)) return true;
		return false;
	}
	function _isSameMessageEvent(currentEvent, previousEvent) {
		const currentMessage = currentEvent.message;
		const previousMessage = previousEvent.message;
		if (!currentMessage && !previousMessage) return false;
		if (currentMessage && !previousMessage || !currentMessage && previousMessage) return false;
		if (currentMessage !== previousMessage) return false;
		if (!_isSameFingerprint(currentEvent, previousEvent)) return false;
		if (!_isSameStacktrace(currentEvent, previousEvent)) return false;
		return true;
	}
	function _isSameExceptionEvent(currentEvent, previousEvent) {
		const previousException = _getExceptionFromEvent(previousEvent);
		const currentException = _getExceptionFromEvent(currentEvent);
		if (!previousException || !currentException) return false;
		if (previousException.type !== currentException.type || previousException.value !== currentException.value) return false;
		if (!_isSameFingerprint(currentEvent, previousEvent)) return false;
		if (!_isSameStacktrace(currentEvent, previousEvent)) return false;
		return true;
	}
	function _isSameStacktrace(currentEvent, previousEvent) {
		const currentFrames = getFramesFromEvent(currentEvent);
		const previousFrames = getFramesFromEvent(previousEvent);
		if (!currentFrames || !previousFrames) return !currentFrames && !previousFrames;
		if (previousFrames.length !== currentFrames.length) return false;
		for (let i = 0; i < previousFrames.length; i++) {
			const frameA = previousFrames[i];
			const frameB = currentFrames[i];
			if (frameA.filename !== frameB.filename || frameA.lineno !== frameB.lineno || frameA.colno !== frameB.colno || frameA.function !== frameB.function) return false;
		}
		return true;
	}
	function _isSameFingerprint(currentEvent, previousEvent) {
		const currentFingerprint = currentEvent.fingerprint;
		const previousFingerprint = previousEvent.fingerprint;
		if (!currentFingerprint || !previousFingerprint) return !currentFingerprint && !previousFingerprint;
		try {
			return !!(currentFingerprint.join("") === previousFingerprint.join(""));
		} catch {
			return false;
		}
	}
	function _getExceptionFromEvent(event) {
		return event.exception?.values?.[0];
	}
	// ../core/build/esm/integrations/console.js
	const INTEGRATION_NAME$10 = "Console";
	/**
	* Captures calls to the `console` API as breadcrumbs in Sentry.
	*
	* By default the integration instruments `console.debug`, `console.info`, `console.warn`, `console.error`,
	* `console.log`, `console.trace`, and `console.assert`. You can use the `levels` option to customize which
	* levels are captured.
	*
	* @example
	*
	* ```js
	* Sentry.init({
	*   integrations: [Sentry.consoleIntegration({ levels: ['error', 'warn'] })],
	* });
	* ```
	*/
	const consoleIntegration = defineIntegration((options = {}) => {
		const levels = new Set(options.levels || CONSOLE_LEVELS$1);
		return {
			name: INTEGRATION_NAME$10,
			setup(client) {
				const unsubscribe = addConsoleInstrumentationHandler(({ args, level }) => {
					if (getClient() !== client || !levels.has(level)) return;
					addConsoleBreadcrumb(level, args);
				});
				client.registerCleanup(unsubscribe);
				if (options.filter) {
					const unsubscribe = addConsoleInstrumentationFilter(options.filter);
					client.registerCleanup(unsubscribe);
				}
			}
		};
	});
	/**
	* Capture a console breadcrumb.
	*
	* Exported just for tests.
	*/
	function addConsoleBreadcrumb(level, args) {
		const breadcrumb = {
			category: "console",
			data: {
				arguments: args,
				logger: "console"
			},
			level: severityLevelFromString(level),
			message: formatConsoleArgs(args)
		};
		if (level === "assert") {
			if (args[0] === false) {
				const assertionArgs = args.slice(1);
				breadcrumb.message = assertionArgs.length > 0 ? `Assertion failed: ${formatConsoleArgs(assertionArgs)}` : "Assertion failed";
				breadcrumb.data.arguments = assertionArgs;
			} else return;
		}
		addBreadcrumb(breadcrumb, {
			input: args,
			level
		});
	}
	function formatConsoleArgs(values) {
		return "util" in GLOBAL_OBJ && typeof GLOBAL_OBJ.util.format === "function" ? GLOBAL_OBJ.util.format(...values) : safeJoin(values, " ");
	}
	// ../core/build/esm/integrations/conversationId.js
	const INTEGRATION_NAME$9 = "ConversationId";
	const _conversationIdIntegration = (() => {
		return {
			name: INTEGRATION_NAME$9,
			setup(client) {
				client.on("spanStart", (span) => {
					const scopeData = getCurrentScope().getScopeData();
					const isolationScopeData = getIsolationScope().getScopeData();
					const conversationId = scopeData.conversationId || isolationScopeData.conversationId;
					if (conversationId) {
						const { op, data: attributes, description: name } = spanToStaticSpanJSON(span);
						if (!op?.startsWith("gen_ai.") && !attributes["ai.operationId"] && !name?.startsWith("ai.")) return;
						span.setAttribute(Fr, conversationId);
					}
				});
			}
		};
	});
	/**
	* Automatically applies conversation ID from scope to spans.
	*
	* This integration reads the conversation ID from the current or isolation scope
	* and applies it to spans when they start. This ensures the conversation ID is
	* available for all AI-related operations.
	*/
	const conversationIdIntegration = defineIntegration(_conversationIdIntegration);
	// ../core/build/esm/fetch.js
	/**
	* Create and track fetch request spans for usage in combination with `addFetchInstrumentationHandler`.
	*
	* @returns Span if a span was created, otherwise void.
	*/
	function instrumentFetchRequest(handlerData, shouldCreateSpan, shouldAttachHeaders, spans, instrumentFetchRequestOptions) {
		if (!handlerData.fetchData) return;
		const { method, url } = handlerData.fetchData;
		const shouldCreateSpanResult = hasSpansEnabled() && shouldCreateSpan(url);
		if (handlerData.endTimestamp) {
			const spanId = handlerData.fetchData.__span;
			if (!spanId) return;
			const span = spans[spanId];
			if (span) {
				if (shouldCreateSpanResult) {
					endSpan(span, handlerData);
					_callOnRequestSpanEnd(span, handlerData, instrumentFetchRequestOptions);
				}
				delete spans[spanId];
			}
			return;
		}
		const { spanOrigin = "auto.http.browser", propagateTraceparent = false, urlBase } = instrumentFetchRequestOptions ?? {};
		const client = getClient();
		const hasParent = !!getActiveSpan();
		const shouldEmitSpan = hasParent || !!client && hasSpanStreamingEnabled(client);
		const span = shouldCreateSpanResult && shouldEmitSpan ? startInactiveSpan$1(getSpanStartOptions(url, method, spanOrigin, client, urlBase)) : new SentryNonRecordingSpan();
		const spanForTraceHeaders = spanIsIgnored(span) && hasParent ? void 0 : span;
		if (shouldCreateSpanResult && !shouldEmitSpan) client?.recordDroppedEvent("no_parent_span", "span");
		handlerData.fetchData.__span = span.spanContext().spanId;
		spans[span.spanContext().spanId] = span;
		if (shouldAttachHeaders(handlerData.fetchData.url)) {
			const request = handlerData.args[0];
			const options = { ...handlerData.args[1] || {} };
			const headers = _INTERNAL_getTracingHeadersForFetchRequest(request, options, hasSpansEnabled() && shouldEmitSpan ? spanForTraceHeaders : void 0, propagateTraceparent);
			if (headers) {
				handlerData.args[1] = options;
				options.headers = headers;
			}
		}
		if (client) client.emit("beforeOutgoingRequestSpan", span, {
			input: handlerData.args,
			response: handlerData.response,
			startTimestamp: handlerData.startTimestamp,
			endTimestamp: handlerData.endTimestamp
		});
		return span;
	}
	/**
	* Calls the onRequestSpanEnd callback if it is defined.
	*/
	function _callOnRequestSpanEnd(span, handlerData, instrumentFetchRequestOptions) {
		instrumentFetchRequestOptions?.onRequestSpanEnd?.(span, {
			headers: handlerData.response?.headers,
			error: handlerData.error
		});
	}
	/**
	* Builds merged fetch headers that include `sentry-trace` and `baggage` (and optionally `traceparent`)
	* for the given request and init, without mutating the original request or options.
	* Returns `undefined` when there is no `sentry-trace` value to attach.
	*
	* @internal Exported for cross-package instrumentation (for example Cloudflare Workers fetcher bindings)
	* and unit tests
	*
	* Baggage handling:
	* 1. No previous baggage header → include Sentry baggage
	* 2. Previous baggage has no Sentry entries → merge Sentry baggage in
	* 3. Previous baggage already has Sentry entries → leave as-is (may be user-defined)
	*/
	function _INTERNAL_getTracingHeadersForFetchRequest(request, fetchOptionsObj, span, propagateTraceparent) {
		const traceHeaders = getTraceData({
			span,
			propagateTraceparent
		});
		const sentryTrace = traceHeaders["sentry-trace"];
		const baggage = traceHeaders.baggage;
		const traceparent = traceHeaders.traceparent;
		if (!sentryTrace) return;
		const originalHeaders = fetchOptionsObj.headers || (isRequest(request) ? request.headers : void 0);
		if (!originalHeaders) return {
			"sentry-trace": sentryTrace,
			...baggage && { baggage },
			...traceparent && { traceparent }
		};
		else if (isHeaders(originalHeaders)) {
			const newHeaders = new Headers(originalHeaders);
			if (!newHeaders.get("sentry-trace")) newHeaders.set("sentry-trace", sentryTrace);
			if (propagateTraceparent && traceparent && !newHeaders.get("traceparent")) newHeaders.set("traceparent", traceparent);
			if (baggage) {
				const prevBaggageHeader = newHeaders.get("baggage");
				if (!prevBaggageHeader) newHeaders.set("baggage", baggage);
				else if (!baggageHeaderHasSentryBaggageValues(prevBaggageHeader)) newHeaders.set("baggage", `${prevBaggageHeader},${baggage}`);
			}
			return newHeaders;
		} else if (isHeadersInitTupleArray(originalHeaders)) {
			const newHeaders = [...originalHeaders];
			if (!newHeaders.find((header) => header[0] === "sentry-trace")) newHeaders.push(["sentry-trace", sentryTrace]);
			if (propagateTraceparent && traceparent && !newHeaders.find((header) => header[0] === "traceparent")) newHeaders.push(["traceparent", traceparent]);
			const prevBaggageHeaderWithSentryValues = originalHeaders.find((header) => header[0] === "baggage" && typeof header[1] === "string" && baggageHeaderHasSentryBaggageValues(header[1]));
			if (baggage && !prevBaggageHeaderWithSentryValues) newHeaders.push(["baggage", baggage]);
			return newHeaders;
		} else {
			const existingSentryTraceHeader = "sentry-trace" in originalHeaders ? originalHeaders["sentry-trace"] : void 0;
			const existingTraceparentHeader = "traceparent" in originalHeaders ? originalHeaders.traceparent : void 0;
			const existingBaggageHeader = "baggage" in originalHeaders ? originalHeaders.baggage : void 0;
			const newBaggageHeaders = existingBaggageHeader ? Array.isArray(existingBaggageHeader) ? [...existingBaggageHeader] : [existingBaggageHeader] : [];
			const prevBaggageHeaderWithSentryValues = existingBaggageHeader && (Array.isArray(existingBaggageHeader) ? existingBaggageHeader.find((headerItem) => baggageHeaderHasSentryBaggageValues(headerItem)) : baggageHeaderHasSentryBaggageValues(existingBaggageHeader));
			if (baggage && !prevBaggageHeaderWithSentryValues) newBaggageHeaders.push(baggage);
			const newHeaders = Object.assign({}, originalHeaders, {
				"sentry-trace": existingSentryTraceHeader ?? sentryTrace,
				...newBaggageHeaders.length > 0 && { baggage: newBaggageHeaders.join(",") }
			});
			if (propagateTraceparent && traceparent && !existingTraceparentHeader) newHeaders.traceparent = traceparent;
			return newHeaders;
		}
	}
	function endSpan(span, handlerData) {
		if (handlerData.response) {
			setHttpStatus(span, handlerData.response.status);
			const contentLength = handlerData.response?.headers?.get("content-length");
			if (contentLength) {
				const contentLengthNum = parseInt(contentLength);
				if (contentLengthNum > 0) span.setAttribute(El, contentLengthNum);
			}
		} else if (handlerData.error) span.setStatus({
			code: 2,
			message: "internal_error"
		});
		span.end();
	}
	function baggageHeaderHasSentryBaggageValues(baggageHeader) {
		if (typeof baggageHeader !== "string") return false;
		return baggageHeader.split(",").some((baggageEntry) => baggageEntry.trim().startsWith(SENTRY_BAGGAGE_KEY_PREFIX));
	}
	function isHeaders(headers) {
		return typeof Headers !== "undefined" && isInstanceOf(headers, Headers);
	}
	/** `HeadersInit` array form: each entry is a [name, value] pair of strings. */
	function isHeadersInitTupleArray(headers) {
		if (!Array.isArray(headers)) return false;
		return headers.every((item) => Array.isArray(item) && item.length === 2 && typeof item[0] === "string");
	}
	function getSpanStartOptions(url, method, spanOrigin, client, urlBase) {
		const isStreamed = !!client && hasSpanStreamingEnabled(client);
		const domain = getUrlDomain(url, urlBase);
		if (url.startsWith("data:")) {
			const sanitizedUrl = stripDataUrlContent(url);
			return {
				name: isStreamed ? method : `${method} ${sanitizedUrl}`,
				attributes: getFetchSpanAttributes(url, void 0, method, spanOrigin, client, domain)
			};
		}
		const parsedUrl = parseStringToURLObject(url);
		const sanitizedUrl = parsedUrl ? getSanitizedUrlStringFromUrlObject(parsedUrl) : url;
		return {
			name: isStreamed ? domain ? `${method} ${domain}` : method : `${method} ${sanitizedUrl}`,
			attributes: getFetchSpanAttributes(url, parsedUrl, method, spanOrigin, client, domain)
		};
	}
	function getFetchSpanAttributes(url, parsedUrl, method, spanOrigin, client, domain) {
		const attributes = {
			[py]: filterCollectedUrl(stripDataUrlContent(url), client),
			type: "fetch",
			[ul]: method,
			[_b]: spanOrigin,
			[yb]: CE,
			[oy]: domain
		};
		if (parsedUrl) {
			if (!isURLObjectRelative(parsedUrl)) {
				attributes[py] = filterCollectedUrl(stripDataUrlContent(parsedUrl.href), client);
				attributes[rg] = parsedUrl.hostname;
				attributes[lg] = parsedUrl.port ? Number(parsedUrl.port) : void 0;
			}
			attributes[yy] = filterCollectedUrlQuery(getUrlQuery(parsedUrl.search), client);
			attributes[ly] = getUrlFragment(parsedUrl.hash);
		}
		return attributes;
	}
	// ../core/build/esm/utils/supports.js
	const WINDOW$4 = GLOBAL_OBJ;
	function _isFetchSupported() {
		if (!("fetch" in WINDOW$4)) return false;
		try {
			new Headers();
			new Request("data:,");
			new Response();
			return true;
		} catch {
			return false;
		}
	}
	/**
	* isNative checks if the given function is a native implementation
	*/
	function isNativeFunction(func) {
		return func && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
	}
	/**
	* Tells whether current environment supports Fetch API natively
	* {@link supportsNativeFetch}.
	*
	* @returns true if `window.fetch` is natively implemented, false otherwise
	*/
	function supportsNativeFetch() {
		if (typeof EdgeRuntime === "string") return true;
		if (!_isFetchSupported()) return false;
		if (isNativeFunction(WINDOW$4.fetch)) return true;
		let result = false;
		const doc = WINDOW$4.document;
		if (doc && typeof doc.createElement === "function") try {
			const sandbox = doc.createElement("iframe");
			sandbox.hidden = true;
			doc.head.appendChild(sandbox);
			if (sandbox.contentWindow?.fetch) result = isNativeFunction(sandbox.contentWindow.fetch);
			doc.head.removeChild(sandbox);
		} catch (err) {
			debug$1.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ", err);
		}
		return result;
	}
	// ../core/build/esm/instrument/fetch.js
	/**
	* Add an instrumentation handler for when a fetch request happens.
	* The handler function is called once when the request starts and once when it ends,
	* which can be identified by checking if it has an `endTimestamp`.
	* Returns a function to remove the handler.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addFetchInstrumentationHandler(handler) {
		const type = "fetch";
		const removeHandler = addHandler$1(type, handler);
		maybeInstrument(type, () => instrumentFetch());
		return removeHandler;
	}
	/**
	* Add an instrumentation handler for long-lived fetch requests, like consuming server-sent events (SSE) via fetch.
	* The handler will resolve the request body and emit the actual `endTimestamp`, so that the
	* span can be updated accordingly.
	* Returns a function to remove the handler.
	*
	* Only used internally
	* @hidden
	*/
	function addFetchEndInstrumentationHandler(handler) {
		const type = "fetch-body-resolved";
		const removeHandler = addHandler$1(type, handler);
		maybeInstrument(type, () => instrumentFetch(streamHandler));
		return removeHandler;
	}
	function instrumentFetch(onFetchResolved) {
		if (isBrowser() && !supportsNativeFetch()) return;
		fill(GLOBAL_OBJ, "fetch", function(originalFetch) {
			return new Proxy(originalFetch, { apply(target, _thisArg, args) {
				const virtualError = /* @__PURE__ */ new Error();
				const { method, url } = parseFetchArgs(args);
				const handlerData = {
					args,
					fetchData: {
						method,
						url
					},
					startTimestamp: timestampInSeconds() * 1e3,
					virtualError,
					headers: getHeadersFromFetchArgs(args)
				};
				if (!onFetchResolved) triggerHandlers$1("fetch", { ...handlerData });
				return Reflect.apply(target, GLOBAL_OBJ, args).then(async (response) => {
					if (onFetchResolved) onFetchResolved(response);
					else triggerHandlers$1("fetch", {
						...handlerData,
						endTimestamp: timestampInSeconds() * 1e3,
						response
					});
					return response;
				}, (error) => {
					triggerHandlers$1("fetch", {
						...handlerData,
						endTimestamp: timestampInSeconds() * 1e3,
						error
					});
					if (isError(error) && error.stack === void 0) {
						error.stack = virtualError.stack;
						addNonEnumerableProperty(error, "framesToPop", 1);
					}
					const enhanceOption = getClient()?.getOptions().enhanceFetchErrorMessages ?? "always";
					if (enhanceOption !== false && isError(error) && error.name === "TypeError" && (error.message === "Failed to fetch" || error.message === "Load failed" || error.message === "NetworkError when attempting to fetch resource.")) try {
						const hostname = new URL(handlerData.fetchData.url, GLOBAL_OBJ.location?.href).host;
						if (hostname) {
							if (enhanceOption === "always") error.message = `${error.message} (${hostname})`;
							else addNonEnumerableProperty(error, "__sentry_fetch_url_host__", hostname);
						}
					} catch {}
					throw error;
				});
			} });
		});
	}
	async function resolveResponse(res, onFinishedResolving) {
		if (res?.body) {
			const body = res.body;
			const responseReader = body.getReader();
			const maxFetchDurationTimeout = setTimeout(() => {
				body.cancel().then(null, () => {});
			}, 9e4);
			let readingActive = true;
			while (readingActive) {
				let chunkTimeout;
				try {
					chunkTimeout = setTimeout(() => {
						body.cancel().then(null, () => {});
					}, 5e3);
					const { done } = await responseReader.read();
					clearTimeout(chunkTimeout);
					if (done) {
						onFinishedResolving();
						readingActive = false;
					}
				} catch {
					readingActive = false;
				} finally {
					clearTimeout(chunkTimeout);
				}
			}
			clearTimeout(maxFetchDurationTimeout);
			responseReader.releaseLock();
			body.cancel().then(null, () => {});
		}
	}
	function streamHandler(response) {
		let clonedResponseForResolving;
		try {
			clonedResponseForResolving = response.clone();
		} catch {
			return;
		}
		resolveResponse(clonedResponseForResolving, () => {
			triggerHandlers$1("fetch-body-resolved", {
				endTimestamp: timestampInSeconds() * 1e3,
				response
			});
		});
	}
	function hasProp(obj, prop) {
		return isObjectLike(obj) && !!obj[prop];
	}
	function getUrlFromResource(resource) {
		if (typeof resource === "string") return resource;
		if (!resource) return "";
		if (hasProp(resource, "url")) return resource.url;
		if (resource.toString) return resource.toString();
		return "";
	}
	/**
	* Parses the fetch arguments to find the used Http method and the url of the request.
	* Exported for tests only.
	*/
	function parseFetchArgs(fetchArgs) {
		if (fetchArgs.length === 0) return {
			method: "GET",
			url: ""
		};
		if (fetchArgs.length === 2) {
			const [resource, options] = fetchArgs;
			return {
				url: getUrlFromResource(resource),
				method: hasProp(options, "method") ? String(options.method).toUpperCase() : isRequest(resource) && hasProp(resource, "method") ? String(resource.method).toUpperCase() : "GET"
			};
		}
		const arg = fetchArgs[0];
		return {
			url: getUrlFromResource(arg),
			method: hasProp(arg, "method") ? String(arg.method).toUpperCase() : "GET"
		};
	}
	function getHeadersFromFetchArgs(fetchArgs) {
		const [requestArgument, optionsArgument] = fetchArgs;
		try {
			if (typeof optionsArgument === "object" && optionsArgument !== null && "headers" in optionsArgument && optionsArgument.headers) return new Headers(optionsArgument.headers);
			if (isRequest(requestArgument)) return new Headers(requestArgument.headers);
		} catch {}
	}
	// ../core/build/esm/utils/breadcrumb-log-level.js
	/**
	* Determine a breadcrumb's log level (only `warning` or `error`) based on an HTTP status code.
	*/
	function getBreadcrumbLogLevelFromHttpStatusCode(statusCode) {
		if (statusCode === void 0) return;
		else if (statusCode >= 400 && statusCode < 500) return "warning";
		else if (statusCode >= 500) return "error";
		else return;
	}
	// ../core/build/esm/utils/lru.js
	/** A simple Least Recently Used map */
	var LRUMap = class {
		constructor(_maxSize) {
			this._maxSize = _maxSize;
			this._cache = /* @__PURE__ */ new Map();
		}
		/** Get the current size of the cache */
		get size() {
			return this._cache.size;
		}
		/** Get an entry or undefined if it was not in the cache. Re-inserts to update the recently used order */
		get(key) {
			const value = this._cache.get(key);
			if (value === void 0) return;
			this._cache.delete(key);
			this._cache.set(key, value);
			return value;
		}
		/** Insert an entry and evict an older entry if we've reached maxSize */
		set(key, value) {
			this._cache.delete(key);
			if (this._cache.size >= this._maxSize) {
				const nextKey = this._cache.keys().next().value;
				this._cache.delete(nextKey);
			}
			this._cache.set(key, value);
		}
		/** Remove an entry and return the entry if it was in the cache */
		remove(key) {
			const value = this._cache.get(key);
			if (value) this._cache.delete(key);
			return value;
		}
		/** Clear all entries */
		clear() {
			this._cache.clear();
		}
		/** Get all the keys */
		keys() {
			return Array.from(this._cache.keys());
		}
		/** Get all the values */
		values() {
			const values = [];
			this._cache.forEach((value) => values.push(value));
			return values;
		}
	};
	// ../core/build/esm/feedback.js
	/**
	* Send user feedback to Sentry.
	*/
	function captureFeedback(params, hint = {}, scope = getCurrentScope()) {
		const { message, name, email, url, source, associatedEventId, tags } = params;
		const feedbackEvent = {
			contexts: { feedback: {
				contact_email: email,
				name,
				message,
				url,
				source,
				associated_event_id: associatedEventId
			} },
			type: "feedback",
			level: "info",
			tags
		};
		const client = scope?.getClient() || getClient();
		if (client) client.emit("beforeSendFeedback", feedbackEvent, hint);
		return scope.captureEvent(feedbackEvent, hint);
	}
	// ../integration-shims/build/esm/common.js
	const FAKE_FUNCTION = () => void 0;
	// ../integration-shims/build/esm/ElementTiming.js
	/**
	* This is a shim for the ElementTiming integration.
	* It is needed in order for the CDN bundles to continue working when users add/remove metrics
	* from it, without changing their config. This is necessary for the loader mechanism.
	*/
	const elementTimingIntegrationShim = defineIntegration(() => {
		consoleSandbox(() => {
			console.warn("You are using elementTimingIntegration() even though this bundle does not include element timing.");
		});
		return { name: "ElementTiming" };
	});
	// ../integration-shims/build/esm/logs.js
	/**
	* This is a shim for the logger namespace.
	* It is needed in order for the CDN bundles to continue working when users add/remove logs
	* from it, without changing their config. This is necessary for the loader mechanism.
	*/
	function logShim(_message, _attributes) {
		consoleSandbox(() => {
			console.warn("You are using Sentry.logger.* even though this bundle does not include logs.");
		});
	}
	/**
	* This is a shim for the logger.fmt template literal function.
	* It is needed in order for the CDN bundles to continue working when users add/remove logs
	* from it, without changing their config. This is necessary for the loader mechanism.
	*/
	function fmtShim(_strings, ..._values) {
		consoleSandbox(() => {
			console.warn("You are using Sentry.logger.fmt even though this bundle does not include logs.");
		});
		return "";
	}
	const loggerShim = {
		trace: logShim,
		debug: logShim,
		info: logShim,
		warn: logShim,
		error: logShim,
		fatal: logShim,
		fmt: fmtShim
	};
	/**
	* This is a shim for the consoleLoggingIntegration.
	* It is needed in order for the CDN bundles to continue working when users add/remove logs
	* from it, without changing their config. This is necessary for the loader mechanism.
	*/
	const consoleLoggingIntegrationShim = defineIntegration((_options) => {
		consoleSandbox(() => {
			console.warn("You are using consoleLoggingIntegration() even though this bundle does not include logs.");
		});
		return {
			name: "ConsoleLogs",
			setup: FAKE_FUNCTION
		};
	});
	// ../integration-shims/build/esm/metrics.js
	/**
	* This is a shim for the metrics namespace.
	* It is needed in order for the CDN bundles to continue working when users add/remove metrics
	* from it, without changing their config. This is necessary for the loader mechanism.
	*/
	function metricShim(_name, _value, _options) {
		consoleSandbox(() => {
			console.warn("You are using Sentry.metrics.* even though this bundle does not include metrics.");
		});
	}
	const metricsShim = {
		count: metricShim,
		gauge: metricShim,
		distribution: metricShim
	};
	// ../feedback/build/npm/esm/constants/index.js
	const WINDOW$3 = GLOBAL_OBJ;
	const DOCUMENT = WINDOW$3.document;
	const NAVIGATOR$1 = WINDOW$3.navigator;
	const TRIGGER_LABEL = "Report a Bug";
	const CANCEL_BUTTON_LABEL = "Cancel";
	const SUBMIT_BUTTON_LABEL = "Send Bug Report";
	const CONFIRM_BUTTON_LABEL = "Confirm";
	const FORM_TITLE = "Report a Bug";
	const EMAIL_PLACEHOLDER = "your.email@example.org";
	const EMAIL_LABEL = "Email";
	const MESSAGE_PLACEHOLDER = "What's the bug? What did you expect?";
	const MESSAGE_LABEL = "Description";
	const NAME_PLACEHOLDER = "Your Name";
	const NAME_LABEL = "Name";
	const SUCCESS_MESSAGE_TEXT = "Thank you for your report!";
	const IS_REQUIRED_LABEL = "(required)";
	const ADD_SCREENSHOT_LABEL = "Add a screenshot";
	const REMOVE_SCREENSHOT_LABEL = "Remove screenshot";
	const HIGHLIGHT_TOOL_TEXT = "Highlight";
	const HIDE_TOOL_TEXT = "Hide";
	const REMOVE_HIGHLIGHT_TEXT = "Remove";
	const ERROR_EMPTY_MESSAGE_TEXT = "Unable to submit feedback with empty message";
	const ERROR_NO_CLIENT_TEXT = "No client setup, cannot send feedback.";
	const ERROR_TIMEOUT_TEXT = "Unable to determine if Feedback was correctly sent.";
	const ERROR_FORBIDDEN_TEXT = "Unable to send feedback. This could be because this domain is not in your list of allowed domains.";
	const ERROR_GENERIC_TEXT = "Unable to send feedback. This could be because of network issues, or because you are using an ad-blocker.";
	// ../feedback/build/npm/esm/util/createFeedbackError.js
	const DEFAULT_MESSAGES = {
		ERROR_EMPTY_MESSAGE: ERROR_EMPTY_MESSAGE_TEXT,
		ERROR_NO_CLIENT: ERROR_NO_CLIENT_TEXT,
		ERROR_TIMEOUT: ERROR_TIMEOUT_TEXT,
		ERROR_FORBIDDEN: ERROR_FORBIDDEN_TEXT,
		ERROR_GENERIC: ERROR_GENERIC_TEXT
	};
	function resolveFeedbackErrorMessage(code, messages) {
		return messages?.[code] ?? DEFAULT_MESSAGES[code];
	}
	function createFeedbackError(code, messages) {
		return new Error(resolveFeedbackErrorMessage(code, messages));
	}
	// ../feedback/build/npm/esm/core/sendFeedback.js
	/**
	* Public API to send a Feedback item to Sentry
	*/
	const sendFeedback = (params, hint = { includeReplay: true }) => {
		const errorMessages = hint.errorMessages;
		if (!params.message) throw createFeedbackError("ERROR_EMPTY_MESSAGE", errorMessages);
		const client = getClient();
		if (!client) throw createFeedbackError("ERROR_NO_CLIENT", errorMessages);
		if (params.tags && Object.keys(params.tags).length) getCurrentScope().setTags(params.tags);
		const eventId = captureFeedback({
			source: "api",
			url: _getLocationHref(),
			...params
		}, hint);
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				cleanup();
				reject(createFeedbackError("ERROR_TIMEOUT", errorMessages));
			}, 3e4);
			const cleanup = client.on("afterSendEvent", (event, response) => {
				if (event.event_id !== eventId) return;
				clearTimeout(timeout);
				cleanup();
				if (response?.statusCode && response.statusCode >= 200 && response.statusCode < 300) return resolve(eventId);
				if (response?.statusCode === 403) return reject(createFeedbackError("ERROR_FORBIDDEN", errorMessages));
				return reject(createFeedbackError("ERROR_GENERIC", errorMessages));
			});
		});
	};
	/**
	* A safe form of location.href.
	*/
	function _getLocationHref() {
		try {
			return WINDOW$3.document.location.href;
		} catch {
			return "";
		}
	}
	// ../feedback/build/npm/esm/util/isScreenshotSupported.js
	/**
	* Mobile browsers do not support `mediaDevices.getDisplayMedia` even though they have the api implemented
	* Instead they return things like `NotAllowedError` when called.
	*
	* It's simpler for us to browser sniff first, and avoid loading the integration if we can.
	*
	* https://stackoverflow.com/a/58879212
	* https://stackoverflow.com/a/3540295
	*
	* `mediaDevices.getDisplayMedia` is also only supported in secure contexts, and return a `mediaDevices is not supported` error, so we should also avoid loading the integration if we can.
	*
	* https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
	*/
	function isScreenshotSupported() {
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(NAVIGATOR$1.userAgent)) return false;
		/**
		* User agent on iPads show as Macintosh, so we need extra checks
		*
		* https://forums.developer.apple.com/forums/thread/119186
		* https://stackoverflow.com/questions/60482650/how-to-detect-ipad-useragent-on-safari-browser
		*/
		if (/Macintosh/i.test(NAVIGATOR$1.userAgent) && NAVIGATOR$1.maxTouchPoints && NAVIGATOR$1.maxTouchPoints > 1) return false;
		if (!isSecureContext) return false;
		return true;
	}
	// ../feedback/build/npm/esm/util/mergeOptions.js
	/**
	* Quick and dirty deep merge for the Feedback integration options
	*/
	function mergeOptions(defaultOptions, optionOverrides) {
		return {
			...defaultOptions,
			...optionOverrides,
			tags: {
				...defaultOptions.tags,
				...optionOverrides.tags
			},
			onFormOpen: () => {
				optionOverrides.onFormOpen?.();
				defaultOptions.onFormOpen?.();
			},
			onFormClose: () => {
				optionOverrides.onFormClose?.();
				defaultOptions.onFormClose?.();
			},
			onSubmitSuccess: (data, eventId) => {
				optionOverrides.onSubmitSuccess?.(data, eventId);
				defaultOptions.onSubmitSuccess?.(data, eventId);
			},
			onSubmitError: (error) => {
				optionOverrides.onSubmitError?.(error);
				defaultOptions.onSubmitError?.(error);
			},
			onFormSubmitted: () => {
				optionOverrides.onFormSubmitted?.();
				defaultOptions.onFormSubmitted?.();
			},
			themeDark: {
				...defaultOptions.themeDark,
				...optionOverrides.themeDark
			},
			themeLight: {
				...defaultOptions.themeLight,
				...optionOverrides.themeLight
			}
		};
	}
	// ../feedback/build/npm/esm/core/components/Actor.css.js
	/**
	* Creates <style> element for widget actor (button that opens the dialog)
	*/
	function createActorStyles(styleNonce) {
		const style = DOCUMENT.createElement("style");
		style.textContent = `
.widget__actor {
  position: fixed;
  z-index: var(--z-index);
  margin: var(--page-margin);
  inset: var(--actor-inset);

  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;

  font-family: inherit;
  font-size: var(--font-size);
  font-weight: 600;
  line-height: 1.14em;
  text-decoration: none;

  background: var(--actor-background, var(--background));
  border-radius: var(--actor-border-radius, 1.7em/50%);
  border: var(--actor-border, var(--border));
  box-shadow: var(--actor-box-shadow, var(--box-shadow));
  color: var(--actor-color, var(--foreground));
  fill: var(--actor-color, var(--foreground));
  cursor: pointer;
  opacity: 1;
  transition: transform 0.2s ease-in-out;
  transform: translate(0, 0) scale(1);
}
.widget__actor[aria-hidden="true"] {
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: translate(0, 16px) scale(0.98);
}

.widget__actor:hover {
  background: var(--actor-hover-background, var(--background));
  filter: var(--interactive-filter);
}

.widget__actor svg {
  width: 1.14em;
  height: 1.14em;
}

@media (max-width: 600px) {
  .widget__actor span {
    display: none;
  }
}
`;
		if (styleNonce) style.setAttribute("nonce", styleNonce);
		return style;
	}
	// ../feedback/build/npm/esm/util/setAttributesNS.js
	/**
	* Helper function to set a dict of attributes on element (w/ specified namespace)
	*/
	function setAttributesNS(el, attributes) {
		Object.entries(attributes).forEach(([key, val]) => {
			el.setAttributeNS(null, key, val);
		});
		return el;
	}
	// ../feedback/build/npm/esm/core/components/FeedbackIcon.js
	const SIZE = 20;
	const XMLNS = "http://www.w3.org/2000/svg";
	/**
	* Feedback Icon
	*/
	function FeedbackIcon() {
		const createElementNS = (tagName) => WINDOW$3.document.createElementNS(XMLNS, tagName);
		const svg = setAttributesNS(createElementNS("svg"), {
			width: `${SIZE}`,
			height: `${SIZE}`,
			viewBox: `0 0 ${SIZE} ${SIZE}`,
			fill: "var(--actor-color, var(--foreground))"
		});
		const g = setAttributesNS(createElementNS("g"), { clipPath: "url(#clip0_57_80)" });
		const path = setAttributesNS(createElementNS("path"), {
			["fill-rule"]: "evenodd",
			["clip-rule"]: "evenodd",
			d: "M15.6622 15H12.3997C12.2129 14.9959 12.031 14.9396 11.8747 14.8375L8.04965 12.2H7.49956V19.1C7.4875 19.3348 7.3888 19.5568 7.22256 19.723C7.05632 19.8892 6.83435 19.9879 6.59956 20H2.04956C1.80193 19.9968 1.56535 19.8969 1.39023 19.7218C1.21511 19.5467 1.1153 19.3101 1.11206 19.0625V12.2H0.949652C0.824431 12.2017 0.700142 12.1783 0.584123 12.1311C0.468104 12.084 0.362708 12.014 0.274155 11.9255C0.185602 11.8369 0.115689 11.7315 0.0685419 11.6155C0.0213952 11.4995 -0.00202913 11.3752 -0.00034808 11.25V3.75C-0.00900498 3.62067 0.0092504 3.49095 0.0532651 3.36904C0.0972798 3.24712 0.166097 3.13566 0.255372 3.04168C0.344646 2.94771 0.452437 2.87327 0.571937 2.82307C0.691437 2.77286 0.82005 2.74798 0.949652 2.75H8.04965L11.8747 0.1625C12.031 0.0603649 12.2129 0.00407221 12.3997 0H15.6622C15.9098 0.00323746 16.1464 0.103049 16.3215 0.278167C16.4966 0.453286 16.5964 0.689866 16.5997 0.9375V3.25269C17.3969 3.42959 18.1345 3.83026 18.7211 4.41679C19.5322 5.22788 19.9878 6.32796 19.9878 7.47502C19.9878 8.62209 19.5322 9.72217 18.7211 10.5333C18.1345 11.1198 17.3969 11.5205 16.5997 11.6974V14.0125C16.6047 14.1393 16.5842 14.2659 16.5395 14.3847C16.4948 14.5035 16.4268 14.6121 16.3394 14.7042C16.252 14.7962 16.147 14.8698 16.0307 14.9206C15.9144 14.9714 15.7891 14.9984 15.6622 15ZM1.89695 10.325H1.88715V4.625H8.33715C8.52423 4.62301 8.70666 4.56654 8.86215 4.4625L12.6872 1.875H14.7247V13.125H12.6872L8.86215 10.4875C8.70666 10.3835 8.52423 10.327 8.33715 10.325H2.20217C2.15205 10.3167 2.10102 10.3125 2.04956 10.3125C1.9981 10.3125 1.94708 10.3167 1.89695 10.325ZM2.98706 12.2V18.1625H5.66206V12.2H2.98706ZM16.5997 9.93612V5.01393C16.6536 5.02355 16.7072 5.03495 16.7605 5.04814C17.1202 5.13709 17.4556 5.30487 17.7425 5.53934C18.0293 5.77381 18.2605 6.06912 18.4192 6.40389C18.578 6.73866 18.6603 7.10452 18.6603 7.47502C18.6603 7.84552 18.578 8.21139 18.4192 8.54616C18.2605 8.88093 18.0293 9.17624 17.7425 9.41071C17.4556 9.64518 17.1202 9.81296 16.7605 9.90191C16.7072 9.91509 16.6536 9.9265 16.5997 9.93612Z"
		});
		svg.appendChild(g).appendChild(path);
		const speakerDefs = createElementNS("defs");
		const speakerClipPathDef = setAttributesNS(createElementNS("clipPath"), { id: "clip0_57_80" });
		const speakerRect = setAttributesNS(createElementNS("rect"), {
			width: `${SIZE}`,
			height: `${SIZE}`,
			fill: "white"
		});
		speakerClipPathDef.appendChild(speakerRect);
		speakerDefs.appendChild(speakerClipPathDef);
		svg.appendChild(speakerDefs).appendChild(speakerClipPathDef).appendChild(speakerRect);
		return svg;
	}
	// ../feedback/build/npm/esm/core/components/Actor.js
	/**
	* The sentry-provided button to open the feedback modal
	*/
	function Actor({ triggerLabel, triggerAriaLabel, shadow, styleNonce }) {
		const el = DOCUMENT.createElement("button");
		el.type = "button";
		el.className = "widget__actor";
		el.ariaHidden = "false";
		el.ariaLabel = triggerAriaLabel || triggerLabel || "Report a Bug";
		el.appendChild(FeedbackIcon());
		if (triggerLabel) {
			const label = DOCUMENT.createElement("span");
			label.appendChild(DOCUMENT.createTextNode(triggerLabel));
			el.appendChild(label);
		}
		const style = createActorStyles(styleNonce);
		return {
			el,
			appendToDom() {
				shadow.appendChild(style);
				shadow.appendChild(el);
			},
			removeFromDom() {
				el.remove();
				style.remove();
			},
			show() {
				el.ariaHidden = "false";
			},
			hide() {
				el.ariaHidden = "true";
			}
		};
	}
	// ../feedback/build/npm/esm/core/createMainStyles.js
	const PURPLE = "rgba(88, 74, 192, 1)";
	const DEFAULT_LIGHT = {
		foreground: "#2b2233",
		background: "#ffffff",
		accentForeground: "white",
		accentBackground: PURPLE,
		successColor: "#268d75",
		errorColor: "#df3338",
		border: "1.5px solid rgba(41, 35, 47, 0.13)",
		boxShadow: "0px 4px 24px 0px rgba(43, 34, 51, 0.12)",
		outline: "1px auto var(--accent-background)",
		interactiveFilter: "brightness(95%)"
	};
	const DEFAULT_DARK = {
		foreground: "#ebe6ef",
		background: "#29232f",
		accentForeground: "white",
		accentBackground: PURPLE,
		successColor: "#2da98c",
		errorColor: "#f55459",
		border: "1.5px solid rgba(235, 230, 239, 0.15)",
		boxShadow: "0px 4px 24px 0px rgba(43, 34, 51, 0.12)",
		outline: "1px auto var(--accent-background)",
		interactiveFilter: "brightness(150%)"
	};
	function getThemedCssVariables(theme) {
		return `
  --foreground: ${theme.foreground};
  --background: ${theme.background};
  --accent-foreground: ${theme.accentForeground};
  --accent-background: ${theme.accentBackground};
  --success-color: ${theme.successColor};
  --error-color: ${theme.errorColor};
  --border: ${theme.border};
  --box-shadow: ${theme.boxShadow};
  --outline: ${theme.outline};
  --interactive-filter: ${theme.interactiveFilter};
  `;
	}
	/**
	* Creates <style> element for widget actor (button that opens the dialog)
	*/
	function createMainStyles({ colorScheme, themeDark, themeLight, styleNonce }) {
		const style = DOCUMENT.createElement("style");
		style.textContent = `
:host {
  --font-family: system-ui, 'Helvetica Neue', Arial, sans-serif;
  --font-size: 14px;
  --z-index: 100000;

  --page-margin: 16px;
  --inset: auto 0 0 auto;
  --actor-inset: var(--inset);

  font-family: var(--font-family);
  font-size: var(--font-size);

  ${colorScheme !== "system" ? `color-scheme: only ${colorScheme};` : ""}

  ${getThemedCssVariables(colorScheme === "dark" ? {
			...DEFAULT_DARK,
			...themeDark
		} : {
			...DEFAULT_LIGHT,
			...themeLight
		})}
}

${colorScheme === "system" ? `
@media (prefers-color-scheme: dark) {
  :host {
    color-scheme: only dark;

    ${getThemedCssVariables({
			...DEFAULT_DARK,
			...themeDark
		})}
  }
}` : ""}
`;
		if (styleNonce) style.setAttribute("nonce", styleNonce);
		return style;
	}
	// ../feedback/build/npm/esm/core/integration.js
	const buildFeedbackIntegration = ({ lazyLoadIntegration, getModalIntegration, getScreenshotIntegration }) => {
		const feedbackIntegration = (({ id = "sentry-feedback", autoInject = true, showBranding = true, isEmailRequired = false, isNameRequired = false, showEmail = true, showName = true, enableScreenshot = true, useSentryUser = {
			email: "email",
			name: "username"
		}, tags, styleNonce, scriptNonce, colorScheme = "system", themeLight = {}, themeDark = {}, addScreenshotButtonLabel = ADD_SCREENSHOT_LABEL, cancelButtonLabel = CANCEL_BUTTON_LABEL, confirmButtonLabel = CONFIRM_BUTTON_LABEL, emailLabel = EMAIL_LABEL, emailPlaceholder = EMAIL_PLACEHOLDER, formTitle = FORM_TITLE, isRequiredLabel = IS_REQUIRED_LABEL, messageLabel = MESSAGE_LABEL, messagePlaceholder = MESSAGE_PLACEHOLDER, nameLabel = NAME_LABEL, namePlaceholder = NAME_PLACEHOLDER, removeScreenshotButtonLabel = REMOVE_SCREENSHOT_LABEL, submitButtonLabel = SUBMIT_BUTTON_LABEL, successMessageText = SUCCESS_MESSAGE_TEXT, triggerLabel = TRIGGER_LABEL, triggerAriaLabel = "", highlightToolText = HIGHLIGHT_TOOL_TEXT, hideToolText = HIDE_TOOL_TEXT, removeHighlightText = REMOVE_HIGHLIGHT_TEXT, errorEmptyMessageText = ERROR_EMPTY_MESSAGE_TEXT, errorNoClientText = ERROR_NO_CLIENT_TEXT, errorTimeoutText = ERROR_TIMEOUT_TEXT, errorForbiddenText = ERROR_FORBIDDEN_TEXT, errorGenericText = ERROR_GENERIC_TEXT, onFormOpen, onFormClose, onSubmitSuccess, onSubmitError, onFormSubmitted } = {}) => {
			const _options = {
				id,
				autoInject,
				showBranding,
				isEmailRequired,
				isNameRequired,
				showEmail,
				showName,
				enableScreenshot,
				useSentryUser,
				tags,
				styleNonce,
				scriptNonce,
				colorScheme,
				themeDark,
				themeLight,
				triggerLabel,
				triggerAriaLabel,
				cancelButtonLabel,
				submitButtonLabel,
				confirmButtonLabel,
				formTitle,
				emailLabel,
				emailPlaceholder,
				messageLabel,
				messagePlaceholder,
				nameLabel,
				namePlaceholder,
				successMessageText,
				isRequiredLabel,
				addScreenshotButtonLabel,
				removeScreenshotButtonLabel,
				highlightToolText,
				hideToolText,
				removeHighlightText,
				errorEmptyMessageText,
				errorNoClientText,
				errorTimeoutText,
				errorForbiddenText,
				errorGenericText,
				onFormClose,
				onFormOpen,
				onSubmitError,
				onSubmitSuccess,
				onFormSubmitted
			};
			let _shadow = null;
			let _mainStyle = null;
			let _subscriptions = [];
			/**
			* Get the shadow root where we will append css
			*/
			const _createShadow = (options) => {
				if (!_shadow) {
					const host = DOCUMENT.createElement("div");
					host.id = String(options.id);
					DOCUMENT.body.appendChild(host);
					_shadow = host.attachShadow({ mode: "open" });
					_mainStyle = createMainStyles(options);
					_shadow.appendChild(_mainStyle);
				}
				return _shadow;
			};
			const _loadAndRenderDialog = async (options) => {
				const screenshotRequired = options.enableScreenshot && isScreenshotSupported();
				let modalIntegration;
				let screenshotIntegration;
				try {
					modalIntegration = (getModalIntegration ? getModalIntegration() : await lazyLoadIntegration("feedbackModalIntegration", scriptNonce))();
					addIntegration(modalIntegration);
				} catch {
					debug$1.error("[Feedback] Error when trying to load feedback integrations. Try using `feedbackSyncIntegration` in your `Sentry.init`.");
					throw new Error("[Feedback] Missing feedback modal integration!");
				}
				try {
					const screenshotIntegrationFn = screenshotRequired ? getScreenshotIntegration ? getScreenshotIntegration() : await lazyLoadIntegration("feedbackScreenshotIntegration", scriptNonce) : void 0;
					if (screenshotIntegrationFn) {
						screenshotIntegration = screenshotIntegrationFn();
						addIntegration(screenshotIntegration);
					}
				} catch {
					debug$1.error("[Feedback] Missing feedback screenshot integration. Proceeding without screenshots.");
				}
				const errorMessages = {
					ERROR_EMPTY_MESSAGE: options.errorEmptyMessageText,
					ERROR_NO_CLIENT: options.errorNoClientText,
					ERROR_TIMEOUT: options.errorTimeoutText,
					ERROR_FORBIDDEN: options.errorForbiddenText,
					ERROR_GENERIC: options.errorGenericText
				};
				const wrappedSendFeedback = (params, hint) => sendFeedback(params, {
					includeReplay: true,
					...hint,
					errorMessages
				});
				const dialog = modalIntegration.createDialog({
					options: {
						...options,
						onFormClose: () => {
							dialog?.close();
							options.onFormClose?.();
						},
						onFormSubmitted: () => {
							dialog?.close();
							options.onFormSubmitted?.();
						}
					},
					screenshotIntegration,
					sendFeedback: wrappedSendFeedback,
					shadow: _createShadow(options)
				});
				return dialog;
			};
			const _attachTo = (el, optionOverrides = {}) => {
				const mergedOptions = mergeOptions(_options, optionOverrides);
				const targetEl = typeof el === "string" ? DOCUMENT.querySelector(el) : typeof el.addEventListener === "function" ? el : null;
				if (!targetEl) {
					debug$1.error("[Feedback] Unable to attach to target element");
					throw new Error("Unable to attach to target element");
				}
				let dialog = null;
				const handleClick = async () => {
					if (!dialog) dialog = await _loadAndRenderDialog({
						...mergedOptions,
						onFormSubmitted: () => {
							dialog?.removeFromDom();
							mergedOptions.onFormSubmitted?.();
						}
					});
					dialog.appendToDom();
					dialog.open();
				};
				targetEl.addEventListener("click", handleClick);
				const unsubscribe = () => {
					_subscriptions = _subscriptions.filter((sub) => sub !== unsubscribe);
					dialog?.removeFromDom();
					dialog = null;
					targetEl.removeEventListener("click", handleClick);
				};
				_subscriptions.push(unsubscribe);
				return unsubscribe;
			};
			const _createActor = (optionOverrides = {}) => {
				const mergedOptions = mergeOptions(_options, optionOverrides);
				const shadow = _createShadow(mergedOptions);
				const actor = Actor({
					triggerLabel: mergedOptions.triggerLabel,
					triggerAriaLabel: mergedOptions.triggerAriaLabel,
					shadow,
					styleNonce
				});
				_attachTo(actor.el, {
					...mergedOptions,
					onFormOpen() {
						actor.hide();
					},
					onFormClose() {
						actor.show();
					},
					onFormSubmitted() {
						actor.show();
					}
				});
				return actor;
			};
			return {
				name: "Feedback",
				setupOnce() {
					if (!isBrowser() || !_options.autoInject) return;
					if (DOCUMENT.readyState === "loading") DOCUMENT.addEventListener("DOMContentLoaded", () => _createActor().appendToDom());
					else _createActor().appendToDom();
				},
				/**
				* Adds click listener to the element to open a feedback dialog
				*
				* The returned function can be used to remove the click listener
				*/
				attachTo: _attachTo,
				/**
				* Creates a new widget which is composed of a Button which triggers a Dialog.
				* Accepts partial options to override any options passed to constructor.
				*/
				createWidget(optionOverrides = {}) {
					const actor = _createActor(mergeOptions(_options, optionOverrides));
					actor.appendToDom();
					return actor;
				},
				/**
				* Creates a new Form which you can
				* Accepts partial options to override any options passed to constructor.
				*/
				async createForm(optionOverrides = {}) {
					return _loadAndRenderDialog(mergeOptions(_options, optionOverrides));
				},
				/**
				* Updates the color scheme of the feedback widget at runtime.
				*/
				setTheme(colorScheme) {
					_options.colorScheme = colorScheme;
					if (_shadow) {
						const newStyle = createMainStyles(_options);
						if (_mainStyle) _shadow.replaceChild(newStyle, _mainStyle);
						else _shadow.prepend(newStyle);
						_mainStyle = newStyle;
					}
				},
				/**
				* Removes the Feedback integration (including host, shadow DOM, and all widgets)
				*/
				remove() {
					if (_shadow) {
						_shadow.parentElement?.remove();
						_shadow = null;
						_mainStyle = null;
					}
					_subscriptions.forEach((sub) => sub());
					_subscriptions = [];
				}
			};
		});
		return feedbackIntegration;
	};
	// ../feedback/build/npm/esm/core/getFeedback.js
	/**
	* This is a small utility to get a type-safe instance of the Feedback integration.
	*/
	function getFeedback() {
		return getClient()?.getIntegrationByName("Feedback");
	}
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
	const n$1 = () => t$1;
	const e = (n) => {
		addEventListener("pageshow", (e) => {
			e.persisted && (t$1 = e.timeStamp, n(e));
		}, !0);
	};
	const i$1 = (t, n, e, i) => {
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
		i ? l = i : n$1() >= 0 ? l = "back-forward-cache" : h && (document.prerendering || a() > 0 ? l = "prerender" : document.wasDiscarded ? l = "restore" : h.type && (l = h.type.replace(/_/g, "-")));
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
			if (v && (h = i$1(t, g, E, s.reportAllChanges), e((e) => {
				g = l("FCP", -1, "back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n$1()), h = i$1(t, g, E, s.reportAllChanges), o(() => {
					g.value = performance.now() - e.timeStamp, h(!0);
				});
			})), r) m(["soft-navigation"], (n) => {
				n.forEach((n) => {
					c.l && n.navigationId && b(c.l, n);
					const e = Math.max((n.presentationTime || n.paintTime || 0) - n.startTime, 0);
					g = l("FCP", e, "soft-navigation", n.navigationId, n.interactionId, n.name, n.startTime), h = i$1(t, g, E, s.reportAllChanges), h(!0);
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
				c = l("CLS", 0, n, e, o, a, h), f.i = 0, r = i$1(t, c, L, s.reportAllChanges);
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
			y && (r = i$1(t, c, L, s.reportAllChanges), a.onHidden(() => {
				b(y.takeRecords()), r(!0);
			}), e(() => {
				h("back-forward-cache", c.navigationId, c.navigationInteractionId, c.navigationURL, n$1()), o(r);
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
				c.M(), r = l("INP", -1, n, e, s, f, h), a = i$1(t, r, A, o.reportAllChanges);
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
			a = i$1(t, r, A, o.reportAllChanges), b && (s.onHidden(() => {
				g(b.takeRecords(), !0);
			}), e(() => {
				f("back-forward-cache", r.navigationId, r.navigationInteractionId, r.navigationURL, n$1());
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
				g = l("LCP", -1, n, e, o, a, c), f = i$1(t, g, O, s.reportAllChanges), r = !1, "soft-navigation" === n && (h = d(!0));
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
				f = i$1(t, g, O, s.reportAllChanges);
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
					p("back-forward-cache", g.navigationId, g.navigationInteractionId, g.navigationURL, n$1()), f = i$1(t, g, O, s.reportAllChanges), o(() => {
						g.value = performance.now() - e.timeStamp, r = !0, f(!0);
					});
				});
			}
		});
	};
	const W = [800, 1800];
	const $ = (t) => {
		document.prerendering ? _(() => $(t)) : "complete" !== document.readyState ? addEventListener("load", () => $(t), !0) : setTimeout(t);
	};
	const D = (t, o = {}) => {
		const r = p(o);
		let c = l("TTFB"), f = i$1(t, c, W, o.reportAllChanges);
		$(() => {
			const h = s();
			if (h) {
				if (c.value = Math.max(h.responseStart - a(), 0), c.entries = [h], f(!0), e(() => {
					c = l("TTFB", 0, "back-forward-cache", c.navigationId, c.navigationInteractionId, c.navigationURL, n$1()), f = i$1(t, c, W, o.reportAllChanges), f(!0);
				}), r) m(["soft-navigation"], (n) => {
					n.forEach((n) => {
						n.navigationId && (c = l("TTFB", 0, "soft-navigation", n.navigationId, n.interactionId, n.name, n.startTime), c.entries = [n], f = i$1(t, c, W, o.reportAllChanges), f(!0));
					});
				}, o);
			}
		});
	};
	// ../browser-utils/build/esm/instrumentation/performanceObserver.js
	const handlers$1 = {};
	const instrumented = {};
	let _previousCls;
	let _previousLcp;
	let _previousTtfb;
	let _previousInp;
	let _previousFcp;
	const stopListeners = {};
	let _reportSoftNavs = false;
	let _reportBfcache = false;
	/**
	* Opt the CLS, LCP and INP observers into reporting metrics for soft navigations.
	*
	* This also turns `reportAllChanges` off for CLS and LCP. web-vitals force-reports a metric when
	* the navigation it belongs to is over, so without the intermediate updates every value a handler
	* receives is already the final one for its navigation. That only holds because soft navigations
	* are limited to span streaming, where CLS and LCP are sent as their own spans - the static
	* lifecycle instead writes them onto the pageload span as it ends, which is what `reportAllChanges`
	* was originally added for (#11934, #12360).
	*
	* Each observer is instrumented lazily, on its first handler, and web-vitals takes its options at
	* that point only. So this has to be called before any of the `add*InstrumentationHandler`
	* functions, otherwise it won't take effect for observers that are already running.
	*
	* On browsers without the Soft Navigation API this is a no-op: web-vitals feature-detects the API
	* and keeps reporting hard-navigation metrics as usual.
	*/
	function enableSoftNavigationReporting() {
		_reportSoftNavs = true;
	}
	/**
	* Opt the CLS, LCP and INP observers into reporting metrics for back/forward-cache restores.
	*
	* web-vitals re-reports each metric after a restore, tagged with a `back-forward-cache` navigation
	* type. A restore is a new page view measured against a document that was never reloaded, so the
	* values only mean anything if there is a fresh root span for them to belong to. Without one they
	* would attach to the span the page had before it was frozen, which is why this is off by default.
	*
	* Like `enableSoftNavigationReporting`, this only affects observers instrumented after it is
	* called.
	*/
	function enableBfcacheReporting() {
		_reportBfcache = true;
	}
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
	* Add a callback that will be triggered when a TTFD metric is available.
	*/
	function addTtfbInstrumentationHandler(callback) {
		return addMetricObserver("ttfb", callback, instrumentTtfb, _previousTtfb);
	}
	/**
	* Add a callback that will be triggered when a FCP metric is available.
	*/
	function addFcpInstrumentationHandler(callback) {
		return addMetricObserver("fcp", callback, instrumentFcp, _previousFcp);
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
			if (!_reportBfcache && metric.navigationType === "back-forward-cache") return;
			callback(metric);
		};
	}
	function instrumentCls() {
		if (!("at" in Array.prototype)) return;
		return P(unlessBfcacheDisabled((metric) => {
			triggerHandlers("cls", { metric });
			_previousCls = metric;
		}), {
			reportAllChanges: !_reportSoftNavs && !_reportBfcache,
			reportSoftNavs: _reportSoftNavs
		});
	}
	function instrumentLcp() {
		return U(unlessBfcacheDisabled((metric) => {
			triggerHandlers("lcp", { metric });
			_previousLcp = metric;
		}), {
			reportAllChanges: !_reportSoftNavs && !_reportBfcache,
			reportSoftNavs: _reportSoftNavs
		});
	}
	function instrumentTtfb() {
		return D(unlessBfcacheDisabled((metric) => {
			triggerHandlers("ttfb", { metric });
			_previousTtfb = metric;
		}));
	}
	function instrumentFcp() {
		return M(unlessBfcacheDisabled((metric) => {
			triggerHandlers("fcp", { metric });
			_previousFcp = metric;
		}));
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
	/**
	* Check if a PerformanceEntry is a PerformanceEventTiming by checking for the `duration` property.
	*/
	function isPerformanceEventTiming(entry) {
		return "duration" in entry;
	}
	// ../browser-utils/build/esm/types.js
	const WINDOW$2 = GLOBAL_OBJ;
	// ../browser-utils/build/esm/web-vitals/softNavs.js
	/**
	* A page only ever needs its most recent navigations to still be joinable: web vitals for a soft
	* navigation are finalized at the next soft navigation or on pagehide, never later than that.
	*/
	const MAX_TRACKED_NAVIGATIONS = 5;
	/**
	* Tolerance when matching a DOM event's `timeStamp` against the `startTime` of its Event Timing
	* entry. Both are `DOMHighResTimeStamp`s from the same clock, so this only absorbs rounding.
	*/
	const INTERACTION_MATCH_TOLERANCE_MS = 5;
	let _pendingNavigation;
	let _pendingInteraction;
	let _lastInteractionTimestamp;
	const _interactionIdToNavigationSpan = new LRUMap(MAX_TRACKED_NAVIGATIONS);
	const _navigationIdToNavigationSpan = new LRUMap(MAX_TRACKED_NAVIGATIONS);
	let _correlationStarted = false;
	/**
	* Whether an Event Timing entry's `startTime` and a DOM event's `timeStamp` name the same
	* interaction.
	*/
	function interactionMatches(entryStartTime, interactionTimestamp) {
		return Math.abs(entryStartTime - interactionTimestamp) <= INTERACTION_MATCH_TOLERANCE_MS;
	}
	/**
	* Whether the browser can report web vitals for soft navigations.
	*
	* This mirrors web-vitals' own feature detection: passing `reportSoftNavs` on a browser that fails
	* this check is a no-op there, so it has to be a no-op here too.
	*/
	function supportsSoftNavigations() {
		try {
			return PerformanceObserver.supportedEntryTypes.includes("soft-navigation") && typeof WINDOW$2.PerformanceSoftNavigation?.prototype?.getLargestInteractionContentfulPaint === "function";
		} catch {
			return false;
		}
	}
	/**
	* Start correlating the browser's soft navigations with the SDK's navigation spans.
	*
	* A navigation span is created synchronously on the history change, but the browser only mints the
	* `soft-navigation` entry (and with it the `navigationId` that web vitals are reported against)
	* once the navigation has been confirmed by a paint. So the `navigationId` cannot be known at span
	* creation time and the two have to be joined after the fact.
	*
	* The join key is the `interactionId` of the interaction that drove the navigation: per the Soft
	* Navigations spec the `soft-navigation` entry carries the `interactionId` of the interaction that
	* triggered it, which is the same id the interaction's own `PerformanceEventTiming` entry carries.
	* So we bind a navigation span to the interaction it happened during, and the soft navigation
	* joins back to that span through the shared id.
	*
	* This is inherently partial. Navigations that don't meet the browser's soft navigation heuristic
	* (programmatic navigations, navigations that never paint, back/forward from the browser chrome)
	* produce no entry at all, so those navigation spans simply have no web vitals.
	*/
	function startSoftNavigationCorrelation(client) {
		if (_correlationStarted || !supportsSoftNavigations()) return;
		_correlationStarted = true;
		const onInteraction = (event) => {
			if (event.isTrusted) _lastInteractionTimestamp = event.timeStamp;
		};
		WINDOW$2.addEventListener("click", onInteraction, {
			capture: true,
			passive: true
		});
		WINDOW$2.addEventListener("keydown", onInteraction, {
			capture: true,
			passive: true
		});
		client.on("spanStart", (span) => {
			if (spanToJSON(span).attributes?.["sentry.op"] !== "navigation") return;
			_pendingNavigation = void 0;
			const interactionTimestamp = _lastInteractionTimestamp;
			if (interactionTimestamp == null) return;
			if (_pendingInteraction?.interactionTimestamp === interactionTimestamp) {
				_interactionIdToNavigationSpan.set(_pendingInteraction.interactionId, span);
				_pendingInteraction = void 0;
				return;
			}
			_pendingNavigation = {
				span,
				interactionTimestamp
			};
		});
		const bindInteractionToNavigationSpan = ({ entries }) => {
			for (const entry of entries) {
				if (!isPerformanceEventTiming(entry) || !entry.interactionId) continue;
				const pending = _pendingNavigation;
				if (pending && interactionMatches(entry.startTime, pending.interactionTimestamp)) {
					_interactionIdToNavigationSpan.set(entry.interactionId, pending.span);
					_pendingNavigation = void 0;
					continue;
				}
				if (_interactionIdToNavigationSpan.get(entry.interactionId)) continue;
				if (_lastInteractionTimestamp != null && interactionMatches(entry.startTime, _lastInteractionTimestamp)) _pendingInteraction = {
					interactionId: entry.interactionId,
					interactionTimestamp: _lastInteractionTimestamp
				};
			}
		};
		addPerformanceInstrumentationHandler("event", bindInteractionToNavigationSpan);
		addPerformanceInstrumentationHandler("first-input", bindInteractionToNavigationSpan);
		addPerformanceInstrumentationHandler("soft-navigation", ({ entries }) => {
			for (const entry of entries) {
				const span = _interactionIdToNavigationSpan.get(entry.interactionId);
				if (!span) {
					debug$1.log(`[SoftNav] No navigation span found for soft navigation ${entry.navigationId}`, entry);
					continue;
				}
				_navigationIdToNavigationSpan.set(entry.navigationId, span);
				span.setAttribute(Zt, entry.navigationId);
			}
		});
	}
	/**
	* The navigation span a soft navigation web vital belongs to, or `undefined` if the metric isn't
	* for a soft navigation or we failed to correlate it.
	*/
	function getNavigationSpanForMetric(metric) {
		if (metric.navigationType !== "soft-navigation") return;
		const span = _navigationIdToNavigationSpan.get(metric.navigationId);
		if (span) return span;
		return metric.navigationInteractionId != null ? _interactionIdToNavigationSpan.get(metric.navigationInteractionId) : void 0;
	}
	// ../browser-utils/build/esm/performance/utils.js
	/**
	* Checks if a given value is a valid measurement value.
	*/
	function isMeasurementValue(value) {
		return typeof value === "number" && isFinite(value);
	}
	/**
	* Helper function to start child on transactions. This function will make sure that the transaction will
	* use the start timestamp of the created child span if it is earlier than the transactions actual
	* start timestamp.
	*/
	function startAndEndSpan(parentSpan, startTimeInSeconds, endTime, { ...ctx }) {
		const parentStartTime = spanToStaticSpanJSON(parentSpan).start_timestamp;
		if (parentStartTime && parentStartTime > startTimeInSeconds) {
			if (typeof parentSpan.updateStartTime === "function") parentSpan.updateStartTime(startTimeInSeconds);
		}
		return withActiveSpan(parentSpan, () => {
			const span = startInactiveSpan({
				startTime: startTimeInSeconds,
				...ctx
			});
			if (span) span.end(endTime);
			return span;
		});
	}
	/** Get the browser performance API. */
	function getBrowserPerformanceAPI() {
		return WINDOW$2.addEventListener && WINDOW$2.performance;
	}
	/**
	* Converts from milliseconds to seconds
	* @param time time in ms
	*/
	function msToSec(time) {
		return time / 1e3;
	}
	/**
	* Converts ALPN protocol ids to name and version.
	*
	* (https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids)
	* @param nextHopProtocol PerformanceResourceTiming.nextHopProtocol
	*/
	function extractNetworkProtocol(nextHopProtocol) {
		let name = "unknown";
		let version = "unknown";
		let _name = "";
		for (const char of nextHopProtocol) {
			if (char === "/") {
				[name, version] = nextHopProtocol.split("/");
				break;
			}
			if (!isNaN(Number(char))) {
				name = _name === "h" ? "http" : _name;
				version = nextHopProtocol.split(_name)[1];
				break;
			}
			_name += char;
		}
		if (_name === nextHopProtocol) name = _name;
		return {
			name,
			version
		};
	}
	/**
	* Generic support check for web vitals
	*/
	function supportsWebVital(entryType) {
		try {
			return PerformanceObserver.supportedEntryTypes.includes(entryType);
		} catch {
			return false;
		}
	}
	// ../browser-utils/build/esm/performance/resourceTiming.js
	/**
	* Converts a PerformanceResourceTiming entry to span data for the resource span. Most importantly,
	* it converts the timing values from timestamps relative to the `performance.timeOrigin` to absolute timestamps
	* in seconds.
	*
	* @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#timestamps
	*
	* @param resourceTiming
	* @returns An array where the first element is the attribute name and the second element is the attribute value.
	*/
	function resourceTimingToSpanAttributes(resourceTiming) {
		const timingSpanData = {};
		if (resourceTiming.nextHopProtocol != void 0) {
			const { name, version } = extractNetworkProtocol(resourceTiming.nextHopProtocol);
			timingSpanData[Lu] = version;
			timingSpanData[Du] = name;
		}
		if (performanceTimeToSeconds(resourceTiming.startTime) === void 0) return timingSpanData;
		const getAbsoluteTime = (time) => time ? performanceTimeToSeconds(time, resourceTiming.startTime) : time;
		return dropUndefinedKeysFromObject({
			...timingSpanData,
			[bl]: getAbsoluteTime(resourceTiming.redirectStart),
			[ml]: getAbsoluteTime(resourceTiming.redirectEnd),
			[Sl]: getAbsoluteTime(resourceTiming.workerStart),
			[ll]: getAbsoluteTime(resourceTiming.fetchStart),
			[nl]: getAbsoluteTime(resourceTiming.domainLookupStart),
			[rl]: getAbsoluteTime(resourceTiming.domainLookupEnd),
			[il]: getAbsoluteTime(resourceTiming.connectStart),
			[vl]: getAbsoluteTime(resourceTiming.secureConnectionStart),
			[tl]: getAbsoluteTime(resourceTiming.connectEnd),
			[gl]: getAbsoluteTime(resourceTiming.requestStart),
			[hl]: getAbsoluteTime(resourceTiming.responseStart),
			[_l]: getAbsoluteTime(resourceTiming.responseEnd),
			[kl]: resourceTiming.responseStart != null ? msToSec(resourceTiming.responseStart) : void 0
		});
	}
	/**
	* Remove properties with `undefined` as value from an object.
	* In contrast to `dropUndefinedKeys` in core this funciton only works on first-level
	* key-value objects and does not recursively go into object properties or arrays.
	*/
	function dropUndefinedKeysFromObject(attrs) {
		return Object.fromEntries(Object.entries(attrs).filter(([, value]) => value != null));
	}
	// ../browser-utils/build/esm/performance/entries.js
	const MAX_INT_AS_BYTES = 2147483647;
	let _performanceCursor = 0;
	let _resourceCursor = 0;
	/**
	* Start tracking long tasks.
	*/
	function startTrackingLongTasks() {
		addPerformanceInstrumentationHandler("longtask", ({ entries }) => {
			const parent = getActiveSpan();
			if (!parent) return;
			const { attributes: parentAttributes, start_timestamp: parentStartTimestamp } = spanToJSON(parent);
			for (const entry of entries) {
				const startTime = performanceTimeToSeconds(entry.startTime);
				if (!startTime) continue;
				const duration = msToSec(entry.duration);
				if (parentAttributes["sentry.op"] === "navigation" && parentStartTimestamp && startTime < parentStartTimestamp) continue;
				startAndEndSpan(parent, startTime, startTime + duration, {
					name: UI_LONG_TASK_SPAN_NAME_FALLBACK,
					op: h$1,
					attributes: { [_b]: "auto.ui.browser.metrics" }
				});
			}
		});
	}
	/**
	* Start tracking long animation frames.
	*/
	function startTrackingLongAnimationFrames() {
		new PerformanceObserver((list) => {
			const parent = getActiveSpan();
			if (!parent) return;
			for (const entry of list.getEntries()) {
				const startTime = performanceTimeToSeconds(entry.startTime);
				if (!startTime || !entry.scripts[0]) continue;
				const { start_timestamp: parentStartTimestamp, attributes: { [yb]: parentOp } } = spanToJSON(parent);
				if (parentOp === "navigation" && parentStartTimestamp && startTime < parentStartTimestamp) continue;
				const duration = msToSec(entry.duration);
				const attributes = { [_b]: "auto.ui.browser.metrics" };
				const { invoker, invokerType, sourceURL, sourceFunctionName, sourceCharPosition } = entry.scripts.reduce((longest, script) => script.duration > longest.duration ? script : longest);
				attributes[si] = invoker;
				attributes[ri] = invokerType;
				if (sourceURL) attributes[fa] = sourceURL;
				if (sourceFunctionName) attributes[ka] = sourceFunctionName;
				if (sourceCharPosition !== -1) attributes[ni] = sourceCharPosition;
				startAndEndSpan(parent, startTime, startTime + duration, {
					name: UI_LONG_TASK_SPAN_NAME_FALLBACK,
					op: q$1,
					attributes
				});
			}
		}).observe({
			type: "long-animation-frame",
			buffered: true
		});
	}
	/** Add performance related spans to a transaction */
	function addPerformanceEntries(span, options) {
		const { spanStreamingEnabled } = options;
		const cursor = forEachPerformanceEntry(span, _performanceCursor, (entry, startTimestamp, duration) => {
			switch (entry.entryType) {
				case "navigation":
					_addNavigationSpans(span, entry, spanStreamingEnabled);
					break;
				case "paint": _addPaintSpan(span, entry, startTimestamp, duration);
			}
		});
		if (cursor === void 0) return;
		_performanceCursor = cursor;
		_trackNavigator(span, spanStreamingEnabled);
	}
	/**
	* Add `resource.*` spans to a pageload or navigation span.
	*/
	function addResourceSpans(span, options) {
		const { spanStreamingEnabled, ignoreResourceSpans } = options;
		const cursor = forEachPerformanceEntry(span, _resourceCursor, (entry, startTimestamp, duration) => {
			if (entry.entryType === "resource") _addResourceSpans(span, entry, entry.name, startTimestamp, duration, ignoreResourceSpans, spanStreamingEnabled);
		});
		if (cursor !== void 0) _resourceCursor = cursor;
	}
	/**
	* Calls `callback` for each performance entry recorded since `cursor` that belongs to `span`, and returns
	* the new cursor, or `undefined` when the performance API is not available.
	*/
	function forEachPerformanceEntry(span, cursor, callback) {
		const performance = getBrowserPerformanceAPI();
		if (!performance?.getEntries) return;
		const performanceEntries = performance.getEntries();
		const { attributes, start_timestamp: transactionStartTime } = spanToJSON(span);
		performanceEntries.slice(cursor).forEach((entry) => {
			const startTimestamp = performanceTimeToSeconds(entry.startTime);
			if (!startTimestamp) return;
			const duration = msToSec(Math.max(0, entry.duration));
			if (attributes["sentry.op"] === "navigation" && transactionStartTime && startTimestamp < transactionStartTime) return;
			callback(entry, startTimestamp, duration);
		});
		return Math.max(performanceEntries.length - 1, 0);
	}
	/**
	* Create a span for a browser paint performance entry.
	* Exported only for tests.
	*/
	function _addPaintSpan(span, entry, startTimestamp, duration) {
		startAndEndSpan(span, startTimestamp, startTimestamp + duration, {
			name: entry.name,
			attributes: {
				[yb]: s$1,
				[_b]: "auto.resource.browser.metrics",
				[ei]: entry.name
			}
		});
	}
	/**
	* Instrument navigation entries
	* exported only for tests
	*/
	function _addNavigationSpans(span, entry, spanStreamingEnabled) {
		_addPerformanceNavigationTiming(span, entry, "unloadEvent", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "redirect", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "domContentLoadedEvent", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "loadEvent", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "connect", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "secureConnection", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "fetch", spanStreamingEnabled);
		_addPerformanceNavigationTiming(span, entry, "domainLookup", spanStreamingEnabled);
		_addRequest(span, entry, spanStreamingEnabled);
	}
	/**
	* Navigations can happen long after page load, after the time origin was corrected for drift. We use the origin from
	* the entry's start for all its timings, so its duration stays correct.
	*/
	function _navigationTimeToSeconds(entry, time) {
		return performanceTimeToSeconds(time, entry.startTime);
	}
	const NAVIGATION_TIMING_SPAN_OPS = {
		secureConnection: p$1,
		fetch: P$1,
		domainLookup: m$1,
		unloadEvent: S$1,
		redirect: d$1,
		connect: L$1,
		domContentLoadedEvent: l$1,
		loadEvent: D$1
	};
	/** Create performance navigation related spans */
	function _addPerformanceNavigationTiming(span, entry, event, spanStreamingEnabled) {
		const end = entry[_getEndPropertyNameForNavigationTiming(event)];
		const start = entry[`${event}Start`];
		if (!start || !end) return;
		const op = NAVIGATION_TIMING_SPAN_OPS[event];
		const filteredUrl = filterCollectedUrl(entry.name);
		startAndEndSpan(span, _navigationTimeToSeconds(entry, start), _navigationTimeToSeconds(entry, end), {
			name: spanStreamingEnabled ? BROWSER_NAVIGATION_TIMING_SPAN_NAMES[op] : filteredUrl,
			attributes: {
				[yb]: op,
				[_b]: "auto.ui.browser.metrics",
				[py]: filteredUrl,
				...event === "redirect" && entry.redirectCount != null ? { "http.redirect_count": entry.redirectCount } : {}
			}
		});
	}
	function _getEndPropertyNameForNavigationTiming(event) {
		if (event === "secureConnection") return "connectEnd";
		if (event === "fetch") return "domainLookupStart";
		return `${event}End`;
	}
	/** Create request and response related spans */
	function _addRequest(span, entry, spanStreamingEnabled) {
		const requestStartTimestamp = _navigationTimeToSeconds(entry, entry.requestStart);
		const responseEndTimestamp = _navigationTimeToSeconds(entry, entry.responseEnd);
		const responseStartTimestamp = _navigationTimeToSeconds(entry, entry.responseStart);
		if (entry.responseEnd) {
			const filteredUrl = filterCollectedUrl(entry.name);
			startAndEndSpan(span, requestStartTimestamp, responseEndTimestamp, {
				name: spanStreamingEnabled ? BROWSER_NAVIGATION_TIMING_SPAN_NAMES[M$1] : filteredUrl,
				attributes: {
					[yb]: M$1,
					[_b]: "auto.ui.browser.metrics",
					[py]: filteredUrl
				}
			});
			startAndEndSpan(span, responseStartTimestamp, responseEndTimestamp, {
				name: spanStreamingEnabled ? BROWSER_NAVIGATION_TIMING_SPAN_NAMES[b$1] : filteredUrl,
				attributes: {
					[yb]: b$1,
					[_b]: "auto.ui.browser.metrics",
					[py]: filteredUrl
				}
			});
		}
	}
	/**
	* Create resource-related spans.
	* Exported only for tests.
	*/
	function _addResourceSpans(span, entry, resourceUrl, startTimestamp, duration, ignoredResourceSpanOps, spanStreamingEnabled) {
		if (entry.initiatorType === "xmlhttprequest" || entry.initiatorType === "fetch") return;
		const op = entry.initiatorType ? `resource.${entry.initiatorType}` : u$1;
		if (ignoredResourceSpanOps?.includes(op)) return;
		const attributes = { [_b]: "auto.resource.browser.metrics" };
		const parsedUrl = parseUrl(resourceUrl);
		if (parsedUrl.protocol) attributes[hy] = parsedUrl.protocol.split(":").pop();
		const host = parsedUrl.host?.replace(/^.*@/, "");
		if (host) attributes[rg] = host;
		const domain = host?.replace(/:\d+$/, "");
		if (domain) attributes[oy] = domain;
		attributes[fl] = resourceUrl.includes(WINDOW$2.location.origin);
		const filteredUrl = filterCollectedUrl(resourceUrl);
		attributes[py] = filteredUrl;
		_setResourceRequestAttributes(entry, attributes, [
			["responseStatus", Nl],
			["transferSize", Rl],
			["encodedBodySize", El],
			["decodedBodySize", Tl],
			["renderBlockingStatus", tm],
			["deliveryType", "http.response_delivery_type"]
		]);
		const attributesWithResourceTiming = {
			...attributes,
			...resourceTimingToSpanAttributes(entry)
		};
		startAndEndSpan(span, startTimestamp, startTimestamp + duration, {
			name: spanStreamingEnabled ? domain || "Resource" : filteredUrl.replace(WINDOW$2.location.origin, ""),
			op,
			attributes: attributesWithResourceTiming
		});
	}
	/**
	* Capture the information of the user agent.
	* TODO(v12): Remove non-span-streaming attributes and measurements once the static trace lifecycle is removed
	*/
	function _trackNavigator(span, spanStreamingEnabled) {
		const navigator = WINDOW$2.navigator;
		if (!navigator) return;
		const connection = navigator.connection;
		if (connection) {
			if (connection.effectiveType) span.setAttribute(spanStreamingEnabled ? Au : js, connection.effectiveType);
			if (connection.type) span.setAttribute(spanStreamingEnabled ? Ru : Oa, connection.type);
			if (isMeasurementValue(connection.rtt)) {
				if (spanStreamingEnabled) span.setAttribute(xu, connection.rtt);
				else if (spanToJSON(span).attributes["sentry.op"] === "pageload") setMeasurement("connection.rtt", connection.rtt, "millisecond");
			}
		}
		if (isMeasurementValue(navigator.deviceMemory)) {
			if (spanStreamingEnabled) span.setAttribute(Ts, navigator.deviceMemory);
			else span.setAttribute(is, `${navigator.deviceMemory} GB`);
		}
		if (isMeasurementValue(navigator.hardwareConcurrency)) {
			if (spanStreamingEnabled) span.setAttribute(Rs, navigator.hardwareConcurrency);
			else span.setAttribute(Mo, String(navigator.hardwareConcurrency));
		}
	}
	/**
	* Use this to set any attributes we can take directly form the PerformanceResourceTiming entry.
	*
	* This is just a mapping function for entry->attribute to keep bundle-size minimal.
	* Experimental properties are also accepted (see {@link ExperimentalResourceTimingProperty}).
	* Assumes that all entry properties might be undefined for browser-specific differences.
	* Only accepts string and number values for now and also sets 0-values.
	*/
	function _setResourceRequestAttributes(entry, attributes, properties) {
		properties.forEach(([entryKey, attributeKey]) => {
			const entryVal = entry[entryKey];
			if (entryVal != null && (typeof entryVal === "number" && entryVal < MAX_INT_AS_BYTES || typeof entryVal === "string")) attributes[attributeKey] = entryVal;
		});
	}
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
	// ../browser-utils/build/esm/web-vitals/lcp.js
	function isValidLcpMetric(lcpValue) {
		return lcpValue != null && lcpValue > 0 && lcpValue <= 6e4;
	}
	// ../browser-utils/build/esm/web-vitals/utils.js
	/**
	* web-vitals 5.1.0 switched listeners to be added on the window rather than the document.
	* Instead of having to check for window/document every time we add a listener, we can use this function.
	*/
	function addPageListener(type, listener, options) {
		if (WINDOW$2.document) WINDOW$2.addEventListener(type, listener, options);
	}
	/**
	* web-vitals 5.1.0 switched listeners to be removed from the window rather than the document.
	* Instead of having to check for window/document every time we remove a listener, we can use this function.
	*/
	function removePageListener(type, listener, options) {
		if (WINDOW$2.document) WINDOW$2.removeEventListener(type, listener, options);
	}
	const getNavigationEntry = (checkResponseStart = true) => {
		const navigationEntry = WINDOW$2.performance?.getEntriesByType?.("navigation")[0];
		if (!checkResponseStart || navigationEntry && navigationEntry.responseStart > 0 && navigationEntry.responseStart < performance.now()) return navigationEntry;
	};
	const getActivationStart = () => {
		return getNavigationEntry()?.activationStart ?? 0;
	};
	const onHidden = (cb) => {
		const onHiddenCallback = (event) => {
			if (WINDOW$2.document?.visibilityState === "hidden") cb(event);
		};
		addPageListener("visibilitychange", onHiddenCallback, { capture: true });
	};
	let firstHiddenTime = -1;
	const onHiddenFunctions = /* @__PURE__ */ new Set();
	const initHiddenTime = () => {
		return WINDOW$2.document?.visibilityState === "hidden" && !WINDOW$2.document?.prerendering ? 0 : 1e400;
	};
	const onVisibilityUpdate = (event) => {
		if (WINDOW$2.document?.visibilityState === "hidden" && firstHiddenTime > -1) {
			if (event.type === "visibilitychange") for (const onHiddenFunction of onHiddenFunctions) onHiddenFunction();
			if (!isFinite(firstHiddenTime)) {
				firstHiddenTime = event.type === "visibilitychange" ? event.timeStamp : 0;
				removePageListener("prerenderingchange", onVisibilityUpdate, true);
			}
		}
	};
	const getVisibilityWatcher = () => {
		if (WINDOW$2.document && firstHiddenTime < 0) {
			const activationStart = getActivationStart();
			firstHiddenTime = (!WINDOW$2.document.prerendering ? globalThis.performance.getEntriesByType("visibility-state").filter((e) => e.name === "hidden" && e.startTime > activationStart)[0]?.startTime : void 0) ?? initHiddenTime();
			addPageListener("visibilitychange", onVisibilityUpdate, true);
			addPageListener("prerenderingchange", onVisibilityUpdate, true);
		}
		return {
			get firstHiddenTime() {
				return firstHiddenTime;
			},
			onHidden(cb) {
				onHiddenFunctions.add(cb);
			}
		};
	};
	/**
	* Runs the passed callback during the next idle period, or immediately
	* if the browser's visibility state is (or becomes) hidden.
	*/
	const whenIdleOrHidden = (cb) => {
		const rIC = WINDOW$2.requestIdleCallback || WINDOW$2.setTimeout;
		if (WINDOW$2.document?.visibilityState === "hidden") cb();
		else {
			let called = false;
			const runOnce = () => {
				if (!called) {
					cb();
					called = true;
				}
			};
			addPageListener("visibilitychange", runOnce, {
				once: true,
				capture: true
			});
			rIC(() => {
				runOnce();
				removePageListener("visibilitychange", runOnce, { capture: true });
			});
		}
	};
	// ../browser-utils/build/esm/web-vitals/inp.js
	const LAST_INTERACTIONS = [];
	const INTERACTIONS_SPAN_MAP = /* @__PURE__ */ new Map();
	const ELEMENT_NAME_TIMESTAMP_MAP = /* @__PURE__ */ new Map();
	const INP_ENTRY_MAP = {
		click: "click",
		pointerdown: "click",
		pointerup: "click",
		mousedown: "click",
		mouseup: "click",
		touchstart: "click",
		touchend: "click",
		mouseover: "hover",
		mouseout: "hover",
		mouseenter: "hover",
		mouseleave: "hover",
		pointerover: "hover",
		pointerout: "hover",
		pointerenter: "hover",
		pointerleave: "hover",
		dragstart: "drag",
		dragend: "drag",
		drag: "drag",
		dragenter: "drag",
		dragleave: "drag",
		dragover: "drag",
		drop: "drag",
		keydown: "press",
		keyup: "press",
		keypress: "press",
		input: "press"
	};
	/**
	* Look up a cached interaction context (element name + root span) by interactionId.
	* Returns undefined if no context was cached for this interaction.
	*/
	function getCachedInteractionContext(interactionId) {
		return interactionId != null ? INTERACTIONS_SPAN_MAP.get(interactionId) : void 0;
	}
	/**
	* Register a listener to cache route information for INP interactions.
	*/
	function registerInpInteractionListener() {
		const interactionEvents = Object.keys(INP_ENTRY_MAP);
		if (isBrowser()) interactionEvents.forEach((eventType) => {
			WINDOW$2.addEventListener(eventType, captureElementFromEvent, {
				capture: true,
				passive: true
			});
		});
		/**
		* Captures the element name from a DOM event and stores it in the ELEMENT_NAME_TIMESTAMP_MAP.
		*/
		function captureElementFromEvent(event) {
			const target = event.target;
			if (!target) return;
			const elementName = htmlTreeAsString(target);
			const timestamp = Math.round(event.timeStamp);
			if (!elementName || elementName === "<unknown>") return;
			if (ELEMENT_NAME_TIMESTAMP_MAP.has(timestamp)) return;
			ELEMENT_NAME_TIMESTAMP_MAP.set(timestamp, elementName);
			if (ELEMENT_NAME_TIMESTAMP_MAP.size > 50) {
				const firstKey = ELEMENT_NAME_TIMESTAMP_MAP.keys().next().value;
				if (firstKey !== void 0) ELEMENT_NAME_TIMESTAMP_MAP.delete(firstKey);
			}
		}
		/**
		* Tries to get the element name from the timestamp map.
		*/
		function resolveElementNameFromEntry(entry) {
			const timestamp = Math.round(entry.startTime);
			let elementName = ELEMENT_NAME_TIMESTAMP_MAP.get(timestamp);
			if (!elementName) for (let offset = -5; offset <= 5; offset++) {
				const nearbyName = ELEMENT_NAME_TIMESTAMP_MAP.get(timestamp + offset);
				if (nearbyName) {
					elementName = nearbyName;
					break;
				}
			}
			return elementName || "<unknown>";
		}
		const handleEntries = ({ entries }) => {
			const activeSpan = getActiveSpan();
			const activeRootSpan = activeSpan && getRootSpan(activeSpan);
			entries.forEach((entry) => {
				if (!isPerformanceEventTiming(entry)) return;
				const interactionId = entry.interactionId;
				if (interactionId == null) return;
				if (INTERACTIONS_SPAN_MAP.has(interactionId)) return;
				const elementName = entry.target ? htmlTreeAsString(entry.target) : resolveElementNameFromEntry(entry);
				if (LAST_INTERACTIONS.length > 10) {
					const last = LAST_INTERACTIONS.shift();
					INTERACTIONS_SPAN_MAP.delete(last);
				}
				LAST_INTERACTIONS.push(interactionId);
				INTERACTIONS_SPAN_MAP.set(interactionId, {
					span: activeRootSpan,
					elementName
				});
			});
		};
		addPerformanceInstrumentationHandler("event", handleEntries);
		addPerformanceInstrumentationHandler("first-input", handleEntries);
	}
	// ../browser-utils/build/esm/web-vitals/tracking.js
	let _measurements = {};
	let _lcpEntry;
	let _clsEntry;
	let _navigationType;
	/**
	* Start tracking web vitals.
	* The callback returned by this function can be used to stop tracking & ensure all measurements are final & captured.
	*
	* @returns A function that forces web vitals collection
	*/
	function startTrackingWebVitals({ trackCls, trackLcp }) {
		if (getBrowserPerformanceAPI() && browserPerformanceTimeOrigin()) {
			const lcpCleanupCallback = trackLcp ? _trackLCP() : void 0;
			const clsCleanupCallback = trackCls ? _trackCLS() : void 0;
			const ttfbCleanupCallback = _trackTtfb();
			const fcpCleanupCallback = _trackFcp();
			const fpCleanupCallback = _trackFp();
			return () => {
				ttfbCleanupCallback();
				fcpCleanupCallback();
				fpCleanupCallback();
				lcpCleanupCallback?.();
				clsCleanupCallback?.();
			};
		}
		return () => void 0;
	}
	/**
	* Starts tracking the Cumulative Layout Shift on the current page and collects the value and last entry
	* to the `_measurements` object which ultimately is applied to the pageload span's measurements.
	*/
	function _trackCLS() {
		return addClsInstrumentationHandler(({ metric }) => {
			const entry = metric.entries[metric.entries.length - 1];
			if (!entry) return;
			_measurements["cls"] = {
				value: metric.value,
				unit: ""
			};
			_clsEntry = entry;
		}, true);
	}
	/** Starts tracking the Largest Contentful Paint on the current page. */
	function _trackLCP() {
		return addLcpInstrumentationHandler(({ metric }) => {
			const entry = metric.entries[metric.entries.length - 1];
			if (!entry || !isValidLcpMetric(metric.value)) return;
			_measurements["lcp"] = {
				value: metric.value,
				unit: "millisecond"
			};
			_lcpEntry = entry;
		}, true);
	}
	function _trackTtfb() {
		return addTtfbInstrumentationHandler(({ metric }) => {
			_navigationType = metric.navigationType;
			if (!metric.entries[metric.entries.length - 1]) return;
			_measurements["ttfb"] = {
				value: metric.value,
				unit: "millisecond"
			};
		});
	}
	/** Starts tracking the First Contentful Paint on the current page. */
	function _trackFcp() {
		return addFcpInstrumentationHandler(({ metric }) => {
			_navigationType = metric.navigationType;
			_measurements["fcp"] = {
				value: metric.value,
				unit: "millisecond"
			};
		});
	}
	/**
	* Starts tracking First Paint on the current page.
	*
	* web-vitals has no `onFP`, so this stays on the raw paint observer, and mirrors the one thing
	* `onFCP` does inline: skip the vital if the page was hidden before it. The raw `startTime` is
	* stored as-is; rebasing it against `activationStart` happens in `_rebaseFpAgainstActivationStart`
	* when the span ends, because this observer can run before the page is activated.
	*/
	function _trackFp() {
		return addPerformanceInstrumentationHandler("paint", ({ entries }) => {
			const firstHidden = getVisibilityWatcher();
			for (const entry of entries) if (entry.name === "first-paint" && entry.startTime < firstHidden.firstHiddenTime) _measurements["fp"] = {
				value: entry.startTime,
				unit: "millisecond"
			};
		});
	}
	/**
	* Writes the collected web vitals (LCP, CLS, INP, TTFB, FP, FCP) onto the pageload span,
	* either as measurements/attributes (v1) or as web vital attributes (span streaming).
	*
	* This should be called when the pageload span ends, after the web vitals have been finalized.
	* It is a no-op for non-pageload spans, but always resets the collected web vital state so it
	* doesn't leak into a subsequent navigation.
	*/
	function addWebVitalsToSpan(span, options) {
		const origin = browserPerformanceTimeOrigin();
		if (!getBrowserPerformanceAPI()?.getEntries || !origin) {
			resetWebVitalState();
			return;
		}
		const { spanStreamingEnabled, recordClsOnPageloadSpan, recordLcpOnPageloadSpan } = options;
		const timeOrigin = msToSec(origin);
		if (spanToJSON(span).attributes["sentry.op"] === "pageload") {
			_addTtfbRequestTimeToMeasurements(_measurements);
			_rebaseFpAgainstActivationStart(_measurements);
			if (spanStreamingEnabled) {
				const setAttr = (shortWebVitalName, value, customAttrName) => {
					const attrKey = customAttrName ?? `browser.web_vital.${shortWebVitalName}.value`;
					span.setAttribute(attrKey, value);
					debug$1.log("Setting web vital attribute", { [attrKey]: value }, "on pageload span");
				};
				[
					"ttfb",
					"fp",
					"fcp"
				].forEach((measurementName) => {
					if (_measurements[measurementName]) setAttr(measurementName, _measurements[measurementName].value);
				});
				if (_measurements["ttfb.requestTime"]) setAttr("ttfb.requestTime", _measurements["ttfb.requestTime"].value, Ni);
			} else {
				if (!recordClsOnPageloadSpan) delete _measurements.cls;
				if (!recordLcpOnPageloadSpan) delete _measurements.lcp;
				Object.entries(_measurements).forEach(([measurementName, measurement]) => {
					setMeasurement(measurementName, measurement.value, measurement.unit, span);
				});
				_setWebVitalAttributes(span, options);
			}
			if (_navigationType) span.setAttribute($t, _navigationType);
			span.setAttribute(spanStreamingEnabled ? ii : fd, timeOrigin);
			span.setAttribute(spanStreamingEnabled ? ti : hd, getActivationStart());
		}
		resetWebVitalState();
	}
	function resetWebVitalState() {
		_lcpEntry = void 0;
		_clsEntry = void 0;
		_navigationType = void 0;
		_measurements = {};
	}
	/** Add LCP / CLS data to span to allow debugging */
	function _setWebVitalAttributes(span, options) {
		if (_lcpEntry && options.recordLcpOnPageloadSpan) {
			if (_lcpEntry.element) span.setAttribute(op, htmlTreeAsString(_lcpEntry.element));
			if (_lcpEntry.id) span.setAttribute(lp, _lcpEntry.id);
			if (_lcpEntry.url) span.setAttribute(dp, filterCollectedUrl(_lcpEntry.url.trim()).slice(0, 200));
			if (_lcpEntry.loadTime != null) span.setAttribute(pp, _lcpEntry.loadTime);
			if (_lcpEntry.renderTime != null) span.setAttribute(cp, _lcpEntry.renderTime);
			span.setAttribute(up, _lcpEntry.size);
		}
		if (_clsEntry?.sources && options.recordClsOnPageloadSpan) _clsEntry.sources.forEach((source, index) => span.setAttribute(`cls.source.${index + 1}`, htmlTreeAsString(source.node)));
	}
	/**
	* Rebases First Paint against `activationStart`, so a prerendered page reports time-to-paint from
	* the moment the user activated it rather than from the (much earlier) prerender navigation start.
	*
	* The vitals that come from web-vitals do this themselves, when they compute their value: they only
	* start observing once the page is activated, so `activationStart` is known by then. FP has no
	* web-vitals equivalent and is read off a `buffered` paint observer registered at SDK init, which
	* on a prerendered page runs while `document.prerendering` is still true and `activationStart` is
	* still 0. Correcting there would be a no-op, so it happens here, at span end, by which point the
	* activation time is known.
	*/
	function _rebaseFpAgainstActivationStart(measurements) {
		const fp = measurements["fp"];
		if (fp) fp.value = Math.max(fp.value - getActivationStart(), 0);
	}
	/**
	* Add ttfb request time information to measurements.
	*
	* ttfb information is added via the web vitals library.
	*/
	function _addTtfbRequestTimeToMeasurements(_measurements) {
		const navEntry = getNavigationEntry(false);
		if (!navEntry) return;
		const { responseStart, requestStart } = navEntry;
		if (requestStart <= responseStart) _measurements["ttfb.requestTime"] = {
			value: responseStart - requestStart,
			unit: "millisecond"
		};
	}
	// ../browser-utils/build/esm/isBotUserAgent.js
	/**
	* We don't want to start a bunch of idle timers and PerformanceObservers
	* for web crawlers, as they may prevent the page from being seen as "idle"
	* by the crawler's rendering engine (e.g. Googlebot's headless Chromium).
	*/
	const BOT_USER_AGENT_RE = /Googlebot|Google-InspectionTool|Storebot-Google|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|Facebot|facebookexternalhit|LinkedInBot|Twitterbot|Applebot/i;
	/**
	* Whether the current user agent looks like a web crawler.
	*/
	function isBotUserAgent() {
		const nav = WINDOW$2.navigator;
		if (!nav?.userAgent) return false;
		return BOT_USER_AGENT_RE.test(nav.userAgent);
	}
	// ../browser-utils/build/esm/component-name.js
	/**
	* Given a DOM element, traverses up the tree until it finds the first ancestor node
	* that has the `data-sentry-component` or `data-sentry-element` attribute with `data-sentry-component` taking
	* precedence. This attribute is added at build-time by projects that have the component name annotation plugin installed.
	*
	* @returns a string representation of the component for the provided DOM element, or `null` if not found
	*/
	function getComponentName(elem, maxTraverseHeight = 5) {
		if (!GLOBAL_OBJ.HTMLElement) return null;
		let currentElem = elem;
		for (let i = 0; i < maxTraverseHeight; i++) {
			if (!currentElem) return null;
			if (currentElem instanceof HTMLElement) {
				if (currentElem.dataset["sentryComponent"]) return currentElem.dataset["sentryComponent"];
				if (currentElem.dataset["sentryElement"]) return currentElem.dataset["sentryElement"];
			}
			currentElem = currentElem.parentNode;
		}
		return null;
	}
	// ../browser-utils/build/esm/performance/longTasks.js
	const INTEGRATION_NAME$8 = "LongTasks";
	const _longTasksIntegration = ((options = {}) => {
		const { enableLongTask = true, enableLongAnimationFrame = true } = options;
		return {
			name: INTEGRATION_NAME$8,
			setup() {
				if (isBotUserAgent()) return;
				if (enableLongAnimationFrame && GLOBAL_OBJ.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes("long-animation-frame")) startTrackingLongAnimationFrames();
				else if (enableLongTask) startTrackingLongTasks();
			}
		};
	});
	/**
	* Captures long animation frames, or long tasks where those are not supported, as spans on the active span.
	*/
	const longTasksIntegration = defineIntegration(_longTasksIntegration);
	// ../browser-utils/build/esm/performance/resources.js
	const INTEGRATION_NAME$7 = "Resources";
	const _resourcesIntegration = ((options = {}) => {
		return {
			name: INTEGRATION_NAME$7,
			setup(client) {
				if (isBotUserAgent()) return;
				client.on("beforeIdleSpanEnd", (span) => {
					const op = spanToJSON(span).attributes?.[yb];
					if (op !== "pageload" && op !== "navigation") return;
					addResourceSpans(span, {
						ignoreResourceSpans: options.ignoreResourceSpans,
						spanStreamingEnabled: hasSpanStreamingEnabled(client)
					});
				});
			}
		};
	});
	/**
	* Adds `resource.*` spans for the scripts, stylesheets, images and other resources loaded during a
	* pageload or navigation.
	*/
	const resourcesIntegration = defineIntegration(_resourcesIntegration);
	// ../browser-utils/build/esm/getLocationHref.js
	/**
	* A safe form of location.href.
	*/
	function getLocationHref() {
		try {
			return WINDOW$2.document?.location.href ?? "";
		} catch {
			return "";
		}
	}
	// ../browser-utils/build/esm/routing.js
	const CLIENT_ROUTE_PROVIDERS = /* @__PURE__ */ new WeakMap();
	/**
	* Registers the route provider for a client, replacing any previously registered one. `BrowserClient`
	* calls this with its `routeProvider` option.
	*
	* Prefer the `routeProvider` option where the provider is known at `init`: the pageload span is named
	* while `browserTracingIntegration` sets up, so a provider registered after `init` can only rename it
	* after the fact.
	*
	* A client holds one provider. An app running two routers (a framework migration, or a shell plus an
	* island) registers twice and the last one wins, so the first router's routes stop resolving.
	*/
	function setRouteProvider(provider, client = getClient()) {
		if (!client) {
			debug$1.warn("Cannot set a route provider without a client.");
			return;
		}
		if (getRouteProvider(client)) debug$1.warn("A route provider is already registered for this client and will be replaced. Routes only the previous provider knows about will no longer resolve.");
		CLIENT_ROUTE_PROVIDERS.set(client, provider);
	}
	/**
	* Returns the route provider registered for a client.
	*/
	function getRouteProvider(client = getClient()) {
		return client && CLIENT_ROUTE_PROVIDERS.get(client);
	}
	// ../browser-utils/build/esm/web-vitals/emitSpan.js
	/**
	* Emits a web vital span. When `standalone` is set it is sent on its own as a v2 streamed span;
	* otherwise it flows through the span streaming pipeline as a child of `parentSpan`.
	*/
	function _emitWebVitalSpan(options) {
		const { name, op, origin, metricName, value, attributes: passedAttributes, parentSpan, startTime, endTime, standalone, softNavigationId, navigationType } = options;
		const segmentSpan = parentSpan && getRootSpan(parentSpan);
		const segmentName = segmentSpan ? spanToJSON(segmentSpan).name : getCurrentScope().getScopeData().transactionName;
		const attributes = {
			[_b]: origin,
			[yb]: op,
			[Wm]: 0,
			[`browser.web_vital.${metricName}.value`]: value,
			[Qb]: segmentName,
			[Pb]: segmentName,
			[vy]: WINDOW$2.navigator?.userAgent,
			...passedAttributes
		};
		if (parentSpan && spanToJSON(parentSpan).attributes["sentry.op"] === "pageload") attributes[hb] = parentSpan.spanContext().spanId;
		if (softNavigationId != null) attributes[Zt] = softNavigationId;
		if (navigationType) attributes[$t] = navigationType;
		if (standalone) Object.assign(attributes, getReplayAttributes());
		const span = startInactiveSpan({
			name,
			attributes,
			startTime,
			parentSpan,
			experimental: standalone ? { standalone: true } : void 0
		});
		if (span) span.end(endTime ?? startTime);
	}
	function getReplayAttributes() {
		const replay = getClient()?.getIntegrationByName("Replay");
		const replayId = replay?.getReplayId(true);
		if (!replayId) return {};
		return {
			[Ob$1]: replayId,
			"sentry._internal.replay_is_buffering": replay.getRecordingMode() === "buffer" ? true : void 0
		};
	}
	// ../browser-utils/build/esm/web-vitals/reportEvents.js
	/**
	* Listens for events on which we want to collect a previously accumulated web vital value.
	* Currently, this includes:
	*
	* - pagehide (i.e. user minimizes browser window, hides tab, etc)
	* - soft navigation (we only care about the vital of the initially loaded route)
	*
	* As a "side-effect", this function will also collect the pageload span.
	*
	* @param collectorCallback the callback to be called when the first of these events is triggered. It is passed the
	* pageload span, which the web vital span is parented to.
	*/
	function listenForWebVitalReportEvents(client, collectorCallback) {
		let pageloadSpan;
		let collected = false;
		function _runCollectorCallbackOnce() {
			if (!collected && pageloadSpan) collectorCallback(pageloadSpan);
			collected = true;
		}
		onHidden(() => {
			_runCollectorCallbackOnce();
		});
		const unsubscribeStartNavigation = client.on("beforeStartNavigationSpan", (_, options) => {
			if (!options?.isRedirect) {
				_runCollectorCallbackOnce();
				unsubscribeStartNavigation();
				unsubscribeAfterStartPageLoadSpan();
			}
		});
		const unsubscribeAfterStartPageLoadSpan = client.on("afterStartPageLoadSpan", (span) => {
			pageloadSpan = span;
			unsubscribeAfterStartPageLoadSpan();
		});
	}
	// ../browser-utils/build/esm/web-vitals/spans.js
	const INTERACTION_TYPE_TO_SPAN_OP = {
		click: H$1,
		hover: Q,
		drag: k$1,
		press: K
	};
	const INTERACTION_TYPE_TO_SPAN_NAME_FALLBACK = {
		click: UI_INTERACTION_CLICK_SPAN_NAME_FALLBACK,
		hover: UI_INTERACTION_HOVER_SPAN_NAME_FALLBACK,
		drag: UI_INTERACTION_DRAG_SPAN_NAME_FALLBACK,
		press: UI_INTERACTION_PRESS_SPAN_NAME_FALLBACK
	};
	/**
	* Reports a web vital once per navigation, rather than once per page load.
	*
	* web-vitals restarts the metric on every soft navigation and force-reports the previous one just
	* before it does (and again on pagehide), and re-reports every metric after a bfcache restore.
	* Since `reportAllChanges` is off in this mode, every value we're handed is already the final one
	* for its navigation, so there is nothing to accumulate: each report is a span.
	*/
	function trackWebVitalPerNavigation(client, addInstrumentationHandler, send) {
		let pageloadSpan;
		client.on("afterStartPageLoadSpan", (span) => {
			pageloadSpan = span;
		});
		let bfcacheNavigationSpan;
		client.on("spanStart", (span) => {
			const attributes = spanToJSON(span).attributes;
			if (attributes?.["sentry.op"] === "navigation" && attributes["browser.navigation.type"] === "back-forward-cache") bfcacheNavigationSpan = span;
		});
		addInstrumentationHandler(({ metric }) => {
			const navigationSpan = getNavigationSpanForMetric(metric);
			if (metric.navigationType === "soft-navigation") {
				if (navigationSpan) send(metric, navigationSpan, metric.navigationId);
				else debug$1.log(`[SoftNav] Dropping ${metric.name} for uncorrelated soft navigation ${metric.navigationId}`);
				return;
			}
			if (metric.navigationType === "back-forward-cache") {
				send(metric, bfcacheNavigationSpan, void 0);
				return;
			}
			send(metric, pageloadSpan, void 0);
		});
	}
	/**
	* Tracks LCP as a streamed span.
	*/
	function trackLcpAsSpan(client, perNavigation = false) {
		if (!supportsWebVital("largest-contentful-paint")) return;
		if (perNavigation) {
			trackWebVitalPerNavigation(client, addLcpInstrumentationHandler, (metric, parentSpan, softNavigationId) => {
				const entry = metric.entries[metric.entries.length - 1];
				_sendLcpSpan(metric.value, entry, parentSpan, softNavigationId, metric.navigationType, metric.navigationStartTime);
			});
			return;
		}
		let lcpValue = 0;
		let lcpEntry;
		let lcpNavigationType;
		const cleanupLcpHandler = addLcpInstrumentationHandler(({ metric }) => {
			lcpNavigationType = metric.navigationType;
			const entry = metric.entries[metric.entries.length - 1];
			if (!entry || !isValidLcpMetric(metric.value)) return;
			lcpValue = metric.value;
			lcpEntry = entry;
		}, true);
		listenForWebVitalReportEvents(client, (pageloadSpan) => {
			_sendLcpSpan(lcpValue, lcpEntry, pageloadSpan, void 0, lcpNavigationType);
			cleanupLcpHandler();
		});
	}
	/**
	* Exported only for testing.
	*/
	function _sendLcpSpan(lcpValue, entry, pageloadSpan, softNavigationId, navigationType, navigationStartTime) {
		if (!isValidLcpMetric(lcpValue)) return;
		debug$1.log(`Sending LCP span (${lcpValue})`);
		const navigationStart = navigationStartTime || 0;
		const startTime = performanceTimeToSeconds(navigationStart) ?? msToSec(navigationStart);
		const endTime = entry ? performanceTimeToSeconds(entry.startTime, navigationStart) ?? msToSec(entry.startTime) : startTime + msToSec(lcpValue);
		const selector = entry ? htmlTreeAsString(entry.element) : void 0;
		const componentName = entry?.element ? getComponentName(entry.element) : null;
		const client = getClient();
		const name = !!client && hasSpanStreamingEnabled(client) ? componentName || "Largest contentful paint" : selector ?? "Largest contentful paint";
		const attributes = {};
		if (selector) attributes[vi] = selector;
		if (componentName) attributes[Hg] = componentName;
		entry?.id && (attributes["browser.web_vital.lcp.id"] = entry.id);
		entry?.url && (attributes["browser.web_vital.lcp.url"] = filterCollectedUrl(entry.url, client));
		entry?.loadTime != null && (attributes["browser.web_vital.lcp.load_time"] = entry.loadTime);
		entry?.renderTime != null && (attributes["browser.web_vital.lcp.render_time"] = entry.renderTime);
		entry?.size != null && (attributes["browser.web_vital.lcp.size"] = entry.size);
		_emitWebVitalSpan({
			name,
			op: j,
			origin: "auto.ui.browser.lcp",
			metricName: "lcp",
			value: lcpValue,
			attributes,
			parentSpan: pageloadSpan,
			startTime,
			endTime,
			softNavigationId,
			navigationType
		});
	}
	/**
	* Tracks CLS as a streamed span.
	*/
	function trackClsAsSpan(client, perNavigation = false) {
		if (!supportsWebVital("layout-shift")) return;
		if (perNavigation) {
			trackWebVitalPerNavigation(client, addClsInstrumentationHandler, (metric, parentSpan, softNavigationId) => {
				const entry = metric.entries[metric.entries.length - 1];
				_sendClsSpan(metric.value, entry, parentSpan, softNavigationId, metric.navigationType, metric.navigationStartTime);
			});
			return;
		}
		let clsValue = 0;
		let clsEntry;
		let clsNavigationType;
		const cleanupClsHandler = addClsInstrumentationHandler(({ metric }) => {
			clsNavigationType = metric.navigationType;
			const entry = metric.entries[metric.entries.length - 1];
			if (!entry) return;
			clsValue = metric.value;
			clsEntry = entry;
		}, true);
		listenForWebVitalReportEvents(client, (pageloadSpan) => {
			_sendClsSpan(clsValue, clsEntry, pageloadSpan, void 0, clsNavigationType);
			cleanupClsHandler();
		});
	}
	/**
	* Exported only for testing.
	*/
	function _sendClsSpan(clsValue, entry, pageloadSpan, softNavigationId, navigationType, navigationStartTime) {
		debug$1.log(`Sending CLS span (${clsValue})`);
		const startTime = performanceTimeToSeconds(entry?.startTime ?? navigationStartTime ?? 0) ?? timestampInSeconds();
		const firstSourceNode = entry?.sources[0]?.node;
		const selector = entry ? htmlTreeAsString(firstSourceNode) : void 0;
		const componentName = firstSourceNode ? getComponentName(firstSourceNode) : null;
		const client = getClient();
		const name = !!client && hasSpanStreamingEnabled(client) ? componentName || "Layout shift" : selector ?? "Layout shift";
		const attributes = {};
		if (componentName) attributes[Hg] = componentName;
		if (entry?.sources) entry.sources.forEach((source, index) => {
			attributes[`browser.web_vital.cls.source.${index + 1}`] = htmlTreeAsString(source.node);
		});
		_emitWebVitalSpan({
			name,
			op: J,
			origin: "auto.ui.browser.cls",
			metricName: "cls",
			value: clsValue,
			attributes,
			parentSpan: pageloadSpan,
			startTime,
			softNavigationId,
			navigationType
		});
	}
	/**
	* Tracks INP and emits it as a web vital span, as a child of the interaction's root span.
	* Requires `registerInpInteractionListener()` to be called separately for cached element names and
	* root spans per interaction.
	*/
	function trackInpAsSpan(client, perNavigation = false) {
		if (!getBrowserPerformanceAPI() || !browserPerformanceTimeOrigin()) return;
		const standalone = !hasSpanStreamingEnabled(client);
		if (perNavigation) {
			trackWebVitalPerNavigation(client, addInpInstrumentationHandler, (metric, parentSpan, softNavigationId) => {
				if (isPlausibleInp(metric)) _sendInpSpan(metric.value, findInpEntry(metric), standalone, parentSpan, softNavigationId, metric);
			});
			return;
		}
		const onInp = ({ metric }) => {
			if (isPlausibleInp(metric)) _sendInpSpan(metric.value, findInpEntry(metric), standalone, void 0, void 0, metric);
		};
		addInpInstrumentationHandler(onInp);
	}
	function isPlausibleInp(metric) {
		return metric.value != null && msToSec(metric.value) <= 60;
	}
	/**
	* The entry an INP span is built from: the one whose duration the reported value came from.
	*
	* There isn't always one. When every interaction of a soft navigation stayed below the Event Timing
	* threshold, web-vitals reports a synthetic value with no entries at all - see
	* `_estimateP98LongestInteraction`. The span still gets reported in that case, just without the
	* element and interaction type an entry would have supplied.
	*/
	function findInpEntry(metric) {
		return metric.entries.find((e) => e.duration === metric.value && INP_ENTRY_MAP[e.name]);
	}
	/**
	* Exported only for testing.
	*/
	function _sendInpSpan(inpValue, entry, standalone = false, attributedSpan, softNavigationId, metric) {
		debug$1.log(`Sending INP span (${inpValue})`);
		const startTime = performanceTimeToSeconds(entry?.startTime ?? metric?.navigationStartTime ?? 0);
		if (!startTime) return;
		const duration = msToSec(inpValue);
		const entryInteractionType = entry && INP_ENTRY_MAP[entry.name];
		const interactionType = entryInteractionType || "click";
		const cachedContext = entry && getCachedInteractionContext(entry.interactionId);
		const activeSpan = getActiveSpan();
		const rootSpan = activeSpan ? getRootSpan(activeSpan) : void 0;
		const spanToUse = attributedSpan || cachedContext?.span || rootSpan;
		const selector = cachedContext?.elementName || (entry ? htmlTreeAsString(entry.target) : void 0);
		const componentName = entry?.target ? getComponentName(entry.target) : null;
		const client = getClient();
		const name = !!client && hasSpanStreamingEnabled(client) ? componentName || INTERACTION_TYPE_TO_SPAN_NAME_FALLBACK[interactionType] : selector ?? "Interaction to next paint";
		const attributes = { [Wm]: entry?.duration ?? inpValue };
		selector && selector !== "<unknown>" && (attributes["browser.web_vital.inp.target"] = selector);
		entryInteractionType && (attributes["browser.web_vital.inp.interaction_type"] = entryInteractionType);
		if (componentName) attributes[Hg] = componentName;
		_emitWebVitalSpan({
			name,
			op: INTERACTION_TYPE_TO_SPAN_OP[interactionType],
			origin: "auto.ui.browser.inp",
			metricName: "inp",
			value: inpValue,
			attributes,
			startTime,
			endTime: startTime + duration,
			navigationType: metric?.navigationType,
			parentSpan: spanToUse,
			standalone,
			softNavigationId
		});
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
		if (!WINDOW$2.document) return;
		const triggerDOMHandler = triggerHandlers$1.bind(null, "dom");
		const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
		WINDOW$2.document.addEventListener("click", globalDOMEventHandler, false);
		WINDOW$2.document.addEventListener("keypress", globalDOMEventHandler, false);
		["EventTarget", "Node"].forEach((target) => {
			const proto = WINDOW$2[target]?.prototype;
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
			const target = getEventTarget$1(event);
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
			debounceTimerID = WINDOW$2.setTimeout(() => {
				lastCapturedEventTargetId = void 0;
				lastCapturedEventType = void 0;
			}, DEBOUNCE_DURATION);
		};
	}
	function getEventTarget$1(event) {
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
		return "history" in WINDOW$2 && !!WINDOW$2.history;
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
		WINDOW$2.addEventListener("popstate", () => {
			const to = WINDOW$2.location.href;
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
		fill(WINDOW$2.history, "pushState", historyReplacementFunction);
		fill(WINDOW$2.history, "replaceState", historyReplacementFunction);
	}
	function getAbsoluteUrl(urlOrPath) {
		try {
			return new URL(urlOrPath, WINDOW$2.location.origin).toString();
		} catch {
			return urlOrPath;
		}
	}
	// ../browser-utils/build/esm/getNativeImplementation.js
	const cachedImplementations$2 = {};
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
		const cached = cachedImplementations$2[name];
		if (cached) return cached;
		let impl = WINDOW$2[name];
		if (isNativeFunction(impl)) return cachedImplementations$2[name] = impl.bind(WINDOW$2);
		const document = WINDOW$2.document;
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
		return cachedImplementations$2[name] = impl.bind(WINDOW$2);
	}
	/** Clear a cached implementation. */
	function clearCachedImplementation(name) {
		cachedImplementations$2[name] = void 0;
	}
	/**
	* Get an unwrapped `setTimeout` method.
	* This ensures that even if e.g. Angular wraps `setTimeout`, we get the native implementation,
	* avoiding triggering change detection.
	*/
	function setTimeout$3(...rest) {
		try {
			return getNativeImplementation("setTimeout")(...rest);
		} catch (e) {
			debug$1.warn("Could not use native setTimeout implementation, falling back to window.setTimeout: ", e);
			const fallback = WINDOW$2.setTimeout.bind(WINDOW$2);
			cachedImplementations$2.setTimeout = fallback;
			return fallback(...rest);
		}
	}
	// ../browser-utils/build/esm/instrumentation/xhr.js
	const SENTRY_XHR_DATA_KEY = "__sentry_xhr_v3__";
	/**
	* Add an instrumentation handler for when an XHR request happens.
	* The handler function is called once when the request starts and once when it ends,
	* which can be identified by checking if it has an `endTimestamp`.
	*
	* Use at your own risk, this might break without changelog notice, only used internally.
	* @hidden
	*/
	function addXhrInstrumentationHandler(handler) {
		const type = "xhr";
		addHandler$1(type, handler);
		maybeInstrument(type, instrumentXHR);
	}
	/** Exported only for tests. */
	function instrumentXHR() {
		if (!WINDOW$2.XMLHttpRequest) return;
		const xhrproto = XMLHttpRequest.prototype;
		xhrproto.open = new Proxy(xhrproto.open, { apply(originalOpen, xhrOpenThisArg, xhrOpenArgArray) {
			let virtualError = /* @__PURE__ */ new Error();
			const startTimestamp = timestampInSeconds() * 1e3;
			const method = isString(xhrOpenArgArray[0]) ? xhrOpenArgArray[0].toUpperCase() : void 0;
			const url = parseXhrUrlArg(xhrOpenArgArray[1]);
			if (!method || url === void 0) return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
			xhrOpenThisArg[SENTRY_XHR_DATA_KEY] = {
				method,
				url,
				request_headers: {}
			};
			if (method === "POST" && url.match(/sentry_key/)) xhrOpenThisArg.__sentry_own_request__ = true;
			const onreadystatechangeHandler = () => {
				const xhrInfo = xhrOpenThisArg[SENTRY_XHR_DATA_KEY];
				if (!xhrInfo) return;
				if (xhrOpenThisArg.readyState === 4) {
					try {
						xhrInfo.status_code = xhrOpenThisArg.status;
					} catch {}
					triggerHandlers$1("xhr", {
						endTimestamp: timestampInSeconds() * 1e3,
						startTimestamp,
						xhr: xhrOpenThisArg,
						virtualError
					});
					virtualError = void 0;
					xhrOpenThisArg.removeEventListener("readystatechange", onreadystatechangeHandler);
				}
			};
			if ("onreadystatechange" in xhrOpenThisArg && typeof xhrOpenThisArg.onreadystatechange === "function") xhrOpenThisArg.onreadystatechange = new Proxy(xhrOpenThisArg.onreadystatechange, { apply(originalOnreadystatechange, onreadystatechangeThisArg, onreadystatechangeArgArray) {
				onreadystatechangeHandler();
				return originalOnreadystatechange.apply(onreadystatechangeThisArg, onreadystatechangeArgArray);
			} });
			else xhrOpenThisArg.addEventListener("readystatechange", onreadystatechangeHandler);
			xhrOpenThisArg.setRequestHeader = new Proxy(xhrOpenThisArg.setRequestHeader, { apply(originalSetRequestHeader, setRequestHeaderThisArg, setRequestHeaderArgArray) {
				const [header, value] = setRequestHeaderArgArray;
				const xhrInfo = setRequestHeaderThisArg[SENTRY_XHR_DATA_KEY];
				if (xhrInfo && isString(header) && isString(value)) xhrInfo.request_headers[header.toLowerCase()] = value;
				return originalSetRequestHeader.apply(setRequestHeaderThisArg, setRequestHeaderArgArray);
			} });
			return originalOpen.apply(xhrOpenThisArg, xhrOpenArgArray);
		} });
		xhrproto.send = new Proxy(xhrproto.send, { apply(originalSend, sendThisArg, sendArgArray) {
			const sentryXhrData = sendThisArg[SENTRY_XHR_DATA_KEY];
			if (!sentryXhrData) return originalSend.apply(sendThisArg, sendArgArray);
			if (sendArgArray[0] !== void 0) sentryXhrData.body = sendArgArray[0];
			triggerHandlers$1("xhr", {
				startTimestamp: timestampInSeconds() * 1e3,
				xhr: sendThisArg
			});
			return originalSend.apply(sendThisArg, sendArgArray);
		} });
	}
	/**
	* Parses the URL argument of a XHR method to a string.
	*
	* See: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open#url
	* url: A string or any other object with a stringifier — including a URL object — that provides the URL of the resource to send the request to.
	*
	* @param url - The URL argument of an XHR method
	* @returns The parsed URL string or undefined if the URL is invalid
	*/
	function parseXhrUrlArg(url) {
		if (isString(url)) return url;
		try {
			return url.toString();
		} catch {}
	}
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
	// ../browser-utils/build/esm/is.js
	/**
	* Checks whether given value's type is an Element instance.
	*
	* Returns false if `Element` is not available in the current runtime.
	*/
	function isElement$2(wat) {
		if (typeof Element === "undefined") return false;
		try {
			return wat instanceof Element;
		} catch {
			return false;
		}
	}
	// src/helpers.ts
	const WINDOW = GLOBAL_OBJ;
	let ignoreOnError = 0;
	const ignoredErrorReports = [];
	/**
	* @hidden
	*/
	function shouldIgnoreOnError(data) {
		if (ignoreOnError > 0) return true;
		const index = data ? ignoredErrorReports.findIndex((report) => isSameErrorReport(report, data)) : -1;
		if (index === -1) return false;
		ignoredErrorReports.splice(index, 1);
		return true;
	}
	function isSameErrorReport(a, b) {
		return a.msg === b.msg && a.url === b.url && a.line === b.line && a.column === b.column;
	}
	/**
	* @hidden
	*/
	function ignoreNextOnError() {
		ignoreOnError++;
		setTimeout(() => {
			ignoreOnError--;
		});
	}
	/**
	* Instruments the given function and sends an event to Sentry every time the
	* function throws an exception.
	*
	* @param fn A function to wrap. It is generally safe to pass an unbound function, because the returned wrapper always
	* has a correct `this` context.
	* @returns The wrapped function.
	* @hidden
	*/
	function wrap(fn, options = {}) {
		function isFunction(fn) {
			return typeof fn === "function";
		}
		if (!isFunction(fn)) return fn;
		try {
			if (Object.prototype.hasOwnProperty.call(fn, "__sentry_wrapped__")) {
				const wrapper = fn.__sentry_wrapped__;
				if (typeof wrapper === "function") return wrapper;
				else return fn;
			}
			if (getOriginalFunction(fn)) return fn;
		} catch {
			return fn;
		}
		const sentryWrapped = function(...args) {
			GLOBAL_OBJ._sentryWrappedDepth = (GLOBAL_OBJ._sentryWrappedDepth || 0) + 1;
			try {
				const wrappedArguments = args.map((arg) => wrap(arg, options));
				return fn.apply(this, wrappedArguments);
			} catch (ex) {
				ignoreNextOnError();
				withScope((scope) => {
					scope.addEventProcessor((event) => {
						if (options.mechanism) {
							addExceptionTypeValue(event, void 0, void 0);
							addExceptionMechanism(event, options.mechanism);
						}
						event.extra = {
							...event.extra,
							arguments: args
						};
						return event;
					});
					captureException(ex);
				});
				throw ex;
			} finally {
				GLOBAL_OBJ._sentryWrappedDepth = (GLOBAL_OBJ._sentryWrappedDepth || 0) - 1;
			}
		};
		try {
			for (const property in fn) if (Object.prototype.hasOwnProperty.call(fn, property)) sentryWrapped[property] = fn[property];
		} catch {}
		markFunctionWrapped(sentryWrapped, fn);
		addNonEnumerableProperty(fn, "__sentry_wrapped__", sentryWrapped);
		try {
			if (Object.getOwnPropertyDescriptor(sentryWrapped, "name").configurable) Object.defineProperty(sentryWrapped, "name", { get() {
				return fn.name;
			} });
		} catch {}
		return sentryWrapped;
	}
	/**
	* Get HTTP request data from the current page.
	*
	* The `Referer` header has `dataCollection.urlQueryParams` of `client` applied. `url` is unfiltered, so
	* callers must pass it through `filterCollectedUrl`.
	*/
	function getHttpRequestData(client) {
		const url = getLocationHref();
		const { referrer } = WINDOW.document || {};
		const { userAgent } = WINDOW.navigator || {};
		return {
			url,
			headers: {
				...referrer && { Referer: filterCollectedUrl(referrer, client) },
				...userAgent && { "User-Agent": userAgent }
			}
		};
	}
	// src/utils/lazyLoadIntegration.ts
	const LAZY_LOADABLE_NAMES = [
		"replayIntegration",
		"replayCanvasIntegration",
		"feedbackIntegration",
		"feedbackModalIntegration",
		"feedbackScreenshotIntegration",
		"captureConsoleIntegration",
		"contextLinesIntegration",
		"linkedErrorsIntegration",
		"dedupeIntegration",
		"extraErrorDataIntegration",
		"graphqlClientIntegration",
		"httpClientIntegration",
		"reportingObserverIntegration",
		"rewriteFramesIntegration",
		"browserProfilingIntegration",
		"userTimingIntegration",
		"interactionsIntegration",
		"moduleMetadataIntegration"
	];
	const HYPHENATED_BUNDLES = {
		replayCanvasIntegration: "replay-canvas",
		feedbackModalIntegration: "feedback-modal",
		feedbackScreenshotIntegration: "feedback-screenshot"
	};
	function getBundleName(name) {
		return HYPHENATED_BUNDLES[name] || name.replace("Integration", "").toLowerCase();
	}
	const WindowWithMaybeIntegration = WINDOW;
	/**
	* Lazy load an integration from the CDN.
	* Rejects if the integration cannot be loaded.
	*/
	async function lazyLoadIntegration(name, scriptNonce) {
		const bundle = LAZY_LOADABLE_NAMES.includes(name) ? getBundleName(name) : void 0;
		const sentryOnWindow = WindowWithMaybeIntegration.Sentry = WindowWithMaybeIntegration.Sentry || {};
		if (!bundle) throw new Error(`Cannot lazy load integration: ${name}`);
		const existing = sentryOnWindow[name];
		if (typeof existing === "function" && !("_isShim" in existing)) return existing;
		const url = getScriptURL(bundle);
		const script = WINDOW.document.createElement("script");
		script.src = url;
		script.crossOrigin = "anonymous";
		script.referrerPolicy = "strict-origin";
		if (scriptNonce) script.setAttribute("nonce", scriptNonce);
		const waitForLoad = new Promise((resolve, reject) => {
			script.addEventListener("load", () => resolve());
			script.addEventListener("error", reject);
		});
		const parent = WINDOW.document.body || WINDOW.document.head || WINDOW.document.currentScript?.parentElement;
		if (parent) parent.appendChild(script);
		else throw new Error(`Could not find parent element to insert lazy-loaded ${name} script`);
		try {
			await waitForLoad;
		} catch {
			throw new Error(`Error when loading integration: ${name}`);
		}
		const integrationFn = sentryOnWindow[name];
		if (typeof integrationFn !== "function") throw new Error(`Could not load integration: ${name}`);
		return integrationFn;
	}
	function getScriptURL(bundle) {
    throw new Error('Cannot load dynamically from the browser extension');
  }
	// src/feedbackAsync.ts
	/**
	* An integration to add user feedback to your application,
	* while loading most of the code lazily only when it's needed.
	*/
	const feedbackAsyncIntegration = buildFeedbackIntegration({ lazyLoadIntegration });
	// src/eventbuilder.ts
	/**
	* This function creates an exception from a JavaScript Error
	*/
	function exceptionFromError(stackParser, ex) {
		const frames = parseStackFrames(stackParser, ex);
		const exception = {
			type: extractType(ex),
			value: extractMessage(ex)
		};
		if (frames.length) exception.stacktrace = { frames };
		if (exception.type === void 0 && exception.value === "") exception.value = "Unrecoverable error caught";
		return exception;
	}
	function eventFromPlainObject(stackParser, exception, syntheticException, isUnhandledRejection) {
		const normalizeDepth = getClient()?.getOptions().normalizeDepth;
		const errorFromProp = getErrorPropertyFromObject(exception);
		const extra = { __serialized__: normalizeToSize(exception, normalizeDepth) };
		if (errorFromProp) return {
			exception: { values: [exceptionFromError(stackParser, errorFromProp)] },
			extra
		};
		const event = {
			exception: { values: [{
				type: isEvent(exception) ? exception.constructor.name : isUnhandledRejection ? "UnhandledRejection" : "Error",
				value: getNonErrorObjectExceptionValue(exception, { isUnhandledRejection })
			}] },
			extra
		};
		if (syntheticException) {
			const frames = parseStackFrames(stackParser, syntheticException);
			if (frames.length) event.exception.values[0].stacktrace = { frames };
		}
		return event;
	}
	function eventFromError(stackParser, ex) {
		return { exception: { values: [exceptionFromError(stackParser, ex)] } };
	}
	/** Parses stack frames from an error */
	function parseStackFrames(stackParser, ex) {
		const stacktrace = ex.stacktrace || ex.stack || "";
		const skipLines = getSkipFirstStackStringLines(ex);
		const framesToPop = getPopFirstTopFrames(ex);
		try {
			return stackParser(stacktrace, skipLines, framesToPop);
		} catch {}
		return [];
	}
	const reactMinifiedRegexp = /Minified React error #\d+;/i;
	/**
	* Certain known React errors contain links that would be falsely
	* parsed as frames. This function check for these errors and
	* returns number of the stack string lines to skip.
	*/
	function getSkipFirstStackStringLines(ex) {
		if (ex && reactMinifiedRegexp.test(ex.message)) return 1;
		return 0;
	}
	/**
	* If error has `framesToPop` property, it means that the
	* creator tells us the first x frames will be useless
	* and should be discarded. Typically error from wrapper function
	* which don't point to the actual location in the developer's code.
	*
	* Example: https://github.com/zertosh/invariant/blob/master/invariant.js#L46
	*/
	function getPopFirstTopFrames(ex) {
		if (typeof ex.framesToPop === "number") return ex.framesToPop;
		return 0;
	}
	function isWebAssemblyException(exception) {
		if (typeof WebAssembly !== "undefined" && typeof WebAssembly.Exception !== "undefined") return exception instanceof WebAssembly.Exception;
		else return false;
	}
	/**
	* Extracts from errors what we use as the exception `type` in error events.
	*
	* Usually, this is the `name` property on Error objects but WASM errors need to be treated differently.
	*/
	function extractType(ex) {
		const name = ex?.name;
		if (!name && isWebAssemblyException(ex)) return ex.message && Array.isArray(ex.message) && ex.message.length == 2 ? ex.message[0] : "WebAssembly.Exception";
		return name;
	}
	/**
	* There are cases where stacktrace.message is an Event object
	* https://github.com/getsentry/sentry-javascript/issues/1949
	* In this specific case we try to extract stacktrace.message.error.message
	*/
	function extractMessage(ex) {
		const message = ex?.message;
		if (isWebAssemblyException(ex)) {
			if (Array.isArray(ex.message) && ex.message.length == 2) return ex.message[1];
			return "wasm exception";
		}
		if (!message) return "No error message";
		if (message.error && typeof message.error.message === "string") return _enhanceErrorWithSentryInfo(message.error);
		return _enhanceErrorWithSentryInfo(ex);
	}
	/**
	* Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
	* @hidden
	*/
	function eventFromException(stackParser, exception, hint, attachStacktrace) {
		const event = eventFromUnknownInput(stackParser, exception, hint?.syntheticException || void 0, attachStacktrace);
		addExceptionMechanism(event);
		event.level = "error";
		if (hint?.event_id) event.event_id = hint.event_id;
		return resolvedSyncPromise(event);
	}
	/**
	* Builds and Event from a Message
	* @hidden
	*/
	function eventFromMessage(stackParser, message, level = "info", hint, attachStacktrace) {
		const event = eventFromString(stackParser, message, hint?.syntheticException || void 0, attachStacktrace);
		event.level = level;
		if (hint?.event_id) event.event_id = hint.event_id;
		return resolvedSyncPromise(event);
	}
	/**
	* @hidden
	*/
	function eventFromUnknownInput(stackParser, exception, syntheticException, attachStacktrace, isUnhandledRejection) {
		let event;
		if (isErrorEvent$2(exception) && exception.error) return eventFromError(stackParser, exception.error);
		if (isDOMError(exception) || isDOMException(exception)) {
			const domException = exception;
			if ("stack" in exception) {
				event = eventFromError(stackParser, exception);
				const firstException = event.exception?.values?.[0];
				if (attachStacktrace && syntheticException && firstException && !firstException.stacktrace) {
					const frames = parseStackFrames(stackParser, syntheticException);
					if (frames.length) {
						firstException.stacktrace = { frames };
						addExceptionMechanism(event, { synthetic: true });
					}
				}
			} else {
				const name = domException.name || (isDOMError(domException) ? "DOMError" : "DOMException");
				const message = domException.message ? `${name}: ${domException.message}` : name;
				event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
				addExceptionTypeValue(event, message);
			}
			return event;
		}
		if (isError(exception)) return eventFromError(stackParser, exception);
		if (isPlainObject(exception) || isEvent(exception)) {
			event = eventFromPlainObject(stackParser, exception, syntheticException, isUnhandledRejection);
			addExceptionMechanism(event, { synthetic: true });
			return event;
		}
		const stringifiedException = String(exception);
		event = eventFromString(stackParser, stringifiedException, syntheticException, attachStacktrace);
		addExceptionTypeValue(event, stringifiedException, void 0);
		addExceptionMechanism(event, { synthetic: true });
		return event;
	}
	function eventFromString(stackParser, message, syntheticException, attachStacktrace) {
		const event = {};
		if (attachStacktrace && syntheticException) {
			const frames = parseStackFrames(stackParser, syntheticException);
			if (frames.length) event.exception = { values: [{
				value: message,
				stacktrace: { frames }
			}] };
			addExceptionMechanism(event, { synthetic: true });
		}
		if (isParameterizedString(message)) {
			const { __sentry_template_string__, __sentry_template_values__ } = message;
			event.logentry = {
				message: __sentry_template_string__,
				params: __sentry_template_values__
			};
			return event;
		}
		event.message = message;
		return event;
	}
	function getNonErrorObjectExceptionValue(exception, { isUnhandledRejection }) {
		const keys = extractExceptionKeysForMessage(exception);
		const captureType = isUnhandledRejection ? "promise rejection" : "exception";
		if (isErrorEvent$2(exception)) return `Event \`ErrorEvent\` captured as ${captureType} with message \`${exception.message}\``;
		if (isEvent(exception)) return `Event \`${getObjectClassName(exception)}\` (type=${exception.type}) captured as ${captureType}`;
		return `Object captured as ${captureType} with keys: ${keys}`;
	}
	function getObjectClassName(obj) {
		try {
			const prototype = Object.getPrototypeOf(obj);
			return prototype ? prototype.constructor.name : void 0;
		} catch {}
	}
	/** If a plain object has a property that is an `Error`, return this error. */
	function getErrorPropertyFromObject(obj) {
		return Object.values(obj).find(isError);
	}
	// src/utils/managedTunnel.ts
	/**
	* Resolves `tunnel: true` or {@link BrowserTunnelOptions} to the managed tunnel's same-origin path. A string is left as
	* written, so a tunnel the app serves itself keeps its URL.
	*/
	function resolveBrowserTunnelOption(options) {
		const { tunnel, dsn, transportOptions } = options;
		if (!tunnel) return {
			tunnel,
			transportOptions
		};
		if (typeof tunnel === "string") return {
			tunnel,
			transportOptions: isSameOrigin(tunnel) ? withEnvelopeContentType(transportOptions) : transportOptions
		};
		const tunnelOptions = tunnel === true ? {} : tunnel;
		const dsnComponents = dsn && makeDsn(dsn);
		const tunnelPath = tunnelOptions.path ?? (dsnComponents && getTunnelPath(dsnComponents));
		if (!tunnelPath) return {
			tunnel: void 0,
			transportOptions
		};
		const resolvedTunnel = `${normalizeTunnelBasePath(tunnelOptions.basePath)}${tunnelPath}${tunnelOptions.trailingSlash ? "/" : ""}`;
		debug$1.log(`Tunneling events to "${resolvedTunnel}"`);
		return {
			tunnel: resolvedTunnel,
			transportOptions: withEnvelopeContentType(transportOptions)
		};
	}
	/**
	* Sends envelopes as `application/x-sentry-envelope`. CSRF protection (SvelteKit, Astro) rejects the default
	* `text/plain` POST as a form submission, and the Next.js managed tunnel route on Vercel matches on this header.
	* Cross-origin it would trigger a CORS preflight, so only same-origin tunnels get it.
	*/
	function withEnvelopeContentType(transportOptions) {
		return {
			...transportOptions,
			headers: {
				"Content-Type": "application/x-sentry-envelope",
				...transportOptions?.headers
			}
		};
	}
	/**
	* Whether the tunnel URL is on the page's origin. Unknown counts as cross-origin.
	*/
	function isSameOrigin(url) {
		const urlObject = parseStringToURLObject(url, WINDOW.location?.href);
		if (!urlObject) return false;
		return isURLObjectRelative(urlObject) || urlObject.origin === WINDOW.location?.origin;
	}
	// src/client.ts
	/**
	* The Sentry Browser SDK Client.
	*
	* @see BrowserOptions for documentation on configuration options.
	* @see SentryClient for usage documentation.
	*/
	var BrowserClient = class extends Client {
		/**
		* Creates a new Browser SDK instance.
		*
		* @param options Configuration options for this SDK.
		*/
		constructor(options) {
			const opts = applyDefaultOptions({
				...options,
				...resolveBrowserTunnelOption(options)
			});
			applySdkMetadata(opts, "browser", ["browser"], WINDOW.SENTRY_SDK_SOURCE || getSDKSource());
			super(opts);
			if (opts.routeProvider) setRouteProvider(opts.routeProvider, this);
			this._unhandledSessionStatus = "unhandled";
			const { userInfo } = this.getDataCollectionOptions();
			if (opts._metadata?.sdk) opts._metadata.sdk.settings = {
				infer_ip: userInfo ? "auto" : "never",
				...opts._metadata.sdk.settings
			};
			const { sendClientReports } = this._options;
			const checkDrift = () => {
				timestampInSeconds();
			};
			const listeners = [
				[
					WINDOW.document,
					"visibilitychange",
					() => {
						checkDrift();
						if (WINDOW.document.visibilityState === "hidden") {
							if (sendClientReports) this._flushOutcomes();
							queueMicrotask(() => {
								this.flush();
							});
						}
					}
				],
				[
					WINDOW.document,
					"freeze",
					checkDrift
				],
				[
					WINDOW.document,
					"resume",
					checkDrift
				],
				[
					WINDOW,
					"pagehide",
					checkDrift
				],
				[
					WINDOW,
					"pageshow",
					checkDrift
				]
			];
			listeners.forEach(([target, name, listener]) => target?.addEventListener?.(name, listener));
			this.on("close", () => listeners.forEach(([target, name, listener]) => target?.removeEventListener?.(name, listener)));
			if (userInfo) this.on("beforeSendSession", addAutoIpAddressToSession);
		}
		/**
		* @inheritDoc
		*/
		eventFromException(exception, hint) {
			return eventFromException(this._options.stackParser, exception, hint, this._options.attachStacktrace);
		}
		/**
		* @inheritDoc
		*/
		eventFromMessage(message, level = "info", hint) {
			return eventFromMessage(this._options.stackParser, message, level, hint, this._options.attachStacktrace);
		}
		/**
		* @inheritDoc
		*/
		_prepareEvent(event, hint, currentScope, isolationScope) {
			event.platform = event.platform || "javascript";
			return super._prepareEvent(event, hint, currentScope, isolationScope);
		}
	};
	/** Exported only for tests. */
	function applyDefaultOptions(optionsArg) {
		return {
			release: typeof __SENTRY_RELEASE__ === "string" ? __SENTRY_RELEASE__ : WINDOW.SENTRY_RELEASE?.id,
			sendClientReports: true,
			parentSpanIsAlwaysRootSpan: true,
			...optionsArg
		};
	}
	// src/transports/fetch.ts
	const DEFAULT_BROWSER_TRANSPORT_BUFFER_SIZE = 40;
	/**
	* Creates a Transport that uses the Fetch API to send events to Sentry.
	*/
	function makeFetchTransport(options, nativeFetch = getNativeImplementation("fetch")) {
		let pendingBodySize = 0;
		let pendingCount = 0;
		async function makeRequest(request) {
			const requestSize = request.body.length;
			pendingBodySize += requestSize;
			pendingCount++;
			const requestOptions = {
				body: request.body,
				method: "POST",
				referrerPolicy: "strict-origin",
				headers: options.headers,
				keepalive: pendingBodySize <= 6e4 && pendingCount < 15,
				...options.fetchOptions
			};
			try {
				const response = await nativeFetch(options.url, requestOptions);
				return {
					statusCode: response.status,
					headers: {
						"x-sentry-rate-limits": response.headers.get("X-Sentry-Rate-Limits"),
						"retry-after": response.headers.get("Retry-After")
					}
				};
			} catch (e) {
				clearCachedImplementation("fetch");
				throw e;
			} finally {
				pendingBodySize -= requestSize;
				pendingCount--;
			}
		}
		return createTransport(options, makeRequest, makePromiseBuffer(options.bufferSize || DEFAULT_BROWSER_TRANSPORT_BUFFER_SIZE));
	}
	// src/profiling/index.ts
	/**
	* Starts a manually controlled Sentry UI profiling session.
	*
	* Profiling starts only when the integration sampled the current session and `profileLifecycle` is `manual`.
	* While running, the profiler periodically sends profile chunks to Sentry until `stopProfiler()` is called.
	*/
	function startProfiler() {
		const client = getClient();
		if (!client) {
			debug$1.warn("No Sentry client available, profiling is not started");
			return;
		}
		if (!client.getIntegrationByName("BrowserProfiling")) {
			debug$1.warn("BrowserProfiling integration is not available");
			return;
		}
		client.emit("startUIProfiler");
	}
	/**
	* Stops a manually controlled Sentry UI profiling session.
	*
	* Calls to stop will stop the profiler and flush the currently collected profile data to Sentry.
	*/
	function stopProfiler() {
		const client = getClient();
		if (!client) {
			debug$1.warn("No Sentry client available, profiling is not started");
			return;
		}
		if (!client.getIntegrationByName("BrowserProfiling")) {
			debug$1.warn("ProfilingIntegration is not available");
			return;
		}
		client.emit("stopUIProfiler");
	}
	/**
	* Profiler namespace for controlling the JS profiler in 'manual' mode.
	*
	* Requires the `browserProfilingIntegration` from the `@sentry/browser` package.
	*/
	const uiProfiler = {
		startProfiler,
		stopProfiler
	};
	// src/stack-parsers.ts
	const OPERA10_PRIORITY = 10;
	const OPERA11_PRIORITY = 20;
	const CHROME_PRIORITY = 30;
	const WINJS_PRIORITY = 40;
	const GECKO_PRIORITY = 50;
	function createFrame(filename, func, lineno, colno) {
		const frame = {
			filename,
			function: func === "<anonymous>" ? "?" : func,
			in_app: true
		};
		if (lineno !== void 0) frame.lineno = lineno;
		if (colno !== void 0) frame.colno = colno;
		return frame;
	}
	const chromeRegexNoFnName = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i;
	const chromeRegex = /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?![^(]*\) )(?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
	const chromeEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;
	const chromeDataUriRegex = /at (.+?) ?\(data:(.+?),/;
	const chromeStackParserFn = (line) => {
		const dataUriMatch = line.match(chromeDataUriRegex);
		if (dataUriMatch) return {
			filename: `<data:${dataUriMatch[2]}>`,
			function: dataUriMatch[1]
		};
		const noFnParts = chromeRegexNoFnName.exec(line);
		if (noFnParts) {
			const [, filename, line, col] = noFnParts;
			return createFrame(filename, "?", +line, +col);
		}
		const parts = chromeRegex.exec(line);
		if (parts) {
			if (parts[2]?.indexOf("eval") === 0) {
				const subMatch = chromeEvalRegex.exec(parts[2]);
				if (subMatch) {
					parts[2] = subMatch[1];
					parts[3] = subMatch[2];
					parts[4] = subMatch[3];
				}
			}
			const [func, filename] = extractSafariExtensionDetails(parts[1] || "?", parts[2]);
			return createFrame(filename, func, parts[3] ? +parts[3] : void 0, parts[4] ? +parts[4] : void 0);
		}
	};
	const chromeStackLineParser = [CHROME_PRIORITY, chromeStackParserFn];
	const geckoREgex = /^\s*(.*?)(?:\(([^()]*)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
	const geckoEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;
	const gecko = (line) => {
		const parts = geckoREgex.exec(line);
		if (parts) {
			if (parts[3] && parts[3].indexOf(" > eval") > -1) {
				const subMatch = geckoEvalRegex.exec(parts[3]);
				if (subMatch) {
					parts[1] = parts[1] || "eval";
					parts[3] = subMatch[1];
					parts[4] = subMatch[2];
					parts[5] = "";
				}
			}
			let filename = parts[3];
			let func = parts[1] || "?";
			[func, filename] = extractSafariExtensionDetails(func, filename);
			return createFrame(filename, func, parts[4] ? +parts[4] : void 0, parts[5] ? +parts[5] : void 0);
		}
	};
	const geckoStackLineParser = [GECKO_PRIORITY, gecko];
	const winjsRegex = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:[-a-z]+):.*?):(\d+)(?::(\d+))?\)?\s*$/i;
	const winjs = (line) => {
		const parts = winjsRegex.exec(line);
		return parts ? createFrame(parts[2], parts[1] || "?", +parts[3], parts[4] ? +parts[4] : void 0) : void 0;
	};
	const winjsStackLineParser = [WINJS_PRIORITY, winjs];
	const opera10Regex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i;
	const opera10 = (line) => {
		const parts = opera10Regex.exec(line);
		return parts ? createFrame(parts[2], parts[3] || "?", +parts[1]) : void 0;
	};
	const opera10StackLineParser = [OPERA10_PRIORITY, opera10];
	const opera11Regex = / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^)]+))\(.*\))? in (.*):\s*$/i;
	const opera11 = (line) => {
		const parts = opera11Regex.exec(line);
		return parts ? createFrame(parts[5], parts[3] || parts[4] || "?", +parts[1], +parts[2]) : void 0;
	};
	const opera11StackLineParser = [OPERA11_PRIORITY, opera11];
	const defaultStackLineParsers = [chromeStackLineParser, geckoStackLineParser];
	const defaultStackParser = createStackParser(...defaultStackLineParsers);
	/**
	* Safari web extensions, starting version unknown, can produce "frames-only" stacktraces.
	* What it means, is that instead of format like:
	*
	* Error: wat
	*   at function@url:row:col
	*   at function@url:row:col
	*   at function@url:row:col
	*
	* it produces something like:
	*
	*   function@url:row:col
	*   function@url:row:col
	*   function@url:row:col
	*
	* Because of that, it won't be captured by `chrome` RegExp and will fall into `Gecko` branch.
	* This function is extracted so that we can use it in both places without duplicating the logic.
	* Unfortunately "just" changing RegExp is too complicated now and making it pass all tests
	* and fix this case seems like an impossible, or at least way too time-consuming task.
	*/
	const extractSafariExtensionDetails = (func, filename) => {
		const isSafariExtension = func.indexOf("safari-extension") !== -1;
		const isSafariWebExtension = func.indexOf("safari-web-extension") !== -1;
		return isSafariExtension || isSafariWebExtension ? [func.indexOf("@") !== -1 ? func.split("@")[0] : "?", isSafariExtension ? `safari-extension:${filename}` : `safari-web-extension:${filename}`] : [func, filename];
	};
	// src/userfeedback.ts
	/**
	* Creates an envelope from a user feedback.
	*/
	function createUserFeedbackEnvelope(feedback, { metadata, tunnel, dsn }) {
		return createEnvelope({
			event_id: feedback.event_id,
			sent_at: (/* @__PURE__ */ new Date()).toISOString(),
			...metadata?.sdk && { sdk: {
				name: metadata.sdk.name,
				version: metadata.sdk.version
			} },
			...!!tunnel && !!dsn && { dsn: dsnToString(dsn) }
		}, [createUserFeedbackEnvelopeItem(feedback)]);
	}
	function createUserFeedbackEnvelopeItem(feedback) {
		return [{ type: "user_report" }, feedback];
	}
	// src/integrations/breadcrumbs.ts
	/** maxStringLength gets capped to prevent 100 breadcrumbs exceeding 1MB event payload size */
	const MAX_ALLOWED_STRING_LENGTH = 1024;
	const INTEGRATION_NAME$6 = "Breadcrumbs";
	const _breadcrumbsIntegration = ((options = {}) => {
		const _options = {
			dom: true,
			fetch: true,
			history: true,
			sentry: true,
			xhr: true,
			...options
		};
		return {
			name: INTEGRATION_NAME$6,
			setup(client) {
				if (_options.dom) addClickKeypressInstrumentationHandler(_getDomBreadcrumbHandler(client, _options.dom));
				if (_options.xhr) addXhrInstrumentationHandler(_getXhrBreadcrumbHandler(client));
				if (_options.fetch) addFetchInstrumentationHandler(_getFetchBreadcrumbHandler(client));
				if (_options.history) addHistoryInstrumentationHandler(_getHistoryBreadcrumbHandler(client));
				if (_options.sentry) client.on("beforeSendEvent", _getSentryBreadcrumbHandler(client));
			}
		};
	});
	const breadcrumbsIntegration = defineIntegration(_breadcrumbsIntegration);
	/**
	* Adds a breadcrumb for Sentry events or transactions if this option is enabled.
	*/
	function _getSentryBreadcrumbHandler(client) {
		return function addSentryBreadcrumb(event) {
			if (getClient() !== client) return;
			addBreadcrumb({
				category: `sentry.${event.type === "transaction" ? "transaction" : "event"}`,
				event_id: event.event_id,
				level: event.level,
				message: getEventDescription(event)
			}, { event });
		};
	}
	/**
	* A HOC that creates a function that creates breadcrumbs from DOM API calls.
	* This is a HOC so that we get access to dom options in the closure.
	*/
	function _getDomBreadcrumbHandler(client, dom) {
		return function _innerDomBreadcrumb(handlerData) {
			if (getClient() !== client) return;
			let target;
			let componentName;
			let keyAttrs = typeof dom === "object" ? dom.serializeAttribute : void 0;
			let maxStringLength = typeof dom === "object" && typeof dom.maxStringLength === "number" ? dom.maxStringLength : void 0;
			if (maxStringLength && maxStringLength > MAX_ALLOWED_STRING_LENGTH) {
				debug$1.warn(`\`dom.maxStringLength\` cannot exceed ${MAX_ALLOWED_STRING_LENGTH}, but a value of ${maxStringLength} was configured. Sentry will use ${MAX_ALLOWED_STRING_LENGTH} instead.`);
				maxStringLength = MAX_ALLOWED_STRING_LENGTH;
			}
			if (typeof keyAttrs === "string") keyAttrs = [keyAttrs];
			try {
				const event = handlerData.event;
				const element = _isEvent(event) ? event.target : event;
				target = htmlTreeAsString(element, {
					keyAttrs,
					maxStringLength
				});
				componentName = getComponentName(element);
			} catch {
				target = "<unknown>";
			}
			if (target.length === 0) return;
			const breadcrumb = {
				category: `ui.${handlerData.name}`,
				message: target
			};
			if (componentName) breadcrumb.data = { "ui.component_name": componentName };
			addBreadcrumb(breadcrumb, {
				event: handlerData.event,
				name: handlerData.name,
				global: handlerData.global
			});
		};
	}
	/**
	* Creates breadcrumbs from XHR API calls
	*/
	function _getXhrBreadcrumbHandler(client) {
		return function _xhrBreadcrumb(handlerData) {
			if (getClient() !== client) return;
			const { startTimestamp, endTimestamp } = handlerData;
			const sentryXhrData = handlerData.xhr[SENTRY_XHR_DATA_KEY];
			if (!startTimestamp || !endTimestamp || !sentryXhrData) return;
			const { method, url, status_code, body } = sentryXhrData;
			const data = {
				method,
				url: getBreadcrumbUrl(url, client),
				status_code
			};
			const hint = {
				xhr: handlerData.xhr,
				input: body,
				startTimestamp,
				endTimestamp
			};
			const breadcrumb = {
				category: "xhr",
				data,
				type: "http",
				level: getBreadcrumbLogLevelFromHttpStatusCode(status_code)
			};
			client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
			addBreadcrumb(breadcrumb, hint);
		};
	}
	/**
	* Creates breadcrumbs from fetch API calls
	*/
	function _getFetchBreadcrumbHandler(client) {
		return function _fetchBreadcrumb(handlerData) {
			if (getClient() !== client) return;
			const { startTimestamp, endTimestamp } = handlerData;
			if (!endTimestamp) return;
			if (handlerData.fetchData.url.match(/sentry_key/) && handlerData.fetchData.method === "POST") return;
			if (handlerData.error) {
				const hint = {
					data: handlerData.error,
					input: handlerData.args,
					startTimestamp,
					endTimestamp
				};
				const breadcrumb = {
					category: "fetch",
					data: {
						...handlerData.fetchData,
						url: getBreadcrumbUrl(handlerData.fetchData.url, client)
					},
					level: "error",
					type: "http"
				};
				client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
				addBreadcrumb(breadcrumb, hint);
			} else {
				const response = handlerData.response;
				const data = {
					...handlerData.fetchData,
					url: getBreadcrumbUrl(handlerData.fetchData.url, client),
					status_code: response?.status
				};
				const hint = {
					input: handlerData.args,
					response,
					startTimestamp,
					endTimestamp
				};
				const breadcrumb = {
					category: "fetch",
					data,
					type: "http",
					level: getBreadcrumbLogLevelFromHttpStatusCode(data.status_code)
				};
				client.emit("beforeOutgoingRequestBreadcrumb", breadcrumb, hint);
				addBreadcrumb(breadcrumb, hint);
			}
		};
	}
	/**
	* Creates breadcrumbs from history API calls
	*/
	function _getHistoryBreadcrumbHandler(client) {
		return function _historyBreadcrumb(handlerData) {
			if (getClient() !== client) return;
			let from = handlerData.from;
			let to = handlerData.to;
			const parsedLoc = parseUrl(WINDOW.location.href);
			let parsedFrom = from ? parseUrl(from) : void 0;
			const parsedTo = parseUrl(to);
			if (!parsedFrom?.path) parsedFrom = parsedLoc;
			if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) to = parsedTo.relative;
			if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) from = parsedFrom.relative;
			addBreadcrumb({
				category: "navigation",
				data: {
					from: filterCollectedUrl(from),
					to: filterCollectedUrl(to)
				}
			});
		};
	}
	function getBreadcrumbUrl(url, client) {
		const pageUrl = url === "" ? WINDOW.location?.href : void 0;
		return filterCollectedUrl(pageUrl ? pageUrl.split("#")[0] ?? "" : url, client);
	}
	function _isEvent(event) {
		return !!event && !!event.target;
	}
	// src/integrations/browserapierrors.ts
	const DEFAULT_EVENT_TARGET = "EventTarget,Window,Node,ApplicationCache,AudioTrackList,BroadcastChannel,ChannelMergerNode,CryptoOperation,EventSource,FileReader,HTMLUnknownElement,IDBDatabase,IDBRequest,IDBTransaction,KeyOperation,MediaController,MessagePort,ModalWindow,Notification,SVGElementInstance,Screen,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebSocket,WebSocketWorker,Worker,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload".split(",");
	const INTEGRATION_NAME$5 = "BrowserApiErrors";
	const _browserApiErrorsIntegration = ((options = {}) => {
		const _options = {
			XMLHttpRequest: true,
			eventTarget: true,
			requestAnimationFrame: true,
			setInterval: true,
			setTimeout: true,
			unregisterOriginalCallbacks: false,
			...options
		};
		return {
			name: INTEGRATION_NAME$5,
			setupOnce() {
				if (_options.setTimeout) fill(WINDOW, "setTimeout", _wrapTimeFunction);
				if (_options.setInterval) fill(WINDOW, "setInterval", _wrapTimeFunction);
				if (_options.requestAnimationFrame) fill(WINDOW, "requestAnimationFrame", _wrapRAF);
				if (_options.XMLHttpRequest && "XMLHttpRequest" in WINDOW) fill(XMLHttpRequest.prototype, "send", _wrapXHR);
				const eventTargetOption = _options.eventTarget;
				if (eventTargetOption) (Array.isArray(eventTargetOption) ? eventTargetOption : DEFAULT_EVENT_TARGET).forEach((target) => _wrapEventTarget(target, _options));
			}
		};
	});
	/**
	* Wrap timer functions and event targets to catch errors and provide better meta data.
	*/
	const browserApiErrorsIntegration = defineIntegration(_browserApiErrorsIntegration);
	function _wrapTimeFunction(original) {
		return function(...args) {
			const originalCallback = args[0];
			args[0] = wrap(originalCallback, { mechanism: {
				handled: false,
				type: `auto.browser.browserapierrors.${getFunctionName(original)}`
			} });
			return original.apply(this, args);
		};
	}
	function _wrapRAF(original) {
		return function(callback) {
			return original.apply(this, [wrap(callback, { mechanism: {
				data: { handler: getFunctionName(original) },
				handled: false,
				type: "auto.browser.browserapierrors.requestAnimationFrame"
			} })]);
		};
	}
	function _wrapXHR(originalSend) {
		return function(...args) {
			const xhr = this;
			[
				"onload",
				"onerror",
				"onprogress",
				"onreadystatechange"
			].forEach((prop) => {
				if (prop in xhr && typeof xhr[prop] === "function") fill(xhr, prop, function(original) {
					const wrapOptions = { mechanism: {
						data: { handler: getFunctionName(original) },
						handled: false,
						type: `auto.browser.browserapierrors.xhr.${prop}`
					} };
					const originalFunction = getOriginalFunction(original);
					if (originalFunction) wrapOptions.mechanism.data.handler = getFunctionName(originalFunction);
					return wrap(original, wrapOptions);
				});
			});
			return originalSend.apply(this, args);
		};
	}
	function _wrapEventTarget(target, integrationOptions) {
		const proto = WINDOW[target]?.prototype;
		if (!proto?.hasOwnProperty?.("addEventListener")) return;
		fill(proto, "addEventListener", function(original) {
			return function(eventName, fn, options) {
				try {
					if (isEventListenerObject(fn)) fn.handleEvent = wrap(fn.handleEvent, { mechanism: {
						data: {
							handler: getFunctionName(fn),
							target
						},
						handled: false,
						type: "auto.browser.browserapierrors.handleEvent"
					} });
				} catch {}
				if (integrationOptions.unregisterOriginalCallbacks) unregisterOriginalCallback(this, eventName, fn);
				return original.apply(this, [
					eventName,
					wrap(fn, { mechanism: {
						data: {
							handler: getFunctionName(fn),
							target
						},
						handled: false,
						type: "auto.browser.browserapierrors.addEventListener"
					} }),
					options
				]);
			};
		});
		fill(proto, "removeEventListener", function(originalRemoveEventListener) {
			return function(eventName, fn, options) {
				/**
				* There are 2 possible scenarios here:
				*
				* 1. Someone passes a callback, which was attached prior to Sentry initialization, or by using unmodified
				* method, eg. `document.addEventListener.call(el, name, handler). In this case, we treat this function
				* as a pass-through, and call original `removeEventListener` with it.
				*
				* 2. Someone passes a callback, which was attached after Sentry was initialized, which means that it was using
				* our wrapped version of `addEventListener`, which internally calls `wrap` helper.
				* This helper "wraps" whole callback inside a try/catch statement, and attached appropriate metadata to it,
				* in order for us to make a distinction between wrapped/non-wrapped functions possible.
				* If a function was wrapped, it has additional property of `__sentry_wrapped__`, holding the handler.
				*
				* When someone adds a handler prior to initialization, and then do it again, but after,
				* then we have to detach both of them. Otherwise, if we'd detach only wrapped one, it'd be impossible
				* to get rid of the initial handler and it'd stick there forever.
				*/
				try {
					if (Object.prototype.hasOwnProperty.call(fn, "__sentry_wrapped__")) {
						const originalEventHandler = fn.__sentry_wrapped__;
						if (originalEventHandler) originalRemoveEventListener.call(this, eventName, originalEventHandler, options);
					}
				} catch {}
				return originalRemoveEventListener.call(this, eventName, fn, options);
			};
		});
	}
	function isEventListenerObject(obj) {
		return typeof obj.handleEvent === "function";
	}
	function unregisterOriginalCallback(target, eventName, fn) {
		if (target && typeof target === "object" && "removeEventListener" in target && typeof target.removeEventListener === "function") target.removeEventListener(eventName, fn);
	}
	// src/integrations/browsersession.ts
	/**
	* When added, automatically creates sessions which allow you to track adoption and crashes (crash free rate) in your Releases in Sentry.
	* More information: https://docs.sentry.io/product/releases/health/
	*
	* Note: In order for session tracking to work, you need to set up Releases: https://docs.sentry.io/product/releases/
	*/
	const browserSessionIntegration = defineIntegration((options = {}) => {
		const lifecycle = options.lifecycle ?? "page";
		return {
			name: "BrowserSession",
			setupOnce() {
				if (typeof WINDOW.document === "undefined") {
					debug$1.warn("Using the `browserSessionIntegration` in non-browser environments is not supported.");
					return;
				}
				startSession({ ignoreDuration: true });
				let initialSessionSent = false;
				whenIdleOrHidden(() => {
					if (!initialSessionSent) {
						captureSession();
						initialSessionSent = true;
					}
				});
				const isolationScope = getIsolationScope();
				let previousUser = isolationScope.getUser();
				isolationScope.addScopeListener((scope) => {
					const maybeNewUser = scope.getUser();
					if (previousUser?.id !== maybeNewUser?.id || previousUser?.ip_address !== maybeNewUser?.ip_address) {
						previousUser = maybeNewUser;
						if (initialSessionSent) captureSession();
					}
				});
				if (lifecycle === "route") addHistoryInstrumentationHandler(({ from, to }) => {
					if (from !== to) {
						startSession({ ignoreDuration: true });
						captureSession();
						initialSessionSent = true;
					}
				});
			}
		};
	});
	// src/integrations/culturecontext.ts
	const INTEGRATION_NAME$4 = "CultureContext";
	const _cultureContextIntegration = (() => {
		return {
			name: INTEGRATION_NAME$4,
			preprocessEvent(event) {
				const culture = getCultureContext();
				if (culture) event.contexts = {
					...event.contexts,
					culture: {
						...culture,
						...event.contexts?.culture
					}
				};
			},
			processSegmentSpan(span) {
				const culture = getCultureContext();
				if (culture) safeSetSpanJSONAttributes(span, {
					[Ra]: culture.locale,
					[Na]: culture.timezone,
					[wa]: culture.calendar
				});
			}
		};
	});
	/**
	* Captures culture context from the browser.
	*
	* Enabled by default.
	*
	* @example
	* ```js
	* import * as Sentry from '@sentry/browser';
	*
	* Sentry.init({
	*   integrations: [Sentry.cultureContextIntegration()],
	* });
	* ```
	*/
	const cultureContextIntegration = defineIntegration(_cultureContextIntegration);
	/**
	* Returns the culture context from the browser's Intl API.
	*/
	function getCultureContext() {
		try {
			const intl = WINDOW.Intl;
			if (!intl) return;
			const options = intl.DateTimeFormat().resolvedOptions();
			return {
				locale: options.locale,
				timezone: options.timeZone,
				calendar: options.calendar
			};
		} catch {
			return;
		}
	}
	// src/integrations/globalhandlers.ts
	const INTEGRATION_NAME$3 = "GlobalHandlers";
	const _globalHandlersIntegration = ((options = {}) => {
		const _options = {
			onerror: true,
			onunhandledrejection: true,
			...options
		};
		return {
			name: INTEGRATION_NAME$3,
			setupOnce() {
				Error.stackTraceLimit = 50;
			},
			setup(client) {
				if (_options.onerror) {
					_installGlobalOnErrorHandler(client);
					globalHandlerLog("onerror");
				}
				if (_options.onunhandledrejection) {
					_installGlobalOnUnhandledRejectionHandler(client);
					globalHandlerLog("onunhandledrejection");
				}
			}
		};
	});
	const globalHandlersIntegration = defineIntegration(_globalHandlersIntegration);
	function _installGlobalOnErrorHandler(client) {
		addGlobalErrorInstrumentationHandler((data) => {
			const { stackParser, attachStacktrace } = getOptions();
			if (getClient() !== client || shouldIgnoreOnError(data)) return;
			const { msg, url, line, column, error } = data;
			const event = _enhanceEventWithInitialFrame(eventFromUnknownInput(stackParser, error || msg, void 0, attachStacktrace, false), url, line, column);
			event.level = "error";
			captureEvent(event, {
				originalException: error,
				mechanism: {
					handled: false,
					type: "auto.browser.global_handlers.onerror"
				}
			});
		});
	}
	function _installGlobalOnUnhandledRejectionHandler(client) {
		addGlobalUnhandledRejectionInstrumentationHandler((e) => {
			const { stackParser, attachStacktrace } = getOptions();
			if (getClient() !== client || shouldIgnoreOnError()) return;
			const error = _getUnhandledRejectionError(e);
			const event = isPrimitive(error) ? _eventFromRejectionWithPrimitive(error) : eventFromUnknownInput(stackParser, error, void 0, attachStacktrace, true);
			event.level = "error";
			captureEvent(event, {
				originalException: error,
				mechanism: {
					handled: false,
					type: "auto.browser.global_handlers.onunhandledrejection"
				}
			});
		});
	}
	/**
	*
	*/
	function _getUnhandledRejectionError(error) {
		if (isPrimitive(error)) return error;
		try {
			if ("reason" in error) return error.reason;
			if ("detail" in error && "reason" in error.detail) return error.detail.reason;
		} catch {}
		return error;
	}
	/**
	* Create an event from a promise rejection where the `reason` is a primitive.
	*
	* @param reason: The `reason` property of the promise rejection
	* @returns An Event object with an appropriate `exception` value
	*/
	function _eventFromRejectionWithPrimitive(reason) {
		return { exception: { values: [{
			type: "UnhandledRejection",
			value: `Non-Error promise rejection captured with value: ${String(reason)}`
		}] } };
	}
	/**
	* Adds a frame built from the error location when the event has none.
	*/
	function _enhanceEventWithInitialFrame(event, url, lineno, colno) {
		const e = event.exception = event.exception || {};
		const ev = e.values = e.values || [];
		const ev0 = ev[0] = ev[0] || {};
		const ev0s = ev0.stacktrace = ev0.stacktrace || {};
		const ev0sf = ev0s.frames = ev0s.frames || [];
		if (ev0sf.length === 0) ev0sf.push({
			colno,
			lineno,
			filename: getFilenameFromUrl(url) ?? getLocationHref(),
			function: "?",
			in_app: true
		});
		return event;
	}
	function globalHandlerLog(type) {
		debug$1.log(`Global Handler attached: ${type}`);
	}
	function getOptions() {
		return getClient()?.getOptions() || {
			stackParser: () => [],
			attachStacktrace: false
		};
	}
	function getFilenameFromUrl(url) {
		if (!isString(url) || url.length === 0) return;
		if (url.startsWith("data:")) return `<${stripDataUrlContent(url, false)}>`;
		return url;
	}
	// src/integrations/httpcontext.ts
	/**
	* Collects information about HTTP request headers and
	* attaches them to the event.
	*/
	const httpContextIntegration = defineIntegration(() => {
		return {
			name: "HttpContext",
			preprocessEvent(event, _hint, client) {
				if (!WINDOW.navigator && !WINDOW.location && !WINDOW.document) return;
				const { url, headers: collectedHeaders } = getHttpRequestData(client);
				const behavior = client.getDataCollectionOptions().httpHeaders.request;
				const userHeaders = Object.entries(event.request?.headers ?? {}).filter(([key]) => !(key in collectedHeaders));
				const headers = {
					...filterKeyValueData(collectedHeaders, behavior),
					...Object.fromEntries(userHeaders)
				};
				event.request = {
					url: filterCollectedUrl(url, client),
					...event.request,
					...Object.keys(headers).length > 0 ? { headers } : { headers: void 0 }
				};
			},
			processSpan(span, client) {
				if (!WINDOW.navigator && !WINDOW.location && !WINDOW.document) return;
				const reqData = getHttpRequestData(client);
				const headers = filterKeyValueData(reqData.headers, client.getDataCollectionOptions().httpHeaders.request);
				const referer = headers["Referer"];
				const { hostname, protocol } = WINDOW.location || {};
				safeSetSpanJSONAttributes(span, {
					[vy]: headers["User-Agent"],
					[$m]: protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || !!hostname?.endsWith(".localhost"),
					...span.is_segment && {
						["url.full"]: span.attributes?.["sentry.op"] !== "http.client" ? filterCollectedUrl(reqData.url) : void 0,
						[`http.request.header.referer`]: referer ? [referer] : void 0
					}
				});
			}
		};
	});
	// src/integrations/linkederrors.ts
	const DEFAULT_KEY = "cause";
	const DEFAULT_LIMIT = 5;
	const INTEGRATION_NAME$2 = "LinkedErrors";
	const _linkedErrorsIntegration = ((options = {}) => {
		const limit = options.limit || DEFAULT_LIMIT;
		const key = options.key || DEFAULT_KEY;
		return {
			name: INTEGRATION_NAME$2,
			preprocessEvent(event, hint, client) {
				applyAggregateErrorsToEvent(exceptionFromError, client.getOptions().stackParser, key, limit, event, hint);
			}
		};
	});
	/**
	* Aggregrate linked errors in an event.
	*/
	const linkedErrorsIntegration = defineIntegration(_linkedErrorsIntegration);
	// src/normalizeStringifyValue.ts
	const HTML_ELEMENT_CONSTRUCTOR_NAME_REGEX = /^HTML(\w*)Element$/;
	/**
	* Browser-specific contributions to `normalize()`'s `stringifyValue`. Plug into
	* `setNormalizeStringifier` from the browser SDK so DOM values get a useful string
	* representation without forcing core to carry the DOM-specific code.
	*
	* Handles:
	* - `window` → `[Window]`
	* - `document` → `[Document]`
	* - `HTMLElement` subclasses → `[HTMLElement: <css-selector-path>]` (via `htmlTreeAsString`)
	*
	* Vue ViewModels and React SyntheticEvents are not handled here — the Vue and React
	* SDKs wrap this function in their `init` and add their own checks on top.
	*/
	function normalizeStringifyValue(value) {
		if (typeof window !== "undefined" && value === window) return "[Window]";
		if (typeof document !== "undefined" && value === document) return "[Document]";
		if (isElement$2(value)) {
			const objName = getConstructorName(value);
			if (HTML_ELEMENT_CONSTRUCTOR_NAME_REGEX.test(objName)) return `[HTMLElement: ${htmlTreeAsString(value)}]`;
		}
	}
	function getConstructorName(value) {
		const prototype = Object.getPrototypeOf(value);
		return prototype?.constructor ? prototype.constructor.name : "null prototype";
	}
	// src/utils/detectBrowserExtension.ts
	/**
	* Returns true if the SDK is running in an embedded browser extension.
	* Stand-alone browser extensions (which do not share the same data as the main browser page) are fine.
	*/
	function checkAndWarnIfIsEmbeddedBrowserExtension() {
		if (_isEmbeddedBrowserExtension()) {
			consoleSandbox(() => {
				console.error("[Sentry] You cannot use Sentry.init() in a browser extension, see: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/");
			});
			return true;
		}
		return false;
	}
	function _isEmbeddedBrowserExtension() {
		if (typeof WINDOW.window === "undefined") return false;
		const _window = WINDOW;
		if (_window.nw) return false;
		if (!(_window["chrome"] || _window["browser"])?.runtime?.id) return false;
		const href = getLocationHref();
		return !(WINDOW === WINDOW.top && /^(?:chrome-extension|moz-extension|ms-browser-extension|safari-web-extension):\/\//.test(href));
	}
	// src/sdk.ts
	/** Get the default integrations for the browser SDK. */
	function getDefaultIntegrations(_options) {
		/**
		* Note: Please make sure this stays in sync with Angular SDK, which re-exports
		* `getDefaultIntegrations` but with an adjusted set of integrations.
		*/
		return [
			eventFiltersIntegration(),
			functionToStringIntegration(),
			conversationIdIntegration(),
			browserApiErrorsIntegration(),
			breadcrumbsIntegration(),
			consoleIntegration(),
			globalHandlersIntegration(),
			linkedErrorsIntegration(),
			dedupeIntegration(),
			httpContextIntegration(),
			cultureContextIntegration(),
			browserSessionIntegration()
		];
	}
	/**
	* The Sentry Browser SDK Client.
	*
	* To use this SDK, call the {@link init} function as early as possible when
	* loading the web page. To set context information or send manual events, use
	* the provided methods.
	*
	* @example
	*
	* ```
	*
	* import { init } from '@sentry/browser';
	*
	* init({
	*   dsn: '__DSN__',
	*   // ...
	* });
	* ```
	*
	* @example
	* ```
	*
	* import { addBreadcrumb } from '@sentry/browser';
	* addBreadcrumb({
	*   message: 'My Breadcrumb',
	*   // ...
	* });
	* ```
	*
	* @example
	*
	* ```
	*
	* import * as Sentry from '@sentry/browser';
	* Sentry.captureMessage('Hello, world!');
	* Sentry.captureException(new Error('Good bye'));
	* Sentry.captureEvent({
	*   message: 'Manual',
	*   stacktrace: [
	*     // ...
	*   ],
	* });
	* ```
	*
	* @see {@link BrowserOptions} for documentation on configuration options.
	*/
	function init(userOptions = {}) {
		const options = captureOptionsSetByUser(userOptions);
		const shouldDisableBecauseIsBrowserExtenstion = !options.skipBrowserExtensionCheck && checkAndWarnIfIsEmbeddedBrowserExtension();
		let defaultIntegrations = options.defaultIntegrations == null ? getDefaultIntegrations(options) : options.defaultIntegrations;
		const integrations = getIntegrationsToSetup({
			integrations: options.integrations,
			defaultIntegrations
		});
		const clientOptions = {
			...options,
			...resolveBrowserTunnelOption(options),
			enabled: shouldDisableBecauseIsBrowserExtenstion ? false : options.enabled,
			stackParser: stackParserFromStackParserOptions(options.stackParser || defaultStackParser),
			integrations,
			transport: options.transport || makeFetchTransport
		};
		setNormalizeStringifier(normalizeStringifyValue);
		return initAndBind(BrowserClient, clientOptions);
	}
	/**
	* This function is here to be API compatible with the loader.
	* @hidden
	*/
	function forceLoad() {}
	/**
	* This function is here to be API compatible with the loader.
	* @hidden
	*/
	function onLoad(callback) {
		callback();
	}
	// src/report-dialog.ts
	/**
	* Present the user with a report dialog.
	*
	* @param options Everything is optional, we try to fetch all info need from the current scope.
	*/
	function showReportDialog(options = {}) {
		const optionalDocument = WINDOW.document;
		const injectionPoint = optionalDocument?.head || optionalDocument?.body;
		if (!injectionPoint) {
			debug$1.error("[showReportDialog] Global document not defined");
			return;
		}
		const scope = getCurrentScope();
		const dsn = getClient()?.getDsn();
		if (!dsn) {
			debug$1.error("[showReportDialog] DSN not configured");
			return;
		}
		const mergedOptions = {
			...options,
			user: {
				...scope.getUser(),
				...options.user
			},
			eventId: options.eventId || lastEventId()
		};
		const { onLoad, onClose, onError } = mergedOptions;
		if (!mergedOptions.eventId) {
			debug$1.error("[showReportDialog] No event ID");
			onError?.(/* @__PURE__ */ new Error("No event ID to show the report dialog for"));
			return;
		}
		const script = WINDOW.document.createElement("script");
		script.async = true;
		script.crossOrigin = "anonymous";
		script.src = getReportDialogEndpoint(dsn, mergedOptions);
		if (onLoad) script.onload = onLoad;
		if (onError) script.onerror = () => {
			onError(/* @__PURE__ */ new Error("Failed to load the report dialog script"));
		};
		if (onClose) {
			const reportDialogClosedMessageHandler = (event) => {
				if (event.data === "__sentry_reportdialog_closed__") try {
					onClose();
				} finally {
					WINDOW.removeEventListener("message", reportDialogClosedMessageHandler);
				}
			};
			WINDOW.addEventListener("message", reportDialogClosedMessageHandler);
			script.addEventListener("error", () => {
				WINDOW.removeEventListener("message", reportDialogClosedMessageHandler);
			});
		}
		injectionPoint.appendChild(script);
	}
	// src/integrations/webVitals.ts
	const WEB_VITALS_INTEGRATION_NAME = "WebVitals";
	/**
	* Captures Core Web Vitals (LCP, CLS, INP) and related pageload vitals.
	*
	* `browserTracingIntegration` auto-registers this integration if no
	* `webVitalsIntegration` is already present, so explicit registration is only
	* needed to customize options or to use it without `browserTracingIntegration`.
	*/
	const webVitalsIntegration = defineIntegration((options = {}) => {
		const { ignore = [], softNavigations = true, bfcacheNavigations = true } = options;
		const ignored = new Set(ignore);
		return {
			name: WEB_VITALS_INTEGRATION_NAME,
			setup(client) {
				const spanStreamingEnabled = hasSpanStreamingEnabled(client);
				const reportSoftNavs = softNavigations && spanStreamingEnabled && supportsSoftNavigations();
				const reportBfcache = bfcacheNavigations && spanStreamingEnabled;
				const perNavigation = reportSoftNavs || reportBfcache;
				if (reportSoftNavs) {
					enableSoftNavigationReporting();
					startSoftNavigationCorrelation(client);
				}
				if (reportBfcache) enableBfcacheReporting();
				const trackClsOnPageloadSpan = !spanStreamingEnabled && !ignored.has("cls");
				const trackLcpOnPageloadSpan = !spanStreamingEnabled && !ignored.has("lcp");
				const finalizeWebVitals = startTrackingWebVitals({
					trackCls: trackClsOnPageloadSpan,
					trackLcp: trackLcpOnPageloadSpan,
					client
				});
				const pageloadSpans = /* @__PURE__ */ new WeakSet();
				client.on("afterStartPageLoadSpan", (span) => {
					pageloadSpans.add(span);
				});
				client.on("spanEnd", (span) => {
					if (!pageloadSpans.delete(span)) return;
					finalizeWebVitals();
					addWebVitalsToSpan(span, {
						recordClsOnPageloadSpan: trackClsOnPageloadSpan,
						recordLcpOnPageloadSpan: trackLcpOnPageloadSpan,
						spanStreamingEnabled
					});
				});
				if (spanStreamingEnabled) {
					if (!ignored.has("lcp")) trackLcpAsSpan(client, perNavigation);
					if (!ignored.has("cls")) trackClsAsSpan(client, perNavigation);
				}
				if (!ignored.has("inp")) trackInpAsSpan(client, perNavigation);
			},
			afterAllSetup() {
				if (!ignored.has("inp")) registerInpInteractionListener();
			}
		};
	});
	// src/tracing/backgroundtab.ts
	/**
	* Add a listener that cancels and finishes a transaction when the global
	* document is hidden.
	*/
	function registerBackgroundTabDetection() {
		if (WINDOW.document) WINDOW.document.addEventListener("visibilitychange", () => {
			const activeSpan = getActiveSpan();
			if (!activeSpan) return;
			const rootSpan = getRootSpan(activeSpan);
			if (WINDOW.document.hidden && rootSpan) {
				const cancelledStatus = "cancelled";
				const { attributes: { [yb]: op }, status } = spanToJSON(rootSpan);
				debug$1.log(`[Tracing] Transaction: ${cancelledStatus} -> since tab moved to the background, op: ${op}`);
				if (status === "ok") rootSpan.setStatus({
					code: 2,
					message: cancelledStatus
				});
				rootSpan.setAttribute(Im, "document.hidden");
				rootSpan.end();
			}
		});
		else debug$1.warn("[Tracing] Could not set up background tab detection due to lack of global document");
	}
	const PREVIOUS_TRACE_KEY = "sentry_previous_trace";
	const PREVIOUS_TRACE_TMP_SPAN_ATTRIBUTE = "sentry.previous_trace";
	/**
	* Takes care of linking traces and applying the (consistent) sampling behavoiour based on the passed options
	* @param options - options for linking traces and consistent trace sampling (@see BrowserTracingOptions)
	* @param client - Sentry client
	*/
	function linkTraces(client, { linkPreviousTrace, consistentTraceSampling }) {
		const useSessionStorage = linkPreviousTrace === "session-storage";
		let inMemoryPreviousTraceInfo = useSessionStorage ? getPreviousTraceFromSessionStorage() : void 0;
		client.on("spanStart", (span) => {
			if (getRootSpan(span) !== span) return;
			const oldPropagationContext = getCurrentScope().getPropagationContext();
			inMemoryPreviousTraceInfo = addPreviousTraceSpanLink(inMemoryPreviousTraceInfo, span, oldPropagationContext);
			if (useSessionStorage) storePreviousTraceInSessionStorage(inMemoryPreviousTraceInfo);
		});
		let isFirstTraceOnPageload = true;
		if (consistentTraceSampling) client.on("beforeSampling", (mutableSamplingContextData) => {
			if (!inMemoryPreviousTraceInfo) return;
			const scope = getCurrentScope();
			const currentPropagationContext = scope.getPropagationContext();
			if (isFirstTraceOnPageload && currentPropagationContext.parentSpanId) {
				isFirstTraceOnPageload = false;
				return;
			}
			scope.setPropagationContext({
				...currentPropagationContext,
				dsc: {
					...currentPropagationContext.dsc,
					sample_rate: String(inMemoryPreviousTraceInfo.sampleRate),
					sampled: String(spanContextSampled(inMemoryPreviousTraceInfo.spanContext))
				},
				sampleRand: inMemoryPreviousTraceInfo.sampleRand
			});
			mutableSamplingContextData.parentSampled = spanContextSampled(inMemoryPreviousTraceInfo.spanContext);
			mutableSamplingContextData.parentSampleRate = inMemoryPreviousTraceInfo.sampleRate;
			mutableSamplingContextData.spanAttributes = {
				...mutableSamplingContextData.spanAttributes,
				[SEMANTIC_ATTRIBUTE_SENTRY_PREVIOUS_TRACE_SAMPLE_RATE]: inMemoryPreviousTraceInfo.sampleRate
			};
		});
	}
	/**
	* Adds a previous_trace span link to the passed span if the passed
	* previousTraceInfo is still valid.
	*
	* @returns the updated previous trace info (based on the current span/trace) to
	* be used on the next call
	*/
	function addPreviousTraceSpanLink(previousTraceInfo, span, oldPropagationContext) {
		const spanJson = spanToJSON(span);
		function getSampleRate() {
			try {
				const oldSampleRate = Number(spanJson.attributes["sentry.sample_rate"] ?? oldPropagationContext.dsc?.sample_rate);
				return Number.isNaN(oldSampleRate) ? 0 : oldSampleRate;
			} catch {
				return 0;
			}
		}
		const updatedPreviousTraceInfo = {
			spanContext: span.spanContext(),
			startTimestamp: spanJson.start_timestamp,
			sampleRate: getSampleRate(),
			sampleRand: oldPropagationContext.sampleRand
		};
		if (!previousTraceInfo) return updatedPreviousTraceInfo;
		const previousTraceSpanCtx = previousTraceInfo.spanContext;
		if (previousTraceSpanCtx.traceId === spanJson.trace_id) return previousTraceInfo;
		if (Date.now() / 1e3 - previousTraceInfo.startTimestamp <= 3600) {
			debug$1.log(`Adding previous_trace \`${JSON.stringify(previousTraceSpanCtx)}\` link to span \`${JSON.stringify({
				op: spanJson.attributes[yb],
				...span.spanContext()
			})}\``);
			span.addLink({
				context: previousTraceSpanCtx,
				attributes: { [ib]: "previous_trace" }
			});
			span.setAttribute(PREVIOUS_TRACE_TMP_SPAN_ATTRIBUTE, `${previousTraceSpanCtx.traceId}-${previousTraceSpanCtx.spanId}-${spanContextSampled(previousTraceSpanCtx) ? 1 : 0}`);
		}
		return updatedPreviousTraceInfo;
	}
	/**
	* Stores @param previousTraceInfo in sessionStorage.
	*/
	function storePreviousTraceInSessionStorage(previousTraceInfo) {
		try {
			WINDOW.sessionStorage.setItem(PREVIOUS_TRACE_KEY, JSON.stringify(previousTraceInfo));
		} catch (e) {
			debug$1.warn("Could not store previous trace in sessionStorage", e);
		}
	}
	/**
	* Retrieves the previous trace from sessionStorage if available.
	*/
	function getPreviousTraceFromSessionStorage() {
		try {
			const previousTraceInfo = WINDOW.sessionStorage?.getItem(PREVIOUS_TRACE_KEY);
			return JSON.parse(previousTraceInfo);
		} catch {
			return;
		}
	}
	/**
	* see {@link import('@sentry/core').spanIsSampled}
	*/
	function spanContextSampled(ctx) {
		return ctx.traceFlags === 1;
	}
	// src/integrations/linkedTraces.ts
	const _linkedTracesIntegration = ((options = {}) => {
		const { storage = "in-memory", consistentTraceSampling = false } = options;
		return {
			name: "LinkedTraces",
			setup(client) {
				if (isBotUserAgent()) return;
				linkTraces(client, {
					linkPreviousTrace: storage,
					consistentTraceSampling
				});
			}
		};
	});
	/**
	* Links each new trace to the previous one, so you can navigate between traces in Sentry.
	*/
	const linkedTracesIntegration = defineIntegration(_linkedTracesIntegration);
	// src/tracing/utils.ts
	/**
	* Checks if the baggage header has Sentry values.
	*/
	function baggageHeaderHasSentryValues(baggageHeader) {
		return baggageHeader.split(",").some((value) => value.trim().startsWith("sentry-"));
	}
	/**
	* Gets the full URL from a given URL string.
	*/
	function getFullURL(url) {
		try {
			return new URL(url, WINDOW.location?.href).href;
		} catch {
			return;
		}
	}
	/**
	* Checks if the entry is a PerformanceResourceTiming.
	*/
	function isPerformanceResourceTiming(entry) {
		return entry.entryType === "resource" && "initiatorType" in entry && typeof entry.nextHopProtocol === "string" && (entry.initiatorType === "fetch" || entry.initiatorType === "xmlhttprequest");
	}
	/**
	* Creates a Headers object from a record of string key-value pairs, and returns undefined if it fails.
	*/
	function createHeadersSafely(headers) {
		try {
			return new Headers(headers);
		} catch {
			return;
		}
	}
	// src/tracing/request.ts
	/**
	* Registers the span creator for fetch requests.
	*/
	function instrumentFetchRequests(client, options) {
		const { enableHTTPTimings = true, onRequestSpanStart, onRequestSpanEnd } = options;
		const { shouldCreateSpan, shouldAttachHeadersWithTargets, spans, propagateTraceparent } = getRequestSpanContext(client, options);
		addFetchInstrumentationHandler((handlerData) => {
			const createdSpan = instrumentFetchRequest(handlerData, shouldCreateSpan, shouldAttachHeadersWithTargets, spans, {
				propagateTraceparent,
				onRequestSpanEnd,
				urlBase: WINDOW.location?.href
			});
			if (createdSpan) {
				const fullUrl = getFullURL(handlerData.fetchData.url);
				const host = fullUrl ? parseUrl(fullUrl).host?.replace(/^.*@/, "") : void 0;
				const sanitizedFullUrl = fullUrl ? stripDataUrlContent(fullUrl) : void 0;
				createdSpan.setAttributes({
					[py]: filterCollectedUrl(sanitizedFullUrl),
					[rg]: host
				});
				if (enableHTTPTimings) addHTTPTimings(createdSpan, client);
				onRequestSpanStart?.(createdSpan, { headers: handlerData.headers });
			}
		});
	}
	/**
	* Registers the span creator for XHR requests.
	*/
	function instrumentXhrRequests(client, options) {
		const { enableHTTPTimings = true, onRequestSpanStart, onRequestSpanEnd } = options;
		const { shouldCreateSpan, shouldAttachHeadersWithTargets, spans, propagateTraceparent } = getRequestSpanContext(client, options);
		addXhrInstrumentationHandler((handlerData) => {
			const createdSpan = xhrCallback(handlerData, shouldCreateSpan, shouldAttachHeadersWithTargets, spans, propagateTraceparent, onRequestSpanEnd);
			if (createdSpan) {
				if (enableHTTPTimings) addHTTPTimings(createdSpan, client);
				onRequestSpanStart?.(createdSpan, { headers: createHeadersSafely(handlerData.xhr.__sentry_xhr_v3__?.request_headers) });
			}
		});
	}
	function getRequestSpanContext(client, { shouldCreateSpanForRequest, tracePropagationTargets }) {
		return {
			shouldCreateSpan: typeof shouldCreateSpanForRequest === "function" ? shouldCreateSpanForRequest : () => true,
			shouldAttachHeadersWithTargets: (url) => shouldAttachHeaders(url, tracePropagationTargets),
			spans: {},
			propagateTraceparent: client.getOptions().propagateTraceparent
		};
	}
	/**
	* The maximum time (ms) to wait for PerformanceResourceTiming data before ending the span.
	* Same approach is used by OTel's browser fetch instrumentation:
	* See {@link https://github.com/open-telemetry/opentelemetry-js/blob/30f94fe99339287b1e4d3c8bb90172c2523f06f4/experimental/packages/opentelemetry-instrumentation-fetch/src/fetch.ts#L352-L372}
	*/
	const HTTP_TIMING_WAIT_MS = 300;
	/**
	* Creates a temporary observer to listen to the next fetch/xhr resourcing timings,
	* so that when timings hit their per-browser limit they don't need to be removed.
	*
	* @param span A span that has yet to be finished, must contain `url.full` on data.
	*/
	function addHTTPTimings(span, client) {
		const url = spanToJSON(span).attributes[py];
		if (!url || typeof url !== "string") return;
		let onEntryFound = () => void setTimeout(unsubscribePerformanceObsever);
		if (hasSpanStreamingEnabled(client)) {
			const originalEnd = span.end.bind(span);
			span.end = (endTimestamp) => {
				const capturedEndTimestamp = endTimestamp ?? timestampInSeconds();
				let isEnded = false;
				const endSpanAndCleanup = () => {
					if (isEnded) return;
					isEnded = true;
					setTimeout(unsubscribePerformanceObsever);
					originalEnd(capturedEndTimestamp);
					clearTimeout(fallbackTimeout);
				};
				onEntryFound = endSpanAndCleanup;
				const fallbackTimeout = setTimeout(endSpanAndCleanup, HTTP_TIMING_WAIT_MS);
			};
		}
		const unsubscribePerformanceObsever = addPerformanceInstrumentationHandler("resource", ({ entries }) => {
			entries.forEach((entry) => {
				if (isPerformanceResourceTiming(entry) && entry.name.endsWith(url)) {
					span.setAttributes(resourceTimingToSpanAttributes(entry));
					onEntryFound();
				}
			});
		});
	}
	/**
	* A function that determines whether to attach tracing headers to a request.
	* We only export this function for testing purposes.
	*/
	function shouldAttachHeaders(targetUrl, tracePropagationTargets) {
		const href = getLocationHref();
		if (!href) {
			const isRelativeSameOriginRequest = !!targetUrl.match(/^\/(?!\/)/);
			if (!tracePropagationTargets) return isRelativeSameOriginRequest;
			else return matchesTracePropagationTargets(targetUrl, tracePropagationTargets);
		} else {
			let resolvedUrl;
			let currentOrigin;
			try {
				resolvedUrl = new URL(targetUrl, href);
				currentOrigin = new URL(href).origin;
			} catch {
				return false;
			}
			const isSameOriginRequest = resolvedUrl.origin === currentOrigin;
			if (!tracePropagationTargets) return isSameOriginRequest;
			else return matchesTracePropagationTargets(resolvedUrl.toString(), tracePropagationTargets) || isSameOriginRequest && matchesTracePropagationTargets(resolvedUrl.pathname, tracePropagationTargets);
		}
	}
	/**
	* Create and track xhr request spans
	*
	* @returns Span if a span was created, otherwise void.
	*/
	function xhrCallback(handlerData, shouldCreateSpan, shouldAttachHeaders, spans, propagateTraceparent, onRequestSpanEnd) {
		const xhr = handlerData.xhr;
		const sentryXhrData = xhr?.[SENTRY_XHR_DATA_KEY];
		if (!xhr || xhr.__sentry_own_request__ || !sentryXhrData) return;
		const { url, method } = sentryXhrData;
		const shouldCreateSpanResult = hasSpansEnabled() && shouldCreateSpan(url);
		if (handlerData.endTimestamp) {
			const spanId = xhr.__sentry_xhr_span_id__;
			if (!spanId) return;
			const span = spans[spanId];
			if (span) {
				if (shouldCreateSpanResult && sentryXhrData.status_code !== void 0) {
					setHttpStatus(span, sentryXhrData.status_code);
					span.end();
					onRequestSpanEnd?.(span, {
						headers: createHeadersSafely(parseXhrResponseHeaders(xhr)),
						error: handlerData.error
					});
				}
				delete spans[spanId];
			}
			return;
		}
		const fullUrl = getFullURL(url);
		const parsedUrl = fullUrl ? parseUrl(fullUrl) : parseUrl(url);
		const sanitizedFullUrl = fullUrl ? stripDataUrlContent(fullUrl) : void 0;
		const urlForSpanName = stripDataUrlContent(stripUrlQueryAndFragment(url));
		const client = getClient();
		const hasParent = !!getActiveSpan();
		const shouldEmitSpan = hasParent || !!client && hasSpanStreamingEnabled(client);
		const host = parsedUrl?.host?.replace(/^.*@/, "");
		const domain = getUrlDomain(fullUrl || url);
		const streamedName = domain ? `${method} ${domain}` : method;
		const span = shouldCreateSpanResult && shouldEmitSpan ? startInactiveSpan({
			name: !!client && hasSpanStreamingEnabled(client) ? streamedName : `${method} ${urlForSpanName}`,
			attributes: {
				type: "xhr",
				[ul]: method,
				[py]: filterCollectedUrl(sanitizedFullUrl),
				[rg]: host,
				[oy]: domain,
				[_b]: "auto.http.browser",
				[yb]: CE,
				[yy]: filterCollectedUrlQuery(getUrlQuery(parsedUrl?.search)),
				[ly]: getUrlFragment(parsedUrl?.hash)
			}
		}) : new SentryNonRecordingSpan();
		const spanForTraceHeaders = spanIsIgnored(span) && hasParent ? void 0 : span;
		if (shouldCreateSpanResult && !shouldEmitSpan) client?.recordDroppedEvent("no_parent_span", "span");
		xhr.__sentry_xhr_span_id__ = span.spanContext().spanId;
		spans[xhr.__sentry_xhr_span_id__] = span;
		if (shouldAttachHeaders(url)) addTracingHeadersToXhrRequest(xhr, hasSpansEnabled() && shouldEmitSpan ? spanForTraceHeaders : void 0, propagateTraceparent);
		if (client) client.emit("beforeOutgoingRequestSpan", span, handlerData);
		return span;
	}
	function addTracingHeadersToXhrRequest(xhr, span, propagateTraceparent) {
		const { "sentry-trace": sentryTrace, baggage, traceparent } = getTraceData({
			span,
			propagateTraceparent
		});
		if (sentryTrace) setHeaderOnXhr(xhr, sentryTrace, baggage, traceparent);
	}
	function setHeaderOnXhr(xhr, sentryTraceHeader, sentryBaggageHeader, traceparentHeader) {
		const originalHeaders = xhr.__sentry_xhr_v3__?.request_headers;
		if (originalHeaders?.["sentry-trace"] || !xhr.setRequestHeader) return;
		try {
			xhr.setRequestHeader("sentry-trace", sentryTraceHeader);
			if (traceparentHeader && !originalHeaders?.["traceparent"]) xhr.setRequestHeader("traceparent", traceparentHeader);
			if (sentryBaggageHeader) {
				const originalBaggageHeader = originalHeaders?.["baggage"];
				if (!originalBaggageHeader || !baggageHeaderHasSentryValues(originalBaggageHeader)) xhr.setRequestHeader("baggage", sentryBaggageHeader);
			}
		} catch {}
	}
	// src/integrations/fetchTracing.ts
	const INTEGRATION_NAME$1 = "FetchTracing";
	const _fetchTracingIntegration = ((options = {}) => {
		return {
			name: INTEGRATION_NAME$1,
			setup(client) {
				if (isBotUserAgent()) return;
				instrumentFetchRequests(client, {
					...options,
					tracePropagationTargets: client.getOptions().tracePropagationTargets
				});
			}
		};
	});
	/**
	* Creates spans for outgoing fetch requests and attaches trace propagation headers to them.
	*/
	const fetchTracingIntegration = defineIntegration(_fetchTracingIntegration);
	// src/integrations/xhrTracing.ts
	const INTEGRATION_NAME = "XhrTracing";
	const _xhrTracingIntegration = ((options = {}) => {
		return {
			name: INTEGRATION_NAME,
			setup(client) {
				if (isBotUserAgent()) return;
				instrumentXhrRequests(client, {
					...options,
					tracePropagationTargets: client.getOptions().tracePropagationTargets
				});
			}
		};
	});
	/**
	* Creates spans for outgoing XHR requests and attaches trace propagation headers to them.
	*/
	const xhrTracingIntegration = defineIntegration(_xhrTracingIntegration);
	// src/tracing/browserTracingIntegration.ts
	const BROWSER_TRACING_INTEGRATION_ID = "BrowserTracing";
	const DEFAULT_BROWSER_TRACING_OPTIONS = {
		...TRACING_DEFAULTS,
		instrumentNavigation: true,
		instrumentBfcacheRestore: true,
		instrumentPageLoad: true,
		markBackgroundSpan: true,
		detectRedirects: true,
		enableReportPageLoaded: false
	};
	/**
	* Defaults for the options that `browserTracingIntegration` forwards to the integrations it registers.
	* They are spread rather than destructured, so an explicit `undefined` still overrides them.
	*/
	const DEFAULT_FORWARDED_OPTIONS = {
		enableInp: true,
		enableLongTask: true,
		enableLongAnimationFrame: true,
		traceFetch: true,
		traceXHR: true,
		linkPreviousTrace: "in-memory"
	};
	/**
	* The Browser Tracing integration automatically instruments browser pageload/navigation
	* actions as transactions, and captures requests, metrics and errors as spans.
	*
	* The integration can be configured with a variety of options, and can be extended to use
	* any routing library.
	*
	* We explicitly export the proper type here, as this has to be extended in some cases.
	*/
	const browserTracingIntegration = ((options = {}) => {
		if ("enableElementTiming" in options) consoleSandbox(() => {
			console.warn("[Sentry] `enableElementTiming` is deprecated and no longer has any effect. Use the standalone `elementTimingIntegration` instead.");
		});
		const { enableInp, webVitals, enableLongTask, enableLongAnimationFrame, ignoreResourceSpans, traceFetch, traceXHR, shouldCreateSpanForRequest, enableHTTPTimings, onRequestSpanStart, onRequestSpanEnd, linkPreviousTrace, consistentTraceSampling } = {
			...DEFAULT_FORWARDED_OPTIONS,
			...options
		};
		return _browserTracingIntegration(options, (client) => {
			if (!client.addIntegration) return;
			const ignore = webVitals?.ignore ?? [];
			client.addIntegration(webVitalsIntegration({
				...webVitals,
				ignore: enableInp || ignore.includes("inp") ? ignore : [...ignore, "inp"]
			}));
			if (enableLongTask || enableLongAnimationFrame) client.addIntegration(longTasksIntegration({
				enableLongTask,
				enableLongAnimationFrame
			}));
			client.addIntegration(resourcesIntegration({ ignoreResourceSpans }));
			const requestOptions = {
				shouldCreateSpanForRequest,
				enableHTTPTimings,
				onRequestSpanStart,
				onRequestSpanEnd
			};
			if (traceFetch) client.addIntegration(fetchTracingIntegration(requestOptions));
			if (traceXHR) client.addIntegration(xhrTracingIntegration(requestOptions));
			if (linkPreviousTrace !== "off") client.addIntegration(linkedTracesIntegration({
				storage: linkPreviousTrace,
				consistentTraceSampling
			}));
		});
	});
	/**
	* The pageload and navigation spans of `browserTracingIntegration`, without the features it registers as
	* standalone integrations (such as `webVitalsIntegration`).
	*
	* Use it instead of `browserTracingIntegration` to only bundle the integrations you add yourself.
	*/
	const browserTracingCoreIntegration = ((options = {}) => _browserTracingIntegration(options));
	function _browserTracingIntegration(options, addDefaultIntegrations) {
		/**
		* This is just a small wrapper that makes `document` optional.
		* We want to be extra-safe and always check that this exists, to ensure weird environments do not blow up.
		*/
		const optionalWindowDocument = WINDOW.document;
		const { beforeStartSpan, idleTimeout, finalTimeout, childSpanTimeout, markBackgroundSpan, instrumentPageLoad, instrumentNavigation, instrumentBfcacheRestore, detectRedirects, enableReportPageLoaded } = {
			...DEFAULT_BROWSER_TRACING_OPTIONS,
			...options
		};
		const _isBot = isBotUserAgent();
		let lastInteractionTimestamp;
		let _pageloadSpan;
		/** Create routing idle transaction. */
		function _createRouteSpan(client, startSpanOptions, makeActive = true, url) {
			const isPageloadSpan = startSpanOptions.op === "pageload";
			const initialSpanName = startSpanOptions.name;
			const finalStartSpanOptions = beforeStartSpan ? beforeStartSpan(startSpanOptions) : startSpanOptions;
			const urlObject = parseStringToURLObject(url || getLocationHref());
			const attributes = {
				[cy]: urlObject?.pathname,
				...urlObject && !isURLObjectRelative(urlObject) && { ["url.full"]: filterCollectedUrl(urlObject.href) },
				...finalStartSpanOptions.attributes
			};
			if (initialSpanName !== finalStartSpanOptions.name) attributes[qb$1] = "custom";
			finalStartSpanOptions.attributes = attributes;
			if (!makeActive) {
				const now = dateTimestampInSeconds();
				startInactiveSpan({
					...finalStartSpanOptions,
					startTime: now
				}).end(now);
				return;
			}
			const idleSpan = startIdleSpan(finalStartSpanOptions, {
				idleTimeout,
				finalTimeout,
				childSpanTimeout,
				disableAutoFinish: isPageloadSpan,
				trimIdleSpanEndTimestamp: !enableReportPageLoaded
			});
			if (isPageloadSpan && enableReportPageLoaded) _pageloadSpan = idleSpan;
			setActiveIdleSpan(client, idleSpan);
			function emitFinish() {
				if (optionalWindowDocument && ["interactive", "complete"].includes(optionalWindowDocument.readyState)) {
					client.emit("idleSpanEnableAutoFinish", idleSpan);
					optionalWindowDocument.removeEventListener("readystatechange", emitFinish);
				}
			}
			if (isPageloadSpan && !enableReportPageLoaded && optionalWindowDocument) {
				optionalWindowDocument.addEventListener("readystatechange", emitFinish);
				emitFinish();
			}
		}
		return {
			name: BROWSER_TRACING_INTEGRATION_ID,
			setup(client) {
				if (_isBot) {
					debug$1.log("[Tracing] Skipping browserTracingIntegration setup for bot user agent.");
					return;
				}
				registerSpanErrorInstrumentation();
				if (detectRedirects && optionalWindowDocument) {
					const interactionHandler = () => {
						lastInteractionTimestamp = timestampInSeconds();
					};
					addEventListener("click", interactionHandler, { capture: true });
					addEventListener("keydown", interactionHandler, {
						capture: true,
						passive: true
					});
				}
				function maybeEndActiveSpan() {
					const activeSpan = getActiveIdleSpan(client);
					if (activeSpan && !spanToJSON(activeSpan).end_timestamp) {
						debug$1.log(`[Tracing] Finishing current active span with op: ${spanToJSON(activeSpan).attributes["sentry.op"]}`);
						activeSpan.setAttribute(Zm, "cancelled");
						activeSpan.end();
					}
				}
				client.on("beforeIdleSpanEnd", (span) => {
					if (getActiveIdleSpan(client) !== span) return;
					addPerformanceEntries(span, { spanStreamingEnabled: hasSpanStreamingEnabled(client) });
					setActiveIdleSpan(client, void 0);
					const scope = getCurrentScope();
					const oldPropagationContext = scope.getPropagationContext();
					scope.setPropagationContext({
						...oldPropagationContext,
						traceId: span.spanContext().traceId,
						sampled: spanIsSampled(span),
						dsc: getDynamicSamplingContextFromSpan(span)
					});
					if (_pageloadSpan === span) _pageloadSpan = void 0;
				});
				client.on("startNavigationSpan", (startSpanOptions, navigationOptions) => {
					if (getClient() !== client) return;
					if (navigationOptions?.isRedirect) {
						debug$1.warn("[Tracing] Detected redirect, navigation span will not be the root span, but a child span.");
						_createRouteSpan(client, {
							op: _$1,
							...startSpanOptions
						}, false, navigationOptions.url);
						return;
					}
					lastInteractionTimestamp = void 0;
					maybeEndActiveSpan();
					const scope = getCurrentScope();
					scope.setPropagationContext({
						traceId: generateTraceId(),
						sampleRand: Math.random(),
						propagationSpanId: hasSpansEnabled() ? void 0 : generateSpanId()
					});
					scope.setSDKProcessingMetadata({ normalizedRequest: void 0 });
					_createRouteSpan(client, {
						op: E$1,
						...startSpanOptions,
						parentSpan: null
					}, true, navigationOptions?.url);
				});
				client.on("startPageLoadSpan", (startSpanOptions, traceOptions = {}) => {
					if (getClient() !== client) return;
					maybeEndActiveSpan();
					const propagationContext = propagationContextFromHeaders(traceOptions.sentryTrace || getMetaContent("sentry-trace") || getServerTiming("sentry-trace"), traceOptions.baggage || getMetaContent("baggage") || getServerTiming("baggage"));
					const scope = getCurrentScope();
					scope.setPropagationContext(propagationContext);
					if (!hasSpansEnabled()) scope.getPropagationContext().propagationSpanId = generateSpanId();
					const requestData = getHttpRequestData(client);
					scope.setSDKProcessingMetadata({ normalizedRequest: {
						...requestData,
						url: filterCollectedUrl(requestData.url, client)
					} });
					_createRouteSpan(client, {
						op: e$1,
						...startSpanOptions
					});
				});
				client.on("endPageloadSpan", () => {
					if (enableReportPageLoaded && _pageloadSpan) {
						_pageloadSpan.setAttribute(Zm, "reportPageLoaded");
						_pageloadSpan.end();
					}
				});
				WINDOW.addEventListener?.("pagehide", () => {
					const activeSpan = getActiveIdleSpan(client);
					if (activeSpan && !spanToJSON(activeSpan).end_timestamp) {
						activeSpan.setAttribute(Zm, "documentHidden");
						activeSpan.end();
					}
					client.flush();
				});
			},
			afterAllSetup(client) {
				if (_isBot) return;
				_INTERNAL_ensureBrowserSpanStreaming(client);
				addDefaultIntegrations?.(client);
				let startingUrl = getLocationHref();
				if (WINDOW.location) {
					if (instrumentPageLoad) startBrowserTracingPageLoadSpan(client, {
						name: hasSpanStreamingEnabled(client) ? PAGELOAD_SPAN_NAME_FALLBACK : WINDOW.location.pathname,
						attributes: {
							[qb$1]: "url",
							[_b]: "auto.pageload.browser"
						}
					});
					if (instrumentNavigation) addHistoryInstrumentationHandler(({ to, from }) => {
						/**
						* This early return is there to account for some cases where a navigation transaction starts right after
						* long-running pageload. We make sure that if `from` is undefined and a valid `startingURL` exists, we don't
						* create an uneccessary navigation transaction.
						*
						* This was hard to duplicate, but this behavior stopped as soon as this fix was applied. This issue might also
						* only be caused in certain development environments where the usage of a hot module reloader is causing
						* errors.
						*/
						if (from === void 0 && startingUrl !== void 0 && startingUrl.indexOf(to) !== -1) {
							startingUrl = void 0;
							return;
						}
						startingUrl = void 0;
						const parsed = parseStringToURLObject(to);
						const activeSpan = getActiveIdleSpan(client);
						const navigationIsRedirect = activeSpan && detectRedirects && isRedirect(activeSpan, lastInteractionTimestamp);
						startBrowserTracingNavigationSpan(client, {
							name: hasSpanStreamingEnabled(client) ? NAVIGATION_SPAN_NAME_FALLBACK : parsed?.pathname || WINDOW.location.pathname,
							attributes: {
								[qb$1]: "url",
								[_b]: "auto.navigation.browser"
							}
						}, {
							url: to,
							isRedirect: navigationIsRedirect
						});
					});
					if (instrumentBfcacheRestore) WINDOW.addEventListener?.("pageshow", (event) => {
						if (!event.persisted) return;
						startingUrl = void 0;
						startBrowserTracingNavigationSpan(client, {
							name: hasSpanStreamingEnabled(client) ? NAVIGATION_SPAN_NAME_FALLBACK : WINDOW.location?.pathname || "/",
							attributes: {
								[qb$1]: "url",
								[_b]: "auto.navigation.browser.bfcache",
								[$t]: "back-forward-cache"
							}
						}, { url: WINDOW.location?.href });
					});
				}
				if (markBackgroundSpan) registerBackgroundTabDetection();
			}
		};
	}
	/**
	* Manually start a page load span.
	* This will only do something if a browser tracing integration integration has been setup.
	*
	* If you provide a custom `traceOptions` object, it will be used to continue the trace
	* instead of the default behavior, which is to look it up on the <meta> tags.
	*/
	function startBrowserTracingPageLoadSpan(client, spanOptions, traceOptions) {
		const isFallbackSpanName = spanOptions.name === PAGELOAD_SPAN_NAME_FALLBACK;
		getCurrentScope().setTransactionName(isFallbackSpanName ? WINDOW.location?.pathname : spanOptions.name);
		const timeOrigin = browserPerformanceTimeOrigin();
		const pageloadSpanOptions = {
			...spanOptions,
			startTime: spanOptions.startTime ?? (timeOrigin ? timeOrigin / 1e3 : void 0)
		};
		client.emit("startPageLoadSpan", pageloadSpanOptions, traceOptions);
		const pageloadSpan = getActiveIdleSpan(client);
		if (pageloadSpan) client.emit("afterStartPageLoadSpan", pageloadSpan);
		return pageloadSpan;
	}
	/**
	* Manually start a navigation span.
	* This will only do something if a browser tracing integration has been setup.
	*/
	function startBrowserTracingNavigationSpan(client, spanOptions, options) {
		const { url, isRedirect } = options || {};
		client.emit("beforeStartNavigationSpan", spanOptions, {
			isRedirect,
			url
		});
		client.emit("startNavigationSpan", spanOptions, {
			isRedirect,
			url
		});
		const scope = getCurrentScope();
		scope.setTransactionName(spanOptions.name === "Navigation" ? url && parseStringToURLObject(url)?.pathname || WINDOW.location?.pathname : spanOptions.name);
		if (url && !isRedirect) scope.setSDKProcessingMetadata({ normalizedRequest: {
			...getHttpRequestData(client),
			url: filterCollectedUrl(url, client)
		} });
		return getActiveIdleSpan(client);
	}
	/** Returns the value of a meta tag */
	function getMetaContent(metaName) {
		return (WINDOW.document?.querySelector(`meta[name=${metaName}]`))?.getAttribute("content") || void 0;
	}
	/** Returns the description of a server timing entry */
	function getServerTiming(name) {
		return ((WINDOW.performance?.getEntriesByType?.("navigation")[0])?.serverTiming?.find((entry) => entry.name === name))?.description;
	}
	const ACTIVE_IDLE_SPAN_PROPERTY = "_sentry_idleSpan";
	function getActiveIdleSpan(client) {
		return client[ACTIVE_IDLE_SPAN_PROPERTY];
	}
	function setActiveIdleSpan(client, span) {
		addNonEnumerableProperty(client, ACTIVE_IDLE_SPAN_PROPERTY, span);
	}
	const REDIRECT_THRESHOLD = 1.5;
	function isRedirect(activeSpan, lastInteractionTimestamp) {
		const spanData = spanToJSON(activeSpan);
		const now = dateTimestampInSeconds();
		if (now - spanData.start_timestamp > REDIRECT_THRESHOLD) return false;
		if (lastInteractionTimestamp && now - lastInteractionTimestamp <= REDIRECT_THRESHOLD) return false;
		return true;
	}
	// src/tracing/setActiveSpan.ts
	/**
	* Sets an inactive span active on the current scope.
	*
	* This is useful in browser applications, if you want to create a span that cannot be finished
	* within its callback. Any spans started while the given span is active, will be children of the span.
	*
	* If there already was an active span on the scope prior to calling this function, it is replaced
	* with the given span and restored after the span ended. Otherwise, the span will simply be
	* removed, resulting in no active span on the scope.
	*
	* IMPORTANT: This function can ONLY be used in the browser! Calling this function in a server
	* environment (for example in a server-side rendered component) will result in undefined behaviour
	* and is not supported.
	* You MUST call `span.end()` manually, otherwise the span will never be finished.
	*
	* @example
	* ```js
	* let checkoutSpan;
	*
	* on('checkoutStarted', () => {
	*  checkoutSpan = Sentry.startInactiveSpan({ name: 'checkout-flow' });
	*  Sentry.setActiveSpanInBrowser(checkoutSpan);
	* })
	*
	* // during this time, any spans started will be children of `checkoutSpan`:
	* Sentry.startSpan({ name: 'checkout-step-1' }, () => {
	*  // ... `
	* })
	*
	* on('checkoutCompleted', () => {
	*  checkoutSpan?.end();
	* })
	* ```
	*
	* @param span - the span to set active
	*/
	function setActiveSpanInBrowser(span) {
		const maybePreviousActiveSpan = getActiveSpan();
		if (maybePreviousActiveSpan === span) return;
		const scope = getCurrentScope();
		span.end = new Proxy(span.end, { apply(target, thisArg, args) {
			_setSpanForScope(scope, maybePreviousActiveSpan);
			return Reflect.apply(target, thisArg, args);
		} });
		_setSpanForScope(scope, span);
	}
	// src/tracing/reportPageLoaded.ts
	/**
	* Manually report the end of the page load, resulting in the SDK ending the pageload span.
	* This only works if {@link BrowserTracingOptions.enableReportPageLoaded} is set to `true`.
	* Otherwise, the pageload span will end itself based on the {@link BrowserTracingOptions.finalTimeout},
	* {@link BrowserTracingOptions.idleTimeout} and {@link BrowserTracingOptions.childSpanTimeout}.
	*
	* @param client - The client to use. If not provided, the global client will be used.
	*/
	function reportPageLoaded(client = getClient()) {
		client?.emit("endPageloadSpan");
	}
	// src/integrations/fetchStreamPerformance.ts
	const responseToStreamSpan = /* @__PURE__ */ new WeakMap();
	const responseToFallbackTimeout = /* @__PURE__ */ new WeakMap();
	const STREAM_RESOLVE_FALLBACK_MS = 9e4;
	const STREAMING_CONTENT_TYPES = [
		"text/event-stream",
		"application/x-ndjson",
		"application/stream+json"
	];
	/**
	* Tracks streamed fetch response bodies by creating an `http.client.stream` sibling span.
	*
	* The regular `http.client` span ends when response headers arrive. This integration adds
	* a span that starts at header arrival and ends when the body fully resolves:
	*
	* ```
	* --------- pageload --------------------------------
	*     -- http.client --
	*                       -- http.client.stream -------
	* ```
	*/
	const fetchStreamPerformanceIntegration = defineIntegration(() => {
		return {
			name: "FetchStreamPerformance",
			setup(client) {
				addFetchEndInstrumentationHandler((handlerData) => {
					if (handlerData.response) {
						const streamSpan = responseToStreamSpan.get(handlerData.response);
						if (streamSpan && handlerData.endTimestamp) {
							streamSpan.end(handlerData.endTimestamp);
							const fallbackTimeout = responseToFallbackTimeout.get(handlerData.response);
							if (fallbackTimeout) clearTimeout(fallbackTimeout);
						}
					}
				});
				addFetchInstrumentationHandler((handlerData) => {
					if (handlerData.endTimestamp && handlerData.response) {
						const contentType = handlerData.response.headers?.get("content-type") || "";
						if (handlerData.response.headers?.get("content-length") || !STREAMING_CONTENT_TYPES.some((t) => contentType.startsWith(t))) return;
						const url = handlerData.fetchData?.url || "";
						const method = handlerData.fetchData?.method || "GET";
						const parsedUrl = parseStringToURLObject(url);
						const sanitizedUrl = url.startsWith("data:") ? stripDataUrlContent(url) : parsedUrl ? getSanitizedUrlStringFromUrlObject(parsedUrl) : url;
						const domain = getUrlDomain(url, WINDOW.location?.href);
						const streamedName = domain ? `${method} ${domain}` : method;
						const streamSpan = startInactiveSpan({
							name: hasSpanStreamingEnabled(client) ? streamedName : `${method} ${sanitizedUrl}`,
							startTime: handlerData.endTimestamp,
							attributes: {
								[py]: filterCollectedUrl(stripDataUrlContent(url)),
								[oy]: domain,
								[ul]: method,
								type: "fetch",
								[yb]: nE,
								[_b]: "auto.http.browser.stream"
							}
						});
						responseToStreamSpan.set(handlerData.response, streamSpan);
						const fallbackTimeout = setTimeout(() => {
							if (streamSpan.isRecording()) streamSpan.end();
						}, STREAM_RESOLVE_FALLBACK_MS);
						responseToFallbackTimeout.set(handlerData.response, fallbackTimeout);
					}
				});
			}
		};
	});
	// ../replay-internal/build/npm/esm/index.js
	const Ob = "sentry.replay_id";
	const qb = "sentry.segment.name.source";
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
	function setTimeout$1(...rest) {
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
			const timer = setTimeout$1(() => {
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
			setTimeout$1(listener, 0);
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
		const timer = setTimeout$1(() => {
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
	const cachedImplementations = {};
	function getImplementation(name) {
		const cached = cachedImplementations[name];
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
						cachedImplementations[name] = windowImpl;
						return windowImpl(...args);
					}
				};
			}
			document2.head.removeChild(sandbox);
		} catch (e) {}
		return cachedImplementations[name] = impl;
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
	for (var i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
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
	function getEventTarget(event) {
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
			const target = getEventTarget(evt);
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
				const target = getEventTarget(event);
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
			const target = getEventTarget(evt);
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
			let target = getEventTarget(event);
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
			const target = getEventTarget(event);
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
	var n;
	(function(t2) {
		t2[t2.NotStarted = 0] = "NotStarted", t2[t2.Running = 1] = "Running", t2[t2.Stopped = 2] = "Stopped";
	})(n || (n = {}));
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
			this._checkClickTimeout = setTimeout$3(() => this._checkClicks(), 1e3);
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
	var worker_default = "var e=Uint8Array,t=Uint16Array,n=Int32Array,r=new e([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new e([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new e([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=function(e,r){for(var i=new t(31),a=0;a<31;++a)i[a]=r+=1<<e[a-1];for(var o=new n(i[30]),a=1;a<30;++a)for(var s=i[a];s<i[a+1];++s)o[s]=s-i[a]<<5|a;return{b:i,r:o}},s=o(r,2),c=s.b,l=s.r;c[28]=258,l[258]=28;for(var u=o(i,0).r,d=new t(32768),f=0;f<32768;++f){var p=(f&43690)>>1|(f&21845)<<1;p=(p&52428)>>2|(p&13107)<<2,p=(p&61680)>>4|(p&3855)<<4,d[f]=((p&65280)>>8|(p&255)<<8)>>1}for(var m=(function(e,n,r){for(var i=e.length,a=0,o=new t(n);a<i;++a)e[a]&&++o[e[a]-1];var s=new t(n);for(a=1;a<n;++a)s[a]=s[a-1]+o[a-1]<<1;var c;if(r){c=new t(1<<n);var l=15-n;for(a=0;a<i;++a)if(e[a])for(var u=a<<4|e[a],f=n-e[a],p=s[e[a]-1]++<<f,m=p|(1<<f)-1;p<=m;++p)c[d[p]>>l]=u}else for(c=new t(i),a=0;a<i;++a)e[a]&&(c[a]=d[s[e[a]-1]++]>>15-e[a]);return c}),h=new e(288),f=0;f<144;++f)h[f]=8;for(var f=144;f<256;++f)h[f]=9;for(var f=256;f<280;++f)h[f]=7;for(var f=280;f<288;++f)h[f]=8;for(var g=new e(32),f=0;f<32;++f)g[f]=5;var _=m(h,9,0),v=m(g,5,0),y=function(e){return(e+7)/8|0},b=function(t,n,r){return(n==null||n<0)&&(n=0),(r==null||r>t.length)&&(r=t.length),new e(t.subarray(n,r))},x=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],S=function(e,t,n){var r=Error(t||x[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,S),!n)throw r;return r},C=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},w=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},T=function(n,r){for(var i=[],a=0;a<n.length;++a)n[a]&&i.push({s:a,f:n[a]});var o=i.length,s=i.slice();if(!o)return{t:k,l:0};if(o==1){var c=new e(i[0].s+1);return c[i[0].s]=1,{t:c,l:1}}i.sort(function(e,t){return e.f-t.f}),i.push({s:-1,f:25001});var l=i[0],u=i[1],d=0,f=1,p=2;for(i[0]={s:-1,f:l.f+u.f,l,r:u};f!=o-1;)l=i[i[d].f<i[p].f?d++:p++],u=i[d!=f&&i[d].f<i[p].f?d++:p++],i[f++]={s:-1,f:l.f+u.f,l,r:u};for(var m=s[0].s,a=1;a<o;++a)s[a].s>m&&(m=s[a].s);var h=new t(m+1),g=E(i[f-1],h,0);if(g>r){var a=0,_=0,v=g-r,y=1<<v;for(s.sort(function(e,t){return h[t.s]-h[e.s]||e.f-t.f});a<o;++a){var b=s[a].s;if(h[b]>r)_+=y-(1<<g-h[b]),h[b]=r;else break}for(_>>=v;_>0;){var x=s[a].s;h[x]<r?_-=1<<r-h[x]++-1:++a}for(;a>=0&&_;--a){var S=s[a].s;h[S]==r&&(--h[S],++_)}g=r}return{t:new e(h),l:g}},E=function(e,t,n){return e.s==-1?Math.max(E(e.l,t,n+1),E(e.r,t,n+1)):t[e.s]=n},ee=function(e){for(var n=e.length;n&&!e[--n];);for(var r=new t(++n),i=0,a=e[0],o=1,s=function(e){r[i++]=e},c=1;c<=n;++c)if(e[c]==a&&c!=n)++o;else{if(!a&&o>2){for(;o>138;o-=138)s(32754);o>2&&(s(o>10?o-11<<5|28690:o-3<<5|12305),o=0)}else if(o>3){for(s(a),--o;o>6;o-=6)s(8304);o>2&&(s(o-3<<5|8208),o=0)}for(;o--;)s(a);o=1,a=e[c]}return{c:r.subarray(0,i),n}},D=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},te=function(e,t,n){var r=n.length,i=y(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},O=function(e,n,o,s,c,l,u,d,f,p,y){C(n,y++,o),++c[256];for(var b=T(c,15),x=b.t,S=b.l,E=T(l,15),O=E.t,ne=E.l,k=ee(x),A=k.c,j=k.n,M=ee(O),N=M.c,P=M.n,F=new t(19),I=0;I<A.length;++I)++F[A[I]&31];for(var I=0;I<N.length;++I)++F[N[I]&31];for(var L=T(F,7),R=L.t,z=L.l,B=19;B>4&&!R[a[B-1]];--B);var V=p+5<<3,H=D(c,h)+D(l,g)+u,U=D(c,x)+D(l,O)+u+14+3*B+D(F,R)+2*F[16]+3*F[17]+7*F[18];if(f>=0&&V<=H&&V<=U)return te(n,y,e.subarray(f,f+p));var W,G,K,q;if(C(n,y,1+(U<H)),y+=2,U<H){W=m(x,S,0),G=x,K=m(O,ne,0),q=O;var re=m(R,z,0);C(n,y,j-257),C(n,y+5,P-1),C(n,y+10,B-4),y+=14;for(var I=0;I<B;++I)C(n,y+3*I,R[a[I]]);y+=3*B;for(var J=[A,N],Y=0;Y<2;++Y)for(var X=J[Y],I=0;I<X.length;++I){var Z=X[I]&31;C(n,y,re[Z]),y+=R[Z],Z>15&&(C(n,y,X[I]>>5&127),y+=X[I]>>12)}}else W=_,G=h,K=v,q=g;for(var I=0;I<d;++I){var Q=s[I];if(Q>255){var Z=Q>>18&31;w(n,y,W[Z+257]),y+=G[Z+257],Z>7&&(C(n,y,Q>>23&31),y+=r[Z]);var $=Q&31;w(n,y,K[$]),y+=q[$],$>3&&(w(n,y,Q>>5&8191),y+=i[$])}else w(n,y,W[Q]),y+=G[Q]}return w(n,y,W[256]),y+G[256]},ne=new n([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),k=new e(0),A=function(a,o,s,c,d,f){var p=f.z||a.length,m=new e(c+p+5*(1+Math.ceil(p/7e3))+d),h=m.subarray(c,m.length-d),g=f.l,_=(f.r||0)&7;if(o){_&&(h[0]=f.r>>3);for(var v=ne[o-1],x=v>>13,S=v&8191,C=(1<<s)-1,w=f.p||new t(32768),T=f.h||new t(C+1),E=Math.ceil(s/3),ee=2*E,D=function(e){return(a[e]^a[e+1]<<E^a[e+2]<<ee)&C},k=new n(25e3),A=new t(288),j=new t(32),M=0,N=0,P=f.i||0,F=0,I=f.w||0,L=0;P+2<p;++P){var R=D(P),z=P&32767,B=T[R];if(w[z]=B,T[R]=z,I<=P){var V=p-P;if((M>7e3||F>24576)&&(V>423||!g)){_=O(a,h,0,k,A,j,N,F,L,P-L,_),F=M=N=0,L=P;for(var H=0;H<286;++H)A[H]=0;for(var H=0;H<30;++H)j[H]=0}var U=2,W=0,G=S,K=z-B&32767;if(V>2&&R==D(P-K))for(var q=Math.min(x,V)-1,re=Math.min(32767,P),J=Math.min(258,V);K<=re&&--G&&z!=B;){if(a[P+U]==a[P+U-K]){for(var Y=0;Y<J&&a[P+Y]==a[P+Y-K];++Y);if(Y>U){if(U=Y,W=K,Y>q)break;for(var X=Math.min(K,Y-2),Z=0,H=0;H<X;++H){var Q=P-K+H&32767,$=Q-w[Q]&32767;$>Z&&(Z=$,B=Q)}}}z=B,B=w[z],K+=z-B&32767}if(W){k[F++]=268435456|l[U]<<18|u[W];var ie=l[U]&31,ae=u[W]&31;N+=r[ie]+i[ae],++A[257+ie],++j[ae],I=P+U,++M}else k[F++]=a[P],++A[a[P]]}}for(P=Math.max(P,I);P<p;++P)k[F++]=a[P],++A[a[P]];_=O(a,h,g,k,A,j,N,F,L,P-L,_),g||(f.r=_&7|h[_/8|0]<<3,_-=7,f.h=T,f.p=w,f.i=P,f.w=I)}else{for(var P=f.w||0;P<p+g;P+=65535){var oe=P+65535;oe>=p&&(h[_/8|0]=g,oe=p),_=te(h,_+1,a.subarray(P,oe))}f.i=p}return b(m,0,c+y(_)+d)},j=(function(){for(var e=new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e})(),M=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=j[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},N=function(){var e=1,t=0;return{p:function(n){for(var r=e,i=t,a=n.length|0,o=0;o!=a;){for(var s=Math.min(o+2655,a);o<s;++o)i+=r+=n[o];r=(r&65535)+15*(r>>16),i=(i&65535)+15*(i>>16)}e=r,t=i},d:function(){return e%=65521,t%=65521,(e&255)<<24|(e&65280)<<8|(t&255)<<8|t>>8}}},P=function(t,n,r,i,a){if(!a&&(a={l:1},n.dictionary)){var o=n.dictionary.subarray(-32768),s=new e(o.length+t.length);s.set(o),s.set(t,o.length),t=s,a.w=o.length}return A(t,n.level==null?6:n.level,n.mem==null?a.l?Math.ceil(Math.max(8,Math.min(13,Math.log(t.length)))*1.5):20:12+n.mem,r,i,a)},F=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8},I=function(e,t){var n=t.filename;if(e[0]=31,e[1]=139,e[2]=8,e[8]=t.level<2?4:t.level==9?2:0,e[9]=3,t.mtime!=0&&F(e,4,Math.floor(new Date(t.mtime||Date.now())/1e3)),n){e[3]=8;for(var r=0;r<=n.length;++r)e[r+10]=n.charCodeAt(r)}},L=function(e){return 10+(e.filename?e.filename.length+1:0)},R=function(e,t){var n=t.level,r=n==0?0:n<6?1:n==9?3:2;if(e[0]=120,e[1]=r<<6|(t.dictionary&&32),e[1]|=31-(e[0]<<8|e[1])%31,t.dictionary){var i=N();i.p(t.dictionary),F(e,2,i.d())}},z=function(){function t(t,n){if(typeof t==`function`&&(n=t,t={}),this.ondata=n,this.o=t||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new e(98304),this.o.dictionary){var r=this.o.dictionary.subarray(-32768);this.b.set(r,32768-r.length),this.s.i=32768-r.length}}return t.prototype.p=function(e,t){this.ondata(P(e,this.o,0,0,this.s),t)},t.prototype.push=function(t,n){this.ondata||S(5),this.s.l&&S(4);var r=t.length+this.s.z;if(r>this.b.length){if(r>2*this.b.length-32768){var i=new e(r&-32768);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;this.b.set(t.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1),this.b.set(this.b.subarray(-32768)),this.b.set(t.subarray(a),32768),this.s.z=t.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(t,this.s.z),this.s.z+=t.length;this.s.l=n&1,(this.s.z>this.s.w+8191||n)&&(this.p(this.b,n||!1),this.s.w=this.s.i,this.s.i-=2),n&&(this.s=this.o={},this.b=k)},t.prototype.flush=function(t){if(this.ondata||S(5),this.s.l&&S(4),this.p(this.b,!1),this.s.w=this.s.i,this.s.i-=2,t){var n=new e(6);n[0]=this.s.r>>3;var r=te(n,this.s.r,k);this.s.r=0,this.ondata(n.subarray(0,r>>3),!1)}},t}();function B(e,t){t||(t={});var n=M(),r=e.length;n.p(e);var i=P(e,t,L(t),8),a=i.length;return I(i,t),F(i,a-8,n.d()),F(i,a-4,r),i}var V=function(){function e(e,t){this.c=N(),this.v=1,z.call(this,e,t)}return e.prototype.push=function(e,t){this.c.p(e),z.prototype.push.call(this,e,t)},e.prototype.p=function(e,t){var n=P(e,this.o,this.v&&(this.o.dictionary?6:2),t&&4,this.s);this.v&&(R(n,this.o),this.v=0),t&&F(n,n.length-4,this.c.d()),this.ondata(n,t)},e.prototype.flush=function(e){z.prototype.flush.call(this,e)},e}(),H=typeof TextEncoder<`u`&&new TextEncoder,U=typeof TextDecoder<`u`&&new TextDecoder;try{U.decode(k,{stream:!0})}catch{}var W=function(){function e(e){this.ondata=e}return e.prototype.push=function(e,t){this.ondata||S(5),this.d&&S(4),this.ondata(G(e),this.d=t||!1)},e}();function G(t,n){if(n){for(var r=new e(t.length),i=0;i<t.length;++i)r[i]=t.charCodeAt(i);return r}if(H)return H.encode(t);for(var a=t.length,o=new e(t.length+(t.length>>1)),s=0,c=function(e){o[s++]=e},i=0;i<a;++i){if(s+5>o.length){var l=new e(s+8+(a-i<<1));l.set(o),o=l}var u=t.charCodeAt(i);u<128||n?c(u):u<2048?(c(192|u>>6),c(128|u&63)):u>55295&&u<57344?(u=65536+(u&1047552)|t.charCodeAt(++i)&1023,c(240|u>>18),c(128|u>>12&63),c(128|u>>6&63),c(128|u&63)):(c(224|u>>12),c(128|u>>6&63),c(128|u&63))}return b(o,0,s)}var K=class{constructor(){this._init()}clear(){this._init()}addEvent(e){if(!e)throw Error(`Adding invalid event`);let t=this._hasEvents?`,`:``;this.stream.push(t+e),this._hasEvents=!0}finish(){this.stream.push(`]`,!0);let e=re(this._deflatedData);return this._init(),e}_init(){this._hasEvents=!1,this._deflatedData=[],this.deflate=new V,this.deflate.ondata=(e,t)=>{this._deflatedData.push(e)},this.stream=new W((e,t)=>{this.deflate.push(e,t)}),this.stream.push(`[`)}};function q(e){return B(G(e))}function re(e){let t=0;for(let n of e)t+=n.length;let n=new Uint8Array(t);for(let t=0,r=0,i=e.length;t<i;t++){let i=e[t];n.set(i,r),r+=i.length}return n}const J=new K,Y={clear:()=>{J.clear()},addEvent:e=>J.addEvent(e),finish:()=>J.finish(),compress:e=>q(e)};function X(e){let t=e.data.method,n=e.data.id,r=e.data.arg;if(t in Y&&typeof Y[t]==`function`)try{let e=Y[t](r);postMessage({id:n,method:t,success:!0,response:e})}catch(e){postMessage({id:n,method:t,success:!1,response:e.message}),console.error(e)}}addEventListener(`message`,X),postMessage({id:void 0,method:`init`,success:!0,response:void 0});";
	function t() {
		let t = new Blob([worker_default], { type: `text/javascript` });
		return URL.createObjectURL(t);
	}
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
	/** If sessionStorage is available. */
	function hasSessionStorage() {
		try {
			return "sessionStorage" in WINDOW$1 && !!WINDOW$1.sessionStorage;
		} catch {
			return false;
		}
	}
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
	/**
	* Save a session to session storage.
	*/
	function saveSession(session) {
		if (!hasSessionStorage()) return;
		try {
			WINDOW$1.sessionStorage.setItem(REPLAY_SESSION_KEY, JSON.stringify(session));
		} catch {}
	}
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
	/**
	* Given an initial timestamp and an expiry duration, checks to see if current
	* time should be considered as expired.
	*/
	function isExpired(initialTime, expiry, targetTime = +/* @__PURE__ */ new Date()) {
		if (initialTime === null || expiry === void 0 || expiry < 0) return true;
		if (expiry === 0) return false;
		return initialTime + expiry <= targetTime;
	}
	/**
	* Checks to see if session is expired
	*/
	function isSessionExpired(session, { maxReplayDuration, sessionIdleExpire, targetTime = Date.now() }) {
		return isExpired(session.started, maxReplayDuration, targetTime) || isExpired(session.lastActivity, sessionIdleExpire, targetTime);
	}
	/** If the session should be refreshed or not. */
	function shouldRefreshSession(session, { sessionIdleExpire, maxReplayDuration }) {
		if (!isSessionExpired(session, {
			sessionIdleExpire,
			maxReplayDuration
		})) return false;
		if (session.sampled === "buffer" && session.segmentId === 0) return false;
		return true;
	}
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
	const MAX_CONTEXT_VALUES = 100;
	function addSegmentDetailsToContext(replay, traceId, segmentName) {
		const replayContext = replay.getContext();
		if (traceId && replayContext.traceIds.size < MAX_CONTEXT_VALUES) replayContext.traceIds.add(traceId);
		if (segmentName && replayContext.segmentNames.size < MAX_CONTEXT_VALUES) replayContext.segmentNames.add(segmentName);
	}
	function handleProcessSegmentSpan(replay) {
		return (spanJSON) => {
			if (!replay.isEnabled()) return;
			addSegmentDetailsToContext(replay, spanJSON.trace_id, spanJSON.name || void 0);
		};
	}
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
		setTimeout$3(async () => {
			try {
				await replay.sendBufferedReplayOrFlush();
			} catch (err) {
				replay.handleException(err);
			}
		});
	}
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
	/**
	* Returns true if we think the given event is an error originating inside of rrweb.
	*/
	function isRrwebError(event, hint) {
		if (event.type || !event.exception?.values?.length) return false;
		if (hint.originalException?.__rrweb__) return true;
		return false;
	}
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
	/**
	* Check whether a given request URL should be filtered out. This is so we
	* don't log Sentry ingest requests.
	*/
	function shouldFilterRequest(replay, url) {
		if (replay.getOptions()._experiments.traceInternals) return false;
		return isSentryRequestUrl(url, getClient());
	}
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
			const timeout = setTimeout$3(() => reject(/* @__PURE__ */ new Error("Timeout while trying to read response body")), 500);
			_getResponseText(response).then((txt) => resolve(txt), (reason) => reject(reason)).finally(() => clearTimeout(timeout));
		});
	}
	async function _getResponseText(response) {
		return response.text();
	}
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
			setTimeoutImpl: setTimeout$3
		});
	}
	const NAVIGATOR = GLOBAL_OBJ.navigator;
	/**
	*  Disable sampling mousemove events on iOS browsers as this can cause blocking the main thread
	*  https://github.com/getsentry/sentry-javascript/issues/14534
	*/
	function getRecordingSamplingOptions() {
		if (/iPhone|iPad|iPod/i.test(NAVIGATOR?.userAgent ?? "") || /Macintosh/i.test(NAVIGATOR?.userAgent ?? "") && NAVIGATOR?.maxTouchPoints && NAVIGATOR?.maxTouchPoints > 1) return { sampling: { mousemove: false } };
		return {};
	}
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
				setTimeout$3(async () => {
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
	/**
	* This is a small utility to get a type-safe instance of the Replay integration.
	*/
	function getReplay() {
		return getClient()?.getIntegrationByName("Replay");
	}
	// src/index.bundle.tracing.replay.feedback.ts
	registerSpanErrorInstrumentation();
	exports.BrowserClient = BrowserClient;
	exports.SDK_VERSION = SDK_VERSION;
	exports.SEMANTIC_ATTRIBUTE_SENTRY_OP = SEMANTIC_ATTRIBUTE_SENTRY_OP;
	exports.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN;
	exports.SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE;
	exports.Scope = Scope;
	exports.WINDOW = WINDOW;
	exports.addBreadcrumb = addBreadcrumb;
	exports.addEventProcessor = addEventProcessor;
	exports.addIntegration = addIntegration;
	exports.breadcrumbsIntegration = breadcrumbsIntegration;
	exports.browserApiErrorsIntegration = browserApiErrorsIntegration;
	exports.browserSessionIntegration = browserSessionIntegration;
	exports.browserTracingCoreIntegration = browserTracingCoreIntegration;
	exports.browserTracingIntegration = browserTracingIntegration;
	exports.captureEvent = captureEvent;
	exports.captureException = captureException;
	exports.captureFeedback = captureFeedback;
	exports.captureMessage = captureMessage;
	exports.captureSession = captureSession;
	exports.chromeStackLineParser = chromeStackLineParser;
	exports.close = close;
	exports.consoleIntegration = consoleIntegration;
	exports.consoleLoggingIntegration = consoleLoggingIntegrationShim;
	exports.continueTrace = continueTrace;
	exports.createTransport = createTransport;
	exports.createUserFeedbackEnvelope = createUserFeedbackEnvelope;
	exports.dedupeIntegration = dedupeIntegration;
	exports.defaultStackLineParsers = defaultStackLineParsers;
	exports.defaultStackParser = defaultStackParser;
	exports.elementTimingIntegration = elementTimingIntegrationShim;
	exports.endSession = endSession;
	exports.eventFiltersIntegration = eventFiltersIntegration;
	exports.eventFromException = eventFromException;
	exports.eventFromMessage = eventFromMessage;
	exports.exceptionFromError = exceptionFromError;
	exports.feedbackAsyncIntegration = feedbackAsyncIntegration;
	exports.feedbackIntegration = feedbackAsyncIntegration;
	exports.fetchStreamPerformanceIntegration = fetchStreamPerformanceIntegration;
	exports.fetchTracingIntegration = fetchTracingIntegration;
	exports.flush = flush;
	exports.forceLoad = forceLoad;
	exports.functionToStringIntegration = functionToStringIntegration;
	exports.geckoStackLineParser = geckoStackLineParser;
	exports.getActiveSpan = getActiveSpan;
	exports.getClient = getClient;
	exports.getCurrentScope = getCurrentScope;
	exports.getDefaultIntegrations = getDefaultIntegrations;
	exports.getFeedback = getFeedback;
	exports.getGlobalScope = getGlobalScope;
	exports.getIsolationScope = getIsolationScope;
	exports.getReplay = getReplay;
	exports.getRootSpan = getRootSpan;
	exports.getSpanDescendants = getSpanDescendants;
	exports.getTraceData = getTraceData;
	exports.globalHandlersIntegration = globalHandlersIntegration;
	exports.httpContextIntegration = httpContextIntegration;
	exports.init = init;
	exports.isBotUserAgent = isBotUserAgent;
	exports.isEnabled = isEnabled;
	exports.isInitialized = isInitialized;
	exports.lastEventId = lastEventId;
	exports.lazyLoadIntegration = lazyLoadIntegration;
	exports.linkedErrorsIntegration = linkedErrorsIntegration;
	exports.linkedTracesIntegration = linkedTracesIntegration;
	exports.logger = loggerShim;
	exports.longTasksIntegration = longTasksIntegration;
	exports.makeFetchTransport = makeFetchTransport;
	exports.metrics = metricsShim;
	exports.onLoad = onLoad;
	exports.opera10StackLineParser = opera10StackLineParser;
	exports.opera11StackLineParser = opera11StackLineParser;
	exports.parameterize = parameterize;
	exports.replayIntegration = replayIntegration;
	exports.reportPageLoaded = reportPageLoaded;
	exports.resourcesIntegration = resourcesIntegration;
	exports.sendFeedback = sendFeedback;
	exports.setActiveSpanInBrowser = setActiveSpanInBrowser;
	exports.setAttribute = setAttribute;
	exports.setAttributes = setAttributes;
	exports.setContext = setContext;
	exports.setConversationId = setConversationId;
	exports.setCurrentClient = setCurrentClient;
	exports.setExtra = setExtra;
	exports.setExtras = setExtras;
	exports.setMeasurement = setMeasurement;
	exports.setTag = setTag;
	exports.setTags = setTags;
	exports.setUser = setUser;
	exports.showReportDialog = showReportDialog;
	exports.spanStreamingIntegration = spanStreamingIntegration;
	exports.spanToBaggageHeader = spanToBaggageHeader;
	exports.spanToJSON = spanToJSON;
	exports.spanToStaticSpanJSON = spanToStaticSpanJSON;
	exports.spanToTraceHeader = spanToTraceHeader;
	exports.startBrowserTracingNavigationSpan = startBrowserTracingNavigationSpan;
	exports.startBrowserTracingPageLoadSpan = startBrowserTracingPageLoadSpan;
	exports.startInactiveSpan = startInactiveSpan;
	exports.startNewTrace = startNewTrace;
	exports.startSession = startSession;
	exports.startSpan = startSpan;
	exports.startSpanManual = startSpanManual;
	exports.suppressTracing = suppressTracing;
	exports.uiProfiler = uiProfiler;
	exports.updateSpanName = updateSpanName;
	exports.webVitalsIntegration = webVitalsIntegration;
	exports.winjsStackLineParser = winjsStackLineParser;
	exports.withActiveSpan = withActiveSpan;
	exports.withIsolationScope = withIsolationScope;
	exports.withScope = withScope;
	exports.withStaticSpan = withStaticSpan;
	exports.withStreamedSpan = withStreamedSpan;
	exports.xhrTracingIntegration = xhrTracingIntegration;
	return exports;
})({});

//# sourceMappingURL=bundle.tracing.replay.feedback.js.map