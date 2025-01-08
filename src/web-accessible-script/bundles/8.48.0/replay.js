/*! @sentry-internal/replay 8.48.0 (405ceb4) | https://github.com/getsentry/sentry-javascript */
(function (__window) {
var exports = {};

// This is a magic string replaced by rollup

const SDK_VERSION = "8.48.0" ;

/** Get's the global object for the current JavaScript runtime */
const GLOBAL_OBJ = globalThis ;

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
function getGlobalSingleton(name, creator, obj) {
  const gbl = (GLOBAL_OBJ) ;
  const __SENTRY__ = (gbl.__SENTRY__ = gbl.__SENTRY__ || {});
  const versionedCarrier = (__SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {});
  return versionedCarrier[name] || (versionedCarrier[name] = creator());
}

/** Prefix for logging strings */
const PREFIX$1 = 'Sentry Logger ';

const CONSOLE_LEVELS$1 = [
  'debug',
  'info',
  'warn',
  'error',
  'log',
  'assert',
  'trace',
] ;

/** This may be mutated by the console instrumentation. */
const originalConsoleMethods

 = {};

/** JSDoc */

/**
 * Temporarily disable sentry console instrumentations.
 *
 * @param callback The function to run against the original `console` messages
 * @returns The results of the callback
 */
function consoleSandbox(callback) {
  if (!('console' in GLOBAL_OBJ)) {
    return callback();
  }

  const console = GLOBAL_OBJ.console ;
  const wrappedFuncs = {};

  const wrappedLevels = Object.keys(originalConsoleMethods) ;

  // Restore all wrapped console methods
  wrappedLevels.forEach(level => {
    const originalConsoleMethod = originalConsoleMethods[level] ;
    wrappedFuncs[level] = console[level] ;
    console[level] = originalConsoleMethod;
  });

  try {
    return callback();
  } finally {
    // Revert restoration to wrapped state
    wrappedLevels.forEach(level => {
      console[level] = wrappedFuncs[level] ;
    });
  }
}

function makeLogger() {
  let enabled = false;
  const logger = {
    enable: () => {
      enabled = true;
    },
    disable: () => {
      enabled = false;
    },
    isEnabled: () => enabled,
  };

  {
    CONSOLE_LEVELS$1.forEach(name => {
      logger[name] = (...args) => {
        if (enabled) {
          consoleSandbox(() => {
            GLOBAL_OBJ.console[name](`${PREFIX$1}[${name}]:`, ...args);
          });
        }
      };
    });
  }

  return logger ;
}

/**
 * This is a logger singleton which either logs things or no-ops if logging is not enabled.
 * The logger is a singleton on the carrier, to ensure that a consistent logger is used throughout the SDK.
 */
const logger$1 = getGlobalSingleton('logger', makeLogger);

const defaultFunctionName = '<anonymous>';

/**
 * Safely extract function name from itself
 */
function getFunctionName(fn) {
  try {
    if (!fn || typeof fn !== 'function') {
      return defaultFunctionName;
    }
    return fn.name || defaultFunctionName;
  } catch (e) {
    // Just accessing custom props in some Selenium environments
    // can cause a "Permission denied" exception (see raven-js#495).
    return defaultFunctionName;
  }
}

// We keep the handlers globally
const handlers$2 = {};
const instrumented$1 = {};

/** Add a handler function. */
function addHandler$1(type, handler) {
  handlers$2[type] = handlers$2[type] || [];
  (handlers$2[type] ).push(handler);
}

/** Maybe run an instrumentation function, unless it was already called. */
function maybeInstrument(type, instrumentFn) {
  if (!instrumented$1[type]) {
    instrumented$1[type] = true;
    try {
      instrumentFn();
    } catch (e) {
      logger$1.error(`Error while instrumenting ${type}`, e);
    }
  }
}

/** Trigger handlers for a given instrumentation type. */
function triggerHandlers$1(type, data) {
  const typeHandlers = type && handlers$2[type];
  if (!typeHandlers) {
    return;
  }

  for (const handler of typeHandlers) {
    try {
      handler(data);
    } catch (e) {
      logger$1.error(
          `Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`,
          e,
        );
    }
  }
}

/**
 * An object that contains globally accessible properties and maintains a scope stack.
 * @hidden
 */

/**
 * Returns the global shim registry.
 *
 * FIXME: This function is problematic, because despite always returning a valid Carrier,
 * it has an optional `__SENTRY__` property, which then in turn requires us to always perform an unnecessary check
 * at the call-site. We always access the carrier through this function, so we can guarantee that `__SENTRY__` is there.
 **/
function getMainCarrier() {
  // This ensures a Sentry carrier exists
  getSentryCarrier(GLOBAL_OBJ);
  return GLOBAL_OBJ;
}

/** Will either get the existing sentry carrier, or create a new one. */
function getSentryCarrier(carrier) {
  const __SENTRY__ = (carrier.__SENTRY__ = carrier.__SENTRY__ || {});

  // For now: First SDK that sets the .version property wins
  __SENTRY__.version = __SENTRY__.version || SDK_VERSION;

  // Intentionally populating and returning the version of "this" SDK instance
  // rather than what's set in .version so that "this" SDK always gets its carrier
  return (__SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {});
}

// eslint-disable-next-line @typescript-eslint/unbound-method
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
    case '[object Error]':
    case '[object Exception]':
    case '[object DOMException]':
    case '[object WebAssembly.Exception]':
      return true;
    default:
      return isInstanceOf(wat, Error);
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
  return isBuiltin(wat, 'String');
}

/**
 * Checks whether given value's type is an object literal, or a class instance.
 * {@link isPlainObject}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isPlainObject(wat) {
  return isBuiltin(wat, 'Object');
}

/**
 * Checks whether given value's type is an Event instance
 * {@link isEvent}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isEvent(wat) {
  return typeof Event !== 'undefined' && isInstanceOf(wat, Event);
}

/**
 * Checks whether given value's type is an Element instance
 * {@link isElement}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isElement$2(wat) {
  return typeof Element !== 'undefined' && isInstanceOf(wat, Element);
}

/**
 * Checks whether given value's type is an regexp
 * {@link isRegExp}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isRegExp(wat) {
  return isBuiltin(wat, 'RegExp');
}

/**
 * Checks whether given value has a then function.
 * @param wat A value to be checked.
 */
function isThenable(wat) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return Boolean(wat && wat.then && typeof wat.then === 'function');
}

/**
 * Checks whether given value's type is a SyntheticEvent
 * {@link isSyntheticEvent}.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isSyntheticEvent(wat) {
  return isPlainObject(wat) && 'nativeEvent' in wat && 'preventDefault' in wat && 'stopPropagation' in wat;
}

/**
 * Checks whether given value's type is an instance of provided constructor.
 * {@link isInstanceOf}.
 *
 * @param wat A value to be checked.
 * @param base A constructor to be used in a check.
 * @returns A boolean representing the result.
 */
function isInstanceOf(wat, base) {
  try {
    return wat instanceof base;
  } catch (_e) {
    return false;
  }
}

/**
 * Checks whether given value's type is a Vue ViewModel.
 *
 * @param wat A value to be checked.
 * @returns A boolean representing the result.
 */
function isVueViewModel(wat) {
  // Not using Object.prototype.toString because in Vue 3 it would read the instance's Symbol(Symbol.toStringTag) property.
  return !!(typeof wat === 'object' && wat !== null && ((wat ).__isVue || (wat )._isVue));
}

const WINDOW$3 = GLOBAL_OBJ ;

const DEFAULT_MAX_STRING_LENGTH = 80;

/**
 * Given a child DOM element, returns a query-selector statement describing that
 * and its ancestors
 * e.g. [HTMLElement] => body > div > input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function htmlTreeAsString(
  elem,
  options = {},
) {
  if (!elem) {
    return '<unknown>';
  }

  // try/catch both:
  // - accessing event.target (see getsentry/raven-js#838, #768)
  // - `htmlTreeAsString` because it's complex, and just accessing the DOM incorrectly
  // - can throw an exception in some circumstances.
  try {
    let currentElem = elem ;
    const MAX_TRAVERSE_HEIGHT = 5;
    const out = [];
    let height = 0;
    let len = 0;
    const separator = ' > ';
    const sepLength = separator.length;
    let nextStr;
    const keyAttrs = Array.isArray(options) ? options : options.keyAttrs;
    const maxStringLength = (!Array.isArray(options) && options.maxStringLength) || DEFAULT_MAX_STRING_LENGTH;

    while (currentElem && height++ < MAX_TRAVERSE_HEIGHT) {
      nextStr = _htmlElementAsString(currentElem, keyAttrs);
      // bail out if
      // - nextStr is the 'html' element
      // - the length of the string that would be created exceeds maxStringLength
      //   (ignore this limit if we are on the first iteration)
      if (nextStr === 'html' || (height > 1 && len + out.length * sepLength + nextStr.length >= maxStringLength)) {
        break;
      }

      out.push(nextStr);

      len += nextStr.length;
      currentElem = currentElem.parentNode;
    }

    return out.reverse().join(separator);
  } catch (_oO) {
    return '<unknown>';
  }
}

/**
 * Returns a simple, query-selector representation of a DOM element
 * e.g. [HTMLElement] => input#foo.btn[name=baz]
 * @returns generated DOM path
 */
function _htmlElementAsString(el, keyAttrs) {
  const elem = el

;

  const out = [];

  if (!elem || !elem.tagName) {
    return '';
  }

  // @ts-expect-error WINDOW has HTMLElement
  if (WINDOW$3.HTMLElement) {
    // If using the component name annotation plugin, this value may be available on the DOM node
    if (elem instanceof HTMLElement && elem.dataset) {
      if (elem.dataset['sentryComponent']) {
        return elem.dataset['sentryComponent'];
      }
      if (elem.dataset['sentryElement']) {
        return elem.dataset['sentryElement'];
      }
    }
  }

  out.push(elem.tagName.toLowerCase());

  // Pairs of attribute keys defined in `serializeAttribute` and their values on element.
  const keyAttrPairs =
    keyAttrs && keyAttrs.length
      ? keyAttrs.filter(keyAttr => elem.getAttribute(keyAttr)).map(keyAttr => [keyAttr, elem.getAttribute(keyAttr)])
      : null;

  if (keyAttrPairs && keyAttrPairs.length) {
    keyAttrPairs.forEach(keyAttrPair => {
      out.push(`[${keyAttrPair[0]}="${keyAttrPair[1]}"]`);
    });
  } else {
    if (elem.id) {
      out.push(`#${elem.id}`);
    }

    const className = elem.className;
    if (className && isString(className)) {
      const classes = className.split(/\s+/);
      for (const c of classes) {
        out.push(`.${c}`);
      }
    }
  }
  const allowedAttrs = ['aria-label', 'type', 'name', 'title', 'alt'];
  for (const k of allowedAttrs) {
    const attr = elem.getAttribute(k);
    if (attr) {
      out.push(`[${k}="${attr}"]`);
    }
  }

  return out.join('');
}

/**
 * A safe form of location.href
 */
function getLocationHref() {
  try {
    return WINDOW$3.document.location.href;
  } catch (oO) {
    return '';
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
  if (typeof str !== 'string' || max === 0) {
    return str;
  }
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
function isMatchingPattern(
  value,
  pattern,
  requireExactStringMatch = false,
) {
  if (!isString(value)) {
    return false;
  }

  if (isRegExp(pattern)) {
    return pattern.test(value);
  }
  if (isString(pattern)) {
    return requireExactStringMatch ? value === pattern : value.includes(pattern);
  }

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
function stringMatchesSomePattern(
  testString,
  patterns = [],
  requireExactStringMatch = false,
) {
  return patterns.some(pattern => isMatchingPattern(testString, pattern, requireExactStringMatch));
}

/**
 * Replace a method in an object with a wrapped version of itself.
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
  if (!(name in source)) {
    return;
  }

  const original = source[name] ;
  const wrapped = replacementFactory(original) ;

  // Make sure it's a function first, as we need to attach an empty prototype for `defineProperties` to work
  // otherwise it'll throw "TypeError: Object.defineProperties called on non-object"
  if (typeof wrapped === 'function') {
    markFunctionWrapped(wrapped, original);
  }

  try {
    source[name] = wrapped;
  } catch (e) {
    logger$1.log(`Failed to replace method "${name}" in object`, source);
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
      // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
      value: value,
      writable: true,
      configurable: true,
    });
  } catch (o_O) {
    logger$1.log(`Failed to add non-enumerable property "${name}" to object`, obj);
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
    const proto = original.prototype || {};
    wrapped.prototype = original.prototype = proto;
    addNonEnumerableProperty(wrapped, '__sentry_original__', original);
  } catch (o_O) {} // eslint-disable-line no-empty
}

/**
 * Transforms any `Error` or `Event` into a plain object with all of their enumerable properties, and some of their
 * non-enumerable properties attached.
 *
 * @param value Initial source that we have to transform in order for it to be usable by the serializer
 * @returns An Event or Error turned into an object - or the value argument itself, when value is neither an Event nor
 *  an Error.
 */
function convertToPlainObject(value)

 {
  if (isError(value)) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
      ...getOwnProperties(value),
    };
  } else if (isEvent(value)) {
    const newObj

 = {
      type: value.type,
      target: serializeEventTarget(value.target),
      currentTarget: serializeEventTarget(value.currentTarget),
      ...getOwnProperties(value),
    };

    if (typeof CustomEvent !== 'undefined' && isInstanceOf(value, CustomEvent)) {
      newObj.detail = value.detail;
    }

    return newObj;
  } else {
    return value;
  }
}

/** Creates a string representation of the target of an `Event` object */
function serializeEventTarget(target) {
  try {
    return isElement$2(target) ? htmlTreeAsString(target) : Object.prototype.toString.call(target);
  } catch (_oO) {
    return '<unknown>';
  }
}

/** Filters out all but an object's own properties */
function getOwnProperties(obj) {
  if (typeof obj === 'object' && obj !== null) {
    const extractedProps = {};
    for (const property in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, property)) {
        extractedProps[property] = (obj )[property];
      }
    }
    return extractedProps;
  } else {
    return {};
  }
}

/**
 * Given any object, return a new object having removed all fields whose value was `undefined`.
 * Works recursively on objects and arrays.
 *
 * Attention: This function keeps circular references in the returned object.
 */
function dropUndefinedKeys(inputValue) {
  // This map keeps track of what already visited nodes map to.
  // Our Set - based memoBuilder doesn't work here because we want to the output object to have the same circular
  // references as the input object.
  const memoizationMap = new Map();

  // This function just proxies `_dropUndefinedKeys` to keep the `memoBuilder` out of this function's API
  return _dropUndefinedKeys(inputValue, memoizationMap);
}

function _dropUndefinedKeys(inputValue, memoizationMap) {
  if (isPojo(inputValue)) {
    // If this node has already been visited due to a circular reference, return the object it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal ;
    }

    const returnValue = {};
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    for (const key of Object.getOwnPropertyNames(inputValue)) {
      if (typeof inputValue[key] !== 'undefined') {
        returnValue[key] = _dropUndefinedKeys(inputValue[key], memoizationMap);
      }
    }

    return returnValue ;
  }

  if (Array.isArray(inputValue)) {
    // If this node has already been visited due to a circular reference, return the array it was mapped to in the new object
    const memoVal = memoizationMap.get(inputValue);
    if (memoVal !== undefined) {
      return memoVal ;
    }

    const returnValue = [];
    // Store the mapping of this value in case we visit it again, in case of circular data
    memoizationMap.set(inputValue, returnValue);

    inputValue.forEach((item) => {
      returnValue.push(_dropUndefinedKeys(item, memoizationMap));
    });

    return returnValue ;
  }

  return inputValue;
}

function isPojo(input) {
  if (!isPlainObject(input)) {
    return false;
  }

  try {
    const name = (Object.getPrototypeOf(input) ).constructor.name;
    return !name || name === 'Object';
  } catch (e2) {
    return true;
  }
}

const ONE_SECOND_IN_MS = 1000;

/**
 * A partial definition of the [Performance Web API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Performance}
 * for accessing a high-resolution monotonic clock.
 */

/**
 * Returns a timestamp in seconds since the UNIX epoch using the Date API.
 *
 * TODO(v8): Return type should be rounded.
 */
function dateTimestampInSeconds() {
  return Date.now() / ONE_SECOND_IN_MS;
}

/**
 * Returns a wrapper around the native Performance API browser implementation, or undefined for browsers that do not
 * support the API.
 *
 * Wrapping the native API works around differences in behavior from different browsers.
 */
function createUnixTimestampInSecondsFunc() {
  const { performance } = GLOBAL_OBJ ;
  if (!performance || !performance.now) {
    return dateTimestampInSeconds;
  }

  // Some browser and environments don't have a timeOrigin, so we fallback to
  // using Date.now() to compute the starting time.
  const approxStartingTimeOrigin = Date.now() - performance.now();
  const timeOrigin = performance.timeOrigin == undefined ? approxStartingTimeOrigin : performance.timeOrigin;

  // performance.now() is a monotonic clock, which means it starts at 0 when the process begins. To get the current
  // wall clock time (actual UNIX timestamp), we need to add the starting time origin and the current time elapsed.
  //
  // TODO: This does not account for the case where the monotonic clock that powers performance.now() drifts from the
  // wall clock time, which causes the returned timestamp to be inaccurate. We should investigate how to detect and
  // correct for this.
  // See: https://github.com/getsentry/sentry-javascript/issues/2590
  // See: https://github.com/mdn/content/issues/4713
  // See: https://dev.to/noamr/when-a-millisecond-is-not-a-millisecond-3h6
  return () => {
    return (timeOrigin + performance.now()) / ONE_SECOND_IN_MS;
  };
}

/**
 * Returns a timestamp in seconds since the UNIX epoch using either the Performance or Date APIs, depending on the
 * availability of the Performance API.
 *
 * BUG: Note that because of how browsers implement the Performance API, the clock might stop when the computer is
 * asleep. This creates a skew between `dateTimestampInSeconds` and `timestampInSeconds`. The
 * skew can grow to arbitrary amounts like days, weeks or months.
 * See https://github.com/getsentry/sentry-javascript/issues/2590.
 */
const timestampInSeconds = createUnixTimestampInSecondsFunc();

/**
 * The number of milliseconds since the UNIX epoch. This value is only usable in a browser, and only when the
 * performance API is available.
 */
const browserPerformanceTimeOrigin = (() => {
  // Unfortunately browsers may report an inaccurate time origin data, through either performance.timeOrigin or
  // performance.timing.navigationStart, which results in poor results in performance data. We only treat time origin
  // data as reliable if they are within a reasonable threshold of the current time.

  const { performance } = GLOBAL_OBJ ;
  if (!performance || !performance.now) {
    return undefined;
  }

  const threshold = 3600 * 1000;
  const performanceNow = performance.now();
  const dateNow = Date.now();

  // if timeOrigin isn't available set delta to threshold so it isn't used
  const timeOriginDelta = performance.timeOrigin
    ? Math.abs(performance.timeOrigin + performanceNow - dateNow)
    : threshold;
  const timeOriginIsReliable = timeOriginDelta < threshold;

  // While performance.timing.navigationStart is deprecated in favor of performance.timeOrigin, performance.timeOrigin
  // is not as widely supported. Namely, performance.timeOrigin is undefined in Safari as of writing.
  // Also as of writing, performance.timing is not available in Web Workers in mainstream browsers, so it is not always
  // a valid fallback. In the absence of an initial time provided by the browser, fallback to the current time from the
  // Date API.
  // eslint-disable-next-line deprecation/deprecation
  const navigationStart = performance.timing && performance.timing.navigationStart;
  const hasNavigationStart = typeof navigationStart === 'number';
  // if navigationStart isn't available set delta to threshold so it isn't used
  const navigationStartDelta = hasNavigationStart ? Math.abs(navigationStart + performanceNow - dateNow) : threshold;
  const navigationStartIsReliable = navigationStartDelta < threshold;

  if (timeOriginIsReliable || navigationStartIsReliable) {
    // Use the more reliable time origin
    if (timeOriginDelta <= navigationStartDelta) {
      return performance.timeOrigin;
    } else {
      return navigationStart;
    }
  }
  return dateNow;
})();

/**
 * UUID4 generator
 *
 * @returns string Generated UUID4.
 */
function uuid4() {
  const gbl = GLOBAL_OBJ ;
  const crypto = gbl.crypto || gbl.msCrypto;

  let getRandomByte = () => Math.random() * 16;
  try {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '');
    }
    if (crypto && crypto.getRandomValues) {
      getRandomByte = () => {
        // crypto.getRandomValues might return undefined instead of the typed array
        // in old Chromium versions (e.g. 23.0.1235.0 (151422))
        // However, `typedArray` is still filled in-place.
        // @see https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#typedarray
        const typedArray = new Uint8Array(1);
        crypto.getRandomValues(typedArray);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return typedArray[0];
      };
    }
  } catch (_) {
    // some runtimes can crash invoking crypto
    // https://github.com/getsentry/sentry-javascript/issues/8935
  }

  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/2117523#2117523
  // Concatenating the following numbers as strings results in '10000000100040008000100000000000'
  return (([1e7] ) + 1e3 + 4e3 + 8e3 + 1e11).replace(/[018]/g, c =>
    // eslint-disable-next-line no-bitwise
    ((c ) ^ ((getRandomByte() & 15) >> ((c ) / 4))).toString(16),
  );
}

function getFirstException(event) {
  return event.exception && event.exception.values ? event.exception.values[0] : undefined;
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
  if (!firstException) {
    return;
  }

  const defaultMechanism = { type: 'generic', handled: true };
  const currentMechanism = firstException.mechanism;
  firstException.mechanism = { ...defaultMechanism, ...currentMechanism, ...newMechanism };

  if (newMechanism && 'data' in newMechanism) {
    const mergedData = { ...(currentMechanism && currentMechanism.data), ...newMechanism.data };
    firstException.mechanism.data = mergedData;
  }
}

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** SyncPromise internal states */
var States; (function (States) {
  /** Pending */
  const PENDING = 0; States[States["PENDING"] = PENDING] = "PENDING";
  /** Resolved / OK */
  const RESOLVED = 1; States[States["RESOLVED"] = RESOLVED] = "RESOLVED";
  /** Rejected / Error */
  const REJECTED = 2; States[States["REJECTED"] = REJECTED] = "REJECTED";
})(States || (States = {}));

// Overloads so we can call resolvedSyncPromise without arguments and generic argument

/**
 * Creates a resolved sync promise.
 *
 * @param value the value to resolve the promise with
 * @returns the resolved sync promise
 */
function resolvedSyncPromise(value) {
  return new SyncPromise(resolve => {
    resolve(value);
  });
}

/**
 * Thenable class that behaves like a Promise and follows it's interface
 * but is not async internally
 */
class SyncPromise {

   constructor(
    executor,
  ) {SyncPromise.prototype.__init.call(this);SyncPromise.prototype.__init2.call(this);SyncPromise.prototype.__init3.call(this);SyncPromise.prototype.__init4.call(this);
    this._state = States.PENDING;
    this._handlers = [];

    try {
      executor(this._resolve, this._reject);
    } catch (e) {
      this._reject(e);
    }
  }

  /** JSDoc */
   then(
    onfulfilled,
    onrejected,
  ) {
    return new SyncPromise((resolve, reject) => {
      this._handlers.push([
        false,
        result => {
          if (!onfulfilled) {
            // TODO: ¯\_(ツ)_/¯
            // TODO: FIXME
            resolve(result );
          } else {
            try {
              resolve(onfulfilled(result));
            } catch (e) {
              reject(e);
            }
          }
        },
        reason => {
          if (!onrejected) {
            reject(reason);
          } else {
            try {
              resolve(onrejected(reason));
            } catch (e) {
              reject(e);
            }
          }
        },
      ]);
      this._executeHandlers();
    });
  }

  /** JSDoc */
   catch(
    onrejected,
  ) {
    return this.then(val => val, onrejected);
  }

  /** JSDoc */
   finally(onfinally) {
    return new SyncPromise((resolve, reject) => {
      let val;
      let isRejected;

      return this.then(
        value => {
          isRejected = false;
          val = value;
          if (onfinally) {
            onfinally();
          }
        },
        reason => {
          isRejected = true;
          val = reason;
          if (onfinally) {
            onfinally();
          }
        },
      ).then(() => {
        if (isRejected) {
          reject(val);
          return;
        }

        resolve(val );
      });
    });
  }

  /** JSDoc */
    __init() {this._resolve = (value) => {
    this._setResult(States.RESOLVED, value);
  };}

  /** JSDoc */
    __init2() {this._reject = (reason) => {
    this._setResult(States.REJECTED, reason);
  };}

  /** JSDoc */
    __init3() {this._setResult = (state, value) => {
    if (this._state !== States.PENDING) {
      return;
    }

    if (isThenable(value)) {
      void (value ).then(this._resolve, this._reject);
      return;
    }

    this._state = state;
    this._value = value;

    this._executeHandlers();
  };}

  /** JSDoc */
    __init4() {this._executeHandlers = () => {
    if (this._state === States.PENDING) {
      return;
    }

    const cachedHandlers = this._handlers.slice();
    this._handlers = [];

    cachedHandlers.forEach(handler => {
      if (handler[0]) {
        return;
      }

      if (this._state === States.RESOLVED) {
        handler[1](this._value );
      }

      if (this._state === States.REJECTED) {
        handler[2](this._value);
      }

      handler[0] = true;
    });
  };}
}

/**
 * Updates a session object with the properties passed in the context.
 *
 * Note that this function mutates the passed object and returns void.
 * (Had to do this instead of returning a new and updated session because closing and sending a session
 * makes an update to the session after it was passed to the sending logic.
 * @see BaseClient.captureSession )
 *
 * @param session the `Session` to update
 * @param context the `SessionContext` holding the properties that should be updated in @param session
 */
// eslint-disable-next-line complexity
function updateSession(session, context = {}) {
  if (context.user) {
    if (!session.ipAddress && context.user.ip_address) {
      session.ipAddress = context.user.ip_address;
    }

    if (!session.did && !context.did) {
      session.did = context.user.id || context.user.email || context.user.username;
    }
  }

  session.timestamp = context.timestamp || timestampInSeconds();

  if (context.abnormal_mechanism) {
    session.abnormal_mechanism = context.abnormal_mechanism;
  }

  if (context.ignoreDuration) {
    session.ignoreDuration = context.ignoreDuration;
  }
  if (context.sid) {
    // Good enough uuid validation. — Kamil
    session.sid = context.sid.length === 32 ? context.sid : uuid4();
  }
  if (context.init !== undefined) {
    session.init = context.init;
  }
  if (!session.did && context.did) {
    session.did = `${context.did}`;
  }
  if (typeof context.started === 'number') {
    session.started = context.started;
  }
  if (session.ignoreDuration) {
    session.duration = undefined;
  } else if (typeof context.duration === 'number') {
    session.duration = context.duration;
  } else {
    const duration = session.timestamp - session.started;
    session.duration = duration >= 0 ? duration : 0;
  }
  if (context.release) {
    session.release = context.release;
  }
  if (context.environment) {
    session.environment = context.environment;
  }
  if (!session.ipAddress && context.ipAddress) {
    session.ipAddress = context.ipAddress;
  }
  if (!session.userAgent && context.userAgent) {
    session.userAgent = context.userAgent;
  }
  if (typeof context.errors === 'number') {
    session.errors = context.errors;
  }
  if (context.status) {
    session.status = context.status;
  }
}

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

/**
 * Shallow merge two objects.
 * Does not mutate the passed in objects.
 * Undefined/empty values in the merge object will overwrite existing values.
 *
 * By default, this merges 2 levels deep.
 */
function merge(initialObj, mergeObj, levels = 2) {
  // If the merge value is not an object, or we have no merge levels left,
  // we just set the value to the merge value
  if (!mergeObj || typeof mergeObj !== 'object' || levels <= 0) {
    return mergeObj;
  }

  // If the merge object is an empty object, and the initial object is not undefined, we return the initial object
  if (initialObj && mergeObj && Object.keys(mergeObj).length === 0) {
    return initialObj;
  }

  // Clone object
  const output = { ...initialObj };

  // Merge values into output, resursively
  for (const key in mergeObj) {
    if (Object.prototype.hasOwnProperty.call(mergeObj, key)) {
      output[key] = merge(output[key], mergeObj[key], levels - 1);
    }
  }

  return output;
}

const SCOPE_SPAN_FIELD = '_sentrySpan';

/**
 * Set the active span for a given scope.
 * NOTE: This should NOT be used directly, but is only used internally by the trace methods.
 */
function _setSpanForScope(scope, span) {
  if (span) {
    addNonEnumerableProperty(scope , SCOPE_SPAN_FIELD, span);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (scope )[SCOPE_SPAN_FIELD];
  }
}

/**
 * Get the active span for a given scope.
 * NOTE: This should NOT be used directly, but is only used internally by the trace methods.
 */
function _getSpanForScope(scope) {
  return scope[SCOPE_SPAN_FIELD];
}

/**
 * Default value for maximum number of breadcrumbs added to an event.
 */
const DEFAULT_MAX_BREADCRUMBS = 100;

/**
 * Holds additional event information.
 */
class ScopeClass  {
  /** Flag if notifying is happening. */

  /** Callback for client to receive scope changes. */

  /** Callback list that will be called during event processing. */

  /** Array of breadcrumbs. */

  /** User */

  /** Tags */

  /** Extra */

  /** Contexts */

  /** Attachments */

  /** Propagation Context for distributed tracing */

  /**
   * A place to stash data which is needed at some point in the SDK's event processing pipeline but which shouldn't get
   * sent to Sentry
   */

  /** Fingerprint */

  /** Severity */

  /**
   * Transaction Name
   *
   * IMPORTANT: The transaction name on the scope has nothing to do with root spans/transaction objects.
   * It's purpose is to assign a transaction to the scope that's added to non-transaction events.
   */

  /** Session */

  /** Request Mode Session Status */
  // eslint-disable-next-line deprecation/deprecation

  /** The client on this scope */

  /** Contains the last event id of a captured event.  */

  // NOTE: Any field which gets added here should get added not only to the constructor but also to the `clone` method.

   constructor() {
    this._notifyingListeners = false;
    this._scopeListeners = [];
    this._eventProcessors = [];
    this._breadcrumbs = [];
    this._attachments = [];
    this._user = {};
    this._tags = {};
    this._extra = {};
    this._contexts = {};
    this._sdkProcessingMetadata = {};
    this._propagationContext = {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
    };
  }

  /**
   * @inheritDoc
   */
   clone() {
    const newScope = new ScopeClass();
    newScope._breadcrumbs = [...this._breadcrumbs];
    newScope._tags = { ...this._tags };
    newScope._extra = { ...this._extra };
    newScope._contexts = { ...this._contexts };
    if (this._contexts.flags) {
      // We need to copy the `values` array so insertions on a cloned scope
      // won't affect the original array.
      newScope._contexts.flags = {
        values: [...this._contexts.flags.values],
      };
    }

    newScope._user = this._user;
    newScope._level = this._level;
    newScope._session = this._session;
    newScope._transactionName = this._transactionName;
    newScope._fingerprint = this._fingerprint;
    newScope._eventProcessors = [...this._eventProcessors];
    newScope._requestSession = this._requestSession;
    newScope._attachments = [...this._attachments];
    newScope._sdkProcessingMetadata = { ...this._sdkProcessingMetadata };
    newScope._propagationContext = { ...this._propagationContext };
    newScope._client = this._client;
    newScope._lastEventId = this._lastEventId;

    _setSpanForScope(newScope, _getSpanForScope(this));

    return newScope;
  }

  /**
   * @inheritDoc
   */
   setClient(client) {
    this._client = client;
  }

  /**
   * @inheritDoc
   */
   setLastEventId(lastEventId) {
    this._lastEventId = lastEventId;
  }

  /**
   * @inheritDoc
   */
   getClient() {
    return this._client ;
  }

  /**
   * @inheritDoc
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
   * @inheritDoc
   */
   addEventProcessor(callback) {
    this._eventProcessors.push(callback);
    return this;
  }

  /**
   * @inheritDoc
   */
   setUser(user) {
    // If null is passed we want to unset everything, but still define keys,
    // so that later down in the pipeline any existing values are cleared.
    this._user = user || {
      email: undefined,
      id: undefined,
      ip_address: undefined,
      username: undefined,
    };

    if (this._session) {
      updateSession(this._session, { user });
    }

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   getUser() {
    return this._user;
  }

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
   getRequestSession() {
    return this._requestSession;
  }

  /**
   * @inheritDoc
   */
  // eslint-disable-next-line deprecation/deprecation
   setRequestSession(requestSession) {
    this._requestSession = requestSession;
    return this;
  }

  /**
   * @inheritDoc
   */
   setTags(tags) {
    this._tags = {
      ...this._tags,
      ...tags,
    };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setTag(key, value) {
    this._tags = { ...this._tags, [key]: value };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setExtras(extras) {
    this._extra = {
      ...this._extra,
      ...extras,
    };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setExtra(key, extra) {
    this._extra = { ...this._extra, [key]: extra };
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setFingerprint(fingerprint) {
    this._fingerprint = fingerprint;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setLevel(level) {
    this._level = level;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setTransactionName(name) {
    this._transactionName = name;
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setContext(key, context) {
    if (context === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._contexts[key];
    } else {
      this._contexts[key] = context;
    }

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   setSession(session) {
    if (!session) {
      delete this._session;
    } else {
      this._session = session;
    }
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   getSession() {
    return this._session;
  }

  /**
   * @inheritDoc
   */
   update(captureContext) {
    if (!captureContext) {
      return this;
    }

    const scopeToMerge = typeof captureContext === 'function' ? captureContext(this) : captureContext;

    const [scopeInstance, requestSession] =
      scopeToMerge instanceof Scope
        ? // eslint-disable-next-line deprecation/deprecation
          [scopeToMerge.getScopeData(), scopeToMerge.getRequestSession()]
        : isPlainObject(scopeToMerge)
          ? [captureContext , (captureContext ).requestSession]
          : [];

    const { tags, extra, user, contexts, level, fingerprint = [], propagationContext } = scopeInstance || {};

    this._tags = { ...this._tags, ...tags };
    this._extra = { ...this._extra, ...extra };
    this._contexts = { ...this._contexts, ...contexts };

    if (user && Object.keys(user).length) {
      this._user = user;
    }

    if (level) {
      this._level = level;
    }

    if (fingerprint.length) {
      this._fingerprint = fingerprint;
    }

    if (propagationContext) {
      this._propagationContext = propagationContext;
    }

    if (requestSession) {
      this._requestSession = requestSession;
    }

    return this;
  }

  /**
   * @inheritDoc
   */
   clear() {
    // client is not cleared here on purpose!
    this._breadcrumbs = [];
    this._tags = {};
    this._extra = {};
    this._user = {};
    this._contexts = {};
    this._level = undefined;
    this._transactionName = undefined;
    this._fingerprint = undefined;
    this._requestSession = undefined;
    this._session = undefined;
    _setSpanForScope(this, undefined);
    this._attachments = [];
    this.setPropagationContext({ traceId: generateTraceId() });

    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   addBreadcrumb(breadcrumb, maxBreadcrumbs) {
    const maxCrumbs = typeof maxBreadcrumbs === 'number' ? maxBreadcrumbs : DEFAULT_MAX_BREADCRUMBS;

    // No data has been changed, so don't notify scope listeners
    if (maxCrumbs <= 0) {
      return this;
    }

    const mergedBreadcrumb = {
      timestamp: dateTimestampInSeconds(),
      ...breadcrumb,
    };

    const breadcrumbs = this._breadcrumbs;
    breadcrumbs.push(mergedBreadcrumb);
    this._breadcrumbs = breadcrumbs.length > maxCrumbs ? breadcrumbs.slice(-maxCrumbs) : breadcrumbs;

    this._notifyScopeListeners();

    return this;
  }

  /**
   * @inheritDoc
   */
   getLastBreadcrumb() {
    return this._breadcrumbs[this._breadcrumbs.length - 1];
  }

  /**
   * @inheritDoc
   */
   clearBreadcrumbs() {
    this._breadcrumbs = [];
    this._notifyScopeListeners();
    return this;
  }

  /**
   * @inheritDoc
   */
   addAttachment(attachment) {
    this._attachments.push(attachment);
    return this;
  }

  /**
   * @inheritDoc
   */
   clearAttachments() {
    this._attachments = [];
    return this;
  }

  /** @inheritDoc */
   getScopeData() {
    return {
      breadcrumbs: this._breadcrumbs,
      attachments: this._attachments,
      contexts: this._contexts,
      tags: this._tags,
      extra: this._extra,
      user: this._user,
      level: this._level,
      fingerprint: this._fingerprint || [],
      eventProcessors: this._eventProcessors,
      propagationContext: this._propagationContext,
      sdkProcessingMetadata: this._sdkProcessingMetadata,
      transactionName: this._transactionName,
      span: _getSpanForScope(this),
    };
  }

  /**
   * @inheritDoc
   */
   setSDKProcessingMetadata(newData) {
    this._sdkProcessingMetadata = merge(this._sdkProcessingMetadata, newData, 2);
    return this;
  }

  /**
   * @inheritDoc
   */
   setPropagationContext(
    context,
  ) {
    this._propagationContext = {
      // eslint-disable-next-line deprecation/deprecation
      spanId: generateSpanId(),
      ...context,
    };
    return this;
  }

  /**
   * @inheritDoc
   */
   getPropagationContext() {
    return this._propagationContext;
  }

  /**
   * @inheritDoc
   */
   captureException(exception, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger$1.warn('No client configured on scope - will not capture exception!');
      return eventId;
    }

    const syntheticException = new Error('Sentry syntheticException');

    this._client.captureException(
      exception,
      {
        originalException: exception,
        syntheticException,
        ...hint,
        event_id: eventId,
      },
      this,
    );

    return eventId;
  }

  /**
   * @inheritDoc
   */
   captureMessage(message, level, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger$1.warn('No client configured on scope - will not capture message!');
      return eventId;
    }

    const syntheticException = new Error(message);

    this._client.captureMessage(
      message,
      level,
      {
        originalException: message,
        syntheticException,
        ...hint,
        event_id: eventId,
      },
      this,
    );

    return eventId;
  }

  /**
   * @inheritDoc
   */
   captureEvent(event, hint) {
    const eventId = hint && hint.event_id ? hint.event_id : uuid4();

    if (!this._client) {
      logger$1.warn('No client configured on scope - will not capture event!');
      return eventId;
    }

    this._client.captureEvent(event, { ...hint, event_id: eventId }, this);

    return eventId;
  }

  /**
   * This will be called on every set call.
   */
   _notifyScopeListeners() {
    // We need this check for this._notifyingListeners to be able to work on scope during updates
    // If this check is not here we'll produce endless recursion when something is done with the scope
    // during the callback.
    if (!this._notifyingListeners) {
      this._notifyingListeners = true;
      this._scopeListeners.forEach(callback => {
        callback(this);
      });
      this._notifyingListeners = false;
    }
  }
}

/**
 * Holds additional event information.
 */
const Scope = ScopeClass;

/** Get the default current scope. */
function getDefaultCurrentScope() {
  return getGlobalSingleton('defaultCurrentScope', () => new Scope());
}

/** Get the default isolation scope. */
function getDefaultIsolationScope() {
  return getGlobalSingleton('defaultIsolationScope', () => new Scope());
}

/**
 * This is an object that holds a stack of scopes.
 */
class AsyncContextStack {

   constructor(scope, isolationScope) {
    let assignedScope;
    if (!scope) {
      assignedScope = new Scope();
    } else {
      assignedScope = scope;
    }

    let assignedIsolationScope;
    if (!isolationScope) {
      assignedIsolationScope = new Scope();
    } else {
      assignedIsolationScope = isolationScope;
    }

    // scope stack for domains or the process
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

    if (isThenable(maybePromiseResult)) {
      // @ts-expect-error - isThenable returns the wrong type
      return maybePromiseResult.then(
        res => {
          this._popScope();
          return res;
        },
        e => {
          this._popScope();
          throw e;
        },
      );
    }

    this._popScope();
    return maybePromiseResult;
  }

  /**
   * Get the client of the stack.
   */
   getClient() {
    return this.getStackTop().client ;
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
    return this._stack[this._stack.length - 1] ;
  }

  /**
   * Push a scope to the stack.
   */
   _pushScope() {
    // We want to clone the content of prev scope
    const scope = this.getScope().clone();
    this._stack.push({
      client: this.getClient(),
      scope,
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
}

/**
 * Get the global async context stack.
 * This will be removed during the v8 cycle and is only here to make migration easier.
 */
function getAsyncContextStack() {
  const registry = getMainCarrier();
  const sentry = getSentryCarrier(registry);

  return (sentry.stack = sentry.stack || new AsyncContextStack(getDefaultCurrentScope(), getDefaultIsolationScope()));
}

function withScope(callback) {
  return getAsyncContextStack().withScope(callback);
}

function withSetScope(scope, callback) {
  const stack = getAsyncContextStack() ;
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
    withIsolationScope,
    withScope,
    withSetScope,
    withSetIsolationScope: (_isolationScope, callback) => {
      return withIsolationScope(callback);
    },
    getCurrentScope: () => getAsyncContextStack().getScope(),
    getIsolationScope: () => getAsyncContextStack().getIsolationScope(),
  };
}

/**
 * Get the current async context strategy.
 * If none has been setup, the default will be used.
 */
function getAsyncContextStrategy(carrier) {
  const sentry = getSentryCarrier(carrier);

  if (sentry.acs) {
    return sentry.acs;
  }

  // Otherwise, use the default one (stack)
  return getStackAsyncContextStrategy();
}

/**
 * Get the currently active scope.
 */
function getCurrentScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getCurrentScope();
}

/**
 * Get the currently active isolation scope.
 * The isolation scope is active for the current execution context.
 */
function getIsolationScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getIsolationScope();
}

/**
 * Get the global scope.
 * This scope is applied to _all_ events.
 */
function getGlobalScope() {
  return getGlobalSingleton('globalScope', () => new Scope());
}

/**
 * Get the currently active client.
 */
function getClient() {
  return getCurrentScope().getClient();
}

/**
 * key: bucketKey
 * value: [exportKey, MetricSummary]
 */

const METRICS_SPAN_FIELD = '_sentryMetrics';

/**
 * Fetches the metric summary if it exists for the passed span
 */
function getMetricSummaryJsonForSpan(span) {
  const storage = (span )[METRICS_SPAN_FIELD];

  if (!storage) {
    return undefined;
  }
  const output = {};

  for (const [, [exportKey, summary]] of storage) {
    const arr = output[exportKey] || (output[exportKey] = []);
    arr.push(dropUndefinedKeys(summary));
  }

  return output;
}

/**
 * Use this attribute to represent the source of a span.
 * Should be one of: custom, url, route, view, component, task, unknown
 *
 */
const SEMANTIC_ATTRIBUTE_SENTRY_SOURCE = 'sentry.source';

/**
 * Use this attribute to represent the sample rate used for a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = 'sentry.sample_rate';

/**
 * Use this attribute to represent the operation of a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_OP = 'sentry.op';

/**
 * Use this attribute to represent the origin of a span.
 */
const SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = 'sentry.origin';

const SPAN_STATUS_UNSET = 0;
const SPAN_STATUS_OK = 1;

const SENTRY_BAGGAGE_KEY_PREFIX = 'sentry-';

const SENTRY_BAGGAGE_KEY_PREFIX_REGEX = /^sentry-/;

/**
 * Takes a baggage header and turns it into Dynamic Sampling Context, by extracting all the "sentry-" prefixed values
 * from it.
 *
 * @param baggageHeader A very bread definition of a baggage header as it might appear in various frameworks.
 * @returns The Dynamic Sampling Context that was found on `baggageHeader`, if there was any, `undefined` otherwise.
 */
function baggageHeaderToDynamicSamplingContext(
  // Very liberal definition of what any incoming header might look like
  baggageHeader,
) {
  const baggageObject = parseBaggageHeader(baggageHeader);

  if (!baggageObject) {
    return undefined;
  }

  // Read all "sentry-" prefixed values out of the baggage object and put it onto a dynamic sampling context object.
  const dynamicSamplingContext = Object.entries(baggageObject).reduce((acc, [key, value]) => {
    if (key.match(SENTRY_BAGGAGE_KEY_PREFIX_REGEX)) {
      const nonPrefixedKey = key.slice(SENTRY_BAGGAGE_KEY_PREFIX.length);
      acc[nonPrefixedKey] = value;
    }
    return acc;
  }, {});

  // Only return a dynamic sampling context object if there are keys in it.
  // A keyless object means there were no sentry values on the header, which means that there is no DSC.
  if (Object.keys(dynamicSamplingContext).length > 0) {
    return dynamicSamplingContext ;
  } else {
    return undefined;
  }
}

/**
 * Take a baggage header and parse it into an object.
 */
function parseBaggageHeader(
  baggageHeader,
) {
  if (!baggageHeader || (!isString(baggageHeader) && !Array.isArray(baggageHeader))) {
    return undefined;
  }

  if (Array.isArray(baggageHeader)) {
    // Combine all baggage headers into one object containing the baggage values so we can later read the Sentry-DSC-values from it
    return baggageHeader.reduce((acc, curr) => {
      const currBaggageObject = baggageHeaderToObject(curr);
      Object.entries(currBaggageObject).forEach(([key, value]) => {
        acc[key] = value;
      });
      return acc;
    }, {});
  }

  return baggageHeaderToObject(baggageHeader);
}

/**
 * Will parse a baggage header, which is a simple key-value map, into a flat object.
 *
 * @param baggageHeader The baggage header to parse.
 * @returns a flat object containing all the key-value pairs from `baggageHeader`.
 */
function baggageHeaderToObject(baggageHeader) {
  return baggageHeader
    .split(',')
    .map(baggageEntry => baggageEntry.split('=').map(keyOrValue => decodeURIComponent(keyOrValue.trim())))
    .reduce((acc, [key, value]) => {
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

const TRACE_FLAG_SAMPLED = 0x1;

/**
 * Convert a span to a trace context, which can be sent as the `trace` context in a non-transaction event.
 */
function spanToTraceContext(span) {
  const { spanId, traceId: trace_id, isRemote } = span.spanContext();

  // If the span is remote, we use a random/virtual span as span_id to the trace context,
  // and the remote span as parent_span_id
  const parent_span_id = isRemote ? spanId : spanToJSON(span).parent_span_id;
  const span_id = isRemote ? generateSpanId() : spanId;

  return dropUndefinedKeys({
    parent_span_id,
    span_id,
    trace_id,
  });
}

/**
 * Convert a span time input into a timestamp in seconds.
 */
function spanTimeInputToSeconds(input) {
  if (typeof input === 'number') {
    return ensureTimestampInSeconds(input);
  }

  if (Array.isArray(input)) {
    // See {@link HrTime} for the array-based time format
    return input[0] + input[1] / 1e9;
  }

  if (input instanceof Date) {
    return ensureTimestampInSeconds(input.getTime());
  }

  return timestampInSeconds();
}

/**
 * Converts a timestamp to second, if it was in milliseconds, or keeps it as second.
 */
function ensureTimestampInSeconds(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp / 1000 : timestamp;
}

/**
 * Convert a span to a JSON representation.
 */
// Note: Because of this, we currently have a circular type dependency (which we opted out of in package.json).
// This is not avoidable as we need `spanToJSON` in `spanUtils.ts`, which in turn is needed by `span.ts` for backwards compatibility.
// And `spanToJSON` needs the Span class from `span.ts` to check here.
function spanToJSON(span) {
  if (spanIsSentrySpan(span)) {
    return span.getSpanJSON();
  }

  try {
    const { spanId: span_id, traceId: trace_id } = span.spanContext();

    // Handle a span from @opentelemetry/sdk-base-trace's `Span` class
    if (spanIsOpenTelemetrySdkTraceBaseSpan(span)) {
      const { attributes, startTime, name, endTime, parentSpanId, status } = span;

      return dropUndefinedKeys({
        span_id,
        trace_id,
        data: attributes,
        description: name,
        parent_span_id: parentSpanId,
        start_timestamp: spanTimeInputToSeconds(startTime),
        // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
        timestamp: spanTimeInputToSeconds(endTime) || undefined,
        status: getStatusMessage(status),
        op: attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
        origin: attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
        _metrics_summary: getMetricSummaryJsonForSpan(span),
      });
    }

    // Finally, at least we have `spanContext()`....
    return {
      span_id,
      trace_id,
    };
  } catch (e) {
    return {};
  }
}

function spanIsOpenTelemetrySdkTraceBaseSpan(span) {
  const castSpan = span ;
  return !!castSpan.attributes && !!castSpan.startTime && !!castSpan.name && !!castSpan.endTime && !!castSpan.status;
}

/** Exported only for tests. */

/**
 * Sadly, due to circular dependency checks we cannot actually import the Span class here and check for instanceof.
 * :( So instead we approximate this by checking if it has the `getSpanJSON` method.
 */
function spanIsSentrySpan(span) {
  return typeof (span ).getSpanJSON === 'function';
}

/**
 * Returns true if a span is sampled.
 * In most cases, you should just use `span.isRecording()` instead.
 * However, this has a slightly different semantic, as it also returns false if the span is finished.
 * So in the case where this distinction is important, use this method.
 */
function spanIsSampled(span) {
  // We align our trace flags with the ones OpenTelemetry use
  // So we also check for sampled the same way they do.
  const { traceFlags } = span.spanContext();
  return traceFlags === TRACE_FLAG_SAMPLED;
}

/** Get the status message to use for a JSON representation of a span. */
function getStatusMessage(status) {
  if (!status || status.code === SPAN_STATUS_UNSET) {
    return undefined;
  }

  if (status.code === SPAN_STATUS_OK) {
    return 'ok';
  }

  return status.message || 'unknown_error';
}
const ROOT_SPAN_FIELD = '_sentryRootSpan';

/**
 * Returns the root span of a given span.
 */
function getRootSpan(span) {
  return span[ROOT_SPAN_FIELD] || span;
}

/**
 * Returns the currently active span.
 */
function getActiveSpan() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  if (acs.getActiveSpan) {
    return acs.getActiveSpan();
  }

  return _getSpanForScope(getCurrentScope());
}

// Treeshakable guard to remove all code related to tracing

/**
 * Determines if tracing is currently enabled.
 *
 * Tracing is enabled when at least one of `tracesSampleRate` and `tracesSampler` is defined in the SDK config.
 */
function hasTracingEnabled(
  maybeOptions,
) {
  if (typeof __SENTRY_TRACING__ === 'boolean' && !__SENTRY_TRACING__) {
    return false;
  }

  const client = getClient();
  const options = (client && client.getOptions());
  // eslint-disable-next-line deprecation/deprecation
  return !!options && (options.enableTracing || 'tracesSampleRate' in options || 'tracesSampler' in options);
}

const DEFAULT_ENVIRONMENT = 'production';

/**
 * If you change this value, also update the terser plugin config to
 * avoid minification of the object property!
 */
const FROZEN_DSC_FIELD = '_frozenDsc';

/**
 * Creates a dynamic sampling context from a client.
 *
 * Dispatches the `createDsc` lifecycle hook as a side effect.
 */
function getDynamicSamplingContextFromClient(trace_id, client) {
  const options = client.getOptions();

  const { publicKey: public_key } = client.getDsn() || {};

  const dsc = dropUndefinedKeys({
    environment: options.environment || DEFAULT_ENVIRONMENT,
    release: options.release,
    public_key,
    trace_id,
  }) ;

  client.emit('createDsc', dsc);

  return dsc;
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
  if (!client) {
    return {};
  }

  const rootSpan = getRootSpan(span);

  // For core implementation, we freeze the DSC onto the span as a non-enumerable property
  const frozenDsc = (rootSpan )[FROZEN_DSC_FIELD];
  if (frozenDsc) {
    return frozenDsc;
  }

  // For OpenTelemetry, we freeze the DSC on the trace state
  const traceState = rootSpan.spanContext().traceState;
  const traceStateDsc = traceState && traceState.get('sentry.dsc');

  // If the span has a DSC, we want it to take precedence
  const dscOnTraceState = traceStateDsc && baggageHeaderToDynamicSamplingContext(traceStateDsc);

  if (dscOnTraceState) {
    return dscOnTraceState;
  }

  // Else, we generate it from the span
  const dsc = getDynamicSamplingContextFromClient(span.spanContext().traceId, client);
  const jsonSpan = spanToJSON(rootSpan);
  const attributes = jsonSpan.data || {};
  const maybeSampleRate = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE];

  if (maybeSampleRate != null) {
    dsc.sample_rate = `${maybeSampleRate}`;
  }

  // We don't want to have a transaction name in the DSC if the source is "url" because URLs might contain PII
  const source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

  // after JSON conversion, txn.name becomes jsonSpan.description
  const name = jsonSpan.description;
  if (source !== 'url' && name) {
    dsc.transaction = name;
  }

  // How can we even land here with hasTracingEnabled() returning false?
  // Otel creates a Non-recording span in Tracing Without Performance mode when handling incoming requests
  // So we end up with an active span that is not sampled (neither positively nor negatively)
  if (hasTracingEnabled()) {
    dsc.sampled = String(spanIsSampled(rootSpan));
  }

  client.emit('createDsc', dsc, rootSpan);

  return dsc;
}

/**
 * Parse a sample rate from a given value.
 * This will either return a boolean or number sample rate, if the sample rate is valid (between 0 and 1).
 * If a string is passed, we try to convert it to a number.
 *
 * Any invalid sample rate will return `undefined`.
 */
function parseSampleRate(sampleRate) {
  if (typeof sampleRate === 'boolean') {
    return Number(sampleRate);
  }

  const rate = typeof sampleRate === 'string' ? parseFloat(sampleRate) : sampleRate;
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0 || rate > 1) {
    logger$1.warn(
        `[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
          sampleRate,
        )} of type ${JSON.stringify(typeof sampleRate)}.`,
      );
    return undefined;
  }

  return rate;
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
  return (
    `${protocol}://${publicKey}${withPassword && pass ? `:${pass}` : ''}` +
    `@${host}${port ? `:${port}` : ''}/${path ? `${path}/` : path}${projectId}`
  );
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Helper to decycle json objects
 *
 * @deprecated This function is deprecated and will be removed in the next major version.
 */
// TODO(v9): Move this function into normalize() directly
function memoBuilder() {
  const hasWeakSet = typeof WeakSet === 'function';
  const inner = hasWeakSet ? new WeakSet() : [];
  function memoize(obj) {
    if (hasWeakSet) {
      if (inner.has(obj)) {
        return true;
      }
      inner.add(obj);
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < inner.length; i++) {
      const value = inner[i];
      if (value === obj) {
        return true;
      }
    }
    inner.push(obj);
    return false;
  }

  function unmemoize(obj) {
    if (hasWeakSet) {
      inner.delete(obj);
    } else {
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === obj) {
          inner.splice(i, 1);
          break;
        }
      }
    }
  }
  return [memoize, unmemoize];
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(input, depth = 100, maxProperties = +Infinity) {
  try {
    // since we're at the outermost level, we don't provide a key
    return visit('', input, depth, maxProperties);
  } catch (err) {
    return { ERROR: `**non-serializable** (${err})` };
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
function visit(
  key,
  value,
  depth = +Infinity,
  maxProperties = +Infinity,
  // eslint-disable-next-line deprecation/deprecation
  memo = memoBuilder(),
) {
  const [memoize, unmemoize] = memo;

  // Get the simple cases out of the way first
  if (
    value == null || // this matches null and undefined -> eqeq not eqeqeq
    ['boolean', 'string'].includes(typeof value) ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value ;
  }

  const stringified = stringifyValue(key, value);

  // Anything we could potentially dig into more (objects or arrays) will have come back as `"[object XXXX]"`.
  // Everything else will have already been serialized, so if we don't see that pattern, we're done.
  if (!stringified.startsWith('[object ')) {
    return stringified;
  }

  // From here on, we can assert that `value` is either an object or an array.

  // Do not normalize objects that we know have already been normalized. As a general rule, the
  // "__sentry_skip_normalization__" property should only be used sparingly and only should only be set on objects that
  // have already been normalized.
  if ((value )['__sentry_skip_normalization__']) {
    return value ;
  }

  // We can set `__sentry_override_normalization_depth__` on an object to ensure that from there
  // We keep a certain amount of depth.
  // This should be used sparingly, e.g. we use it for the redux integration to ensure we get a certain amount of state.
  const remainingDepth =
    typeof (value )['__sentry_override_normalization_depth__'] === 'number'
      ? ((value )['__sentry_override_normalization_depth__'] )
      : depth;

  // We're also done if we've reached the max depth
  if (remainingDepth === 0) {
    // At this point we know `serialized` is a string of the form `"[object XXXX]"`. Clean it up so it's just `"[XXXX]"`.
    return stringified.replace('object ', '');
  }

  // If we've already visited this branch, bail out, as it's circular reference. If not, note that we're seeing it now.
  if (memoize(value)) {
    return '[Circular ~]';
  }

  // If the value has a `toJSON` method, we call it to extract more information
  const valueWithToJSON = value ;
  if (valueWithToJSON && typeof valueWithToJSON.toJSON === 'function') {
    try {
      const jsonValue = valueWithToJSON.toJSON();
      // We need to normalize the return value of `.toJSON()` in case it has circular references
      return visit('', jsonValue, remainingDepth - 1, maxProperties, memo);
    } catch (err) {
      // pass (The built-in `toJSON` failed, but we can still try to do it ourselves)
    }
  }

  // At this point we know we either have an object or an array, we haven't seen it before, and we're going to recurse
  // because we haven't yet reached the max depth. Create an accumulator to hold the results of visiting each
  // property/entry, and keep track of the number of items we add to it.
  const normalized = (Array.isArray(value) ? [] : {}) ;
  let numAdded = 0;

  // Before we begin, convert`Error` and`Event` instances into plain objects, since some of each of their relevant
  // properties are non-enumerable and otherwise would get missed.
  const visitable = convertToPlainObject(value );

  for (const visitKey in visitable) {
    // Avoid iterating over fields in the prototype if they've somehow been exposed to enumeration.
    if (!Object.prototype.hasOwnProperty.call(visitable, visitKey)) {
      continue;
    }

    if (numAdded >= maxProperties) {
      normalized[visitKey] = '[MaxProperties ~]';
      break;
    }

    // Recursively visit all the child nodes
    const visitValue = visitable[visitKey];
    normalized[visitKey] = visit(visitKey, visitValue, remainingDepth - 1, maxProperties, memo);

    numAdded++;
  }

  // Once we've visited all the branches, remove the parent from memo storage
  unmemoize(value);

  // Return accumulated values
  return normalized;
}

/* eslint-disable complexity */
/**
 * Stringify the given value. Handles various known special values and types.
 *
 * Not meant to be used on simple primitives which already have a string representation, as it will, for example, turn
 * the number 1231 into "[Object Number]", nor on `null`, as it will throw.
 *
 * @param value The value to stringify
 * @returns A stringified representation of the given value
 */
function stringifyValue(
  key,
  // this type is a tiny bit of a cheat, since this function does handle NaN (which is technically a number), but for
  // our internal use, it'll do
  value,
) {
  try {
    if (key === 'domain' && value && typeof value === 'object' && (value )._events) {
      return '[Domain]';
    }

    if (key === 'domainEmitter') {
      return '[DomainEmitter]';
    }

    // It's safe to use `global`, `window`, and `document` here in this manner, as we are asserting using `typeof` first
    // which won't throw if they are not present.

    if (typeof global !== 'undefined' && value === global) {
      return '[Global]';
    }

    // eslint-disable-next-line no-restricted-globals
    if (typeof window !== 'undefined' && value === window) {
      return '[Window]';
    }

    // eslint-disable-next-line no-restricted-globals
    if (typeof document !== 'undefined' && value === document) {
      return '[Document]';
    }

    if (isVueViewModel(value)) {
      return '[VueViewModel]';
    }

    // React's SyntheticEvent thingy
    if (isSyntheticEvent(value)) {
      return '[SyntheticEvent]';
    }

    if (typeof value === 'number' && !Number.isFinite(value)) {
      return `[${value}]`;
    }

    if (typeof value === 'function') {
      return `[Function: ${getFunctionName(value)}]`;
    }

    if (typeof value === 'symbol') {
      return `[${String(value)}]`;
    }

    // stringified BigInts are indistinguishable from regular numbers, so we need to label them to avoid confusion
    if (typeof value === 'bigint') {
      return `[BigInt: ${String(value)}]`;
    }

    // Now that we've knocked out all the special cases and the primitives, all we have left are objects. Simply casting
    // them to strings means that instances of classes which haven't defined their `toStringTag` will just come out as
    // `"[object Object]"`. If we instead look at the constructor's name (which is the same as the name of the class),
    // we can make sure that only plain objects come out that way.
    const objName = getConstructorName(value);

    // Handle HTML Elements
    if (/^HTML(\w*)Element$/.test(objName)) {
      return `[HTMLElement: ${objName}]`;
    }

    return `[object ${objName}]`;
  } catch (err) {
    return `**non-serializable** (${err})`;
  }
}
/* eslint-enable complexity */

function getConstructorName(value) {
  const prototype = Object.getPrototypeOf(value);

  return prototype ? prototype.constructor.name : 'null prototype';
}

/**
 * Creates an envelope.
 * Make sure to always explicitly provide the generic to this function
 * so that the envelope types resolve correctly.
 */
function createEnvelope(headers, items = []) {
  return [headers, items] ;
}

/** Extracts the minimal SDK info from the metadata or an events */
function getSdkMetadataForEnvelopeHeader(metadataOrEvent) {
  if (!metadataOrEvent || !metadataOrEvent.sdk) {
    return;
  }
  const { name, version } = metadataOrEvent.sdk;
  return { name, version };
}

/**
 * Creates event envelope headers, based on event, sdk info and tunnel
 * Note: This function was extracted from the core package to make it available in Replay
 */
function createEventEnvelopeHeaders(
  event,
  sdkInfo,
  tunnel,
  dsn,
) {
  const dynamicSamplingContext = event.sdkProcessingMetadata && event.sdkProcessingMetadata.dynamicSamplingContext;
  return {
    event_id: event.event_id ,
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
    ...(dynamicSamplingContext && {
      trace: dropUndefinedKeys({ ...dynamicSamplingContext }),
    }),
  };
}

/**
 * Process an array of event processors, returning the processed event (or `null` if the event was dropped).
 */
function notifyEventProcessors(
  processors,
  event,
  hint,
  index = 0,
) {
  return new SyncPromise((resolve, reject) => {
    const processor = processors[index];
    if (event === null || typeof processor !== 'function') {
      resolve(event);
    } else {
      const result = processor({ ...event }, hint) ;

      processor.id && result === null && logger$1.log(`Event processor "${processor.id}" dropped event`);

      if (isThenable(result)) {
        void result
          .then(final => notifyEventProcessors(processors, final, hint, index + 1).then(resolve))
          .then(null, reject);
      } else {
        void notifyEventProcessors(processors, result, hint, index + 1)
          .then(resolve)
          .then(null, reject);
      }
    }
  });
}

let parsedStackResults;
let lastKeysCount;
let cachedFilenameDebugIds;

/**
 * Returns a map of filenames to debug identifiers.
 */
function getFilenameToDebugIdMap(stackParser) {
  const debugIdMap = GLOBAL_OBJ._sentryDebugIds;
  if (!debugIdMap) {
    return {};
  }

  const debugIdKeys = Object.keys(debugIdMap);

  // If the count of registered globals hasn't changed since the last call, we
  // can just return the cached result.
  if (cachedFilenameDebugIds && debugIdKeys.length === lastKeysCount) {
    return cachedFilenameDebugIds;
  }

  lastKeysCount = debugIdKeys.length;

  // Build a map of filename -> debug_id.
  cachedFilenameDebugIds = debugIdKeys.reduce((acc, stackKey) => {
    if (!parsedStackResults) {
      parsedStackResults = {};
    }

    const result = parsedStackResults[stackKey];

    if (result) {
      acc[result[0]] = result[1];
    } else {
      const parsedStack = stackParser(stackKey);

      for (let i = parsedStack.length - 1; i >= 0; i--) {
        const stackFrame = parsedStack[i];
        const filename = stackFrame && stackFrame.filename;
        const debugId = debugIdMap[stackKey];

        if (filename && debugId) {
          acc[filename] = debugId;
          parsedStackResults[stackKey] = [filename, debugId];
          break;
        }
      }
    }

    return acc;
  }, {});

  return cachedFilenameDebugIds;
}

/**
 * Applies data from the scope to the event and runs all event processors on it.
 */
function applyScopeDataToEvent(event, data) {
  const { fingerprint, span, breadcrumbs, sdkProcessingMetadata } = data;

  // Apply general data
  applyDataToEvent(event, data);

  // We want to set the trace context for normal events only if there isn't already
  // a trace context on the event. There is a product feature in place where we link
  // errors with transaction and it relies on that.
  if (span) {
    applySpanToEvent(event, span);
  }

  applyFingerprintToEvent(event, fingerprint);
  applyBreadcrumbsToEvent(event, breadcrumbs);
  applySdkMetadataToEvent(event, sdkProcessingMetadata);
}

/** Merge data of two scopes together. */
function mergeScopeData(data, mergeData) {
  const {
    extra,
    tags,
    user,
    contexts,
    level,
    sdkProcessingMetadata,
    breadcrumbs,
    fingerprint,
    eventProcessors,
    attachments,
    propagationContext,
    transactionName,
    span,
  } = mergeData;

  mergeAndOverwriteScopeData(data, 'extra', extra);
  mergeAndOverwriteScopeData(data, 'tags', tags);
  mergeAndOverwriteScopeData(data, 'user', user);
  mergeAndOverwriteScopeData(data, 'contexts', contexts);

  data.sdkProcessingMetadata = merge(data.sdkProcessingMetadata, sdkProcessingMetadata, 2);

  if (level) {
    data.level = level;
  }

  if (transactionName) {
    data.transactionName = transactionName;
  }

  if (span) {
    data.span = span;
  }

  if (breadcrumbs.length) {
    data.breadcrumbs = [...data.breadcrumbs, ...breadcrumbs];
  }

  if (fingerprint.length) {
    data.fingerprint = [...data.fingerprint, ...fingerprint];
  }

  if (eventProcessors.length) {
    data.eventProcessors = [...data.eventProcessors, ...eventProcessors];
  }

  if (attachments.length) {
    data.attachments = [...data.attachments, ...attachments];
  }

  data.propagationContext = { ...data.propagationContext, ...propagationContext };
}

/**
 * Merges certain scope data. Undefined values will overwrite any existing values.
 * Exported only for tests.
 */
function mergeAndOverwriteScopeData

(data, prop, mergeVal) {
  data[prop] = merge(data[prop], mergeVal, 1);
}

function applyDataToEvent(event, data) {
  const { extra, tags, user, contexts, level, transactionName } = data;

  const cleanedExtra = dropUndefinedKeys(extra);
  if (cleanedExtra && Object.keys(cleanedExtra).length) {
    event.extra = { ...cleanedExtra, ...event.extra };
  }

  const cleanedTags = dropUndefinedKeys(tags);
  if (cleanedTags && Object.keys(cleanedTags).length) {
    event.tags = { ...cleanedTags, ...event.tags };
  }

  const cleanedUser = dropUndefinedKeys(user);
  if (cleanedUser && Object.keys(cleanedUser).length) {
    event.user = { ...cleanedUser, ...event.user };
  }

  const cleanedContexts = dropUndefinedKeys(contexts);
  if (cleanedContexts && Object.keys(cleanedContexts).length) {
    event.contexts = { ...cleanedContexts, ...event.contexts };
  }

  if (level) {
    event.level = level;
  }

  // transaction events get their `transaction` from the root span name
  if (transactionName && event.type !== 'transaction') {
    event.transaction = transactionName;
  }
}

function applyBreadcrumbsToEvent(event, breadcrumbs) {
  const mergedBreadcrumbs = [...(event.breadcrumbs || []), ...breadcrumbs];
  event.breadcrumbs = mergedBreadcrumbs.length ? mergedBreadcrumbs : undefined;
}

function applySdkMetadataToEvent(event, sdkProcessingMetadata) {
  event.sdkProcessingMetadata = {
    ...event.sdkProcessingMetadata,
    ...sdkProcessingMetadata,
  };
}

function applySpanToEvent(event, span) {
  event.contexts = {
    trace: spanToTraceContext(span),
    ...event.contexts,
  };

  event.sdkProcessingMetadata = {
    dynamicSamplingContext: getDynamicSamplingContextFromSpan(span),
    ...event.sdkProcessingMetadata,
  };

  const rootSpan = getRootSpan(span);
  const transactionName = spanToJSON(rootSpan).description;
  if (transactionName && !event.transaction && event.type === 'transaction') {
    event.transaction = transactionName;
  }
}

/**
 * Applies fingerprint from the scope to the event if there's one,
 * uses message if there's one instead or get rid of empty fingerprint
 */
function applyFingerprintToEvent(event, fingerprint) {
  // Make sure it's an array first and we actually have something in place
  event.fingerprint = event.fingerprint
    ? Array.isArray(event.fingerprint)
      ? event.fingerprint
      : [event.fingerprint]
    : [];

  // If we have something on the scope, then merge it with event
  if (fingerprint) {
    event.fingerprint = event.fingerprint.concat(fingerprint);
  }

  // If we have no data at all, remove empty array default
  if (event.fingerprint && !event.fingerprint.length) {
    delete event.fingerprint;
  }
}

/**
 * This type makes sure that we get either a CaptureContext, OR an EventHint.
 * It does not allow mixing them, which could lead to unexpected outcomes, e.g. this is disallowed:
 * { user: { id: '123' }, mechanism: { handled: false } }
 */

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
 * @returns A new event with more information.
 * @hidden
 */
function prepareEvent(
  options,
  event,
  hint,
  scope,
  client,
  isolationScope,
) {
  const { normalizeDepth = 3, normalizeMaxBreadth = 1000 } = options;
  const prepared = {
    ...event,
    event_id: event.event_id || hint.event_id || uuid4(),
    timestamp: event.timestamp || dateTimestampInSeconds(),
  };
  const integrations = hint.integrations || options.integrations.map(i => i.name);

  applyClientOptions(prepared, options);
  applyIntegrationsMetadata(prepared, integrations);

  if (client) {
    client.emit('applyFrameMetadata', event);
  }

  // Only put debug IDs onto frames for error events.
  if (event.type === undefined) {
    applyDebugIds(prepared, options.stackParser);
  }

  // If we have scope given to us, use it as the base for further modifications.
  // This allows us to prevent unnecessary copying of data if `captureContext` is not provided.
  const finalScope = getFinalScope(scope, hint.captureContext);

  if (hint.mechanism) {
    addExceptionMechanism(prepared, hint.mechanism);
  }

  const clientEventProcessors = client ? client.getEventProcessors() : [];

  // This should be the last thing called, since we want that
  // {@link Scope.addEventProcessor} gets the finished prepared event.
  // Merge scope data together
  const data = getGlobalScope().getScopeData();

  if (isolationScope) {
    const isolationData = isolationScope.getScopeData();
    mergeScopeData(data, isolationData);
  }

  if (finalScope) {
    const finalScopeData = finalScope.getScopeData();
    mergeScopeData(data, finalScopeData);
  }

  const attachments = [...(hint.attachments || []), ...data.attachments];
  if (attachments.length) {
    hint.attachments = attachments;
  }

  applyScopeDataToEvent(prepared, data);

  const eventProcessors = [
    ...clientEventProcessors,
    // Run scope event processors _after_ all other processors
    ...data.eventProcessors,
  ];

  const result = notifyEventProcessors(eventProcessors, prepared, hint);

  return result.then(evt => {
    if (evt) {
      // We apply the debug_meta field only after all event processors have ran, so that if any event processors modified
      // file names (e.g.the RewriteFrames integration) the filename -> debug ID relationship isn't destroyed.
      // This should not cause any PII issues, since we're only moving data that is already on the event and not adding
      // any new data
      applyDebugMeta(evt);
    }

    if (typeof normalizeDepth === 'number' && normalizeDepth > 0) {
      return normalizeEvent(evt, normalizeDepth, normalizeMaxBreadth);
    }
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
  const { environment, release, dist, maxValueLength = 250 } = options;

  // empty strings do not make sense for environment, release, and dist
  // so we handle them the same as if they were not provided
  event.environment = event.environment || environment || DEFAULT_ENVIRONMENT;

  if (!event.release && release) {
    event.release = release;
  }

  if (!event.dist && dist) {
    event.dist = dist;
  }

  if (event.message) {
    event.message = truncate(event.message, maxValueLength);
  }

  const exception = event.exception && event.exception.values && event.exception.values[0];
  if (exception && exception.value) {
    exception.value = truncate(exception.value, maxValueLength);
  }

  const request = event.request;
  if (request && request.url) {
    request.url = truncate(request.url, maxValueLength);
  }
}

/**
 * Puts debug IDs into the stack frames of an error event.
 */
function applyDebugIds(event, stackParser) {
  // Build a map of filename -> debug_id
  const filenameDebugIdMap = getFilenameToDebugIdMap(stackParser);

  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    event.exception.values.forEach(exception => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      exception.stacktrace.frames.forEach(frame => {
        if (filenameDebugIdMap && frame.filename) {
          frame.debug_id = filenameDebugIdMap[frame.filename];
        }
      });
    });
  } catch (e) {
    // To save bundle size we're just try catching here instead of checking for the existence of all the different objects.
  }
}

/**
 * Moves debug IDs from the stack frames of an error event into the debug_meta field.
 */
function applyDebugMeta(event) {
  // Extract debug IDs and filenames from the stack frames on the event.
  const filenameDebugIdMap = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    event.exception.values.forEach(exception => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      exception.stacktrace.frames.forEach(frame => {
        if (frame.debug_id) {
          if (frame.abs_path) {
            filenameDebugIdMap[frame.abs_path] = frame.debug_id;
          } else if (frame.filename) {
            filenameDebugIdMap[frame.filename] = frame.debug_id;
          }
          delete frame.debug_id;
        }
      });
    });
  } catch (e) {
    // To save bundle size we're just try catching here instead of checking for the existence of all the different objects.
  }

  if (Object.keys(filenameDebugIdMap).length === 0) {
    return;
  }

  // Fill debug_meta information
  event.debug_meta = event.debug_meta || {};
  event.debug_meta.images = event.debug_meta.images || [];
  const images = event.debug_meta.images;
  Object.entries(filenameDebugIdMap).forEach(([filename, debug_id]) => {
    images.push({
      type: 'sourcemap',
      code_file: filename,
      debug_id,
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
    event.sdk.integrations = [...(event.sdk.integrations || []), ...integrationNames];
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
  if (!event) {
    return null;
  }

  const normalized = {
    ...event,
    ...(event.breadcrumbs && {
      breadcrumbs: event.breadcrumbs.map(b => ({
        ...b,
        ...(b.data && {
          data: normalize(b.data, depth, maxBreadth),
        }),
      })),
    }),
    ...(event.user && {
      user: normalize(event.user, depth, maxBreadth),
    }),
    ...(event.contexts && {
      contexts: normalize(event.contexts, depth, maxBreadth),
    }),
    ...(event.extra && {
      extra: normalize(event.extra, depth, maxBreadth),
    }),
  };

  // event.contexts.trace stores information about a Transaction. Similarly,
  // event.spans[] stores information about child Spans. Given that a
  // Transaction is conceptually a Span, normalization should apply to both
  // Transactions and Spans consistently.
  // For now the decision is to skip normalization of Transactions and Spans,
  // so this block overwrites the normalized event to add back the original
  // Transaction information prior to normalization.
  if (event.contexts && event.contexts.trace && normalized.contexts) {
    normalized.contexts.trace = event.contexts.trace;

    // event.contexts.trace.data may contain circular/dangerous data so we need to normalize it
    if (event.contexts.trace.data) {
      normalized.contexts.trace.data = normalize(event.contexts.trace.data, depth, maxBreadth);
    }
  }

  // event.spans[].data may contain circular/dangerous data so we need to normalize it
  if (event.spans) {
    normalized.spans = event.spans.map(span => {
      return {
        ...span,
        ...(span.data && {
          data: normalize(span.data, depth, maxBreadth),
        }),
      };
    });
  }

  // event.contexts.flags (FeatureFlagContext) stores context for our feature
  // flag integrations. It has a greater nesting depth than our other typed
  // Contexts, so we re-normalize with a fixed depth of 3 here. We do not want
  // to skip this in case of conflicting, user-provided context.
  if (event.contexts && event.contexts.flags && normalized.contexts) {
    normalized.contexts.flags = normalize(event.contexts.flags, 3, maxBreadth);
  }

  return normalized;
}

function getFinalScope(
  scope,
  captureContext,
) {
  if (!captureContext) {
    return scope;
  }

  const finalScope = scope ? scope.clone() : new Scope();
  finalScope.update(captureContext);
  return finalScope;
}

/**
 * Parse either an `EventHint` directly, or convert a `CaptureContext` to an `EventHint`.
 * This is used to allow to update method signatures that used to accept a `CaptureContext` but should now accept an `EventHint`.
 */
function parseEventHintOrCaptureContext(
  hint,
) {
  {
    return undefined;
  }
}

/**
 * Captures an exception event and sends it to Sentry.
 *
 * @param exception The exception to capture.
 * @param hint Optional additional data to attach to the Sentry event.
 * @returns the id of the captured Sentry event.
 */
function captureException(exception, hint) {
  return getCurrentScope().captureException(exception, parseEventHintOrCaptureContext());
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

// Intentionally keeping the key broad, as we don't know for sure what rate limit headers get returned from backend

const DEFAULT_RETRY_AFTER = 60 * 1000; // 60 seconds

/**
 * Extracts Retry-After value from the request header or returns default value
 * @param header string representation of 'Retry-After' header
 * @param now current unix timestamp
 *
 */
function parseRetryAfterHeader(header, now = Date.now()) {
  const headerDelay = parseInt(`${header}`, 10);
  if (!isNaN(headerDelay)) {
    return headerDelay * 1000;
  }

  const headerDate = Date.parse(`${header}`);
  if (!isNaN(headerDate)) {
    return headerDate - now;
  }

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
function isRateLimited(limits, dataCategory, now = Date.now()) {
  return disabledUntil(limits, dataCategory) > now;
}

/**
 * Update ratelimits from incoming headers.
 *
 * @return the updated RateLimits object.
 */
function updateRateLimits(
  limits,
  { statusCode, headers },
  now = Date.now(),
) {
  const updatedRateLimits = {
    ...limits,
  };

  // "The name is case-insensitive."
  // https://developer.mozilla.org/en-US/docs/Web/API/Headers/get
  const rateLimitHeader = headers && headers['x-sentry-rate-limits'];
  const retryAfterHeader = headers && headers['retry-after'];

  if (rateLimitHeader) {
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
    for (const limit of rateLimitHeader.trim().split(',')) {
      const [retryAfter, categories, , , namespaces] = limit.split(':', 5) ;
      const headerDelay = parseInt(retryAfter, 10);
      const delay = (!isNaN(headerDelay) ? headerDelay : 60) * 1000; // 60sec default
      if (!categories) {
        updatedRateLimits.all = now + delay;
      } else {
        for (const category of categories.split(';')) {
          if (category === 'metric_bucket') {
            // namespaces will be present when category === 'metric_bucket'
            if (!namespaces || namespaces.split(';').includes('custom')) {
              updatedRateLimits[category] = now + delay;
            }
          } else {
            updatedRateLimits[category] = now + delay;
          }
        }
      }
    }
  } else if (retryAfterHeader) {
    updatedRateLimits.all = now + parseRetryAfterHeader(retryAfterHeader, now);
  } else if (statusCode === 429) {
    updatedRateLimits.all = now + 60 * 1000;
  }

  return updatedRateLimits;
}

/**
 * Checks whether given url points to Sentry server
 *
 * @param url url to verify
 */
function isSentryRequestUrl(url, client) {
  const dsn = client && client.getDsn();
  const tunnel = client && client.getOptions().tunnel;
  return checkDsn(url, dsn) || checkTunnel(url, tunnel);
}

function checkTunnel(url, tunnel) {
  if (!tunnel) {
    return false;
  }

  return removeTrailingSlash(url) === removeTrailingSlash(tunnel);
}

function checkDsn(url, dsn) {
  return dsn ? url.includes(dsn.host) : false;
}

function removeTrailingSlash(str) {
  return str[str.length - 1] === '/' ? str.slice(0, -1) : str;
}

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

  const timestamp = dateTimestampInSeconds();
  const mergedBreadcrumb = { timestamp, ...breadcrumb };
  const finalBreadcrumb = beforeBreadcrumb
    ? (consoleSandbox(() => beforeBreadcrumb(mergedBreadcrumb, hint)) )
    : mergedBreadcrumb;

  if (finalBreadcrumb === null) return;

  if (client.emit) {
    client.emit('beforeAddBreadcrumb', finalBreadcrumb, hint);
  }

  isolationScope.addBreadcrumb(finalBreadcrumb, maxBreadcrumbs);
}

/**
 * @deprecated This variable has been deprecated and will be removed in the next major version.
 */

/**
 * Converts a string-based level into a `SeverityLevel`, normalizing it along the way.
 *
 * @param level String representation of desired `SeverityLevel`.
 * @returns The `SeverityLevel` corresponding to the given string, or 'log' if the string isn't a valid level.
 */
function severityLevelFromString(level) {
  return (
    level === 'warn' ? 'warning' : ['fatal', 'error', 'warning', 'log', 'info', 'debug'].includes(level) ? level : 'log'
  ) ;
}

/**
 * isNative checks if the given function is a native implementation
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function isNativeFunction(func) {
  return func && /^function\s+\w+\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
}

/*
 * This module exists for optimizations in the build process through rollup and terser.  We define some global
 * constants, which can be overridden during build. By guarding certain pieces of code with functions that return these
 * constants, we can control whether or not they appear in the final bundle. (Any code guarded by a false condition will
 * never run, and will hence be dropped during treeshaking.) The two primary uses for this are stripping out calls to
 * `logger` and preventing node-related code from appearing in browser bundles.
 *
 * Attention:
 * This file should not be used to define constants/flags that are intended to be used for tree-shaking conducted by
 * users. These flags should live in their respective packages, as we identified user tooling (specifically webpack)
 * having issues tree-shaking these constants across package boundaries.
 * An example for this is the true constant. It is declared in each package individually because we want
 * users to be able to shake away expressions that it guards.
 */

/**
 * Figures out if we're building a browser bundle.
 *
 * @returns true if this is a browser bundle build.
 */
function isBrowserBundle() {
  return !!true;
}

/**
 * NOTE: In order to avoid circular dependencies, if you add a function to this module and it needs to print something,
 * you must either a) use `console.log` rather than the logger, or b) put your function elsewhere.
 */

/**
 * Checks whether we're in the Node.js or Browser environment
 *
 * @returns Answer to given question
 */
function isNodeEnv() {
  // explicitly check for browser bundles as those can be optimized statically
  // by terser/rollup.
  return (
    !isBrowserBundle()
  );
}

/**
 * Returns true if we are in the browser.
 */
function isBrowser() {
  // eslint-disable-next-line no-restricted-globals
  return typeof window !== 'undefined' && (!isNodeEnv());
}

// Based on https://github.com/angular/angular.js/pull/13945/files
// The MIT License

const WINDOW$2 = GLOBAL_OBJ ;

/**
 * Tells whether current environment supports History API
 * {@link supportsHistory}.
 *
 * @returns Answer to the given question.
 */
function supportsHistory() {
  // NOTE: in Chrome App environment, touching history.pushState, *even inside
  //       a try/catch block*, will cause Chrome to output an error to console.error
  // borrowed from: https://github.com/angular/angular.js/pull/13945/files
  // TODO(v9): Remove this custom check, it is pretty old and likely not needed anymore
  const chromeVar = (WINDOW$2 ).chrome;
  const isChromePackagedApp = chromeVar && chromeVar.app && chromeVar.app.runtime;
  const hasHistoryApi = 'history' in WINDOW$2 && !!WINDOW$2.history.pushState && !!WINDOW$2.history.replaceState;

  return !isChromePackagedApp && hasHistoryApi;
}

// exporting a separate copy of `WINDOW` rather than exporting the one from `@sentry/browser`
// prevents the browser package from being bundled in the CDN bundle, and avoids a
// circular dependency between the browser and replay packages should `@sentry/browser` import
// from `@sentry/replay` in the future
const WINDOW$1 = GLOBAL_OBJ ;

const REPLAY_SESSION_KEY = 'sentryReplaySession';
const REPLAY_EVENT_NAME = 'replay_event';
const UNABLE_TO_SEND_REPLAY = 'Unable to send Replay';

// The idle limit for a session after which recording is paused.
const SESSION_IDLE_PAUSE_DURATION = 300000; // 5 minutes in ms

// The idle limit for a session after which the session expires.
const SESSION_IDLE_EXPIRE_DURATION = 900000; // 15 minutes in ms

/** Default flush delays */
const DEFAULT_FLUSH_MIN_DELAY = 5000;
// XXX: Temp fix for our debounce logic where `maxWait` would never occur if it
// was the same as `wait`
const DEFAULT_FLUSH_MAX_DELAY = 5500;

/* How long to wait for error checkouts */
const BUFFER_CHECKOUT_TIME = 60000;

const RETRY_BASE_INTERVAL = 5000;
const RETRY_MAX_COUNT = 3;

/* The max (uncompressed) size in bytes of a network body. Any body larger than this will be truncated. */
const NETWORK_BODY_MAX_SIZE = 150000;

/* The max size of a single console arg that is captured. Any arg larger than this will be truncated. */
const CONSOLE_ARG_MAX_SIZE = 5000;

/* Min. time to wait before we consider something a slow click. */
const SLOW_CLICK_THRESHOLD = 3000;
/* For scroll actions after a click, we only look for a very short time period to detect programmatic scrolling. */
const SLOW_CLICK_SCROLL_TIMEOUT = 300;

/** When encountering a total segment size exceeding this size, stop the replay (as we cannot properly ingest it). */
const REPLAY_MAX_EVENT_BUFFER_SIZE = 20000000; // ~20MB

/** Replays must be min. 5s long before we send them. */
const MIN_REPLAY_DURATION = 4999;
/* The max. allowed value that the minReplayDuration can be set to. */
const MIN_REPLAY_DURATION_LIMIT = 15000;

/** The max. length of a replay. */
const MAX_REPLAY_DURATION = 3600000; // 60 minutes in ms;

function _nullishCoalesce$1(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var NodeType$3;
(function (NodeType) {
    NodeType[NodeType["Document"] = 0] = "Document";
    NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
    NodeType[NodeType["Element"] = 2] = "Element";
    NodeType[NodeType["Text"] = 3] = "Text";
    NodeType[NodeType["CDATA"] = 4] = "CDATA";
    NodeType[NodeType["Comment"] = 5] = "Comment";
})(NodeType$3 || (NodeType$3 = {}));

function isElement$1(n) {
    return n.nodeType === n.ELEMENT_NODE;
}
function isShadowRoot(n) {
    const host = _optionalChain$5([n, 'optionalAccess', _ => _.host]);
    return Boolean(_optionalChain$5([host, 'optionalAccess', _2 => _2.shadowRoot]) === n);
}
function isNativeShadowDom(shadowRoot) {
    return Object.prototype.toString.call(shadowRoot) === '[object ShadowRoot]';
}
function fixBrowserCompatibilityIssuesInCSS(cssText) {
    if (cssText.includes(' background-clip: text;') &&
        !cssText.includes(' -webkit-background-clip: text;')) {
        cssText = cssText.replace(/\sbackground-clip:\s*text;/g, ' -webkit-background-clip: text; background-clip: text;');
    }
    return cssText;
}
function escapeImportStatement(rule) {
    const { cssText } = rule;
    if (cssText.split('"').length < 3)
        return cssText;
    const statement = ['@import', `url(${JSON.stringify(rule.href)})`];
    if (rule.layerName === '') {
        statement.push(`layer`);
    }
    else if (rule.layerName) {
        statement.push(`layer(${rule.layerName})`);
    }
    if (rule.supportsText) {
        statement.push(`supports(${rule.supportsText})`);
    }
    if (rule.media.length) {
        statement.push(rule.media.mediaText);
    }
    return statement.join(' ') + ';';
}
function stringifyStylesheet(s) {
    try {
        const rules = s.rules || s.cssRules;
        return rules
            ? fixBrowserCompatibilityIssuesInCSS(Array.from(rules, stringifyRule).join(''))
            : null;
    }
    catch (error) {
        return null;
    }
}
function fixAllCssProperty(rule) {
    let styles = '';
    for (let i = 0; i < rule.style.length; i++) {
        const styleDeclaration = rule.style;
        const attribute = styleDeclaration[i];
        const isImportant = styleDeclaration.getPropertyPriority(attribute);
        styles += `${attribute}:${styleDeclaration.getPropertyValue(attribute)}${isImportant ? ` !important` : ''};`;
    }
    return `${rule.selectorText} { ${styles} }`;
}
function stringifyRule(rule) {
    let importStringified;
    if (isCSSImportRule(rule)) {
        try {
            importStringified =
                stringifyStylesheet(rule.styleSheet) ||
                    escapeImportStatement(rule);
        }
        catch (error) {
        }
    }
    else if (isCSSStyleRule(rule)) {
        let cssText = rule.cssText;
        const needsSafariColonFix = rule.selectorText.includes(':');
        const needsAllFix = typeof rule.style['all'] === 'string' && rule.style['all'];
        if (needsAllFix) {
            cssText = fixAllCssProperty(rule);
        }
        if (needsSafariColonFix) {
            cssText = fixSafariColons(cssText);
        }
        if (needsSafariColonFix || needsAllFix) {
            return cssText;
        }
    }
    return importStringified || rule.cssText;
}
function fixSafariColons(cssStringified) {
    const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
    return cssStringified.replace(regex, '$1\\$2');
}
function isCSSImportRule(rule) {
    return 'styleSheet' in rule;
}
function isCSSStyleRule(rule) {
    return 'selectorText' in rule;
}
class Mirror {
    constructor() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
    getId(n) {
        if (!n)
            return -1;
        const id = _optionalChain$5([this, 'access', _3 => _3.getMeta, 'call', _4 => _4(n), 'optionalAccess', _5 => _5.id]);
        return _nullishCoalesce$1(id, () => ( -1));
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
        if (n.childNodes) {
            n.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
        }
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
            if (meta)
                this.nodeMetaMap.set(n, meta);
        }
        this.idNodeMap.set(id, n);
    }
    reset() {
        this.idNodeMap = new Map();
        this.nodeMetaMap = new WeakMap();
    }
}
function createMirror() {
    return new Mirror();
}
function shouldMaskInput({ maskInputOptions, tagName, type, }) {
    if (tagName === 'OPTION') {
        tagName = 'SELECT';
    }
    return Boolean(maskInputOptions[tagName.toLowerCase()] ||
        (type && maskInputOptions[type]) ||
        type === 'password' ||
        (tagName === 'INPUT' && !type && maskInputOptions['text']));
}
function maskInputValue({ isMasked, element, value, maskInputFn, }) {
    let text = value || '';
    if (!isMasked) {
        return text;
    }
    if (maskInputFn) {
        text = maskInputFn(text, element);
    }
    return '*'.repeat(text.length);
}
function toLowerCase(str) {
    return str.toLowerCase();
}
function toUpperCase(str) {
    return str.toUpperCase();
}
const ORIGINAL_ATTRIBUTE_NAME = '__rrweb_original__';
function is2DCanvasBlank(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return true;
    const chunkSize = 50;
    for (let x = 0; x < canvas.width; x += chunkSize) {
        for (let y = 0; y < canvas.height; y += chunkSize) {
            const getImageData = ctx.getImageData;
            const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData
                ? getImageData[ORIGINAL_ATTRIBUTE_NAME]
                : getImageData;
            const pixelBuffer = new Uint32Array(originalGetImageData.call(ctx, x, y, Math.min(chunkSize, canvas.width - x), Math.min(chunkSize, canvas.height - y)).data.buffer);
            if (pixelBuffer.some((pixel) => pixel !== 0))
                return false;
        }
    }
    return true;
}
function getInputType(element) {
    const type = element.type;
    return element.hasAttribute('data-rr-is-password')
        ? 'password'
        : type
            ?
                toLowerCase(type)
            : null;
}
function getInputValue(el, tagName, type) {
    if (tagName === 'INPUT' && (type === 'radio' || type === 'checkbox')) {
        return el.getAttribute('value') || '';
    }
    return el.value;
}
function extractFileExtension(path, baseURL) {
    let url;
    try {
        url = new URL(path, _nullishCoalesce$1(baseURL, () => ( window.location.href)));
    }
    catch (err) {
        return null;
    }
    const regex = /\.([0-9a-z]+)(?:$)/i;
    const match = url.pathname.match(regex);
    return _nullishCoalesce$1(_optionalChain$5([match, 'optionalAccess', _6 => _6[1]]), () => ( null));
}
const cachedImplementations$2 = {};
function getImplementation$1(name) {
    const cached = cachedImplementations$2[name];
    if (cached) {
        return cached;
    }
    const document = window.document;
    let impl = window[name];
    if (document && typeof document.createElement === 'function') {
        try {
            const sandbox = document.createElement('iframe');
            sandbox.hidden = true;
            document.head.appendChild(sandbox);
            const contentWindow = sandbox.contentWindow;
            if (contentWindow && contentWindow[name]) {
                impl =
                    contentWindow[name];
            }
            document.head.removeChild(sandbox);
        }
        catch (e) {
        }
    }
    return (cachedImplementations$2[name] = impl.bind(window));
}
function setTimeout$3(...rest) {
    return getImplementation$1('setTimeout')(...rest);
}
function clearTimeout$2(...rest) {
    return getImplementation$1('clearTimeout')(...rest);
}
function getIframeContentDocument(iframe) {
    try {
        return iframe.contentDocument;
    }
    catch (e) {
    }
}

let _id = 1;
const tagNameRegex = new RegExp('[^a-z0-9-_:]');
const IGNORED_NODE = -2;
function genId() {
    return _id++;
}
function getValidTagName(element) {
    if (element instanceof HTMLFormElement) {
        return 'form';
    }
    const processedTagName = toLowerCase(element.tagName);
    if (tagNameRegex.test(processedTagName)) {
        return 'div';
    }
    return processedTagName;
}
function extractOrigin(url) {
    let origin = '';
    if (url.indexOf('//') > -1) {
        origin = url.split('/').slice(0, 3).join('/');
    }
    else {
        origin = url.split('/')[0];
    }
    origin = origin.split('?')[0];
    return origin;
}
let canvasService;
let canvasCtx;
const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
const URL_WWW_MATCH = /^www\..*/i;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
function absoluteToStylesheet(cssText, href) {
    return (cssText || '').replace(URL_IN_CSS_REF, (origin, quote1, path1, quote2, path2, path3) => {
        const filePath = path1 || path2 || path3;
        const maybeQuote = quote1 || quote2 || '';
        if (!filePath) {
            return origin;
        }
        if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (DATA_URI.test(filePath)) {
            return `url(${maybeQuote}${filePath}${maybeQuote})`;
        }
        if (filePath[0] === '/') {
            return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
        }
        const stack = href.split('/');
        const parts = filePath.split('/');
        stack.pop();
        for (const part of parts) {
            if (part === '.') {
                continue;
            }
            else if (part === '..') {
                stack.pop();
            }
            else {
                stack.push(part);
            }
        }
        return `url(${maybeQuote}${stack.join('/')}${maybeQuote})`;
    });
}
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
    if (attributeValue.trim() === '') {
        return attributeValue;
    }
    let pos = 0;
    function collectCharacters(regEx) {
        let chars;
        const match = regEx.exec(attributeValue.substring(pos));
        if (match) {
            chars = match[0];
            pos += chars.length;
            return chars;
        }
        return '';
    }
    const output = [];
    while (true) {
        collectCharacters(SRCSET_COMMAS_OR_SPACES);
        if (pos >= attributeValue.length) {
            break;
        }
        let url = collectCharacters(SRCSET_NOT_SPACES);
        if (url.slice(-1) === ',') {
            url = absoluteToDoc(doc, url.substring(0, url.length - 1));
            output.push(url);
        }
        else {
            let descriptorsStr = '';
            url = absoluteToDoc(doc, url);
            let inParens = false;
            while (true) {
                const c = attributeValue.charAt(pos);
                if (c === '') {
                    output.push((url + descriptorsStr).trim());
                    break;
                }
                else if (!inParens) {
                    if (c === ',') {
                        pos += 1;
                        output.push((url + descriptorsStr).trim());
                        break;
                    }
                    else if (c === '(') {
                        inParens = true;
                    }
                }
                else {
                    if (c === ')') {
                        inParens = false;
                    }
                }
                descriptorsStr += c;
                pos += 1;
            }
        }
    }
    return output.join(', ');
}
const cachedDocument = new WeakMap();
function absoluteToDoc(doc, attributeValue) {
    if (!attributeValue || attributeValue.trim() === '') {
        return attributeValue;
    }
    return getHref(doc, attributeValue);
}
function isSVGElement(el) {
    return Boolean(el.tagName === 'svg' || el.ownerSVGElement);
}
function getHref(doc, customHref) {
    let a = cachedDocument.get(doc);
    if (!a) {
        a = doc.createElement('a');
        cachedDocument.set(doc, a);
    }
    if (!customHref) {
        customHref = '';
    }
    else if (customHref.startsWith('blob:') || customHref.startsWith('data:')) {
        return customHref;
    }
    a.setAttribute('href', customHref);
    return a.href;
}
function transformAttribute(doc, tagName, name, value, element, maskAttributeFn) {
    if (!value) {
        return value;
    }
    if (name === 'src' ||
        (name === 'href' && !(tagName === 'use' && value[0] === '#'))) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'xlink:href' && value[0] !== '#') {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'background' &&
        (tagName === 'table' || tagName === 'td' || tagName === 'th')) {
        return absoluteToDoc(doc, value);
    }
    else if (name === 'srcset') {
        return getAbsoluteSrcsetString(doc, value);
    }
    else if (name === 'style') {
        return absoluteToStylesheet(value, getHref(doc));
    }
    else if (tagName === 'object' && name === 'data') {
        return absoluteToDoc(doc, value);
    }
    if (typeof maskAttributeFn === 'function') {
        return maskAttributeFn(name, value, element);
    }
    return value;
}
function ignoreAttribute(tagName, name, _value) {
    return (tagName === 'video' || tagName === 'audio') && name === 'autoplay';
}
function _isBlockedElement(element, blockClass, blockSelector, unblockSelector) {
    try {
        if (unblockSelector && element.matches(unblockSelector)) {
            return false;
        }
        if (typeof blockClass === 'string') {
            if (element.classList.contains(blockClass)) {
                return true;
            }
        }
        else {
            for (let eIndex = element.classList.length; eIndex--;) {
                const className = element.classList[eIndex];
                if (blockClass.test(className)) {
                    return true;
                }
            }
        }
        if (blockSelector) {
            return element.matches(blockSelector);
        }
    }
    catch (e) {
    }
    return false;
}
function elementClassMatchesRegex(el, regex) {
    for (let eIndex = el.classList.length; eIndex--;) {
        const className = el.classList[eIndex];
        if (regex.test(className)) {
            return true;
        }
    }
    return false;
}
function distanceToMatch(node, matchPredicate, limit = Infinity, distance = 0) {
    if (!node)
        return -1;
    if (node.nodeType !== node.ELEMENT_NODE)
        return -1;
    if (distance > limit)
        return -1;
    if (matchPredicate(node))
        return distance;
    return distanceToMatch(node.parentNode, matchPredicate, limit, distance + 1);
}
function createMatchPredicate(className, selector) {
    return (node) => {
        const el = node;
        if (el === null)
            return false;
        try {
            if (className) {
                if (typeof className === 'string') {
                    if (el.matches(`.${className}`))
                        return true;
                }
                else if (elementClassMatchesRegex(el, className)) {
                    return true;
                }
            }
            if (selector && el.matches(selector))
                return true;
            return false;
        }
        catch (e2) {
            return false;
        }
    };
}
function needMaskingText(node, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, maskAllText) {
    try {
        const el = node.nodeType === node.ELEMENT_NODE
            ? node
            : node.parentElement;
        if (el === null)
            return false;
        if (el.tagName === 'INPUT') {
            const autocomplete = el.getAttribute('autocomplete');
            const disallowedAutocompleteValues = [
                'current-password',
                'new-password',
                'cc-number',
                'cc-exp',
                'cc-exp-month',
                'cc-exp-year',
                'cc-csc',
            ];
            if (disallowedAutocompleteValues.includes(autocomplete)) {
                return true;
            }
        }
        let maskDistance = -1;
        let unmaskDistance = -1;
        if (maskAllText) {
            unmaskDistance = distanceToMatch(el, createMatchPredicate(unmaskTextClass, unmaskTextSelector));
            if (unmaskDistance < 0) {
                return true;
            }
            maskDistance = distanceToMatch(el, createMatchPredicate(maskTextClass, maskTextSelector), unmaskDistance >= 0 ? unmaskDistance : Infinity);
        }
        else {
            maskDistance = distanceToMatch(el, createMatchPredicate(maskTextClass, maskTextSelector));
            if (maskDistance < 0) {
                return false;
            }
            unmaskDistance = distanceToMatch(el, createMatchPredicate(unmaskTextClass, unmaskTextSelector), maskDistance >= 0 ? maskDistance : Infinity);
        }
        return maskDistance >= 0
            ? unmaskDistance >= 0
                ? maskDistance <= unmaskDistance
                : true
            : unmaskDistance >= 0
                ? false
                : !!maskAllText;
    }
    catch (e) {
    }
    return !!maskAllText;
}
function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
    const win = iframeEl.contentWindow;
    if (!win) {
        return;
    }
    let fired = false;
    let readyState;
    try {
        readyState = win.document.readyState;
    }
    catch (error) {
        return;
    }
    if (readyState !== 'complete') {
        const timer = setTimeout$3(() => {
            if (!fired) {
                listener();
                fired = true;
            }
        }, iframeLoadTimeout);
        iframeEl.addEventListener('load', () => {
            clearTimeout$2(timer);
            fired = true;
            listener();
        });
        return;
    }
    const blankUrl = 'about:blank';
    if (win.location.href !== blankUrl ||
        iframeEl.src === blankUrl ||
        iframeEl.src === '') {
        setTimeout$3(listener, 0);
        return iframeEl.addEventListener('load', listener);
    }
    iframeEl.addEventListener('load', listener);
}
function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
    let fired = false;
    let styleSheetLoaded;
    try {
        styleSheetLoaded = link.sheet;
    }
    catch (error) {
        return;
    }
    if (styleSheetLoaded)
        return;
    const timer = setTimeout$3(() => {
        if (!fired) {
            listener();
            fired = true;
        }
    }, styleSheetLoadTimeout);
    link.addEventListener('load', () => {
        clearTimeout$2(timer);
        fired = true;
        listener();
    });
}
function serializeNode(n, options) {
    const { doc, mirror, blockClass, blockSelector, unblockSelector, maskAllText, maskAttributeFn, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, inlineStylesheet, maskInputOptions = {}, maskTextFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, } = options;
    const rootId = getRootId(doc, mirror);
    switch (n.nodeType) {
        case n.DOCUMENT_NODE:
            if (n.compatMode !== 'CSS1Compat') {
                return {
                    type: NodeType$3.Document,
                    childNodes: [],
                    compatMode: n.compatMode,
                };
            }
            else {
                return {
                    type: NodeType$3.Document,
                    childNodes: [],
                };
            }
        case n.DOCUMENT_TYPE_NODE:
            return {
                type: NodeType$3.DocumentType,
                name: n.name,
                publicId: n.publicId,
                systemId: n.systemId,
                rootId,
            };
        case n.ELEMENT_NODE:
            return serializeElementNode(n, {
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
                maskAllText,
                maskTextClass,
                unmaskTextClass,
                maskTextSelector,
                unmaskTextSelector,
            });
        case n.TEXT_NODE:
            return serializeTextNode(n, {
                doc,
                maskAllText,
                maskTextClass,
                unmaskTextClass,
                maskTextSelector,
                unmaskTextSelector,
                maskTextFn,
                maskInputOptions,
                maskInputFn,
                rootId,
            });
        case n.CDATA_SECTION_NODE:
            return {
                type: NodeType$3.CDATA,
                textContent: '',
                rootId,
            };
        case n.COMMENT_NODE:
            return {
                type: NodeType$3.Comment,
                textContent: n.textContent || '',
                rootId,
            };
        default:
            return false;
    }
}
function getRootId(doc, mirror) {
    if (!mirror.hasNode(doc))
        return undefined;
    const docId = mirror.getId(doc);
    return docId === 1 ? undefined : docId;
}
function serializeTextNode(n, options) {
    const { maskAllText, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, maskTextFn, maskInputOptions, maskInputFn, rootId, } = options;
    const parentTagName = n.parentNode && n.parentNode.tagName;
    let textContent = n.textContent;
    const isStyle = parentTagName === 'STYLE' ? true : undefined;
    const isScript = parentTagName === 'SCRIPT' ? true : undefined;
    const isTextarea = parentTagName === 'TEXTAREA' ? true : undefined;
    if (isStyle && textContent) {
        try {
            if (n.nextSibling || n.previousSibling) ;
            else if (_optionalChain$5([n, 'access', _7 => _7.parentNode, 'access', _8 => _8.sheet, 'optionalAccess', _9 => _9.cssRules])) {
                textContent = stringifyStylesheet(n.parentNode.sheet);
            }
        }
        catch (err) {
            console.warn(`Cannot get CSS styles from text's parentNode. Error: ${err}`, n);
        }
        textContent = absoluteToStylesheet(textContent, getHref(options.doc));
    }
    if (isScript) {
        textContent = 'SCRIPT_PLACEHOLDER';
    }
    const forceMask = needMaskingText(n, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, maskAllText);
    if (!isStyle && !isScript && !isTextarea && textContent && forceMask) {
        textContent = maskTextFn
            ? maskTextFn(textContent, n.parentElement)
            : textContent.replace(/[\S]/g, '*');
    }
    if (isTextarea && textContent && (maskInputOptions.textarea || forceMask)) {
        textContent = maskInputFn
            ? maskInputFn(textContent, n.parentNode)
            : textContent.replace(/[\S]/g, '*');
    }
    if (parentTagName === 'OPTION' && textContent) {
        const isInputMasked = shouldMaskInput({
            type: null,
            tagName: parentTagName,
            maskInputOptions,
        });
        textContent = maskInputValue({
            isMasked: needMaskingText(n, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, isInputMasked),
            element: n,
            value: textContent,
            maskInputFn,
        });
    }
    return {
        type: NodeType$3.Text,
        textContent: textContent || '',
        isStyle,
        rootId,
    };
}
function serializeElementNode(n, options) {
    const { doc, blockClass, blockSelector, unblockSelector, inlineStylesheet, maskInputOptions = {}, maskAttributeFn, maskInputFn, dataURLOptions = {}, inlineImages, recordCanvas, keepIframeSrcFn, newlyAddedElement = false, rootId, maskAllText, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, } = options;
    const needBlock = _isBlockedElement(n, blockClass, blockSelector, unblockSelector);
    const tagName = getValidTagName(n);
    let attributes = {};
    const len = n.attributes.length;
    for (let i = 0; i < len; i++) {
        const attr = n.attributes[i];
        if (attr.name && !ignoreAttribute(tagName, attr.name)) {
            attributes[attr.name] = transformAttribute(doc, tagName, toLowerCase(attr.name), attr.value, n, maskAttributeFn);
        }
    }
    if (tagName === 'link' && inlineStylesheet) {
        const stylesheet = Array.from(doc.styleSheets).find((s) => {
            return s.href === n.href;
        });
        let cssText = null;
        if (stylesheet) {
            cssText = stringifyStylesheet(stylesheet);
        }
        if (cssText) {
            attributes.rel = null;
            attributes.href = null;
            attributes.crossorigin = null;
            attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
        }
    }
    if (tagName === 'style' &&
        n.sheet &&
        !(n.innerText || n.textContent || '').trim().length) {
        const cssText = stringifyStylesheet(n.sheet);
        if (cssText) {
            attributes._cssText = absoluteToStylesheet(cssText, getHref(doc));
        }
    }
    if (tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        tagName === 'option') {
        const el = n;
        const type = getInputType(el);
        const value = getInputValue(el, toUpperCase(tagName), type);
        const checked = el.checked;
        if (type !== 'submit' && type !== 'button' && value) {
            const forceMask = needMaskingText(el, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, shouldMaskInput({
                type,
                tagName: toUpperCase(tagName),
                maskInputOptions,
            }));
            attributes.value = maskInputValue({
                isMasked: forceMask,
                element: el,
                value,
                maskInputFn,
            });
        }
        if (checked) {
            attributes.checked = checked;
        }
    }
    if (tagName === 'option') {
        if (n.selected && !maskInputOptions['select']) {
            attributes.selected = true;
        }
        else {
            delete attributes.selected;
        }
    }
    if (tagName === 'canvas' && recordCanvas) {
        if (n.__context === '2d') {
            if (!is2DCanvasBlank(n)) {
                attributes.rr_dataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
        }
        else if (!('__context' in n)) {
            const canvasDataURL = n.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            const blankCanvas = doc.createElement('canvas');
            blankCanvas.width = n.width;
            blankCanvas.height = n.height;
            const blankCanvasDataURL = blankCanvas.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            if (canvasDataURL !== blankCanvasDataURL) {
                attributes.rr_dataURL = canvasDataURL;
            }
        }
    }
    if (tagName === 'img' && inlineImages) {
        if (!canvasService) {
            canvasService = doc.createElement('canvas');
            canvasCtx = canvasService.getContext('2d');
        }
        const image = n;
        const imageSrc = image.currentSrc || image.getAttribute('src') || '<unknown-src>';
        const priorCrossOrigin = image.crossOrigin;
        const recordInlineImage = () => {
            image.removeEventListener('load', recordInlineImage);
            try {
                canvasService.width = image.naturalWidth;
                canvasService.height = image.naturalHeight;
                canvasCtx.drawImage(image, 0, 0);
                attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
            }
            catch (err) {
                if (image.crossOrigin !== 'anonymous') {
                    image.crossOrigin = 'anonymous';
                    if (image.complete && image.naturalWidth !== 0)
                        recordInlineImage();
                    else
                        image.addEventListener('load', recordInlineImage);
                    return;
                }
                else {
                    console.warn(`Cannot inline img src=${imageSrc}! Error: ${err}`);
                }
            }
            if (image.crossOrigin === 'anonymous') {
                priorCrossOrigin
                    ? (attributes.crossOrigin = priorCrossOrigin)
                    : image.removeAttribute('crossorigin');
            }
        };
        if (image.complete && image.naturalWidth !== 0)
            recordInlineImage();
        else
            image.addEventListener('load', recordInlineImage);
    }
    if (tagName === 'audio' || tagName === 'video') {
        attributes.rr_mediaState = n.paused
            ? 'paused'
            : 'played';
        attributes.rr_mediaCurrentTime = n.currentTime;
    }
    if (!newlyAddedElement) {
        if (n.scrollLeft) {
            attributes.rr_scrollLeft = n.scrollLeft;
        }
        if (n.scrollTop) {
            attributes.rr_scrollTop = n.scrollTop;
        }
    }
    if (needBlock) {
        const { width, height } = n.getBoundingClientRect();
        attributes = {
            class: attributes.class,
            rr_width: `${width}px`,
            rr_height: `${height}px`,
        };
    }
    if (tagName === 'iframe' && !keepIframeSrcFn(attributes.src)) {
        if (!needBlock && !getIframeContentDocument(n)) {
            attributes.rr_src = attributes.src;
        }
        delete attributes.src;
    }
    let isCustomElement;
    try {
        if (customElements.get(tagName))
            isCustomElement = true;
    }
    catch (e) {
    }
    return {
        type: NodeType$3.Element,
        tagName,
        attributes,
        childNodes: [],
        isSVG: isSVGElement(n) || undefined,
        needBlock,
        rootId,
        isCustom: isCustomElement,
    };
}
function lowerIfExists(maybeAttr) {
    if (maybeAttr === undefined || maybeAttr === null) {
        return '';
    }
    else {
        return maybeAttr.toLowerCase();
    }
}
function slimDOMExcluded(sn, slimDOMOptions) {
    if (slimDOMOptions.comment && sn.type === NodeType$3.Comment) {
        return true;
    }
    else if (sn.type === NodeType$3.Element) {
        if (slimDOMOptions.script &&
            (sn.tagName === 'script' ||
                (sn.tagName === 'link' &&
                    (sn.attributes.rel === 'preload' ||
                        sn.attributes.rel === 'modulepreload')) ||
                (sn.tagName === 'link' &&
                    sn.attributes.rel === 'prefetch' &&
                    typeof sn.attributes.href === 'string' &&
                    extractFileExtension(sn.attributes.href) === 'js'))) {
            return true;
        }
        else if (slimDOMOptions.headFavicon &&
            ((sn.tagName === 'link' && sn.attributes.rel === 'shortcut icon') ||
                (sn.tagName === 'meta' &&
                    (lowerIfExists(sn.attributes.name).match(/^msapplication-tile(image|color)$/) ||
                        lowerIfExists(sn.attributes.name) === 'application-name' ||
                        lowerIfExists(sn.attributes.rel) === 'icon' ||
                        lowerIfExists(sn.attributes.rel) === 'apple-touch-icon' ||
                        lowerIfExists(sn.attributes.rel) === 'shortcut icon')))) {
            return true;
        }
        else if (sn.tagName === 'meta') {
            if (slimDOMOptions.headMetaDescKeywords &&
                lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
                return true;
            }
            else if (slimDOMOptions.headMetaSocial &&
                (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) ||
                    lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) ||
                    lowerIfExists(sn.attributes.name) === 'pinterest')) {
                return true;
            }
            else if (slimDOMOptions.headMetaRobots &&
                (lowerIfExists(sn.attributes.name) === 'robots' ||
                    lowerIfExists(sn.attributes.name) === 'googlebot' ||
                    lowerIfExists(sn.attributes.name) === 'bingbot')) {
                return true;
            }
            else if (slimDOMOptions.headMetaHttpEquiv &&
                sn.attributes['http-equiv'] !== undefined) {
                return true;
            }
            else if (slimDOMOptions.headMetaAuthorship &&
                (lowerIfExists(sn.attributes.name) === 'author' ||
                    lowerIfExists(sn.attributes.name) === 'generator' ||
                    lowerIfExists(sn.attributes.name) === 'framework' ||
                    lowerIfExists(sn.attributes.name) === 'publisher' ||
                    lowerIfExists(sn.attributes.name) === 'progid' ||
                    lowerIfExists(sn.attributes.property).match(/^article:/) ||
                    lowerIfExists(sn.attributes.property).match(/^product:/))) {
                return true;
            }
            else if (slimDOMOptions.headMetaVerification &&
                (lowerIfExists(sn.attributes.name) === 'google-site-verification' ||
                    lowerIfExists(sn.attributes.name) === 'yandex-verification' ||
                    lowerIfExists(sn.attributes.name) === 'csrf-token' ||
                    lowerIfExists(sn.attributes.name) === 'p:domain_verify' ||
                    lowerIfExists(sn.attributes.name) === 'verify-v1' ||
                    lowerIfExists(sn.attributes.name) === 'verification' ||
                    lowerIfExists(sn.attributes.name) === 'shopify-checkout-api-token')) {
                return true;
            }
        }
    }
    return false;
}
function serializeNodeWithId(n, options) {
    const { doc, mirror, blockClass, blockSelector, unblockSelector, maskAllText, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, skipChild = false, inlineStylesheet = true, maskInputOptions = {}, maskAttributeFn, maskTextFn, maskInputFn, slimDOMOptions, dataURLOptions = {}, inlineImages = false, recordCanvas = false, onSerialize, onIframeLoad, iframeLoadTimeout = 5000, onStylesheetLoad, stylesheetLoadTimeout = 5000, keepIframeSrcFn = () => false, newlyAddedElement = false, } = options;
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
    });
    if (!_serializedNode) {
        console.warn(n, 'not serialized');
        return null;
    }
    let id;
    if (mirror.hasNode(n)) {
        id = mirror.getId(n);
    }
    else if (slimDOMExcluded(_serializedNode, slimDOMOptions) ||
        (!preserveWhiteSpace &&
            _serializedNode.type === NodeType$3.Text &&
            !_serializedNode.isStyle &&
            !_serializedNode.textContent.replace(/^\s+|\s+$/gm, '').length)) {
        id = IGNORED_NODE;
    }
    else {
        id = genId();
    }
    const serializedNode = Object.assign(_serializedNode, { id });
    mirror.add(n, serializedNode);
    if (id === IGNORED_NODE) {
        return null;
    }
    if (onSerialize) {
        onSerialize(n);
    }
    let recordChild = !skipChild;
    if (serializedNode.type === NodeType$3.Element) {
        recordChild = recordChild && !serializedNode.needBlock;
        delete serializedNode.needBlock;
        const shadowRoot = n.shadowRoot;
        if (shadowRoot && isNativeShadowDom(shadowRoot))
            serializedNode.isShadowHost = true;
    }
    if ((serializedNode.type === NodeType$3.Document ||
        serializedNode.type === NodeType$3.Element) &&
        recordChild) {
        if (slimDOMOptions.headWhitespace &&
            serializedNode.type === NodeType$3.Element &&
            serializedNode.tagName === 'head') {
            preserveWhiteSpace = false;
        }
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
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn,
        };
        for (const childN of Array.from(n.childNodes)) {
            const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
            if (serializedChildNode) {
                serializedNode.childNodes.push(serializedChildNode);
            }
        }
        if (isElement$1(n) && n.shadowRoot) {
            for (const childN of Array.from(n.shadowRoot.childNodes)) {
                const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
                if (serializedChildNode) {
                    isNativeShadowDom(n.shadowRoot) &&
                        (serializedChildNode.isShadow = true);
                    serializedNode.childNodes.push(serializedChildNode);
                }
            }
        }
    }
    if (n.parentNode &&
        isShadowRoot(n.parentNode) &&
        isNativeShadowDom(n.parentNode)) {
        serializedNode.isShadow = true;
    }
    if (serializedNode.type === NodeType$3.Element &&
        serializedNode.tagName === 'iframe') {
        onceIframeLoaded(n, () => {
            const iframeDoc = getIframeContentDocument(n);
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
                });
                if (serializedIframeNode) {
                    onIframeLoad(n, serializedIframeNode);
                }
            }
        }, iframeLoadTimeout);
    }
    if (serializedNode.type === NodeType$3.Element &&
        serializedNode.tagName === 'link' &&
        typeof serializedNode.attributes.rel === 'string' &&
        (serializedNode.attributes.rel === 'stylesheet' ||
            (serializedNode.attributes.rel === 'preload' &&
                typeof serializedNode.attributes.href === 'string' &&
                extractFileExtension(serializedNode.attributes.href) === 'css'))) {
        onceStylesheetLoaded(n, () => {
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
                });
                if (serializedLinkNode) {
                    onStylesheetLoad(n, serializedLinkNode);
                }
            }
        }, stylesheetLoadTimeout);
    }
    return serializedNode;
}
function snapshot(n, options) {
    const { mirror = new Mirror(), blockClass = 'rr-block', blockSelector = null, unblockSelector = null, maskAllText = false, maskTextClass = 'rr-mask', unmaskTextClass = null, maskTextSelector = null, unmaskTextSelector = null, inlineStylesheet = true, inlineImages = false, recordCanvas = false, maskAllInputs = false, maskAttributeFn, maskTextFn, maskInputFn, slimDOM = false, dataURLOptions, preserveWhiteSpace, onSerialize, onIframeLoad, iframeLoadTimeout, onStylesheetLoad, stylesheetLoadTimeout, keepIframeSrcFn = () => false, } = options || {};
    const maskInputOptions = maskAllInputs === true
        ? {
            color: true,
            date: true,
            'datetime-local': true,
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
            textarea: true,
            select: true,
        }
        : maskAllInputs === false
            ? {}
            : maskAllInputs;
    const slimDOMOptions = slimDOM === true || slimDOM === 'all'
        ?
            {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true,
                headMetaDescKeywords: slimDOM === 'all',
                headMetaSocial: true,
                headMetaRobots: true,
                headMetaHttpEquiv: true,
                headMetaAuthorship: true,
                headMetaVerification: true,
            }
        : slimDOM === false
            ? {}
            : slimDOM;
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
        newlyAddedElement: false,
    });
}

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
function on(type, fn, target = document) {
    const options = { capture: true, passive: true };
    target.addEventListener(type, fn, options);
    return () => target.removeEventListener(type, fn, options);
}
const DEPARTED_MIRROR_ACCESS_WARNING = 'Please stop import mirror directly. Instead of that,' +
    '\r\n' +
    'now you can use replayer.getMirror() to access the mirror instance of a replayer,' +
    '\r\n' +
    'or you can use record.mirror to access the mirror instance during recording.';
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
    },
};
if (typeof window !== 'undefined' && window.Proxy && window.Reflect) {
    _mirror = new Proxy(_mirror, {
        get(target, prop, receiver) {
            if (prop === 'map') {
                console.error(DEPARTED_MIRROR_ACCESS_WARNING);
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}
function throttle$1(func, wait, options = {}) {
    let timeout = null;
    let previous = 0;
    return function (...args) {
        const now = Date.now();
        if (!previous && options.leading === false) {
            previous = now;
        }
        const remaining = wait - (now - previous);
        const context = this;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout$1(timeout);
                timeout = null;
            }
            previous = now;
            func.apply(context, args);
        }
        else if (!timeout && options.trailing !== false) {
            timeout = setTimeout$2(() => {
                previous = options.leading === false ? 0 : Date.now();
                timeout = null;
                func.apply(context, args);
            }, remaining);
        }
    };
}
function hookSetter(target, key, d, isRevoked, win = window) {
    const original = win.Object.getOwnPropertyDescriptor(target, key);
    win.Object.defineProperty(target, key, isRevoked
        ? d
        : {
            set(value) {
                setTimeout$2(() => {
                    d.set.call(this, value);
                }, 0);
                if (original && original.set) {
                    original.set.call(this, value);
                }
            },
        });
    return () => hookSetter(target, key, original || {}, true);
}
function patch(source, name, replacement) {
    try {
        if (!(name in source)) {
            return () => {
            };
        }
        const original = source[name];
        const wrapped = replacement(original);
        if (typeof wrapped === 'function') {
            wrapped.prototype = wrapped.prototype || {};
            Object.defineProperties(wrapped, {
                __rrweb_original__: {
                    enumerable: false,
                    value: original,
                },
            });
        }
        source[name] = wrapped;
        return () => {
            source[name] = original;
        };
    }
    catch (e2) {
        return () => {
        };
    }
}
let nowTimestamp = Date.now;
if (!(/[1-9][0-9]{12}/.test(Date.now().toString()))) {
    nowTimestamp = () => new Date().getTime();
}
function getWindowScroll(win) {
    const doc = win.document;
    return {
        left: doc.scrollingElement
            ? doc.scrollingElement.scrollLeft
            : win.pageXOffset !== undefined
                ? win.pageXOffset
                : _optionalChain$4([doc, 'optionalAccess', _ => _.documentElement, 'access', _2 => _2.scrollLeft]) ||
                    _optionalChain$4([doc, 'optionalAccess', _3 => _3.body, 'optionalAccess', _4 => _4.parentElement, 'optionalAccess', _5 => _5.scrollLeft]) ||
                    _optionalChain$4([doc, 'optionalAccess', _6 => _6.body, 'optionalAccess', _7 => _7.scrollLeft]) ||
                    0,
        top: doc.scrollingElement
            ? doc.scrollingElement.scrollTop
            : win.pageYOffset !== undefined
                ? win.pageYOffset
                : _optionalChain$4([doc, 'optionalAccess', _8 => _8.documentElement, 'access', _9 => _9.scrollTop]) ||
                    _optionalChain$4([doc, 'optionalAccess', _10 => _10.body, 'optionalAccess', _11 => _11.parentElement, 'optionalAccess', _12 => _12.scrollTop]) ||
                    _optionalChain$4([doc, 'optionalAccess', _13 => _13.body, 'optionalAccess', _14 => _14.scrollTop]) ||
                    0,
    };
}
function getWindowHeight() {
    return (window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        (document.body && document.body.clientHeight));
}
function getWindowWidth() {
    return (window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        (document.body && document.body.clientWidth));
}
function closestElementOfNode(node) {
    if (!node) {
        return null;
    }
    const el = node.nodeType === node.ELEMENT_NODE
        ? node
        : node.parentElement;
    return el;
}
function isBlocked(node, blockClass, blockSelector, unblockSelector, checkAncestors) {
    if (!node) {
        return false;
    }
    const el = closestElementOfNode(node);
    if (!el) {
        return false;
    }
    const blockedPredicate = createMatchPredicate(blockClass, blockSelector);
    if (!checkAncestors) {
        const isUnblocked = unblockSelector && el.matches(unblockSelector);
        return blockedPredicate(el) && !isUnblocked;
    }
    const blockDistance = distanceToMatch(el, blockedPredicate);
    let unblockDistance = -1;
    if (blockDistance < 0) {
        return false;
    }
    if (unblockSelector) {
        unblockDistance = distanceToMatch(el, createMatchPredicate(null, unblockSelector));
    }
    if (blockDistance > -1 && unblockDistance < 0) {
        return true;
    }
    return blockDistance < unblockDistance;
}
function isSerialized(n, mirror) {
    return mirror.getId(n) !== -1;
}
function isIgnored(n, mirror) {
    return mirror.getId(n) === IGNORED_NODE;
}
function isAncestorRemoved(target, mirror) {
    if (isShadowRoot(target)) {
        return false;
    }
    const id = mirror.getId(target);
    if (!mirror.has(id)) {
        return true;
    }
    if (target.parentNode &&
        target.parentNode.nodeType === target.DOCUMENT_NODE) {
        return false;
    }
    if (!target.parentNode) {
        return true;
    }
    return isAncestorRemoved(target.parentNode, mirror);
}
function legacy_isTouchEvent(event) {
    return Boolean(event.changedTouches);
}
function polyfill(win = window) {
    if ('NodeList' in win && !win.NodeList.prototype.forEach) {
        win.NodeList.prototype.forEach = Array.prototype
            .forEach;
    }
    if ('DOMTokenList' in win && !win.DOMTokenList.prototype.forEach) {
        win.DOMTokenList.prototype.forEach = Array.prototype
            .forEach;
    }
    if (!Node.prototype.contains) {
        Node.prototype.contains = (...args) => {
            let node = args[0];
            if (!(0 in args)) {
                throw new TypeError('1 argument is required');
            }
            do {
                if (this === node) {
                    return true;
                }
            } while ((node = node && node.parentNode));
            return false;
        };
    }
}
function isSerializedIframe(n, mirror) {
    return Boolean(n.nodeName === 'IFRAME' && mirror.getMeta(n));
}
function isSerializedStylesheet(n, mirror) {
    return Boolean(n.nodeName === 'LINK' &&
        n.nodeType === n.ELEMENT_NODE &&
        n.getAttribute &&
        n.getAttribute('rel') === 'stylesheet' &&
        mirror.getMeta(n));
}
function hasShadowRoot(n) {
    return Boolean(_optionalChain$4([n, 'optionalAccess', _18 => _18.shadowRoot]));
}
class StyleSheetMirror {
    constructor() {
        this.id = 1;
        this.styleIDMap = new WeakMap();
        this.idStyleMap = new Map();
    }
    getId(stylesheet) {
        return _nullishCoalesce(this.styleIDMap.get(stylesheet), () => ( -1));
    }
    has(stylesheet) {
        return this.styleIDMap.has(stylesheet);
    }
    add(stylesheet, id) {
        if (this.has(stylesheet))
            return this.getId(stylesheet);
        let newId;
        if (id === undefined) {
            newId = this.id++;
        }
        else
            newId = id;
        this.styleIDMap.set(stylesheet, newId);
        this.idStyleMap.set(newId, stylesheet);
        return newId;
    }
    getStyle(id) {
        return this.idStyleMap.get(id) || null;
    }
    reset() {
        this.styleIDMap = new WeakMap();
        this.idStyleMap = new Map();
        this.id = 1;
    }
    generateId() {
        return this.id++;
    }
}
function getShadowHost(n) {
    let shadowHost = null;
    if (_optionalChain$4([n, 'access', _19 => _19.getRootNode, 'optionalCall', _20 => _20(), 'optionalAccess', _21 => _21.nodeType]) === Node.DOCUMENT_FRAGMENT_NODE &&
        n.getRootNode().host)
        shadowHost = n.getRootNode().host;
    return shadowHost;
}
function getRootShadowHost(n) {
    let rootShadowHost = n;
    let shadowHost;
    while ((shadowHost = getShadowHost(rootShadowHost)))
        rootShadowHost = shadowHost;
    return rootShadowHost;
}
function shadowHostInDom(n) {
    const doc = n.ownerDocument;
    if (!doc)
        return false;
    const shadowHost = getRootShadowHost(n);
    return doc.contains(shadowHost);
}
function inDom(n) {
    const doc = n.ownerDocument;
    if (!doc)
        return false;
    return doc.contains(n) || shadowHostInDom(n);
}
const cachedImplementations$1 = {};
function getImplementation(name) {
    const cached = cachedImplementations$1[name];
    if (cached) {
        return cached;
    }
    const document = window.document;
    let impl = window[name];
    if (document && typeof document.createElement === 'function') {
        try {
            const sandbox = document.createElement('iframe');
            sandbox.hidden = true;
            document.head.appendChild(sandbox);
            const contentWindow = sandbox.contentWindow;
            if (contentWindow && contentWindow[name]) {
                impl =
                    contentWindow[name];
            }
            document.head.removeChild(sandbox);
        }
        catch (e) {
        }
    }
    return (cachedImplementations$1[name] = impl.bind(window));
}
function onRequestAnimationFrame(...rest) {
    return getImplementation('requestAnimationFrame')(...rest);
}
function setTimeout$2(...rest) {
    return getImplementation('setTimeout')(...rest);
}
function clearTimeout$1(...rest) {
    return getImplementation('clearTimeout')(...rest);
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

var NodeType$1;
(function (NodeType) {
    NodeType[NodeType["Document"] = 0] = "Document";
    NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
    NodeType[NodeType["Element"] = 2] = "Element";
    NodeType[NodeType["Text"] = 3] = "Text";
    NodeType[NodeType["CDATA"] = 4] = "CDATA";
    NodeType[NodeType["Comment"] = 5] = "Comment";
})(NodeType$1 || (NodeType$1 = {}));
var NodeType$2;
(function (NodeType) {
    NodeType[NodeType["PLACEHOLDER"] = 0] = "PLACEHOLDER";
    NodeType[NodeType["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
    NodeType[NodeType["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
    NodeType[NodeType["TEXT_NODE"] = 3] = "TEXT_NODE";
    NodeType[NodeType["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
    NodeType[NodeType["ENTITY_REFERENCE_NODE"] = 5] = "ENTITY_REFERENCE_NODE";
    NodeType[NodeType["ENTITY_NODE"] = 6] = "ENTITY_NODE";
    NodeType[NodeType["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
    NodeType[NodeType["COMMENT_NODE"] = 8] = "COMMENT_NODE";
    NodeType[NodeType["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
    NodeType[NodeType["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
    NodeType[NodeType["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
})(NodeType$2 || (NodeType$2 = {}));

function getIFrameContentDocument(iframe) {
    try {
        return iframe.contentDocument;
    }
    catch (e) {
    }
}
function getIFrameContentWindow(iframe) {
    try {
        return iframe.contentWindow;
    }
    catch (e) {
    }
}

function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
function isNodeInLinkedList(n) {
    return '__ln' in n;
}
class DoubleLinkedList {
    constructor() {
        this.length = 0;
        this.head = null;
        this.tail = null;
    }
    get(position) {
        if (position >= this.length) {
            throw new Error('Position outside of list range');
        }
        let current = this.head;
        for (let index = 0; index < position; index++) {
            current = _optionalChain$3([current, 'optionalAccess', _ => _.next]) || null;
        }
        return current;
    }
    addNode(n) {
        const node = {
            value: n,
            previous: null,
            next: null,
        };
        n.__ln = node;
        if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
            const current = n.previousSibling.__ln.next;
            node.next = current;
            node.previous = n.previousSibling.__ln;
            n.previousSibling.__ln.next = node;
            if (current) {
                current.previous = node;
            }
        }
        else if (n.nextSibling &&
            isNodeInLinkedList(n.nextSibling) &&
            n.nextSibling.__ln.previous) {
            const current = n.nextSibling.__ln.previous;
            node.previous = current;
            node.next = n.nextSibling.__ln;
            n.nextSibling.__ln.previous = node;
            if (current) {
                current.next = node;
            }
        }
        else {
            if (this.head) {
                this.head.previous = node;
            }
            node.next = this.head;
            this.head = node;
        }
        if (node.next === null) {
            this.tail = node;
        }
        this.length++;
    }
    removeNode(n) {
        const current = n.__ln;
        if (!this.head) {
            return;
        }
        if (!current.previous) {
            this.head = current.next;
            if (this.head) {
                this.head.previous = null;
            }
            else {
                this.tail = null;
            }
        }
        else {
            current.previous.next = current.next;
            if (current.next) {
                current.next.previous = current.previous;
            }
            else {
                this.tail = current.previous;
            }
        }
        if (n.__ln) {
            delete n.__ln;
        }
        this.length--;
    }
}
const moveKey = (id, parentId) => `${id}@${parentId}`;
class MutationBuffer {
    constructor() {
        this.frozen = false;
        this.locked = false;
        this.texts = [];
        this.attributes = [];
        this.attributeMap = new WeakMap();
        this.removes = [];
        this.mapRemoves = [];
        this.movedMap = {};
        this.addedSet = new Set();
        this.movedSet = new Set();
        this.droppedSet = new Set();
        this.processMutations = (mutations) => {
            mutations.forEach(this.processMutation);
            this.emit();
        };
        this.emit = () => {
            if (this.frozen || this.locked) {
                return;
            }
            const adds = [];
            const addedIds = new Set();
            const addList = new DoubleLinkedList();
            const getNextId = (n) => {
                let ns = n;
                let nextId = IGNORED_NODE;
                while (nextId === IGNORED_NODE) {
                    ns = ns && ns.nextSibling;
                    nextId = ns && this.mirror.getId(ns);
                }
                return nextId;
            };
            const pushAdd = (n) => {
                if (!n.parentNode || !inDom(n)) {
                    return;
                }
                const parentId = isShadowRoot(n.parentNode)
                    ? this.mirror.getId(getShadowHost(n))
                    : this.mirror.getId(n.parentNode);
                const nextId = getNextId(n);
                if (parentId === -1 || nextId === -1) {
                    return addList.addNode(n);
                }
                const sn = serializeNodeWithId(n, {
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
                        if (isSerializedIframe(currentN, this.mirror) &&
                            !isBlocked(currentN, this.blockClass, this.blockSelector, this.unblockSelector, false)) {
                            this.iframeManager.addIframe(currentN);
                        }
                        if (isSerializedStylesheet(currentN, this.mirror)) {
                            this.stylesheetManager.trackLinkElement(currentN);
                        }
                        if (hasShadowRoot(n)) {
                            this.shadowDomManager.addShadowRoot(n.shadowRoot, this.doc);
                        }
                    },
                    onIframeLoad: (iframe, childSn) => {
                        if (isBlocked(iframe, this.blockClass, this.blockSelector, this.unblockSelector, false)) {
                            return;
                        }
                        this.iframeManager.attachIframe(iframe, childSn);
                        if (iframe.contentWindow) {
                            this.canvasManager.addWindow(iframe.contentWindow);
                        }
                        this.shadowDomManager.observeAttachShadow(iframe);
                    },
                    onStylesheetLoad: (link, childSn) => {
                        this.stylesheetManager.attachLinkElement(link, childSn);
                    },
                });
                if (sn) {
                    adds.push({
                        parentId,
                        nextId,
                        node: sn,
                    });
                    addedIds.add(sn.id);
                }
            };
            while (this.mapRemoves.length) {
                this.mirror.removeNodeFromMap(this.mapRemoves.shift());
            }
            for (const n of this.movedSet) {
                if (isParentRemoved(this.removes, n, this.mirror) &&
                    !this.movedSet.has(n.parentNode)) {
                    continue;
                }
                pushAdd(n);
            }
            for (const n of this.addedSet) {
                if (!isAncestorInSet(this.droppedSet, n) &&
                    !isParentRemoved(this.removes, n, this.mirror)) {
                    pushAdd(n);
                }
                else if (isAncestorInSet(this.movedSet, n)) {
                    pushAdd(n);
                }
                else {
                    this.droppedSet.add(n);
                }
            }
            let candidate = null;
            while (addList.length) {
                let node = null;
                if (candidate) {
                    const parentId = this.mirror.getId(candidate.value.parentNode);
                    const nextId = getNextId(candidate.value);
                    if (parentId !== -1 && nextId !== -1) {
                        node = candidate;
                    }
                }
                if (!node) {
                    let tailNode = addList.tail;
                    while (tailNode) {
                        const _node = tailNode;
                        tailNode = tailNode.previous;
                        if (_node) {
                            const parentId = this.mirror.getId(_node.value.parentNode);
                            const nextId = getNextId(_node.value);
                            if (nextId === -1)
                                continue;
                            else if (parentId !== -1) {
                                node = _node;
                                break;
                            }
                            else {
                                const unhandledNode = _node.value;
                                if (unhandledNode.parentNode &&
                                    unhandledNode.parentNode.nodeType ===
                                        Node.DOCUMENT_FRAGMENT_NODE) {
                                    const shadowHost = unhandledNode.parentNode
                                        .host;
                                    const parentId = this.mirror.getId(shadowHost);
                                    if (parentId !== -1) {
                                        node = _node;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (!node) {
                    while (addList.head) {
                        addList.removeNode(addList.head.value);
                    }
                    break;
                }
                candidate = node.previous;
                addList.removeNode(node.value);
                pushAdd(node.value);
            }
            const payload = {
                texts: this.texts
                    .map((text) => ({
                    id: this.mirror.getId(text.node),
                    value: text.value,
                }))
                    .filter((text) => !addedIds.has(text.id))
                    .filter((text) => this.mirror.has(text.id)),
                attributes: this.attributes
                    .map((attribute) => {
                    const { attributes } = attribute;
                    if (typeof attributes.style === 'string') {
                        const diffAsStr = JSON.stringify(attribute.styleDiff);
                        const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
                        if (diffAsStr.length < attributes.style.length) {
                            if ((diffAsStr + unchangedAsStr).split('var(').length ===
                                attributes.style.split('var(').length) {
                                attributes.style = attribute.styleDiff;
                            }
                        }
                    }
                    return {
                        id: this.mirror.getId(attribute.node),
                        attributes: attributes,
                    };
                })
                    .filter((attribute) => !addedIds.has(attribute.id))
                    .filter((attribute) => this.mirror.has(attribute.id)),
                removes: this.removes,
                adds,
            };
            if (!payload.texts.length &&
                !payload.attributes.length &&
                !payload.removes.length &&
                !payload.adds.length) {
                return;
            }
            this.texts = [];
            this.attributes = [];
            this.attributeMap = new WeakMap();
            this.removes = [];
            this.addedSet = new Set();
            this.movedSet = new Set();
            this.droppedSet = new Set();
            this.movedMap = {};
            this.mutationCb(payload);
        };
        this.processMutation = (m) => {
            if (isIgnored(m.target, this.mirror)) {
                return;
            }
            switch (m.type) {
                case 'characterData': {
                    const value = m.target.textContent;
                    if (!isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) &&
                        value !== m.oldValue) {
                        this.texts.push({
                            value: needMaskingText(m.target, this.maskTextClass, this.maskTextSelector, this.unmaskTextClass, this.unmaskTextSelector, this.maskAllText) && value
                                ? this.maskTextFn
                                    ? this.maskTextFn(value, closestElementOfNode(m.target))
                                    : value.replace(/[\S]/g, '*')
                                : value,
                            node: m.target,
                        });
                    }
                    break;
                }
                case 'attributes': {
                    const target = m.target;
                    let attributeName = m.attributeName;
                    let value = m.target.getAttribute(attributeName);
                    if (attributeName === 'value') {
                        const type = getInputType(target);
                        const tagName = target.tagName;
                        value = getInputValue(target, tagName, type);
                        const isInputMasked = shouldMaskInput({
                            maskInputOptions: this.maskInputOptions,
                            tagName,
                            type,
                        });
                        const forceMask = needMaskingText(m.target, this.maskTextClass, this.maskTextSelector, this.unmaskTextClass, this.unmaskTextSelector, isInputMasked);
                        value = maskInputValue({
                            isMasked: forceMask,
                            element: target,
                            value,
                            maskInputFn: this.maskInputFn,
                        });
                    }
                    if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) ||
                        value === m.oldValue) {
                        return;
                    }
                    let item = this.attributeMap.get(m.target);
                    if (target.tagName === 'IFRAME' &&
                        attributeName === 'src' &&
                        !this.keepIframeSrcFn(value)) {
                        const iframeDoc = getIFrameContentDocument(target);
                        if (!iframeDoc) {
                            attributeName = 'rr_src';
                        }
                        else {
                            return;
                        }
                    }
                    if (!item) {
                        item = {
                            node: m.target,
                            attributes: {},
                            styleDiff: {},
                            _unchangedStyles: {},
                        };
                        this.attributes.push(item);
                        this.attributeMap.set(m.target, item);
                    }
                    if (attributeName === 'type' &&
                        target.tagName === 'INPUT' &&
                        (m.oldValue || '').toLowerCase() === 'password') {
                        target.setAttribute('data-rr-is-password', 'true');
                    }
                    if (!ignoreAttribute(target.tagName, attributeName)) {
                        item.attributes[attributeName] = transformAttribute(this.doc, toLowerCase(target.tagName), toLowerCase(attributeName), value, target, this.maskAttributeFn);
                        if (attributeName === 'style') {
                            if (!this.unattachedDoc) {
                                try {
                                    this.unattachedDoc =
                                        document.implementation.createHTMLDocument();
                                }
                                catch (e) {
                                    this.unattachedDoc = this.doc;
                                }
                            }
                            const old = this.unattachedDoc.createElement('span');
                            if (m.oldValue) {
                                old.setAttribute('style', m.oldValue);
                            }
                            for (const pname of Array.from(target.style)) {
                                const newValue = target.style.getPropertyValue(pname);
                                const newPriority = target.style.getPropertyPriority(pname);
                                if (newValue !== old.style.getPropertyValue(pname) ||
                                    newPriority !== old.style.getPropertyPriority(pname)) {
                                    if (newPriority === '') {
                                        item.styleDiff[pname] = newValue;
                                    }
                                    else {
                                        item.styleDiff[pname] = [newValue, newPriority];
                                    }
                                }
                                else {
                                    item._unchangedStyles[pname] = [newValue, newPriority];
                                }
                            }
                            for (const pname of Array.from(old.style)) {
                                if (target.style.getPropertyValue(pname) === '') {
                                    item.styleDiff[pname] = false;
                                }
                            }
                        }
                    }
                    break;
                }
                case 'childList': {
                    if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, true)) {
                        return;
                    }
                    m.addedNodes.forEach((n) => this.genAdds(n, m.target));
                    m.removedNodes.forEach((n) => {
                        const nodeId = this.mirror.getId(n);
                        const parentId = isShadowRoot(m.target)
                            ? this.mirror.getId(m.target.host)
                            : this.mirror.getId(m.target);
                        if (isBlocked(m.target, this.blockClass, this.blockSelector, this.unblockSelector, false) ||
                            isIgnored(n, this.mirror) ||
                            !isSerialized(n, this.mirror)) {
                            return;
                        }
                        if (this.addedSet.has(n)) {
                            deepDelete(this.addedSet, n);
                            this.droppedSet.add(n);
                        }
                        else if (this.addedSet.has(m.target) && nodeId === -1) ;
                        else if (isAncestorRemoved(m.target, this.mirror)) ;
                        else if (this.movedSet.has(n) &&
                            this.movedMap[moveKey(nodeId, parentId)]) {
                            deepDelete(this.movedSet, n);
                        }
                        else {
                            this.removes.push({
                                parentId,
                                id: nodeId,
                                isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target)
                                    ? true
                                    : undefined,
                            });
                        }
                        this.mapRemoves.push(n);
                    });
                    break;
                }
            }
        };
        this.genAdds = (n, target) => {
            if (this.processedNodeManager.inOtherBuffer(n, this))
                return;
            if (this.addedSet.has(n) || this.movedSet.has(n))
                return;
            if (this.mirror.hasNode(n)) {
                if (isIgnored(n, this.mirror)) {
                    return;
                }
                this.movedSet.add(n);
                let targetId = null;
                if (target && this.mirror.hasNode(target)) {
                    targetId = this.mirror.getId(target);
                }
                if (targetId && targetId !== -1) {
                    this.movedMap[moveKey(this.mirror.getId(n), targetId)] = true;
                }
            }
            else {
                this.addedSet.add(n);
                this.droppedSet.delete(n);
            }
            if (!isBlocked(n, this.blockClass, this.blockSelector, this.unblockSelector, false)) {
                n.childNodes.forEach((childN) => this.genAdds(childN));
                if (hasShadowRoot(n)) {
                    n.shadowRoot.childNodes.forEach((childN) => {
                        this.processedNodeManager.add(childN, this);
                        this.genAdds(childN, n);
                    });
                }
            }
        };
    }
    init(options) {
        [
            'mutationCb',
            'blockClass',
            'blockSelector',
            'unblockSelector',
            'maskAllText',
            'maskTextClass',
            'unmaskTextClass',
            'maskTextSelector',
            'unmaskTextSelector',
            'inlineStylesheet',
            'maskInputOptions',
            'maskAttributeFn',
            'maskTextFn',
            'maskInputFn',
            'keepIframeSrcFn',
            'recordCanvas',
            'inlineImages',
            'slimDOMOptions',
            'dataURLOptions',
            'doc',
            'mirror',
            'iframeManager',
            'stylesheetManager',
            'shadowDomManager',
            'canvasManager',
            'processedNodeManager',
        ].forEach((key) => {
            this[key] = options[key];
        });
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
}
function deepDelete(addsSet, n) {
    addsSet.delete(n);
    n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}
function isParentRemoved(removes, n, mirror) {
    if (removes.length === 0)
        return false;
    return _isParentRemoved(removes, n, mirror);
}
function _isParentRemoved(removes, n, mirror) {
    let node = n.parentNode;
    while (node) {
        const parentId = mirror.getId(node);
        if (removes.some((r) => r.id === parentId)) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}
function isAncestorInSet(set, n) {
    if (set.size === 0)
        return false;
    return _isAncestorInSet(set, n);
}
function _isAncestorInSet(set, n) {
    const { parentNode } = n;
    if (!parentNode) {
        return false;
    }
    if (set.has(parentNode)) {
        return true;
    }
    return _isAncestorInSet(set, parentNode);
}

let errorHandler;
function registerErrorHandler(handler) {
    errorHandler = handler;
}
function unregisterErrorHandler() {
    errorHandler = undefined;
}
const callbackWrapper = (cb) => {
    if (!errorHandler) {
        return cb;
    }
    const rrwebWrapped = ((...rest) => {
        try {
            return cb(...rest);
        }
        catch (error) {
            if (errorHandler && errorHandler(error) === true) {
                return () => {
                };
            }
            throw error;
        }
    });
    return rrwebWrapped;
};

function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const mutationBuffers = [];
function getEventTarget$1(event) {
    try {
        if ('composedPath' in event) {
            const path = event.composedPath();
            if (path.length) {
                return path[0];
            }
        }
        else if ('path' in event && event.path.length) {
            return event.path[0];
        }
    }
    catch (e2) {
    }
    return event && event.target;
}
function initMutationObserver(options, rootEl) {
    const mutationBuffer = new MutationBuffer();
    mutationBuffers.push(mutationBuffer);
    mutationBuffer.init(options);
    let mutationObserverCtor = window.MutationObserver ||
        window.__rrMutationObserver;
    const angularZoneSymbol = _optionalChain$2([window, 'optionalAccess', _ => _.Zone, 'optionalAccess', _2 => _2.__symbol__, 'optionalCall', _3 => _3('MutationObserver')]);
    if (angularZoneSymbol &&
        window[angularZoneSymbol]) {
        mutationObserverCtor = window[angularZoneSymbol];
    }
    const observer = new mutationObserverCtor(callbackWrapper((mutations) => {
        if (options.onMutation && options.onMutation(mutations) === false) {
            return;
        }
        mutationBuffer.processMutations.bind(mutationBuffer)(mutations);
    }));
    observer.observe(rootEl, {
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true,
    });
    return observer;
}
function initMoveObserver({ mousemoveCb, sampling, doc, mirror, }) {
    if (sampling.mousemove === false) {
        return () => {
        };
    }
    const threshold = typeof sampling.mousemove === 'number' ? sampling.mousemove : 50;
    const callbackThreshold = typeof sampling.mousemoveCallback === 'number'
        ? sampling.mousemoveCallback
        : 500;
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
        const { clientX, clientY } = legacy_isTouchEvent(evt)
            ? evt.changedTouches[0]
            : evt;
        if (!timeBaseline) {
            timeBaseline = nowTimestamp();
        }
        positions.push({
            x: clientX,
            y: clientY,
            id: mirror.getId(target),
            timeOffset: nowTimestamp() - timeBaseline,
        });
        wrappedCb(typeof DragEvent !== 'undefined' && evt instanceof DragEvent
            ? IncrementalSource.Drag
            : evt instanceof MouseEvent
                ? IncrementalSource.MouseMove
                : IncrementalSource.TouchMove);
    }), threshold, {
        trailing: false,
    }));
    const handlers = [
        on('mousemove', updatePosition, doc),
        on('touchmove', updatePosition, doc),
        on('drag', updatePosition, doc),
    ];
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initMouseInteractionObserver({ mouseInteractionCb, doc, mirror, blockClass, blockSelector, unblockSelector, sampling, }) {
    if (sampling.mouseInteraction === false) {
        return () => {
        };
    }
    const disableMap = sampling.mouseInteraction === true ||
        sampling.mouseInteraction === undefined
        ? {}
        : sampling.mouseInteraction;
    const handlers = [];
    let currentPointerType = null;
    const getHandler = (eventKey) => {
        return (event) => {
            const target = getEventTarget$1(event);
            if (isBlocked(target, blockClass, blockSelector, unblockSelector, true)) {
                return;
            }
            let pointerType = null;
            let thisEventKey = eventKey;
            if ('pointerType' in event) {
                switch (event.pointerType) {
                    case 'mouse':
                        pointerType = PointerTypes.Mouse;
                        break;
                    case 'touch':
                        pointerType = PointerTypes.Touch;
                        break;
                    case 'pen':
                        pointerType = PointerTypes.Pen;
                        break;
                }
                if (pointerType === PointerTypes.Touch) {
                    if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) {
                        thisEventKey = 'TouchStart';
                    }
                    else if (MouseInteractions[eventKey] === MouseInteractions.MouseUp) {
                        thisEventKey = 'TouchEnd';
                    }
                }
            }
            else if (legacy_isTouchEvent(event)) {
                pointerType = PointerTypes.Touch;
            }
            if (pointerType !== null) {
                currentPointerType = pointerType;
                if ((thisEventKey.startsWith('Touch') &&
                    pointerType === PointerTypes.Touch) ||
                    (thisEventKey.startsWith('Mouse') &&
                        pointerType === PointerTypes.Mouse)) {
                    pointerType = null;
                }
            }
            else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
                pointerType = currentPointerType;
                currentPointerType = null;
            }
            const e = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
            if (!e) {
                return;
            }
            const id = mirror.getId(target);
            const { clientX, clientY } = e;
            callbackWrapper(mouseInteractionCb)({
                type: MouseInteractions[thisEventKey],
                id,
                x: clientX,
                y: clientY,
                ...(pointerType !== null && { pointerType }),
            });
        };
    };
    Object.keys(MouseInteractions)
        .filter((key) => Number.isNaN(Number(key)) &&
        !key.endsWith('_Departed') &&
        disableMap[key] !== false)
        .forEach((eventKey) => {
        let eventName = toLowerCase(eventKey);
        const handler = getHandler(eventKey);
        if (window.PointerEvent) {
            switch (MouseInteractions[eventKey]) {
                case MouseInteractions.MouseDown:
                case MouseInteractions.MouseUp:
                    eventName = eventName.replace('mouse', 'pointer');
                    break;
                case MouseInteractions.TouchStart:
                case MouseInteractions.TouchEnd:
                    return;
            }
        }
        handlers.push(on(eventName, handler, doc));
    });
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initScrollObserver({ scrollCb, doc, mirror, blockClass, blockSelector, unblockSelector, sampling, }) {
    const updatePosition = callbackWrapper(throttle$1(callbackWrapper((evt) => {
        const target = getEventTarget$1(evt);
        if (!target ||
            isBlocked(target, blockClass, blockSelector, unblockSelector, true)) {
            return;
        }
        const id = mirror.getId(target);
        if (target === doc && doc.defaultView) {
            const scrollLeftTop = getWindowScroll(doc.defaultView);
            scrollCb({
                id,
                x: scrollLeftTop.left,
                y: scrollLeftTop.top,
            });
        }
        else {
            scrollCb({
                id,
                x: target.scrollLeft,
                y: target.scrollTop,
            });
        }
    }), sampling.scroll || 100));
    return on('scroll', updatePosition, doc);
}
function initViewportResizeObserver({ viewportResizeCb }, { win }) {
    let lastH = -1;
    let lastW = -1;
    const updateDimension = callbackWrapper(throttle$1(callbackWrapper(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
            viewportResizeCb({
                width: Number(width),
                height: Number(height),
            });
            lastH = height;
            lastW = width;
        }
    }), 200));
    return on('resize', updateDimension, win);
}
const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const lastInputValueMap = new WeakMap();
function initInputObserver({ inputCb, doc, mirror, blockClass, blockSelector, unblockSelector, ignoreClass, ignoreSelector, maskInputOptions, maskInputFn, sampling, userTriggeredOnInput, maskTextClass, unmaskTextClass, maskTextSelector, unmaskTextSelector, }) {
    function eventHandler(event) {
        let target = getEventTarget$1(event);
        const userTriggered = event.isTrusted;
        const tagName = target && toUpperCase(target.tagName);
        if (tagName === 'OPTION')
            target = target.parentElement;
        if (!target ||
            !tagName ||
            INPUT_TAGS.indexOf(tagName) < 0 ||
            isBlocked(target, blockClass, blockSelector, unblockSelector, true)) {
            return;
        }
        const el = target;
        if (el.classList.contains(ignoreClass) ||
            (ignoreSelector && el.matches(ignoreSelector))) {
            return;
        }
        const type = getInputType(target);
        let text = getInputValue(el, tagName, type);
        let isChecked = false;
        const isInputMasked = shouldMaskInput({
            maskInputOptions,
            tagName,
            type,
        });
        const forceMask = needMaskingText(target, maskTextClass, maskTextSelector, unmaskTextClass, unmaskTextSelector, isInputMasked);
        if (type === 'radio' || type === 'checkbox') {
            isChecked = target.checked;
        }
        text = maskInputValue({
            isMasked: forceMask,
            element: target,
            value: text,
            maskInputFn,
        });
        cbWithDedup(target, userTriggeredOnInput
            ? { text, isChecked, userTriggered }
            : { text, isChecked });
        const name = target.name;
        if (type === 'radio' && name && isChecked) {
            doc
                .querySelectorAll(`input[type="radio"][name="${name}"]`)
                .forEach((el) => {
                if (el !== target) {
                    const text = maskInputValue({
                        isMasked: forceMask,
                        element: el,
                        value: getInputValue(el, tagName, type),
                        maskInputFn,
                    });
                    cbWithDedup(el, userTriggeredOnInput
                        ? { text, isChecked: !isChecked, userTriggered: false }
                        : { text, isChecked: !isChecked });
                }
            });
        }
    }
    function cbWithDedup(target, v) {
        const lastInputValue = lastInputValueMap.get(target);
        if (!lastInputValue ||
            lastInputValue.text !== v.text ||
            lastInputValue.isChecked !== v.isChecked) {
            lastInputValueMap.set(target, v);
            const id = mirror.getId(target);
            callbackWrapper(inputCb)({
                ...v,
                id,
            });
        }
    }
    const events = sampling.input === 'last' ? ['change'] : ['input', 'change'];
    const handlers = events.map((eventName) => on(eventName, callbackWrapper(eventHandler), doc));
    const currentWindow = doc.defaultView;
    if (!currentWindow) {
        return () => {
            handlers.forEach((h) => h());
        };
    }
    const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(currentWindow.HTMLInputElement.prototype, 'value');
    const hookProperties = [
        [currentWindow.HTMLInputElement.prototype, 'value'],
        [currentWindow.HTMLInputElement.prototype, 'checked'],
        [currentWindow.HTMLSelectElement.prototype, 'value'],
        [currentWindow.HTMLTextAreaElement.prototype, 'value'],
        [currentWindow.HTMLSelectElement.prototype, 'selectedIndex'],
        [currentWindow.HTMLOptionElement.prototype, 'selected'],
    ];
    if (propertyDescriptor && propertyDescriptor.set) {
        handlers.push(...hookProperties.map((p) => hookSetter(p[0], p[1], {
            set() {
                callbackWrapper(eventHandler)({
                    target: this,
                    isTrusted: false,
                });
            },
        }, false, currentWindow)));
    }
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function getNestedCSSRulePositions(rule) {
    const positions = [];
    function recurse(childRule, pos) {
        if ((hasNestedCSSRule('CSSGroupingRule') &&
            childRule.parentRule instanceof CSSGroupingRule) ||
            (hasNestedCSSRule('CSSMediaRule') &&
                childRule.parentRule instanceof CSSMediaRule) ||
            (hasNestedCSSRule('CSSSupportsRule') &&
                childRule.parentRule instanceof CSSSupportsRule) ||
            (hasNestedCSSRule('CSSConditionRule') &&
                childRule.parentRule instanceof CSSConditionRule)) {
            const rules = Array.from(childRule.parentRule.cssRules);
            const index = rules.indexOf(childRule);
            pos.unshift(index);
        }
        else if (childRule.parentStyleSheet) {
            const rules = Array.from(childRule.parentStyleSheet.cssRules);
            const index = rules.indexOf(childRule);
            pos.unshift(index);
        }
        return pos;
    }
    return recurse(rule, positions);
}
function getIdAndStyleId(sheet, mirror, styleMirror) {
    let id, styleId;
    if (!sheet)
        return {};
    if (sheet.ownerNode)
        id = mirror.getId(sheet.ownerNode);
    else
        styleId = styleMirror.getId(sheet);
    return {
        styleId,
        id,
    };
}
function initStyleSheetObserver({ styleSheetRuleCb, mirror, stylesheetManager }, { win }) {
    if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) {
        return () => {
        };
    }
    const insertRule = win.CSSStyleSheet.prototype.insertRule;
    win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [rule, index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    adds: [{ rule, index }],
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
    win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleSheetRuleCb({
                    id,
                    styleId,
                    removes: [{ index }],
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    let replace;
    if (win.CSSStyleSheet.prototype.replace) {
        replace = win.CSSStyleSheet.prototype.replace;
        win.CSSStyleSheet.prototype.replace = new Proxy(replace, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [text] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replace: text,
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
    }
    let replaceSync;
    if (win.CSSStyleSheet.prototype.replaceSync) {
        replaceSync = win.CSSStyleSheet.prototype.replaceSync;
        win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [text] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        replaceSync: text,
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
    }
    const supportedNestedCSSRuleTypes = {};
    if (canMonkeyPatchNestedCSSRule('CSSGroupingRule')) {
        supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
    }
    else {
        if (canMonkeyPatchNestedCSSRule('CSSMediaRule')) {
            supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
        }
        if (canMonkeyPatchNestedCSSRule('CSSConditionRule')) {
            supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
        }
        if (canMonkeyPatchNestedCSSRule('CSSSupportsRule')) {
            supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
        }
    }
    const unmodifiedFunctions = {};
    Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
        unmodifiedFunctions[typeKey] = {
            insertRule: type.prototype.insertRule,
            deleteRule: type.prototype.deleteRule,
        };
        type.prototype.insertRule = new Proxy(unmodifiedFunctions[typeKey].insertRule, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [rule, index] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        adds: [
                            {
                                rule,
                                index: [
                                    ...getNestedCSSRulePositions(thisArg),
                                    index || 0,
                                ],
                            },
                        ],
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
        type.prototype.deleteRule = new Proxy(unmodifiedFunctions[typeKey].deleteRule, {
            apply: callbackWrapper((target, thisArg, argumentsList) => {
                const [index] = argumentsList;
                const { id, styleId } = getIdAndStyleId(thisArg.parentStyleSheet, mirror, stylesheetManager.styleMirror);
                if ((id && id !== -1) || (styleId && styleId !== -1)) {
                    styleSheetRuleCb({
                        id,
                        styleId,
                        removes: [
                            { index: [...getNestedCSSRulePositions(thisArg), index] },
                        ],
                    });
                }
                return target.apply(thisArg, argumentsList);
            }),
        });
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
function initAdoptedStyleSheetObserver({ mirror, stylesheetManager, }, host) {
    let hostId = null;
    if (host.nodeName === '#document')
        hostId = mirror.getId(host);
    else
        hostId = mirror.getId(host.host);
    const patchTarget = host.nodeName === '#document'
        ? _optionalChain$2([host, 'access', _4 => _4.defaultView, 'optionalAccess', _5 => _5.Document])
        : _optionalChain$2([host, 'access', _6 => _6.ownerDocument, 'optionalAccess', _7 => _7.defaultView, 'optionalAccess', _8 => _8.ShadowRoot]);
    const originalPropertyDescriptor = _optionalChain$2([patchTarget, 'optionalAccess', _9 => _9.prototype])
        ? Object.getOwnPropertyDescriptor(_optionalChain$2([patchTarget, 'optionalAccess', _10 => _10.prototype]), 'adoptedStyleSheets')
        : undefined;
    if (hostId === null ||
        hostId === -1 ||
        !patchTarget ||
        !originalPropertyDescriptor)
        return () => {
        };
    Object.defineProperty(host, 'adoptedStyleSheets', {
        configurable: originalPropertyDescriptor.configurable,
        enumerable: originalPropertyDescriptor.enumerable,
        get() {
            return _optionalChain$2([originalPropertyDescriptor, 'access', _11 => _11.get, 'optionalAccess', _12 => _12.call, 'call', _13 => _13(this)]);
        },
        set(sheets) {
            const result = _optionalChain$2([originalPropertyDescriptor, 'access', _14 => _14.set, 'optionalAccess', _15 => _15.call, 'call', _16 => _16(this, sheets)]);
            if (hostId !== null && hostId !== -1) {
                try {
                    stylesheetManager.adoptStyleSheets(sheets, hostId);
                }
                catch (e) {
                }
            }
            return result;
        },
    });
    return callbackWrapper(() => {
        Object.defineProperty(host, 'adoptedStyleSheets', {
            configurable: originalPropertyDescriptor.configurable,
            enumerable: originalPropertyDescriptor.enumerable,
            get: originalPropertyDescriptor.get,
            set: originalPropertyDescriptor.set,
        });
    });
}
function initStyleDeclarationObserver({ styleDeclarationCb, mirror, ignoreCSSAttributes, stylesheetManager, }, { win }) {
    const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
    win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [property, value, priority] = argumentsList;
            if (ignoreCSSAttributes.has(property)) {
                return setProperty.apply(thisArg, [property, value, priority]);
            }
            const { id, styleId } = getIdAndStyleId(_optionalChain$2([thisArg, 'access', _17 => _17.parentRule, 'optionalAccess', _18 => _18.parentStyleSheet]), mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    set: {
                        property,
                        value,
                        priority,
                    },
                    index: getNestedCSSRulePositions(thisArg.parentRule),
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
    win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, {
        apply: callbackWrapper((target, thisArg, argumentsList) => {
            const [property] = argumentsList;
            if (ignoreCSSAttributes.has(property)) {
                return removeProperty.apply(thisArg, [property]);
            }
            const { id, styleId } = getIdAndStyleId(_optionalChain$2([thisArg, 'access', _19 => _19.parentRule, 'optionalAccess', _20 => _20.parentStyleSheet]), mirror, stylesheetManager.styleMirror);
            if ((id && id !== -1) || (styleId && styleId !== -1)) {
                styleDeclarationCb({
                    id,
                    styleId,
                    remove: {
                        property,
                    },
                    index: getNestedCSSRulePositions(thisArg.parentRule),
                });
            }
            return target.apply(thisArg, argumentsList);
        }),
    });
    return callbackWrapper(() => {
        win.CSSStyleDeclaration.prototype.setProperty = setProperty;
        win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
    });
}
function initMediaInteractionObserver({ mediaInteractionCb, blockClass, blockSelector, unblockSelector, mirror, sampling, doc, }) {
    const handler = callbackWrapper((type) => throttle$1(callbackWrapper((event) => {
        const target = getEventTarget$1(event);
        if (!target ||
            isBlocked(target, blockClass, blockSelector, unblockSelector, true)) {
            return;
        }
        const { currentTime, volume, muted, playbackRate } = target;
        mediaInteractionCb({
            type,
            id: mirror.getId(target),
            currentTime,
            volume,
            muted,
            playbackRate,
        });
    }), sampling.media || 500));
    const handlers = [
        on('play', handler(0), doc),
        on('pause', handler(1), doc),
        on('seeked', handler(2), doc),
        on('volumechange', handler(3), doc),
        on('ratechange', handler(4), doc),
    ];
    return callbackWrapper(() => {
        handlers.forEach((h) => h());
    });
}
function initFontObserver({ fontCb, doc }) {
    const win = doc.defaultView;
    if (!win) {
        return () => {
        };
    }
    const handlers = [];
    const fontMap = new WeakMap();
    const originalFontFace = win.FontFace;
    win.FontFace = function FontFace(family, source, descriptors) {
        const fontFace = new originalFontFace(family, source, descriptors);
        fontMap.set(fontFace, {
            family,
            buffer: typeof source !== 'string',
            descriptors,
            fontSource: typeof source === 'string'
                ? source
                : JSON.stringify(Array.from(new Uint8Array(source))),
        });
        return fontFace;
    };
    const restoreHandler = patch(doc.fonts, 'add', function (original) {
        return function (fontFace) {
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
    const { doc, mirror, blockClass, blockSelector, unblockSelector, selectionCb, } = param;
    let collapsed = true;
    const updateSelection = callbackWrapper(() => {
        const selection = doc.getSelection();
        if (!selection || (collapsed && _optionalChain$2([selection, 'optionalAccess', _21 => _21.isCollapsed])))
            return;
        collapsed = selection.isCollapsed || false;
        const ranges = [];
        const count = selection.rangeCount || 0;
        for (let i = 0; i < count; i++) {
            const range = selection.getRangeAt(i);
            const { startContainer, startOffset, endContainer, endOffset } = range;
            const blocked = isBlocked(startContainer, blockClass, blockSelector, unblockSelector, true) ||
                isBlocked(endContainer, blockClass, blockSelector, unblockSelector, true);
            if (blocked)
                continue;
            ranges.push({
                start: mirror.getId(startContainer),
                startOffset,
                end: mirror.getId(endContainer),
                endOffset,
            });
        }
        selectionCb({ ranges });
    });
    updateSelection();
    return on('selectionchange', updateSelection);
}
function initCustomElementObserver({ doc, customElementCb, }) {
    const win = doc.defaultView;
    if (!win || !win.customElements)
        return () => { };
    const restoreHandler = patch(win.customElements, 'define', function (original) {
        return function (name, constructor, options) {
            try {
                customElementCb({
                    define: {
                        name,
                    },
                });
            }
            catch (e) {
            }
            return original.apply(this, [name, constructor, options]);
        };
    });
    return restoreHandler;
}
function initObservers(o, _hooks = {}) {
    const currentWindow = o.doc.defaultView;
    if (!currentWindow) {
        return () => {
        };
    }
    let mutationObserver;
    if (o.recordDOM) {
        mutationObserver = initMutationObserver(o, o.doc);
    }
    const mousemoveHandler = initMoveObserver(o);
    const mouseInteractionHandler = initMouseInteractionObserver(o);
    const scrollHandler = initScrollObserver(o);
    const viewportResizeHandler = initViewportResizeObserver(o, {
        win: currentWindow,
    });
    const inputHandler = initInputObserver(o);
    const mediaInteractionHandler = initMediaInteractionObserver(o);
    let styleSheetObserver = () => { };
    let adoptedStyleSheetObserver = () => { };
    let styleDeclarationObserver = () => { };
    let fontObserver = () => { };
    if (o.recordDOM) {
        styleSheetObserver = initStyleSheetObserver(o, { win: currentWindow });
        adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o, o.doc);
        styleDeclarationObserver = initStyleDeclarationObserver(o, {
            win: currentWindow,
        });
        if (o.collectFonts) {
            fontObserver = initFontObserver(o);
        }
    }
    const selectionObserver = initSelectionObserver(o);
    const customElementObserver = initCustomElementObserver(o);
    const pluginHandlers = [];
    for (const plugin of o.plugins) {
        pluginHandlers.push(plugin.observer(plugin.callback, currentWindow, plugin.options));
    }
    return callbackWrapper(() => {
        mutationBuffers.forEach((b) => b.reset());
        _optionalChain$2([mutationObserver, 'optionalAccess', _22 => _22.disconnect, 'call', _23 => _23()]);
        mousemoveHandler();
        mouseInteractionHandler();
        scrollHandler();
        viewportResizeHandler();
        inputHandler();
        mediaInteractionHandler();
        styleSheetObserver();
        adoptedStyleSheetObserver();
        styleDeclarationObserver();
        fontObserver();
        selectionObserver();
        customElementObserver();
        pluginHandlers.forEach((h) => h());
    });
}
function hasNestedCSSRule(prop) {
    return typeof window[prop] !== 'undefined';
}
function canMonkeyPatchNestedCSSRule(prop) {
    return Boolean(typeof window[prop] !== 'undefined' &&
        window[prop].prototype &&
        'insertRule' in window[prop].prototype &&
        'deleteRule' in window[prop].prototype);
}

class CrossOriginIframeMirror {
    constructor(generateIdFn) {
        this.generateIdFn = generateIdFn;
        this.iframeIdToRemoteIdMap = new WeakMap();
        this.iframeRemoteIdToIdMap = new WeakMap();
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
        if (typeof id !== 'number')
            return id;
        const remoteId = remoteIdToIdMap.get(id);
        if (!remoteId)
            return -1;
        return remoteId;
    }
    getRemoteIds(iframe, ids) {
        const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
        return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
    }
    reset(iframe) {
        if (!iframe) {
            this.iframeIdToRemoteIdMap = new WeakMap();
            this.iframeRemoteIdToIdMap = new WeakMap();
            return;
        }
        this.iframeIdToRemoteIdMap.delete(iframe);
        this.iframeRemoteIdToIdMap.delete(iframe);
    }
    getIdToRemoteIdMap(iframe) {
        let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
        if (!idToRemoteIdMap) {
            idToRemoteIdMap = new Map();
            this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
        }
        return idToRemoteIdMap;
    }
    getRemoteIdToIdMap(iframe) {
        let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
        if (!remoteIdToIdMap) {
            remoteIdToIdMap = new Map();
            this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
        }
        return remoteIdToIdMap;
    }
}

function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }class IframeManager {
    constructor(options) {
        this.iframes = new WeakMap();
        this.crossOriginIframeMap = new WeakMap();
        this.crossOriginIframeMirror = new CrossOriginIframeMirror(genId);
        this.crossOriginIframeRootIdMap = new WeakMap();
        this.mutationCb = options.mutationCb;
        this.wrappedEmit = options.wrappedEmit;
        this.stylesheetManager = options.stylesheetManager;
        this.recordCrossOriginIframes = options.recordCrossOriginIframes;
        this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(this.stylesheetManager.styleMirror.generateId.bind(this.stylesheetManager.styleMirror));
        this.mirror = options.mirror;
        if (this.recordCrossOriginIframes) {
            window.addEventListener('message', this.handleMessage.bind(this));
        }
    }
    addIframe(iframeEl) {
        this.iframes.set(iframeEl, true);
        if (iframeEl.contentWindow)
            this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
    }
    addLoadListener(cb) {
        this.loadListener = cb;
    }
    attachIframe(iframeEl, childSn) {
        this.mutationCb({
            adds: [
                {
                    parentId: this.mirror.getId(iframeEl),
                    nextId: null,
                    node: childSn,
                },
            ],
            removes: [],
            texts: [],
            attributes: [],
            isAttachIframe: true,
        });
        _optionalChain$1([this, 'access', _ => _.loadListener, 'optionalCall', _2 => _2(iframeEl)]);
        const iframeDoc = getIFrameContentDocument(iframeEl);
        if (iframeDoc &&
            iframeDoc.adoptedStyleSheets &&
            iframeDoc.adoptedStyleSheets.length > 0)
            this.stylesheetManager.adoptStyleSheets(iframeDoc.adoptedStyleSheets, this.mirror.getId(iframeDoc));
    }
    handleMessage(message) {
        const crossOriginMessageEvent = message;
        if (crossOriginMessageEvent.data.type !== 'rrweb' ||
            crossOriginMessageEvent.origin !== crossOriginMessageEvent.data.origin)
            return;
        const iframeSourceWindow = message.source;
        if (!iframeSourceWindow)
            return;
        const iframeEl = this.crossOriginIframeMap.get(message.source);
        if (!iframeEl)
            return;
        const transformedEvent = this.transformCrossOriginEvent(iframeEl, crossOriginMessageEvent.data.event);
        if (transformedEvent)
            this.wrappedEmit(transformedEvent, crossOriginMessageEvent.data.isCheckout);
    }
    transformCrossOriginEvent(iframeEl, e) {
        switch (e.type) {
            case EventType.FullSnapshot: {
                this.crossOriginIframeMirror.reset(iframeEl);
                this.crossOriginIframeStyleMirror.reset(iframeEl);
                this.replaceIdOnNode(e.data.node, iframeEl);
                const rootId = e.data.node.id;
                this.crossOriginIframeRootIdMap.set(iframeEl, rootId);
                this.patchRootIdOnNode(e.data.node, rootId);
                return {
                    timestamp: e.timestamp,
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.Mutation,
                        adds: [
                            {
                                parentId: this.mirror.getId(iframeEl),
                                nextId: null,
                                node: e.data.node,
                            },
                        ],
                        removes: [],
                        texts: [],
                        attributes: [],
                        isAttachIframe: true,
                    },
                };
            }
            case EventType.Meta:
            case EventType.Load:
            case EventType.DomContentLoaded: {
                return false;
            }
            case EventType.Plugin: {
                return e;
            }
            case EventType.Custom: {
                this.replaceIds(e.data.payload, iframeEl, ['id', 'parentId', 'previousId', 'nextId']);
                return e;
            }
            case EventType.IncrementalSnapshot: {
                switch (e.data.source) {
                    case IncrementalSource.Mutation: {
                        e.data.adds.forEach((n) => {
                            this.replaceIds(n, iframeEl, [
                                'parentId',
                                'nextId',
                                'previousId',
                            ]);
                            this.replaceIdOnNode(n.node, iframeEl);
                            const rootId = this.crossOriginIframeRootIdMap.get(iframeEl);
                            rootId && this.patchRootIdOnNode(n.node, rootId);
                        });
                        e.data.removes.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['parentId', 'id']);
                        });
                        e.data.attributes.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['id']);
                        });
                        e.data.texts.forEach((n) => {
                            this.replaceIds(n, iframeEl, ['id']);
                        });
                        return e;
                    }
                    case IncrementalSource.Drag:
                    case IncrementalSource.TouchMove:
                    case IncrementalSource.MouseMove: {
                        e.data.positions.forEach((p) => {
                            this.replaceIds(p, iframeEl, ['id']);
                        });
                        return e;
                    }
                    case IncrementalSource.ViewportResize: {
                        return false;
                    }
                    case IncrementalSource.MediaInteraction:
                    case IncrementalSource.MouseInteraction:
                    case IncrementalSource.Scroll:
                    case IncrementalSource.CanvasMutation:
                    case IncrementalSource.Input: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        return e;
                    }
                    case IncrementalSource.StyleSheetRule:
                    case IncrementalSource.StyleDeclaration: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        this.replaceStyleIds(e.data, iframeEl, ['styleId']);
                        return e;
                    }
                    case IncrementalSource.Font: {
                        return e;
                    }
                    case IncrementalSource.Selection: {
                        e.data.ranges.forEach((range) => {
                            this.replaceIds(range, iframeEl, ['start', 'end']);
                        });
                        return e;
                    }
                    case IncrementalSource.AdoptedStyleSheet: {
                        this.replaceIds(e.data, iframeEl, ['id']);
                        this.replaceStyleIds(e.data, iframeEl, ['styleIds']);
                        _optionalChain$1([e, 'access', _3 => _3.data, 'access', _4 => _4.styles, 'optionalAccess', _5 => _5.forEach, 'call', _6 => _6((style) => {
                            this.replaceStyleIds(style, iframeEl, ['styleId']);
                        })]);
                        return e;
                    }
                }
            }
        }
        return false;
    }
    replace(iframeMirror, obj, iframeEl, keys) {
        for (const key of keys) {
            if (!Array.isArray(obj[key]) && typeof obj[key] !== 'number')
                continue;
            if (Array.isArray(obj[key])) {
                obj[key] = iframeMirror.getIds(iframeEl, obj[key]);
            }
            else {
                obj[key] = iframeMirror.getId(iframeEl, obj[key]);
            }
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
        this.replaceIds(node, iframeEl, ['id', 'rootId']);
        if ('childNodes' in node) {
            node.childNodes.forEach((child) => {
                this.replaceIdOnNode(child, iframeEl);
            });
        }
    }
    patchRootIdOnNode(node, rootId) {
        if (node.type !== NodeType$3.Document && !node.rootId)
            node.rootId = rootId;
        if ('childNodes' in node) {
            node.childNodes.forEach((child) => {
                this.patchRootIdOnNode(child, rootId);
            });
        }
    }
}

class ShadowDomManager {
    constructor(options) {
        this.shadowDoms = new WeakSet();
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
        if (!isNativeShadowDom(shadowRoot))
            return;
        if (this.shadowDoms.has(shadowRoot))
            return;
        this.shadowDoms.add(shadowRoot);
        this.bypassOptions.canvasManager.addShadowRoot(shadowRoot);
        const observer = initMutationObserver({
            ...this.bypassOptions,
            doc,
            mutationCb: this.mutationCb,
            mirror: this.mirror,
            shadowDomManager: this,
        }, shadowRoot);
        this.restoreHandlers.push(() => observer.disconnect());
        this.restoreHandlers.push(initScrollObserver({
            ...this.bypassOptions,
            scrollCb: this.scrollCb,
            doc: shadowRoot,
            mirror: this.mirror,
        }));
        setTimeout$2(() => {
            if (shadowRoot.adoptedStyleSheets &&
                shadowRoot.adoptedStyleSheets.length > 0)
                this.bypassOptions.stylesheetManager.adoptStyleSheets(shadowRoot.adoptedStyleSheets, this.mirror.getId(shadowRoot.host));
            this.restoreHandlers.push(initAdoptedStyleSheetObserver({
                mirror: this.mirror,
                stylesheetManager: this.bypassOptions.stylesheetManager,
            }, shadowRoot));
        }, 0);
    }
    observeAttachShadow(iframeElement) {
        const iframeDoc = getIFrameContentDocument(iframeElement);
        const iframeWindow = getIFrameContentWindow(iframeElement);
        if (!iframeDoc || !iframeWindow)
            return;
        this.patchAttachShadow(iframeWindow.Element, iframeDoc);
    }
    patchAttachShadow(element, doc) {
        const manager = this;
        this.restoreHandlers.push(patch(element.prototype, 'attachShadow', function (original) {
            return function (option) {
                const shadowRoot = original.call(this, option);
                if (this.shadowRoot && inDom(this))
                    manager.addShadowRoot(this.shadowRoot, doc);
                return shadowRoot;
            };
        }));
    }
    reset() {
        this.restoreHandlers.forEach((handler) => {
            try {
                handler();
            }
            catch (e) {
            }
        });
        this.restoreHandlers = [];
        this.shadowDoms = new WeakSet();
        this.bypassOptions.canvasManager.resetShadowRoots();
    }
}

class CanvasManagerNoop {
    reset() {
    }
    freeze() {
    }
    unfreeze() {
    }
    lock() {
    }
    unlock() {
    }
    snapshot() {
    }
    addWindow() {
    }
    addShadowRoot() {
    }
    resetShadowRoots() {
    }
}

class StylesheetManager {
    constructor(options) {
        this.trackedLinkElements = new WeakSet();
        this.styleMirror = new StyleSheetMirror();
        this.mutationCb = options.mutationCb;
        this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
    }
    attachLinkElement(linkEl, childSn) {
        if ('_cssText' in childSn.attributes)
            this.mutationCb({
                adds: [],
                removes: [],
                texts: [],
                attributes: [
                    {
                        id: childSn.id,
                        attributes: childSn
                            .attributes,
                    },
                ],
            });
        this.trackLinkElement(linkEl);
    }
    trackLinkElement(linkEl) {
        if (this.trackedLinkElements.has(linkEl))
            return;
        this.trackedLinkElements.add(linkEl);
        this.trackStylesheetInLinkElement(linkEl);
    }
    adoptStyleSheets(sheets, hostId) {
        if (sheets.length === 0)
            return;
        const adoptedStyleSheetData = {
            id: hostId,
            styleIds: [],
        };
        const styles = [];
        for (const sheet of sheets) {
            let styleId;
            if (!this.styleMirror.has(sheet)) {
                styleId = this.styleMirror.add(sheet);
                styles.push({
                    styleId,
                    rules: Array.from(sheet.rules || CSSRule, (r, index) => ({
                        rule: stringifyRule(r),
                        index,
                    })),
                });
            }
            else
                styleId = this.styleMirror.getId(sheet);
            adoptedStyleSheetData.styleIds.push(styleId);
        }
        if (styles.length > 0)
            adoptedStyleSheetData.styles = styles;
        this.adoptedStyleSheetCb(adoptedStyleSheetData);
    }
    reset() {
        this.styleMirror.reset();
        this.trackedLinkElements = new WeakSet();
    }
    trackStylesheetInLinkElement(linkEl) {
    }
}

class ProcessedNodeManager {
    constructor() {
        this.nodeMap = new WeakMap();
        this.active = false;
    }
    inOtherBuffer(node, thisBuffer) {
        const buffers = this.nodeMap.get(node);
        return (buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer));
    }
    add(node, buffer) {
        if (!this.active) {
            this.active = true;
            onRequestAnimationFrame(() => {
                this.nodeMap = new WeakMap();
                this.active = false;
            });
        }
        this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
    }
    destroy() {
    }
}

function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
let wrappedEmit;
let _takeFullSnapshot;
try {
    if (Array.from([1], (x) => x * 2)[0] !== 2) {
        const cleanFrame = document.createElement('iframe');
        document.body.appendChild(cleanFrame);
        Array.from = _optionalChain([cleanFrame, 'access', _ => _.contentWindow, 'optionalAccess', _2 => _2.Array, 'access', _3 => _3.from]) || Array.from;
        document.body.removeChild(cleanFrame);
    }
}
catch (err) {
    console.debug('Unable to override Array.from', err);
}
const mirror = createMirror();
function record(options = {}) {
    const { emit, checkoutEveryNms, checkoutEveryNth, blockClass = 'rr-block', blockSelector = null, unblockSelector = null, ignoreClass = 'rr-ignore', ignoreSelector = null, maskAllText = false, maskTextClass = 'rr-mask', unmaskTextClass = null, maskTextSelector = null, unmaskTextSelector = null, inlineStylesheet = true, maskAllInputs, maskInputOptions: _maskInputOptions, slimDOMOptions: _slimDOMOptions, maskAttributeFn, maskInputFn, maskTextFn, maxCanvasSize = null, packFn, sampling = {}, dataURLOptions = {}, mousemoveWait, recordDOM = true, recordCanvas = false, recordCrossOriginIframes = false, recordAfter = options.recordAfter === 'DOMContentLoaded'
        ? options.recordAfter
        : 'load', userTriggeredOnInput = false, collectFonts = false, inlineImages = false, plugins, keepIframeSrcFn = () => false, ignoreCSSAttributes = new Set([]), errorHandler, onMutation, getCanvasManager, } = options;
    registerErrorHandler(errorHandler);
    const inEmittingFrame = recordCrossOriginIframes
        ? window.parent === window
        : true;
    let passEmitsToParent = false;
    if (!inEmittingFrame) {
        try {
            if (window.parent.document) {
                passEmitsToParent = false;
            }
        }
        catch (e) {
            passEmitsToParent = true;
        }
    }
    if (inEmittingFrame && !emit) {
        throw new Error('emit function is required');
    }
    if (!inEmittingFrame && !passEmitsToParent) {
        return () => {
        };
    }
    if (mousemoveWait !== undefined && sampling.mousemove === undefined) {
        sampling.mousemove = mousemoveWait;
    }
    mirror.reset();
    const maskInputOptions = maskAllInputs === true
        ? {
            color: true,
            date: true,
            'datetime-local': true,
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
            textarea: true,
            select: true,
            radio: true,
            checkbox: true,
        }
        : _maskInputOptions !== undefined
            ? _maskInputOptions
            : {};
    const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === 'all'
        ? {
            script: true,
            comment: true,
            headFavicon: true,
            headWhitespace: true,
            headMetaSocial: true,
            headMetaRobots: true,
            headMetaHttpEquiv: true,
            headMetaVerification: true,
            headMetaAuthorship: _slimDOMOptions === 'all',
            headMetaDescKeywords: _slimDOMOptions === 'all',
        }
        : _slimDOMOptions
            ? _slimDOMOptions
            : {};
    polyfill();
    let lastFullSnapshotEvent;
    let incrementalSnapshotCount = 0;
    const eventProcessor = (e) => {
        for (const plugin of plugins || []) {
            if (plugin.eventProcessor) {
                e = plugin.eventProcessor(e);
            }
        }
        if (packFn &&
            !passEmitsToParent) {
            e = packFn(e);
        }
        return e;
    };
    wrappedEmit = (r, isCheckout) => {
        const e = r;
        e.timestamp = nowTimestamp();
        if (_optionalChain([mutationBuffers, 'access', _4 => _4[0], 'optionalAccess', _5 => _5.isFrozen, 'call', _6 => _6()]) &&
            e.type !== EventType.FullSnapshot &&
            !(e.type === EventType.IncrementalSnapshot &&
                e.data.source === IncrementalSource.Mutation)) {
            mutationBuffers.forEach((buf) => buf.unfreeze());
        }
        if (inEmittingFrame) {
            _optionalChain([emit, 'optionalCall', _7 => _7(eventProcessor(e), isCheckout)]);
        }
        else if (passEmitsToParent) {
            const message = {
                type: 'rrweb',
                event: eventProcessor(e),
                origin: window.location.origin,
                isCheckout,
            };
            window.parent.postMessage(message, '*');
        }
        if (e.type === EventType.FullSnapshot) {
            lastFullSnapshotEvent = e;
            incrementalSnapshotCount = 0;
        }
        else if (e.type === EventType.IncrementalSnapshot) {
            if (e.data.source === IncrementalSource.Mutation &&
                e.data.isAttachIframe) {
                return;
            }
            incrementalSnapshotCount++;
            const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
            const exceedTime = checkoutEveryNms &&
                lastFullSnapshotEvent &&
                e.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
            if (exceedCount || exceedTime) {
                takeFullSnapshot(true);
            }
        }
    };
    const wrappedMutationEmit = (m) => {
        wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
                source: IncrementalSource.Mutation,
                ...m,
            },
        });
    };
    const wrappedScrollEmit = (p) => wrappedEmit({
        type: EventType.IncrementalSnapshot,
        data: {
            source: IncrementalSource.Scroll,
            ...p,
        },
    });
    const wrappedCanvasMutationEmit = (p) => wrappedEmit({
        type: EventType.IncrementalSnapshot,
        data: {
            source: IncrementalSource.CanvasMutation,
            ...p,
        },
    });
    const wrappedAdoptedStyleSheetEmit = (a) => wrappedEmit({
        type: EventType.IncrementalSnapshot,
        data: {
            source: IncrementalSource.AdoptedStyleSheet,
            ...a,
        },
    });
    const stylesheetManager = new StylesheetManager({
        mutationCb: wrappedMutationEmit,
        adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit,
    });
    const iframeManager = new IframeManager({
            mirror,
            mutationCb: wrappedMutationEmit,
            stylesheetManager: stylesheetManager,
            recordCrossOriginIframes,
            wrappedEmit,
        });
    for (const plugin of plugins || []) {
        if (plugin.getMirror)
            plugin.getMirror({
                nodeMirror: mirror,
                crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
                crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror,
            });
    }
    const processedNodeManager = new ProcessedNodeManager();
    const canvasManager = _getCanvasManager(getCanvasManager, {
        mirror,
        win: window,
        mutationCb: (p) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
                source: IncrementalSource.CanvasMutation,
                ...p,
            },
        }),
        recordCanvas,
        blockClass,
        blockSelector,
        unblockSelector,
        maxCanvasSize,
        sampling: sampling['canvas'],
        dataURLOptions,
        errorHandler,
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
            },
            mirror,
        });
    const takeFullSnapshot = (isCheckout = false) => {
        if (!recordDOM) {
            return;
        }
        wrappedEmit({
            type: EventType.Meta,
            data: {
                href: window.location.href,
                width: getWindowWidth(),
                height: getWindowHeight(),
            },
        }, isCheckout);
        stylesheetManager.reset();
        shadowDomManager.init();
        mutationBuffers.forEach((buf) => buf.lock());
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
            onSerialize: (n) => {
                if (isSerializedIframe(n, mirror)) {
                    iframeManager.addIframe(n);
                }
                if (isSerializedStylesheet(n, mirror)) {
                    stylesheetManager.trackLinkElement(n);
                }
                if (hasShadowRoot(n)) {
                    shadowDomManager.addShadowRoot(n.shadowRoot, document);
                }
            },
            onIframeLoad: (iframe, childSn) => {
                iframeManager.attachIframe(iframe, childSn);
                if (iframe.contentWindow) {
                    canvasManager.addWindow(iframe.contentWindow);
                }
                shadowDomManager.observeAttachShadow(iframe);
            },
            onStylesheetLoad: (linkEl, childSn) => {
                stylesheetManager.attachLinkElement(linkEl, childSn);
            },
            keepIframeSrcFn,
        });
        if (!node) {
            return console.warn('Failed to snapshot the document');
        }
        wrappedEmit({
            type: EventType.FullSnapshot,
            data: {
                node,
                initialOffset: getWindowScroll(window),
            },
        });
        mutationBuffers.forEach((buf) => buf.unlock());
        if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
            stylesheetManager.adoptStyleSheets(document.adoptedStyleSheets, mirror.getId(document));
    };
    _takeFullSnapshot = takeFullSnapshot;
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
                        positions,
                    },
                }),
                mouseInteractionCb: (d) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.MouseInteraction,
                        ...d,
                    },
                }),
                scrollCb: wrappedScrollEmit,
                viewportResizeCb: (d) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.ViewportResize,
                        ...d,
                    },
                }),
                inputCb: (v) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.Input,
                        ...v,
                    },
                }),
                mediaInteractionCb: (p) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.MediaInteraction,
                        ...p,
                    },
                }),
                styleSheetRuleCb: (r) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.StyleSheetRule,
                        ...r,
                    },
                }),
                styleDeclarationCb: (r) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.StyleDeclaration,
                        ...r,
                    },
                }),
                canvasMutationCb: wrappedCanvasMutationEmit,
                fontCb: (p) => wrappedEmit({
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.Font,
                        ...p,
                    },
                }),
                selectionCb: (p) => {
                    wrappedEmit({
                        type: EventType.IncrementalSnapshot,
                        data: {
                            source: IncrementalSource.Selection,
                            ...p,
                        },
                    });
                },
                customElementCb: (c) => {
                    wrappedEmit({
                        type: EventType.IncrementalSnapshot,
                        data: {
                            source: IncrementalSource.CustomElement,
                            ...c,
                        },
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
                plugins: _optionalChain([plugins
, 'optionalAccess', _8 => _8.filter, 'call', _9 => _9((p) => p.observer)
, 'optionalAccess', _10 => _10.map, 'call', _11 => _11((p) => ({
                    observer: p.observer,
                    options: p.options,
                    callback: (payload) => wrappedEmit({
                        type: EventType.Plugin,
                        data: {
                            plugin: p.name,
                            payload,
                        },
                    }),
                }))]) || [],
            }, {});
        };
        iframeManager.addLoadListener((iframeEl) => {
            try {
                handlers.push(observe(iframeEl.contentDocument));
            }
            catch (error) {
                console.warn(error);
            }
        });
        const init = () => {
            takeFullSnapshot();
            handlers.push(observe(document));
        };
        if (document.readyState === 'interactive' ||
            document.readyState === 'complete') {
            init();
        }
        else {
            handlers.push(on('DOMContentLoaded', () => {
                wrappedEmit({
                    type: EventType.DomContentLoaded,
                    data: {},
                });
                if (recordAfter === 'DOMContentLoaded')
                    init();
            }));
            handlers.push(on('load', () => {
                wrappedEmit({
                    type: EventType.Load,
                    data: {},
                });
                if (recordAfter === 'load')
                    init();
            }, window));
        }
        return () => {
            handlers.forEach((h) => h());
            processedNodeManager.destroy();
            _takeFullSnapshot = undefined;
            unregisterErrorHandler();
        };
    }
    catch (error) {
        console.warn(error);
    }
}
function takeFullSnapshot(isCheckout) {
    if (!_takeFullSnapshot) {
        throw new Error('please take full snapshot after start recording');
    }
    _takeFullSnapshot(isCheckout);
}
record.mirror = mirror;
record.takeFullSnapshot = takeFullSnapshot;
function _getCanvasManager(getCanvasManagerFn, options) {
    try {
        return getCanvasManagerFn
            ? getCanvasManagerFn(options)
            : new CanvasManagerNoop();
    }
    catch (e2) {
        console.warn('Unable to initialize CanvasManager');
        return new CanvasManagerNoop();
    }
}

const getRating = (value, thresholds) => {
  if (value > thresholds[1]) {
    return 'poor';
  }
  if (value > thresholds[0]) {
    return 'needs-improvement';
  }
  return 'good';
};

const bindReporter = (
  callback,
  metric,
  thresholds,
  reportAllChanges,
) => {
  let prevValue;
  let delta;
  return (forceReport) => {
    if (metric.value >= 0) {
      if (forceReport || reportAllChanges) {
        delta = metric.value - (prevValue || 0);

        // Report the metric if there's a non-zero delta or if no previous
        // value exists (which can happen in the case of the document becoming
        // hidden when the metric value is 0).
        // See: https://github.com/GoogleChrome/web-vitals/issues/14
        if (delta || prevValue === undefined) {
          prevValue = metric.value;
          metric.delta = delta;
          metric.rating = getRating(metric.value, thresholds);
          callback(metric);
        }
      }
    }
  };
};

const WINDOW = GLOBAL_OBJ

;

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Performantly generate a unique, 30-char string by combining a version
 * number, the current timestamp with a 13-digit number integer.
 * @return {string}
 */
const generateUniqueID = () => {
  return `v4-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// sentry-specific change:
// add optional param to not check for responseStart (see comment below)
const getNavigationEntry = (checkResponseStart = true) => {
  const navigationEntry =
    WINDOW.performance && WINDOW.performance.getEntriesByType && WINDOW.performance.getEntriesByType('navigation')[0];
  // Check to ensure the `responseStart` property is present and valid.
  // In some cases no value is reported by the browser (for
  // privacy/security reasons), and in other cases (bugs) the value is
  // negative or is larger than the current page time. Ignore these cases:
  // https://github.com/GoogleChrome/web-vitals/issues/137
  // https://github.com/GoogleChrome/web-vitals/issues/162
  // https://github.com/GoogleChrome/web-vitals/issues/275
  if (
    // sentry-specific change:
    // We don't want to check for responseStart for our own use of `getNavigationEntry`
    !checkResponseStart ||
    (navigationEntry && navigationEntry.responseStart > 0 && navigationEntry.responseStart < performance.now())
  ) {
    return navigationEntry;
  }
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const getActivationStart = () => {
  const navEntry = getNavigationEntry();
  return (navEntry && navEntry.activationStart) || 0;
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const initMetric = (name, value) => {
  const navEntry = getNavigationEntry();
  let navigationType = 'navigate';

  if (navEntry) {
    if ((WINDOW.document && WINDOW.document.prerendering) || getActivationStart() > 0) {
      navigationType = 'prerender';
    } else if (WINDOW.document && WINDOW.document.wasDiscarded) {
      navigationType = 'restore';
    } else if (navEntry.type) {
      navigationType = navEntry.type.replace(/_/g, '-') ;
    }
  }

  // Use `entries` type specific for the metric.
  const entries = [];

  return {
    name,
    value: typeof value === 'undefined' ? -1 : value,
    rating: 'good' , // If needed, will be updated when reported. `const` to keep the type from widening to `string`.
    delta: 0,
    entries,
    id: generateUniqueID(),
    navigationType,
  };
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Takes a performance entry type and a callback function, and creates a
 * `PerformanceObserver` instance that will observe the specified entry type
 * with buffering enabled and call the callback _for each entry_.
 *
 * This function also feature-detects entry support and wraps the logic in a
 * try/catch to avoid errors in unsupporting browsers.
 */
const observe = (
  type,
  callback,
  opts,
) => {
  try {
    if (PerformanceObserver.supportedEntryTypes.includes(type)) {
      const po = new PerformanceObserver(list => {
        // Delay by a microtask to workaround a bug in Safari where the
        // callback is invoked immediately, rather than in a separate task.
        // See: https://github.com/GoogleChrome/web-vitals/issues/277
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => {
          callback(list.getEntries() );
        });
      });
      po.observe(
        Object.assign(
          {
            type,
            buffered: true,
          },
          opts || {},
        ) ,
      );
      return po;
    }
  } catch (e) {
    // Do nothing.
  }
  return;
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Sentry-specific change:
// This function's logic was NOT updated to web-vitals 4.2.4 but we continue
// to use the web-vitals 3.5.2 due to us having stricter browser support.
// PR with context that made the changes: https://github.com/GoogleChrome/web-vitals/pull/442/files#r1530492402
// The PR removed listening to the `pagehide` event, in favour of only listening to `visibilitychange` event.
// This is "more correct" but some browsers we still support (Safari 12.1-14.0) don't fully support `visibilitychange`
// or have known bugs w.r.t the `visibilitychange` event.
// TODO (v9): If we decide to drop support for Safari 12.1-14.0, we can use the logic from web-vitals 4.2.4
// In this case, we also need to update the integration tests that currently trigger the `pagehide` event to
// simulate the page being hidden.
const onHidden = (cb) => {
  const onHiddenOrPageHide = (event) => {
    if (event.type === 'pagehide' || (WINDOW.document && WINDOW.document.visibilityState === 'hidden')) {
      cb(event);
    }
  };

  if (WINDOW.document) {
    addEventListener('visibilitychange', onHiddenOrPageHide, true);
    // Some browsers have buggy implementations of visibilitychange,
    // so we use pagehide in addition, just to be safe.
    addEventListener('pagehide', onHiddenOrPageHide, true);
  }
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const runOnce = (cb) => {
  let called = false;
  return () => {
    if (!called) {
      cb();
      called = true;
    }
  };
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let firstHiddenTime = -1;

const initHiddenTime = () => {
  // If the document is hidden when this code runs, assume it was always
  // hidden and the page was loaded in the background, with the one exception
  // that visibility state is always 'hidden' during prerendering, so we have
  // to ignore that case until prerendering finishes (see: `prerenderingchange`
  // event logic below).
  return WINDOW.document.visibilityState === 'hidden' && !WINDOW.document.prerendering ? 0 : Infinity;
};

const onVisibilityUpdate = (event) => {
  // If the document is 'hidden' and no previous hidden timestamp has been
  // set, update it based on the current event data.
  if (WINDOW.document.visibilityState === 'hidden' && firstHiddenTime > -1) {
    // If the event is a 'visibilitychange' event, it means the page was
    // visible prior to this change, so the event timestamp is the first
    // hidden time.
    // However, if the event is not a 'visibilitychange' event, then it must
    // be a 'prerenderingchange' event, and the fact that the document is
    // still 'hidden' from the above check means the tab was activated
    // in a background state and so has always been hidden.
    firstHiddenTime = event.type === 'visibilitychange' ? event.timeStamp : 0;

    // Remove all listeners now that a `firstHiddenTime` value has been set.
    removeChangeListeners();
  }
};

const addChangeListeners = () => {
  addEventListener('visibilitychange', onVisibilityUpdate, true);
  // IMPORTANT: when a page is prerendering, its `visibilityState` is
  // 'hidden', so in order to account for cases where this module checks for
  // visibility during prerendering, an additional check after prerendering
  // completes is also required.
  addEventListener('prerenderingchange', onVisibilityUpdate, true);
};

const removeChangeListeners = () => {
  removeEventListener('visibilitychange', onVisibilityUpdate, true);
  removeEventListener('prerenderingchange', onVisibilityUpdate, true);
};

const getVisibilityWatcher = () => {
  if (WINDOW.document && firstHiddenTime < 0) {
    // If the document is hidden when this code runs, assume it was hidden
    // since navigation start. This isn't a perfect heuristic, but it's the
    // best we can do until an API is available to support querying past
    // visibilityState.
    firstHiddenTime = initHiddenTime();
    addChangeListeners();
  }
  return {
    get firstHiddenTime() {
      return firstHiddenTime;
    },
  };
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const whenActivated = (callback) => {
  if (WINDOW.document && WINDOW.document.prerendering) {
    addEventListener('prerenderingchange', () => callback(), true);
  } else {
    callback();
  }
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Thresholds for FCP. See https://web.dev/articles/fcp#what_is_a_good_fcp_score */
const FCPThresholds = [1800, 3000];

/**
 * Calculates the [FCP](https://web.dev/articles/fcp) value for the current page and
 * calls the `callback` function once the value is ready, along with the
 * relevant `paint` performance entry used to determine the value. The reported
 * value is a `DOMHighResTimeStamp`.
 */
const onFCP = (onReport, opts = {}) => {
  whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher();
    const metric = initMetric('FCP');
    let report;

    const handleEntries = (entries) => {
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          po.disconnect();

          // Only report if the page wasn't hidden prior to the first paint.
          if (entry.startTime < visibilityWatcher.firstHiddenTime) {
            // The activationStart reference is used because FCP should be
            // relative to page activation rather than navigation start if the
            // page was prerendered. But in cases where `activationStart` occurs
            // after the FCP, this time should be clamped at 0.
            metric.value = Math.max(entry.startTime - getActivationStart(), 0);
            metric.entries.push(entry);
            report(true);
          }
        }
      });
    };

    const po = observe('paint', handleEntries);

    if (po) {
      report = bindReporter(onReport, metric, FCPThresholds, opts.reportAllChanges);
    }
  });
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Thresholds for CLS. See https://web.dev/articles/cls#what_is_a_good_cls_score */
const CLSThresholds = [0.1, 0.25];

/**
 * Calculates the [CLS](https://web.dev/articles/cls) value for the current page and
 * calls the `callback` function once the value is ready to be reported, along
 * with all `layout-shift` performance entries that were used in the metric
 * value calculation. The reported value is a `double` (corresponding to a
 * [layout shift score](https://web.dev/articles/cls#layout_shift_score)).
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called as soon as the value is initially
 * determined as well as any time the value changes throughout the page
 * lifespan.
 *
 * _**Important:** CLS should be continually monitored for changes throughout
 * the entire lifespan of a page—including if the user returns to the page after
 * it's been hidden/backgrounded. However, since browsers often [will not fire
 * additional callbacks once the user has backgrounded a
 * page](https://developer.chrome.com/blog/page-lifecycle-api/#advice-hidden),
 * `callback` is always called when the page's visibility state changes to
 * hidden. As a result, the `callback` function might be called multiple times
 * during the same page load._
 */
const onCLS = (onReport, opts = {}) => {
  // Start monitoring FCP so we can only report CLS if FCP is also reported.
  // Note: this is done to match the current behavior of CrUX.
  onFCP(
    runOnce(() => {
      const metric = initMetric('CLS', 0);
      let report;

      let sessionValue = 0;
      let sessionEntries = [];

      const handleEntries = (entries) => {
        entries.forEach(entry => {
          // Only count layout shifts without recent user input.
          if (!entry.hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If the entry occurred less than 1 second after the previous entry
            // and less than 5 seconds after the first entry in the session,
            // include the entry in the current session. Otherwise, start a new
            // session.
            if (
              sessionValue &&
              firstSessionEntry &&
              lastSessionEntry &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000
            ) {
              sessionValue += entry.value;
              sessionEntries.push(entry);
            } else {
              sessionValue = entry.value;
              sessionEntries = [entry];
            }
          }
        });

        // If the current session value is larger than the current CLS value,
        // update CLS and the entries contributing to it.
        if (sessionValue > metric.value) {
          metric.value = sessionValue;
          metric.entries = sessionEntries;
          report();
        }
      };

      const po = observe('layout-shift', handleEntries);
      if (po) {
        report = bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);

        onHidden(() => {
          handleEntries(po.takeRecords() );
          report(true);
        });

        // Queue a task to report (if nothing else triggers a report first).
        // This allows CLS to be reported as soon as FCP fires when
        // `reportAllChanges` is true.
        setTimeout(report, 0);
      }
    }),
  );
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Thresholds for FID. See https://web.dev/articles/fid#what_is_a_good_fid_score */
const FIDThresholds = [100, 300];

/**
 * Calculates the [FID](https://web.dev/articles/fid) value for the current page and
 * calls the `callback` function once the value is ready, along with the
 * relevant `first-input` performance entry used to determine the value. The
 * reported value is a `DOMHighResTimeStamp`.
 *
 * _**Important:** since FID is only reported after the user interacts with the
 * page, it's possible that it will not be reported for some page loads._
 */
const onFID = (onReport, opts = {}) => {
  whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher();
    const metric = initMetric('FID');
    // eslint-disable-next-line prefer-const
    let report;

    const handleEntry = (entry) => {
      // Only report if the page wasn't hidden prior to the first input.
      if (entry.startTime < visibilityWatcher.firstHiddenTime) {
        metric.value = entry.processingStart - entry.startTime;
        metric.entries.push(entry);
        report(true);
      }
    };

    const handleEntries = (entries) => {
      (entries ).forEach(handleEntry);
    };

    const po = observe('first-input', handleEntries);

    report = bindReporter(onReport, metric, FIDThresholds, opts.reportAllChanges);

    if (po) {
      onHidden(
        runOnce(() => {
          handleEntries(po.takeRecords() );
          po.disconnect();
        }),
      );
    }
  });
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let interactionCountEstimate = 0;
let minKnownInteractionId = Infinity;
let maxKnownInteractionId = 0;

const updateEstimate = (entries) => {
  entries.forEach(e => {
    if (e.interactionId) {
      minKnownInteractionId = Math.min(minKnownInteractionId, e.interactionId);
      maxKnownInteractionId = Math.max(maxKnownInteractionId, e.interactionId);

      interactionCountEstimate = maxKnownInteractionId ? (maxKnownInteractionId - minKnownInteractionId) / 7 + 1 : 0;
    }
  });
};

let po;

/**
 * Returns the `interactionCount` value using the native API (if available)
 * or the polyfill estimate in this module.
 */
const getInteractionCount = () => {
  return po ? interactionCountEstimate : performance.interactionCount || 0;
};

/**
 * Feature detects native support or initializes the polyfill if needed.
 */
const initInteractionCountPolyfill = () => {
  if ('interactionCount' in performance || po) return;

  po = observe('event', updateEstimate, {
    type: 'event',
    buffered: true,
    durationThreshold: 0,
  } );
};

/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// A list of longest interactions on the page (by latency) sorted so the
// longest one is first. The list is at most MAX_INTERACTIONS_TO_CONSIDER long.
const longestInteractionList = [];

// A mapping of longest interactions by their interaction ID.
// This is used for faster lookup.
const longestInteractionMap = new Map();

// The default `durationThreshold` used across this library for observing
// `event` entries via PerformanceObserver.
const DEFAULT_DURATION_THRESHOLD = 40;

// Used to store the interaction count after a bfcache restore, since p98
// interaction latencies should only consider the current navigation.
let prevInteractionCount = 0;

/**
 * Returns the interaction count since the last bfcache restore (or for the
 * full page lifecycle if there were no bfcache restores).
 */
const getInteractionCountForNavigation = () => {
  return getInteractionCount() - prevInteractionCount;
};

/**
 * Returns the estimated p98 longest interaction based on the stored
 * interaction candidates and the interaction count for the current page.
 */
const estimateP98LongestInteraction = () => {
  const candidateInteractionIndex = Math.min(
    longestInteractionList.length - 1,
    Math.floor(getInteractionCountForNavigation() / 50),
  );

  return longestInteractionList[candidateInteractionIndex];
};

// To prevent unnecessary memory usage on pages with lots of interactions,
// store at most 10 of the longest interactions to consider as INP candidates.
const MAX_INTERACTIONS_TO_CONSIDER = 10;

/**
 * A list of callback functions to run before each entry is processed.
 * Exposing this list allows the attribution build to hook into the
 * entry processing pipeline.
 */
const entryPreProcessingCallbacks = [];

/**
 * Takes a performance entry and adds it to the list of worst interactions
 * if its duration is long enough to make it among the worst. If the
 * entry is part of an existing interaction, it is merged and the latency
 * and entries list is updated as needed.
 */
const processInteractionEntry = (entry) => {
  entryPreProcessingCallbacks.forEach(cb => cb(entry));

  // Skip further processing for entries that cannot be INP candidates.
  if (!(entry.interactionId || entry.entryType === 'first-input')) return;

  // The least-long of the 10 longest interactions.
  const minLongestInteraction = longestInteractionList[longestInteractionList.length - 1];

  const existingInteraction = longestInteractionMap.get(entry.interactionId);

  // Only process the entry if it's possibly one of the ten longest,
  // or if it's part of an existing interaction.
  if (
    existingInteraction ||
    longestInteractionList.length < MAX_INTERACTIONS_TO_CONSIDER ||
    (minLongestInteraction && entry.duration > minLongestInteraction.latency)
  ) {
    // If the interaction already exists, update it. Otherwise create one.
    if (existingInteraction) {
      // If the new entry has a longer duration, replace the old entries,
      // otherwise add to the array.
      if (entry.duration > existingInteraction.latency) {
        existingInteraction.entries = [entry];
        existingInteraction.latency = entry.duration;
      } else if (
        entry.duration === existingInteraction.latency &&
        entry.startTime === (existingInteraction.entries[0] && existingInteraction.entries[0].startTime)
      ) {
        existingInteraction.entries.push(entry);
      }
    } else {
      const interaction = {
        id: entry.interactionId,
        latency: entry.duration,
        entries: [entry],
      };
      longestInteractionMap.set(interaction.id, interaction);
      longestInteractionList.push(interaction);
    }

    // Sort the entries by latency (descending) and keep only the top ten.
    longestInteractionList.sort((a, b) => b.latency - a.latency);
    if (longestInteractionList.length > MAX_INTERACTIONS_TO_CONSIDER) {
      longestInteractionList.splice(MAX_INTERACTIONS_TO_CONSIDER).forEach(i => longestInteractionMap.delete(i.id));
    }
  }
};

/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Runs the passed callback during the next idle period, or immediately
 * if the browser's visibility state is (or becomes) hidden.
 */
const whenIdle = (cb) => {
  const rIC = WINDOW.requestIdleCallback || WINDOW.setTimeout;

  let handle = -1;
  // eslint-disable-next-line no-param-reassign
  cb = runOnce(cb) ;
  // If the document is hidden, run the callback immediately, otherwise
  // race an idle callback with the next `visibilitychange` event.
  if (WINDOW.document && WINDOW.document.visibilityState === 'hidden') {
    cb();
  } else {
    handle = rIC(cb);
    onHidden(cb);
  }
  return handle;
};

/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Thresholds for INP. See https://web.dev/articles/inp#what_is_a_good_inp_score */
const INPThresholds = [200, 500];

/**
 * Calculates the [INP](https://web.dev/articles/inp) value for the current
 * page and calls the `callback` function once the value is ready, along with
 * the `event` performance entries reported for that interaction. The reported
 * value is a `DOMHighResTimeStamp`.
 *
 * A custom `durationThreshold` configuration option can optionally be passed to
 * control what `event-timing` entries are considered for INP reporting. The
 * default threshold is `40`, which means INP scores of less than 40 are
 * reported as 0. Note that this will not affect your 75th percentile INP value
 * unless that value is also less than 40 (well below the recommended
 * [good](https://web.dev/articles/inp#what_is_a_good_inp_score) threshold).
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called as soon as the value is initially
 * determined as well as any time the value changes throughout the page
 * lifespan.
 *
 * _**Important:** INP should be continually monitored for changes throughout
 * the entire lifespan of a page—including if the user returns to the page after
 * it's been hidden/backgrounded. However, since browsers often [will not fire
 * additional callbacks once the user has backgrounded a
 * page](https://developer.chrome.com/blog/page-lifecycle-api/#advice-hidden),
 * `callback` is always called when the page's visibility state changes to
 * hidden. As a result, the `callback` function might be called multiple times
 * during the same page load._
 */
const onINP = (onReport, opts = {}) => {
  // Return if the browser doesn't support all APIs needed to measure INP.
  if (!('PerformanceEventTiming' in WINDOW && 'interactionId' in PerformanceEventTiming.prototype)) {
    return;
  }

  whenActivated(() => {
    // TODO(philipwalton): remove once the polyfill is no longer needed.
    initInteractionCountPolyfill();

    const metric = initMetric('INP');
    // eslint-disable-next-line prefer-const
    let report;

    const handleEntries = (entries) => {
      // Queue the `handleEntries()` callback in the next idle task.
      // This is needed to increase the chances that all event entries that
      // occurred between the user interaction and the next paint
      // have been dispatched. Note: there is currently an experiment
      // running in Chrome (EventTimingKeypressAndCompositionInteractionId)
      // 123+ that if rolled out fully may make this no longer necessary.
      whenIdle(() => {
        entries.forEach(processInteractionEntry);

        const inp = estimateP98LongestInteraction();

        if (inp && inp.latency !== metric.value) {
          metric.value = inp.latency;
          metric.entries = inp.entries;
          report();
        }
      });
    };

    const po = observe('event', handleEntries, {
      // Event Timing entries have their durations rounded to the nearest 8ms,
      // so a duration of 40ms would be any event that spans 2.5 or more frames
      // at 60Hz. This threshold is chosen to strike a balance between usefulness
      // and performance. Running this callback for any interaction that spans
      // just one or two frames is likely not worth the insight that could be
      // gained.
      durationThreshold: opts.durationThreshold != null ? opts.durationThreshold : DEFAULT_DURATION_THRESHOLD,
    });

    report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);

    if (po) {
      // Also observe entries of type `first-input`. This is useful in cases
      // where the first interaction is less than the `durationThreshold`.
      po.observe({ type: 'first-input', buffered: true });

      onHidden(() => {
        handleEntries(po.takeRecords() );
        report(true);
      });
    }
  });
};

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Thresholds for LCP. See https://web.dev/articles/lcp#what_is_a_good_lcp_score */
const LCPThresholds = [2500, 4000];

const reportedMetricIDs = {};

/**
 * Calculates the [LCP](https://web.dev/articles/lcp) value for the current page and
 * calls the `callback` function once the value is ready (along with the
 * relevant `largest-contentful-paint` performance entry used to determine the
 * value). The reported value is a `DOMHighResTimeStamp`.
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called any time a new `largest-contentful-paint`
 * performance entry is dispatched, or once the final value of the metric has
 * been determined.
 */
const onLCP = (onReport, opts = {}) => {
  whenActivated(() => {
    const visibilityWatcher = getVisibilityWatcher();
    const metric = initMetric('LCP');
    let report;

    const handleEntries = (entries) => {
      // If reportAllChanges is set then call this function for each entry,
      // otherwise only consider the last one.
      if (!opts.reportAllChanges) {
        // eslint-disable-next-line no-param-reassign
        entries = entries.slice(-1);
      }

      entries.forEach(entry => {
        // Only report if the page wasn't hidden prior to LCP.
        if (entry.startTime < visibilityWatcher.firstHiddenTime) {
          // The startTime attribute returns the value of the renderTime if it is
          // not 0, and the value of the loadTime otherwise. The activationStart
          // reference is used because LCP should be relative to page activation
          // rather than navigation start if the page was pre-rendered. But in cases
          // where `activationStart` occurs after the LCP, this time should be
          // clamped at 0.
          metric.value = Math.max(entry.startTime - getActivationStart(), 0);
          metric.entries = [entry];
          report();
        }
      });
    };

    const po = observe('largest-contentful-paint', handleEntries);

    if (po) {
      report = bindReporter(onReport, metric, LCPThresholds, opts.reportAllChanges);

      const stopListening = runOnce(() => {
        if (!reportedMetricIDs[metric.id]) {
          handleEntries(po.takeRecords() );
          po.disconnect();
          reportedMetricIDs[metric.id] = true;
          report(true);
        }
      });

      // Stop listening after input. Note: while scrolling is an input that
      // stops LCP observation, it's unreliable since it can be programmatically
      // generated. See: https://github.com/GoogleChrome/web-vitals/issues/75
      ['keydown', 'click'].forEach(type => {
        // Wrap in a setTimeout so the callback is run in a separate task
        // to avoid extending the keyboard/click handler to reduce INP impact
        // https://github.com/GoogleChrome/web-vitals/issues/383
        if (WINDOW.document) {
          addEventListener(type, () => whenIdle(stopListening ), {
            once: true,
            capture: true,
          });
        }
      });

      onHidden(stopListening);
    }
  });
};

const handlers$1 = {};
const instrumented = {};

let _previousCls;
let _previousFid;
let _previousLcp;
let _previousInp;

/**
 * Add a callback that will be triggered when a CLS metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 *
 * Pass `stopOnCallback = true` to stop listening for CLS when the cleanup callback is called.
 * This will lead to the CLS being finalized and frozen.
 */
function addClsInstrumentationHandler(
  callback,
  stopOnCallback = false,
) {
  return addMetricObserver('cls', callback, instrumentCls, _previousCls, stopOnCallback);
}

/**
 * Add a callback that will be triggered when a LCP metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 *
 * Pass `stopOnCallback = true` to stop listening for LCP when the cleanup callback is called.
 * This will lead to the LCP being finalized and frozen.
 */
function addLcpInstrumentationHandler(
  callback,
  stopOnCallback = false,
) {
  return addMetricObserver('lcp', callback, instrumentLcp, _previousLcp, stopOnCallback);
}

/**
 * Add a callback that will be triggered when a FID metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 */
function addFidInstrumentationHandler(callback) {
  return addMetricObserver('fid', callback, instrumentFid, _previousFid);
}

/**
 * Add a callback that will be triggered when a INP metric is available.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 */
function addInpInstrumentationHandler(
  callback,
) {
  return addMetricObserver('inp', callback, instrumentInp, _previousInp);
}

/**
 * Add a callback that will be triggered when a performance observer is triggered,
 * and receives the entries of the observer.
 * Returns a cleanup callback which can be called to remove the instrumentation handler.
 */
function addPerformanceInstrumentationHandler(
  type,
  callback,
) {
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

  if (!typeHandlers || !typeHandlers.length) {
    return;
  }

  for (const handler of typeHandlers) {
    try {
      handler(data);
    } catch (e) {
      logger$1.error(
          `Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`,
          e,
        );
    }
  }
}

function instrumentCls() {
  return onCLS(
    metric => {
      triggerHandlers('cls', {
        metric,
      });
      _previousCls = metric;
    },
    // We want the callback to be called whenever the CLS value updates.
    // By default, the callback is only called when the tab goes to the background.
    { reportAllChanges: true },
  );
}

function instrumentFid() {
  return onFID(metric => {
    triggerHandlers('fid', {
      metric,
    });
    _previousFid = metric;
  });
}

function instrumentLcp() {
  return onLCP(
    metric => {
      triggerHandlers('lcp', {
        metric,
      });
      _previousLcp = metric;
    },
    // We want the callback to be called whenever the LCP value updates.
    // By default, the callback is only called when the tab goes to the background.
    { reportAllChanges: true },
  );
}

function instrumentInp() {
  return onINP(metric => {
    triggerHandlers('inp', {
      metric,
    });
    _previousInp = metric;
  });
}

function addMetricObserver(
  type,
  callback,
  instrumentFn,
  previousValue,
  stopOnCallback = false,
) {
  addHandler(type, callback);

  let stopListening;

  if (!instrumented[type]) {
    stopListening = instrumentFn();
    instrumented[type] = true;
  }

  if (previousValue) {
    callback({ metric: previousValue });
  }

  return getCleanupCallback(type, callback, stopOnCallback ? stopListening : undefined);
}

function instrumentPerformanceObserver(type) {
  const options = {};

  // Special per-type options we want to use
  if (type === 'event') {
    options.durationThreshold = 0;
  }

  observe(
    type,
    entries => {
      triggerHandlers(type, { entries });
    },
    options,
  );
}

function addHandler(type, handler) {
  handlers$1[type] = handlers$1[type] || [];
  (handlers$1[type] ).push(handler);
}

// Get a callback which can be called to remove the instrumentation handler
function getCleanupCallback(
  type,
  callback,
  stopListening,
) {
  return () => {
    if (stopListening) {
      stopListening();
    }

    const typeHandlers = handlers$1[type];

    if (!typeHandlers) {
      return;
    }

    const index = typeHandlers.indexOf(callback);
    if (index !== -1) {
      typeHandlers.splice(index, 1);
    }
  };
}

const DEBOUNCE_DURATION = 1000;

let debounceTimerID;
let lastCapturedEventType;
let lastCapturedEventTargetId;

/**
 * Add an instrumentation handler for when a click or a keypress happens.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addClickKeypressInstrumentationHandler(handler) {
  const type = 'dom';
  addHandler$1(type, handler);
  maybeInstrument(type, instrumentDOM);
}

/** Exported for tests only. */
function instrumentDOM() {
  if (!WINDOW.document) {
    return;
  }

  // Make it so that any click or keypress that is unhandled / bubbled up all the way to the document triggers our dom
  // handlers. (Normally we have only one, which captures a breadcrumb for each click or keypress.) Do this before
  // we instrument `addEventListener` so that we don't end up attaching this handler twice.
  const triggerDOMHandler = triggerHandlers$1.bind(null, 'dom');
  const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
  WINDOW.document.addEventListener('click', globalDOMEventHandler, false);
  WINDOW.document.addEventListener('keypress', globalDOMEventHandler, false);

  // After hooking into click and keypress events bubbled up to `document`, we also hook into user-handled
  // clicks & keypresses, by adding an event listener of our own to any element to which they add a listener. That
  // way, whenever one of their handlers is triggered, ours will be, too. (This is needed because their handler
  // could potentially prevent the event from bubbling up to our global listeners. This way, our handler are still
  // guaranteed to fire at least once.)
  ['EventTarget', 'Node'].forEach((target) => {
    const globalObject = WINDOW ;
    const targetObj = globalObject[target];
    const proto = targetObj && targetObj.prototype;

    // eslint-disable-next-line no-prototype-builtins
    if (!proto || !proto.hasOwnProperty || !proto.hasOwnProperty('addEventListener')) {
      return;
    }

    fill(proto, 'addEventListener', function (originalAddEventListener) {
      return function ( type, listener, options) {
        if (type === 'click' || type == 'keypress') {
          try {
            const handlers = (this.__sentry_instrumentation_handlers__ =
              this.__sentry_instrumentation_handlers__ || {});
            const handlerForType = (handlers[type] = handlers[type] || { refCount: 0 });

            if (!handlerForType.handler) {
              const handler = makeDOMEventHandler(triggerDOMHandler);
              handlerForType.handler = handler;
              originalAddEventListener.call(this, type, handler, options);
            }

            handlerForType.refCount++;
          } catch (e) {
            // Accessing dom properties is always fragile.
            // Also allows us to skip `addEventListeners` calls with no proper `this` context.
          }
        }

        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    fill(
      proto,
      'removeEventListener',
      function (originalRemoveEventListener) {
        return function ( type, listener, options) {
          if (type === 'click' || type == 'keypress') {
            try {
              const handlers = this.__sentry_instrumentation_handlers__ || {};
              const handlerForType = handlers[type];

              if (handlerForType) {
                handlerForType.refCount--;
                // If there are no longer any custom handlers of the current type on this element, we can remove ours, too.
                if (handlerForType.refCount <= 0) {
                  originalRemoveEventListener.call(this, type, handlerForType.handler, options);
                  handlerForType.handler = undefined;
                  delete handlers[type]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
                }

                // If there are no longer any custom handlers of any type on this element, cleanup everything.
                if (Object.keys(handlers).length === 0) {
                  delete this.__sentry_instrumentation_handlers__;
                }
              }
            } catch (e) {
              // Accessing dom properties is always fragile.
              // Also allows us to skip `addEventListeners` calls with no proper `this` context.
            }
          }

          return originalRemoveEventListener.call(this, type, listener, options);
        };
      },
    );
  });
}

/**
 * Check whether the event is similar to the last captured one. For example, two click events on the same button.
 */
function isSimilarToLastCapturedEvent(event) {
  // If both events have different type, then user definitely performed two separate actions. e.g. click + keypress.
  if (event.type !== lastCapturedEventType) {
    return false;
  }

  try {
    // If both events have the same type, it's still possible that actions were performed on different targets.
    // e.g. 2 clicks on different buttons.
    if (!event.target || (event.target )._sentryId !== lastCapturedEventTargetId) {
      return false;
    }
  } catch (e) {
    // just accessing `target` property can throw an exception in some rare circumstances
    // see: https://github.com/getsentry/sentry-javascript/issues/838
  }

  // If both events have the same type _and_ same `target` (an element which triggered an event, _not necessarily_
  // to which an event listener was attached), we treat them as the same action, as we want to capture
  // only one breadcrumb. e.g. multiple clicks on the same button, or typing inside a user input box.
  return true;
}

/**
 * Decide whether an event should be captured.
 * @param event event to be captured
 */
function shouldSkipDOMEvent(eventType, target) {
  // We are only interested in filtering `keypress` events for now.
  if (eventType !== 'keypress') {
    return false;
  }

  if (!target || !target.tagName) {
    return true;
  }

  // Only consider keypress events on actual input elements. This will disregard keypresses targeting body
  // e.g.tabbing through elements, hotkeys, etc.
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return false;
  }

  return true;
}

/**
 * Wraps addEventListener to capture UI breadcrumbs
 */
function makeDOMEventHandler(
  handler,
  globalListener = false,
) {
  return (event) => {
    // It's possible this handler might trigger multiple times for the same
    // event (e.g. event propagation through node ancestors).
    // Ignore if we've already captured that event.
    if (!event || event['_sentryCaptured']) {
      return;
    }

    const target = getEventTarget(event);

    // We always want to skip _some_ events.
    if (shouldSkipDOMEvent(event.type, target)) {
      return;
    }

    // Mark event as "seen"
    addNonEnumerableProperty(event, '_sentryCaptured', true);

    if (target && !target._sentryId) {
      // Add UUID to event target so we can identify if
      addNonEnumerableProperty(target, '_sentryId', uuid4());
    }

    const name = event.type === 'keypress' ? 'input' : event.type;

    // If there is no last captured event, it means that we can safely capture the new event and store it for future comparisons.
    // If there is a last captured event, see if the new event is different enough to treat it as a unique one.
    // If that's the case, emit the previous event and store locally the newly-captured DOM event.
    if (!isSimilarToLastCapturedEvent(event)) {
      const handlerData = { event, name, global: globalListener };
      handler(handlerData);
      lastCapturedEventType = event.type;
      lastCapturedEventTargetId = target ? target._sentryId : undefined;
    }

    // Start a new debounce timer that will prevent us from capturing multiple events that should be grouped together.
    clearTimeout(debounceTimerID);
    debounceTimerID = WINDOW.setTimeout(() => {
      lastCapturedEventTargetId = undefined;
      lastCapturedEventType = undefined;
    }, DEBOUNCE_DURATION);
  };
}

function getEventTarget(event) {
  try {
    return event.target ;
  } catch (e) {
    // just accessing `target` property can throw an exception in some rare circumstances
    // see: https://github.com/getsentry/sentry-javascript/issues/838
    return null;
  }
}

let lastHref;

/**
 * Add an instrumentation handler for when a fetch request happens.
 * The handler function is called once when the request starts and once when it ends,
 * which can be identified by checking if it has an `endTimestamp`.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addHistoryInstrumentationHandler(handler) {
  const type = 'history';
  addHandler$1(type, handler);
  maybeInstrument(type, instrumentHistory);
}

function instrumentHistory() {
  if (!supportsHistory()) {
    return;
  }

  const oldOnPopState = WINDOW.onpopstate;
  WINDOW.onpopstate = function ( ...args) {
    const to = WINDOW.location.href;
    // keep track of the current URL state, as we always receive only the updated state
    const from = lastHref;
    lastHref = to;
    const handlerData = { from, to };
    triggerHandlers$1('history', handlerData);
    if (oldOnPopState) {
      // Apparently this can throw in Firefox when incorrectly implemented plugin is installed.
      // https://github.com/getsentry/sentry-javascript/issues/3344
      // https://github.com/bugsnag/bugsnag-js/issues/469
      try {
        return oldOnPopState.apply(this, args);
      } catch (_oO) {
        // no-empty
      }
    }
  };

  function historyReplacementFunction(originalHistoryFunction) {
    return function ( ...args) {
      const url = args.length > 2 ? args[2] : undefined;
      if (url) {
        // coerce to string (this is what pushState does)
        const from = lastHref;
        const to = String(url);
        // keep track of the current URL state, as we always receive only the updated state
        lastHref = to;
        const handlerData = { from, to };
        triggerHandlers$1('history', handlerData);
      }
      return originalHistoryFunction.apply(this, args);
    };
  }

  fill(WINDOW.history, 'pushState', historyReplacementFunction);
  fill(WINDOW.history, 'replaceState', historyReplacementFunction);
}

/**
 * We generally want to use window.fetch / window.setTimeout.
 * However, in some cases this may be wrapped (e.g. by Zone.js for Angular),
 * so we try to get an unpatched version of this from a sandboxed iframe.
 */

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
function getNativeImplementation(
  name,
) {
  const cached = cachedImplementations[name];
  if (cached) {
    return cached;
  }

  let impl = WINDOW[name] ;

  // Fast path to avoid DOM I/O
  if (isNativeFunction(impl)) {
    return (cachedImplementations[name] = impl.bind(WINDOW) );
  }

  const document = WINDOW.document;
  // eslint-disable-next-line deprecation/deprecation
  if (document && typeof document.createElement === 'function') {
    try {
      const sandbox = document.createElement('iframe');
      sandbox.hidden = true;
      document.head.appendChild(sandbox);
      const contentWindow = sandbox.contentWindow;
      if (contentWindow && contentWindow[name]) {
        impl = contentWindow[name] ;
      }
      document.head.removeChild(sandbox);
    } catch (e) {
      // Could not create sandbox iframe, just use window.xxx
      logger$1.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
    }
  }

  // Sanity check: This _should_ not happen, but if it does, we just skip caching...
  // This can happen e.g. in tests where fetch may not be available in the env, or similar.
  if (!impl) {
    return impl;
  }

  return (cachedImplementations[name] = impl.bind(WINDOW) );
}

/**
 * Get an unwrapped `setTimeout` method.
 * This ensures that even if e.g. Angular wraps `setTimeout`, we get the native implementation,
 * avoiding triggering change detection.
 */
function setTimeout$1(...rest) {
  return getNativeImplementation('setTimeout')(...rest);
}

const SENTRY_XHR_DATA_KEY = '__sentry_xhr_v3__';

const ReplayEventTypeIncrementalSnapshot = 3;
const ReplayEventTypeCustom = 5;

/**
 * Converts a timestamp to ms, if it was in s, or keeps it as ms.
 */
function timestampToMs(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp : timestamp * 1000;
}

/**
 * Converts a timestamp to s, if it was in ms, or keeps it as s.
 */
function timestampToS(timestamp) {
  const isMs = timestamp > 9999999999;
  return isMs ? timestamp / 1000 : timestamp;
}

/**
 * Add a breadcrumb event to replay.
 */
function addBreadcrumbEvent(replay, breadcrumb) {
  if (breadcrumb.category === 'sentry.transaction') {
    return;
  }

  if (['ui.click', 'ui.input'].includes(breadcrumb.category )) {
    replay.triggerUserActivity();
  } else {
    replay.checkAndHandleExpiredSession();
  }

  replay.addUpdate(() => {
    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    replay.throttledAddEvent({
      type: EventType.Custom,
      // TODO: We were converting from ms to seconds for breadcrumbs, spans,
      // but maybe we should just keep them as milliseconds
      timestamp: (breadcrumb.timestamp || 0) * 1000,
      data: {
        tag: 'breadcrumb',
        // normalize to max. 10 depth and 1_000 properties per object
        payload: normalize(breadcrumb, 10, 1000),
      },
    });

    // Do not flush after console log messages
    return breadcrumb.category === 'console';
  });
}

const INTERACTIVE_SELECTOR = 'button,a';

/** Get the closest interactive parent element, or else return the given element. */
function getClosestInteractive(element) {
  const closestInteractive = element.closest(INTERACTIVE_SELECTOR);
  return closestInteractive || element;
}

/**
 * For clicks, we check if the target is inside of a button or link
 * If so, we use this as the target instead
 * This is useful because if you click on the image in <button><img></button>,
 * The target will be the image, not the button, which we don't want here
 */
function getClickTargetNode(event) {
  const target = getTargetNode(event);

  if (!target || !(target instanceof Element)) {
    return target;
  }

  return getClosestInteractive(target);
}

/** Get the event target node. */
function getTargetNode(event) {
  if (isEventWithTarget(event)) {
    return event.target ;
  }

  return event;
}

function isEventWithTarget(event) {
  return typeof event === 'object' && !!event && 'target' in event;
}

let handlers;

/**
 * Register a handler to be called when `window.open()` is called.
 * Returns a cleanup function.
 */
function onWindowOpen(cb) {
  // Ensure to only register this once
  if (!handlers) {
    handlers = [];
    monkeyPatchWindowOpen();
  }

  handlers.push(cb);

  return () => {
    const pos = handlers ? handlers.indexOf(cb) : -1;
    if (pos > -1) {
      (handlers ).splice(pos, 1);
    }
  };
}

function monkeyPatchWindowOpen() {
  fill(WINDOW$1, 'open', function (originalWindowOpen) {
    return function (...args) {
      if (handlers) {
        try {
          handlers.forEach(handler => handler());
        } catch (e) {
          // ignore errors in here
        }
      }

      return originalWindowOpen.apply(WINDOW$1, args);
    };
  });
}

/** Any IncrementalSource for rrweb that we interpret as a kind of mutation. */
const IncrementalMutationSources = new Set([
  IncrementalSource.Mutation,
  IncrementalSource.StyleSheetRule,
  IncrementalSource.StyleDeclaration,
  IncrementalSource.AdoptedStyleSheet,
  IncrementalSource.CanvasMutation,
  IncrementalSource.Selection,
  IncrementalSource.MediaInteraction,
]);

/** Handle a click. */
function handleClick(clickDetector, clickBreadcrumb, node) {
  clickDetector.handleClick(clickBreadcrumb, node);
}

/** A click detector class that can be used to detect slow or rage clicks on elements. */
class ClickDetector  {
  // protected for testing

   constructor(
    replay,
    slowClickConfig,
    // Just for easier testing
    _addBreadcrumbEvent = addBreadcrumbEvent,
  ) {
    this._lastMutation = 0;
    this._lastScroll = 0;
    this._clicks = [];

    // We want everything in s, but options are in ms
    this._timeout = slowClickConfig.timeout / 1000;
    this._threshold = slowClickConfig.threshold / 1000;
    this._scrollTimeout = slowClickConfig.scrollTimeout / 1000;
    this._replay = replay;
    this._ignoreSelector = slowClickConfig.ignoreSelector;
    this._addBreadcrumbEvent = _addBreadcrumbEvent;
  }

  /** Register click detection handlers on mutation or scroll. */
   addListeners() {
    const cleanupWindowOpen = onWindowOpen(() => {
      // Treat window.open as mutation
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
    if (this._teardown) {
      this._teardown();
    }

    if (this._checkClickTimeout) {
      clearTimeout(this._checkClickTimeout);
    }
  }

  /** @inheritDoc */
   handleClick(breadcrumb, node) {
    if (ignoreElement(node, this._ignoreSelector) || !isClickBreadcrumb(breadcrumb)) {
      return;
    }

    const newClick = {
      timestamp: timestampToS(breadcrumb.timestamp),
      clickBreadcrumb: breadcrumb,
      // Set this to 0 so we know it originates from the click breadcrumb
      clickCount: 0,
      node,
    };

    // If there was a click in the last 1s on the same element, ignore it - only keep a single reference per second
    if (
      this._clicks.some(click => click.node === newClick.node && Math.abs(click.timestamp - newClick.timestamp) < 1)
    ) {
      return;
    }

    this._clicks.push(newClick);

    // If this is the first new click, set a timeout to check for multi clicks
    if (this._clicks.length === 1) {
      this._scheduleCheckClicks();
    }
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
    this._handleMultiClick(node );
  }

  /** Count multiple clicks on elements. */
   _handleMultiClick(node) {
    this._getClicks(node).forEach(click => {
      click.clickCount++;
    });
  }

  /** Get all pending clicks for a given node. */
   _getClicks(node) {
    return this._clicks.filter(click => click.node === node);
  }

  /** Check the clicks that happened. */
   _checkClicks() {
    const timedOutClicks = [];

    const now = nowInSeconds();

    this._clicks.forEach(click => {
      if (!click.mutationAfter && this._lastMutation) {
        click.mutationAfter = click.timestamp <= this._lastMutation ? this._lastMutation - click.timestamp : undefined;
      }
      if (!click.scrollAfter && this._lastScroll) {
        click.scrollAfter = click.timestamp <= this._lastScroll ? this._lastScroll - click.timestamp : undefined;
      }

      // All of these are in seconds!
      if (click.timestamp + this._timeout <= now) {
        timedOutClicks.push(click);
      }
    });

    // Remove "old" clicks
    for (const click of timedOutClicks) {
      const pos = this._clicks.indexOf(click);

      if (pos > -1) {
        this._generateBreadcrumbs(click);
        this._clicks.splice(pos, 1);
      }
    }

    // Trigger new check, unless no clicks left
    if (this._clicks.length) {
      this._scheduleCheckClicks();
    }
  }

  /** Generate matching breadcrumb(s) for the click. */
   _generateBreadcrumbs(click) {
    const replay = this._replay;
    const hadScroll = click.scrollAfter && click.scrollAfter <= this._scrollTimeout;
    const hadMutation = click.mutationAfter && click.mutationAfter <= this._threshold;

    const isSlowClick = !hadScroll && !hadMutation;
    const { clickCount, clickBreadcrumb } = click;

    // Slow click
    if (isSlowClick) {
      // If `mutationAfter` is set, it means a mutation happened after the threshold, but before the timeout
      // If not, it means we just timed out without scroll & mutation
      const timeAfterClickMs = Math.min(click.mutationAfter || this._timeout, this._timeout) * 1000;
      const endReason = timeAfterClickMs < this._timeout * 1000 ? 'mutation' : 'timeout';

      const breadcrumb = {
        type: 'default',
        message: clickBreadcrumb.message,
        timestamp: clickBreadcrumb.timestamp,
        category: 'ui.slowClickDetected',
        data: {
          ...clickBreadcrumb.data,
          url: WINDOW$1.location.href,
          route: replay.getCurrentRoute(),
          timeAfterClickMs,
          endReason,
          // If clickCount === 0, it means multiClick was not correctly captured here
          // - we still want to send 1 in this case
          clickCount: clickCount || 1,
        },
      };

      this._addBreadcrumbEvent(replay, breadcrumb);
      return;
    }

    // Multi click
    if (clickCount > 1) {
      const breadcrumb = {
        type: 'default',
        message: clickBreadcrumb.message,
        timestamp: clickBreadcrumb.timestamp,
        category: 'ui.multiClick',
        data: {
          ...clickBreadcrumb.data,
          url: WINDOW$1.location.href,
          route: replay.getCurrentRoute(),
          clickCount,
          metric: true,
        },
      };

      this._addBreadcrumbEvent(replay, breadcrumb);
    }
  }

  /** Schedule to check current clicks. */
   _scheduleCheckClicks() {
    if (this._checkClickTimeout) {
      clearTimeout(this._checkClickTimeout);
    }

    this._checkClickTimeout = setTimeout$1(() => this._checkClicks(), 1000);
  }
}

const SLOW_CLICK_TAGS = ['A', 'BUTTON', 'INPUT'];

/** exported for tests only */
function ignoreElement(node, ignoreSelector) {
  if (!SLOW_CLICK_TAGS.includes(node.tagName)) {
    return true;
  }

  // If <input> tag, we only want to consider input[type='submit'] & input[type='button']
  if (node.tagName === 'INPUT' && !['submit', 'button'].includes(node.getAttribute('type') || '')) {
    return true;
  }

  // If <a> tag, detect special variants that may not lead to an action
  // If target !== _self, we may open the link somewhere else, which would lead to no action
  // Also, when downloading a file, we may not leave the page, but still not trigger an action
  if (
    node.tagName === 'A' &&
    (node.hasAttribute('download') || (node.hasAttribute('target') && node.getAttribute('target') !== '_self'))
  ) {
    return true;
  }

  if (ignoreSelector && node.matches(ignoreSelector)) {
    return true;
  }

  return false;
}

function isClickBreadcrumb(breadcrumb) {
  return !!(breadcrumb.data && typeof breadcrumb.data.nodeId === 'number' && breadcrumb.timestamp);
}

// This is good enough for us, and is easier to test/mock than `timestampInSeconds`
function nowInSeconds() {
  return Date.now() / 1000;
}

/** Update the click detector based on a recording event of rrweb. */
function updateClickDetectorForRecordingEvent(clickDetector, event) {
  try {
    // note: We only consider incremental snapshots here
    // This means that any full snapshot is ignored for mutation detection - the reason is that we simply cannot know if a mutation happened here.
    // E.g. think that we are buffering, an error happens and we take a full snapshot because we switched to session mode -
    // in this scenario, we would not know if a dead click happened because of the error, which is a key dead click scenario.
    // Instead, by ignoring full snapshots, we have the risk that we generate a false positive
    // (if a mutation _did_ happen but was "swallowed" by the full snapshot)
    // But this should be more unlikely as we'd generally capture the incremental snapshot right away

    if (!isIncrementalEvent(event)) {
      return;
    }

    const { source } = event.data;
    if (IncrementalMutationSources.has(source)) {
      clickDetector.registerMutation(event.timestamp);
    }

    if (source === IncrementalSource.Scroll) {
      clickDetector.registerScroll(event.timestamp);
    }

    if (isIncrementalMouseInteraction(event)) {
      const { type, id } = event.data;
      const node = record.mirror.getNode(id);

      if (node instanceof HTMLElement && type === MouseInteractions.Click) {
        clickDetector.registerClick(node);
      }
    }
  } catch (e) {
    // ignore errors here, e.g. if accessing something that does not exist
  }
}

function isIncrementalEvent(event) {
  return event.type === ReplayEventTypeIncrementalSnapshot;
}

function isIncrementalMouseInteraction(
  event,
) {
  return event.data.source === IncrementalSource.MouseInteraction;
}

/**
 * Create a breadcrumb for a replay.
 */
function createBreadcrumb(
  breadcrumb,
) {
  return {
    timestamp: Date.now() / 1000,
    type: 'default',
    ...breadcrumb,
  };
}

var NodeType;
(function (NodeType) {
    NodeType[NodeType["Document"] = 0] = "Document";
    NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
    NodeType[NodeType["Element"] = 2] = "Element";
    NodeType[NodeType["Text"] = 3] = "Text";
    NodeType[NodeType["CDATA"] = 4] = "CDATA";
    NodeType[NodeType["Comment"] = 5] = "Comment";
})(NodeType || (NodeType = {}));

// Note that these are the serialized attributes and not attributes directly on
// the DOM Node. Attributes we are interested in:
const ATTRIBUTES_TO_RECORD = new Set([
  'id',
  'class',
  'aria-label',
  'role',
  'name',
  'alt',
  'title',
  'data-test-id',
  'data-testid',
  'disabled',
  'aria-disabled',
  'data-sentry-component',
]);

/**
 * Inclusion list of attributes that we want to record from the DOM element
 */
function getAttributesToRecord(attributes) {
  const obj = {};
  if (!attributes['data-sentry-component'] && attributes['data-sentry-element']) {
    attributes['data-sentry-component'] = attributes['data-sentry-element'];
  }
  for (const key in attributes) {
    if (ATTRIBUTES_TO_RECORD.has(key)) {
      let normalizedKey = key;

      if (key === 'data-testid' || key === 'data-test-id') {
        normalizedKey = 'testId';
      }

      obj[normalizedKey] = attributes[key];
    }
  }

  return obj;
}

const handleDomListener = (
  replay,
) => {
  return (handlerData) => {
    if (!replay.isEnabled()) {
      return;
    }

    const result = handleDom(handlerData);

    if (!result) {
      return;
    }

    const isClick = handlerData.name === 'click';
    const event = isClick ? (handlerData.event ) : undefined;
    // Ignore clicks if ctrl/alt/meta/shift keys are held down as they alter behavior of clicks (e.g. open in new tab)
    if (
      isClick &&
      replay.clickDetector &&
      event &&
      event.target &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    ) {
      handleClick(
        replay.clickDetector,
        result ,
        getClickTargetNode(handlerData.event ) ,
      );
    }

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
    data: element
      ? {
          nodeId,
          node: {
            id: nodeId,
            tagName: element.tagName,
            textContent: Array.from(element.childNodes)
              .map((node) => node.type === NodeType.Text && node.textContent)
              .filter(Boolean) // filter out empty values
              .map(text => (text ).trim())
              .join(''),
            attributes: getAttributesToRecord(element.attributes),
          },
        }
      : {},
  };
}

/**
 * An event handler to react to DOM events.
 * Exported for tests.
 */
function handleDom(handlerData) {
  const { target, message } = getDomTarget(handlerData);

  return createBreadcrumb({
    category: `ui.${handlerData.name}`,
    ...getBaseDomBreadcrumb(target, message),
  });
}

function getDomTarget(handlerData) {
  const isClick = handlerData.name === 'click';

  let message;
  let target = null;

  // Accessing event.target can throw (see getsentry/raven-js#838, #768)
  try {
    target = isClick ? getClickTargetNode(handlerData.event ) : getTargetNode(handlerData.event );
    message = htmlTreeAsString(target, { maxStringLength: 200 }) || '<unknown>';
  } catch (e) {
    message = '<unknown>';
  }

  return { target, message };
}

function isElement(node) {
  return node.type === NodeType.Element;
}

/** Handle keyboard events & create breadcrumbs. */
function handleKeyboardEvent(replay, event) {
  if (!replay.isEnabled()) {
    return;
  }

  // Update user activity, but do not restart recording as it can create
  // noisy/low-value replays (e.g. user comes back from idle, hits alt-tab, new
  // session with a single "keydown" breadcrumb is created)
  replay.updateUserActivity();

  const breadcrumb = getKeyboardBreadcrumb(event);

  if (!breadcrumb) {
    return;
  }

  addBreadcrumbEvent(replay, breadcrumb);
}

/** exported only for tests */
function getKeyboardBreadcrumb(event) {
  const { metaKey, shiftKey, ctrlKey, altKey, key, target } = event;

  // never capture for input fields
  if (!target || isInputElement(target ) || !key) {
    return null;
  }

  // Note: We do not consider shift here, as that means "uppercase"
  const hasModifierKey = metaKey || ctrlKey || altKey;
  const isCharacterKey = key.length === 1; // other keys like Escape, Tab, etc have a longer length

  // Do not capture breadcrumb if only a word key is pressed
  // This could leak e.g. user input
  if (!hasModifierKey && isCharacterKey) {
    return null;
  }

  const message = htmlTreeAsString(target, { maxStringLength: 200 }) || '<unknown>';
  const baseBreadcrumb = getBaseDomBreadcrumb(target , message);

  return createBreadcrumb({
    category: 'ui.keyDown',
    message,
    data: {
      ...baseBreadcrumb.data,
      metaKey,
      shiftKey,
      ctrlKey,
      altKey,
      key,
    },
  });
}

function isInputElement(target) {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

// Map entryType -> function to normalize data for event
const ENTRY_TYPES

 = {
  // @ts-expect-error TODO: entry type does not fit the create* functions entry type
  resource: createResourceEntry,
  paint: createPaintEntry,
  // @ts-expect-error TODO: entry type does not fit the create* functions entry type
  navigation: createNavigationEntry,
};

/**
 * Handler creater for web vitals
 */
function webVitalHandler(
  getter,
  replay,
) {
  return ({ metric }) => void replay.replayPerformanceEntries.push(getter(metric));
}

/**
 * Create replay performance entries from the browser performance entries.
 */
function createPerformanceEntries(
  entries,
) {
  return entries.map(createPerformanceEntry).filter(Boolean) ;
}

function createPerformanceEntry(entry) {
  const entryType = ENTRY_TYPES[entry.entryType];
  if (!entryType) {
    return null;
  }

  return entryType(entry);
}

function getAbsoluteTime(time) {
  // browserPerformanceTimeOrigin can be undefined if `performance` or
  // `performance.now` doesn't exist, but this is already checked by this integration
  return ((browserPerformanceTimeOrigin || WINDOW$1.performance.timeOrigin) + time) / 1000;
}

function createPaintEntry(entry) {
  const { duration, entryType, name, startTime } = entry;

  const start = getAbsoluteTime(startTime);
  return {
    type: entryType,
    name,
    start,
    end: start + duration,
    data: undefined,
  };
}

function createNavigationEntry(entry) {
  const {
    entryType,
    name,
    decodedBodySize,
    duration,
    domComplete,
    encodedBodySize,
    domContentLoadedEventStart,
    domContentLoadedEventEnd,
    domInteractive,
    loadEventStart,
    loadEventEnd,
    redirectCount,
    startTime,
    transferSize,
    type,
  } = entry;

  // Ignore entries with no duration, they do not seem to be useful and cause dupes
  if (duration === 0) {
    return null;
  }

  return {
    type: `${entryType}.${type}`,
    start: getAbsoluteTime(startTime),
    end: getAbsoluteTime(domComplete),
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
      redirectCount,
    },
  };
}

function createResourceEntry(
  entry,
) {
  const {
    entryType,
    initiatorType,
    name,
    responseEnd,
    startTime,
    decodedBodySize,
    encodedBodySize,
    responseStatus,
    transferSize,
  } = entry;

  // Core SDK handles these
  if (['fetch', 'xmlhttprequest'].includes(initiatorType)) {
    return null;
  }

  return {
    type: `${entryType}.${initiatorType}`,
    start: getAbsoluteTime(startTime),
    end: getAbsoluteTime(responseEnd),
    name,
    data: {
      size: transferSize,
      statusCode: responseStatus,
      decodedBodySize,
      encodedBodySize,
    },
  };
}

/**
 * Add a LCP event to the replay based on a LCP metric.
 */
function getLargestContentfulPaint(metric) {
  const lastEntry = metric.entries[metric.entries.length - 1] ;
  const node = lastEntry && lastEntry.element ? [lastEntry.element] : undefined;
  return getWebVital(metric, 'largest-contentful-paint', node);
}

function isLayoutShift(entry) {
  return (entry ).sources !== undefined;
}

/**
 * Add a CLS event to the replay based on a CLS metric.
 */
function getCumulativeLayoutShift(metric) {
  const layoutShifts = [];
  const nodes = [];
  for (const entry of metric.entries) {
    if (isLayoutShift(entry)) {
      const nodeIds = [];
      for (const source of entry.sources) {
        if (source.node) {
          nodes.push(source.node);
          const nodeId = record.mirror.getId(source.node);
          if (nodeId) {
            nodeIds.push(nodeId);
          }
        }
      }
      layoutShifts.push({ value: entry.value, nodeIds: nodeIds.length ? nodeIds : undefined });
    }
  }

  return getWebVital(metric, 'cumulative-layout-shift', nodes, layoutShifts);
}

/**
 * Add a FID event to the replay based on a FID metric.
 */
function getFirstInputDelay(metric) {
  const lastEntry = metric.entries[metric.entries.length - 1] ;
  const node = lastEntry && lastEntry.target ? [lastEntry.target] : undefined;
  return getWebVital(metric, 'first-input-delay', node);
}

/**
 * Add an INP event to the replay based on an INP metric.
 */
function getInteractionToNextPaint(metric) {
  const lastEntry = metric.entries[metric.entries.length - 1] ;
  const node = lastEntry && lastEntry.target ? [lastEntry.target] : undefined;
  return getWebVital(metric, 'interaction-to-next-paint', node);
}

/**
 * Add an web vital event to the replay based on the web vital metric.
 */
function getWebVital(
  metric,
  name,
  nodes,
  attributions,
) {
  const value = metric.value;
  const rating = metric.rating;

  const end = getAbsoluteTime(value);

  return {
    type: 'web-vital',
    name,
    start: end,
    end,
    data: {
      value,
      size: value,
      rating,
      nodeIds: nodes ? nodes.map(node => record.mirror.getId(node)) : undefined,
      attributions,
    },
  };
}

/**
 * Sets up a PerformanceObserver to listen to all performance entry types.
 * Returns a callback to stop observing.
 */
function setupPerformanceObserver(replay) {
  function addPerformanceEntry(entry) {
    // It is possible for entries to come up multiple times
    if (!replay.performanceEntries.includes(entry)) {
      replay.performanceEntries.push(entry);
    }
  }

  function onEntries({ entries }) {
    entries.forEach(addPerformanceEntry);
  }

  const clearCallbacks = [];

  (['navigation', 'paint', 'resource'] ).forEach(type => {
    clearCallbacks.push(addPerformanceInstrumentationHandler(type, onEntries));
  });

  clearCallbacks.push(
    addLcpInstrumentationHandler(webVitalHandler(getLargestContentfulPaint, replay)),
    addClsInstrumentationHandler(webVitalHandler(getCumulativeLayoutShift, replay)),
    addFidInstrumentationHandler(webVitalHandler(getFirstInputDelay, replay)),
    addInpInstrumentationHandler(webVitalHandler(getInteractionToNextPaint, replay)),
  );

  // A callback to cleanup all handlers
  return () => {
    clearCallbacks.forEach(clearCallback => clearCallback());
  };
}

var r = `var t=Uint8Array,n=Uint16Array,r=Int32Array,e=new t([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new t([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new t([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=function(t,e){for(var i=new n(31),a=0;a<31;++a)i[a]=e+=1<<t[a-1];var s=new r(i[30]);for(a=1;a<30;++a)for(var o=i[a];o<i[a+1];++o)s[o]=o-i[a]<<5|a;return{b:i,r:s}},o=s(e,2),f=o.b,h=o.r;f[28]=258,h[258]=28;for(var l=s(i,0).r,u=new n(32768),c=0;c<32768;++c){var v=(43690&c)>>1|(21845&c)<<1;v=(61680&(v=(52428&v)>>2|(13107&v)<<2))>>4|(3855&v)<<4,u[c]=((65280&v)>>8|(255&v)<<8)>>1}var d=function(t,r,e){for(var i=t.length,a=0,s=new n(r);a<i;++a)t[a]&&++s[t[a]-1];var o,f=new n(r);for(a=1;a<r;++a)f[a]=f[a-1]+s[a-1]<<1;if(e){o=new n(1<<r);var h=15-r;for(a=0;a<i;++a)if(t[a])for(var l=a<<4|t[a],c=r-t[a],v=f[t[a]-1]++<<c,d=v|(1<<c)-1;v<=d;++v)o[u[v]>>h]=l}else for(o=new n(i),a=0;a<i;++a)t[a]&&(o[a]=u[f[t[a]-1]++]>>15-t[a]);return o},g=new t(288);for(c=0;c<144;++c)g[c]=8;for(c=144;c<256;++c)g[c]=9;for(c=256;c<280;++c)g[c]=7;for(c=280;c<288;++c)g[c]=8;var w=new t(32);for(c=0;c<32;++c)w[c]=5;var p=d(g,9,0),y=d(w,5,0),m=function(t){return(t+7)/8|0},b=function(n,r,e){return(null==e||e>n.length)&&(e=n.length),new t(n.subarray(r,e))},M=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],E=function(t,n,r){var e=new Error(n||M[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,E),!r)throw e;return e},z=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8},_=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8,t[e+2]|=r>>16},x=function(r,e){for(var i=[],a=0;a<r.length;++a)r[a]&&i.push({s:a,f:r[a]});var s=i.length,o=i.slice();if(!s)return{t:F,l:0};if(1==s){var f=new t(i[0].s+1);return f[i[0].s]=1,{t:f,l:1}}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var h=i[0],l=i[1],u=0,c=1,v=2;for(i[0]={s:-1,f:h.f+l.f,l:h,r:l};c!=s-1;)h=i[i[u].f<i[v].f?u++:v++],l=i[u!=c&&i[u].f<i[v].f?u++:v++],i[c++]={s:-1,f:h.f+l.f,l:h,r:l};var d=o[0].s;for(a=1;a<s;++a)o[a].s>d&&(d=o[a].s);var g=new n(d+1),w=A(i[c-1],g,0);if(w>e){a=0;var p=0,y=w-e,m=1<<y;for(o.sort((function(t,n){return g[n.s]-g[t.s]||t.f-n.f}));a<s;++a){var b=o[a].s;if(!(g[b]>e))break;p+=m-(1<<w-g[b]),g[b]=e}for(p>>=y;p>0;){var M=o[a].s;g[M]<e?p-=1<<e-g[M]++-1:++a}for(;a>=0&&p;--a){var E=o[a].s;g[E]==e&&(--g[E],++p)}w=e}return{t:new t(g),l:w}},A=function(t,n,r){return-1==t.s?Math.max(A(t.l,n,r+1),A(t.r,n,r+1)):n[t.s]=r},D=function(t){for(var r=t.length;r&&!t[--r];);for(var e=new n(++r),i=0,a=t[0],s=1,o=function(t){e[i++]=t},f=1;f<=r;++f)if(t[f]==a&&f!=r)++s;else{if(!a&&s>2){for(;s>138;s-=138)o(32754);s>2&&(o(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(o(a),--s;s>6;s-=6)o(8304);s>2&&(o(s-3<<5|8208),s=0)}for(;s--;)o(a);s=1,a=t[f]}return{c:e.subarray(0,i),n:r}},T=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},k=function(t,n,r){var e=r.length,i=m(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var a=0;a<e;++a)t[i+a+4]=r[a];return 8*(i+4+e)},U=function(t,r,s,o,f,h,l,u,c,v,m){z(r,m++,s),++f[256];for(var b=x(f,15),M=b.t,E=b.l,A=x(h,15),U=A.t,C=A.l,F=D(M),I=F.c,S=F.n,L=D(U),O=L.c,j=L.n,q=new n(19),B=0;B<I.length;++B)++q[31&I[B]];for(B=0;B<O.length;++B)++q[31&O[B]];for(var G=x(q,7),H=G.t,J=G.l,K=19;K>4&&!H[a[K-1]];--K);var N,P,Q,R,V=v+5<<3,W=T(f,g)+T(h,w)+l,X=T(f,M)+T(h,U)+l+14+3*K+T(q,H)+2*q[16]+3*q[17]+7*q[18];if(c>=0&&V<=W&&V<=X)return k(r,m,t.subarray(c,c+v));if(z(r,m,1+(X<W)),m+=2,X<W){N=d(M,E,0),P=M,Q=d(U,C,0),R=U;var Y=d(H,J,0);z(r,m,S-257),z(r,m+5,j-1),z(r,m+10,K-4),m+=14;for(B=0;B<K;++B)z(r,m+3*B,H[a[B]]);m+=3*K;for(var Z=[I,O],$=0;$<2;++$){var tt=Z[$];for(B=0;B<tt.length;++B){var nt=31&tt[B];z(r,m,Y[nt]),m+=H[nt],nt>15&&(z(r,m,tt[B]>>5&127),m+=tt[B]>>12)}}}else N=p,P=g,Q=y,R=w;for(B=0;B<u;++B){var rt=o[B];if(rt>255){_(r,m,N[(nt=rt>>18&31)+257]),m+=P[nt+257],nt>7&&(z(r,m,rt>>23&31),m+=e[nt]);var et=31&rt;_(r,m,Q[et]),m+=R[et],et>3&&(_(r,m,rt>>5&8191),m+=i[et])}else _(r,m,N[rt]),m+=P[rt]}return _(r,m,N[256]),m+P[256]},C=new r([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),F=new t(0),I=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),S=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=I[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},L=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,a=0|r.length,s=0;s!=a;){for(var o=Math.min(s+2655,a);s<o;++s)i+=e+=r[s];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},O=function(a,s,o,f,u){if(!u&&(u={l:1},s.dictionary)){var c=s.dictionary.subarray(-32768),v=new t(c.length+a.length);v.set(c),v.set(a,c.length),a=v,u.w=c.length}return function(a,s,o,f,u,c){var v=c.z||a.length,d=new t(f+v+5*(1+Math.ceil(v/7e3))+u),g=d.subarray(f,d.length-u),w=c.l,p=7&(c.r||0);if(s){p&&(g[0]=c.r>>3);for(var y=C[s-1],M=y>>13,E=8191&y,z=(1<<o)-1,_=c.p||new n(32768),x=c.h||new n(z+1),A=Math.ceil(o/3),D=2*A,T=function(t){return(a[t]^a[t+1]<<A^a[t+2]<<D)&z},F=new r(25e3),I=new n(288),S=new n(32),L=0,O=0,j=c.i||0,q=0,B=c.w||0,G=0;j+2<v;++j){var H=T(j),J=32767&j,K=x[H];if(_[J]=K,x[H]=J,B<=j){var N=v-j;if((L>7e3||q>24576)&&(N>423||!w)){p=U(a,g,0,F,I,S,O,q,G,j-G,p),q=L=O=0,G=j;for(var P=0;P<286;++P)I[P]=0;for(P=0;P<30;++P)S[P]=0}var Q=2,R=0,V=E,W=J-K&32767;if(N>2&&H==T(j-W))for(var X=Math.min(M,N)-1,Y=Math.min(32767,j),Z=Math.min(258,N);W<=Y&&--V&&J!=K;){if(a[j+Q]==a[j+Q-W]){for(var $=0;$<Z&&a[j+$]==a[j+$-W];++$);if($>Q){if(Q=$,R=W,$>X)break;var tt=Math.min(W,$-2),nt=0;for(P=0;P<tt;++P){var rt=j-W+P&32767,et=rt-_[rt]&32767;et>nt&&(nt=et,K=rt)}}}W+=(J=K)-(K=_[J])&32767}if(R){F[q++]=268435456|h[Q]<<18|l[R];var it=31&h[Q],at=31&l[R];O+=e[it]+i[at],++I[257+it],++S[at],B=j+Q,++L}else F[q++]=a[j],++I[a[j]]}}for(j=Math.max(j,B);j<v;++j)F[q++]=a[j],++I[a[j]];p=U(a,g,w,F,I,S,O,q,G,j-G,p),w||(c.r=7&p|g[p/8|0]<<3,p-=7,c.h=x,c.p=_,c.i=j,c.w=B)}else{for(j=c.w||0;j<v+w;j+=65535){var st=j+65535;st>=v&&(g[p/8|0]=w,st=v),p=k(g,p+1,a.subarray(j,st))}c.i=v}return b(d,0,f+m(p)+u)}(a,null==s.level?6:s.level,null==s.mem?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(a.length)))):12+s.mem,o,f,u)},j=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},q=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&j(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},B=function(t){return 10+(t.filename?t.filename.length+1:0)},G=function(){function n(n,r){if("function"==typeof n&&(r=n,n={}),this.ondata=r,this.o=n||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new t(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return n.prototype.p=function(t,n){this.ondata(O(t,this.o,0,0,this.s),n)},n.prototype.push=function(n,r){this.ondata||E(5),this.s.l&&E(4);var e=n.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new t(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;a&&(this.b.set(n.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1)),this.b.set(this.b.subarray(-32768)),this.b.set(n.subarray(a),32768),this.s.z=n.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(n,this.s.z),this.s.z+=n.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},n}();var H=function(){function t(t,n){this.c=L(),this.v=1,G.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),G.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=O(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=L();i.p(n.dictionary),j(t,2,i.d())}}(r,this.o),this.v=0),n&&j(r,r.length-4,this.c.d()),this.ondata(r,n)},t}(),J="undefined"!=typeof TextEncoder&&new TextEncoder,K="undefined"!=typeof TextDecoder&&new TextDecoder;try{K.decode(F,{stream:!0})}catch(t){}var N=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||E(5),this.d&&E(4),this.ondata(P(t),this.d=n||!1)},t}();function P(n,r){if(J)return J.encode(n);for(var e=n.length,i=new t(n.length+(n.length>>1)),a=0,s=function(t){i[a++]=t},o=0;o<e;++o){if(a+5>i.length){var f=new t(a+8+(e-o<<1));f.set(i),i=f}var h=n.charCodeAt(o);h<128||r?s(h):h<2048?(s(192|h>>6),s(128|63&h)):h>55295&&h<57344?(s(240|(h=65536+(1047552&h)|1023&n.charCodeAt(++o))>>18),s(128|h>>12&63),s(128|h>>6&63),s(128|63&h)):(s(224|h>>12),s(128|h>>6&63),s(128|63&h))}return b(i,0,a)}function Q(t){return function(t,n){n||(n={});var r=S(),e=t.length;r.p(t);var i=O(t,n,B(n),8),a=i.length;return q(i,n),j(i,a-8,r.d()),j(i,a-4,e),i}(P(t))}const R=new class{constructor(){this._init()}clear(){this._init()}addEvent(t){if(!t)throw new Error("Adding invalid event");const n=this._hasEvents?",":"";this.stream.push(n+t),this._hasEvents=!0}finish(){this.stream.push("]",!0);const t=function(t){let n=0;for(const r of t)n+=r.length;const r=new Uint8Array(n);for(let n=0,e=0,i=t.length;n<i;n++){const i=t[n];r.set(i,e),e+=i.length}return r}(this._deflatedData);return this._init(),t}_init(){this._hasEvents=!1,this._deflatedData=[],this.deflate=new H,this.deflate.ondata=(t,n)=>{this._deflatedData.push(t)},this.stream=new N(((t,n)=>{this.deflate.push(t,n)})),this.stream.push("[")}},V={clear:()=>{R.clear()},addEvent:t=>R.addEvent(t),finish:()=>R.finish(),compress:t=>Q(t)};addEventListener("message",(function(t){const n=t.data.method,r=t.data.id,e=t.data.arg;if(n in V&&"function"==typeof V[n])try{const t=V[n](e);postMessage({id:r,method:n,success:!0,response:t})}catch(t){postMessage({id:r,method:n,success:!1,response:t.message}),console.error(t)}})),postMessage({id:void 0,method:"init",success:!0,response:void 0});`;

function e(){const e=new Blob([r]);return URL.createObjectURL(e)}

const CONSOLE_LEVELS = ['info', 'warn', 'error', 'log'] ;
const PREFIX = '[Replay] ';

function _addBreadcrumb(message, level = 'info') {
  addBreadcrumb(
    {
      category: 'console',
      data: {
        logger: 'replay',
      },
      level,
      message: `${PREFIX}${message}`,
    },
    { level },
  );
}

function makeReplayLogger() {
  let _capture = false;
  let _trace = false;

  const _logger = {
    exception: () => undefined,
    infoTick: () => undefined,
    setConfig: (opts) => {
      _capture = opts.captureExceptions;
      _trace = opts.traceInternals;
    },
  };

  {
    CONSOLE_LEVELS.forEach(name => {
      _logger[name] = (...args) => {
        logger$1[name](PREFIX, ...args);
        if (_trace) {
          _addBreadcrumb(args.join(''), severityLevelFromString(name));
        }
      };
    });

    _logger.exception = (error, ...message) => {
      if (message.length && _logger.error) {
        _logger.error(...message);
      }

      logger$1.error(PREFIX, error);

      if (_capture) {
        captureException(error);
      } else if (_trace) {
        // No need for a breadcrumb if `_capture` is enabled since it should be
        // captured as an exception
        _addBreadcrumb(error, 'error');
      }
    };

    _logger.infoTick = (...args) => {
      logger$1.info(PREFIX, ...args);
      if (_trace) {
        // Wait a tick here to avoid race conditions for some initial logs
        // which may be added before replay is initialized
        setTimeout(() => _addBreadcrumb(args[0]), 0);
      }
    };
  }

  return _logger ;
}

const logger = makeReplayLogger();

/** This error indicates that the event buffer size exceeded the limit.. */
class EventBufferSizeExceededError extends Error {
   constructor() {
    super(`Event buffer exceeded maximum size of ${REPLAY_MAX_EVENT_BUFFER_SIZE}.`);
  }
}

/**
 * A basic event buffer that does not do any compression.
 * Used as fallback if the compression worker cannot be loaded or is disabled.
 */
class EventBufferArray  {
  /** All the events that are buffered to be sent. */

  /** @inheritdoc */

  /** @inheritdoc */

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
    return 'sync';
  }

  /** @inheritdoc */
   destroy() {
    this.events = [];
  }

  /** @inheritdoc */
   async addEvent(event) {
    const eventSize = JSON.stringify(event).length;
    this._totalSize += eventSize;
    if (this._totalSize > REPLAY_MAX_EVENT_BUFFER_SIZE) {
      throw new EventBufferSizeExceededError();
    }

    this.events.push(event);
  }

  /** @inheritdoc */
   finish() {
    return new Promise(resolve => {
      // Make a copy of the events array reference and immediately clear the
      // events member so that we do not lose new events while uploading
      // attachment.
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
    const timestamp = this.events.map(event => event.timestamp).sort()[0];

    if (!timestamp) {
      return null;
    }

    return timestampToMs(timestamp);
  }
}

/**
 * Event buffer that uses a web worker to compress events.
 * Exported only for testing.
 */
class WorkerHandler {

   constructor(worker) {
    this._worker = worker;
    this._id = 0;
  }

  /**
   * Ensure the worker is ready (or not).
   * This will either resolve when the worker is ready, or reject if an error occurred.
   */
   ensureReady() {
    // Ensure we only check once
    if (this._ensureReadyPromise) {
      return this._ensureReadyPromise;
    }

    this._ensureReadyPromise = new Promise((resolve, reject) => {
      this._worker.addEventListener(
        'message',
        ({ data }) => {
          if ((data ).success) {
            resolve();
          } else {
            reject();
          }
        },
        { once: true },
      );

      this._worker.addEventListener(
        'error',
        error => {
          reject(error);
        },
        { once: true },
      );
    });

    return this._ensureReadyPromise;
  }

  /**
   * Destroy the worker.
   */
   destroy() {
    logger.info('Destroying compression worker');
    this._worker.terminate();
  }

  /**
   * Post message to worker and wait for response before resolving promise.
   */
   postMessage(method, arg) {
    const id = this._getAndIncrementId();

    return new Promise((resolve, reject) => {
      const listener = ({ data }) => {
        const response = data ;
        if (response.method !== method) {
          return;
        }

        // There can be multiple listeners for a single method, the id ensures
        // that the response matches the caller.
        if (response.id !== id) {
          return;
        }

        // At this point, we'll always want to remove listener regardless of result status
        this._worker.removeEventListener('message', listener);

        if (!response.success) {
          // TODO: Do some error handling, not sure what
          logger.error('Error in compression worker: ', response.response);

          reject(new Error('Error in compression worker'));
          return;
        }

        resolve(response.response );
      };

      // Note: we can't use `once` option because it's possible it needs to
      // listen to multiple messages
      this._worker.addEventListener('message', listener);
      this._worker.postMessage({ id, method, arg });
    });
  }

  /** Get the current ID and increment it for the next call. */
   _getAndIncrementId() {
    return this._id++;
  }
}

/**
 * Event buffer that uses a web worker to compress events.
 * Exported only for testing.
 */
class EventBufferCompressionWorker  {
  /** @inheritdoc */

  /** @inheritdoc */

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
    return 'worker';
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
    if (!this._earliestTimestamp || timestamp < this._earliestTimestamp) {
      this._earliestTimestamp = timestamp;
    }

    const data = JSON.stringify(event);
    this._totalSize += data.length;

    if (this._totalSize > REPLAY_MAX_EVENT_BUFFER_SIZE) {
      return Promise.reject(new EventBufferSizeExceededError());
    }

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

    // We do not wait on this, as we assume the order of messages is consistent for the worker
    this._worker.postMessage('clear').then(null, e => {
      logger.exception(e, 'Sending "clear" message to worker failed', e);
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
    return this._worker.postMessage('addEvent', data);
  }

  /**
   * Finish the request and return the compressed data from the worker.
   */
   async _finishRequest() {
    const response = await this._worker.postMessage('finish');

    this._earliestTimestamp = null;
    this._totalSize = 0;

    return response;
  }
}

/**
 * This proxy will try to use the compression worker, and fall back to use the simple buffer if an error occurs there.
 * This can happen e.g. if the worker cannot be loaded.
 * Exported only for testing.
 */
class EventBufferProxy  {

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
  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
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
    // Ensure the worker is loaded, so the sent event is compressed
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
      // If the worker fails to load, we fall back to the simple buffer.
      // Nothing more to do from our side here
      logger.exception(error, 'Failed to load the compression worker, falling back to simple buffer');
      return;
    }

    // Now we need to switch over the array buffer to the compression worker
    await this._switchToCompressionWorker();
  }

  /** Switch the used buffer to the compression worker. */
   async _switchToCompressionWorker() {
    const { events, hasCheckout, waitForCheckout } = this._fallback;

    const addEventPromises = [];
    for (const event of events) {
      addEventPromises.push(this._compression.addEvent(event));
    }

    this._compression.hasCheckout = hasCheckout;
    this._compression.waitForCheckout = waitForCheckout;

    // We switch over to the new buffer immediately - any further events will be added
    // after the previously buffered ones
    this._used = this._compression;

    // Wait for original events to be re-added before resolving
    try {
      await Promise.all(addEventPromises);

      // Can now clear fallback buffer as it's no longer necessary
      this._fallback.clear();
    } catch (error) {
      logger.exception(error, 'Failed to add events when switching buffers.');
    }
  }
}

/**
 * Create an event buffer for replays.
 */
function createEventBuffer({
  useCompression,
  workerUrl: customWorkerUrl,
}) {
  if (
    useCompression &&
    // eslint-disable-next-line no-restricted-globals
    window.Worker
  ) {
    const worker = _loadWorker(customWorkerUrl);

    if (worker) {
      return worker;
    }
  }

  logger.info('Using simple buffer');
  return new EventBufferArray();
}

function _loadWorker(customWorkerUrl) {
  try {
    const workerUrl = customWorkerUrl || _getWorkerUrl();

    if (!workerUrl) {
      return;
    }

    logger.info(`Using compression worker${customWorkerUrl ? ` from ${customWorkerUrl}` : ''}`);
    const worker = new Worker(workerUrl);
    return new EventBufferProxy(worker);
  } catch (error) {
    logger.exception(error, 'Failed to create compression worker');
    // Fall back to use simple event buffer array
  }
}

function _getWorkerUrl() {
  if (typeof __SENTRY_EXCLUDE_REPLAY_WORKER__ === 'undefined' || !__SENTRY_EXCLUDE_REPLAY_WORKER__) {
    return e();
  }

  return '';
}

/** If sessionStorage is available. */
function hasSessionStorage() {
  try {
    // This can throw, e.g. when being accessed in a sandboxed iframe
    return 'sessionStorage' in WINDOW$1 && !!WINDOW$1.sessionStorage;
  } catch (e) {
    return false;
  }
}

/**
 * Removes the session from Session Storage and unsets session in replay instance
 */
function clearSession(replay) {
  deleteSession();
  replay.session = undefined;
}

/**
 * Deletes a session from storage
 */
function deleteSession() {
  if (!hasSessionStorage()) {
    return;
  }

  try {
    WINDOW$1.sessionStorage.removeItem(REPLAY_SESSION_KEY);
  } catch (e) {
    // Ignore potential SecurityError exceptions
  }
}

/**
 * Given a sample rate, returns true if replay should be sampled.
 *
 * 1.0 = 100% sampling
 * 0.0 = 0% sampling
 */
function isSampled(sampleRate) {
  if (sampleRate === undefined) {
    return false;
  }

  // Math.random() returns a number in range of 0 to 1 (inclusive of 0, but not 1)
  return Math.random() < sampleRate;
}

/**
 * Get a session with defaults & applied sampling.
 */
function makeSession(session) {
  const now = Date.now();
  const id = session.id || uuid4();
  // Note that this means we cannot set a started/lastActivity of `0`, but this should not be relevant outside of tests.
  const started = session.started || now;
  const lastActivity = session.lastActivity || now;
  const segmentId = session.segmentId || 0;
  const sampled = session.sampled;
  const previousSessionId = session.previousSessionId;

  return {
    id,
    started,
    lastActivity,
    segmentId,
    sampled,
    previousSessionId,
  };
}

/**
 * Save a session to session storage.
 */
function saveSession(session) {
  if (!hasSessionStorage()) {
    return;
  }

  try {
    WINDOW$1.sessionStorage.setItem(REPLAY_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    // Ignore potential SecurityError exceptions
  }
}

/**
 * Get the sampled status for a session based on sample rates & current sampled status.
 */
function getSessionSampleType(sessionSampleRate, allowBuffering) {
  return isSampled(sessionSampleRate) ? 'session' : allowBuffering ? 'buffer' : false;
}

/**
 * Create a new session, which in its current implementation is a Sentry event
 * that all replays will be saved to as attachments. Currently, we only expect
 * one of these Sentry events per "replay session".
 */
function createSession(
  { sessionSampleRate, allowBuffering, stickySession = false },
  { previousSessionId } = {},
) {
  const sampled = getSessionSampleType(sessionSampleRate, allowBuffering);
  const session = makeSession({
    sampled,
    previousSessionId,
  });

  if (stickySession) {
    saveSession(session);
  }

  return session;
}

/**
 * Fetches a session from storage
 */
function fetchSession() {
  if (!hasSessionStorage()) {
    return null;
  }

  try {
    // This can throw if cookies are disabled
    const sessionStringFromStorage = WINDOW$1.sessionStorage.getItem(REPLAY_SESSION_KEY);

    if (!sessionStringFromStorage) {
      return null;
    }

    const sessionObj = JSON.parse(sessionStringFromStorage) ;

    logger.infoTick('Loading existing session');

    return makeSession(sessionObj);
  } catch (e) {
    return null;
  }
}

/**
 * Given an initial timestamp and an expiry duration, checks to see if current
 * time should be considered as expired.
 */
function isExpired(
  initialTime,
  expiry,
  targetTime = +new Date(),
) {
  // Always expired if < 0
  if (initialTime === null || expiry === undefined || expiry < 0) {
    return true;
  }

  // Never expires if == 0
  if (expiry === 0) {
    return false;
  }

  return initialTime + expiry <= targetTime;
}

/**
 * Checks to see if session is expired
 */
function isSessionExpired(
  session,
  {
    maxReplayDuration,
    sessionIdleExpire,
    targetTime = Date.now(),
  },
) {
  return (
    // First, check that maximum session length has not been exceeded
    isExpired(session.started, maxReplayDuration, targetTime) ||
    // check that the idle timeout has not been exceeded (i.e. user has
    // performed an action within the last `sessionIdleExpire` ms)
    isExpired(session.lastActivity, sessionIdleExpire, targetTime)
  );
}

/** If the session should be refreshed or not. */
function shouldRefreshSession(
  session,
  { sessionIdleExpire, maxReplayDuration },
) {
  // If not expired, all good, just keep the session
  if (!isSessionExpired(session, { sessionIdleExpire, maxReplayDuration })) {
    return false;
  }

  // If we are buffering & haven't ever flushed yet, always continue
  if (session.sampled === 'buffer' && session.segmentId === 0) {
    return false;
  }

  return true;
}

/**
 * Get or create a session, when initializing the replay.
 * Returns a session that may be unsampled.
 */
function loadOrCreateSession(
  {
    sessionIdleExpire,
    maxReplayDuration,
    previousSessionId,
  }

,
  sessionOptions,
) {
  const existingSession = sessionOptions.stickySession && fetchSession();

  // No session exists yet, just create a new one
  if (!existingSession) {
    logger.infoTick('Creating new session');
    return createSession(sessionOptions, { previousSessionId });
  }

  if (!shouldRefreshSession(existingSession, { sessionIdleExpire, maxReplayDuration })) {
    return existingSession;
  }

  logger.infoTick('Session in sessionStorage is expired, creating new one...');
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
  if (!shouldAddEvent(replay, event)) {
    return false;
  }

  // This should never reject
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  _addEvent(replay, event, isCheckout);

  return true;
}

/**
 * Add an event to the event buffer.
 * Resolves to `null` if no event was added, else to `void`.
 *
 * `isCheckout` is true if this is either the very first event, or an event triggered by `checkoutEveryNms`.
 */
function addEvent(
  replay,
  event,
  isCheckout,
) {
  if (!shouldAddEvent(replay, event)) {
    return Promise.resolve(null);
  }

  return _addEvent(replay, event, isCheckout);
}

async function _addEvent(
  replay,
  event,
  isCheckout,
) {
  const { eventBuffer } = replay;

  if (!eventBuffer || (eventBuffer.waitForCheckout && !isCheckout)) {
    return null;
  }

  const isBufferMode = replay.recordingMode === 'buffer';

  try {
    if (isCheckout && isBufferMode) {
      eventBuffer.clear();
    }

    if (isCheckout) {
      eventBuffer.hasCheckout = true;
      eventBuffer.waitForCheckout = false;
    }

    const replayOptions = replay.getOptions();

    const eventAfterPossibleCallback = maybeApplyCallback(event, replayOptions.beforeAddRecordingEvent);

    if (!eventAfterPossibleCallback) {
      return;
    }

    return await eventBuffer.addEvent(eventAfterPossibleCallback);
  } catch (error) {
    const isExceeded = error && error instanceof EventBufferSizeExceededError;
    const reason = isExceeded ? 'addEventSizeExceeded' : 'addEvent';

    if (isExceeded && isBufferMode) {
      // Clear buffer and wait for next checkout
      eventBuffer.clear();
      eventBuffer.waitForCheckout = true;

      return null;
    }

    replay.handleException(error);

    await replay.stop({ reason });

    const client = getClient();

    if (client) {
      client.recordDroppedEvent('internal_sdk_error', 'replay');
    }
  }
}

/** Exported only for tests. */
function shouldAddEvent(replay, event) {
  if (!replay.eventBuffer || replay.isPaused() || !replay.isEnabled()) {
    return false;
  }

  const timestampInMs = timestampToMs(event.timestamp);

  // Throw out events that happen more than 5 minutes ago. This can happen if
  // page has been left open and idle for a long period of time and user
  // comes back to trigger a new session. The performance entries rely on
  // `performance.timeOrigin`, which is when the page first opened.
  if (timestampInMs + replay.timeouts.sessionIdlePause < Date.now()) {
    return false;
  }

  // Throw out events that are +60min from the initial timestamp
  if (timestampInMs > replay.getContext().initialTimestamp + replay.getOptions().maxReplayDuration) {
    logger.infoTick(`Skipping event with timestamp ${timestampInMs} because it is after maxReplayDuration`);
    return false;
  }

  return true;
}

function maybeApplyCallback(
  event,
  callback,
) {
  try {
    if (typeof callback === 'function' && isCustomEvent(event)) {
      return callback(event);
    }
  } catch (error) {
    logger.exception(error, 'An error occurred in the `beforeAddRecordingEvent` callback, skipping the event...');
    return null;
  }

  return event;
}

/** If the event is an error event */
function isErrorEvent(event) {
  return !event.type;
}

/** If the event is a transaction event */
function isTransactionEvent(event) {
  return event.type === 'transaction';
}

/** If the event is an replay event */
function isReplayEvent(event) {
  return event.type === 'replay_event';
}

/** If the event is a feedback event */
function isFeedbackEvent(event) {
  return event.type === 'feedback';
}

/**
 * Returns a listener to be added to `client.on('afterSendErrorEvent, listener)`.
 */
function handleAfterSendEvent(replay) {
  return (event, sendResponse) => {
    if (!replay.isEnabled() || (!isErrorEvent(event) && !isTransactionEvent(event))) {
      return;
    }

    const statusCode = sendResponse && sendResponse.statusCode;

    // We only want to do stuff on successful error sending, otherwise you get error replays without errors attached
    // If not using the base transport, we allow `undefined` response (as a custom transport may not implement this correctly yet)
    // If we do use the base transport, we skip if we encountered an non-OK status code
    if (!statusCode || statusCode < 200 || statusCode >= 300) {
      return;
    }

    if (isTransactionEvent(event)) {
      handleTransactionEvent(replay, event);
      return;
    }

    handleErrorEvent(replay, event);
  };
}

function handleTransactionEvent(replay, event) {
  const replayContext = replay.getContext();

  // Collect traceIds in _context regardless of `recordingMode`
  // In error mode, _context gets cleared on every checkout
  // We limit to max. 100 transactions linked
  if (event.contexts && event.contexts.trace && event.contexts.trace.trace_id && replayContext.traceIds.size < 100) {
    replayContext.traceIds.add(event.contexts.trace.trace_id );
  }
}

function handleErrorEvent(replay, event) {
  const replayContext = replay.getContext();

  // Add error to list of errorIds of replay. This is ok to do even if not
  // sampled because context will get reset at next checkout.
  // XXX: There is also a race condition where it's possible to capture an
  // error to Sentry before Replay SDK has loaded, but response returns after
  // it was loaded, and this gets called.
  // We limit to max. 100 errors linked
  if (event.event_id && replayContext.errorIds.size < 100) {
    replayContext.errorIds.add(event.event_id);
  }

  // If error event is tagged with replay id it means it was sampled (when in buffer mode)
  // Need to be very careful that this does not cause an infinite loop
  if (replay.recordingMode !== 'buffer' || !event.tags || !event.tags.replayId) {
    return;
  }

  const { beforeErrorSampling } = replay.getOptions();
  if (typeof beforeErrorSampling === 'function' && !beforeErrorSampling(event)) {
    return;
  }

  setTimeout$1(async () => {
    try {
      // Capture current event buffer as new replay
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
    if (!replay.isEnabled() || !isErrorEvent(event)) {
      return;
    }

    handleHydrationError(replay, event);
  };
}

function handleHydrationError(replay, event) {
  const exceptionValue =
    event.exception && event.exception.values && event.exception.values[0] && event.exception.values[0].value;
  if (typeof exceptionValue !== 'string') {
    return;
  }

  if (
    // Only matches errors in production builds of react-dom
    // Example https://reactjs.org/docs/error-decoder.html?invariant=423
    // With newer React versions, the messages changed to a different website https://react.dev/errors/418
    exceptionValue.match(
      /(reactjs\.org\/docs\/error-decoder\.html\?invariant=|react\.dev\/errors\/)(418|419|422|423|425)/,
    ) ||
    // Development builds of react-dom
    // Error 1: Hydration failed because the initial UI does not match what was rendered on the server.
    // Error 2: Text content does not match server-rendered HTML. Warning: Text content did not match.
    exceptionValue.match(/(does not match server-rendered HTML|Hydration failed because)/i)
  ) {
    const breadcrumb = createBreadcrumb({
      category: 'replay.hydrate-error',
      data: {
        url: getLocationHref(),
      },
    });
    addBreadcrumbEvent(replay, breadcrumb);
  }
}

/**
 * Handle breadcrumbs that Sentry captures, and make sure to capture relevant breadcrumbs to Replay as well.
 */
function handleBreadcrumbs(replay) {
  const client = getClient();

  if (!client) {
    return;
  }

  client.on('beforeAddBreadcrumb', breadcrumb => beforeAddBreadcrumb(replay, breadcrumb));
}

function beforeAddBreadcrumb(replay, breadcrumb) {
  if (!replay.isEnabled() || !isBreadcrumbWithCategory(breadcrumb)) {
    return;
  }

  const result = normalizeBreadcrumb(breadcrumb);
  if (result) {
    addBreadcrumbEvent(replay, result);
  }
}

/** Exported only for tests. */
function normalizeBreadcrumb(breadcrumb) {
  if (
    !isBreadcrumbWithCategory(breadcrumb) ||
    [
      // fetch & xhr are handled separately,in handleNetworkBreadcrumbs
      'fetch',
      'xhr',
      // These two are breadcrumbs for emitted sentry events, we don't care about them
      'sentry.event',
      'sentry.transaction',
    ].includes(breadcrumb.category) ||
    // We capture UI breadcrumbs separately
    breadcrumb.category.startsWith('ui.')
  ) {
    return null;
  }

  if (breadcrumb.category === 'console') {
    return normalizeConsoleBreadcrumb(breadcrumb);
  }

  return createBreadcrumb(breadcrumb);
}

/** exported for tests only */
function normalizeConsoleBreadcrumb(
  breadcrumb,
) {
  const args = breadcrumb.data && breadcrumb.data.arguments;

  if (!Array.isArray(args) || args.length === 0) {
    return createBreadcrumb(breadcrumb);
  }

  let isTruncated = false;

  // Avoid giant args captures
  const normalizedArgs = args.map(arg => {
    if (!arg) {
      return arg;
    }
    if (typeof arg === 'string') {
      if (arg.length > CONSOLE_ARG_MAX_SIZE) {
        isTruncated = true;
        return `${arg.slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
      }

      return arg;
    }
    if (typeof arg === 'object') {
      try {
        const normalizedArg = normalize(arg, 7);
        const stringified = JSON.stringify(normalizedArg);
        if (stringified.length > CONSOLE_ARG_MAX_SIZE) {
          isTruncated = true;
          // We use the pretty printed JSON string here as a base
          return `${JSON.stringify(normalizedArg, null, 2).slice(0, CONSOLE_ARG_MAX_SIZE)}…`;
        }
        return normalizedArg;
      } catch (e) {
        // fall back to default
      }
    }

    return arg;
  });

  return createBreadcrumb({
    ...breadcrumb,
    data: {
      ...breadcrumb.data,
      arguments: normalizedArgs,
      ...(isTruncated ? { _meta: { warnings: ['CONSOLE_ARG_TRUNCATED'] } } : {}),
    },
  });
}

function isBreadcrumbWithCategory(breadcrumb) {
  return !!breadcrumb.category;
}

/**
 * Returns true if we think the given event is an error originating inside of rrweb.
 */
function isRrwebError(event, hint) {
  if (event.type || !event.exception || !event.exception.values || !event.exception.values.length) {
    return false;
  }

  // @ts-expect-error this may be set by rrweb when it finds errors
  if (hint.originalException && hint.originalException.__rrweb__) {
    return true;
  }

  return false;
}

/**
 * Reset the `replay_id` field on the DSC.
 */
function resetReplayIdOnDynamicSamplingContext() {
  // Reset DSC on the current scope, if there is one
  const dsc = getCurrentScope().getPropagationContext().dsc;
  if (dsc) {
    delete dsc.replay_id;
  }

  // Clear it from frozen DSC on the active span
  const activeSpan = getActiveSpan();
  if (activeSpan) {
    const dsc = getDynamicSamplingContextFromSpan(activeSpan);
    delete (dsc ).replay_id;
  }
}

/**
 * Add a feedback breadcrumb event to replay.
 */
function addFeedbackBreadcrumb(replay, event) {
  replay.triggerUserActivity();
  replay.addUpdate(() => {
    if (!event.timestamp) {
      // Ignore events that don't have timestamps (this shouldn't happen, more of a typing issue)
      // Return true here so that we don't flush
      return true;
    }

    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    replay.throttledAddEvent({
      type: EventType.Custom,
      timestamp: event.timestamp * 1000,
      data: {
        tag: 'breadcrumb',
        payload: {
          timestamp: event.timestamp,
          type: 'default',
          category: 'sentry.feedback',
          data: {
            feedbackId: event.event_id,
          },
        },
      },
    } );

    return false;
  });
}

/**
 * Determine if event should be sampled (only applies in buffer mode).
 * When an event is captured by `handleGlobalEvent`, when in buffer mode
 * we determine if we want to sample the error or not.
 */
function shouldSampleForBufferEvent(replay, event) {
  if (replay.recordingMode !== 'buffer') {
    return false;
  }

  // ignore this error because otherwise we could loop indefinitely with
  // trying to capture replay and failing
  if (event.message === UNABLE_TO_SEND_REPLAY) {
    return false;
  }

  // Require the event to be an error event & to have an exception
  if (!event.exception || event.type) {
    return false;
  }

  return isSampled(replay.getOptions().errorSampleRate);
}

/**
 * Returns a listener to be added to `addEventProcessor(listener)`.
 */
function handleGlobalEventListener(replay) {
  return Object.assign(
    (event, hint) => {
      // Do nothing if replay has been disabled or paused
      if (!replay.isEnabled() || replay.isPaused()) {
        return event;
      }

      if (isReplayEvent(event)) {
        // Replays have separate set of breadcrumbs, do not include breadcrumbs
        // from core SDK
        delete event.breadcrumbs;
        return event;
      }

      // We only want to handle errors, transactions, and feedbacks, nothing else
      if (!isErrorEvent(event) && !isTransactionEvent(event) && !isFeedbackEvent(event)) {
        return event;
      }

      // Ensure we do not add replay_id if the session is expired
      const isSessionActive = replay.checkAndHandleExpiredSession();
      if (!isSessionActive) {
        // prevent exceeding replay durations by removing the expired replayId from the DSC
        resetReplayIdOnDynamicSamplingContext();
        return event;
      }

      if (isFeedbackEvent(event)) {
        // This should never reject
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        replay.flush();
        event.contexts.feedback.replay_id = replay.getSessionId();
        // Add a replay breadcrumb for this piece of feedback
        addFeedbackBreadcrumb(replay, event);
        return event;
      }

      // Unless `captureExceptions` is enabled, we want to ignore errors coming from rrweb
      // As there can be a bunch of stuff going wrong in internals there, that we don't want to bubble up to users
      if (isRrwebError(event, hint) && !replay.getOptions()._experiments.captureExceptions) {
        logger.log('Ignoring error from rrweb internals', event);
        return null;
      }

      // When in buffer mode, we decide to sample here.
      // Later, in `handleAfterSendEvent`, if the replayId is set, we know that we sampled
      // And convert the buffer session to a full session
      const isErrorEventSampled = shouldSampleForBufferEvent(replay, event);

      // Tag errors if it has been sampled in buffer mode, or if it is session mode
      // Only tag transactions if in session mode
      const shouldTagReplayId = isErrorEventSampled || replay.recordingMode === 'session';

      if (shouldTagReplayId) {
        event.tags = { ...event.tags, replayId: replay.getSessionId() };
      }

      return event;
    },
    { id: 'Replay' },
  );
}

/**
 * Create a "span" for each performance entry.
 */
function createPerformanceSpans(
  replay,
  entries,
) {
  return entries.map(({ type, start, end, name, data }) => {
    const response = replay.throttledAddEvent({
      type: EventType.Custom,
      timestamp: start,
      data: {
        tag: 'performanceSpan',
        payload: {
          op: type,
          description: name,
          startTimestamp: start,
          endTimestamp: end,
          data,
        },
      },
    });

    // If response is a string, it means its either THROTTLED or SKIPPED
    return typeof response === 'string' ? Promise.resolve(null) : response;
  });
}

function handleHistory(handlerData) {
  const { from, to } = handlerData;

  const now = Date.now() / 1000;

  return {
    type: 'navigation.push',
    start: now,
    end: now,
    name: to,
    data: {
      previous: from,
    },
  };
}

/**
 * Returns a listener to be added to `addHistoryInstrumentationHandler(listener)`.
 */
function handleHistorySpanListener(replay) {
  return (handlerData) => {
    if (!replay.isEnabled()) {
      return;
    }

    const result = handleHistory(handlerData);

    if (result === null) {
      return;
    }

    // Need to collect visited URLs
    replay.getContext().urls.push(result.name);
    replay.triggerUserActivity();

    replay.addUpdate(() => {
      createPerformanceSpans(replay, [result]);
      // Returning false to flush
      return false;
    });
  };
}

/**
 * Check whether a given request URL should be filtered out. This is so we
 * don't log Sentry ingest requests.
 */
function shouldFilterRequest(replay, url) {
  // If we enabled the `traceInternals` experiment, we want to trace everything
  if (replay.getOptions()._experiments.traceInternals) {
    return false;
  }

  return isSentryRequestUrl(url, getClient());
}

/** Add a performance entry breadcrumb */
function addNetworkBreadcrumb(
  replay,
  result,
) {
  if (!replay.isEnabled()) {
    return;
  }

  if (result === null) {
    return;
  }

  if (shouldFilterRequest(replay, result.name)) {
    return;
  }

  replay.addUpdate(() => {
    createPerformanceSpans(replay, [result]);
    // Returning true will cause `addUpdate` to not flush
    // We do not want network requests to cause a flush. This will prevent
    // recurring/polling requests from keeping the replay session alive.
    return true;
  });
}

/** Get the size of a body. */
function getBodySize(body) {
  if (!body) {
    return undefined;
  }

  const textEncoder = new TextEncoder();

  try {
    if (typeof body === 'string') {
      return textEncoder.encode(body).length;
    }

    if (body instanceof URLSearchParams) {
      return textEncoder.encode(body.toString()).length;
    }

    if (body instanceof FormData) {
      const formDataStr = _serializeFormData(body);
      return textEncoder.encode(formDataStr).length;
    }

    if (body instanceof Blob) {
      return body.size;
    }

    if (body instanceof ArrayBuffer) {
      return body.byteLength;
    }

    // Currently unhandled types: ArrayBufferView, ReadableStream
  } catch (e) {
    // just return undefined
  }

  return undefined;
}

/** Convert a Content-Length header to number/undefined.  */
function parseContentLengthHeader(header) {
  if (!header) {
    return undefined;
  }

  const size = parseInt(header, 10);
  return isNaN(size) ? undefined : size;
}

/** Get the string representation of a body. */
function getBodyString(body) {
  try {
    if (typeof body === 'string') {
      return [body];
    }

    if (body instanceof URLSearchParams) {
      return [body.toString()];
    }

    if (body instanceof FormData) {
      return [_serializeFormData(body)];
    }

    if (!body) {
      return [undefined];
    }
  } catch (error) {
    logger.exception(error, 'Failed to serialize body', body);
    return [undefined, 'BODY_PARSE_ERROR'];
  }

  logger.info('Skipping network body because of body type', body);

  return [undefined, 'UNPARSEABLE_BODY_TYPE'];
}

/** Merge a warning into an existing network request/response. */
function mergeWarning(
  info,
  warning,
) {
  if (!info) {
    return {
      headers: {},
      size: undefined,
      _meta: {
        warnings: [warning],
      },
    };
  }

  const newMeta = { ...info._meta };
  const existingWarnings = newMeta.warnings || [];
  newMeta.warnings = [...existingWarnings, warning];

  info._meta = newMeta;
  return info;
}

/** Convert ReplayNetworkRequestData to a PerformanceEntry. */
function makeNetworkReplayBreadcrumb(
  type,
  data,
) {
  if (!data) {
    return null;
  }

  const { startTimestamp, endTimestamp, url, method, statusCode, request, response } = data;

  const result = {
    type,
    start: startTimestamp / 1000,
    end: endTimestamp / 1000,
    name: url,
    data: dropUndefinedKeys({
      method,
      statusCode,
      request,
      response,
    }),
  };

  return result;
}

/** Build the request or response part of a replay network breadcrumb that was skipped. */
function buildSkippedNetworkRequestOrResponse(bodySize) {
  return {
    headers: {},
    size: bodySize,
    _meta: {
      warnings: ['URL_SKIPPED'],
    },
  };
}

/** Build the request or response part of a replay network breadcrumb. */
function buildNetworkRequestOrResponse(
  headers,
  bodySize,
  body,
) {
  if (!bodySize && Object.keys(headers).length === 0) {
    return undefined;
  }

  if (!bodySize) {
    return {
      headers,
    };
  }

  if (!body) {
    return {
      headers,
      size: bodySize,
    };
  }

  const info = {
    headers,
    size: bodySize,
  };

  const { body: normalizedBody, warnings } = normalizeNetworkBody(body);
  info.body = normalizedBody;
  if (warnings && warnings.length > 0) {
    info._meta = {
      warnings,
    };
  }

  return info;
}

/** Filter a set of headers */
function getAllowedHeaders(headers, allowedHeaders) {
  return Object.entries(headers).reduce((filteredHeaders, [key, value]) => {
    const normalizedKey = key.toLowerCase();
    // Avoid putting empty strings into the headers
    if (allowedHeaders.includes(normalizedKey) && headers[key]) {
      filteredHeaders[normalizedKey] = value;
    }
    return filteredHeaders;
  }, {});
}

function _serializeFormData(formData) {
  // This is a bit simplified, but gives us a decent estimate
  // This converts e.g. { name: 'Anne Smith', age: 13 } to 'name=Anne+Smith&age=13'
  // @ts-expect-error passing FormData to URLSearchParams actually works
  return new URLSearchParams(formData).toString();
}

function normalizeNetworkBody(body)

 {
  if (!body || typeof body !== 'string') {
    return {
      body,
    };
  }

  const exceedsSizeLimit = body.length > NETWORK_BODY_MAX_SIZE;
  const isProbablyJson = _strIsProbablyJson(body);

  if (exceedsSizeLimit) {
    const truncatedBody = body.slice(0, NETWORK_BODY_MAX_SIZE);

    if (isProbablyJson) {
      return {
        body: truncatedBody,
        warnings: ['MAYBE_JSON_TRUNCATED'],
      };
    }

    return {
      body: `${truncatedBody}…`,
      warnings: ['TEXT_TRUNCATED'],
    };
  }

  if (isProbablyJson) {
    try {
      const jsonBody = JSON.parse(body);
      return {
        body: jsonBody,
      };
    } catch (e2) {
      // fall back to just send the body as string
    }
  }

  return {
    body,
  };
}

function _strIsProbablyJson(str) {
  const first = str[0];
  const last = str[str.length - 1];

  // Simple check: If this does not start & end with {} or [], it's not JSON
  return (first === '[' && last === ']') || (first === '{' && last === '}');
}

/** Match an URL against a list of strings/Regex. */
function urlMatches(url, urls) {
  const fullUrl = getFullUrl(url);

  return stringMatchesSomePattern(fullUrl, urls);
}

/** exported for tests */
function getFullUrl(url, baseURI = WINDOW$1.document.baseURI) {
  // Short circuit for common cases:
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith(WINDOW$1.location.origin)) {
    return url;
  }
  const fixedUrl = new URL(url, baseURI);

  // If these do not match, we are not dealing with a relative URL, so just return it
  if (fixedUrl.origin !== new URL(baseURI).origin) {
    return url;
  }

  const fullUrl = fixedUrl.href;

  // Remove trailing slashes, if they don't match the original URL
  if (!url.endsWith('/') && fullUrl.endsWith('/')) {
    return fullUrl.slice(0, -1);
  }

  return fullUrl;
}

/**
 * Capture a fetch breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
async function captureFetchBreadcrumbToReplay(
  breadcrumb,
  hint,
  options

,
) {
  try {
    const data = await _prepareFetchData(breadcrumb, hint, options);

    // Create a replay performance entry from this breadcrumb
    const result = makeNetworkReplayBreadcrumb('resource.fetch', data);
    addNetworkBreadcrumb(options.replay, result);
  } catch (error) {
    logger.exception(error, 'Failed to capture fetch breadcrumb');
  }
}

/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
function enrichFetchBreadcrumb(
  breadcrumb,
  hint,
) {
  const { input, response } = hint;

  const body = input ? _getFetchRequestArgBody(input) : undefined;
  const reqSize = getBodySize(body);

  const resSize = response ? parseContentLengthHeader(response.headers.get('content-length')) : undefined;

  if (reqSize !== undefined) {
    breadcrumb.data.request_body_size = reqSize;
  }
  if (resSize !== undefined) {
    breadcrumb.data.response_body_size = resSize;
  }
}

async function _prepareFetchData(
  breadcrumb,
  hint,
  options,
) {
  const now = Date.now();
  const { startTimestamp = now, endTimestamp = now } = hint;

  const {
    url,
    method,
    status_code: statusCode = 0,
    request_body_size: requestBodySize,
    response_body_size: responseBodySize,
  } = breadcrumb.data;

  const captureDetails =
    urlMatches(url, options.networkDetailAllowUrls) && !urlMatches(url, options.networkDetailDenyUrls);

  const request = captureDetails
    ? _getRequestInfo(options, hint.input, requestBodySize)
    : buildSkippedNetworkRequestOrResponse(requestBodySize);
  const response = await _getResponseInfo(captureDetails, options, hint.response, responseBodySize);

  return {
    startTimestamp,
    endTimestamp,
    url,
    method,
    statusCode,
    request,
    response,
  };
}

function _getRequestInfo(
  { networkCaptureBodies, networkRequestHeaders },
  input,
  requestBodySize,
) {
  const headers = input ? getRequestHeaders(input, networkRequestHeaders) : {};

  if (!networkCaptureBodies) {
    return buildNetworkRequestOrResponse(headers, requestBodySize, undefined);
  }

  // We only want to transmit string or string-like bodies
  const requestBody = _getFetchRequestArgBody(input);
  const [bodyStr, warning] = getBodyString(requestBody);
  const data = buildNetworkRequestOrResponse(headers, requestBodySize, bodyStr);

  if (warning) {
    return mergeWarning(data, warning);
  }

  return data;
}

/** Exported only for tests. */
async function _getResponseInfo(
  captureDetails,
  {
    networkCaptureBodies,
    networkResponseHeaders,
  },
  response,
  responseBodySize,
) {
  if (!captureDetails && responseBodySize !== undefined) {
    return buildSkippedNetworkRequestOrResponse(responseBodySize);
  }

  const headers = response ? getAllHeaders(response.headers, networkResponseHeaders) : {};

  if (!response || (!networkCaptureBodies && responseBodySize !== undefined)) {
    return buildNetworkRequestOrResponse(headers, responseBodySize, undefined);
  }

  const [bodyText, warning] = await _parseFetchResponseBody(response);
  const result = getResponseData(bodyText, {
    networkCaptureBodies,

    responseBodySize,
    captureDetails,
    headers,
  });

  if (warning) {
    return mergeWarning(result, warning);
  }

  return result;
}

function getResponseData(
  bodyText,
  {
    networkCaptureBodies,
    responseBodySize,
    captureDetails,
    headers,
  }

,
) {
  try {
    const size =
      bodyText && bodyText.length && responseBodySize === undefined ? getBodySize(bodyText) : responseBodySize;

    if (!captureDetails) {
      return buildSkippedNetworkRequestOrResponse(size);
    }

    if (networkCaptureBodies) {
      return buildNetworkRequestOrResponse(headers, size, bodyText);
    }

    return buildNetworkRequestOrResponse(headers, size, undefined);
  } catch (error) {
    logger.exception(error, 'Failed to serialize response body');
    // fallback
    return buildNetworkRequestOrResponse(headers, responseBodySize, undefined);
  }
}

async function _parseFetchResponseBody(response) {
  const res = _tryCloneResponse(response);

  if (!res) {
    return [undefined, 'BODY_PARSE_ERROR'];
  }

  try {
    const text = await _tryGetResponseText(res);
    return [text];
  } catch (error) {
    if (error instanceof Error && error.message.indexOf('Timeout') > -1) {
      logger.warn('Parsing text body from response timed out');
      return [undefined, 'BODY_PARSE_TIMEOUT'];
    }

    logger.exception(error, 'Failed to get text body from response');
    return [undefined, 'BODY_PARSE_ERROR'];
  }
}

function _getFetchRequestArgBody(fetchArgs = []) {
  // We only support getting the body from the fetch options
  if (fetchArgs.length !== 2 || typeof fetchArgs[1] !== 'object') {
    return undefined;
  }

  return (fetchArgs[1] ).body;
}

function getAllHeaders(headers, allowedHeaders) {
  const allHeaders = {};

  allowedHeaders.forEach(header => {
    if (headers.get(header)) {
      allHeaders[header] = headers.get(header) ;
    }
  });

  return allHeaders;
}

function getRequestHeaders(fetchArgs, allowedHeaders) {
  if (fetchArgs.length === 1 && typeof fetchArgs[0] !== 'string') {
    return getHeadersFromOptions(fetchArgs[0] , allowedHeaders);
  }

  if (fetchArgs.length === 2) {
    return getHeadersFromOptions(fetchArgs[1] , allowedHeaders);
  }

  return {};
}

function getHeadersFromOptions(
  input,
  allowedHeaders,
) {
  if (!input) {
    return {};
  }

  const headers = input.headers;

  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return getAllHeaders(headers, allowedHeaders);
  }

  // We do not support this, as it is not really documented (anymore?)
  if (Array.isArray(headers)) {
    return {};
  }

  return getAllowedHeaders(headers, allowedHeaders);
}

function _tryCloneResponse(response) {
  try {
    // We have to clone this, as the body can only be read once
    return response.clone();
  } catch (error) {
    // this can throw if the response was already consumed before
    logger.exception(error, 'Failed to clone response body');
  }
}

/**
 * Get the response body of a fetch request, or timeout after 500ms.
 * Fetch can return a streaming body, that may not resolve (or not for a long time).
 * If that happens, we rather abort after a short time than keep waiting for this.
 */
function _tryGetResponseText(response) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout$1(() => reject(new Error('Timeout while trying to read response body')), 500);

    _getResponseText(response)
      .then(
        txt => resolve(txt),
        reason => reject(reason),
      )
      .finally(() => clearTimeout(timeout));
  });
}

async function _getResponseText(response) {
  // Force this to be a promise, just to be safe
  // eslint-disable-next-line no-return-await
  return await response.text();
}

/**
 * Capture an XHR breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
async function captureXhrBreadcrumbToReplay(
  breadcrumb,
  hint,
  options,
) {
  try {
    const data = _prepareXhrData(breadcrumb, hint, options);

    // Create a replay performance entry from this breadcrumb
    const result = makeNetworkReplayBreadcrumb('resource.xhr', data);
    addNetworkBreadcrumb(options.replay, result);
  } catch (error) {
    logger.exception(error, 'Failed to capture xhr breadcrumb');
  }
}

/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
function enrichXhrBreadcrumb(
  breadcrumb,
  hint,
) {
  const { xhr, input } = hint;

  if (!xhr) {
    return;
  }

  const reqSize = getBodySize(input);
  const resSize = xhr.getResponseHeader('content-length')
    ? parseContentLengthHeader(xhr.getResponseHeader('content-length'))
    : _getBodySize(xhr.response, xhr.responseType);

  if (reqSize !== undefined) {
    breadcrumb.data.request_body_size = reqSize;
  }
  if (resSize !== undefined) {
    breadcrumb.data.response_body_size = resSize;
  }
}

function _prepareXhrData(
  breadcrumb,
  hint,
  options,
) {
  const now = Date.now();
  const { startTimestamp = now, endTimestamp = now, input, xhr } = hint;

  const {
    url,
    method,
    status_code: statusCode = 0,
    request_body_size: requestBodySize,
    response_body_size: responseBodySize,
  } = breadcrumb.data;

  if (!url) {
    return null;
  }

  if (!xhr || !urlMatches(url, options.networkDetailAllowUrls) || urlMatches(url, options.networkDetailDenyUrls)) {
    const request = buildSkippedNetworkRequestOrResponse(requestBodySize);
    const response = buildSkippedNetworkRequestOrResponse(responseBodySize);
    return {
      startTimestamp,
      endTimestamp,
      url,
      method,
      statusCode,
      request,
      response,
    };
  }

  const xhrInfo = xhr[SENTRY_XHR_DATA_KEY];
  const networkRequestHeaders = xhrInfo
    ? getAllowedHeaders(xhrInfo.request_headers, options.networkRequestHeaders)
    : {};
  const networkResponseHeaders = getAllowedHeaders(getResponseHeaders(xhr), options.networkResponseHeaders);

  const [requestBody, requestWarning] = options.networkCaptureBodies ? getBodyString(input) : [undefined];
  const [responseBody, responseWarning] = options.networkCaptureBodies ? _getXhrResponseBody(xhr) : [undefined];

  const request = buildNetworkRequestOrResponse(networkRequestHeaders, requestBodySize, requestBody);
  const response = buildNetworkRequestOrResponse(networkResponseHeaders, responseBodySize, responseBody);

  return {
    startTimestamp,
    endTimestamp,
    url,
    method,
    statusCode,
    request: requestWarning ? mergeWarning(request, requestWarning) : request,
    response: responseWarning ? mergeWarning(response, responseWarning) : response,
  };
}

function getResponseHeaders(xhr) {
  const headers = xhr.getAllResponseHeaders();

  if (!headers) {
    return {};
  }

  return headers.split('\r\n').reduce((acc, line) => {
    const [key, value] = line.split(': ') ;
    if (value) {
      acc[key.toLowerCase()] = value;
    }
    return acc;
  }, {});
}

function _getXhrResponseBody(xhr) {
  // We collect errors that happen, but only log them if we can't get any response body
  const errors = [];

  try {
    return [xhr.responseText];
  } catch (e) {
    errors.push(e);
  }

  // Try to manually parse the response body, if responseText fails
  try {
    return _parseXhrResponse(xhr.response, xhr.responseType);
  } catch (e) {
    errors.push(e);
  }

  logger.warn('Failed to get xhr response body', ...errors);

  return [undefined];
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
function _parseXhrResponse(
  body,
  responseType,
) {
  try {
    if (typeof body === 'string') {
      return [body];
    }

    if (body instanceof Document) {
      return [body.body.outerHTML];
    }

    if (responseType === 'json' && body && typeof body === 'object') {
      return [JSON.stringify(body)];
    }

    if (!body) {
      return [undefined];
    }
  } catch (error) {
    logger.exception(error, 'Failed to serialize body', body);
    return [undefined, 'BODY_PARSE_ERROR'];
  }

  logger.info('Skipping network body because of body type', body);

  return [undefined, 'UNPARSEABLE_BODY_TYPE'];
}

function _getBodySize(
  body,
  responseType,
) {
  try {
    const bodyStr = responseType === 'json' && body && typeof body === 'object' ? JSON.stringify(body) : body;
    return getBodySize(bodyStr);
  } catch (e2) {
    return undefined;
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
    const {
      networkDetailAllowUrls,
      networkDetailDenyUrls,
      networkCaptureBodies,
      networkRequestHeaders,
      networkResponseHeaders,
    } = replay.getOptions();

    const options = {
      replay,
      networkDetailAllowUrls,
      networkDetailDenyUrls,
      networkCaptureBodies,
      networkRequestHeaders,
      networkResponseHeaders,
    };

    if (client) {
      client.on('beforeAddBreadcrumb', (breadcrumb, hint) => beforeAddNetworkBreadcrumb(options, breadcrumb, hint));
    }
  } catch (e2) {
    // Do nothing
  }
}

/** just exported for tests */
function beforeAddNetworkBreadcrumb(
  options,
  breadcrumb,
  hint,
) {
  if (!breadcrumb.data) {
    return;
  }

  try {
    if (_isXhrBreadcrumb(breadcrumb) && _isXhrHint(hint)) {
      // This has to be sync, as we need to ensure the breadcrumb is enriched in the same tick
      // Because the hook runs synchronously, and the breadcrumb is afterwards passed on
      // So any async mutations to it will not be reflected in the final breadcrumb
      enrichXhrBreadcrumb(breadcrumb, hint);

      // This call should not reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      captureXhrBreadcrumbToReplay(breadcrumb, hint, options);
    }

    if (_isFetchBreadcrumb(breadcrumb) && _isFetchHint(hint)) {
      // This has to be sync, as we need to ensure the breadcrumb is enriched in the same tick
      // Because the hook runs synchronously, and the breadcrumb is afterwards passed on
      // So any async mutations to it will not be reflected in the final breadcrumb
      enrichFetchBreadcrumb(breadcrumb, hint);

      // This call should not reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      captureFetchBreadcrumbToReplay(breadcrumb, hint, options);
    }
  } catch (e) {
    logger.exception(e, 'Error when enriching network breadcrumb');
  }
}

function _isXhrBreadcrumb(breadcrumb) {
  return breadcrumb.category === 'xhr';
}

function _isFetchBreadcrumb(breadcrumb) {
  return breadcrumb.category === 'fetch';
}

function _isXhrHint(hint) {
  return hint && hint.xhr;
}

function _isFetchHint(hint) {
  return hint && hint.response;
}

/**
 * Add global listeners that cannot be removed.
 */
function addGlobalListeners(replay) {
  // Listeners from core SDK //
  const client = getClient();

  addClickKeypressInstrumentationHandler(handleDomListener(replay));
  addHistoryInstrumentationHandler(handleHistorySpanListener(replay));
  handleBreadcrumbs(replay);
  handleNetworkBreadcrumbs(replay);

  // Tag all (non replay) events that get sent to Sentry with the current
  // replay ID so that we can reference them later in the UI
  const eventProcessor = handleGlobalEventListener(replay);
  addEventProcessor(eventProcessor);

  // If a custom client has no hooks yet, we continue to use the "old" implementation
  if (client) {
    client.on('beforeSendEvent', handleBeforeSendEvent(replay));
    client.on('afterSendEvent', handleAfterSendEvent(replay));
    client.on('createDsc', (dsc) => {
      const replayId = replay.getSessionId();
      // We do not want to set the DSC when in buffer mode, as that means the replay has not been sent (yet)
      if (replayId && replay.isEnabled() && replay.recordingMode === 'session') {
        // Ensure to check that the session is still active - it could have expired in the meanwhile
        const isSessionActive = replay.checkAndHandleExpiredSession();
        if (isSessionActive) {
          dsc.replay_id = replayId;
        }
      }
    });

    client.on('spanStart', span => {
      replay.lastActiveSpan = span;
    });

    // We may be missing the initial spanStart due to timing issues,
    // so we capture it on finish again.
    client.on('spanEnd', span => {
      replay.lastActiveSpan = span;
    });

    // We want to flush replay
    client.on('beforeSendFeedback', (feedbackEvent, options) => {
      const replayId = replay.getSessionId();
      if (options && options.includeReplay && replay.isEnabled() && replayId) {
        // This should never reject
        if (feedbackEvent.contexts && feedbackEvent.contexts.feedback) {
          feedbackEvent.contexts.feedback.replay_id = replayId;
        }
      }
    });
  }
}

/**
 * Create a "span" for the total amount of memory being used by JS objects
 * (including v8 internal objects).
 */
async function addMemoryEntry(replay) {
  // window.performance.memory is a non-standard API and doesn't work on all browsers, so we try-catch this
  try {
    return Promise.all(
      createPerformanceSpans(replay, [
        // @ts-expect-error memory doesn't exist on type Performance as the API is non-standard (we check that it exists above)
        createMemoryEntry(WINDOW$1.performance.memory),
      ]),
    );
  } catch (error) {
    // Do nothing
    return [];
  }
}

function createMemoryEntry(memoryEntry) {
  const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = memoryEntry;
  // we don't want to use `getAbsoluteTime` because it adds the event time to the
  // time origin, so we get the current timestamp instead
  const time = Date.now() / 1000;
  return {
    type: 'memory',
    name: 'memory',
    start: time,
    end: time,
    data: {
      memory: {
        jsHeapSizeLimit,
        totalJSHeapSize,
        usedJSHeapSize,
      },
    },
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
  let callbackReturnValue;

  let timerId;
  let maxTimerId;

  const maxWait = options && options.maxWait ? Math.max(options.maxWait, wait) : 0;

  function invokeFunc() {
    cancelTimers();
    callbackReturnValue = func();
    return callbackReturnValue;
  }

  function cancelTimers() {
    timerId !== undefined && clearTimeout(timerId);
    maxTimerId !== undefined && clearTimeout(maxTimerId);
    timerId = maxTimerId = undefined;
  }

  function flush() {
    if (timerId !== undefined || maxTimerId !== undefined) {
      return invokeFunc();
    }
    return callbackReturnValue;
  }

  function debounced() {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeout$1(invokeFunc, wait);

    if (maxWait && maxTimerId === undefined) {
      maxTimerId = setTimeout$1(invokeFunc, maxWait);
    }

    return callbackReturnValue;
  }

  debounced.cancel = cancelTimers;
  debounced.flush = flush;
  return debounced;
}

/**
 * Handler for recording events.
 *
 * Adds to event buffer, and has varying flushing behaviors if the event was a checkout.
 */
function getHandleRecordingEmit(replay) {
  let hadFirstEvent = false;

  return (event, _isCheckout) => {
    // If this is false, it means session is expired, create and a new session and wait for checkout
    if (!replay.checkAndHandleExpiredSession()) {
      logger.warn('Received replay event after session expired.');

      return;
    }

    // `_isCheckout` is only set when the checkout is due to `checkoutEveryNms`
    // We also want to treat the first event as a checkout, so we handle this specifically here
    const isCheckout = _isCheckout || !hadFirstEvent;
    hadFirstEvent = true;

    if (replay.clickDetector) {
      updateClickDetectorForRecordingEvent(replay.clickDetector, event);
    }

    // The handler returns `true` if we do not want to trigger debounced flush, `false` if we want to debounce flush.
    replay.addUpdate(() => {
      // The session is always started immediately on pageload/init, but for
      // error-only replays, it should reflect the most recent checkout
      // when an error occurs. Clear any state that happens before this current
      // checkout. This needs to happen before `addEvent()` which updates state
      // dependent on this reset.
      if (replay.recordingMode === 'buffer' && isCheckout) {
        replay.setInitialState();
      }

      // If the event is not added (e.g. due to being paused, disabled, or out of the max replay duration),
      // Skip all further steps
      if (!addEventSync(replay, event, isCheckout)) {
        // Return true to skip scheduling a debounced flush
        return true;
      }

      // Different behavior for full snapshots (type=2), ignore other event types
      // See https://github.com/rrweb-io/rrweb/blob/d8f9290ca496712aa1e7d472549480c4e7876594/packages/rrweb/src/types.ts#L16
      if (!isCheckout) {
        return false;
      }

      const session = replay.session;

      // Additionally, create a meta event that will capture certain SDK settings.
      // In order to handle buffer mode, this needs to either be done when we
      // receive checkout events or at flush time. We have an experimental mode
      // to perform multiple checkouts a session (the idea is to improve
      // seeking during playback), so also only include if segmentId is 0
      // (handled in `addSettingsEvent`).
      //
      // `isCheckout` is always true, but want to be explicit that it should
      // only be added for checkouts
      addSettingsEvent(replay, isCheckout);

      // When in buffer mode, make sure we adjust the session started date to the current earliest event of the buffer
      // this should usually be the timestamp of the checkout event, but to be safe...
      if (replay.recordingMode === 'buffer' && session && replay.eventBuffer) {
        const earliestEvent = replay.eventBuffer.getEarliestTimestamp();
        if (earliestEvent) {
          logger.info(`Updating session start time to earliest event in buffer to ${new Date(earliestEvent)}`);

          session.started = earliestEvent;

          if (replay.getOptions().stickySession) {
            saveSession(session);
          }
        }
      }

      // If there is a previousSessionId after a full snapshot occurs, then
      // the replay session was started due to session expiration. The new session
      // is started before triggering a new checkout and contains the id
      // of the previous session. Do not immediately flush in this case
      // to avoid capturing only the checkout and instead the replay will
      // be captured if they perform any follow-up actions.
      if (session && session.previousSessionId) {
        return true;
      }

      if (replay.recordingMode === 'session') {
        // If the full snapshot is due to an initial load, we will not have
        // a previous session ID. In this case, we want to buffer events
        // for a set amount of time before flushing. This can help avoid
        // capturing replays of users that immediately close the window.

        // This should never reject
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        void replay.flush();
      }

      return true;
    });
  };
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
      tag: 'options',
      payload: {
        shouldRecordCanvas: replay.isRecordingCanvas(),
        sessionSampleRate: options.sessionSampleRate,
        errorSampleRate: options.errorSampleRate,
        useCompressionOption: options.useCompression,
        blockAllMedia: options.blockAllMedia,
        maskAllText: options.maskAllText,
        maskAllInputs: options.maskAllInputs,
        useCompression: replay.eventBuffer ? replay.eventBuffer.type === 'worker' : false,
        networkDetailHasUrls: options.networkDetailAllowUrls.length > 0,
        networkCaptureBodies: options.networkCaptureBodies,
        networkRequestHasHeaders: options.networkRequestHeaders.length > 0,
        networkResponseHasHeaders: options.networkResponseHeaders.length > 0,
      },
    },
  };
}

/**
 * Add a "meta" event that contains a simplified view on current configuration
 * options. This should only be included on the first segment of a recording.
 */
function addSettingsEvent(replay, isCheckout) {
  // Only need to add this event when sending the first segment
  if (!isCheckout || !replay.session || replay.session.segmentId !== 0) {
    return;
  }

  addEventSync(replay, createOptionsEvent(replay), false);
}

/**
 * Create a replay envelope ready to be sent.
 * This includes both the replay event, as well as the recording data.
 */
function createReplayEnvelope(
  replayEvent,
  recordingData,
  dsn,
  tunnel,
) {
  return createEnvelope(
    createEventEnvelopeHeaders(replayEvent, getSdkMetadataForEnvelopeHeader(replayEvent), tunnel, dsn),
    [
      [{ type: 'replay_event' }, replayEvent],
      [
        {
          type: 'replay_recording',
          // If string then we need to encode to UTF8, otherwise will have
          // wrong size. TextEncoder has similar browser support to
          // MutationObserver, although it does not accept IE11.
          length:
            typeof recordingData === 'string' ? new TextEncoder().encode(recordingData).length : recordingData.length,
        },
        recordingData,
      ],
    ],
  );
}

/**
 * Prepare the recording data ready to be sent.
 */
function prepareRecordingData({
  recordingData,
  headers,
}

) {
  let payloadWithSequence;

  // XXX: newline is needed to separate sequence id from events
  const replayHeaders = `${JSON.stringify(headers)}
`;

  if (typeof recordingData === 'string') {
    payloadWithSequence = `${replayHeaders}${recordingData}`;
  } else {
    const enc = new TextEncoder();
    // XXX: newline is needed to separate sequence id from events
    const sequence = enc.encode(replayHeaders);
    // Merge the two Uint8Arrays
    payloadWithSequence = new Uint8Array(sequence.length + recordingData.length);
    payloadWithSequence.set(sequence);
    payloadWithSequence.set(recordingData, sequence.length);
  }

  return payloadWithSequence;
}

/**
 * Prepare a replay event & enrich it with the SDK metadata.
 */
async function prepareReplayEvent({
  client,
  scope,
  replayId: event_id,
  event,
}

) {
  const integrations =
    typeof client._integrations === 'object' && client._integrations !== null && !Array.isArray(client._integrations)
      ? Object.keys(client._integrations)
      : undefined;

  const eventHint = { event_id, integrations };

  client.emit('preprocessEvent', event, eventHint);

  const preparedEvent = (await prepareEvent(
    client.getOptions(),
    event,
    eventHint,
    scope,
    client,
    getIsolationScope(),
  )) ;

  // If e.g. a global event processor returned null
  if (!preparedEvent) {
    return null;
  }

  // This normally happens in browser client "_prepareEvent"
  // but since we do not use this private method from the client, but rather the plain import
  // we need to do this manually.
  preparedEvent.platform = preparedEvent.platform || 'javascript';

  // extract the SDK name because `client._prepareEvent` doesn't add it to the event
  const metadata = client.getSdkMetadata();
  const { name, version } = (metadata && metadata.sdk) || {};

  preparedEvent.sdk = {
    ...preparedEvent.sdk,
    name: name || 'sentry.javascript.unknown',
    version: version || '0.0.0',
  };

  return preparedEvent;
}

/**
 * Send replay attachment using `fetch()`
 */
async function sendReplayRequest({
  recordingData,
  replayId,
  segmentId: segment_id,
  eventContext,
  timestamp,
  session,
}) {
  const preparedRecordingData = prepareRecordingData({
    recordingData,
    headers: {
      segment_id,
    },
  });

  const { urls, errorIds, traceIds, initialTimestamp } = eventContext;

  const client = getClient();
  const scope = getCurrentScope();
  const transport = client && client.getTransport();
  const dsn = client && client.getDsn();

  if (!client || !transport || !dsn || !session.sampled) {
    return resolvedSyncPromise({});
  }

  const baseEvent = {
    type: REPLAY_EVENT_NAME,
    replay_start_timestamp: initialTimestamp / 1000,
    timestamp: timestamp / 1000,
    error_ids: errorIds,
    trace_ids: traceIds,
    urls,
    replay_id: replayId,
    segment_id,
    replay_type: session.sampled,
  };

  const replayEvent = await prepareReplayEvent({ scope, client, replayId, event: baseEvent });

  if (!replayEvent) {
    // Taken from baseclient's `_processEvent` method, where this is handled for errors/transactions
    client.recordDroppedEvent('event_processor', 'replay', baseEvent);
    logger.info('An event processor returned `null`, will not send event.');
    return resolvedSyncPromise({});
  }

  /*
  For reference, the fully built event looks something like this:
  {
      "type": "replay_event",
      "timestamp": 1670837008.634,
      "error_ids": [
          "errorId"
      ],
      "trace_ids": [
          "traceId"
      ],
      "urls": [
          "https://example.com"
      ],
      "replay_id": "eventId",
      "segment_id": 3,
      "replay_type": "error",
      "platform": "javascript",
      "event_id": "eventId",
      "environment": "production",
      "sdk": {
          "integrations": [
              "BrowserTracing",
              "Replay"
          ],
          "name": "sentry.javascript.browser",
          "version": "7.25.0"
      },
      "sdkProcessingMetadata": {},
      "contexts": {
      },
  }
  */

  // Prevent this data (which, if it exists, was used in earlier steps in the processing pipeline) from being sent to
  // sentry. (Note: Our use of this property comes and goes with whatever we might be debugging, whatever hacks we may
  // have temporarily added, etc. Even if we don't happen to be using it at some point in the future, let's not get rid
  // of this `delete`, lest we miss putting it back in the next time the property is in use.)
  delete replayEvent.sdkProcessingMetadata;

  const envelope = createReplayEnvelope(replayEvent, preparedRecordingData, dsn, client.getOptions().tunnel);

  let response;

  try {
    response = await transport.send(envelope);
  } catch (err) {
    const error = new Error(UNABLE_TO_SEND_REPLAY);

    try {
      // In case browsers don't allow this property to be writable
      // @ts-expect-error This needs lib es2022 and newer
      error.cause = err;
    } catch (e) {
      // nothing to do
    }
    throw error;
  }

  // If the status code is invalid, we want to immediately stop & not retry
  if (typeof response.statusCode === 'number' && (response.statusCode < 200 || response.statusCode >= 300)) {
    throw new TransportStatusCodeError(response.statusCode);
  }

  const rateLimits = updateRateLimits({}, response);
  if (isRateLimited(rateLimits, 'replay')) {
    throw new RateLimitError(rateLimits);
  }

  return response;
}

/**
 * This error indicates that the transport returned an invalid status code.
 */
class TransportStatusCodeError extends Error {
   constructor(statusCode) {
    super(`Transport returned status code ${statusCode}`);
  }
}

/**
 * This error indicates that we hit a rate limit API error.
 */
class RateLimitError extends Error {

   constructor(rateLimits) {
    super('Rate limit hit');
    this.rateLimits = rateLimits;
  }
}

/**
 * Finalize and send the current replay event to Sentry
 */
async function sendReplay(
  replayData,
  retryConfig = {
    count: 0,
    interval: RETRY_BASE_INTERVAL,
  },
) {
  const { recordingData, onError } = replayData;

  // short circuit if there's no events to upload (this shouldn't happen as _runFlush makes this check)
  if (!recordingData.length) {
    return;
  }

  try {
    await sendReplayRequest(replayData);
    return true;
  } catch (err) {
    if (err instanceof TransportStatusCodeError || err instanceof RateLimitError) {
      throw err;
    }

    // Capture error for every failed replay
    setContext('Replays', {
      _retryCount: retryConfig.count,
    });

    if (onError) {
      onError(err);
    }

    // If an error happened here, it's likely that uploading the attachment
    // failed, we'll can retry with the same events payload
    if (retryConfig.count >= RETRY_MAX_COUNT) {
      const error = new Error(`${UNABLE_TO_SEND_REPLAY} - max retries exceeded`);

      try {
        // In case browsers don't allow this property to be writable
        // @ts-expect-error This needs lib es2022 and newer
        error.cause = err;
      } catch (e) {
        // nothing to do
      }

      throw error;
    }

    // will retry in intervals of 5, 10, 30
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

const THROTTLED = '__THROTTLED';
const SKIPPED = '__SKIPPED';

/**
 * Create a throttled function off a given function.
 * When calling the throttled function, it will call the original function only
 * if it hasn't been called more than `maxCount` times in the last `durationSeconds`.
 *
 * Returns `THROTTLED` if throttled for the first time, after that `SKIPPED`,
 * or else the return value of the original function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throttle(
  fn,
  maxCount,
  durationSeconds,
) {
  const counter = new Map();

  const _cleanup = (now) => {
    const threshold = now - durationSeconds;
    counter.forEach((_value, key) => {
      if (key < threshold) {
        counter.delete(key);
      }
    });
  };

  const _getTotalCount = () => {
    return [...counter.values()].reduce((a, b) => a + b, 0);
  };

  let isThrottled = false;

  return (...rest) => {
    // Date in second-precision, which we use as basis for the throttling
    const now = Math.floor(Date.now() / 1000);

    // First, make sure to delete any old entries
    _cleanup(now);

    // If already over limit, do nothing
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

/* eslint-disable max-lines */ // TODO: We might want to split this file up

/**
 * The main replay container class, which holds all the state and methods for recording and sending replays.
 */
class ReplayContainer  {

  /**
   * Recording can happen in one of two modes:
   *   - session: Record the whole session, sending it continuously
   *   - buffer: Always keep the last 60s of recording, requires:
   *     - having replaysOnErrorSampleRate > 0 to capture replay when an error occurs
   *     - or calling `flush()` to send the replay
   */

  /**
   * The current or last active span.
   * This is only available when performance is enabled.
   */

  /**
   * These are here so we can overwrite them in tests etc.
   * @hidden
   */

  /** The replay has to be manually started, because no sample rate (neither session or error) was provided. */

  /**
   * Options to pass to `rrweb.record()`
   */

  /**
   * Timestamp of the last user activity. This lives across sessions.
   */

  /**
   * Is the integration currently active?
   */

  /**
   * Paused is a state where:
   * - DOM Recording is not listening at all
   * - Nothing will be added to event buffer (e.g. core SDK events)
   */

  /**
   * Have we attached listeners to the core SDK?
   * Note we have to track this as there is no way to remove instrumentation handlers.
   */

  /**
   * Function to stop recording
   */

  /**
   * Internal use for canvas recording options
   */

   constructor({
    options,
    recordingOptions,
  }

) {ReplayContainer.prototype.__init.call(this);ReplayContainer.prototype.__init2.call(this);ReplayContainer.prototype.__init3.call(this);ReplayContainer.prototype.__init4.call(this);ReplayContainer.prototype.__init5.call(this);ReplayContainer.prototype.__init6.call(this);
    this.eventBuffer = null;
    this.performanceEntries = [];
    this.replayPerformanceEntries = [];
    this.recordingMode = 'session';
    this.timeouts = {
      sessionIdlePause: SESSION_IDLE_PAUSE_DURATION,
      sessionIdleExpire: SESSION_IDLE_EXPIRE_DURATION,
    } ;
    this._lastActivity = Date.now();
    this._isEnabled = false;
    this._isPaused = false;
    this._requiresManualStart = false;
    this._hasInitializedCoreListeners = false;
    this._context = {
      errorIds: new Set(),
      traceIds: new Set(),
      urls: [],
      initialTimestamp: Date.now(),
      initialUrl: '',
    };

    this._recordingOptions = recordingOptions;
    this._options = options;

    this._debouncedFlush = debounce(() => this._flush(), this._options.flushMinDelay, {
      maxWait: this._options.flushMaxDelay,
    });

    this._throttledAddEvent = throttle(
      (event, isCheckout) => addEvent(this, event, isCheckout),
      // Max 300 events...
      300,
      // ... per 5s
      5,
    );

    const { slowClickTimeout, slowClickIgnoreSelectors } = this.getOptions();

    const slowClickConfig = slowClickTimeout
      ? {
          threshold: Math.min(SLOW_CLICK_THRESHOLD, slowClickTimeout),
          timeout: slowClickTimeout,
          scrollTimeout: SLOW_CLICK_SCROLL_TIMEOUT,
          ignoreSelector: slowClickIgnoreSelectors ? slowClickIgnoreSelectors.join(',') : '',
        }
      : undefined;

    if (slowClickConfig) {
      this.clickDetector = new ClickDetector(this, slowClickConfig);
    }

    // Configure replay logger w/ experimental options
    {
      const experiments = options._experiments;
      logger.setConfig({
        captureExceptions: !!experiments.captureExceptions,
        traceInternals: !!experiments.traceInternals,
      });
    }
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

  /** A wrapper to conditionally capture exceptions. */
   handleException(error) {
    logger.exception(error);
    if (this._options.onError) {
      this._options.onError(error);
    }
  }

  /**
   * Initializes the plugin based on sampling configuration. Should not be
   * called outside of constructor.
   */
   initializeSampling(previousSessionId) {
    const { errorSampleRate, sessionSampleRate } = this._options;

    // If neither sample rate is > 0, then do nothing - user will need to call one of
    // `start()` or `startBuffering` themselves.
    const requiresManualStart = errorSampleRate <= 0 && sessionSampleRate <= 0;

    this._requiresManualStart = requiresManualStart;

    if (requiresManualStart) {
      return;
    }

    // Otherwise if there is _any_ sample rate set, try to load an existing
    // session, or create a new one.
    this._initializeSessionForSampling(previousSessionId);

    if (!this.session) {
      // This should not happen, something wrong has occurred
      logger.exception(new Error('Unable to initialize and create session'));
      return;
    }

    if (this.session.sampled === false) {
      // This should only occur if `errorSampleRate` is 0 and was unsampled for
      // session-based replay. In this case there is nothing to do.
      return;
    }

    // If segmentId > 0, it means we've previously already captured this session
    // In this case, we still want to continue in `session` recording mode
    this.recordingMode = this.session.sampled === 'buffer' && this.session.segmentId === 0 ? 'buffer' : 'session';

    logger.infoTick(`Starting replay in ${this.recordingMode} mode`);

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
    if (this._isEnabled && this.recordingMode === 'session') {
      logger.info('Recording is already in progress');
      return;
    }

    if (this._isEnabled && this.recordingMode === 'buffer') {
      logger.info('Buffering is in progress, call `flush()` to save the replay');
      return;
    }

    logger.infoTick('Starting replay in session mode');

    // Required as user activity is initially set in
    // constructor, so if `start()` is called after
    // session idle expiration, a replay will not be
    // created due to an idle timeout.
    this._updateUserActivity();

    const session = loadOrCreateSession(
      {
        maxReplayDuration: this._options.maxReplayDuration,
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
      },
      {
        stickySession: this._options.stickySession,
        // This is intentional: create a new session-based replay when calling `start()`
        sessionSampleRate: 1,
        allowBuffering: false,
      },
    );

    this.session = session;

    this._initializeRecording();
  }

  /**
   * Start replay buffering. Buffers until `flush()` is called or, if
   * `replaysOnErrorSampleRate` > 0, an error occurs.
   */
   startBuffering() {
    if (this._isEnabled) {
      logger.info('Buffering is in progress, call `flush()` to save the replay');
      return;
    }

    logger.infoTick('Starting replay in buffer mode');

    const session = loadOrCreateSession(
      {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
      },
      {
        stickySession: this._options.stickySession,
        sessionSampleRate: 0,
        allowBuffering: true,
      },
    );

    this.session = session;

    this.recordingMode = 'buffer';
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
        // When running in error sampling mode, we need to overwrite `checkoutEveryNms`
        // Without this, it would record forever, until an error happens, which we don't want
        // instead, we'll always keep the last 60 seconds of replay before an error happened
        ...(this.recordingMode === 'buffer'
          ? { checkoutEveryNms: BUFFER_CHECKOUT_TIME }
          : // Otherwise, use experimental option w/ min checkout time of 6 minutes
            // This is to improve playback seeking as there could potentially be
            // less mutations to process in the worse cases.
            //
            // checkout by "N" events is probably ideal, but means we have less
            // control about the number of checkouts we make (which generally
            // increases replay size)
            this._options._experiments.continuousCheckout && {
              // Minimum checkout time is 6 minutes
              checkoutEveryNms: Math.max(360000, this._options._experiments.continuousCheckout),
            }),
        emit: getHandleRecordingEmit(this),
        onMutation: this._onMutationHandler,
        ...(canvasOptions
          ? {
              recordCanvas: canvasOptions.recordCanvas,
              getCanvasManager: canvasOptions.getCanvasManager,
              sampling: canvasOptions.sampling,
              dataURLOptions: canvasOptions.dataURLOptions,
            }
          : {}),
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
        this._stopRecording = undefined;
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
    if (!this._isEnabled) {
      return;
    }

    // We can't move `_isEnabled` after awaiting a flush, otherwise we can
    // enter into an infinite loop when `stop()` is called while flushing.
    this._isEnabled = false;

    try {
      logger.info(`Stopping Replay${reason ? ` triggered by ${reason}` : ''}`);

      resetReplayIdOnDynamicSamplingContext();

      this._removeListeners();
      this.stopRecording();

      this._debouncedFlush.cancel();
      // See comment above re: `_isEnabled`, we "force" a flush, ignoring the
      // `_isEnabled` state of the plugin since it was disabled above.
      if (forceFlush) {
        await this._flush({ force: true });
      }

      // After flush, destroy event buffer
      this.eventBuffer && this.eventBuffer.destroy();
      this.eventBuffer = null;

      // Clear session from session storage, note this means if a new session
      // is started after, it will not have `previousSessionId`
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
    if (this._isPaused) {
      return;
    }

    this._isPaused = true;
    this.stopRecording();

    logger.info('Pausing replay');
  }

  /**
   * Resumes recording, see notes for `pause().
   *
   * Note that calling `startRecording()` here will cause a
   * new DOM checkout.`
   */
   resume() {
    if (!this._isPaused || !this._checkSession()) {
      return;
    }

    this._isPaused = false;
    this.startRecording();

    logger.info('Resuming replay');
  }

  /**
   * If not in "session" recording mode, flush event buffer which will create a new replay.
   * Unless `continueRecording` is false, the replay will continue to record and
   * behave as a "session"-based replay.
   *
   * Otherwise, queue up a flush.
   */
   async sendBufferedReplayOrFlush({ continueRecording = true } = {}) {
    if (this.recordingMode === 'session') {
      return this.flushImmediate();
    }

    const activityTime = Date.now();

    logger.info('Converting buffer to session');

    // Allow flush to complete before resuming as a session recording, otherwise
    // the checkout from `startRecording` may be included in the payload.
    // Prefer to keep the error replay as a separate (and smaller) segment
    // than the session replay.
    await this.flushImmediate();

    const hasStoppedRecording = this.stopRecording();

    if (!continueRecording || !hasStoppedRecording) {
      return;
    }

    // To avoid race conditions where this is called multiple times, we check here again that we are still buffering
    if ((this.recordingMode ) === 'session') {
      return;
    }

    // Re-start recording in session-mode
    this.recordingMode = 'session';

    // Once this session ends, we do not want to refresh it
    if (this.session) {
      this._updateUserActivity(activityTime);
      this._updateSessionActivity(activityTime);
      this._maybeSaveSession();
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
    // We need to always run `cb` (e.g. in the case of `this.recordingMode == 'buffer'`)
    const cbResult = cb();

    // If this option is turned on then we will only want to call `flush`
    // explicitly
    if (this.recordingMode === 'buffer') {
      return;
    }

    // If callback is true, we do not want to continue with flushing -- the
    // caller will need to handle it.
    if (cbResult === true) {
      return;
    }

    // addUpdate is called quite frequently - use _debouncedFlush so that it
    // respects the flush delays and does not flush immediately
    this._debouncedFlush();
  }

  /**
   * Updates the user activity timestamp and resumes recording. This should be
   * called in an event handler for a user action that we consider as the user
   * being "active" (e.g. a mouse click).
   */
   triggerUserActivity() {
    this._updateUserActivity();

    // This case means that recording was once stopped due to inactivity.
    // Ensure that recording is resumed.
    if (!this._stopRecording) {
      // Create a new session, otherwise when the user action is flushed, it
      // will get rejected due to an expired session.
      if (!this._checkSession()) {
        return;
      }

      // Note: This will cause a new DOM checkout
      this.resume();
      return;
    }

    // Otherwise... recording was never suspended, continue as normalish
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
    if (this.recordingMode === 'buffer') {
      return Promise.resolve();
    }

    return this.flushImmediate();
  }

  /**
   * Flush using debounce flush
   */
   flush() {
    return this._debouncedFlush() ;
  }

  /**
   * Always flush via `_debouncedFlush` so that we do not have flushes triggered
   * from calling both `flush` and `_debouncedFlush`. Otherwise, there could be
   * cases of multiple flushes happening closely together.
   */
   flushImmediate() {
    this._debouncedFlush();
    // `.flush` is provided by the debounced function, analogously to lodash.debounce
    return this._debouncedFlush.flush() ;
  }

  /**
   * Cancels queued up flushes.
   */
   cancelFlush() {
    this._debouncedFlush.cancel();
  }

  /** Get the current session (=replay) ID */
   getSessionId() {
    return this.session && this.session.id;
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
    // Prevent starting a new session if the last user activity is older than
    // SESSION_IDLE_PAUSE_DURATION. Otherwise non-user activity can trigger a new
    // session+recording. This creates noisy replays that do not have much
    // content in them.
    if (
      this._lastActivity &&
      isExpired(this._lastActivity, this.timeouts.sessionIdlePause) &&
      this.session &&
      this.session.sampled === 'session'
    ) {
      // Pause recording only for session-based replays. Otherwise, resuming
      // will create a new replay and will conflict with users who only choose
      // to record error-based replays only. (e.g. the resumed replay will not
      // contain a reference to an error)
      this.pause();
      return;
    }

    // --- There is recent user activity --- //
    // This will create a new session if expired, based on expiry length
    if (!this._checkSession()) {
      // Check session handles the refreshing itself
      return false;
    }

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

    // Reset _context as well
    this._clearContext();

    this._context.initialUrl = url;
    this._context.initialTimestamp = Date.now();
    this._context.urls.push(url);
  }

  /**
   * Add a breadcrumb event, that may be throttled.
   * If it was throttled, we add a custom breadcrumb to indicate that.
   */
   throttledAddEvent(
    event,
    isCheckout,
  ) {
    const res = this._throttledAddEvent(event, isCheckout);

    // If this is THROTTLED, it means we have throttled the event for the first time
    // In this case, we want to add a breadcrumb indicating that something was skipped
    if (res === THROTTLED) {
      const breadcrumb = createBreadcrumb({
        category: 'replay.throttled',
      });

      this.addUpdate(() => {
        // Return `false` if the event _was_ added, as that means we schedule a flush
        return !addEventSync(this, {
          type: ReplayEventTypeCustom,
          timestamp: breadcrumb.timestamp || 0,
          data: {
            tag: 'breadcrumb',
            payload: breadcrumb,
            metric: true,
          },
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

    const attributes = (lastRootSpan && spanToJSON(lastRootSpan).data) || {};
    const source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];
    if (!lastRootSpan || !source || !['route', 'custom'].includes(source)) {
      return undefined;
    }

    return spanToJSON(lastRootSpan).description;
  }

  /**
   * Initialize and start all listeners to varying events (DOM,
   * Performance Observer, Recording, Sentry SDK, etc)
   */
   _initializeRecording() {
    this.setInitialState();

    // this method is generally called on page load or manually - in both cases
    // we should treat it as an activity
    this._updateSessionActivity();

    this.eventBuffer = createEventBuffer({
      useCompression: this._options.useCompression,
      workerUrl: this._options.workerUrl,
    });

    this._removeListeners();
    this._addListeners();

    // Need to set as enabled before we start recording, as `record()` can trigger a flush with a new checkout
    this._isEnabled = true;
    this._isPaused = false;

    this.startRecording();
  }

  /**
   * Loads (or refreshes) the current session.
   */
   _initializeSessionForSampling(previousSessionId) {
    // Whenever there is _any_ error sample rate, we always allow buffering
    // Because we decide on sampling when an error occurs, we need to buffer at all times if sampling for errors
    const allowBuffering = this._options.errorSampleRate > 0;

    const session = loadOrCreateSession(
      {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
        previousSessionId,
      },
      {
        stickySession: this._options.stickySession,
        sessionSampleRate: this._options.sessionSampleRate,
        allowBuffering,
      },
    );

    this.session = session;
  }

  /**
   * Checks and potentially refreshes the current session.
   * Returns false if session is not recorded.
   */
   _checkSession() {
    // If there is no session yet, we do not want to refresh anything
    // This should generally not happen, but to be safe....
    if (!this.session) {
      return false;
    }

    const currentSession = this.session;

    if (
      shouldRefreshSession(currentSession, {
        sessionIdleExpire: this.timeouts.sessionIdleExpire,
        maxReplayDuration: this._options.maxReplayDuration,
      })
    ) {
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
    if (!this._isEnabled) {
      return;
    }
    await this.stop({ reason: 'refresh session' });
    this.initializeSampling(session.id);
  }

  /**
   * Adds listeners to record events for the replay
   */
   _addListeners() {
    try {
      WINDOW$1.document.addEventListener('visibilitychange', this._handleVisibilityChange);
      WINDOW$1.addEventListener('blur', this._handleWindowBlur);
      WINDOW$1.addEventListener('focus', this._handleWindowFocus);
      WINDOW$1.addEventListener('keydown', this._handleKeyboardEvent);

      if (this.clickDetector) {
        this.clickDetector.addListeners();
      }

      // There is no way to remove these listeners, so ensure they are only added once
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
      WINDOW$1.document.removeEventListener('visibilitychange', this._handleVisibilityChange);

      WINDOW$1.removeEventListener('blur', this._handleWindowBlur);
      WINDOW$1.removeEventListener('focus', this._handleWindowFocus);
      WINDOW$1.removeEventListener('keydown', this._handleKeyboardEvent);

      if (this.clickDetector) {
        this.clickDetector.removeListeners();
      }

      if (this._performanceCleanupCallback) {
        this._performanceCleanupCallback();
      }
    } catch (err) {
      this.handleException(err);
    }
  }

  /**
   * Handle when visibility of the page content changes. Opening a new tab will
   * cause the state to change to hidden because of content of current page will
   * be hidden. Likewise, moving a different window to cover the contents of the
   * page will also trigger a change to a hidden state.
   */
   __init() {this._handleVisibilityChange = () => {
    if (WINDOW$1.document.visibilityState === 'visible') {
      this._doChangeToForegroundTasks();
    } else {
      this._doChangeToBackgroundTasks();
    }
  };}

  /**
   * Handle when page is blurred
   */
   __init2() {this._handleWindowBlur = () => {
    const breadcrumb = createBreadcrumb({
      category: 'ui.blur',
    });

    // Do not count blur as a user action -- it's part of the process of them
    // leaving the page
    this._doChangeToBackgroundTasks(breadcrumb);
  };}

  /**
   * Handle when page is focused
   */
   __init3() {this._handleWindowFocus = () => {
    const breadcrumb = createBreadcrumb({
      category: 'ui.focus',
    });

    // Do not count focus as a user action -- instead wait until they focus and
    // interactive with page
    this._doChangeToForegroundTasks(breadcrumb);
  };}

  /** Ensure page remains active when a key is pressed. */
   __init4() {this._handleKeyboardEvent = (event) => {
    handleKeyboardEvent(this, event);
  };}

  /**
   * Tasks to run when we consider a page to be hidden (via blurring and/or visibility)
   */
   _doChangeToBackgroundTasks(breadcrumb) {
    if (!this.session) {
      return;
    }

    const expired = isSessionExpired(this.session, {
      maxReplayDuration: this._options.maxReplayDuration,
      sessionIdleExpire: this.timeouts.sessionIdleExpire,
    });

    if (expired) {
      return;
    }

    if (breadcrumb) {
      this._createCustomBreadcrumb(breadcrumb);
    }

    // Send replay when the page/tab becomes hidden. There is no reason to send
    // replay if it becomes visible, since no actions we care about were done
    // while it was hidden
    // This should never reject
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    void this.conditionalFlush();
  }

  /**
   * Tasks to run when we consider a page to be visible (via focus and/or visibility)
   */
   _doChangeToForegroundTasks(breadcrumb) {
    if (!this.session) {
      return;
    }

    const isSessionActive = this.checkAndHandleExpiredSession();

    if (!isSessionActive) {
      // If the user has come back to the page within SESSION_IDLE_PAUSE_DURATION
      // ms, we will re-use the existing session, otherwise create a new
      // session
      logger.info('Document has become active, but session has expired');
      return;
    }

    if (breadcrumb) {
      this._createCustomBreadcrumb(breadcrumb);
    }
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
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.throttledAddEvent({
        type: EventType.Custom,
        timestamp: breadcrumb.timestamp || 0,
        data: {
          tag: 'breadcrumb',
          payload: breadcrumb,
        },
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

    // If we are manually starting, we want to ensure we only include performance entries
    // that are after the initial timestamp
    // The reason for this is that we may have performance entries from the page load, but may decide to start
    // the replay later on, in which case we do not want to include these entries.
    // without this, manually started replays can have events long before the actual replay recording starts,
    // which messes with the timeline etc.
    if (this._requiresManualStart) {
      const initialTimestampInSeconds = this._context.initialTimestamp / 1000;
      performanceEntries = performanceEntries.filter(entry => entry.start >= initialTimestampInSeconds);
    }

    return Promise.all(createPerformanceSpans(this, performanceEntries));
  }

  /**
   * Clear _context
   */
   _clearContext() {
    // XXX: `initialTimestamp` and `initialUrl` do not get cleared
    this._context.errorIds.clear();
    this._context.traceIds.clear();
    this._context.urls = [];
  }

  /** Update the initial timestamp based on the buffer content. */
   _updateInitialTimestampFromEventBuffer() {
    const { session, eventBuffer } = this;
    // If replay was started manually (=no sample rate was given),
    // We do not want to back-port the initial timestamp
    if (!session || !eventBuffer || this._requiresManualStart) {
      return;
    }

    // we only ever update this on the initial segment
    if (session.segmentId) {
      return;
    }

    const earliestEvent = eventBuffer.getEarliestTimestamp();
    if (earliestEvent && earliestEvent < this._context.initialTimestamp) {
      this._context.initialTimestamp = earliestEvent;
    }
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
      urls: this._context.urls,
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
      logger.error('No session or eventBuffer found to flush.');
      return;
    }

    await this._addPerformanceEntries();

    // Check eventBuffer again, as it could have been stopped in the meanwhile
    if (!this.eventBuffer || !this.eventBuffer.hasEvents) {
      return;
    }

    // Only attach memory event if eventBuffer is not empty
    await addMemoryEntry(this);

    // Check eventBuffer again, as it could have been stopped in the meanwhile
    if (!this.eventBuffer) {
      return;
    }

    // if this changed in the meanwhile, e.g. because the session was refreshed or similar, we abort here
    if (replayId !== this.getSessionId()) {
      return;
    }

    try {
      // This uses the data from the eventBuffer, so we need to call this before `finish()
      this._updateInitialTimestampFromEventBuffer();

      const timestamp = Date.now();

      // Check total duration again, to avoid sending outdated stuff
      // We leave 30s wiggle room to accommodate late flushing etc.
      // This _could_ happen when the browser is suspended during flushing, in which case we just want to stop
      if (timestamp - this._context.initialTimestamp > this._options.maxReplayDuration + 30000) {
        throw new Error('Session is too long, not sending replay');
      }

      const eventContext = this._popEventContext();
      // Always increment segmentId regardless of outcome of sending replay
      const segmentId = this.session.segmentId++;
      this._maybeSaveSession();

      // Note this empties the event buffer regardless of outcome of sending replay
      const recordingData = await this.eventBuffer.finish();

      await sendReplay({
        replayId,
        recordingData,
        segmentId,
        eventContext,
        session: this.session,
        timestamp,
        onError: err => this.handleException(err),
      });
    } catch (err) {
      this.handleException(err);

      // This means we retried 3 times and all of them failed,
      // or we ran into a problem we don't want to retry, like rate limiting.
      // In this case, we want to completely stop the replay - otherwise, we may get inconsistent segments
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.stop({ reason: 'sendReplay' });

      const client = getClient();

      if (client) {
        const dropReason = err instanceof RateLimitError ? 'ratelimit_backoff' : 'send_error';
        client.recordDroppedEvent(dropReason, 'replay');
      }
    }
  }

  /**
   * Flush recording data to Sentry. Creates a lock so that only a single flush
   * can be active at a time. Do not call this directly.
   */
   __init5() {this._flush = async ({
    force = false,
  }

 = {}) => {
    if (!this._isEnabled && !force) {
      // This can happen if e.g. the replay was stopped because of exceeding the retry limit
      return;
    }

    if (!this.checkAndHandleExpiredSession()) {
      logger.error('Attempting to finish replay event after session expired.');
      return;
    }

    if (!this.session) {
      // should never happen, as we would have bailed out before
      return;
    }

    const start = this.session.started;
    const now = Date.now();
    const duration = now - start;

    // A flush is about to happen, cancel any queued flushes
    this._debouncedFlush.cancel();

    // If session is too short, or too long (allow some wiggle room over maxReplayDuration), do not send it
    // This _should_ not happen, but it may happen if flush is triggered due to a page activity change or similar
    const tooShort = duration < this._options.minReplayDuration;
    const tooLong = duration > this._options.maxReplayDuration + 5000;
    if (tooShort || tooLong) {
      logger.info(
          `Session duration (${Math.floor(duration / 1000)}s) is too ${
            tooShort ? 'short' : 'long'
          }, not sending replay.`,
        );

      if (tooShort) {
        this._debouncedFlush();
      }
      return;
    }

    const eventBuffer = this.eventBuffer;
    if (eventBuffer && this.session.segmentId === 0 && !eventBuffer.hasCheckout) {
      logger.info('Flushing initial segment without checkout.');
      // TODO FN: Evaluate if we want to stop here, or remove this again?
    }

    const _flushInProgress = !!this._flushLock;

    // this._flushLock acts as a lock so that future calls to `_flush()` will
    // be blocked until current flush is finished (i.e. this promise resolves)
    if (!this._flushLock) {
      this._flushLock = this._runFlush();
    }

    try {
      await this._flushLock;
    } catch (err) {
      this.handleException(err);
    } finally {
      this._flushLock = undefined;

      if (_flushInProgress) {
        // Wait for previous flush to finish, then call the debounced
        // `_flush()`. It's possible there are other flush requests queued and
        // waiting for it to resolve. We want to reduce all outstanding
        // requests (as well as any new flush requests that occur within a
        // second of the locked flush completing) into a single flush.
        this._debouncedFlush();
      }
    }
  };}

  /** Save the session, if it is sticky */
   _maybeSaveSession() {
    if (this.session && this._options.stickySession) {
      saveSession(this.session);
    }
  }

  /** Handler for rrweb.record.onMutation */
   __init6() {this._onMutationHandler = (mutations) => {
    const count = mutations.length;

    const mutationLimit = this._options.mutationLimit;
    const mutationBreadcrumbLimit = this._options.mutationBreadcrumbLimit;
    const overMutationLimit = mutationLimit && count > mutationLimit;

    // Create a breadcrumb if a lot of mutations happen at the same time
    // We can show this in the UI as an information with potential performance improvements
    if (count > mutationBreadcrumbLimit || overMutationLimit) {
      const breadcrumb = createBreadcrumb({
        category: 'replay.mutations',
        data: {
          count,
          limit: overMutationLimit,
        },
      });
      this._createCustomBreadcrumb(breadcrumb);
    }

    // Stop replay if over the mutation limit
    if (overMutationLimit) {
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.stop({ reason: 'mutationLimit', forceFlush: this.recordingMode === 'session' });
      return false;
    }

    // `true` means we use the regular mutation handling by rrweb
    return true;
  };}
}

function getOption(selectors, defaultSelectors) {
  return [
    ...selectors,
    // sentry defaults
    ...defaultSelectors,
  ].join(',');
}

/**
 * Returns privacy related configuration for use in rrweb
 */
function getPrivacyOptions({ mask, unmask, block, unblock, ignore }) {
  const defaultBlockedElements = ['base', 'iframe[srcdoc]:not([src])'];

  const maskSelector = getOption(mask, ['.sentry-mask', '[data-sentry-mask]']);
  const unmaskSelector = getOption(unmask, []);

  const options = {
    // We are making the decision to make text and input selectors the same
    maskTextSelector: maskSelector,
    unmaskTextSelector: unmaskSelector,

    blockSelector: getOption(block, ['.sentry-block', '[data-sentry-block]', ...defaultBlockedElements]),
    unblockSelector: getOption(unblock, []),
    ignoreSelector: getOption(ignore, ['.sentry-ignore', '[data-sentry-ignore]', 'input[type="file"]']),
  };

  return options;
}

/**
 * Masks an attribute if necessary, otherwise return attribute value as-is.
 */
function maskAttribute({
  el,
  key,
  maskAttributes,
  maskAllText,
  privacyOptions,
  value,
}) {
  // We only mask attributes if `maskAllText` is true
  if (!maskAllText) {
    return value;
  }

  // unmaskTextSelector takes precedence
  if (privacyOptions.unmaskTextSelector && el.matches(privacyOptions.unmaskTextSelector)) {
    return value;
  }

  if (
    maskAttributes.includes(key) ||
    // Need to mask `value` attribute for `<input>` if it's a button-like
    // type
    (key === 'value' && el.tagName === 'INPUT' && ['submit', 'button'].includes(el.getAttribute('type') || ''))
  ) {
    return value.replace(/[\S]/g, '*');
  }

  return value;
}

const MEDIA_SELECTORS =
  'img,image,svg,video,object,picture,embed,map,audio,link[rel="icon"],link[rel="apple-touch-icon"]';

const DEFAULT_NETWORK_HEADERS = ['content-length', 'content-type', 'accept'];

let _initialized = false;

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
}) ;

/**
 * Replay integration
 *
 * TODO: Rewrite this to be functional integration
 * Exported for tests.
 */
class Replay  {
  /**
   * @inheritDoc
   */
   static __initStatic() {this.id = 'Replay';}

  /**
   * @inheritDoc
   */

  /**
   * Options to pass to `rrweb.record()`
   */

  /**
   * Initial options passed to the replay integration, merged with default values.
   * Note: `sessionSampleRate` and `errorSampleRate` are not required here, as they
   * can only be finally set when setupOnce() is called.
   *
   * @private
   */

   constructor({
    flushMinDelay = DEFAULT_FLUSH_MIN_DELAY,
    flushMaxDelay = DEFAULT_FLUSH_MAX_DELAY,
    minReplayDuration = MIN_REPLAY_DURATION,
    maxReplayDuration = MAX_REPLAY_DURATION,
    stickySession = true,
    useCompression = true,
    workerUrl,
    _experiments = {},
    maskAllText = true,
    maskAllInputs = true,
    blockAllMedia = true,

    mutationBreadcrumbLimit = 750,
    mutationLimit = 10000,

    slowClickTimeout = 7000,
    slowClickIgnoreSelectors = [],

    networkDetailAllowUrls = [],
    networkDetailDenyUrls = [],
    networkCaptureBodies = true,
    networkRequestHeaders = [],
    networkResponseHeaders = [],

    mask = [],
    maskAttributes = ['title', 'placeholder'],
    unmask = [],
    block = [],
    unblock = [],
    ignore = [],
    maskFn,

    beforeAddRecordingEvent,
    beforeErrorSampling,
    onError,
  } = {}) {
    this.name = Replay.id;

    const privacyOptions = getPrivacyOptions({
      mask,
      unmask,
      block,
      unblock,
      ignore,
    });

    this._recordingOptions = {
      maskAllInputs,
      maskAllText,
      maskInputOptions: { password: true },
      maskTextFn: maskFn,
      maskInputFn: maskFn,
      maskAttributeFn: (key, value, el) =>
        maskAttribute({
          maskAttributes,
          maskAllText,
          privacyOptions,
          key,
          value,
          el,
        }),

      ...privacyOptions,

      // Our defaults
      slimDOMOptions: 'all',
      inlineStylesheet: true,
      // Disable inline images as it will increase segment/replay size
      inlineImages: false,
      // collect fonts, but be aware that `sentry.io` needs to be an allowed
      // origin for playback
      collectFonts: true,
      errorHandler: (err) => {
        try {
          err.__rrweb__ = true;
        } catch (error) {
          // ignore errors here
          // this can happen if the error is frozen or does not allow mutation for other reasons
        }
      },
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

      _experiments,
    };

    if (this._initialOptions.blockAllMedia) {
      // `blockAllMedia` is a more user friendly option to configure blocking
      // embedded media elements
      this._recordingOptions.blockSelector = !this._recordingOptions.blockSelector
        ? MEDIA_SELECTORS
        : `${this._recordingOptions.blockSelector},${MEDIA_SELECTORS}`;
    }

    if (this._isInitialized && isBrowser()) {
      throw new Error('Multiple Sentry Session Replay instances are not supported');
    }

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
    if (!isBrowser() || this._replay) {
      return;
    }

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
    if (!this._replay) {
      return;
    }
    this._replay.start();
  }

  /**
   * Start replay buffering. Buffers until `flush()` is called or, if
   * `replaysOnErrorSampleRate` > 0, until an error occurs.
   */
   startBuffering() {
    if (!this._replay) {
      return;
    }

    this._replay.startBuffering();
  }

  /**
   * Currently, this needs to be manually called (e.g. for tests). Sentry SDK
   * does not support a teardown
   */
   stop() {
    if (!this._replay) {
      return Promise.resolve();
    }

    return this._replay.stop({ forceFlush: this._replay.recordingMode === 'session' });
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
    if (!this._replay) {
      return Promise.resolve();
    }

    // assuming a session should be recorded in this case
    if (!this._replay.isEnabled()) {
      this._replay.start();
      return Promise.resolve();
    }

    return this._replay.sendBufferedReplayOrFlush(options);
  }

  /**
   * Get the current session ID.
   */
   getReplayId() {
    if (!this._replay || !this._replay.isEnabled()) {
      return;
    }

    return this._replay.getSessionId();
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
    if (!this._replay || !this._replay.isEnabled()) {
      return;
    }

    return this._replay.recordingMode;
  }

  /**
   * Initializes replay.
   */
   _initialize(client) {
    if (!this._replay) {
      return;
    }

    this._maybeLoadFromReplayCanvasIntegration(client);
    this._replay.initializeSampling();
  }

  /** Setup the integration. */
   _setup(client) {
    // Client is not available in constructor, so we need to wait until setupOnce
    const finalOptions = loadReplayOptionsFromClient(this._initialOptions, client);

    this._replay = new ReplayContainer({
      options: finalOptions,
      recordingOptions: this._recordingOptions,
    });
  }

  /** Get canvas options from ReplayCanvas integration, if it is also added. */
   _maybeLoadFromReplayCanvasIntegration(client) {
    // To save bundle size, we skip checking for stuff here
    // and instead just try-catch everything - as generally this should all be defined
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    try {
      const canvasIntegration = client.getIntegrationByName('ReplayCanvas')

;
      if (!canvasIntegration) {
        return;
      }

      this._replay['_canvas'] = canvasIntegration.getOptions();
    } catch (e) {
      // ignore errors here
    }
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  }
} Replay.__initStatic();

/** Parse Replay-related options from SDK options */
function loadReplayOptionsFromClient(initialOptions, client) {
  const opt = client.getOptions() ;

  const finalOptions = {
    sessionSampleRate: 0,
    errorSampleRate: 0,
    ...dropUndefinedKeys(initialOptions),
  };

  const replaysSessionSampleRate = parseSampleRate(opt.replaysSessionSampleRate);
  const replaysOnErrorSampleRate = parseSampleRate(opt.replaysOnErrorSampleRate);

  if (replaysSessionSampleRate == null && replaysOnErrorSampleRate == null) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn(
        'Replay is disabled because neither `replaysSessionSampleRate` nor `replaysOnErrorSampleRate` are set.',
      );
    });
  }

  if (replaysSessionSampleRate != null) {
    finalOptions.sessionSampleRate = replaysSessionSampleRate;
  }

  if (replaysOnErrorSampleRate != null) {
    finalOptions.errorSampleRate = replaysOnErrorSampleRate;
  }

  return finalOptions;
}

function _getMergedNetworkHeaders(headers) {
  return [...DEFAULT_NETWORK_HEADERS, ...headers.map(header => header.toLowerCase())];
}

/**
 * This is a small utility to get a type-safe instance of the Replay integration.
 */
function getReplay() {
  const client = getClient();
  return client && client.getIntegrationByName('Replay');
}

exports.getReplay = getReplay;
exports.replayIntegration = replayIntegration;


  // Add this module's exports to the global `Sentry.Integrations`
  __window.Sentry = __window.Sentry || {};
  __window.Sentry.Integrations = __window.Sentry.Integrations || {};
  for (var key in exports) {
    if (Object.prototype.hasOwnProperty.call(exports, key)) {
      __window.Sentry.Integrations[key] = exports[key];
      __window.Sentry[key] = exports[key];
    }
  }
}(window));
//# sourceMappingURL=replay.js.map
