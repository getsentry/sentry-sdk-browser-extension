/*! @sentry/browser (Performance Monitoring, Replay, and Feedback) 8.24.0 (7730bef) | https://github.com/getsentry/sentry-javascript */
var Sentry = (function (exports) {

  exports = window.Sentry || {};

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
   * Checks whether given value's type is ErrorEvent
   * {@link isErrorEvent}.
   *
   * @param wat A value to be checked.
   * @returns A boolean representing the result.
   */
  function isErrorEvent$2(wat) {
    return isBuiltin(wat, 'ErrorEvent');
  }

  /**
   * Checks whether given value's type is DOMError
   * {@link isDOMError}.
   *
   * @param wat A value to be checked.
   * @returns A boolean representing the result.
   */
  function isDOMError(wat) {
    return isBuiltin(wat, 'DOMError');
  }

  /**
   * Checks whether given value's type is DOMException
   * {@link isDOMException}.
   *
   * @param wat A value to be checked.
   * @returns A boolean representing the result.
   */
  function isDOMException(wat) {
    return isBuiltin(wat, 'DOMException');
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
   * Checks whether given string is parameterized
   * {@link isParameterizedString}.
   *
   * @param wat A value to be checked.
   * @returns A boolean representing the result.
   */
  function isParameterizedString(wat) {
    return (
      typeof wat === 'object' &&
      wat !== null &&
      '__sentry_template_string__' in wat &&
      '__sentry_template_values__' in wat
    );
  }

  /**
   * Checks whether given value is a primitive (undefined, null, number, boolean, string, bigint, symbol)
   * {@link isPrimitive}.
   *
   * @param wat A value to be checked.
   * @returns A boolean representing the result.
   */
  function isPrimitive(wat) {
    return wat === null || isParameterizedString(wat) || (typeof wat !== 'object' && typeof wat !== 'function');
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
   * Join values in array
   * @param input array of values to be joined together
   * @param delimiter string to be placed in-between values
   * @returns Joined values
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function safeJoin(input, delimiter) {
    if (!Array.isArray(input)) {
      return '';
    }

    const output = [];
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < input.length; i++) {
      const value = input[i];
      try {
        // This is a hack to fix a Vue3-specific bug that causes an infinite loop of
        // console warnings. This happens when a Vue template is rendered with
        // an undeclared variable, which we try to stringify, ultimately causing
        // Vue to issue another warning which repeats indefinitely.
        // see: https://github.com/getsentry/sentry-javascript/pull/8981
        if (isVueViewModel(value)) {
          output.push('[VueViewModel]');
        } else {
          output.push(String(value));
        }
      } catch (e) {
        output.push('[value cannot be serialized]');
      }
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
   * Creates exceptions inside `event.exception.values` for errors that are nested on properties based on the `key` parameter.
   */
  function applyAggregateErrorsToEvent(
    exceptionFromErrorImplementation,
    parser,
    maxValueLimit = 250,
    key,
    limit,
    event,
    hint,
  ) {
    if (!event.exception || !event.exception.values || !hint || !isInstanceOf(hint.originalException, Error)) {
      return;
    }

    // Generally speaking the last item in `event.exception.values` is the exception originating from the original Error
    const originalException =
      event.exception.values.length > 0 ? event.exception.values[event.exception.values.length - 1] : undefined;

    // We only create exception grouping if there is an exception in the event.
    if (originalException) {
      event.exception.values = truncateAggregateExceptions(
        aggregateExceptionsFromError(
          exceptionFromErrorImplementation,
          parser,
          limit,
          hint.originalException ,
          key,
          event.exception.values,
          originalException,
          0,
        ),
        maxValueLimit,
      );
    }
  }

  function aggregateExceptionsFromError(
    exceptionFromErrorImplementation,
    parser,
    limit,
    error,
    key,
    prevExceptions,
    exception,
    exceptionId,
  ) {
    if (prevExceptions.length >= limit + 1) {
      return prevExceptions;
    }

    let newExceptions = [...prevExceptions];

    // Recursively call this function in order to walk down a chain of errors
    if (isInstanceOf(error[key], Error)) {
      applyExceptionGroupFieldsForParentException(exception, exceptionId);
      const newException = exceptionFromErrorImplementation(parser, error[key]);
      const newExceptionId = newExceptions.length;
      applyExceptionGroupFieldsForChildException(newException, key, newExceptionId, exceptionId);
      newExceptions = aggregateExceptionsFromError(
        exceptionFromErrorImplementation,
        parser,
        limit,
        error[key],
        key,
        [newException, ...newExceptions],
        newException,
        newExceptionId,
      );
    }

    // This will create exception grouping for AggregateErrors
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
    if (Array.isArray(error.errors)) {
      error.errors.forEach((childError, i) => {
        if (isInstanceOf(childError, Error)) {
          applyExceptionGroupFieldsForParentException(exception, exceptionId);
          const newException = exceptionFromErrorImplementation(parser, childError);
          const newExceptionId = newExceptions.length;
          applyExceptionGroupFieldsForChildException(newException, `errors[${i}]`, newExceptionId, exceptionId);
          newExceptions = aggregateExceptionsFromError(
            exceptionFromErrorImplementation,
            parser,
            limit,
            childError,
            key,
            [newException, ...newExceptions],
            newException,
            newExceptionId,
          );
        }
      });
    }

    return newExceptions;
  }

  function applyExceptionGroupFieldsForParentException(exception, exceptionId) {
    // Don't know if this default makes sense. The protocol requires us to set these values so we pick *some* default.
    exception.mechanism = exception.mechanism || { type: 'generic', handled: true };

    exception.mechanism = {
      ...exception.mechanism,
      ...(exception.type === 'AggregateError' && { is_exception_group: true }),
      exception_id: exceptionId,
    };
  }

  function applyExceptionGroupFieldsForChildException(
    exception,
    source,
    exceptionId,
    parentId,
  ) {
    // Don't know if this default makes sense. The protocol requires us to set these values so we pick *some* default.
    exception.mechanism = exception.mechanism || { type: 'generic', handled: true };

    exception.mechanism = {
      ...exception.mechanism,
      type: 'chained',
      source,
      exception_id: exceptionId,
      parent_id: parentId,
    };
  }

  /**
   * Truncate the message (exception.value) of all exceptions in the event.
   * Because this event processor is ran after `applyClientOptions`,
   * we need to truncate the message of the added exceptions here.
   */
  function truncateAggregateExceptions(exceptions, maxValueLength) {
    return exceptions.map(exception => {
      if (exception.value) {
        exception.value = truncate(exception.value, maxValueLength);
      }
      return exception;
    });
  }

  const SDK_VERSION = '8.24.0';

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
    const gbl = (obj || GLOBAL_OBJ) ;
    const __SENTRY__ = (gbl.__SENTRY__ = gbl.__SENTRY__ || {});
    const versionedCarrier = (__SENTRY__[SDK_VERSION] = __SENTRY__[SDK_VERSION] || {});
    return versionedCarrier[name] || (versionedCarrier[name] = creator());
  }

  const WINDOW$6 = GLOBAL_OBJ ;

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
    if (WINDOW$6.HTMLElement) {
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
      return WINDOW$6.document.location.href;
    } catch (oO) {
      return '';
    }
  }

  /**
   * Gets a DOM element by using document.querySelector.
   *
   * This wrapper will first check for the existance of the function before
   * actually calling it so that we don't have to take care of this check,
   * every time we want to access the DOM.
   *
   * Reason: DOM/querySelector is not available in all environments.
   *
   * We have to cast to any because utils can be consumed by a variety of environments,
   * and we don't want to break TS users. If you know what element will be selected by
   * `document.querySelector`, specify it as part of the generic call. For example,
   * `const element = getDomElement<Element>('selector');`
   *
   * @param selector the selector string passed on to document.querySelector
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getDomElement(selector) {
    if (WINDOW$6.document && WINDOW$6.document.querySelector) {
      return WINDOW$6.document.querySelector(selector) ;
    }
    return null;
  }

  /**
   * Given a DOM element, traverses up the tree until it finds the first ancestor node
   * that has the `data-sentry-component` or `data-sentry-element` attribute with `data-sentry-component` taking
   * precendence. This attribute is added at build-time by projects that have the component name annotation plugin installed.
   *
   * @returns a string representation of the component for the provided DOM element, or `null` if not found
   */
  function getComponentName(elem) {
    // @ts-expect-error WINDOW has HTMLElement
    if (!WINDOW$6.HTMLElement) {
      return null;
    }

    let currentElem = elem ;
    const MAX_TRAVERSE_HEIGHT = 5;
    for (let i = 0; i < MAX_TRAVERSE_HEIGHT; i++) {
      if (!currentElem) {
        return null;
      }

      if (currentElem instanceof HTMLElement) {
        if (currentElem.dataset['sentryComponent']) {
          return currentElem.dataset['sentryComponent'];
        }
        if (currentElem.dataset['sentryElement']) {
          return currentElem.dataset['sentryElement'];
        }
      }

      currentElem = currentElem.parentNode;
    }

    return null;
  }

  /** Prefix for logging strings */
  const PREFIX = 'Sentry Logger ';

  const CONSOLE_LEVELS = [
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
      CONSOLE_LEVELS.forEach(name => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger[name] = (...args) => {
          if (enabled) {
            consoleSandbox(() => {
              GLOBAL_OBJ.console[name](`${PREFIX}[${name}]:`, ...args);
            });
          }
        };
      });
    }

    return logger ;
  }

  const logger = makeLogger();

  /** Regular expression used to parse a Dsn. */
  const DSN_REGEX = /^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;

  function isValidProtocol(protocol) {
    return protocol === 'http' || protocol === 'https';
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

  /**
   * Parses a Dsn from a given string.
   *
   * @param str A Dsn as string
   * @returns Dsn as DsnComponents or undefined if @param str is not a valid DSN string
   */
  function dsnFromString(str) {
    const match = DSN_REGEX.exec(str);

    if (!match) {
      // This should be logged to the console
      consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.error(`Invalid Sentry Dsn: ${str}`);
      });
      return undefined;
    }

    const [protocol, publicKey, pass = '', host = '', port = '', lastPath = ''] = match.slice(1);
    let path = '';
    let projectId = lastPath;

    const split = projectId.split('/');
    if (split.length > 1) {
      path = split.slice(0, -1).join('/');
      projectId = split.pop() ;
    }

    if (projectId) {
      const projectMatch = projectId.match(/^\d+/);
      if (projectMatch) {
        projectId = projectMatch[0];
      }
    }

    return dsnFromComponents({ host, pass, path, projectId, port, protocol: protocol , publicKey });
  }

  function dsnFromComponents(components) {
    return {
      protocol: components.protocol,
      publicKey: components.publicKey || '',
      pass: components.pass || '',
      host: components.host,
      port: components.port || '',
      path: components.path || '',
      projectId: components.projectId,
    };
  }

  function validateDsn(dsn) {

    const { port, projectId, protocol } = dsn;

    const requiredComponents = ['protocol', 'publicKey', 'host', 'projectId'];
    const hasMissingRequiredComponent = requiredComponents.find(component => {
      if (!dsn[component]) {
        logger.error(`Invalid Sentry Dsn: ${component} missing`);
        return true;
      }
      return false;
    });

    if (hasMissingRequiredComponent) {
      return false;
    }

    if (!projectId.match(/^\d+$/)) {
      logger.error(`Invalid Sentry Dsn: Invalid projectId ${projectId}`);
      return false;
    }

    if (!isValidProtocol(protocol)) {
      logger.error(`Invalid Sentry Dsn: Invalid protocol ${protocol}`);
      return false;
    }

    if (port && isNaN(parseInt(port, 10))) {
      logger.error(`Invalid Sentry Dsn: Invalid port ${port}`);
      return false;
    }

    return true;
  }

  /**
   * Creates a valid Sentry Dsn object, identifying a Sentry instance and project.
   * @returns a valid DsnComponents object or `undefined` if @param from is an invalid DSN source
   */
  function makeDsn(from) {
    const components = typeof from === 'string' ? dsnFromString(from) : dsnFromComponents(from);
    if (!components || !validateDsn(components)) {
      return undefined;
    }
    return components;
  }

  /** An error emitted by Sentry SDKs and related utilities. */
  class SentryError extends Error {
    /** Display name of this error instance. */

     constructor( message, logLevel = 'warn') {
      super(message);this.message = message;
      this.name = new.target.prototype.constructor.name;
      // This sets the prototype to be `Error`, not `SentryError`. It's unclear why we do this, but commenting this line
      // out causes various (seemingly totally unrelated) playwright tests consistently time out. FYI, this makes
      // instances of `SentryError` fail `obj instanceof SentryError` checks.
      Object.setPrototypeOf(this, new.target.prototype);
      this.logLevel = logLevel;
    }
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

    source[name] = wrapped;
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
      logger.log(`Failed to add non-enumerable property "${name}" to object`, obj);
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
   * Encodes given object into url-friendly format
   *
   * @param object An object that contains serializable values
   * @returns string Encoded
   */
  function urlEncode(object) {
    return Object.keys(object)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(object[key])}`)
      .join('&');
  }

  /**
   * Transforms any `Error` or `Event` into a plain object with all of their enumerable properties, and some of their
   * non-enumerable properties attached.
   *
   * @param value Initial source that we have to transform in order for it to be usable by the serializer
   * @returns An Event or Error turned into an object - or the value argurment itself, when value is neither an Event nor
   *  an Error.
   */
  function convertToPlainObject(
    value,
  )

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
   * Given any captured exception, extract its keys and create a sorted
   * and truncated list that will be used inside the event message.
   * eg. `Non-error exception captured with keys: foo, bar, baz`
   */
  function extractExceptionKeysForMessage(exception, maxLength = 40) {
    const keys = Object.keys(convertToPlainObject(exception));
    keys.sort();

    const firstKey = keys[0];

    if (!firstKey) {
      return '[object has no keys]';
    }

    if (firstKey.length >= maxLength) {
      return truncate(firstKey, maxLength);
    }

    for (let includedKeys = keys.length; includedKeys > 0; includedKeys--) {
      const serialized = keys.slice(0, includedKeys).join(', ');
      if (serialized.length > maxLength) {
        continue;
      }
      if (includedKeys === keys.length) {
        return serialized;
      }
      return truncate(serialized, maxLength);
    }

    return '';
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

      for (const key of Object.keys(inputValue)) {
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
    } catch (e) {
      return true;
    }
  }

  const STACKTRACE_FRAME_LIMIT = 50;
  const UNKNOWN_FUNCTION = '?';
  // Used to sanitize webpack (error: *) wrapped stack errors
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
    const sortedParsers = parsers.sort((a, b) => a[0] - b[0]).map(p => p[1]);

    return (stack, skipFirstLines = 0, framesToPop = 0) => {
      const frames = [];
      const lines = stack.split('\n');

      for (let i = skipFirstLines; i < lines.length; i++) {
        const line = lines[i] ;
        // Ignore lines over 1kb as they are unlikely to be stack frames.
        // Many of the regular expressions use backtracking which results in run time that increases exponentially with
        // input size. Huge strings can result in hangs/Denial of Service:
        // https://github.com/getsentry/sentry-javascript/issues/2286
        if (line.length > 1024) {
          continue;
        }

        // https://github.com/getsentry/sentry-javascript/issues/5459
        // Remove webpack (error: *) wrappers
        const cleanedLine = WEBPACK_ERROR_REGEXP.test(line) ? line.replace(WEBPACK_ERROR_REGEXP, '$1') : line;

        // https://github.com/getsentry/sentry-javascript/issues/7813
        // Skip Error: lines
        if (cleanedLine.match(/\S*Error: /)) {
          continue;
        }

        for (const parser of sortedParsers) {
          const frame = parser(cleanedLine);

          if (frame) {
            frames.push(frame);
            break;
          }
        }

        if (frames.length >= STACKTRACE_FRAME_LIMIT + framesToPop) {
          break;
        }
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
    if (Array.isArray(stackParser)) {
      return createStackParser(...stackParser);
    }
    return stackParser;
  }

  /**
   * Removes Sentry frames from the top and bottom of the stack if present and enforces a limit of max number of frames.
   * Assumes stack input is ordered from top to bottom and returns the reverse representation so call site of the
   * function that caused the crash is the last frame in the array.
   * @hidden
   */
  function stripSentryFramesAndReverse(stack) {
    if (!stack.length) {
      return [];
    }

    const localStack = Array.from(stack);

    // If stack starts with one of our API calls, remove it (starts, meaning it's the top of the stack - aka last call)
    if (/sentryWrapped/.test(getLastStackFrame(localStack).function || '')) {
      localStack.pop();
    }

    // Reversing in the middle of the procedure allows us to just pop the values off the stack
    localStack.reverse();

    // If stack ends with one of our internal API calls, remove it (ends, meaning it's the bottom of the stack - aka top-most call)
    if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
      localStack.pop();

      // When using synthetic events, we will have a 2 levels deep stack, as `new Error('Sentry syntheticException')`
      // is produced within the hub itself, making it:
      //
      //   Sentry.captureException()
      //   getCurrentHub().captureException()
      //
      // instead of just the top `Sentry` call itself.
      // This forces us to possibly strip an additional frame in the exact same was as above.
      if (STRIP_FRAME_REGEXP.test(getLastStackFrame(localStack).function || '')) {
        localStack.pop();
      }
    }

    return localStack.slice(0, STACKTRACE_FRAME_LIMIT).map(frame => ({
      ...frame,
      filename: frame.filename || getLastStackFrame(localStack).filename,
      function: frame.function || UNKNOWN_FUNCTION,
    }));
  }

  function getLastStackFrame(arr) {
    return arr[arr.length - 1] || {};
  }

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

  /**
   * Get's stack frames from an event without needing to check for undefined properties.
   */
  function getFramesFromEvent(event) {
    const exception = event.exception;

    if (exception) {
      const frames = [];
      try {
        // @ts-expect-error Object could be undefined
        exception.values.forEach(value => {
          // @ts-expect-error Value could be undefined
          if (value.stacktrace.frames) {
            // @ts-expect-error Value could be undefined
            frames.push(...value.stacktrace.frames);
          }
        });
        return frames;
      } catch (_oO) {
        return undefined;
      }
    }
    return undefined;
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
      instrumentFn();
      instrumented$1[type] = true;
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
        logger.error(
            `Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`,
            e,
          );
      }
    }
  }

  /**
   * Add an instrumentation handler for when a console.xxx method is called.
   *
   * Use at your own risk, this might break without changelog notice, only used internally.
   * @hidden
   */
  function addConsoleInstrumentationHandler(handler) {
    const type = 'console';
    addHandler$1(type, handler);
    maybeInstrument(type, instrumentConsole);
  }

  function instrumentConsole() {
    if (!('console' in GLOBAL_OBJ)) {
      return;
    }

    CONSOLE_LEVELS.forEach(function (level) {
      if (!(level in GLOBAL_OBJ.console)) {
        return;
      }

      fill(GLOBAL_OBJ.console, level, function (originalConsoleMethod) {
        originalConsoleMethods[level] = originalConsoleMethod;

        return function (...args) {
          const handlerData = { args, level };
          triggerHandlers$1('console', handlerData);

          const log = originalConsoleMethods[level];
          log && log.apply(GLOBAL_OBJ.console, args);
        };
      });
    });
  }

  const WINDOW$5 = GLOBAL_OBJ ;

  /**
   * Tells whether current environment supports Fetch API
   * {@link supportsFetch}.
   *
   * @returns Answer to the given question.
   */
  function supportsFetch() {
    if (!('fetch' in WINDOW$5)) {
      return false;
    }

    try {
      new Headers();
      new Request('http://www.example.com');
      new Response();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * isNative checks if the given function is a native implementation
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
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
    if (typeof EdgeRuntime === 'string') {
      return true;
    }

    if (!supportsFetch()) {
      return false;
    }

    // Fast path to avoid DOM I/O
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isNativeFunction(WINDOW$5.fetch)) {
      return true;
    }

    // window.fetch is implemented, but is polyfilled or already wrapped (e.g: by a chrome extension)
    // so create a "pure" iframe to see if that has native fetch
    let result = false;
    const doc = WINDOW$5.document;
    // eslint-disable-next-line deprecation/deprecation
    if (doc && typeof (doc.createElement ) === 'function') {
      try {
        const sandbox = doc.createElement('iframe');
        sandbox.hidden = true;
        doc.head.appendChild(sandbox);
        if (sandbox.contentWindow && sandbox.contentWindow.fetch) {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          result = isNativeFunction(sandbox.contentWindow.fetch);
        }
        doc.head.removeChild(sandbox);
      } catch (err) {
        logger.warn('Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ', err);
      }
    }

    return result;
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
   * Add an instrumentation handler for when a fetch request happens.
   * The handler function is called once when the request starts and once when it ends,
   * which can be identified by checking if it has an `endTimestamp`.
   *
   * Use at your own risk, this might break without changelog notice, only used internally.
   * @hidden
   */
  function addFetchInstrumentationHandler(
    handler,
    skipNativeFetchCheck,
  ) {
    const type = 'fetch';
    addHandler$1(type, handler);
    maybeInstrument(type, () => instrumentFetch(undefined, skipNativeFetchCheck));
  }

  /**
   * Add an instrumentation handler for long-lived fetch requests, like consuming server-sent events (SSE) via fetch.
   * The handler will resolve the request body and emit the actual `endTimestamp`, so that the
   * span can be updated accordingly.
   *
   * Only used internally
   * @hidden
   */
  function addFetchEndInstrumentationHandler(handler) {
    const type = 'fetch-body-resolved';
    addHandler$1(type, handler);
    maybeInstrument(type, () => instrumentFetch(streamHandler));
  }

  function instrumentFetch(onFetchResolved, skipNativeFetchCheck = false) {
    if (skipNativeFetchCheck && !supportsNativeFetch()) {
      return;
    }

    fill(GLOBAL_OBJ, 'fetch', function (originalFetch) {
      return function (...args) {
        const { method, url } = parseFetchArgs(args);
        const handlerData = {
          args,
          fetchData: {
            method,
            url,
          },
          startTimestamp: timestampInSeconds() * 1000,
        };

        // if there is no callback, fetch is instrumented directly
        if (!onFetchResolved) {
          triggerHandlers$1('fetch', {
            ...handlerData,
          });
        }

        // We capture the stack right here and not in the Promise error callback because Safari (and probably other
        // browsers too) will wipe the stack trace up to this point, only leaving us with this file which is useless.

        // NOTE: If you are a Sentry user, and you are seeing this stack frame,
        //       it means the error, that was caused by your fetch call did not
        //       have a stack trace, so the SDK backfilled the stack trace so
        //       you can see which fetch call failed.
        const virtualStackTrace = new Error().stack;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return originalFetch.apply(GLOBAL_OBJ, args).then(
          async (response) => {
            if (onFetchResolved) {
              onFetchResolved(response);
            } else {
              triggerHandlers$1('fetch', {
                ...handlerData,
                endTimestamp: timestampInSeconds() * 1000,
                response,
              });
            }

            return response;
          },
          (error) => {
            triggerHandlers$1('fetch', {
              ...handlerData,
              endTimestamp: timestampInSeconds() * 1000,
              error,
            });

            if (isError(error) && error.stack === undefined) {
              // NOTE: If you are a Sentry user, and you are seeing this stack frame,
              //       it means the error, that was caused by your fetch call did not
              //       have a stack trace, so the SDK backfilled the stack trace so
              //       you can see which fetch call failed.
              error.stack = virtualStackTrace;
              addNonEnumerableProperty(error, 'framesToPop', 1);
            }

            // NOTE: If you are a Sentry user, and you are seeing this stack frame,
            //       it means the sentry.javascript SDK caught an error invoking your application code.
            //       This is expected behavior and NOT indicative of a bug with sentry.javascript.
            throw error;
          },
        );
      };
    });
  }

  async function resolveResponse(res, onFinishedResolving) {
    if (res && res.body && res.body.getReader) {
      const responseReader = res.body.getReader();

      // eslint-disable-next-line no-inner-declarations
      async function consumeChunks({ done }) {
        if (!done) {
          try {
            // abort reading if read op takes more than 5s
            const result = await Promise.race([
              responseReader.read(),
              new Promise(res => {
                setTimeout(() => {
                  res({ done: true });
                }, 5000);
              }),
            ]);
            await consumeChunks(result);
          } catch (error) {
            // handle error if needed
          }
        } else {
          return Promise.resolve();
        }
      }

      return responseReader
        .read()
        .then(consumeChunks)
        .then(onFinishedResolving)
        .catch(() => undefined);
    }
  }

  async function streamHandler(response) {
    // clone response for awaiting stream
    let clonedResponseForResolving;
    try {
      clonedResponseForResolving = response.clone();
    } catch (e) {
      return;
    }

    await resolveResponse(clonedResponseForResolving, () => {
      triggerHandlers$1('fetch-body-resolved', {
        endTimestamp: timestampInSeconds() * 1000,
        response,
      });
    });
  }

  function hasProp(obj, prop) {
    return !!obj && typeof obj === 'object' && !!(obj )[prop];
  }

  function getUrlFromResource(resource) {
    if (typeof resource === 'string') {
      return resource;
    }

    if (!resource) {
      return '';
    }

    if (hasProp(resource, 'url')) {
      return resource.url;
    }

    if (resource.toString) {
      return resource.toString();
    }

    return '';
  }

  /**
   * Parses the fetch arguments to find the used Http method and the url of the request.
   * Exported for tests only.
   */
  function parseFetchArgs(fetchArgs) {
    if (fetchArgs.length === 0) {
      return { method: 'GET', url: '' };
    }

    if (fetchArgs.length === 2) {
      const [url, options] = fetchArgs ;

      return {
        url: getUrlFromResource(url),
        method: hasProp(options, 'method') ? String(options.method).toUpperCase() : 'GET',
      };
    }

    const arg = fetchArgs[0];
    return {
      url: getUrlFromResource(arg ),
      method: hasProp(arg, 'method') ? String(arg.method).toUpperCase() : 'GET',
    };
  }

  let _oldOnErrorHandler = null;

  /**
   * Add an instrumentation handler for when an error is captured by the global error handler.
   *
   * Use at your own risk, this might break without changelog notice, only used internally.
   * @hidden
   */
  function addGlobalErrorInstrumentationHandler(handler) {
    const type = 'error';
    addHandler$1(type, handler);
    maybeInstrument(type, instrumentError);
  }

  function instrumentError() {
    _oldOnErrorHandler = GLOBAL_OBJ.onerror;

    GLOBAL_OBJ.onerror = function (
      msg,
      url,
      line,
      column,
      error,
    ) {
      const handlerData = {
        column,
        error,
        line,
        msg,
        url,
      };
      triggerHandlers$1('error', handlerData);

      if (_oldOnErrorHandler && !_oldOnErrorHandler.__SENTRY_LOADER__) {
        // eslint-disable-next-line prefer-rest-params
        return _oldOnErrorHandler.apply(this, arguments);
      }

      return false;
    };

    GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
  }

  let _oldOnUnhandledRejectionHandler = null;

  /**
   * Add an instrumentation handler for when an unhandled promise rejection is captured.
   *
   * Use at your own risk, this might break without changelog notice, only used internally.
   * @hidden
   */
  function addGlobalUnhandledRejectionInstrumentationHandler(
    handler,
  ) {
    const type = 'unhandledrejection';
    addHandler$1(type, handler);
    maybeInstrument(type, instrumentUnhandledRejection);
  }

  function instrumentUnhandledRejection() {
    _oldOnUnhandledRejectionHandler = GLOBAL_OBJ.onunhandledrejection;

    GLOBAL_OBJ.onunhandledrejection = function (e) {
      const handlerData = e;
      triggerHandlers$1('unhandledrejection', handlerData);

      if (_oldOnUnhandledRejectionHandler && !_oldOnUnhandledRejectionHandler.__SENTRY_LOADER__) {
        // eslint-disable-next-line prefer-rest-params
        return _oldOnUnhandledRejectionHandler.apply(this, arguments);
      }

      return true;
    };

    GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
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
   * Get source of SDK.
   */
  function getSDKSource() {
    // @ts-expect-error "npm" is injected by rollup during build process
    return "npm";
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
    return typeof window !== 'undefined' && (!isNodeEnv() );
  }

  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  /* eslint-disable @typescript-eslint/no-explicit-any */

  /**
   * Helper to decycle json objects
   */
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
   * Extracts either message or type+value from an event that can be used for user-facing logs
   * @returns event's description
   */
  function getEventDescription(event) {
    const { message, event_id: eventId } = event;
    if (message) {
      return message;
    }

    const firstException = getFirstException(event);
    if (firstException) {
      if (firstException.type && firstException.value) {
        return `${firstException.type}: ${firstException.value}`;
      }
      return firstException.type || firstException.value || eventId || '<unknown>';
    }
    return eventId || '<unknown>';
  }

  /**
   * Adds exception values, type and value to an synthetic Exception.
   * @param event The event to modify.
   * @param value Value of the exception.
   * @param type Type of the exception.
   * @hidden
   */
  function addExceptionTypeValue(event, value, type) {
    const exception = (event.exception = event.exception || {});
    const values = (exception.values = exception.values || []);
    const firstException = (values[0] = values[0] || {});
    if (!firstException.value) {
      firstException.value = value || '';
    }
    if (!firstException.type) {
      firstException.type = type || 'Error';
    }
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (exception && (exception ).__sentry_captured__) {
      return true;
    }

    try {
      // set it this way rather than by assignment so that it's not ennumerable and therefore isn't recorded by the
      // `ExtraErrorData` integration
      addNonEnumerableProperty(exception , '__sentry_captured__', true);
    } catch (err) {
      // `exception` is a primitive, so we can't mark it seen
    }

    return false;
  }

  /**
   * Checks whether the given input is already an array, and if it isn't, wraps it in one.
   *
   * @param maybeArray Input to turn into an array, if necessary
   * @returns The input, if already an array, or an array with the input as the only element, if not
   */
  function arrayify(maybeArray) {
    return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
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
   * object in the normallized output.
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

  /** JSDoc */
  function normalizeToSize(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    object,
    // Default Node.js REPL depth
    depth = 3,
    // 100kB, as 200kB is max payload size, so half sounds reasonable
    maxSize = 100 * 1024,
  ) {
    const normalized = normalize(object, depth);

    if (jsonSize(normalized) > maxSize) {
      return normalizeToSize(object, depth - 1, maxSize);
    }

    return normalized ;
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
    memo = memoBuilder(),
  ) {
    const [memoize, unmemoize] = memo;

    // Get the simple cases out of the way first
    if (
      value == null || // this matches null and undefined -> eqeq not eqeqeq
      (['number', 'boolean', 'string'].includes(typeof value) && !Number.isNaN(value))
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

      if (typeof value === 'number' && value !== value) {
        return '[NaN]';
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

  /** Calculates bytes size of input string */
  function utf8Length(value) {
    // eslint-disable-next-line no-bitwise
    return ~-encodeURI(value).split(/%..|./).length;
  }

  /** Calculates bytes size of input object */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function jsonSize(value) {
    return utf8Length(JSON.stringify(value));
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
   * Creates an new PromiseBuffer object with the specified limit
   * @param limit max number of promises that can be stored in the buffer
   */
  function makePromiseBuffer(limit) {
    const buffer = [];

    function isReady() {
      return limit === undefined || buffer.length < limit;
    }

    /**
     * Remove a promise from the queue.
     *
     * @param task Can be any PromiseLike<T>
     * @returns Removed promise.
     */
    function remove(task) {
      return buffer.splice(buffer.indexOf(task), 1)[0] || Promise.resolve(undefined);
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
      if (!isReady()) {
        return rejectedSyncPromise(new SentryError('Not adding Promise because buffer limit was reached.'));
      }

      // start the task and add its promise to the queue
      const task = taskProducer();
      if (buffer.indexOf(task) === -1) {
        buffer.push(task);
      }
      void task
        .then(() => remove(task))
        // Use `then(null, rejectionHandler)` rather than `catch(rejectionHandler)` so that we can use `PromiseLike`
        // rather than `Promise`. `PromiseLike` doesn't have a `.catch` method, making its polyfill smaller. (ES5 didn't
        // have promises, so TS has to polyfill when down-compiling.)
        .then(null, () =>
          remove(task).then(null, () => {
            // We have to add another catch here because `remove()` starts a new promise chain.
          }),
        );
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
      return new SyncPromise((resolve, reject) => {
        let counter = buffer.length;

        if (!counter) {
          return resolve(true);
        }

        // wait for `timeout` ms and then resolve to `false` (if not cancelled first)
        const capturedSetTimeout = setTimeout(() => {
          if (timeout && timeout > 0) {
            resolve(false);
          }
        }, timeout);

        // if all promises resolve in time, cancel the timer and resolve to `true`
        buffer.forEach(item => {
          void resolvedSyncPromise(item).then(() => {
            if (!--counter) {
              clearTimeout(capturedSetTimeout);
              resolve(true);
            }
          }, reject);
        });
      });
    }

    return {
      $: buffer,
      add,
      drain,
    };
  }

  /**
   * Parses string form of URL into an object
   * // borrowed from https://tools.ietf.org/html/rfc3986#appendix-B
   * // intentionally using regex and not <a/> href parsing trick because React Native and other
   * // environments where DOM might not be available
   * @returns parsed URL object
   */
  function parseUrl$1(url) {
    if (!url) {
      return {};
    }

    const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);

    if (!match) {
      return {};
    }

    // coerce to undefined values to empty string so we don't get 'undefined'
    const query = match[6] || '';
    const fragment = match[8] || '';
    return {
      host: match[4],
      path: match[5],
      protocol: match[2],
      search: query,
      hash: fragment,
      relative: match[5] + query + fragment, // everything minus origin
    };
  }

  // Note: Ideally the `SeverityLevel` type would be derived from `validSeverityLevels`, but that would mean either
  //
  // a) moving `validSeverityLevels` to `@sentry/types`,
  // b) moving the`SeverityLevel` type here, or
  // c) importing `validSeverityLevels` from here into `@sentry/types`.
  //
  // Option A would make `@sentry/types` a runtime dependency of `@sentry/utils` (not good), and options B and C would
  // create a circular dependency between `@sentry/types` and `@sentry/utils` (also not good). So a TODO accompanying the
  // type, reminding anyone who changes it to change this list also, will have to do.

  const validSeverityLevels = ['fatal', 'error', 'warning', 'log', 'info', 'debug'];

  /**
   * Converts a string-based level into a `SeverityLevel`, normalizing it along the way.
   *
   * @param level String representation of desired `SeverityLevel`.
   * @returns The `SeverityLevel` corresponding to the given string, or 'log' if the string isn't a valid level.
   */
  function severityLevelFromString(level) {
    return (level === 'warn' ? 'warning' : validSeverityLevels.includes(level) ? level : 'log') ;
  }

  const BAGGAGE_HEADER_NAME = 'baggage';

  const SENTRY_BAGGAGE_KEY_PREFIX = 'sentry-';

  const SENTRY_BAGGAGE_KEY_PREFIX_REGEX = /^sentry-/;

  /**
   * Max length of a serialized baggage string
   *
   * https://www.w3.org/TR/baggage/#limits
   */
  const MAX_BAGGAGE_STRING_LENGTH = 8192;

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
   * Turns a Dynamic Sampling Object into a baggage header by prefixing all the keys on the object with "sentry-".
   *
   * @param dynamicSamplingContext The Dynamic Sampling Context to turn into a header. For convenience and compatibility
   * with the `getDynamicSamplingContext` method on the Transaction class ,this argument can also be `undefined`. If it is
   * `undefined` the function will return `undefined`.
   * @returns a baggage header, created from `dynamicSamplingContext`, or `undefined` either if `dynamicSamplingContext`
   * was `undefined`, or if `dynamicSamplingContext` didn't contain any values.
   */
  function dynamicSamplingContextToSentryBaggageHeader(
    // this also takes undefined for convenience and bundle size in other places
    dynamicSamplingContext,
  ) {
    if (!dynamicSamplingContext) {
      return undefined;
    }

    // Prefix all DSC keys with "sentry-" and put them into a new object
    const sentryPrefixedDSC = Object.entries(dynamicSamplingContext).reduce(
      (acc, [dscKey, dscValue]) => {
        if (dscValue) {
          acc[`${SENTRY_BAGGAGE_KEY_PREFIX}${dscKey}`] = dscValue;
        }
        return acc;
      },
      {},
    );

    return objectToBaggageHeader(sentryPrefixedDSC);
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

  /**
   * Turns a flat object (key-value pairs) into a baggage header, which is also just key-value pairs.
   *
   * @param object The object to turn into a baggage header.
   * @returns a baggage header string, or `undefined` if the object didn't have any values, since an empty baggage header
   * is not spec compliant.
   */
  function objectToBaggageHeader(object) {
    if (Object.keys(object).length === 0) {
      // An empty baggage header is not spec compliant: We return undefined.
      return undefined;
    }

    return Object.entries(object).reduce((baggageHeader, [objectKey, objectValue], currentIndex) => {
      const baggageEntry = `${encodeURIComponent(objectKey)}=${encodeURIComponent(objectValue)}`;
      const newBaggageHeader = currentIndex === 0 ? baggageEntry : `${baggageHeader},${baggageEntry}`;
      if (newBaggageHeader.length > MAX_BAGGAGE_STRING_LENGTH) {
        logger.warn(
            `Not adding key: ${objectKey} with val: ${objectValue} to baggage header due to exceeding baggage size limits.`,
          );
        return baggageHeader;
      } else {
        return newBaggageHeader;
      }
    }, '');
  }

  // eslint-disable-next-line @sentry-internal/sdk/no-regexp-constructor -- RegExp is used for readability here
  const TRACEPARENT_REGEXP = new RegExp(
    '^[ \\t]*' + // whitespace
      '([0-9a-f]{32})?' + // trace_id
      '-?([0-9a-f]{16})?' + // span_id
      '-?([01])?' + // sampled
      '[ \\t]*$', // whitespace
  );

  /**
   * Extract transaction context data from a `sentry-trace` header.
   *
   * @param traceparent Traceparent string
   *
   * @returns Object containing data from the header, or undefined if traceparent string is malformed
   */
  function extractTraceparentData(traceparent) {
    if (!traceparent) {
      return undefined;
    }

    const matches = traceparent.match(TRACEPARENT_REGEXP);
    if (!matches) {
      return undefined;
    }

    let parentSampled;
    if (matches[3] === '1') {
      parentSampled = true;
    } else if (matches[3] === '0') {
      parentSampled = false;
    }

    return {
      traceId: matches[1],
      parentSampled,
      parentSpanId: matches[2],
    };
  }

  /**
   * Create a propagation context from incoming headers or
   * creates a minimal new one if the headers are undefined.
   */
  function propagationContextFromHeaders(
    sentryTrace,
    baggage,
  ) {
    const traceparentData = extractTraceparentData(sentryTrace);
    const dynamicSamplingContext = baggageHeaderToDynamicSamplingContext(baggage);

    const { traceId, parentSpanId, parentSampled } = traceparentData || {};

    if (!traceparentData) {
      return {
        traceId: traceId || uuid4(),
        spanId: uuid4().substring(16),
      };
    } else {
      return {
        traceId: traceId || uuid4(),
        parentSpanId: parentSpanId || uuid4().substring(16),
        spanId: uuid4().substring(16),
        sampled: parentSampled,
        dsc: dynamicSamplingContext || {}, // If we have traceparent data but no DSC it means we are not head of trace and we must freeze it
      };
    }
  }

  /**
   * Create sentry-trace header from span context values.
   */
  function generateSentryTraceHeader(
    traceId = uuid4(),
    spanId = uuid4().substring(16),
    sampled,
  ) {
    let sampledString = '';
    if (sampled !== undefined) {
      sampledString = sampled ? '-1' : '-0';
    }
    return `${traceId}-${spanId}${sampledString}`;
  }

  /**
   * Creates an envelope.
   * Make sure to always explicitly provide the generic to this function
   * so that the envelope types resolve correctly.
   */
  function createEnvelope(headers, items = []) {
    return [headers, items] ;
  }

  /**
   * Add an item to an envelope.
   * Make sure to always explicitly provide the generic to this function
   * so that the envelope types resolve correctly.
   */
  function addItemToEnvelope(envelope, newItem) {
    const [headers, items] = envelope;
    return [headers, [...items, newItem]] ;
  }

  /**
   * Convenience function to loop through the items and item types of an envelope.
   * (This function was mostly created because working with envelope types is painful at the moment)
   *
   * If the callback returns true, the rest of the items will be skipped.
   */
  function forEachEnvelopeItem(
    envelope,
    callback,
  ) {
    const envelopeItems = envelope[1];

    for (const envelopeItem of envelopeItems) {
      const envelopeItemType = envelopeItem[0].type;
      const result = callback(envelopeItem, envelopeItemType);

      if (result) {
        return true;
      }
    }

    return false;
  }

  /**
   * Encode a string to UTF8 array.
   */
  function encodeUTF8(input) {
    return GLOBAL_OBJ.__SENTRY__ && GLOBAL_OBJ.__SENTRY__.encodePolyfill
      ? GLOBAL_OBJ.__SENTRY__.encodePolyfill(input)
      : new TextEncoder().encode(input);
  }

  /**
   * Serializes an envelope.
   */
  function serializeEnvelope(envelope) {
    const [envHeaders, items] = envelope;

    // Initially we construct our envelope as a string and only convert to binary chunks if we encounter binary data
    let parts = JSON.stringify(envHeaders);

    function append(next) {
      if (typeof parts === 'string') {
        parts = typeof next === 'string' ? parts + next : [encodeUTF8(parts), next];
      } else {
        parts.push(typeof next === 'string' ? encodeUTF8(next) : next);
      }
    }

    for (const item of items) {
      const [itemHeaders, payload] = item;

      append(`\n${JSON.stringify(itemHeaders)}\n`);

      if (typeof payload === 'string' || payload instanceof Uint8Array) {
        append(payload);
      } else {
        let stringifiedPayload;
        try {
          stringifiedPayload = JSON.stringify(payload);
        } catch (e) {
          // In case, despite all our efforts to keep `payload` circular-dependency-free, `JSON.strinify()` still
          // fails, we try again after normalizing it again with infinite normalization depth. This of course has a
          // performance impact but in this case a performance hit is better than throwing.
          stringifiedPayload = JSON.stringify(normalize(payload));
        }
        append(stringifiedPayload);
      }
    }

    return typeof parts === 'string' ? parts : concatBuffers(parts);
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
   * Creates envelope item for a single span
   */
  function createSpanEnvelopeItem(spanJson) {
    const spanHeaders = {
      type: 'span',
    };

    return [spanHeaders, spanJson];
  }

  /**
   * Creates attachment envelope items
   */
  function createAttachmentEnvelopeItem(attachment) {
    const buffer = typeof attachment.data === 'string' ? encodeUTF8(attachment.data) : attachment.data;

    return [
      dropUndefinedKeys({
        type: 'attachment',
        length: buffer.length,
        filename: attachment.filename,
        content_type: attachment.contentType,
        attachment_type: attachment.attachmentType,
      }),
      buffer,
    ];
  }

  const ITEM_TYPE_TO_DATA_CATEGORY_MAP = {
    session: 'session',
    sessions: 'session',
    attachment: 'attachment',
    transaction: 'transaction',
    event: 'error',
    client_report: 'internal',
    user_report: 'default',
    profile: 'profile',
    profile_chunk: 'profile',
    replay_event: 'replay',
    replay_recording: 'replay',
    check_in: 'monitor',
    feedback: 'feedback',
    span: 'span',
    statsd: 'metric_bucket',
  };

  /**
   * Maps the type of an envelope item to a data category.
   */
  function envelopeItemTypeToDataCategory(type) {
    return ITEM_TYPE_TO_DATA_CATEGORY_MAP[type];
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
   * Creates client report envelope
   * @param discarded_events An array of discard events
   * @param dsn A DSN that can be set on the header. Optional.
   */
  function createClientReportEnvelope(
    discarded_events,
    dsn,
    timestamp,
  ) {
    const clientReportItem = [
      { type: 'client_report' },
      {
        timestamp: timestamp || dateTimestampInSeconds(),
        discarded_events,
      },
    ];
    return createEnvelope(dsn ? { dsn } : {}, [clientReportItem]);
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

  // https://github.com/alangpierce/sucrase/tree/265887868966917f3b924ce38dfad01fbab1329f
  //
  // The MIT License (MIT)
  //
  // Copyright (c) 2012-2018 various contributors (see AUTHORS)
  //
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  //
  // The above copyright notice and this permission notice shall be included in all
  // copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  // SOFTWARE.

  /**
   * Polyfill for the nullish coalescing operator (`??`).
   *
   * Note that the RHS is wrapped in a function so that if it's a computed value, that evaluation won't happen unless the
   * LHS evaluates to a nullish value, to mimic the operator's short-circuiting behavior.
   *
   * Adapted from Sucrase (https://github.com/alangpierce/sucrase)
   *
   * @param lhs The value of the expression to the left of the `??`
   * @param rhsFn A function returning the value of the expression to the right of the `??`
   * @returns The LHS value, unless it's `null` or `undefined`, in which case, the RHS value
   */
  function _nullishCoalesce(lhs, rhsFn) {
    // by checking for loose equality to `null`, we catch both `null` and `undefined`
    return lhs != null ? lhs : rhsFn();
  }

  /**
   * Polyfill for the optional chain operator, `?.`, given previous conversion of the expression into an array of values,
   * descriptors, and functions.
   *
   * Adapted from Sucrase (https://github.com/alangpierce/sucrase)
   * See https://github.com/alangpierce/sucrase/blob/265887868966917f3b924ce38dfad01fbab1329f/src/transformers/OptionalChainingNullishTransformer.ts#L15
   *
   * @param ops Array result of expression conversion
   * @returns The value of the expression
   */
  function _optionalChain(ops) {
    let lastAccessLHS = undefined;
    let value = ops[0];
    let i = 1;
    while (i < ops.length) {
      const op = ops[i] ;
      const fn = ops[i + 1] ;
      i += 2;
      // by checking for loose equality to `null`, we catch both `null` and `undefined`
      if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) {
        // really we're meaning to return `undefined` as an actual value here, but it saves bytes not to write it
        return;
      }
      if (op === 'access' || op === 'optionalAccess') {
        lastAccessLHS = value;
        value = fn(value);
      } else if (op === 'call' || op === 'optionalCall') {
        value = fn((...args) => (value ).call(lastAccessLHS, ...args));
        lastAccessLHS = undefined;
      }
    }
    return value;
  }

  /**
   * Returns a new minimal propagation context
   */
  function generatePropagationContext() {
    return {
      traceId: uuid4(),
      spanId: uuid4().substring(16),
    };
  }

  // Based on https://github.com/angular/angular.js/pull/13945/files
  // The MIT License

  const WINDOW$4 = GLOBAL_OBJ ;

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
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromeVar = (WINDOW$4 ).chrome;
    const isChromePackagedApp = chromeVar && chromeVar.app && chromeVar.app.runtime;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    const hasHistoryApi = 'history' in WINDOW$4 && !!WINDOW$4.history.pushState && !!WINDOW$4.history.replaceState;

    return !isChromePackagedApp && hasHistoryApi;
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

  /**
   * Creates a new `Session` object by setting certain default parameters. If optional @param context
   * is passed, the passed properties are applied to the session object.
   *
   * @param context (optional) additional properties to be applied to the returned session object
   *
   * @returns a new `Session` object
   */
  function makeSession$1(context) {
    // Both timestamp and started are in seconds since the UNIX epoch.
    const startingTime = timestampInSeconds();

    const session = {
      sid: uuid4(),
      init: true,
      timestamp: startingTime,
      started: startingTime,
      duration: 0,
      status: 'ok',
      errors: 0,
      ignoreDuration: false,
      toJSON: () => sessionToJSON(session),
    };

    if (context) {
      updateSession(session, context);
    }

    return session;
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
    if (status) {
      context = { status };
    } else if (session.status === 'ok') {
      context = { status: 'exited' };
    }

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
    return dropUndefinedKeys({
      sid: `${session.sid}`,
      init: session.init,
      // Make sure that sec is converted to ms for date constructor
      started: new Date(session.started * 1000).toISOString(),
      timestamp: new Date(session.timestamp * 1000).toISOString(),
      status: session.status,
      errors: session.errors,
      did: typeof session.did === 'number' || typeof session.did === 'string' ? `${session.did}` : undefined,
      duration: session.duration,
      abnormal_mechanism: session.abnormal_mechanism,
      attrs: {
        release: session.release,
        environment: session.environment,
        ip_address: session.ipAddress,
        user_agent: session.userAgent,
      },
    });
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
      this._propagationContext = generatePropagationContext();
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
     getRequestSession() {
      return this._requestSession;
    }

    /**
     * @inheritDoc
     */
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
          ? [scopeToMerge.getScopeData(), scopeToMerge.getRequestSession()]
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
      this._propagationContext = generatePropagationContext();

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
      this._sdkProcessingMetadata = { ...this._sdkProcessingMetadata, ...newData };

      return this;
    }

    /**
     * @inheritDoc
     */
     setPropagationContext(context) {
      this._propagationContext = context;
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
        logger.warn('No client configured on scope - will not capture exception!');
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
        logger.warn('No client configured on scope - will not capture message!');
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
        logger.warn('No client configured on scope - will not capture event!');
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

  // NOTE: By exporting this here as const & type, instead of doing `export class`,
  // We can get the correct class when importing from `@sentry/core`, but the original type (from `@sentry/types`)
  // This is helpful for interop, e.g. when doing `import type { Scope } from '@sentry/node';` (which re-exports this)

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

  function withScope$1(callback) {
    return getAsyncContextStack().withScope(callback);
  }

  function withSetScope(scope, callback) {
    const stack = getAsyncContextStack() ;
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
      withIsolationScope: withIsolationScope$1,
      withScope: withScope$1,
      withSetScope,
      withSetIsolationScope: (_isolationScope, callback) => {
        return withIsolationScope$1(callback);
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
   * The isolation scope is active for the current exection context.
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
   * Creates a new scope with and executes the given operation within.
   * The scope is automatically removed once the operation
   * finishes or throws.
   */

  /**
   * Either creates a new active scope, or sets the given scope as active scope in the given callback.
   */
  function withScope(
    ...rest
  ) {
    const carrier = getMainCarrier();
    const acs = getAsyncContextStrategy(carrier);

    // If a scope is defined, we want to make this the active scope instead of the default one
    if (rest.length === 2) {
      const [scope, callback] = rest;

      if (!scope) {
        return acs.withScope(callback);
      }

      return acs.withSetScope(scope, callback);
    }

    return acs.withScope(rest[0]);
  }

  /**
   * Attempts to fork the current isolation scope and the current scope based on the current async context strategy. If no
   * async context strategy is set, the isolation scope and the current scope will not be forked (this is currently the
   * case, for example, in the browser).
   *
   * Usage of this function in environments without async context strategy is discouraged and may lead to unexpected behaviour.
   *
   * This function is intended for Sentry SDK and SDK integration development. It is not recommended to be used in "normal"
   * applications directly because it comes with pitfalls. Use at your own risk!
   */

  /**
   * Either creates a new active isolation scope, or sets the given isolation scope as active scope in the given callback.
   */
  function withIsolationScope(
    ...rest

  ) {
    const carrier = getMainCarrier();
    const acs = getAsyncContextStrategy(carrier);

    // If a scope is defined, we want to make this the active scope instead of the default one
    if (rest.length === 2) {
      const [isolationScope, callback] = rest;

      if (!isolationScope) {
        return acs.withIsolationScope(callback);
      }

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
   * Updates the metric summary on a span.
   */
  function updateMetricSummaryOnSpan(
    span,
    metricType,
    sanitizedName,
    value,
    unit,
    tags,
    bucketKey,
  ) {
    const existingStorage = (span )[METRICS_SPAN_FIELD];
    const storage =
      existingStorage ||
      ((span )[METRICS_SPAN_FIELD] = new Map());

    const exportKey = `${metricType}:${sanitizedName}@${unit}`;
    const bucketItem = storage.get(bucketKey);

    if (bucketItem) {
      const [, summary] = bucketItem;
      storage.set(bucketKey, [
        exportKey,
        {
          min: Math.min(summary.min, value),
          max: Math.max(summary.max, value),
          count: (summary.count += 1),
          sum: (summary.sum += value),
          tags: summary.tags,
        },
      ]);
    } else {
      storage.set(bucketKey, [
        exportKey,
        {
          min: value,
          max: value,
          count: 1,
          sum: value,
          tags,
        },
      ]);
    }
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

  /** The reason why an idle span finished. */
  const SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON = 'sentry.idle_span_finish_reason';

  /** The unit of a measurement, which may be stored as a TimedEvent. */
  const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT = 'sentry.measurement_unit';

  /** The value of a measurement, which may be stored as a TimedEvent. */
  const SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE = 'sentry.measurement_value';

  /**
   * The id of the profile that this span occured in.
   */
  const SEMANTIC_ATTRIBUTE_PROFILE_ID = 'sentry.profile_id';

  const SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME = 'sentry.exclusive_time';

  const SPAN_STATUS_UNSET = 0;
  const SPAN_STATUS_OK = 1;
  const SPAN_STATUS_ERROR = 2;

  /**
   * Converts a HTTP status code into a sentry status with a message.
   *
   * @param httpStatus The HTTP response status code.
   * @returns The span status or unknown_error.
   */
  // https://develop.sentry.dev/sdk/event-payloads/span/
  function getSpanStatusFromHttpCode(httpStatus) {
    if (httpStatus < 400 && httpStatus >= 100) {
      return { code: SPAN_STATUS_OK };
    }

    if (httpStatus >= 400 && httpStatus < 500) {
      switch (httpStatus) {
        case 401:
          return { code: SPAN_STATUS_ERROR, message: 'unauthenticated' };
        case 403:
          return { code: SPAN_STATUS_ERROR, message: 'permission_denied' };
        case 404:
          return { code: SPAN_STATUS_ERROR, message: 'not_found' };
        case 409:
          return { code: SPAN_STATUS_ERROR, message: 'already_exists' };
        case 413:
          return { code: SPAN_STATUS_ERROR, message: 'failed_precondition' };
        case 429:
          return { code: SPAN_STATUS_ERROR, message: 'resource_exhausted' };
        case 499:
          return { code: SPAN_STATUS_ERROR, message: 'cancelled' };
        default:
          return { code: SPAN_STATUS_ERROR, message: 'invalid_argument' };
      }
    }

    if (httpStatus >= 500 && httpStatus < 600) {
      switch (httpStatus) {
        case 501:
          return { code: SPAN_STATUS_ERROR, message: 'unimplemented' };
        case 503:
          return { code: SPAN_STATUS_ERROR, message: 'unavailable' };
        case 504:
          return { code: SPAN_STATUS_ERROR, message: 'deadline_exceeded' };
        default:
          return { code: SPAN_STATUS_ERROR, message: 'internal_error' };
      }
    }

    return { code: SPAN_STATUS_ERROR, message: 'unknown_error' };
  }

  /**
   * Sets the Http status attributes on the current span based on the http code.
   * Additionally, the span's status is updated, depending on the http code.
   */
  function setHttpStatus(span, httpStatus) {
    span.setAttribute('http.response.status_code', httpStatus);

    const spanStatus = getSpanStatusFromHttpCode(httpStatus);
    if (spanStatus.message !== 'unknown_error') {
      span.setStatus(spanStatus);
    }
  }

  // These are aligned with OpenTelemetry trace flags
  const TRACE_FLAG_NONE = 0x0;
  const TRACE_FLAG_SAMPLED = 0x1;

  /**
   * Convert a span to a trace context, which can be sent as the `trace` context in an event.
   * By default, this will only include trace_id, span_id & parent_span_id.
   * If `includeAllData` is true, it will also include data, op, status & origin.
   */
  function spanToTransactionTraceContext(span) {
    const { spanId: span_id, traceId: trace_id } = span.spanContext();
    const { data, op, parent_span_id, status, origin } = spanToJSON(span);

    return dropUndefinedKeys({
      parent_span_id,
      span_id,
      trace_id,
      data,
      op,
      status,
      origin,
    });
  }

  /**
   * Convert a span to a trace context, which can be sent as the `trace` context in a non-transaction event.
   */
  function spanToTraceContext(span) {
    const { spanId: span_id, traceId: trace_id } = span.spanContext();
    const { parent_span_id } = spanToJSON(span);

    return dropUndefinedKeys({ parent_span_id, span_id, trace_id });
  }

  /**
   * Convert a Span to a Sentry trace header.
   */
  function spanToTraceHeader(span) {
    const { traceId, spanId } = span.spanContext();
    const sampled = spanIsSampled(span);
    return generateSentryTraceHeader(traceId, spanId, sampled);
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

  const CHILD_SPANS_FIELD = '_sentryChildSpans';
  const ROOT_SPAN_FIELD = '_sentryRootSpan';

  /**
   * Adds an opaque child span reference to a span.
   */
  function addChildSpanToSpan(span, childSpan) {
    // We store the root span reference on the child span
    // We need this for `getRootSpan()` to work
    const rootSpan = span[ROOT_SPAN_FIELD] || span;
    addNonEnumerableProperty(childSpan , ROOT_SPAN_FIELD, rootSpan);

    // We store a list of child spans on the parent span
    // We need this for `getSpanDescendants()` to work
    if (span[CHILD_SPANS_FIELD]) {
      span[CHILD_SPANS_FIELD].add(childSpan);
    } else {
      addNonEnumerableProperty(span, CHILD_SPANS_FIELD, new Set([childSpan]));
    }
  }

  /** This is only used internally by Idle Spans. */
  function removeChildSpanFromSpan(span, childSpan) {
    if (span[CHILD_SPANS_FIELD]) {
      span[CHILD_SPANS_FIELD].delete(childSpan);
    }
  }

  /**
   * Returns an array of the given span and all of its descendants.
   */
  function getSpanDescendants(span) {
    const resultSet = new Set();

    function addSpanChildren(span) {
      // This exit condition is required to not infinitely loop in case of a circular dependency.
      if (resultSet.has(span)) {
        return;
        // We want to ignore unsampled spans (e.g. non recording spans)
      } else if (spanIsSampled(span)) {
        resultSet.add(span);
        const childSpans = span[CHILD_SPANS_FIELD] ? Array.from(span[CHILD_SPANS_FIELD]) : [];
        for (const childSpan of childSpans) {
          addSpanChildren(childSpan);
        }
      }
    }

    addSpanChildren(span);

    return Array.from(resultSet);
  }

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

  /**
   * Updates the metric summary on the currently active span
   */
  function updateMetricSummaryOnActiveSpan(
    metricType,
    sanitizedName,
    value,
    unit,
    tags,
    bucketKey,
  ) {
    const span = getActiveSpan();
    if (span) {
      updateMetricSummaryOnSpan(span, metricType, sanitizedName, value, unit, tags, bucketKey);
    }
  }

  let errorsInstrumented = false;

  /**
   * Ensure that global errors automatically set the active span status.
   */
  function registerSpanErrorInstrumentation() {
    if (errorsInstrumented) {
      return;
    }

    errorsInstrumented = true;
    addGlobalErrorInstrumentationHandler(errorCallback);
    addGlobalUnhandledRejectionInstrumentationHandler(errorCallback);
  }

  /**
   * If an error or unhandled promise occurs, we mark the active root span as failed
   */
  function errorCallback() {
    const activeSpan = getActiveSpan();
    const rootSpan = activeSpan && getRootSpan(activeSpan);
    if (rootSpan) {
      const message = 'internal_error';
      logger.log(`[Tracing] Root span: ${message} -> Global error occured`);
      rootSpan.setStatus({ code: SPAN_STATUS_ERROR, message });
    }
  }

  // The function name will be lost when bundling but we need to be able to identify this listener later to maintain the
  // node.js default exit behaviour
  errorCallback.tag = 'sentry_tracingErrorCallback';

  const SCOPE_ON_START_SPAN_FIELD = '_sentryScope';
  const ISOLATION_SCOPE_ON_START_SPAN_FIELD = '_sentryIsolationScope';

  /** Store the scope & isolation scope for a span, which can the be used when it is finished. */
  function setCapturedScopesOnSpan(span, scope, isolationScope) {
    if (span) {
      addNonEnumerableProperty(span, ISOLATION_SCOPE_ON_START_SPAN_FIELD, isolationScope);
      addNonEnumerableProperty(span, SCOPE_ON_START_SPAN_FIELD, scope);
    }
  }

  /**
   * Grabs the scope and isolation scope off a span that were active when the span was started.
   */
  function getCapturedScopesOnSpan(span) {
    return {
      scope: (span )[SCOPE_ON_START_SPAN_FIELD],
      isolationScope: (span )[ISOLATION_SCOPE_ON_START_SPAN_FIELD],
    };
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
    const options = maybeOptions || (client && client.getOptions());
    // eslint-disable-next-line deprecation/deprecation
    return !!options && (options.enableTracing || 'tracesSampleRate' in options || 'tracesSampler' in options);
  }

  /**
   * A Sentry Span that is non-recording, meaning it will not be sent to Sentry.
   */
  class SentryNonRecordingSpan  {

     constructor(spanContext = {}) {
      this._traceId = spanContext.traceId || uuid4();
      this._spanId = spanContext.spanId || uuid4().substring(16);
    }

    /** @inheritdoc */
     spanContext() {
      return {
        spanId: this._spanId,
        traceId: this._traceId,
        traceFlags: TRACE_FLAG_NONE,
      };
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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
     addEvent(
      _name,
      _attributesOrStartTime,
      _startTime,
    ) {
      return this;
    }

    /**
     * This should generally not be used,
     * but we need it for being comliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     addLink(_link) {
      return this;
    }

    /**
     * This should generally not be used,
     * but we need it for being comliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     addLinks(_links) {
      return this;
    }

    /**
     * This should generally not be used,
     * but we need it for being comliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     recordException(_exception, _time) {
      // noop
    }
  }

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
  function handleCallbackErrors

  (
    fn,
    onError,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onFinally = () => {},
  ) {
    let maybePromiseResult;
    try {
      maybePromiseResult = fn();
    } catch (e) {
      onError(e);
      onFinally();
      throw e;
    }

    return maybeHandlePromiseRejection(maybePromiseResult, onError, onFinally);
  }

  /**
   * Maybe handle a promise rejection.
   * This expects to be given a value that _may_ be a promise, or any other value.
   * If it is a promise, and it rejects, it will call the `onError` callback.
   * Other than this, it will generally return the given value as-is.
   */
  function maybeHandlePromiseRejection(
    value,
    onError,
    onFinally,
  ) {
    if (isThenable(value)) {
      // @ts-expect-error - the isThenable check returns the "wrong" type here
      return value.then(
        res => {
          onFinally();
          return res;
        },
        e => {
          onError(e);
          onFinally();
          throw e;
        },
      );
    }

    onFinally();
    return value;
  }

  const DEFAULT_ENVIRONMENT = 'production';

  /**
   * If you change this value, also update the terser plugin config to
   * avoid minification of the object property!
   */
  const FROZEN_DSC_FIELD = '_frozenDsc';

  /**
   * Freeze the given DSC on the given span.
   */
  function freezeDscOnSpan(span, dsc) {
    const spanWithMaybeDsc = span ;
    addNonEnumerableProperty(spanWithMaybeDsc, FROZEN_DSC_FIELD, dsc);
  }

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

    const dsc = getDynamicSamplingContextFromClient(spanToJSON(span).trace_id || '', client);

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

    dsc.sampled = String(spanIsSampled(rootSpan));

    client.emit('createDsc', dsc, rootSpan);

    return dsc;
  }

  /**
   * Convert a Span to a baggage header.
   */
  function spanToBaggageHeader(span) {
    const dsc = getDynamicSamplingContextFromSpan(span);
    return dynamicSamplingContextToSentryBaggageHeader(dsc);
  }

  /**
   * Print a log message for a started span.
   */
  function logSpanStart(span) {

    const { description = '< unknown name >', op = '< unknown op >', parent_span_id: parentSpanId } = spanToJSON(span);
    const { spanId } = span.spanContext();

    const sampled = spanIsSampled(span);
    const rootSpan = getRootSpan(span);
    const isRootSpan = rootSpan === span;

    const header = `[Tracing] Starting ${sampled ? 'sampled' : 'unsampled'} ${isRootSpan ? 'root ' : ''}span`;

    const infoParts = [`op: ${op}`, `name: ${description}`, `ID: ${spanId}`];

    if (parentSpanId) {
      infoParts.push(`parent ID: ${parentSpanId}`);
    }

    if (!isRootSpan) {
      const { op, description } = spanToJSON(rootSpan);
      infoParts.push(`root ID: ${rootSpan.spanContext().spanId}`);
      if (op) {
        infoParts.push(`root op: ${op}`);
      }
      if (description) {
        infoParts.push(`root description: ${description}`);
      }
    }

    logger.log(`${header}
  ${infoParts.join('\n  ')}`);
  }

  /**
   * Print a log message for an ended span.
   */
  function logSpanEnd(span) {

    const { description = '< unknown name >', op = '< unknown op >' } = spanToJSON(span);
    const { spanId } = span.spanContext();
    const rootSpan = getRootSpan(span);
    const isRootSpan = rootSpan === span;

    const msg = `[Tracing] Finishing "${op}" ${isRootSpan ? 'root ' : ''}span "${description}" with ID ${spanId}`;
    logger.log(msg);
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
      logger.warn(
          `[Tracing] Given sample rate is invalid. Sample rate must be a boolean or a number between 0 and 1. Got ${JSON.stringify(
          sampleRate,
        )} of type ${JSON.stringify(typeof sampleRate)}.`,
        );
      return undefined;
    }

    return rate;
  }

  /**
   * Makes a sampling decision for the given options.
   *
   * Called every time a root span is created. Only root spans which emerge with a `sampled` value of `true` will be
   * sent to Sentry.
   */
  function sampleSpan(
    options,
    samplingContext,
  ) {
    // nothing to do if tracing is not enabled
    if (!hasTracingEnabled(options)) {
      return [false];
    }

    // we would have bailed already if neither `tracesSampler` nor `tracesSampleRate` nor `enableTracing` were defined, so one of these should
    // work; prefer the hook if so
    let sampleRate;
    if (typeof options.tracesSampler === 'function') {
      sampleRate = options.tracesSampler(samplingContext);
    } else if (samplingContext.parentSampled !== undefined) {
      sampleRate = samplingContext.parentSampled;
    } else if (typeof options.tracesSampleRate !== 'undefined') {
      sampleRate = options.tracesSampleRate;
    } else {
      // When `enableTracing === true`, we use a sample rate of 100%
      sampleRate = 1;
    }

    // Since this is coming from the user (or from a function provided by the user), who knows what we might get.
    // (The only valid values are booleans or numbers between 0 and 1.)
    const parsedSampleRate = parseSampleRate(sampleRate);

    if (parsedSampleRate === undefined) {
      logger.warn('[Tracing] Discarding transaction because of invalid sample rate.');
      return [false];
    }

    // if the function returned 0 (or false), or if `tracesSampleRate` is 0, it's a sign the transaction should be dropped
    if (!parsedSampleRate) {
      logger.log(
          `[Tracing] Discarding transaction because ${
          typeof options.tracesSampler === 'function'
            ? 'tracesSampler returned 0 or false'
            : 'a negative sampling decision was inherited or tracesSampleRate is set to 0'
        }`,
        );
      return [false, parsedSampleRate];
    }

    // Now we roll the dice. Math.random is inclusive of 0, but not of 1, so strict < is safe here. In case sampleRate is
    // a boolean, the < comparison will cause it to be automatically cast to 1 if it's true and 0 if it's false.
    const shouldSample = Math.random() < parsedSampleRate;

    // if we're not going to keep it, we're done
    if (!shouldSample) {
      logger.log(
          `[Tracing] Discarding transaction because it's not included in the random sample (sampling rate = ${Number(
          sampleRate,
        )})`,
        );
      return [false, parsedSampleRate];
    }

    return [true, parsedSampleRate];
  }

  /**
   * Apply SdkInfo (name, version, packages, integrations) to the corresponding event key.
   * Merge with existing data if any.
   **/
  function enhanceEventWithSdkInfo(event, sdkInfo) {
    if (!sdkInfo) {
      return event;
    }
    event.sdk = event.sdk || {};
    event.sdk.name = event.sdk.name || sdkInfo.name;
    event.sdk.version = event.sdk.version || sdkInfo.version;
    event.sdk.integrations = [...(event.sdk.integrations || []), ...(sdkInfo.integrations || [])];
    event.sdk.packages = [...(event.sdk.packages || []), ...(sdkInfo.packages || [])];
    return event;
  }

  /** Creates an envelope from a Session */
  function createSessionEnvelope(
    session,
    dsn,
    metadata,
    tunnel,
  ) {
    const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);
    const envelopeHeaders = {
      sent_at: new Date().toISOString(),
      ...(sdkInfo && { sdk: sdkInfo }),
      ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
    };

    const envelopeItem =
      'aggregates' in session ? [{ type: 'sessions' }, session] : [{ type: 'session' }, session.toJSON()];

    return createEnvelope(envelopeHeaders, [envelopeItem]);
  }

  /**
   * Create an Envelope from an event.
   */
  function createEventEnvelope(
    event,
    dsn,
    metadata,
    tunnel,
  ) {
    const sdkInfo = getSdkMetadataForEnvelopeHeader(metadata);

    /*
      Note: Due to TS, event.type may be `replay_event`, theoretically.
      In practice, we never call `createEventEnvelope` with `replay_event` type,
      and we'd have to adjut a looot of types to make this work properly.
      We want to avoid casting this around, as that could lead to bugs (e.g. when we add another type)
      So the safe choice is to really guard against the replay_event type here.
    */
    const eventType = event.type && event.type !== 'replay_event' ? event.type : 'event';

    enhanceEventWithSdkInfo(event, metadata && metadata.sdk);

    const envelopeHeaders = createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn);

    // Prevent this data (which, if it exists, was used in earlier steps in the processing pipeline) from being sent to
    // sentry. (Note: Our use of this property comes and goes with whatever we might be debugging, whatever hacks we may
    // have temporarily added, etc. Even if we don't happen to be using it at some point in the future, let's not get rid
    // of this `delete`, lest we miss putting it back in the next time the property is in use.)
    delete event.sdkProcessingMetadata;

    const eventItem = [{ type: eventType }, event];
    return createEnvelope(envelopeHeaders, [eventItem]);
  }

  /**
   * Create envelope from Span item.
   *
   * Takes an optional client and runs spans through `beforeSendSpan` if available.
   */
  function createSpanEnvelope(spans, client) {
    function dscHasRequiredProps(dsc) {
      return !!dsc.trace_id && !!dsc.public_key;
    }

    // For the moment we'll obtain the DSC from the first span in the array
    // This might need to be changed if we permit sending multiple spans from
    // different segments in one envelope
    const dsc = getDynamicSamplingContextFromSpan(spans[0]);

    const dsn = client && client.getDsn();
    const tunnel = client && client.getOptions().tunnel;

    const headers = {
      sent_at: new Date().toISOString(),
      ...(dscHasRequiredProps(dsc) && { trace: dsc }),
      ...(!!tunnel && dsn && { dsn: dsnToString(dsn) }),
    };

    const beforeSendSpan = client && client.getOptions().beforeSendSpan;
    const convertToSpanJSON = beforeSendSpan
      ? (span) => beforeSendSpan(spanToJSON(span) )
      : (span) => spanToJSON(span);

    const items = [];
    for (const span of spans) {
      const spanJson = convertToSpanJSON(span);
      if (spanJson) {
        items.push(createSpanEnvelopeItem(spanJson));
      }
    }

    return createEnvelope(headers, items);
  }

  /**
   * Adds a measurement to the current active transaction.
   */
  function setMeasurement(name, value, unit) {
    const activeSpan = getActiveSpan();
    const rootSpan = activeSpan && getRootSpan(activeSpan);

    if (rootSpan) {
      rootSpan.addEvent(name, {
        [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: value,
        [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: unit ,
      });
    }
  }

  /**
   * Convert timed events to measurements.
   */
  function timedEventsToMeasurements(events) {
    if (!events || events.length === 0) {
      return undefined;
    }

    const measurements = {};
    events.forEach(event => {
      const attributes = event.attributes || {};
      const unit = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT] ;
      const value = attributes[SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE] ;

      if (typeof unit === 'string' && typeof value === 'number') {
        measurements[event.name] = { value, unit };
      }
    });

    return measurements;
  }

  const MAX_SPAN_COUNT = 1000;

  /**
   * Span contains all data about a span
   */
  class SentrySpan  {

    /** Epoch timestamp in seconds when the span started. */

    /** Epoch timestamp in seconds when the span ended. */

    /** Internal keeper of the status */

    /** The timed events added to this span. */

    /** if true, treat span as a standalone span (not part of a transaction) */

    /**
     * You should never call the constructor manually, always use `Sentry.startSpan()`
     * or other span methods.
     * @internal
     * @hideconstructor
     * @hidden
     */
     constructor(spanContext = {}) {
      this._traceId = spanContext.traceId || uuid4();
      this._spanId = spanContext.spanId || uuid4().substring(16);
      this._startTime = spanContext.startTimestamp || timestampInSeconds();

      this._attributes = {};
      this.setAttributes({
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'manual',
        [SEMANTIC_ATTRIBUTE_SENTRY_OP]: spanContext.op,
        ...spanContext.attributes,
      });

      this._name = spanContext.name;

      if (spanContext.parentSpanId) {
        this._parentSpanId = spanContext.parentSpanId;
      }
      // We want to include booleans as well here
      if ('sampled' in spanContext) {
        this._sampled = spanContext.sampled;
      }
      if (spanContext.endTimestamp) {
        this._endTime = spanContext.endTimestamp;
      }

      this._events = [];

      this._isStandaloneSpan = spanContext.isStandalone;

      // If the span is already ended, ensure we finalize the span immediately
      if (this._endTime) {
        this._onSpanEnded();
      }
    }

    /**
     * This should generally not be used,
     * but it is needed for being compliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     addLink(_link) {
      return this;
    }

    /**
     * This should generally not be used,
     * but it is needed for being compliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     addLinks(_links) {
      return this;
    }

    /**
     * This should generally not be used,
     * but it is needed for being compliant with the OTEL Span interface.
     *
     * @hidden
     * @internal
     */
     recordException(_exception, _time) {
      // noop
    }

    /** @inheritdoc */
     spanContext() {
      const { _spanId: spanId, _traceId: traceId, _sampled: sampled } = this;
      return {
        spanId,
        traceId,
        traceFlags: sampled ? TRACE_FLAG_SAMPLED : TRACE_FLAG_NONE,
      };
    }

    /** @inheritdoc */
     setAttribute(key, value) {
      if (value === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this._attributes[key];
      } else {
        this._attributes[key] = value;
      }

      return this;
    }

    /** @inheritdoc */
     setAttributes(attributes) {
      Object.keys(attributes).forEach(key => this.setAttribute(key, attributes[key]));
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
      this._startTime = spanTimeInputToSeconds(timeInput);
    }

    /**
     * @inheritDoc
     */
     setStatus(value) {
      this._status = value;
      return this;
    }

    /**
     * @inheritDoc
     */
     updateName(name) {
      this._name = name;
      return this;
    }

    /** @inheritdoc */
     end(endTimestamp) {
      // If already ended, skip
      if (this._endTime) {
        return;
      }

      this._endTime = spanTimeInputToSeconds(endTimestamp);
      logSpanEnd(this);

      this._onSpanEnded();
    }

    /**
     * Get JSON representation of this span.
     *
     * @hidden
     * @internal This method is purely for internal purposes and should not be used outside
     * of SDK code. If you need to get a JSON representation of a span,
     * use `spanToJSON(span)` instead.
     */
     getSpanJSON() {
      return dropUndefinedKeys({
        data: this._attributes,
        description: this._name,
        op: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP],
        parent_span_id: this._parentSpanId,
        span_id: this._spanId,
        start_timestamp: this._startTime,
        status: getStatusMessage(this._status),
        timestamp: this._endTime,
        trace_id: this._traceId,
        origin: this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ,
        _metrics_summary: getMetricSummaryJsonForSpan(this),
        profile_id: this._attributes[SEMANTIC_ATTRIBUTE_PROFILE_ID] ,
        exclusive_time: this._attributes[SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME] ,
        measurements: timedEventsToMeasurements(this._events),
        is_segment: (this._isStandaloneSpan && getRootSpan(this) === this) || undefined,
        segment_id: this._isStandaloneSpan ? getRootSpan(this).spanContext().spanId : undefined,
      });
    }

    /** @inheritdoc */
     isRecording() {
      return !this._endTime && !!this._sampled;
    }

    /**
     * @inheritdoc
     */
     addEvent(
      name,
      attributesOrStartTime,
      startTime,
    ) {
      logger.log('[Tracing] Adding an event to span:', name);

      const time = isSpanTimeInput(attributesOrStartTime) ? attributesOrStartTime : startTime || timestampInSeconds();
      const attributes = isSpanTimeInput(attributesOrStartTime) ? {} : attributesOrStartTime || {};

      const event = {
        name,
        time: spanTimeInputToSeconds(time),
        attributes,
      };

      this._events.push(event);

      return this;
    }

    /**
     * This method should generally not be used,
     * but for now we need a way to publicly check if the `_isStandaloneSpan` flag is set.
     * USE THIS WITH CAUTION!
     * @internal
     * @hidden
     * @experimental
     */
     isStandaloneSpan() {
      return !!this._isStandaloneSpan;
    }

    /** Emit `spanEnd` when the span is ended. */
     _onSpanEnded() {
      const client = getClient();
      if (client) {
        client.emit('spanEnd', this);
      }

      // A segment span is basically the root span of a local span tree.
      // So for now, this is either what we previously refer to as the root span,
      // or a standalone span.
      const isSegmentSpan = this._isStandaloneSpan || this === getRootSpan(this);

      if (!isSegmentSpan) {
        return;
      }

      // if this is a standalone span, we send it immediately
      if (this._isStandaloneSpan) {
        if (this._sampled) {
          sendSpanEnvelope(createSpanEnvelope([this], client));
        } else {
          logger.log('[Tracing] Discarding standalone span because its trace was not chosen to be sampled.');
          if (client) {
            client.recordDroppedEvent('sample_rate', 'span');
          }
        }
        return;
      }

      const transactionEvent = this._convertSpanToTransaction();
      if (transactionEvent) {
        const scope = getCapturedScopesOnSpan(this).scope || getCurrentScope();
        scope.captureEvent(transactionEvent);
      }
    }

    /**
     * Finish the transaction & prepare the event to send to Sentry.
     */
     _convertSpanToTransaction() {
      // We can only convert finished spans
      if (!isFullFinishedSpan(spanToJSON(this))) {
        return undefined;
      }

      if (!this._name) {
        logger.warn('Transaction has no name, falling back to `<unlabeled transaction>`.');
        this._name = '<unlabeled transaction>';
      }

      const { scope: capturedSpanScope, isolationScope: capturedSpanIsolationScope } = getCapturedScopesOnSpan(this);
      const scope = capturedSpanScope || getCurrentScope();
      const client = scope.getClient() || getClient();

      if (this._sampled !== true) {
        // At this point if `sampled !== true` we want to discard the transaction.
        logger.log('[Tracing] Discarding transaction because its trace was not chosen to be sampled.');

        if (client) {
          client.recordDroppedEvent('sample_rate', 'transaction');
        }

        return undefined;
      }

      // The transaction span itself as well as any potential standalone spans should be filtered out
      const finishedSpans = getSpanDescendants(this).filter(span => span !== this && !isStandaloneSpan(span));

      const spans = finishedSpans.map(span => spanToJSON(span)).filter(isFullFinishedSpan);

      const source = this._attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] ;

      const transaction = {
        contexts: {
          trace: spanToTransactionTraceContext(this),
        },
        spans:
          // spans.sort() mutates the array, but `spans` is already a copy so we can safely do this here
          // we do not use spans anymore after this point
          spans.length > MAX_SPAN_COUNT
            ? spans.sort((a, b) => a.start_timestamp - b.start_timestamp).slice(0, MAX_SPAN_COUNT)
            : spans,
        start_timestamp: this._startTime,
        timestamp: this._endTime,
        transaction: this._name,
        type: 'transaction',
        sdkProcessingMetadata: {
          capturedSpanScope,
          capturedSpanIsolationScope,
          ...dropUndefinedKeys({
            dynamicSamplingContext: getDynamicSamplingContextFromSpan(this),
          }),
        },
        _metrics_summary: getMetricSummaryJsonForSpan(this),
        ...(source && {
          transaction_info: {
            source,
          },
        }),
      };

      const measurements = timedEventsToMeasurements(this._events);
      const hasMeasurements = measurements && Object.keys(measurements).length;

      if (hasMeasurements) {
        logger.log(
            '[Measurements] Adding measurements to transaction event',
            JSON.stringify(measurements, undefined, 2),
          );
        transaction.measurements = measurements;
      }

      return transaction;
    }
  }

  function isSpanTimeInput(value) {
    return (value && typeof value === 'number') || value instanceof Date || Array.isArray(value);
  }

  // We want to filter out any incomplete SpanJSON objects
  function isFullFinishedSpan(input) {
    return !!input.start_timestamp && !!input.timestamp && !!input.span_id && !!input.trace_id;
  }

  /** `SentrySpan`s can be sent as a standalone span rather than belonging to a transaction */
  function isStandaloneSpan(span) {
    return span instanceof SentrySpan && span.isStandaloneSpan();
  }

  /**
   * Sends a `SpanEnvelope`.
   *
   * Note: If the envelope's spans are dropped, e.g. via `beforeSendSpan`,
   * the envelope will not be sent either.
   */
  function sendSpanEnvelope(envelope) {
    const client = getClient();
    if (!client) {
      return;
    }

    const spanItems = envelope[1];
    if (!spanItems || spanItems.length === 0) {
      client.recordDroppedEvent('before_send', 'span');
      return;
    }

    const transport = client.getTransport();
    if (transport) {
      transport.send(envelope).then(null, reason => {
        logger.error('Error while sending span:', reason);
      });
    }
  }

  const SUPPRESS_TRACING_KEY = '__SENTRY_SUPPRESS_TRACING__';

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
  function startSpan(options, callback) {
    const acs = getAcs();
    if (acs.startSpan) {
      return acs.startSpan(options, callback);
    }

    const spanArguments = parseSentrySpanArguments(options);
    const { forceTransaction, parentSpan: customParentSpan } = options;

    return withScope(options.scope, () => {
      // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
      const wrapper = getActiveSpanWrapper(customParentSpan);

      return wrapper(() => {
        const scope = getCurrentScope();
        const parentSpan = getParentSpan(scope);

        const shouldSkipSpan = options.onlyIfParent && !parentSpan;
        const activeSpan = shouldSkipSpan
          ? new SentryNonRecordingSpan()
          : createChildOrRootSpan({
              parentSpan,
              spanArguments,
              forceTransaction,
              scope,
            });

        _setSpanForScope(scope, activeSpan);

        return handleCallbackErrors(
          () => callback(activeSpan),
          () => {
            // Only update the span status if it hasn't been changed yet, and the span is not yet finished
            const { status } = spanToJSON(activeSpan);
            if (activeSpan.isRecording() && (!status || status === 'ok')) {
              activeSpan.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
            }
          },
          () => activeSpan.end(),
        );
      });
    });
  }

  /**
   * Similar to `Sentry.startSpan`. Wraps a function with a transaction/span, but does not finish the span
   * after the function is done automatically. You'll have to call `span.end()` manually.
   *
   * The created span is the active span and will be used as parent by other spans created inside the function
   * and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
   *
   * You'll always get a span passed to the callback,
   * it may just be a non-recording span if the span is not sampled or if tracing is disabled.
   */
  function startSpanManual(options, callback) {
    const acs = getAcs();
    if (acs.startSpanManual) {
      return acs.startSpanManual(options, callback);
    }

    const spanArguments = parseSentrySpanArguments(options);
    const { forceTransaction, parentSpan: customParentSpan } = options;

    return withScope(options.scope, () => {
      // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
      const wrapper = getActiveSpanWrapper(customParentSpan);

      return wrapper(() => {
        const scope = getCurrentScope();
        const parentSpan = getParentSpan(scope);

        const shouldSkipSpan = options.onlyIfParent && !parentSpan;
        const activeSpan = shouldSkipSpan
          ? new SentryNonRecordingSpan()
          : createChildOrRootSpan({
              parentSpan,
              spanArguments,
              forceTransaction,
              scope,
            });

        _setSpanForScope(scope, activeSpan);

        function finishAndSetSpan() {
          activeSpan.end();
        }

        return handleCallbackErrors(
          () => callback(activeSpan, finishAndSetSpan),
          () => {
            // Only update the span status if it hasn't been changed yet, and the span is not yet finished
            const { status } = spanToJSON(activeSpan);
            if (activeSpan.isRecording() && (!status || status === 'ok')) {
              activeSpan.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
            }
          },
        );
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
  function startInactiveSpan(options) {
    const acs = getAcs();
    if (acs.startInactiveSpan) {
      return acs.startInactiveSpan(options);
    }

    const spanArguments = parseSentrySpanArguments(options);
    const { forceTransaction, parentSpan: customParentSpan } = options;

    // If `options.scope` is defined, we use this as as a wrapper,
    // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
    const wrapper = options.scope
      ? (callback) => withScope(options.scope, callback)
      : customParentSpan !== undefined
        ? (callback) => withActiveSpan(customParentSpan, callback)
        : (callback) => callback();

    return wrapper(() => {
      const scope = getCurrentScope();
      const parentSpan = getParentSpan(scope);

      const shouldSkipSpan = options.onlyIfParent && !parentSpan;

      if (shouldSkipSpan) {
        return new SentryNonRecordingSpan();
      }

      return createChildOrRootSpan({
        parentSpan,
        spanArguments,
        forceTransaction,
        scope,
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
  const continueTrace = (
    {
      sentryTrace,
      baggage,
    }

  ,
    callback,
  ) => {
    return withScope(scope => {
      const propagationContext = propagationContextFromHeaders(sentryTrace, baggage);
      scope.setPropagationContext(propagationContext);
      return callback();
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
    if (acs.withActiveSpan) {
      return acs.withActiveSpan(span, callback);
    }

    return withScope(scope => {
      _setSpanForScope(scope, span || undefined);
      return callback(scope);
    });
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
    return withScope(scope => {
      scope.setPropagationContext(generatePropagationContext());
      logger.info(`Starting a new trace with id ${scope.getPropagationContext().traceId}`);
      return withActiveSpan(null, callback);
    });
  }

  function createChildOrRootSpan({
    parentSpan,
    spanArguments,
    forceTransaction,
    scope,
  }

  ) {
    if (!hasTracingEnabled()) {
      return new SentryNonRecordingSpan();
    }

    const isolationScope = getIsolationScope();

    let span;
    if (parentSpan && !forceTransaction) {
      span = _startChildSpan(parentSpan, scope, spanArguments);
      addChildSpanToSpan(parentSpan, span);
    } else if (parentSpan) {
      // If we forced a transaction but have a parent span, make sure to continue from the parent span, not the scope
      const dsc = getDynamicSamplingContextFromSpan(parentSpan);
      const { traceId, spanId: parentSpanId } = parentSpan.spanContext();
      const parentSampled = spanIsSampled(parentSpan);

      span = _startRootSpan(
        {
          traceId,
          parentSpanId,
          ...spanArguments,
        },
        scope,
        parentSampled,
      );

      freezeDscOnSpan(span, dsc);
    } else {
      const {
        traceId,
        dsc,
        parentSpanId,
        sampled: parentSampled,
      } = {
        ...isolationScope.getPropagationContext(),
        ...scope.getPropagationContext(),
      };

      span = _startRootSpan(
        {
          traceId,
          parentSpanId,
          ...spanArguments,
        },
        scope,
        parentSampled,
      );

      if (dsc) {
        freezeDscOnSpan(span, dsc);
      }
    }

    logSpanStart(span);

    setCapturedScopesOnSpan(span, scope, isolationScope);

    return span;
  }

  /**
   * This converts StartSpanOptions to SentrySpanArguments.
   * For the most part (for now) we accept the same options,
   * but some of them need to be transformed.
   */
  function parseSentrySpanArguments(options) {
    const exp = options.experimental || {};
    const initialCtx = {
      isStandalone: exp.standalone,
      ...options,
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
    const carrier = getMainCarrier();
    return getAsyncContextStrategy(carrier);
  }

  function _startRootSpan(spanArguments, scope, parentSampled) {
    const client = getClient();
    const options = (client && client.getOptions()) || {};

    const { name = '', attributes } = spanArguments;
    const [sampled, sampleRate] = scope.getScopeData().sdkProcessingMetadata[SUPPRESS_TRACING_KEY]
      ? [false]
      : sampleSpan(options, {
          name,
          parentSampled,
          attributes,
          transactionContext: {
            name,
            parentSampled,
          },
        });

    const rootSpan = new SentrySpan({
      ...spanArguments,
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
        ...spanArguments.attributes,
      },
      sampled,
    });
    if (sampleRate !== undefined) {
      rootSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE, sampleRate);
    }

    if (client) {
      client.emit('spanStart', rootSpan);
    }

    return rootSpan;
  }

  /**
   * Creates a new `Span` while setting the current `Span.id` as `parentSpanId`.
   * This inherits the sampling decision from the parent span.
   */
  function _startChildSpan(parentSpan, scope, spanArguments) {
    const { spanId, traceId } = parentSpan.spanContext();
    const sampled = scope.getScopeData().sdkProcessingMetadata[SUPPRESS_TRACING_KEY] ? false : spanIsSampled(parentSpan);

    const childSpan = sampled
      ? new SentrySpan({
          ...spanArguments,
          parentSpanId: spanId,
          traceId,
          sampled,
        })
      : new SentryNonRecordingSpan({ traceId });

    addChildSpanToSpan(parentSpan, childSpan);

    const client = getClient();
    if (client) {
      client.emit('spanStart', childSpan);
      // If it has an endTimestamp, it's already ended
      if (spanArguments.endTimestamp) {
        client.emit('spanEnd', childSpan);
      }
    }

    return childSpan;
  }

  function getParentSpan(scope) {
    const span = _getSpanForScope(scope) ;

    if (!span) {
      return undefined;
    }

    const client = getClient();
    const options = client ? client.getOptions() : {};
    if (options.parentSpanIsAlwaysRootSpan) {
      return getRootSpan(span) ;
    }

    return span;
  }

  function getActiveSpanWrapper(parentSpan) {
    return parentSpan !== undefined
      ? (callback) => {
          return withActiveSpan(parentSpan, callback);
        }
      : (callback) => callback();
  }

  const TRACING_DEFAULTS = {
    idleTimeout: 1000,
    finalTimeout: 30000,
    childSpanTimeout: 15000,
  };

  const FINISH_REASON_HEARTBEAT_FAILED = 'heartbeatFailed';
  const FINISH_REASON_IDLE_TIMEOUT = 'idleTimeout';
  const FINISH_REASON_FINAL_TIMEOUT = 'finalTimeout';
  const FINISH_REASON_EXTERNAL_FINISH = 'externalFinish';

  /**
   * An idle span is a span that automatically finishes. It does this by tracking child spans as activities.
   * An idle span is always the active span.
   */
  function startIdleSpan(startSpanOptions, options = {}) {
    // Activities store a list of active spans
    const activities = new Map();

    // We should not use heartbeat if we finished a span
    let _finished = false;

    // Timer that tracks idleTimeout
    let _idleTimeoutID;

    // The reason why the span was finished
    let _finishReason = FINISH_REASON_EXTERNAL_FINISH;

    let _autoFinishAllowed = !options.disableAutoFinish;

    const _cleanupHooks = [];

    const {
      idleTimeout = TRACING_DEFAULTS.idleTimeout,
      finalTimeout = TRACING_DEFAULTS.finalTimeout,
      childSpanTimeout = TRACING_DEFAULTS.childSpanTimeout,
      beforeSpanEnd,
    } = options;

    const client = getClient();

    if (!client || !hasTracingEnabled()) {
      return new SentryNonRecordingSpan();
    }

    const scope = getCurrentScope();
    const previousActiveSpan = getActiveSpan();
    const span = _startIdleSpan(startSpanOptions);

    // We patch span.end to ensure we can run some things before the span is ended
    // eslint-disable-next-line @typescript-eslint/unbound-method
    span.end = new Proxy(span.end, {
      apply(target, thisArg, args) {
        if (beforeSpanEnd) {
          beforeSpanEnd(span);
        }

        // Just ensuring that this keeps working, even if we ever have more arguments here
        const [definedEndTimestamp, ...rest] = args;
        const timestamp = definedEndTimestamp || timestampInSeconds();
        const spanEndTimestamp = spanTimeInputToSeconds(timestamp);

        // Ensure we end with the last span timestamp, if possible
        const spans = getSpanDescendants(span).filter(child => child !== span);

        // If we have no spans, we just end, nothing else to do here
        if (!spans.length) {
          onIdleSpanEnded(spanEndTimestamp);
          return Reflect.apply(target, thisArg, [spanEndTimestamp, ...rest]);
        }

        const childEndTimestamps = spans
          .map(span => spanToJSON(span).timestamp)
          .filter(timestamp => !!timestamp) ;
        const latestSpanEndTimestamp = childEndTimestamps.length ? Math.max(...childEndTimestamps) : undefined;

        // In reality this should always exist here, but type-wise it may be undefined...
        const spanStartTimestamp = spanToJSON(span).start_timestamp;

        // The final endTimestamp should:
        // * Never be before the span start timestamp
        // * Be the latestSpanEndTimestamp, if there is one, and it is smaller than the passed span end timestamp
        // * Otherwise be the passed end timestamp
        // Final timestamp can never be after finalTimeout
        const endTimestamp = Math.min(
          spanStartTimestamp ? spanStartTimestamp + finalTimeout / 1000 : Infinity,
          Math.max(spanStartTimestamp || -Infinity, Math.min(spanEndTimestamp, latestSpanEndTimestamp || Infinity)),
        );

        onIdleSpanEnded(endTimestamp);
        return Reflect.apply(target, thisArg, [endTimestamp, ...rest]);
      },
    });

    /**
     * Cancels the existing idle timeout, if there is one.
     */
    function _cancelIdleTimeout() {
      if (_idleTimeoutID) {
        clearTimeout(_idleTimeoutID);
        _idleTimeoutID = undefined;
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
      _idleTimeoutID = setTimeout(() => {
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

      const endTimestamp = timestampInSeconds();
      // We need to add the timeout here to have the real endtimestamp of the idle span
      // Remember timestampInSeconds is in seconds, timeout is in ms
      _restartChildSpanTimeout(endTimestamp + childSpanTimeout / 1000);
    }

    /**
     * Remove an activity from usage
     * @param spanId The span id that represents the activity
     */
    function _popActivity(spanId) {
      if (activities.has(spanId)) {
        activities.delete(spanId);
      }

      if (activities.size === 0) {
        const endTimestamp = timestampInSeconds();
        // We need to add the timeout here to have the real endtimestamp of the idle span
        // Remember timestampInSeconds is in seconds, timeout is in ms
        _restartIdleTimeout(endTimestamp + idleTimeout / 1000);
      }
    }

    function onIdleSpanEnded(endTimestamp) {
      _finished = true;
      activities.clear();

      _cleanupHooks.forEach(cleanup => cleanup());

      _setSpanForScope(scope, previousActiveSpan);

      const spanJSON = spanToJSON(span);

      const { start_timestamp: startTimestamp } = spanJSON;
      // This should never happen, but to make TS happy...
      if (!startTimestamp) {
        return;
      }

      const attributes = spanJSON.data || {};
      if (!attributes[SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON]) {
        span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON, _finishReason);
      }

      logger.log(`[Tracing] Idle span "${spanJSON.op}" finished`);

      const childSpans = getSpanDescendants(span).filter(child => child !== span);

      let discardedSpans = 0;
      childSpans.forEach(childSpan => {
        // We cancel all pending spans with status "cancelled" to indicate the idle span was finished early
        if (childSpan.isRecording()) {
          childSpan.setStatus({ code: SPAN_STATUS_ERROR, message: 'cancelled' });
          childSpan.end(endTimestamp);
          logger.log('[Tracing] Cancelling span since span ended early', JSON.stringify(childSpan, undefined, 2));
        }

        const childSpanJSON = spanToJSON(childSpan);
        const { timestamp: childEndTimestamp = 0, start_timestamp: childStartTimestamp = 0 } = childSpanJSON;

        const spanStartedBeforeIdleSpanEnd = childStartTimestamp <= endTimestamp;

        // Add a delta with idle timeout so that we prevent false positives
        const timeoutWithMarginOfError = (finalTimeout + idleTimeout) / 1000;
        const spanEndedBeforeFinalTimeout = childEndTimestamp - childStartTimestamp <= timeoutWithMarginOfError;

        {
          const stringifiedSpan = JSON.stringify(childSpan, undefined, 2);
          if (!spanStartedBeforeIdleSpanEnd) {
            logger.log('[Tracing] Discarding span since it happened after idle span was finished', stringifiedSpan);
          } else if (!spanEndedBeforeFinalTimeout) {
            logger.log('[Tracing] Discarding span since it finished after idle span final timeout', stringifiedSpan);
          }
        }

        if (!spanEndedBeforeFinalTimeout || !spanStartedBeforeIdleSpanEnd) {
          removeChildSpanFromSpan(span, childSpan);
          discardedSpans++;
        }
      });

      if (discardedSpans > 0) {
        span.setAttribute('sentry.idle_span_discarded_spans', discardedSpans);
      }
    }

    _cleanupHooks.push(
      client.on('spanStart', startedSpan => {
        // If we already finished the idle span,
        // or if this is the idle span itself being started,
        // or if the started span has already been closed,
        // we don't care about it for activity
        if (_finished || startedSpan === span || !!spanToJSON(startedSpan).timestamp) {
          return;
        }

        const allSpans = getSpanDescendants(span);

        // If the span that was just started is a child of the idle span, we should track it
        if (allSpans.includes(startedSpan)) {
          _pushActivity(startedSpan.spanContext().spanId);
        }
      }),
    );

    _cleanupHooks.push(
      client.on('spanEnd', endedSpan => {
        if (_finished) {
          return;
        }

        _popActivity(endedSpan.spanContext().spanId);
      }),
    );

    _cleanupHooks.push(
      client.on('idleSpanEnableAutoFinish', spanToAllowAutoFinish => {
        if (spanToAllowAutoFinish === span) {
          _autoFinishAllowed = true;
          _restartIdleTimeout();

          if (activities.size) {
            _restartChildSpanTimeout();
          }
        }
      }),
    );

    // We only start the initial idle timeout if we are not delaying the auto finish
    if (!options.disableAutoFinish) {
      _restartIdleTimeout();
    }

    setTimeout(() => {
      if (!_finished) {
        span.setStatus({ code: SPAN_STATUS_ERROR, message: 'deadline_exceeded' });
        _finishReason = FINISH_REASON_FINAL_TIMEOUT;
        span.end();
      }
    }, finalTimeout);

    return span;
  }

  function _startIdleSpan(options) {
    const span = startInactiveSpan(options);

    _setSpanForScope(getCurrentScope(), span);

    logger.log('[Tracing] Started span is an idle span');

    return span;
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

        processor.id && result === null && logger.log(`Event processor "${processor.id}" dropped event`);

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
    mergeAndOverwriteScopeData(data, 'sdkProcessingMetadata', sdkProcessingMetadata);

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
    if (mergeVal && Object.keys(mergeVal).length) {
      // Clone object
      data[prop] = { ...data[prop] };
      for (const key in mergeVal) {
        if (Object.prototype.hasOwnProperty.call(mergeVal, key)) {
          data[prop][key] = mergeVal[key];
        }
      }
    }
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
    event.fingerprint = event.fingerprint ? arrayify(event.fingerprint) : [];

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
   *  Enhances event using the client configuration.
   *  It takes care of all "static" values like environment, release and `dist`,
   *  as well as truncating overly long values.
   * @param event event instance to be enhanced
   */
  function applyClientOptions(event, options) {
    const { environment, release, dist, maxValueLength = 250 } = options;

    if (!('environment' in event)) {
      event.environment = 'environment' in options ? environment : DEFAULT_ENVIRONMENT;
    }

    if (event.release === undefined && release !== undefined) {
      event.release = release;
    }

    if (event.dist === undefined && dist !== undefined) {
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

  const debugIdStackParserCache = new WeakMap();

  /**
   * Puts debug IDs into the stack frames of an error event.
   */
  function applyDebugIds(event, stackParser) {
    const debugIdMap = GLOBAL_OBJ._sentryDebugIds;

    if (!debugIdMap) {
      return;
    }

    let debugIdStackFramesCache;
    const cachedDebugIdStackFrameCache = debugIdStackParserCache.get(stackParser);
    if (cachedDebugIdStackFrameCache) {
      debugIdStackFramesCache = cachedDebugIdStackFrameCache;
    } else {
      debugIdStackFramesCache = new Map();
      debugIdStackParserCache.set(stackParser, debugIdStackFramesCache);
    }

    // Build a map of filename -> debug_id
    const filenameDebugIdMap = Object.entries(debugIdMap).reduce(
      (acc, [debugIdStackTrace, debugIdValue]) => {
        let parsedStack;
        const cachedParsedStack = debugIdStackFramesCache.get(debugIdStackTrace);
        if (cachedParsedStack) {
          parsedStack = cachedParsedStack;
        } else {
          parsedStack = stackParser(debugIdStackTrace);
          debugIdStackFramesCache.set(debugIdStackTrace, parsedStack);
        }

        for (let i = parsedStack.length - 1; i >= 0; i--) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const stackFrame = parsedStack[i];
          if (stackFrame.filename) {
            acc[stackFrame.filename] = debugIdValue;
            break;
          }
        }
        return acc;
      },
      {},
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event.exception.values.forEach(exception => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        exception.stacktrace.frames.forEach(frame => {
          if (frame.filename) {
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
    if (!hint) {
      return undefined;
    }

    // If you pass a Scope or `() => Scope` as CaptureContext, we just return this as captureContext
    if (hintIsScopeOrFunction(hint)) {
      return { captureContext: hint };
    }

    if (hintIsScopeContext(hint)) {
      return {
        captureContext: hint,
      };
    }

    return hint;
  }

  function hintIsScopeOrFunction(
    hint,
  ) {
    return hint instanceof Scope || typeof hint === 'function';
  }

  const captureContextKeys = [
    'user',
    'level',
    'extra',
    'contexts',
    'tags',
    'fingerprint',
    'requestSession',
    'propagationContext',
  ] ;

  function hintIsScopeContext(hint) {
    return Object.keys(hint).some(key => captureContextKeys.includes(key ));
  }

  /**
   * Captures an exception event and sends it to Sentry.
   *
   * @param exception The exception to capture.
   * @param hint Optional additional data to attach to the Sentry event.
   * @returns the id of the captured Sentry event.
   */
  function captureException(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exception,
    hint,
  ) {
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
    // This is necessary to provide explicit scopes upgrade, without changing the original
    // arity of the `captureMessage(message, level)` method.
    const level = typeof captureContext === 'string' ? captureContext : undefined;
    const context = typeof captureContext !== 'string' ? { captureContext } : undefined;
    return getCurrentScope().captureMessage(message, level, context);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   * Updates user context information for future events.
   *
   * @param user User context object to be set in the current context. Pass `null` to unset the user.
   */
  function setUser(user) {
    getIsolationScope().setUser(user);
  }

  /**
   * The last error event id of the isolation scope.
   *
   * Warning: This function really returns the last recorded error event id on the current
   * isolation scope. If you call this function after handling a certain error and another error
   * is captured in between, the last one is returned instead of the one you might expect.
   * Also, ids of events that were never sent to Sentry (for example because
   * they were dropped in `beforeSend`) could be returned.
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
    if (client) {
      return client.flush(timeout);
    }
    logger.warn('Cannot flush events. No client defined.');
    return Promise.resolve(false);
  }

  /**
   * Call `close()` on the current client, if there is one. See {@link Client.close}.
   *
   * @param timeout Maximum time in ms the client should wait to flush its event queue before shutting down. Omitting this
   * parameter will cause the client to wait until all events are sent before disabling itself.
   * @returns A promise which resolves to `true` if the queue successfully drains before the timeout, or `false` if it
   * doesn't (or if there's no client defined).
   */
  async function close(timeout) {
    const client = getClient();
    if (client) {
      return client.close(timeout);
    }
    logger.warn('Cannot flush events and disable SDK. No client defined.');
    return Promise.resolve(false);
  }

  /**
   * Returns true if Sentry has been properly initialized.
   */
  function isInitialized() {
    return !!getClient();
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
    const client = getClient();
    const isolationScope = getIsolationScope();
    const currentScope = getCurrentScope();

    const { release, environment = DEFAULT_ENVIRONMENT } = (client && client.getOptions()) || {};

    // Will fetch userAgent if called from browser sdk
    const { userAgent } = GLOBAL_OBJ.navigator || {};

    const session = makeSession$1({
      release,
      environment,
      user: currentScope.getUser() || isolationScope.getUser(),
      ...(userAgent && { userAgent }),
      ...context,
    });

    // End existing session if there's one
    const currentSession = isolationScope.getSession();
    if (currentSession && currentSession.status === 'ok') {
      updateSession(currentSession, { status: 'exited' });
    }

    endSession();

    // Afterwards we set the new session on the scope
    isolationScope.setSession(session);

    // TODO (v8): Remove this and only use the isolation scope(?).
    // For v7 though, we can't "soft-break" people using getCurrentHub().getScope().setSession()
    currentScope.setSession(session);

    return session;
  }

  /**
   * End the session on the current isolation scope.
   */
  function endSession() {
    const isolationScope = getIsolationScope();
    const currentScope = getCurrentScope();

    const session = currentScope.getSession() || isolationScope.getSession();
    if (session) {
      closeSession(session);
    }
    _sendSessionUpdate$1();

    // the session is over; take it off of the scope
    isolationScope.setSession();

    // TODO (v8): Remove this and only use the isolation scope(?).
    // For v7 though, we can't "soft-break" people using getCurrentHub().getScope().setSession()
    currentScope.setSession();
  }

  /**
   * Sends the current Session on the scope
   */
  function _sendSessionUpdate$1() {
    const isolationScope = getIsolationScope();
    const currentScope = getCurrentScope();
    const client = getClient();
    // TODO (v8): Remove currentScope and only use the isolation scope(?).
    // For v7 though, we can't "soft-break" people using getCurrentHub().getScope().setSession()
    const session = currentScope.getSession() || isolationScope.getSession();
    if (session && client) {
      client.captureSession(session);
    }
  }

  /**
   * Sends the current session on the scope to Sentry
   *
   * @param end If set the session will be marked as exited and removed from the scope.
   *            Defaults to `false`.
   */
  function captureSession(end = false) {
    // both send the update and pull the session from the scope
    if (end) {
      endSession();
      return;
    }

    // only send the update
    _sendSessionUpdate$1();
  }

  const SENTRY_API_VERSION = '7';

  /** Returns the prefix to construct Sentry ingestion API endpoints. */
  function getBaseApiEndpoint(dsn) {
    const protocol = dsn.protocol ? `${dsn.protocol}:` : '';
    const port = dsn.port ? `:${dsn.port}` : '';
    return `${protocol}//${dsn.host}${port}${dsn.path ? `/${dsn.path}` : ''}/api/`;
  }

  /** Returns the ingest API endpoint for target. */
  function _getIngestEndpoint(dsn) {
    return `${getBaseApiEndpoint(dsn)}${dsn.projectId}/envelope/`;
  }

  /** Returns a URL-encoded string with auth config suitable for a query string. */
  function _encodedAuth(dsn, sdkInfo) {
    return urlEncode({
      // We send only the minimum set of required information. See
      // https://github.com/getsentry/sentry-javascript/issues/2572.
      sentry_key: dsn.publicKey,
      sentry_version: SENTRY_API_VERSION,
      ...(sdkInfo && { sentry_client: `${sdkInfo.name}/${sdkInfo.version}` }),
    });
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
  function getReportDialogEndpoint(
    dsnLike,
    dialogOptions

  ,
  ) {
    const dsn = makeDsn(dsnLike);
    if (!dsn) {
      return '';
    }

    const endpoint = `${getBaseApiEndpoint(dsn)}embed/error-page/`;

    let encodedOptions = `dsn=${dsnToString(dsn)}`;
    for (const key in dialogOptions) {
      if (key === 'dsn') {
        continue;
      }

      if (key === 'onClose') {
        continue;
      }

      if (key === 'user') {
        const user = dialogOptions.user;
        if (!user) {
          continue;
        }
        if (user.name) {
          encodedOptions += `&name=${encodeURIComponent(user.name)}`;
        }
        if (user.email) {
          encodedOptions += `&email=${encodeURIComponent(user.email)}`;
        }
      } else {
        encodedOptions += `&${encodeURIComponent(key)}=${encodeURIComponent(dialogOptions[key] )}`;
      }
    }

    return `${endpoint}?${encodedOptions}`;
  }

  const installedIntegrations = [];

  /** Map of integrations assigned to a client */

  /**
   * Remove duplicates from the given array, preferring the last instance of any duplicate. Not guaranteed to
   * preseve the order of integrations in the array.
   *
   * @private
   */
  function filterDuplicates(integrations) {
    const integrationsByName = {};

    integrations.forEach(currentInstance => {
      const { name } = currentInstance;

      const existingInstance = integrationsByName[name];

      // We want integrations later in the array to overwrite earlier ones of the same type, except that we never want a
      // default instance to overwrite an existing user instance
      if (existingInstance && !existingInstance.isDefaultInstance && currentInstance.isDefaultInstance) {
        return;
      }

      integrationsByName[name] = currentInstance;
    });

    return Object.values(integrationsByName);
  }

  /** Gets integrations to install */
  function getIntegrationsToSetup(options) {
    const defaultIntegrations = options.defaultIntegrations || [];
    const userIntegrations = options.integrations;

    // We flag default instances, so that later we can tell them apart from any user-created instances of the same class
    defaultIntegrations.forEach(integration => {
      integration.isDefaultInstance = true;
    });

    let integrations;

    if (Array.isArray(userIntegrations)) {
      integrations = [...defaultIntegrations, ...userIntegrations];
    } else if (typeof userIntegrations === 'function') {
      integrations = arrayify(userIntegrations(defaultIntegrations));
    } else {
      integrations = defaultIntegrations;
    }

    const finalIntegrations = filterDuplicates(integrations);

    // The `Debug` integration prints copies of the `event` and `hint` which will be passed to `beforeSend` or
    // `beforeSendTransaction`. It therefore has to run after all other integrations, so that the changes of all event
    // processors will be reflected in the printed values. For lack of a more elegant way to guarantee that, we therefore
    // locate it and, assuming it exists, pop it out of its current spot and shove it onto the end of the array.
    const debugIndex = finalIntegrations.findIndex(integration => integration.name === 'Debug');
    if (debugIndex > -1) {
      const [debugInstance] = finalIntegrations.splice(debugIndex, 1) ;
      finalIntegrations.push(debugInstance);
    }

    return finalIntegrations;
  }

  /**
   * Given a list of integration instances this installs them all. When `withDefaults` is set to `true` then all default
   * integrations are added unless they were already provided before.
   * @param integrations array of integration instances
   * @param withDefault should enable default integrations
   */
  function setupIntegrations(client, integrations) {
    const integrationIndex = {};

    integrations.forEach(integration => {
      // guard against empty provided integrations
      if (integration) {
        setupIntegration(client, integration, integrationIndex);
      }
    });

    return integrationIndex;
  }

  /**
   * Execute the `afterAllSetup` hooks of the given integrations.
   */
  function afterSetupIntegrations(client, integrations) {
    for (const integration of integrations) {
      // guard against empty provided integrations
      if (integration && integration.afterAllSetup) {
        integration.afterAllSetup(client);
      }
    }
  }

  /** Setup a single integration.  */
  function setupIntegration(client, integration, integrationIndex) {
    if (integrationIndex[integration.name]) {
      logger.log(`Integration skipped because it was already installed: ${integration.name}`);
      return;
    }
    integrationIndex[integration.name] = integration;

    // `setupOnce` is only called the first time
    if (installedIntegrations.indexOf(integration.name) === -1 && typeof integration.setupOnce === 'function') {
      integration.setupOnce();
      installedIntegrations.push(integration.name);
    }

    // `setup` is run for each client
    if (integration.setup && typeof integration.setup === 'function') {
      integration.setup(client);
    }

    if (typeof integration.preprocessEvent === 'function') {
      const callback = integration.preprocessEvent.bind(integration) ;
      client.on('preprocessEvent', (event, hint) => callback(event, hint, client));
    }

    if (typeof integration.processEvent === 'function') {
      const callback = integration.processEvent.bind(integration) ;

      const processor = Object.assign((event, hint) => callback(event, hint, client), {
        id: integration.name,
      });

      client.addEventProcessor(processor);
    }

    logger.log(`Integration installed: ${integration.name}`);
  }

  /** Add an integration to the current scope's client. */
  function addIntegration(integration) {
    const client = getClient();

    if (!client) {
      logger.warn(`Cannot add integration "${integration.name}" because no SDK Client is available.`);
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

  const ALREADY_SEEN_ERROR = "Not capturing exception because it's already been captured.";

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
   * {@link BaseClient._prepareEvent} to add SDK information and scope data
   * (breadcrumbs and context). To add more custom information, override this
   * method and extend the resulting prepared event.
   *
   * To issue automatically created events (e.g. via instrumentation), use
   * {@link Client.captureEvent}. It will prepare the event and pass it through
   * the callback lifecycle. To issue auto-breadcrumbs, use
   * {@link Client.addBreadcrumb}.
   *
   * @example
   * class NodeClient extends BaseClient<NodeOptions> {
   *   public constructor(options: NodeOptions) {
   *     super(options);
   *   }
   *
   *   // ...
   * }
   */
  class BaseClient {
    /** Options passed to the SDK. */

    /** The client Dsn, if specified in options. Without this Dsn, the SDK will be disabled. */

    /** Array of set up integrations. */

    /** Number of calls being processed */

    /** Holds flushable  */

    // eslint-disable-next-line @typescript-eslint/ban-types

    /**
     * Initializes this client instance.
     *
     * @param options Options for the client.
     */
     constructor(options) {
      this._options = options;
      this._integrations = {};
      this._numProcessing = 0;
      this._outcomes = {};
      this._hooks = {};
      this._eventProcessors = [];

      if (options.dsn) {
        this._dsn = makeDsn(options.dsn);
      } else {
        logger.warn('No DSN provided, client will not send events.');
      }

      if (this._dsn) {
        const url = getEnvelopeEndpointWithUrlEncodedAuth(
          this._dsn,
          options.tunnel,
          options._metadata ? options._metadata.sdk : undefined,
        );
        this._transport = options.transport({
          tunnel: this._options.tunnel,
          recordDroppedEvent: this.recordDroppedEvent.bind(this),
          ...options.transportOptions,
          url,
        });
      }
    }

    /**
     * @inheritDoc
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
     captureException(exception, hint, scope) {
      const eventId = uuid4();

      // ensure we haven't captured this very object before
      if (checkOrSetAlreadyCaught(exception)) {
        logger.log(ALREADY_SEEN_ERROR);
        return eventId;
      }

      const hintWithEventId = {
        event_id: eventId,
        ...hint,
      };

      this._process(
        this.eventFromException(exception, hintWithEventId).then(event =>
          this._captureEvent(event, hintWithEventId, scope),
        ),
      );

      return hintWithEventId.event_id;
    }

    /**
     * @inheritDoc
     */
     captureMessage(
      message,
      level,
      hint,
      currentScope,
    ) {
      const hintWithEventId = {
        event_id: uuid4(),
        ...hint,
      };

      const eventMessage = isParameterizedString(message) ? message : String(message);

      const promisedEvent = isPrimitive(message)
        ? this.eventFromMessage(eventMessage, level, hintWithEventId)
        : this.eventFromException(message, hintWithEventId);

      this._process(promisedEvent.then(event => this._captureEvent(event, hintWithEventId, currentScope)));

      return hintWithEventId.event_id;
    }

    /**
     * @inheritDoc
     */
     captureEvent(event, hint, currentScope) {
      const eventId = uuid4();

      // ensure we haven't captured this very object before
      if (hint && hint.originalException && checkOrSetAlreadyCaught(hint.originalException)) {
        logger.log(ALREADY_SEEN_ERROR);
        return eventId;
      }

      const hintWithEventId = {
        event_id: eventId,
        ...hint,
      };

      const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
      const capturedSpanScope = sdkProcessingMetadata.capturedSpanScope;

      this._process(this._captureEvent(event, hintWithEventId, capturedSpanScope || currentScope));

      return hintWithEventId.event_id;
    }

    /**
     * @inheritDoc
     */
     captureSession(session) {
      if (!(typeof session.release === 'string')) {
        logger.warn('Discarded session because of missing or non-string release');
      } else {
        this.sendSession(session);
        // After sending, we set init false to indicate it's not the first occurrence
        updateSession(session, { init: false });
      }
    }

    /**
     * @inheritDoc
     */
     getDsn() {
      return this._dsn;
    }

    /**
     * @inheritDoc
     */
     getOptions() {
      return this._options;
    }

    /**
     * @see SdkMetadata in @sentry/types
     *
     * @return The metadata of the SDK
     */
     getSdkMetadata() {
      return this._options._metadata;
    }

    /**
     * @inheritDoc
     */
     getTransport() {
      return this._transport;
    }

    /**
     * @inheritDoc
     */
     flush(timeout) {
      const transport = this._transport;
      if (transport) {
        this.emit('flush');
        return this._isClientDoneProcessing(timeout).then(clientFinished => {
          return transport.flush(timeout).then(transportFlushed => clientFinished && transportFlushed);
        });
      } else {
        return resolvedSyncPromise(true);
      }
    }

    /**
     * @inheritDoc
     */
     close(timeout) {
      return this.flush(timeout).then(result => {
        this.getOptions().enabled = false;
        this.emit('close');
        return result;
      });
    }

    /** Get all installed event processors. */
     getEventProcessors() {
      return this._eventProcessors;
    }

    /** @inheritDoc */
     addEventProcessor(eventProcessor) {
      this._eventProcessors.push(eventProcessor);
    }

    /** @inheritdoc */
     init() {
      if (this._isEnabled()) {
        this._setupIntegrations();
      }
    }

    /**
     * Gets an installed integration by its name.
     *
     * @returns The installed integration or `undefined` if no integration with that `name` was installed.
     */
     getIntegrationByName(integrationName) {
      return this._integrations[integrationName] ;
    }

    /**
     * @inheritDoc
     */
     addIntegration(integration) {
      const isAlreadyInstalled = this._integrations[integration.name];

      // This hook takes care of only installing if not already installed
      setupIntegration(this, integration, this._integrations);
      // Here we need to check manually to make sure to not run this multiple times
      if (!isAlreadyInstalled) {
        afterSetupIntegrations(this, [integration]);
      }
    }

    /**
     * @inheritDoc
     */
     sendEvent(event, hint = {}) {
      this.emit('beforeSendEvent', event, hint);

      let env = createEventEnvelope(event, this._dsn, this._options._metadata, this._options.tunnel);

      for (const attachment of hint.attachments || []) {
        env = addItemToEnvelope(env, createAttachmentEnvelopeItem(attachment));
      }

      const promise = this.sendEnvelope(env);
      if (promise) {
        promise.then(sendResponse => this.emit('afterSendEvent', event, sendResponse), null);
      }
    }

    /**
     * @inheritDoc
     */
     sendSession(session) {
      const env = createSessionEnvelope(session, this._dsn, this._options._metadata, this._options.tunnel);

      // sendEnvelope should not throw
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sendEnvelope(env);
    }

    /**
     * @inheritDoc
     */
     recordDroppedEvent(reason, category, eventOrCount) {
      if (this._options.sendClientReports) {
        // TODO v9: We do not need the `event` passed as third argument anymore, and can possibly remove this overload
        // If event is passed as third argument, we assume this is a count of 1
        const count = typeof eventOrCount === 'number' ? eventOrCount : 1;

        // We want to track each category (error, transaction, session, replay_event) separately
        // but still keep the distinction between different type of outcomes.
        // We could use nested maps, but it's much easier to read and type this way.
        // A correct type for map-based implementation if we want to go that route
        // would be `Partial<Record<SentryRequestType, Partial<Record<Outcome, number>>>>`
        // With typescript 4.1 we could even use template literal types
        const key = `${reason}:${category}`;
        logger.log(`Recording outcome: "${key}"${count > 1 ? ` (${count} times)` : ''}`);
        this._outcomes[key] = (this._outcomes[key] || 0) + count;
      }
    }

    // Keep on() & emit() signatures in sync with types' client.ts interface
    /* eslint-disable @typescript-eslint/unified-signatures */

    /** @inheritdoc */

    /** @inheritdoc */
     on(hook, callback) {
      const hooks = (this._hooks[hook] = this._hooks[hook] || []);

      // @ts-expect-error We assue the types are correct
      hooks.push(callback);

      // This function returns a callback execution handler that, when invoked,
      // deregisters a callback. This is crucial for managing instances where callbacks
      // need to be unregistered to prevent self-referencing in callback closures,
      // ensuring proper garbage collection.
      return () => {
        // @ts-expect-error We assue the types are correct
        const cbIndex = hooks.indexOf(callback);
        if (cbIndex > -1) {
          hooks.splice(cbIndex, 1);
        }
      };
    }

    /** @inheritdoc */

    /** @inheritdoc */
     emit(hook, ...rest) {
      const callbacks = this._hooks[hook];
      if (callbacks) {
        callbacks.forEach(callback => callback(...rest));
      }
    }

    /**
     * @inheritdoc
     */
     sendEnvelope(envelope) {
      this.emit('beforeEnvelope', envelope);

      if (this._isEnabled() && this._transport) {
        return this._transport.send(envelope).then(null, reason => {
          logger.error('Error while sending event:', reason);
          return reason;
        });
      }

      logger.error('Transport disabled');

      return resolvedSyncPromise({});
    }

    /* eslint-enable @typescript-eslint/unified-signatures */

    /** Setup integrations for this client. */
     _setupIntegrations() {
      const { integrations } = this._options;
      this._integrations = setupIntegrations(this, integrations);
      afterSetupIntegrations(this, integrations);
    }

    /** Updates existing session based on the provided event */
     _updateSessionFromEvent(session, event) {
      let crashed = false;
      let errored = false;
      const exceptions = event.exception && event.exception.values;

      if (exceptions) {
        errored = true;

        for (const ex of exceptions) {
          const mechanism = ex.mechanism;
          if (mechanism && mechanism.handled === false) {
            crashed = true;
            break;
          }
        }
      }

      // A session is updated and that session update is sent in only one of the two following scenarios:
      // 1. Session with non terminal status and 0 errors + an error occurred -> Will set error count to 1 and send update
      // 2. Session with non terminal status and 1 error + a crash occurred -> Will set status crashed and send update
      const sessionNonTerminal = session.status === 'ok';
      const shouldUpdateAndSend = (sessionNonTerminal && session.errors === 0) || (sessionNonTerminal && crashed);

      if (shouldUpdateAndSend) {
        updateSession(session, {
          ...(crashed && { status: 'crashed' }),
          errors: session.errors || Number(errored || crashed),
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
     _isClientDoneProcessing(timeout) {
      return new SyncPromise(resolve => {
        let ticked = 0;
        const tick = 1;

        const interval = setInterval(() => {
          if (this._numProcessing == 0) {
            clearInterval(interval);
            resolve(true);
          } else {
            ticked += tick;
            if (timeout && ticked >= timeout) {
              clearInterval(interval);
              resolve(false);
            }
          }
        }, tick);
      });
    }

    /** Determines whether this SDK is enabled and a transport is present. */
     _isEnabled() {
      return this.getOptions().enabled !== false && this._transport !== undefined;
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
     _prepareEvent(
      event,
      hint,
      currentScope,
      isolationScope = getIsolationScope(),
    ) {
      const options = this.getOptions();
      const integrations = Object.keys(this._integrations);
      if (!hint.integrations && integrations.length > 0) {
        hint.integrations = integrations;
      }

      this.emit('preprocessEvent', event, hint);

      if (!event.type) {
        isolationScope.setLastEventId(event.event_id || hint.event_id);
      }

      return prepareEvent(options, event, hint, currentScope, this, isolationScope).then(evt => {
        if (evt === null) {
          return evt;
        }

        const propagationContext = {
          ...isolationScope.getPropagationContext(),
          ...(currentScope ? currentScope.getPropagationContext() : undefined),
        };

        const trace = evt.contexts && evt.contexts.trace;
        if (!trace && propagationContext) {
          const { traceId: trace_id, spanId, parentSpanId, dsc } = propagationContext;
          evt.contexts = {
            trace: dropUndefinedKeys({
              trace_id,
              span_id: spanId,
              parent_span_id: parentSpanId,
            }),
            ...evt.contexts,
          };

          const dynamicSamplingContext = dsc ? dsc : getDynamicSamplingContextFromClient(trace_id, this);

          evt.sdkProcessingMetadata = {
            dynamicSamplingContext,
            ...evt.sdkProcessingMetadata,
          };
        }
        return evt;
      });
    }

    /**
     * Processes the event and logs an error in case of rejection
     * @param event
     * @param hint
     * @param scope
     */
     _captureEvent(event, hint = {}, scope) {
      return this._processEvent(event, hint, scope).then(
        finalEvent => {
          return finalEvent.event_id;
        },
        reason => {
          {
            // If something's gone wrong, log the error as a warning. If it's just us having used a `SentryError` for
            // control flow, log just the message (no stack) as a log-level log.
            const sentryError = reason ;
            if (sentryError.logLevel === 'log') {
              logger.log(sentryError.message);
            } else {
              logger.warn(sentryError);
            }
          }
          return undefined;
        },
      );
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
     _processEvent(event, hint, currentScope) {
      const options = this.getOptions();
      const { sampleRate } = options;

      const isTransaction = isTransactionEvent$1(event);
      const isError = isErrorEvent$1(event);
      const eventType = event.type || 'error';
      const beforeSendLabel = `before send for type \`${eventType}\``;

      // 1.0 === 100% events are sent
      // 0.0 === 0% events are sent
      // Sampling for transaction happens somewhere else
      const parsedSampleRate = typeof sampleRate === 'undefined' ? undefined : parseSampleRate(sampleRate);
      if (isError && typeof parsedSampleRate === 'number' && Math.random() > parsedSampleRate) {
        this.recordDroppedEvent('sample_rate', 'error', event);
        return rejectedSyncPromise(
          new SentryError(
            `Discarding event because it's not included in the random sample (sampling rate = ${sampleRate})`,
            'log',
          ),
        );
      }

      const dataCategory = eventType === 'replay_event' ? 'replay' : eventType;

      const sdkProcessingMetadata = event.sdkProcessingMetadata || {};
      const capturedSpanIsolationScope = sdkProcessingMetadata.capturedSpanIsolationScope;

      return this._prepareEvent(event, hint, currentScope, capturedSpanIsolationScope)
        .then(prepared => {
          if (prepared === null) {
            this.recordDroppedEvent('event_processor', dataCategory, event);
            throw new SentryError('An event processor returned `null`, will not send event.', 'log');
          }

          const isInternalException = hint.data && (hint.data ).__sentry__ === true;
          if (isInternalException) {
            return prepared;
          }

          const result = processBeforeSend(this, options, prepared, hint);
          return _validateBeforeSendResult(result, beforeSendLabel);
        })
        .then(processedEvent => {
          if (processedEvent === null) {
            this.recordDroppedEvent('before_send', dataCategory, event);
            if (isTransaction) {
              const spans = event.spans || [];
              // the transaction itself counts as one span, plus all the child spans that are added
              const spanCount = 1 + spans.length;
              this.recordDroppedEvent('before_send', 'span', spanCount);
            }
            throw new SentryError(`${beforeSendLabel} returned \`null\`, will not send event.`, 'log');
          }

          const session = currentScope && currentScope.getSession();
          if (!isTransaction && session) {
            this._updateSessionFromEvent(session, processedEvent);
          }

          if (isTransaction) {
            const spanCountBefore =
              (processedEvent.sdkProcessingMetadata && processedEvent.sdkProcessingMetadata.spanCountBeforeProcessing) ||
              0;
            const spanCountAfter = processedEvent.spans ? processedEvent.spans.length : 0;

            const droppedSpanCount = spanCountBefore - spanCountAfter;
            if (droppedSpanCount > 0) {
              this.recordDroppedEvent('before_send', 'span', droppedSpanCount);
            }
          }

          // None of the Sentry built event processor will update transaction name,
          // so if the transaction name has been changed by an event processor, we know
          // it has to come from custom event processor added by a user
          const transactionInfo = processedEvent.transaction_info;
          if (isTransaction && transactionInfo && processedEvent.transaction !== event.transaction) {
            const source = 'custom';
            processedEvent.transaction_info = {
              ...transactionInfo,
              source,
            };
          }

          this.sendEvent(processedEvent, hint);
          return processedEvent;
        })
        .then(null, reason => {
          if (reason instanceof SentryError) {
            throw reason;
          }

          this.captureException(reason, {
            data: {
              __sentry__: true,
            },
            originalException: reason,
          });
          throw new SentryError(
            `Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.\nReason: ${reason}`,
          );
        });
    }

    /**
     * Occupies the client with processing and event
     */
     _process(promise) {
      this._numProcessing++;
      void promise.then(
        value => {
          this._numProcessing--;
          return value;
        },
        reason => {
          this._numProcessing--;
          return reason;
        },
      );
    }

    /**
     * Clears outcomes on this client and returns them.
     */
     _clearOutcomes() {
      const outcomes = this._outcomes;
      this._outcomes = {};
      return Object.entries(outcomes).map(([key, quantity]) => {
        const [reason, category] = key.split(':') ;
        return {
          reason,
          category,
          quantity,
        };
      });
    }

    /**
     * Sends client reports as an envelope.
     */
     _flushOutcomes() {
      logger.log('Flushing outcomes...');

      const outcomes = this._clearOutcomes();

      if (outcomes.length === 0) {
        logger.log('No outcomes to send');
        return;
      }

      // This is really the only place where we want to check for a DSN and only send outcomes then
      if (!this._dsn) {
        logger.log('No dsn provided, will not send outcomes');
        return;
      }

      logger.log('Sending outcomes:', outcomes);

      const envelope = createClientReportEnvelope(outcomes, this._options.tunnel && dsnToString(this._dsn));

      // sendEnvelope should not throw
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sendEnvelope(envelope);
    }

    /**
     * @inheritDoc
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

  }

  /**
   * Verifies that return value of configured `beforeSend` or `beforeSendTransaction` is of expected type, and returns the value if so.
   */
  function _validateBeforeSendResult(
    beforeSendResult,
    beforeSendLabel,
  ) {
    const invalidValueError = `${beforeSendLabel} must return \`null\` or a valid event.`;
    if (isThenable(beforeSendResult)) {
      return beforeSendResult.then(
        event => {
          if (!isPlainObject(event) && event !== null) {
            throw new SentryError(invalidValueError);
          }
          return event;
        },
        e => {
          throw new SentryError(`${beforeSendLabel} rejected with ${e}`);
        },
      );
    } else if (!isPlainObject(beforeSendResult) && beforeSendResult !== null) {
      throw new SentryError(invalidValueError);
    }
    return beforeSendResult;
  }

  /**
   * Process the matching `beforeSendXXX` callback.
   */
  function processBeforeSend(
    client,
    options,
    event,
    hint,
  ) {
    const { beforeSend, beforeSendTransaction, beforeSendSpan } = options;

    if (isErrorEvent$1(event) && beforeSend) {
      return beforeSend(event, hint);
    }

    if (isTransactionEvent$1(event)) {
      if (event.spans && beforeSendSpan) {
        const processedSpans = [];
        for (const span of event.spans) {
          const processedSpan = beforeSendSpan(span);
          if (processedSpan) {
            processedSpans.push(processedSpan);
          } else {
            client.recordDroppedEvent('before_send', 'span');
          }
        }
        event.spans = processedSpans;
      }

      if (beforeSendTransaction) {
        if (event.spans) {
          // We store the # of spans before processing in SDK metadata,
          // so we can compare it afterwards to determine how many spans were dropped
          const spanCountBefore = event.spans.length;
          event.sdkProcessingMetadata = {
            ...event.sdkProcessingMetadata,
            spanCountBeforeProcessing: spanCountBefore,
          };
        }
        return beforeSendTransaction(event, hint);
      }
    }

    return event;
  }

  function isErrorEvent$1(event) {
    return event.type === undefined;
  }

  function isTransactionEvent$1(event) {
    return event.type === 'transaction';
  }

  /** A class object that can instantiate Client objects. */

  /**
   * Internal function to create a new SDK client instance. The client is
   * installed and then bound to the current scope.
   *
   * @param clientClass The client class to instantiate.
   * @param options Options to pass to the client.
   */
  function initAndBind(
    clientClass,
    options,
  ) {
    if (options.debug === true) {
      {
        logger.enable();
      }
    }
    const scope = getCurrentScope();
    scope.update(options.initialScope);

    const client = new clientClass(options);
    setCurrentClient(client);
    client.init();
    return client;
  }

  /**
   * Make the given client the current client.
   */
  function setCurrentClient(client) {
    getCurrentScope().setClient(client);
  }

  const DEFAULT_TRANSPORT_BUFFER_SIZE = 64;

  /**
   * Creates an instance of a Sentry `Transport`
   *
   * @param options
   * @param makeRequest
   */
  function createTransport(
    options,
    makeRequest,
    buffer = makePromiseBuffer(
      options.bufferSize || DEFAULT_TRANSPORT_BUFFER_SIZE,
    ),
  ) {
    let rateLimits = {};
    const flush = (timeout) => buffer.drain(timeout);

    function send(envelope) {
      const filteredEnvelopeItems = [];

      // Drop rate limited items from envelope
      forEachEnvelopeItem(envelope, (item, type) => {
        const dataCategory = envelopeItemTypeToDataCategory(type);
        if (isRateLimited(rateLimits, dataCategory)) {
          const event = getEventForEnvelopeItem(item, type);
          options.recordDroppedEvent('ratelimit_backoff', dataCategory, event);
        } else {
          filteredEnvelopeItems.push(item);
        }
      });

      // Skip sending if envelope is empty after filtering out rate limited events
      if (filteredEnvelopeItems.length === 0) {
        return resolvedSyncPromise({});
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredEnvelope = createEnvelope(envelope[0], filteredEnvelopeItems );

      // Creates client report for each item in an envelope
      const recordEnvelopeLoss = (reason) => {
        forEachEnvelopeItem(filteredEnvelope, (item, type) => {
          const event = getEventForEnvelopeItem(item, type);
          options.recordDroppedEvent(reason, envelopeItemTypeToDataCategory(type), event);
        });
      };

      const requestTask = () =>
        makeRequest({ body: serializeEnvelope(filteredEnvelope) }).then(
          response => {
            // We don't want to throw on NOK responses, but we want to at least log them
            if (response.statusCode !== undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
              logger.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
            }

            rateLimits = updateRateLimits(rateLimits, response);
            return response;
          },
          error => {
            recordEnvelopeLoss('network_error');
            throw error;
          },
        );

      return buffer.add(requestTask).then(
        result => result,
        error => {
          if (error instanceof SentryError) {
            logger.error('Skipped sending event because buffer is full.');
            recordEnvelopeLoss('queue_overflow');
            return resolvedSyncPromise({});
          } else {
            throw error;
          }
        },
      );
    }

    return {
      send,
      flush,
    };
  }

  function getEventForEnvelopeItem(item, type) {
    if (type !== 'event' && type !== 'transaction') {
      return undefined;
    }

    return Array.isArray(item) ? (item )[1] : undefined;
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
   * Tagged template function which returns paramaterized representation of the message
   * For example: parameterize`This is a log statement with ${x} and ${y} params`, would return:
   * "__sentry_template_string__": 'This is a log statement with %s and %s params',
   * "__sentry_template_values__": ['first', 'second']
   * @param strings An array of string values splitted between expressions
   * @param values Expressions extracted from template string
   * @returns String with template information in __sentry_template_string__ and __sentry_template_values__ properties
   */
  function parameterize(strings, ...values) {
    const formatted = new String(String.raw(strings, ...values)) ;
    formatted.__sentry_template_string__ = strings.join('\x00').replace(/%/g, '%%').replace(/\0/g, '%s');
    formatted.__sentry_template_values__ = values;
    return formatted;
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
  function applySdkMetadata(options, name, names = [name], source = 'npm') {
    const metadata = options._metadata || {};

    if (!metadata.sdk) {
      metadata.sdk = {
        name: `sentry.javascript.${name}`,
        packages: names.map(name => ({
          name: `${source}:@sentry/${name}`,
          version: SDK_VERSION,
        })),
        version: SDK_VERSION,
      };
    }

    options._metadata = metadata;
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

  let originalFunctionToString;

  const INTEGRATION_NAME$6 = 'FunctionToString';

  const SETUP_CLIENTS = new WeakMap();

  const _functionToStringIntegration = (() => {
    return {
      name: INTEGRATION_NAME$6,
      setupOnce() {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        originalFunctionToString = Function.prototype.toString;

        // intrinsics (like Function.prototype) might be immutable in some environments
        // e.g. Node with --frozen-intrinsics, XS (an embedded JavaScript engine) or SES (a JavaScript proposal)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Function.prototype.toString = function ( ...args) {
            const originalFunction = getOriginalFunction(this);
            const context =
              SETUP_CLIENTS.has(getClient() ) && originalFunction !== undefined ? originalFunction : this;
            return originalFunctionToString.apply(context, args);
          };
        } catch (e) {
          // ignore errors here, just don't patch this
        }
      },
      setup(client) {
        SETUP_CLIENTS.set(client, true);
      },
    };
  }) ;

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

  // "Script error." is hard coded into browsers for errors that it can't read.
  // this is the result of a script being pulled in from an external domain and CORS.
  const DEFAULT_IGNORE_ERRORS = [
    /^Script error\.?$/,
    /^Javascript error: Script error\.? on line 0$/,
    /^ResizeObserver loop completed with undelivered notifications.$/, // The browser logs this when a ResizeObserver handler takes a bit longer. Usually this is not an actual issue though. It indicates slowness.
    /^Cannot redefine property: googletag$/, // This is thrown when google tag manager is used in combination with an ad blocker
    "undefined is not an object (evaluating 'a.L')", // Random error that happens but not actionable or noticeable to end-users.
    'can\'t redefine non-configurable property "solana"', // Probably a browser extension or custom browser (Brave) throwing this error
    "vv().getRestrictions is not a function. (In 'vv().getRestrictions(1,a)', 'vv().getRestrictions' is undefined)", // Error thrown by GTM, seemingly not affecting end-users
    "Can't find variable: _AutofillCallbackHandler", // Unactionable error in instagram webview https://developers.facebook.com/community/threads/320013549791141/
  ];

  /** Options for the InboundFilters integration */

  const INTEGRATION_NAME$5 = 'InboundFilters';
  const _inboundFiltersIntegration = ((options = {}) => {
    return {
      name: INTEGRATION_NAME$5,
      processEvent(event, _hint, client) {
        const clientOptions = client.getOptions();
        const mergedOptions = _mergeOptions(options, clientOptions);
        return _shouldDropEvent$1(event, mergedOptions) ? null : event;
      },
    };
  }) ;

  const inboundFiltersIntegration = defineIntegration(_inboundFiltersIntegration);

  function _mergeOptions(
    internalOptions = {},
    clientOptions = {},
  ) {
    return {
      allowUrls: [...(internalOptions.allowUrls || []), ...(clientOptions.allowUrls || [])],
      denyUrls: [...(internalOptions.denyUrls || []), ...(clientOptions.denyUrls || [])],
      ignoreErrors: [
        ...(internalOptions.ignoreErrors || []),
        ...(clientOptions.ignoreErrors || []),
        ...(internalOptions.disableErrorDefaults ? [] : DEFAULT_IGNORE_ERRORS),
      ],
      ignoreTransactions: [...(internalOptions.ignoreTransactions || []), ...(clientOptions.ignoreTransactions || [])],
      ignoreInternal: internalOptions.ignoreInternal !== undefined ? internalOptions.ignoreInternal : true,
    };
  }

  function _shouldDropEvent$1(event, options) {
    if (options.ignoreInternal && _isSentryError(event)) {
      logger.warn(`Event dropped due to being internal Sentry Error.\nEvent: ${getEventDescription(event)}`);
      return true;
    }
    if (_isIgnoredError(event, options.ignoreErrors)) {
      logger.warn(
          `Event dropped due to being matched by \`ignoreErrors\` option.\nEvent: ${getEventDescription(event)}`,
        );
      return true;
    }
    if (_isUselessError(event)) {
      logger.warn(
          `Event dropped due to not having an error message, error type or stacktrace.\nEvent: ${getEventDescription(
          event,
        )}`,
        );
      return true;
    }
    if (_isIgnoredTransaction(event, options.ignoreTransactions)) {
      logger.warn(
          `Event dropped due to being matched by \`ignoreTransactions\` option.\nEvent: ${getEventDescription(event)}`,
        );
      return true;
    }
    if (_isDeniedUrl(event, options.denyUrls)) {
      logger.warn(
          `Event dropped due to being matched by \`denyUrls\` option.\nEvent: ${getEventDescription(
          event,
        )}.\nUrl: ${_getEventFilterUrl(event)}`,
        );
      return true;
    }
    if (!_isAllowedUrl(event, options.allowUrls)) {
      logger.warn(
          `Event dropped due to not being matched by \`allowUrls\` option.\nEvent: ${getEventDescription(
          event,
        )}.\nUrl: ${_getEventFilterUrl(event)}`,
        );
      return true;
    }
    return false;
  }

  function _isIgnoredError(event, ignoreErrors) {
    // If event.type, this is not an error
    if (event.type || !ignoreErrors || !ignoreErrors.length) {
      return false;
    }

    return _getPossibleEventMessages(event).some(message => stringMatchesSomePattern(message, ignoreErrors));
  }

  function _isIgnoredTransaction(event, ignoreTransactions) {
    if (event.type !== 'transaction' || !ignoreTransactions || !ignoreTransactions.length) {
      return false;
    }

    const name = event.transaction;
    return name ? stringMatchesSomePattern(name, ignoreTransactions) : false;
  }

  function _isDeniedUrl(event, denyUrls) {
    // TODO: Use Glob instead?
    if (!denyUrls || !denyUrls.length) {
      return false;
    }
    const url = _getEventFilterUrl(event);
    return !url ? false : stringMatchesSomePattern(url, denyUrls);
  }

  function _isAllowedUrl(event, allowUrls) {
    // TODO: Use Glob instead?
    if (!allowUrls || !allowUrls.length) {
      return true;
    }
    const url = _getEventFilterUrl(event);
    return !url ? true : stringMatchesSomePattern(url, allowUrls);
  }

  function _getPossibleEventMessages(event) {
    const possibleMessages = [];

    if (event.message) {
      possibleMessages.push(event.message);
    }

    let lastException;
    try {
      // @ts-expect-error Try catching to save bundle size
      lastException = event.exception.values[event.exception.values.length - 1];
    } catch (e) {
      // try catching to save bundle size checking existence of variables
    }

    if (lastException) {
      if (lastException.value) {
        possibleMessages.push(lastException.value);
        if (lastException.type) {
          possibleMessages.push(`${lastException.type}: ${lastException.value}`);
        }
      }
    }

    return possibleMessages;
  }

  function _isSentryError(event) {
    try {
      // @ts-expect-error can't be a sentry error if undefined
      return event.exception.values[0].type === 'SentryError';
    } catch (e) {
      // ignore
    }
    return false;
  }

  function _getLastValidUrl(frames = []) {
    for (let i = frames.length - 1; i >= 0; i--) {
      const frame = frames[i];

      if (frame && frame.filename !== '<anonymous>' && frame.filename !== '[native code]') {
        return frame.filename || null;
      }
    }

    return null;
  }

  function _getEventFilterUrl(event) {
    try {
      let frames;
      try {
        // @ts-expect-error we only care about frames if the whole thing here is defined
        frames = event.exception.values[0].stacktrace.frames;
      } catch (e) {
        // ignore
      }
      return frames ? _getLastValidUrl(frames) : null;
    } catch (oO) {
      logger.error(`Cannot extract url for event ${getEventDescription(event)}`);
      return null;
    }
  }

  function _isUselessError(event) {
    if (event.type) {
      // event is not an error
      return false;
    }

    // We only want to consider events for dropping that actually have recorded exception values.
    if (!event.exception || !event.exception.values || event.exception.values.length === 0) {
      return false;
    }

    return (
      // No top-level message
      !event.message &&
      // There are no exception values that have a stacktrace, a non-generic-Error type or value
      !event.exception.values.some(value => value.stacktrace || (value.type && value.type !== 'Error') || value.value)
    );
  }

  const INTEGRATION_NAME$4 = 'Dedupe';

  const _dedupeIntegration = (() => {
    let previousEvent;

    return {
      name: INTEGRATION_NAME$4,
      processEvent(currentEvent) {
        // We want to ignore any non-error type events, e.g. transactions or replays
        // These should never be deduped, and also not be compared against as _previousEvent.
        if (currentEvent.type) {
          return currentEvent;
        }

        // Juuust in case something goes wrong
        try {
          if (_shouldDropEvent(currentEvent, previousEvent)) {
            logger.warn('Event dropped due to being a duplicate of previously captured event.');
            return null;
          }
        } catch (_oO) {} // eslint-disable-line no-empty

        return (previousEvent = currentEvent);
      },
    };
  }) ;

  /**
   * Deduplication filter.
   */
  const dedupeIntegration = defineIntegration(_dedupeIntegration);

  /** only exported for tests. */
  function _shouldDropEvent(currentEvent, previousEvent) {
    if (!previousEvent) {
      return false;
    }

    if (_isSameMessageEvent(currentEvent, previousEvent)) {
      return true;
    }

    if (_isSameExceptionEvent(currentEvent, previousEvent)) {
      return true;
    }

    return false;
  }

  function _isSameMessageEvent(currentEvent, previousEvent) {
    const currentMessage = currentEvent.message;
    const previousMessage = previousEvent.message;

    // If neither event has a message property, they were both exceptions, so bail out
    if (!currentMessage && !previousMessage) {
      return false;
    }

    // If only one event has a stacktrace, but not the other one, they are not the same
    if ((currentMessage && !previousMessage) || (!currentMessage && previousMessage)) {
      return false;
    }

    if (currentMessage !== previousMessage) {
      return false;
    }

    if (!_isSameFingerprint(currentEvent, previousEvent)) {
      return false;
    }

    if (!_isSameStacktrace(currentEvent, previousEvent)) {
      return false;
    }

    return true;
  }

  function _isSameExceptionEvent(currentEvent, previousEvent) {
    const previousException = _getExceptionFromEvent(previousEvent);
    const currentException = _getExceptionFromEvent(currentEvent);

    if (!previousException || !currentException) {
      return false;
    }

    if (previousException.type !== currentException.type || previousException.value !== currentException.value) {
      return false;
    }

    if (!_isSameFingerprint(currentEvent, previousEvent)) {
      return false;
    }

    if (!_isSameStacktrace(currentEvent, previousEvent)) {
      return false;
    }

    return true;
  }

  function _isSameStacktrace(currentEvent, previousEvent) {
    let currentFrames = getFramesFromEvent(currentEvent);
    let previousFrames = getFramesFromEvent(previousEvent);

    // If neither event has a stacktrace, they are assumed to be the same
    if (!currentFrames && !previousFrames) {
      return true;
    }

    // If only one event has a stacktrace, but not the other one, they are not the same
    if ((currentFrames && !previousFrames) || (!currentFrames && previousFrames)) {
      return false;
    }

    currentFrames = currentFrames ;
    previousFrames = previousFrames ;

    // If number of frames differ, they are not the same
    if (previousFrames.length !== currentFrames.length) {
      return false;
    }

    // Otherwise, compare the two
    for (let i = 0; i < previousFrames.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frameA = previousFrames[i];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const frameB = currentFrames[i];

      if (
        frameA.filename !== frameB.filename ||
        frameA.lineno !== frameB.lineno ||
        frameA.colno !== frameB.colno ||
        frameA.function !== frameB.function
      ) {
        return false;
      }
    }

    return true;
  }

  function _isSameFingerprint(currentEvent, previousEvent) {
    let currentFingerprint = currentEvent.fingerprint;
    let previousFingerprint = previousEvent.fingerprint;

    // If neither event has a fingerprint, they are assumed to be the same
    if (!currentFingerprint && !previousFingerprint) {
      return true;
    }

    // If only one event has a fingerprint, but not the other one, they are not the same
    if ((currentFingerprint && !previousFingerprint) || (!currentFingerprint && previousFingerprint)) {
      return false;
    }

    currentFingerprint = currentFingerprint ;
    previousFingerprint = previousFingerprint ;

    // Otherwise, compare the two
    try {
      return !!(currentFingerprint.join('') === previousFingerprint.join(''));
    } catch (_oO) {
      return false;
    }
  }

  function _getExceptionFromEvent(event) {
    return event.exception && event.exception.values && event.exception.values[0];
  }

  const COUNTER_METRIC_TYPE = 'c' ;
  const GAUGE_METRIC_TYPE = 'g' ;
  const SET_METRIC_TYPE = 's' ;
  const DISTRIBUTION_METRIC_TYPE = 'd' ;

  /**
   * This does not match spec in https://develop.sentry.dev/sdk/metrics
   * but was chosen to optimize for the most common case in browser environments.
   */
  const DEFAULT_BROWSER_FLUSH_INTERVAL = 5000;

  /**
   * Gets the metrics aggregator for a given client.
   * @param client The client for which to get the metrics aggregator.
   * @param Aggregator Optional metrics aggregator class to use to create an aggregator if one does not exist.
   */
  function getMetricsAggregatorForClient(
    client,
    Aggregator,
  ) {
    const globalMetricsAggregators = getGlobalSingleton(
      'globalMetricsAggregators',
      () => new WeakMap(),
    );

    const aggregator = globalMetricsAggregators.get(client);
    if (aggregator) {
      return aggregator;
    }

    const newAggregator = new Aggregator(client);
    client.on('flush', () => newAggregator.flush());
    client.on('close', () => newAggregator.close());
    globalMetricsAggregators.set(client, newAggregator);

    return newAggregator;
  }

  function addToMetricsAggregator(
    Aggregator,
    metricType,
    name,
    value,
    data = {},
  ) {
    const client = data.client || getClient();

    if (!client) {
      return;
    }

    const span = getActiveSpan();
    const rootSpan = span ? getRootSpan(span) : undefined;
    const transactionName = rootSpan && spanToJSON(rootSpan).description;

    const { unit, tags, timestamp } = data;
    const { release, environment } = client.getOptions();
    const metricTags = {};
    if (release) {
      metricTags.release = release;
    }
    if (environment) {
      metricTags.environment = environment;
    }
    if (transactionName) {
      metricTags.transaction = transactionName;
    }

    logger.log(`Adding value of ${value} to ${metricType} metric ${name}`);

    const aggregator = getMetricsAggregatorForClient(client, Aggregator);
    aggregator.add(metricType, name, value, unit, { ...metricTags, ...tags }, timestamp);
  }

  /**
   * Adds a value to a counter metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function increment$1(aggregator, name, value = 1, data) {
    addToMetricsAggregator(aggregator, COUNTER_METRIC_TYPE, name, ensureNumber(value), data);
  }

  /**
   * Adds a value to a distribution metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function distribution$1(aggregator, name, value, data) {
    addToMetricsAggregator(aggregator, DISTRIBUTION_METRIC_TYPE, name, ensureNumber(value), data);
  }

  /**
   * Adds a timing metric.
   * The metric is added as a distribution metric.
   *
   * You can either directly capture a numeric `value`, or wrap a callback function in `timing`.
   * In the latter case, the duration of the callback execution will be captured as a span & a metric.
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function timing$1(
    aggregator,
    name,
    value,
    unit = 'second',
    data,
  ) {
    // callback form
    if (typeof value === 'function') {
      const startTime = timestampInSeconds();

      return startSpanManual(
        {
          op: 'metrics.timing',
          name,
          startTime,
          onlyIfParent: true,
        },
        span => {
          return handleCallbackErrors(
            () => value(),
            () => {
              // no special error handling necessary
            },
            () => {
              const endTime = timestampInSeconds();
              const timeDiff = endTime - startTime;
              distribution$1(aggregator, name, timeDiff, { ...data, unit: 'second' });
              span.end(endTime);
            },
          );
        },
      );
    }

    // value form
    distribution$1(aggregator, name, value, { ...data, unit });
  }

  /**
   * Adds a value to a set metric. Value must be a string or integer.
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function set$1(aggregator, name, value, data) {
    addToMetricsAggregator(aggregator, SET_METRIC_TYPE, name, value, data);
  }

  /**
   * Adds a value to a gauge metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function gauge$1(aggregator, name, value, data) {
    addToMetricsAggregator(aggregator, GAUGE_METRIC_TYPE, name, ensureNumber(value), data);
  }

  const metrics$1 = {
    increment: increment$1,
    distribution: distribution$1,
    set: set$1,
    gauge: gauge$1,
    timing: timing$1,
    /**
     * @ignore This is for internal use only.
     */
    getMetricsAggregatorForClient,
  };

  // Although this is typed to be a number, we try to handle strings as well here
  function ensureNumber(number) {
    return typeof number === 'string' ? parseInt(number) : number;
  }

  /**
   * Generate bucket key from metric properties.
   */
  function getBucketKey(
    metricType,
    name,
    unit,
    tags,
  ) {
    const stringifiedTags = Object.entries(dropUndefinedKeys(tags)).sort((a, b) => a[0].localeCompare(b[0]));
    return `${metricType}${name}${unit}${stringifiedTags}`;
  }

  /* eslint-disable no-bitwise */
  /**
   * Simple hash function for strings.
   */
  function simpleHash(s) {
    let rv = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      rv = (rv << 5) - rv + c;
      rv &= rv;
    }
    return rv >>> 0;
  }
  /* eslint-enable no-bitwise */

  /**
   * Serialize metrics buckets into a string based on statsd format.
   *
   * Example of format:
   * metric.name@second:1:1.2|d|#a:value,b:anothervalue|T12345677
   * Segments:
   * name: metric.name
   * unit: second
   * value: [1, 1.2]
   * type of metric: d (distribution)
   * tags: { a: value, b: anothervalue }
   * timestamp: 12345677
   */
  function serializeMetricBuckets(metricBucketItems) {
    let out = '';
    for (const item of metricBucketItems) {
      const tagEntries = Object.entries(item.tags);
      const maybeTags = tagEntries.length > 0 ? `|#${tagEntries.map(([key, value]) => `${key}:${value}`).join(',')}` : '';
      out += `${item.name}@${item.unit}:${item.metric}|${item.metricType}${maybeTags}|T${item.timestamp}\n`;
    }
    return out;
  }

  /**
   * Sanitizes units
   *
   * These Regex's are straight from the normalisation docs:
   * https://develop.sentry.dev/sdk/metrics/#normalization
   */
  function sanitizeUnit(unit) {
    return unit.replace(/[^\w]+/gi, '_');
  }

  /**
   * Sanitizes metric keys
   *
   * These Regex's are straight from the normalisation docs:
   * https://develop.sentry.dev/sdk/metrics/#normalization
   */
  function sanitizeMetricKey(key) {
    return key.replace(/[^\w\-.]+/gi, '_');
  }

  /**
   * Sanitizes metric keys
   *
   * These Regex's are straight from the normalisation docs:
   * https://develop.sentry.dev/sdk/metrics/#normalization
   */
  function sanitizeTagKey(key) {
    return key.replace(/[^\w\-./]+/gi, '');
  }

  /**
   * These Regex's are straight from the normalisation docs:
   * https://develop.sentry.dev/sdk/metrics/#normalization
   */
  const tagValueReplacements = [
    ['\n', '\\n'],
    ['\r', '\\r'],
    ['\t', '\\t'],
    ['\\', '\\\\'],
    ['|', '\\u{7c}'],
    [',', '\\u{2c}'],
  ];

  function getCharOrReplacement(input) {
    for (const [search, replacement] of tagValueReplacements) {
      if (input === search) {
        return replacement;
      }
    }

    return input;
  }

  function sanitizeTagValue(value) {
    return [...value].reduce((acc, char) => acc + getCharOrReplacement(char), '');
  }

  /**
   * Sanitizes tags.
   */
  function sanitizeTags(unsanitizedTags) {
    const tags = {};
    for (const key in unsanitizedTags) {
      if (Object.prototype.hasOwnProperty.call(unsanitizedTags, key)) {
        const sanitizedKey = sanitizeTagKey(key);
        tags[sanitizedKey] = sanitizeTagValue(String(unsanitizedTags[key]));
      }
    }
    return tags;
  }

  /**
   * Captures aggregated metrics to the supplied client.
   */
  function captureAggregateMetrics(client, metricBucketItems) {
    logger.log(`Flushing aggregated metrics, number of metrics: ${metricBucketItems.length}`);
    const dsn = client.getDsn();
    const metadata = client.getSdkMetadata();
    const tunnel = client.getOptions().tunnel;

    const metricsEnvelope = createMetricEnvelope(metricBucketItems, dsn, metadata, tunnel);

    // sendEnvelope should not throw
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    client.sendEnvelope(metricsEnvelope);
  }

  /**
   * Create envelope from a metric aggregate.
   */
  function createMetricEnvelope(
    metricBucketItems,
    dsn,
    metadata,
    tunnel,
  ) {
    const headers = {
      sent_at: new Date().toISOString(),
    };

    if (metadata && metadata.sdk) {
      headers.sdk = {
        name: metadata.sdk.name,
        version: metadata.sdk.version,
      };
    }

    if (!!tunnel && dsn) {
      headers.dsn = dsnToString(dsn);
    }

    const item = createMetricEnvelopeItem(metricBucketItems);
    return createEnvelope(headers, [item]);
  }

  function createMetricEnvelopeItem(metricBucketItems) {
    const payload = serializeMetricBuckets(metricBucketItems);
    const metricHeaders = {
      type: 'statsd',
      length: payload.length,
    };
    return [metricHeaders, payload];
  }

  /**
   * A metric instance representing a counter.
   */
  class CounterMetric  {
     constructor( _value) {this._value = _value;}

    /** @inheritDoc */
     get weight() {
      return 1;
    }

    /** @inheritdoc */
     add(value) {
      this._value += value;
    }

    /** @inheritdoc */
     toString() {
      return `${this._value}`;
    }
  }

  /**
   * A metric instance representing a gauge.
   */
  class GaugeMetric  {

     constructor(value) {
      this._last = value;
      this._min = value;
      this._max = value;
      this._sum = value;
      this._count = 1;
    }

    /** @inheritDoc */
     get weight() {
      return 5;
    }

    /** @inheritdoc */
     add(value) {
      this._last = value;
      if (value < this._min) {
        this._min = value;
      }
      if (value > this._max) {
        this._max = value;
      }
      this._sum += value;
      this._count++;
    }

    /** @inheritdoc */
     toString() {
      return `${this._last}:${this._min}:${this._max}:${this._sum}:${this._count}`;
    }
  }

  /**
   * A metric instance representing a distribution.
   */
  class DistributionMetric  {

     constructor(first) {
      this._value = [first];
    }

    /** @inheritDoc */
     get weight() {
      return this._value.length;
    }

    /** @inheritdoc */
     add(value) {
      this._value.push(value);
    }

    /** @inheritdoc */
     toString() {
      return this._value.join(':');
    }
  }

  /**
   * A metric instance representing a set.
   */
  class SetMetric  {

     constructor( first) {this.first = first;
      this._value = new Set([first]);
    }

    /** @inheritDoc */
     get weight() {
      return this._value.size;
    }

    /** @inheritdoc */
     add(value) {
      this._value.add(value);
    }

    /** @inheritdoc */
     toString() {
      return Array.from(this._value)
        .map(val => (typeof val === 'string' ? simpleHash(val) : val))
        .join(':');
    }
  }

  const METRIC_MAP = {
    [COUNTER_METRIC_TYPE]: CounterMetric,
    [GAUGE_METRIC_TYPE]: GaugeMetric,
    [DISTRIBUTION_METRIC_TYPE]: DistributionMetric,
    [SET_METRIC_TYPE]: SetMetric,
  };

  /**
   * A simple metrics aggregator that aggregates metrics in memory and flushes them periodically.
   * Default flush interval is 5 seconds.
   *
   * @experimental This API is experimental and might change in the future.
   */
  class BrowserMetricsAggregator  {
    // TODO(@anonrig): Use FinalizationRegistry to have a proper way of flushing the buckets
    // when the aggregator is garbage collected.
    // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry

     constructor(  _client) {this._client = _client;
      this._buckets = new Map();
      this._interval = setInterval(() => this.flush(), DEFAULT_BROWSER_FLUSH_INTERVAL);
    }

    /**
     * @inheritDoc
     */
     add(
      metricType,
      unsanitizedName,
      value,
      unsanitizedUnit = 'none',
      unsanitizedTags = {},
      maybeFloatTimestamp = timestampInSeconds(),
    ) {
      const timestamp = Math.floor(maybeFloatTimestamp);
      const name = sanitizeMetricKey(unsanitizedName);
      const tags = sanitizeTags(unsanitizedTags);
      const unit = sanitizeUnit(unsanitizedUnit );

      const bucketKey = getBucketKey(metricType, name, unit, tags);

      let bucketItem = this._buckets.get(bucketKey);
      // If this is a set metric, we need to calculate the delta from the previous weight.
      const previousWeight = bucketItem && metricType === SET_METRIC_TYPE ? bucketItem.metric.weight : 0;

      if (bucketItem) {
        bucketItem.metric.add(value);
        // TODO(abhi): Do we need this check?
        if (bucketItem.timestamp < timestamp) {
          bucketItem.timestamp = timestamp;
        }
      } else {
        bucketItem = {
          // @ts-expect-error we don't need to narrow down the type of value here, saves bundle size.
          metric: new METRIC_MAP[metricType](value),
          timestamp,
          metricType,
          name,
          unit,
          tags,
        };
        this._buckets.set(bucketKey, bucketItem);
      }

      // If value is a string, it's a set metric so calculate the delta from the previous weight.
      const val = typeof value === 'string' ? bucketItem.metric.weight - previousWeight : value;
      updateMetricSummaryOnActiveSpan(metricType, name, val, unit, unsanitizedTags, bucketKey);
    }

    /**
     * @inheritDoc
     */
     flush() {
      // short circuit if buckets are empty.
      if (this._buckets.size === 0) {
        return;
      }

      const metricBuckets = Array.from(this._buckets.values());
      captureAggregateMetrics(this._client, metricBuckets);

      this._buckets.clear();
    }

    /**
     * @inheritDoc
     */
     close() {
      clearInterval(this._interval);
      this.flush();
    }
  }

  /**
   * Create and track fetch request spans for usage in combination with `addFetchInstrumentationHandler`.
   *
   * @returns Span if a span was created, otherwise void.
   */
  function instrumentFetchRequest(
    handlerData,
    shouldCreateSpan,
    shouldAttachHeaders,
    spans,
    spanOrigin = 'auto.http.browser',
  ) {
    if (!handlerData.fetchData) {
      return undefined;
    }

    const shouldCreateSpanResult = hasTracingEnabled() && shouldCreateSpan(handlerData.fetchData.url);

    if (handlerData.endTimestamp && shouldCreateSpanResult) {
      const spanId = handlerData.fetchData.__span;
      if (!spanId) return;

      const span = spans[spanId];
      if (span) {
        endSpan(span, handlerData);

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete spans[spanId];
      }
      return undefined;
    }

    const scope = getCurrentScope();
    const client = getClient();

    const { method, url } = handlerData.fetchData;

    const fullUrl = getFullURL$1(url);
    const host = fullUrl ? parseUrl$1(fullUrl).host : undefined;

    const hasParent = !!getActiveSpan();

    const span =
      shouldCreateSpanResult && hasParent
        ? startInactiveSpan({
            name: `${method} ${url}`,
            attributes: {
              url,
              type: 'fetch',
              'http.method': method,
              'http.url': fullUrl,
              'server.address': host,
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: spanOrigin,
              [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
            },
          })
        : new SentryNonRecordingSpan();

    handlerData.fetchData.__span = span.spanContext().spanId;
    spans[span.spanContext().spanId] = span;

    if (shouldAttachHeaders(handlerData.fetchData.url) && client) {
      const request = handlerData.args[0];

      // In case the user hasn't set the second argument of a fetch call we default it to `{}`.
      handlerData.args[1] = handlerData.args[1] || {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = handlerData.args[1];

      options.headers = addTracingHeadersToFetchRequest(
        request,
        client,
        scope,
        options,
        // If performance is disabled (TWP) or there's no active root span (pageload/navigation/interaction),
        // we do not want to use the span as base for the trace headers,
        // which means that the headers will be generated from the scope and the sampling decision is deferred
        hasTracingEnabled() && hasParent ? span : undefined,
      );
    }

    return span;
  }

  /**
   * Adds sentry-trace and baggage headers to the various forms of fetch headers
   */
  function addTracingHeadersToFetchRequest(
    request, // unknown is actually type Request but we can't export DOM types from this package,
    client,
    scope,
    options

  ,
    span,
  ) {
    const isolationScope = getIsolationScope();

    const { traceId, spanId, sampled, dsc } = {
      ...isolationScope.getPropagationContext(),
      ...scope.getPropagationContext(),
    };

    const sentryTraceHeader = span ? spanToTraceHeader(span) : generateSentryTraceHeader(traceId, spanId, sampled);

    const sentryBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(
      dsc || (span ? getDynamicSamplingContextFromSpan(span) : getDynamicSamplingContextFromClient(traceId, client)),
    );

    const headers =
      options.headers ||
      (typeof Request !== 'undefined' && isInstanceOf(request, Request) ? (request ).headers : undefined);

    if (!headers) {
      return { 'sentry-trace': sentryTraceHeader, baggage: sentryBaggageHeader };
    } else if (typeof Headers !== 'undefined' && isInstanceOf(headers, Headers)) {
      const newHeaders = new Headers(headers );

      newHeaders.append('sentry-trace', sentryTraceHeader);

      if (sentryBaggageHeader) {
        // If the same header is appended multiple times the browser will merge the values into a single request header.
        // Its therefore safe to simply push a "baggage" entry, even though there might already be another baggage header.
        newHeaders.append(BAGGAGE_HEADER_NAME, sentryBaggageHeader);
      }

      return newHeaders ;
    } else if (Array.isArray(headers)) {
      const newHeaders = [...headers, ['sentry-trace', sentryTraceHeader]];

      if (sentryBaggageHeader) {
        // If there are multiple entries with the same key, the browser will merge the values into a single request header.
        // Its therefore safe to simply push a "baggage" entry, even though there might already be another baggage header.
        newHeaders.push([BAGGAGE_HEADER_NAME, sentryBaggageHeader]);
      }

      return newHeaders ;
    } else {
      const existingBaggageHeader = 'baggage' in headers ? headers.baggage : undefined;
      const newBaggageHeaders = [];

      if (Array.isArray(existingBaggageHeader)) {
        newBaggageHeaders.push(...existingBaggageHeader);
      } else if (existingBaggageHeader) {
        newBaggageHeaders.push(existingBaggageHeader);
      }

      if (sentryBaggageHeader) {
        newBaggageHeaders.push(sentryBaggageHeader);
      }

      return {
        ...(headers ),
        'sentry-trace': sentryTraceHeader,
        baggage: newBaggageHeaders.length > 0 ? newBaggageHeaders.join(',') : undefined,
      };
    }
  }

  function getFullURL$1(url) {
    try {
      const parsed = new URL(url);
      return parsed.href;
    } catch (e) {
      return undefined;
    }
  }

  function endSpan(span, handlerData) {
    if (handlerData.response) {
      setHttpStatus(span, handlerData.response.status);

      const contentLength =
        handlerData.response && handlerData.response.headers && handlerData.response.headers.get('content-length');

      if (contentLength) {
        const contentLengthNum = parseInt(contentLength);
        if (contentLengthNum > 0) {
          span.setAttribute('http.response_content_length', contentLengthNum);
        }
      }
    } else if (handlerData.error) {
      span.setStatus({ code: SPAN_STATUS_ERROR, message: 'internal_error' });
    }
    span.end();
  }

  /**
   * Send user feedback to Sentry.
   */
  function captureFeedback(
    params,
    hint = {},
    scope = getCurrentScope(),
  ) {
    const { message, name, email, url, source, associatedEventId, tags } = params;

    const feedbackEvent = {
      contexts: {
        feedback: dropUndefinedKeys({
          contact_email: email,
          name,
          message,
          url,
          source,
          associated_event_id: associatedEventId,
        }),
      },
      type: 'feedback',
      level: 'info',
      tags,
    };

    const client = (scope && scope.getClient()) || getClient();

    if (client) {
      client.emit('beforeSendFeedback', feedbackEvent, hint);
    }

    const eventId = scope.captureEvent(feedbackEvent, hint);

    return eventId;
  }

  /**
   * This is for legacy reasons, and returns a proxy object instead of a hub to be used.
   *
   * @deprecated Use the methods directly from the top level Sentry API (e.g. `Sentry.withScope`)
   * For more information see our migration guide for
   * [replacing `getCurrentHub` and `Hub`](https://github.com/getsentry/sentry-javascript/blob/develop/MIGRATION.md#deprecate-hub)
   * usage
   */
  // eslint-disable-next-line deprecation/deprecation
  function getCurrentHubShim() {
    return {
      bindClient(client) {
        const scope = getCurrentScope();
        scope.setClient(client);
      },

      withScope,
      getClient: () => getClient() ,
      getScope: getCurrentScope,
      getIsolationScope,
      captureException: (exception, hint) => {
        return getCurrentScope().captureException(exception, hint);
      },
      captureMessage: (message, level, hint) => {
        return getCurrentScope().captureMessage(message, level, hint);
      },
      captureEvent,
      addBreadcrumb,
      setUser,
      setTags,
      setTag,
      setExtra,
      setExtras,
      setContext,

      getIntegration(integration) {
        const client = getClient();
        return (client && client.getIntegrationByName(integration.id)) || null;
      },

      startSession,
      endSession,
      captureSession(end) {
        // both send the update and pull the session from the scope
        if (end) {
          return endSession();
        }

        // only send the update
        _sendSessionUpdate();
      },
    };
  }

  /**
   * Returns the default hub instance.
   *
   * If a hub is already registered in the global carrier but this module
   * contains a more recent version, it replaces the registered version.
   * Otherwise, the currently registered hub will be returned.
   *
   * @deprecated Use the respective replacement method directly instead.
   */
  // eslint-disable-next-line deprecation/deprecation
  const getCurrentHub = getCurrentHubShim;

  /**
   * Sends the current Session on the scope
   */
  function _sendSessionUpdate() {
    const scope = getCurrentScope();
    const client = getClient();

    const session = scope.getSession();
    if (client && session) {
      client.captureSession(session);
    }
  }

  const WINDOW$3 = GLOBAL_OBJ ;

  let ignoreOnError = 0;

  /**
   * @hidden
   */
  function shouldIgnoreOnError() {
    return ignoreOnError > 0;
  }

  /**
   * @hidden
   */
  function ignoreNextOnError() {
    // onerror should trigger before setTimeout
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
  function wrap(
    fn,
    options

   = {},
    before,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) {
    // for future readers what this does is wrap a function and then create
    // a bi-directional wrapping between them.
    //
    // example: wrapped = wrap(original);
    //  original.__sentry_wrapped__ -> wrapped
    //  wrapped.__sentry_original__ -> original

    if (typeof fn !== 'function') {
      return fn;
    }

    try {
      // if we're dealing with a function that was previously wrapped, return
      // the original wrapper.
      const wrapper = fn.__sentry_wrapped__;
      if (wrapper) {
        return wrapper;
      }

      // We don't wanna wrap it twice
      if (getOriginalFunction(fn)) {
        return fn;
      }
    } catch (e) {
      // Just accessing custom props in some Selenium environments
      // can cause a "Permission denied" exception (see raven-js#495).
      // Bail on wrapping and return the function as-is (defers to window.onerror).
      return fn;
    }

    /* eslint-disable prefer-rest-params */
    // It is important that `sentryWrapped` is not an arrow function to preserve the context of `this`
    const sentryWrapped = function () {
      const args = Array.prototype.slice.call(arguments);

      try {
        if (before && typeof before === 'function') {
          before.apply(this, arguments);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        const wrappedArguments = args.map((arg) => wrap(arg, options));

        // Attempt to invoke user-land function
        // NOTE: If you are a Sentry user, and you are seeing this stack frame, it
        //       means the sentry.javascript SDK caught an error invoking your application code. This
        //       is expected behavior and NOT indicative of a bug with sentry.javascript.
        return fn.apply(this, wrappedArguments);
      } catch (ex) {
        ignoreNextOnError();

        withScope(scope => {
          scope.addEventProcessor(event => {
            if (options.mechanism) {
              addExceptionTypeValue(event, undefined, undefined);
              addExceptionMechanism(event, options.mechanism);
            }

            event.extra = {
              ...event.extra,
              arguments: args,
            };

            return event;
          });

          captureException(ex);
        });

        throw ex;
      }
    };
    /* eslint-enable prefer-rest-params */

    // Accessing some objects may throw
    // ref: https://github.com/getsentry/sentry-javascript/issues/1168
    try {
      for (const property in fn) {
        if (Object.prototype.hasOwnProperty.call(fn, property)) {
          sentryWrapped[property] = fn[property];
        }
      }
    } catch (_oO) {} // eslint-disable-line no-empty

    // Signal that this function has been wrapped/filled already
    // for both debugging and to prevent it to being wrapped/filled twice
    markFunctionWrapped(sentryWrapped, fn);

    addNonEnumerableProperty(fn, '__sentry_wrapped__', sentryWrapped);

    // Restore original function name (not all browsers allow that)
    try {
      const descriptor = Object.getOwnPropertyDescriptor(sentryWrapped, 'name') ;
      if (descriptor.configurable) {
        Object.defineProperty(sentryWrapped, 'name', {
          get() {
            return fn.name;
          },
        });
      }
      // eslint-disable-next-line no-empty
    } catch (_oO) {}

    return sentryWrapped;
  }

  /**
   * This function creates an exception from a JavaScript Error
   */
  function exceptionFromError(stackParser, ex) {
    // Get the frames first since Opera can lose the stack if we touch anything else first
    const frames = parseStackFrames(stackParser, ex);

    const exception = {
      type: ex && ex.name,
      value: extractMessage(ex),
    };

    if (frames.length) {
      exception.stacktrace = { frames };
    }

    if (exception.type === undefined && exception.value === '') {
      exception.value = 'Unrecoverable error caught';
    }

    return exception;
  }

  function eventFromPlainObject(
    stackParser,
    exception,
    syntheticException,
    isUnhandledRejection,
  ) {
    const client = getClient();
    const normalizeDepth = client && client.getOptions().normalizeDepth;

    // If we can, we extract an exception from the object properties
    const errorFromProp = getErrorPropertyFromObject(exception);

    const extra = {
      __serialized__: normalizeToSize(exception, normalizeDepth),
    };

    if (errorFromProp) {
      return {
        exception: {
          values: [exceptionFromError(stackParser, errorFromProp)],
        },
        extra,
      };
    }

    const event = {
      exception: {
        values: [
          {
            type: isEvent(exception) ? exception.constructor.name : isUnhandledRejection ? 'UnhandledRejection' : 'Error',
            value: getNonErrorObjectExceptionValue(exception, { isUnhandledRejection }),
          } ,
        ],
      },
      extra,
    } ;

    if (syntheticException) {
      const frames = parseStackFrames(stackParser, syntheticException);
      if (frames.length) {
        // event.exception.values[0] has been set above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        event.exception.values[0].stacktrace = { frames };
      }
    }

    return event;
  }

  function eventFromError(stackParser, ex) {
    return {
      exception: {
        values: [exceptionFromError(stackParser, ex)],
      },
    };
  }

  /** Parses stack frames from an error */
  function parseStackFrames(
    stackParser,
    ex,
  ) {
    // Access and store the stacktrace property before doing ANYTHING
    // else to it because Opera is not very good at providing it
    // reliably in other circumstances.
    const stacktrace = ex.stacktrace || ex.stack || '';

    const skipLines = getSkipFirstStackStringLines(ex);
    const framesToPop = getPopFirstTopFrames(ex);

    try {
      return stackParser(stacktrace, skipLines, framesToPop);
    } catch (e) {
      // no-empty
    }

    return [];
  }

  // Based on our own mapping pattern - https://github.com/getsentry/sentry/blob/9f08305e09866c8bd6d0c24f5b0aabdd7dd6c59c/src/sentry/lang/javascript/errormapping.py#L83-L108
  const reactMinifiedRegexp = /Minified React error #\d+;/i;

  /**
   * Certain known React errors contain links that would be falsely
   * parsed as frames. This function check for these errors and
   * returns number of the stack string lines to skip.
   */
  function getSkipFirstStackStringLines(ex) {
    if (ex && reactMinifiedRegexp.test(ex.message)) {
      return 1;
    }

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
    if (typeof ex.framesToPop === 'number') {
      return ex.framesToPop;
    }

    return 0;
  }

  /**
   * There are cases where stacktrace.message is an Event object
   * https://github.com/getsentry/sentry-javascript/issues/1949
   * In this specific case we try to extract stacktrace.message.error.message
   */
  function extractMessage(ex) {
    const message = ex && ex.message;
    if (!message) {
      return 'No error message';
    }
    if (message.error && typeof message.error.message === 'string') {
      return message.error.message;
    }
    return message;
  }

  /**
   * Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
   * @hidden
   */
  function eventFromException(
    stackParser,
    exception,
    hint,
    attachStacktrace,
  ) {
    const syntheticException = (hint && hint.syntheticException) || undefined;
    const event = eventFromUnknownInput(stackParser, exception, syntheticException, attachStacktrace);
    addExceptionMechanism(event); // defaults to { type: 'generic', handled: true }
    event.level = 'error';
    if (hint && hint.event_id) {
      event.event_id = hint.event_id;
    }
    return resolvedSyncPromise(event);
  }

  /**
   * Builds and Event from a Message
   * @hidden
   */
  function eventFromMessage(
    stackParser,
    message,
    level = 'info',
    hint,
    attachStacktrace,
  ) {
    const syntheticException = (hint && hint.syntheticException) || undefined;
    const event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
    event.level = level;
    if (hint && hint.event_id) {
      event.event_id = hint.event_id;
    }
    return resolvedSyncPromise(event);
  }

  /**
   * @hidden
   */
  function eventFromUnknownInput(
    stackParser,
    exception,
    syntheticException,
    attachStacktrace,
    isUnhandledRejection,
  ) {
    let event;

    if (isErrorEvent$2(exception ) && (exception ).error) {
      // If it is an ErrorEvent with `error` property, extract it to get actual Error
      const errorEvent = exception ;
      return eventFromError(stackParser, errorEvent.error );
    }

    // If it is a `DOMError` (which is a legacy API, but still supported in some browsers) then we just extract the name
    // and message, as it doesn't provide anything else. According to the spec, all `DOMExceptions` should also be
    // `Error`s, but that's not the case in IE11, so in that case we treat it the same as we do a `DOMError`.
    //
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMError
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMException
    // https://webidl.spec.whatwg.org/#es-DOMException-specialness
    if (isDOMError(exception) || isDOMException(exception )) {
      const domException = exception ;

      if ('stack' in (exception )) {
        event = eventFromError(stackParser, exception );
      } else {
        const name = domException.name || (isDOMError(domException) ? 'DOMError' : 'DOMException');
        const message = domException.message ? `${name}: ${domException.message}` : name;
        event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
        addExceptionTypeValue(event, message);
      }
      if ('code' in domException) {
        // eslint-disable-next-line deprecation/deprecation
        event.tags = { ...event.tags, 'DOMException.code': `${domException.code}` };
      }

      return event;
    }
    if (isError(exception)) {
      // we have a real Error object, do nothing
      return eventFromError(stackParser, exception);
    }
    if (isPlainObject(exception) || isEvent(exception)) {
      // If it's a plain object or an instance of `Event` (the built-in JS kind, not this SDK's `Event` type), serialize
      // it manually. This will allow us to group events based on top-level keys which is much better than creating a new
      // group on any key/value change.
      const objectException = exception ;
      event = eventFromPlainObject(stackParser, objectException, syntheticException, isUnhandledRejection);
      addExceptionMechanism(event, {
        synthetic: true,
      });
      return event;
    }

    // If none of previous checks were valid, then it means that it's not:
    // - an instance of DOMError
    // - an instance of DOMException
    // - an instance of Event
    // - an instance of Error
    // - a valid ErrorEvent (one with an error property)
    // - a plain Object
    //
    // So bail out and capture it as a simple message:
    event = eventFromString(stackParser, exception , syntheticException, attachStacktrace);
    addExceptionTypeValue(event, `${exception}`, undefined);
    addExceptionMechanism(event, {
      synthetic: true,
    });

    return event;
  }

  function eventFromString(
    stackParser,
    message,
    syntheticException,
    attachStacktrace,
  ) {
    const event = {};

    if (attachStacktrace && syntheticException) {
      const frames = parseStackFrames(stackParser, syntheticException);
      if (frames.length) {
        event.exception = {
          values: [{ value: message, stacktrace: { frames } }],
        };
      }
    }

    if (isParameterizedString(message)) {
      const { __sentry_template_string__, __sentry_template_values__ } = message;

      event.logentry = {
        message: __sentry_template_string__,
        params: __sentry_template_values__,
      };
      return event;
    }

    event.message = message;
    return event;
  }

  function getNonErrorObjectExceptionValue(
    exception,
    { isUnhandledRejection },
  ) {
    const keys = extractExceptionKeysForMessage(exception);
    const captureType = isUnhandledRejection ? 'promise rejection' : 'exception';

    // Some ErrorEvent instances do not have an `error` property, which is why they are not handled before
    // We still want to try to get a decent message for these cases
    if (isErrorEvent$2(exception)) {
      return `Event \`ErrorEvent\` captured as ${captureType} with message \`${exception.message}\``;
    }

    if (isEvent(exception)) {
      const className = getObjectClassName(exception);
      return `Event \`${className}\` (type=${exception.type}) captured as ${captureType}`;
    }

    return `Object captured as ${captureType} with keys: ${keys}`;
  }

  function getObjectClassName(obj) {
    try {
      const prototype = Object.getPrototypeOf(obj);
      return prototype ? prototype.constructor.name : undefined;
    } catch (e) {
      // ignore errors here
    }
  }

  /** If a plain object has a property that is an `Error`, return this error. */
  function getErrorPropertyFromObject(obj) {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        const value = obj[prop];
        if (value instanceof Error) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * Creates an envelope from a user feedback.
   */
  function createUserFeedbackEnvelope(
    feedback,
    {
      metadata,
      tunnel,
      dsn,
    }

  ,
  ) {
    const headers = {
      event_id: feedback.event_id,
      sent_at: new Date().toISOString(),
      ...(metadata &&
        metadata.sdk && {
          sdk: {
            name: metadata.sdk.name,
            version: metadata.sdk.version,
          },
        }),
      ...(!!tunnel && !!dsn && { dsn: dsnToString(dsn) }),
    };
    const item = createUserFeedbackEnvelopeItem(feedback);

    return createEnvelope(headers, [item]);
  }

  function createUserFeedbackEnvelopeItem(feedback) {
    const feedbackHeaders = {
      type: 'user_report',
    };
    return [feedbackHeaders, feedback];
  }

  /**
   * Configuration options for the Sentry Browser SDK.
   * @see @sentry/types Options for more information.
   */

  /**
   * The Sentry Browser SDK Client.
   *
   * @see BrowserOptions for documentation on configuration options.
   * @see SentryClient for usage documentation.
   */
  class BrowserClient extends BaseClient {
    /**
     * Creates a new Browser SDK instance.
     *
     * @param options Configuration options for this SDK.
     */
     constructor(options) {
      const opts = {
        // We default this to true, as it is the safer scenario
        parentSpanIsAlwaysRootSpan: true,
        ...options,
      };
      const sdkSource = WINDOW$3.SENTRY_SDK_SOURCE || getSDKSource();
      applySdkMetadata(opts, 'browser', ['browser'], sdkSource);

      super(opts);

      if (opts.sendClientReports && WINDOW$3.document) {
        WINDOW$3.document.addEventListener('visibilitychange', () => {
          if (WINDOW$3.document.visibilityState === 'hidden') {
            this._flushOutcomes();
          }
        });
      }
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
     eventFromMessage(
      message,
      level = 'info',
      hint,
    ) {
      return eventFromMessage(this._options.stackParser, message, level, hint, this._options.attachStacktrace);
    }

    /**
     * Sends user feedback to Sentry.
     *
     * @deprecated Use `captureFeedback` instead.
     */
     captureUserFeedback(feedback) {
      if (!this._isEnabled()) {
        logger.warn('SDK not enabled, will not capture user feedback.');
        return;
      }

      const envelope = createUserFeedbackEnvelope(feedback, {
        metadata: this.getSdkMetadata(),
        dsn: this.getDsn(),
        tunnel: this.getOptions().tunnel,
      });

      // sendEnvelope should not throw
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sendEnvelope(envelope);
    }

    /**
     * @inheritDoc
     */
     _prepareEvent(event, hint, scope) {
      event.platform = event.platform || 'javascript';
      return super._prepareEvent(event, hint, scope);
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

  const WINDOW$2 = GLOBAL_OBJ

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
    return `v3-${Date.now()}-${Math.floor(Math.random() * (9e12 - 1)) + 1e12}`;
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

  const getNavigationEntry = () => {
    return WINDOW$2.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
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
      if ((WINDOW$2.document && WINDOW$2.document.prerendering) || getActivationStart() > 0) {
        navigationType = 'prerender';
      } else if (WINDOW$2.document && WINDOW$2.document.wasDiscarded) {
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

  const onHidden = (cb) => {
    const onHiddenOrPageHide = (event) => {
      if (event.type === 'pagehide' || (WINDOW$2.document && WINDOW$2.document.visibilityState === 'hidden')) {
        cb(event);
      }
    };

    if (WINDOW$2.document) {
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
    return (arg) => {
      if (!called) {
        cb(arg);
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
    firstHiddenTime = WINDOW$2.document.visibilityState === 'hidden' && !WINDOW$2.document.prerendering ? 0 : Infinity;
  };

  const onVisibilityUpdate = (event) => {
    // If the document is 'hidden' and no previous hidden timestamp has been
    // set, update it based on the current event data.
    if (WINDOW$2.document.visibilityState === 'hidden' && firstHiddenTime > -1) {
      // If the event is a 'visibilitychange' event, it means the page was
      // visible prior to this change, so the event timestamp is the first
      // hidden time.
      // However, if the event is not a 'visibilitychange' event, then it must
      // be a 'prerenderingchange' event, and the fact that the document is
      // still 'hidden' from the above check means the tab was activated
      // in a background state and so has always been hidden.
      firstHiddenTime = event.type === 'visibilitychange' ? event.timeStamp : 0;

      // Remove all listeners now that a `firstHiddenTime` value has been set.
      removeEventListener('visibilitychange', onVisibilityUpdate, true);
      removeEventListener('prerenderingchange', onVisibilityUpdate, true);
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

  const getVisibilityWatcher = () => {
    if (WINDOW$2.document && firstHiddenTime < 0) {
      // If the document is hidden when this code runs, assume it was hidden
      // since navigation start. This isn't a perfect heuristic, but it's the
      // best we can do until an API is available to support querying past
      // visibilityState.
      initHiddenTime();
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
    if (WINDOW$2.document && WINDOW$2.document.prerendering) {
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
        (entries ).forEach(entry => {
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

  let interactionCountEstimate = 0;
  let minKnownInteractionId = Infinity;
  let maxKnownInteractionId = 0;

  const updateEstimate = (entries) => {
    (entries ).forEach(e => {
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

  // Used to store the interaction count after a bfcache restore, since p98
  // interaction latencies should only consider the current navigation.
  const prevInteractionCount = 0;

  /**
   * Returns the interaction count since the last bfcache restore (or for the
   * full page lifecycle if there were no bfcache restores).
   */
  const getInteractionCountForNavigation = () => {
    return getInteractionCount() - prevInteractionCount;
  };

  // To prevent unnecessary memory usage on pages with lots of interactions,
  // store at most 10 of the longest interactions to consider as INP candidates.
  const MAX_INTERACTIONS_TO_CONSIDER = 10;

  // A list of longest interactions on the page (by latency) sorted so the
  // longest one is first. The list is as most MAX_INTERACTIONS_TO_CONSIDER long.
  const longestInteractionList = [];

  // A mapping of longest interactions by their interaction ID.
  // This is used for faster lookup.
  const longestInteractionMap = {};

  /**
   * Takes a performance entry and adds it to the list of worst interactions
   * if its duration is long enough to make it among the worst. If the
   * entry is part of an existing interaction, it is merged and the latency
   * and entries list is updated as needed.
   */
  const processEntry = (entry) => {
    // The least-long of the 10 longest interactions.
    const minLongestInteraction = longestInteractionList[longestInteractionList.length - 1];

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const existingInteraction = longestInteractionMap[entry.interactionId];

    // Only process the entry if it's possibly one of the ten longest,
    // or if it's part of an existing interaction.
    if (
      existingInteraction ||
      longestInteractionList.length < MAX_INTERACTIONS_TO_CONSIDER ||
      (minLongestInteraction && entry.duration > minLongestInteraction.latency)
    ) {
      // If the interaction already exists, update it. Otherwise create one.
      if (existingInteraction) {
        existingInteraction.entries.push(entry);
        existingInteraction.latency = Math.max(existingInteraction.latency, entry.duration);
      } else {
        const interaction = {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: entry.interactionId,
          latency: entry.duration,
          entries: [entry],
        };
        longestInteractionMap[interaction.id] = interaction;
        longestInteractionList.push(interaction);
      }

      // Sort the entries by latency (descending) and keep only the top ten.
      longestInteractionList.sort((a, b) => b.latency - a.latency);
      longestInteractionList.splice(MAX_INTERACTIONS_TO_CONSIDER).forEach(i => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete longestInteractionMap[i.id];
      });
    }
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
    whenActivated(() => {
      // TODO(philipwalton): remove once the polyfill is no longer needed.
      initInteractionCountPolyfill();

      const metric = initMetric('INP');
      // eslint-disable-next-line prefer-const
      let report;

      const handleEntries = (entries) => {
        entries.forEach(entry => {
          if (entry.interactionId) {
            processEntry(entry);
          }

          // Entries of type `first-input` don't currently have an `interactionId`,
          // so to consider them in INP we have to first check that an existing
          // entry doesn't match the `duration` and `startTime`.
          // Note that this logic assumes that `event` entries are dispatched
          // before `first-input` entries. This is true in Chrome (the only browser
          // that currently supports INP).
          // TODO(philipwalton): remove once crbug.com/1325826 is fixed.
          if (entry.entryType === 'first-input') {
            const noMatchingEntry = !longestInteractionList.some(interaction => {
              return interaction.entries.some(prevEntry => {
                return entry.duration === prevEntry.duration && entry.startTime === prevEntry.startTime;
              });
            });
            if (noMatchingEntry) {
              processEntry(entry);
            }
          }
        });

        const inp = estimateP98LongestInteraction();

        if (inp && inp.latency !== metric.value) {
          metric.value = inp.latency;
          metric.entries = inp.entries;
          report();
        }
      };

      const po = observe('event', handleEntries, {
        // Event Timing entries have their durations rounded to the nearest 8ms,
        // so a duration of 40ms would be any event that spans 2.5 or more frames
        // at 60Hz. This threshold is chosen to strike a balance between usefulness
        // and performance. Running this callback for any interaction that spans
        // just one or two frames is likely not worth the insight that could be
        // gained.
        durationThreshold: opts.durationThreshold != null ? opts.durationThreshold : 40,
      } );

      report = bindReporter(onReport, metric, INPThresholds, opts.reportAllChanges);

      if (po) {
        // If browser supports interactionId (and so supports INP), also
        // observe entries of type `first-input`. This is useful in cases
        // where the first interaction is less than the `durationThreshold`.
        if ('PerformanceEventTiming' in WINDOW$2 && 'interactionId' in PerformanceEventTiming.prototype) {
          po.observe({ type: 'first-input', buffered: true });
        }

        onHidden(() => {
          handleEntries(po.takeRecords() );

          // If the interaction count shows that there were interactions but
          // none were captured by the PerformanceObserver, report a latency of 0.
          if (metric.value < 0 && getInteractionCountForNavigation() > 0) {
            metric.value = 0;
            metric.entries = [];
          }

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
        const lastEntry = entries[entries.length - 1] ;
        if (lastEntry) {
          // Only report if the page wasn't hidden prior to LCP.
          if (lastEntry.startTime < visibilityWatcher.firstHiddenTime) {
            // The startTime attribute returns the value of the renderTime if it is
            // not 0, and the value of the loadTime otherwise. The activationStart
            // reference is used because LCP should be relative to page activation
            // rather than navigation start if the page was prerendered. But in cases
            // where `activationStart` occurs after the LCP, this time should be
            // clamped at 0.
            metric.value = Math.max(lastEntry.startTime - getActivationStart(), 0);
            metric.entries = [lastEntry];
            report();
          }
        }
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
          if (WINDOW$2.document) {
            // Wrap in a setTimeout so the callback is run in a separate task
            // to avoid extending the keyboard/click handler to reduce INP impact
            // https://github.com/GoogleChrome/web-vitals/issues/383
            addEventListener(type, () => setTimeout(stopListening, 0), true);
          }
        });

        onHidden(stopListening);
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

  /** Thresholds for TTFB. See https://web.dev/articles/ttfb#what_is_a_good_ttfb_score */
  const TTFBThresholds = [800, 1800];

  /**
   * Runs in the next task after the page is done loading and/or prerendering.
   * @param callback
   */
  const whenReady = (callback) => {
    if (WINDOW$2.document && WINDOW$2.document.prerendering) {
      whenActivated(() => whenReady(callback));
    } else if (WINDOW$2.document && WINDOW$2.document.readyState !== 'complete') {
      addEventListener('load', () => whenReady(callback), true);
    } else {
      // Queue a task so the callback runs after `loadEventEnd`.
      setTimeout(callback, 0);
    }
  };

  /**
   * Calculates the [TTFB](https://web.dev/articles/ttfb) value for the
   * current page and calls the `callback` function once the page has loaded,
   * along with the relevant `navigation` performance entry used to determine the
   * value. The reported value is a `DOMHighResTimeStamp`.
   *
   * Note, this function waits until after the page is loaded to call `callback`
   * in order to ensure all properties of the `navigation` entry are populated.
   * This is useful if you want to report on other metrics exposed by the
   * [Navigation Timing API](https://w3c.github.io/navigation-timing/). For
   * example, the TTFB metric starts from the page's [time
   * origin](https://www.w3.org/TR/hr-time-2/#sec-time-origin), which means it
   * includes time spent on DNS lookup, connection negotiation, network latency,
   * and server processing time.
   */
  const onTTFB = (onReport, opts = {}) => {
    const metric = initMetric('TTFB');
    const report = bindReporter(onReport, metric, TTFBThresholds, opts.reportAllChanges);

    whenReady(() => {
      const navEntry = getNavigationEntry();

      if (navEntry) {
        const responseStart = navEntry.responseStart;

        // In some cases no value is reported by the browser (for
        // privacy/security reasons), and in other cases (bugs) the value is
        // negative or is larger than the current page time. Ignore these cases:
        // https://github.com/GoogleChrome/web-vitals/issues/137
        // https://github.com/GoogleChrome/web-vitals/issues/162
        // https://github.com/GoogleChrome/web-vitals/issues/275
        if (responseStart <= 0 || responseStart > performance.now()) return;

        // The activationStart reference is used because TTFB should be
        // relative to page activation rather than navigation start if the
        // page was prerendered. But in cases where `activationStart` occurs
        // after the first byte is received, this time should be clamped at 0.
        metric.value = Math.max(responseStart - getActivationStart(), 0);

        metric.entries = [navEntry];
        report(true);
      }
    });
  };

  const handlers$1 = {};
  const instrumented = {};

  let _previousCls;
  let _previousFid;
  let _previousLcp;
  let _previousTtfb;
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
   * Add a callback that will be triggered when a FID metric is available.
   */
  function addTtfbInstrumentationHandler(callback) {
    return addMetricObserver('ttfb', callback, instrumentTtfb, _previousTtfb);
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
        logger.error(
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

  function instrumentTtfb() {
    return onTTFB(metric => {
      triggerHandlers('ttfb', {
        metric,
      });
      _previousTtfb = metric;
    });
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

  /**
   * Check if a PerformanceEntry is a PerformanceEventTiming by checking for the `duration` property.
   */
  function isPerformanceEventTiming(entry) {
    return 'duration' in entry;
  }

  /**
   * Checks if a given value is a valid measurement value.
   */
  function isMeasurementValue(value) {
    return typeof value === 'number' && isFinite(value);
  }

  /**
   * Helper function to start child on transactions. This function will make sure that the transaction will
   * use the start timestamp of the created child span if it is earlier than the transactions actual
   * start timestamp.
   */
  function startAndEndSpan(
    parentSpan,
    startTimeInSeconds,
    endTime,
    { ...ctx },
  ) {
    const parentStartTime = spanToJSON(parentSpan).start_timestamp;
    if (parentStartTime && parentStartTime > startTimeInSeconds) {
      // We can only do this for SentrySpans...
      if (typeof (parentSpan ).updateStartTime === 'function') {
        (parentSpan ).updateStartTime(startTimeInSeconds);
      }
    }

    // The return value only exists for tests
    return withActiveSpan(parentSpan, () => {
      const span = startInactiveSpan({
        startTime: startTimeInSeconds,
        ...ctx,
      });

      if (span) {
        span.end(endTime);
      }

      return span;
    });
  }

  /** Get the browser performance API. */
  function getBrowserPerformanceAPI() {
    // @ts-expect-error we want to make sure all of these are available, even if TS is sure they are
    return WINDOW$2 && WINDOW$2.addEventListener && WINDOW$2.performance;
  }

  /**
   * Converts from milliseconds to seconds
   * @param time time in ms
   */
  function msToSec(time) {
    return time / 1000;
  }

  /* eslint-disable max-lines */

  const MAX_INT_AS_BYTES = 2147483647;

  let _performanceCursor = 0;

  let _measurements = {};
  let _lcpEntry;
  let _clsEntry;

  /**
   * Start tracking web vitals.
   * The callback returned by this function can be used to stop tracking & ensure all measurements are final & captured.
   *
   * @returns A function that forces web vitals collection
   */
  function startTrackingWebVitals() {
    const performance = getBrowserPerformanceAPI();
    if (performance && browserPerformanceTimeOrigin) {
      // @ts-expect-error we want to make sure all of these are available, even if TS is sure they are
      if (performance.mark) {
        WINDOW$2.performance.mark('sentry-tracing-init');
      }
      const fidCallback = _trackFID();
      const clsCallback = _trackCLS();
      const lcpCallback = _trackLCP();
      const ttfbCallback = _trackTtfb();

      return () => {
        fidCallback();
        clsCallback();
        lcpCallback();
        ttfbCallback();
      };
    }

    return () => undefined;
  }

  /**
   * Start tracking long tasks.
   */
  function startTrackingLongTasks() {
    addPerformanceInstrumentationHandler('longtask', ({ entries }) => {
      if (!getActiveSpan()) {
        return;
      }
      for (const entry of entries) {
        const startTime = msToSec((browserPerformanceTimeOrigin ) + entry.startTime);
        const duration = msToSec(entry.duration);

        const span = startInactiveSpan({
          name: 'Main UI thread blocked',
          op: 'ui.long-task',
          startTime,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
          },
        });
        if (span) {
          span.end(startTime + duration);
        }
      }
    });
  }

  /**
   * Start tracking long animation frames.
   */
  function startTrackingLongAnimationFrames() {
    // NOTE: the current web-vitals version (3.5.2) does not support long-animation-frame, so
    // we directly observe `long-animation-frame` events instead of through the web-vitals
    // `observe` helper function.
    const observer = new PerformanceObserver(list => {
      if (!getActiveSpan()) {
        return;
      }
      for (const entry of list.getEntries() ) {
        if (!entry.scripts[0]) {
          continue;
        }

        const startTime = msToSec((browserPerformanceTimeOrigin ) + entry.startTime);
        const duration = msToSec(entry.duration);

        const attributes = {
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
        };

        const initialScript = entry.scripts[0];
        const { invoker, invokerType, sourceURL, sourceFunctionName, sourceCharPosition } = initialScript;
        attributes['browser.script.invoker'] = invoker;
        attributes['browser.script.invoker_type'] = invokerType;
        if (sourceURL) {
          attributes['code.filepath'] = sourceURL;
        }
        if (sourceFunctionName) {
          attributes['code.function'] = sourceFunctionName;
        }
        if (sourceCharPosition !== -1) {
          attributes['browser.script.source_char_position'] = sourceCharPosition;
        }

        const span = startInactiveSpan({
          name: 'Main UI thread blocked',
          op: 'ui.long-animation-frame',
          startTime,
          attributes,
        });
        if (span) {
          span.end(startTime + duration);
        }
      }
    });

    observer.observe({ type: 'long-animation-frame', buffered: true });
  }

  /**
   * Start tracking interaction events.
   */
  function startTrackingInteractions() {
    addPerformanceInstrumentationHandler('event', ({ entries }) => {
      if (!getActiveSpan()) {
        return;
      }
      for (const entry of entries) {
        if (entry.name === 'click') {
          const startTime = msToSec((browserPerformanceTimeOrigin ) + entry.startTime);
          const duration = msToSec(entry.duration);

          const spanOptions = {
            name: htmlTreeAsString(entry.target),
            op: `ui.interaction.${entry.name}`,
            startTime: startTime,
            attributes: {
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
            },
          };

          const componentName = getComponentName(entry.target);
          if (componentName) {
            spanOptions.attributes['ui.component_name'] = componentName;
          }

          const span = startInactiveSpan(spanOptions);
          if (span) {
            span.end(startTime + duration);
          }
        }
      }
    });
  }

  /** Starts tracking the Cumulative Layout Shift on the current page. */
  function _trackCLS() {
    return addClsInstrumentationHandler(({ metric }) => {
      const entry = metric.entries[metric.entries.length - 1];
      if (!entry) {
        return;
      }

      logger.log('[Measurements] Adding CLS');
      _measurements['cls'] = { value: metric.value, unit: '' };
      _clsEntry = entry ;
    }, true);
  }

  /** Starts tracking the Largest Contentful Paint on the current page. */
  function _trackLCP() {
    return addLcpInstrumentationHandler(({ metric }) => {
      const entry = metric.entries[metric.entries.length - 1];
      if (!entry) {
        return;
      }

      logger.log('[Measurements] Adding LCP');
      _measurements['lcp'] = { value: metric.value, unit: 'millisecond' };
      _lcpEntry = entry ;
    }, true);
  }

  /** Starts tracking the First Input Delay on the current page. */
  function _trackFID() {
    return addFidInstrumentationHandler(({ metric }) => {
      const entry = metric.entries[metric.entries.length - 1];
      if (!entry) {
        return;
      }

      const timeOrigin = msToSec(browserPerformanceTimeOrigin );
      const startTime = msToSec(entry.startTime);
      logger.log('[Measurements] Adding FID');
      _measurements['fid'] = { value: metric.value, unit: 'millisecond' };
      _measurements['mark.fid'] = { value: timeOrigin + startTime, unit: 'second' };
    });
  }

  function _trackTtfb() {
    return addTtfbInstrumentationHandler(({ metric }) => {
      const entry = metric.entries[metric.entries.length - 1];
      if (!entry) {
        return;
      }

      logger.log('[Measurements] Adding TTFB');
      _measurements['ttfb'] = { value: metric.value, unit: 'millisecond' };
    });
  }

  /** Add performance related spans to a transaction */
  function addPerformanceEntries(span) {
    const performance = getBrowserPerformanceAPI();
    if (!performance || !WINDOW$2.performance.getEntries || !browserPerformanceTimeOrigin) {
      // Gatekeeper if performance API not available
      return;
    }

    logger.log('[Tracing] Adding & adjusting spans using Performance API');
    const timeOrigin = msToSec(browserPerformanceTimeOrigin);

    const performanceEntries = performance.getEntries();

    const { op, start_timestamp: transactionStartTime } = spanToJSON(span);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    performanceEntries.slice(_performanceCursor).forEach((entry) => {
      const startTime = msToSec(entry.startTime);
      const duration = msToSec(
        // Inexplicibly, Chrome sometimes emits a negative duration. We need to work around this.
        // There is a SO post attempting to explain this, but it leaves one with open questions: https://stackoverflow.com/questions/23191918/peformance-getentries-and-negative-duration-display
        // The way we clamp the value is probably not accurate, since we have observed this happen for things that may take a while to load, like for example the replay worker.
        // TODO: Investigate why this happens and how to properly mitigate. For now, this is a workaround to prevent transactions being dropped due to negative duration spans.
        Math.max(0, entry.duration),
      );

      if (op === 'navigation' && transactionStartTime && timeOrigin + startTime < transactionStartTime) {
        return;
      }

      switch (entry.entryType) {
        case 'navigation': {
          _addNavigationSpans(span, entry, timeOrigin);
          break;
        }
        case 'mark':
        case 'paint':
        case 'measure': {
          _addMeasureSpans(span, entry, startTime, duration, timeOrigin);

          // capture web vitals
          const firstHidden = getVisibilityWatcher();
          // Only report if the page wasn't hidden prior to the web vital.
          const shouldRecord = entry.startTime < firstHidden.firstHiddenTime;

          if (entry.name === 'first-paint' && shouldRecord) {
            logger.log('[Measurements] Adding FP');
            _measurements['fp'] = { value: entry.startTime, unit: 'millisecond' };
          }
          if (entry.name === 'first-contentful-paint' && shouldRecord) {
            logger.log('[Measurements] Adding FCP');
            _measurements['fcp'] = { value: entry.startTime, unit: 'millisecond' };
          }
          break;
        }
        case 'resource': {
          _addResourceSpans(span, entry, entry.name , startTime, duration, timeOrigin);
          break;
        }
        // Ignore other entry types.
      }
    });

    _performanceCursor = Math.max(performanceEntries.length - 1, 0);

    _trackNavigator(span);

    // Measurements are only available for pageload transactions
    if (op === 'pageload') {
      _addTtfbRequestTimeToMeasurements(_measurements);

      ['fcp', 'fp', 'lcp'].forEach(name => {
        const measurement = _measurements[name];
        if (!measurement || !transactionStartTime || timeOrigin >= transactionStartTime) {
          return;
        }
        // The web vitals, fcp, fp, lcp, and ttfb, all measure relative to timeOrigin.
        // Unfortunately, timeOrigin is not captured within the span span data, so these web vitals will need
        // to be adjusted to be relative to span.startTimestamp.
        const oldValue = measurement.value;
        const measurementTimestamp = timeOrigin + msToSec(oldValue);

        // normalizedValue should be in milliseconds
        const normalizedValue = Math.abs((measurementTimestamp - transactionStartTime) * 1000);
        const delta = normalizedValue - oldValue;

        logger.log(`[Measurements] Normalized ${name} from ${oldValue} to ${normalizedValue} (${delta})`);
        measurement.value = normalizedValue;
      });

      const fidMark = _measurements['mark.fid'];
      if (fidMark && _measurements['fid']) {
        // create span for FID
        startAndEndSpan(span, fidMark.value, fidMark.value + msToSec(_measurements['fid'].value), {
          name: 'first input delay',
          op: 'ui.action',
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
          },
        });

        // Delete mark.fid as we don't want it to be part of final payload
        delete _measurements['mark.fid'];
      }

      // If FCP is not recorded we should not record the cls value
      // according to the new definition of CLS.
      if (!('fcp' in _measurements)) {
        delete _measurements.cls;
      }

      Object.entries(_measurements).forEach(([measurementName, measurement]) => {
        setMeasurement(measurementName, measurement.value, measurement.unit);
      });

      _tagMetricInfo(span);
    }

    _lcpEntry = undefined;
    _clsEntry = undefined;
    _measurements = {};
  }

  /** Create measure related spans */
  function _addMeasureSpans(
    span,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry,
    startTime,
    duration,
    timeOrigin,
  ) {
    const navEntry = getNavigationEntry();
    const requestTime = msToSec(navEntry ? navEntry.requestStart : 0);
    // Because performance.measure accepts arbitrary timestamps it can produce
    // spans that happen before the browser even makes a request for the page.
    //
    // An example of this is the automatically generated Next.js-before-hydration
    // spans created by the Next.js framework.
    //
    // To prevent this we will pin the start timestamp to the request start time
    // This does make duration inaccruate, so if this does happen, we will add
    // an attribute to the span
    const measureStartTimestamp = timeOrigin + Math.max(startTime, requestTime);
    const startTimeStamp = timeOrigin + startTime;
    const measureEndTimestamp = startTimeStamp + duration;

    const attributes = {
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.resource.browser.metrics',
    };

    if (measureStartTimestamp !== startTimeStamp) {
      attributes['sentry.browser.measure_happened_before_request'] = true;
      attributes['sentry.browser.measure_start_time'] = measureStartTimestamp;
    }

    startAndEndSpan(span, measureStartTimestamp, measureEndTimestamp, {
      name: entry.name ,
      op: entry.entryType ,
      attributes,
    });

    return measureStartTimestamp;
  }

  /** Instrument navigation entries */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _addNavigationSpans(span, entry, timeOrigin) {
    ['unloadEvent', 'redirect', 'domContentLoadedEvent', 'loadEvent', 'connect'].forEach(event => {
      _addPerformanceNavigationTiming(span, entry, event, timeOrigin);
    });
    _addPerformanceNavigationTiming(span, entry, 'secureConnection', timeOrigin, 'TLS/SSL', 'connectEnd');
    _addPerformanceNavigationTiming(span, entry, 'fetch', timeOrigin, 'cache', 'domainLookupStart');
    _addPerformanceNavigationTiming(span, entry, 'domainLookup', timeOrigin, 'DNS');
    _addRequest(span, entry, timeOrigin);
  }

  /** Create performance navigation related spans */
  function _addPerformanceNavigationTiming(
    span,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry,
    event,
    timeOrigin,
    name,
    eventEnd,
  ) {
    const end = eventEnd ? (entry[eventEnd] ) : (entry[`${event}End`] );
    const start = entry[`${event}Start`] ;
    if (!start || !end) {
      return;
    }
    startAndEndSpan(span, timeOrigin + msToSec(start), timeOrigin + msToSec(end), {
      op: 'browser',
      name: name || event,
      attributes: {
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
      },
    });
  }

  /** Create request and response related spans */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _addRequest(span, entry, timeOrigin) {
    const requestStartTimestamp = timeOrigin + msToSec(entry.requestStart );
    const responseEndTimestamp = timeOrigin + msToSec(entry.responseEnd );
    const responseStartTimestamp = timeOrigin + msToSec(entry.responseStart );
    if (entry.responseEnd) {
      // It is possible that we are collecting these metrics when the page hasn't finished loading yet, for example when the HTML slowly streams in.
      // In this case, ie. when the document request hasn't finished yet, `entry.responseEnd` will be 0.
      // In order not to produce faulty spans, where the end timestamp is before the start timestamp, we will only collect
      // these spans when the responseEnd value is available. The backend (Relay) would drop the entire span if it contained faulty spans.
      startAndEndSpan(span, requestStartTimestamp, responseEndTimestamp, {
        op: 'browser',
        name: 'request',
        attributes: {
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
        },
      });

      startAndEndSpan(span, responseStartTimestamp, responseEndTimestamp, {
        op: 'browser',
        name: 'response',
        attributes: {
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.ui.browser.metrics',
        },
      });
    }
  }

  /** Create resource-related spans */
  function _addResourceSpans(
    span,
    entry,
    resourceUrl,
    startTime,
    duration,
    timeOrigin,
  ) {
    // we already instrument based on fetch and xhr, so we don't need to
    // duplicate spans here.
    if (entry.initiatorType === 'xmlhttprequest' || entry.initiatorType === 'fetch') {
      return;
    }

    const parsedUrl = parseUrl$1(resourceUrl);

    const attributes = {
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.resource.browser.metrics',
    };
    setResourceEntrySizeData(attributes, entry, 'transferSize', 'http.response_transfer_size');
    setResourceEntrySizeData(attributes, entry, 'encodedBodySize', 'http.response_content_length');
    setResourceEntrySizeData(attributes, entry, 'decodedBodySize', 'http.decoded_response_content_length');

    if ('renderBlockingStatus' in entry) {
      attributes['resource.render_blocking_status'] = entry.renderBlockingStatus;
    }
    if (parsedUrl.protocol) {
      attributes['url.scheme'] = parsedUrl.protocol.split(':').pop(); // the protocol returned by parseUrl includes a :, but OTEL spec does not, so we remove it.
    }

    if (parsedUrl.host) {
      attributes['server.address'] = parsedUrl.host;
    }

    attributes['url.same_origin'] = resourceUrl.includes(WINDOW$2.location.origin);

    const startTimestamp = timeOrigin + startTime;
    const endTimestamp = startTimestamp + duration;

    startAndEndSpan(span, startTimestamp, endTimestamp, {
      name: resourceUrl.replace(WINDOW$2.location.origin, ''),
      op: entry.initiatorType ? `resource.${entry.initiatorType}` : 'resource.other',
      attributes,
    });
  }

  /**
   * Capture the information of the user agent.
   */
  function _trackNavigator(span) {
    const navigator = WINDOW$2.navigator ;
    if (!navigator) {
      return;
    }

    // track network connectivity
    const connection = navigator.connection;
    if (connection) {
      if (connection.effectiveType) {
        span.setAttribute('effectiveConnectionType', connection.effectiveType);
      }

      if (connection.type) {
        span.setAttribute('connectionType', connection.type);
      }

      if (isMeasurementValue(connection.rtt)) {
        _measurements['connection.rtt'] = { value: connection.rtt, unit: 'millisecond' };
      }
    }

    if (isMeasurementValue(navigator.deviceMemory)) {
      span.setAttribute('deviceMemory', `${navigator.deviceMemory} GB`);
    }

    if (isMeasurementValue(navigator.hardwareConcurrency)) {
      span.setAttribute('hardwareConcurrency', String(navigator.hardwareConcurrency));
    }
  }

  /** Add LCP / CLS data to span to allow debugging */
  function _tagMetricInfo(span) {
    if (_lcpEntry) {
      logger.log('[Measurements] Adding LCP Data');

      // Capture Properties of the LCP element that contributes to the LCP.

      if (_lcpEntry.element) {
        span.setAttribute('lcp.element', htmlTreeAsString(_lcpEntry.element));
      }

      if (_lcpEntry.id) {
        span.setAttribute('lcp.id', _lcpEntry.id);
      }

      if (_lcpEntry.url) {
        // Trim URL to the first 200 characters.
        span.setAttribute('lcp.url', _lcpEntry.url.trim().slice(0, 200));
      }

      span.setAttribute('lcp.size', _lcpEntry.size);
    }

    // See: https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift
    if (_clsEntry && _clsEntry.sources) {
      logger.log('[Measurements] Adding CLS Data');
      _clsEntry.sources.forEach((source, index) =>
        span.setAttribute(`cls.source.${index + 1}`, htmlTreeAsString(source.node)),
      );
    }
  }

  function setResourceEntrySizeData(
    attributes,
    entry,
    key,
    dataKey,
  ) {
    const entryVal = entry[key];
    if (entryVal != null && entryVal < MAX_INT_AS_BYTES) {
      attributes[dataKey] = entryVal;
    }
  }

  /**
   * Add ttfb request time information to measurements.
   *
   * ttfb information is added via vendored web vitals library.
   */
  function _addTtfbRequestTimeToMeasurements(_measurements) {
    const navEntry = getNavigationEntry();
    if (!navEntry) {
      return;
    }

    const { responseStart, requestStart } = navEntry;

    if (requestStart <= responseStart) {
      logger.log('[Measurements] Adding TTFB Request Time');
      _measurements['ttfb.requestTime'] = {
        value: responseStart - requestStart,
        unit: 'millisecond',
      };
    }
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
    if (!WINDOW$2.document) {
      return;
    }

    // Make it so that any click or keypress that is unhandled / bubbled up all the way to the document triggers our dom
    // handlers. (Normally we have only one, which captures a breadcrumb for each click or keypress.) Do this before
    // we instrument `addEventListener` so that we don't end up attaching this handler twice.
    const triggerDOMHandler = triggerHandlers$1.bind(null, 'dom');
    const globalDOMEventHandler = makeDOMEventHandler(triggerDOMHandler, true);
    WINDOW$2.document.addEventListener('click', globalDOMEventHandler, false);
    WINDOW$2.document.addEventListener('keypress', globalDOMEventHandler, false);

    // After hooking into click and keypress events bubbled up to `document`, we also hook into user-handled
    // clicks & keypresses, by adding an event listener of our own to any element to which they add a listener. That
    // way, whenever one of their handlers is triggered, ours will be, too. (This is needed because their handler
    // could potentially prevent the event from bubbling up to our global listeners. This way, our handler are still
    // guaranteed to fire at least once.)
    ['EventTarget', 'Node'].forEach((target) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const proto = (WINDOW$2 )[target] && (WINDOW$2 )[target].prototype;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-prototype-builtins
      if (!proto || !proto.hasOwnProperty || !proto.hasOwnProperty('addEventListener')) {
        return;
      }

      fill(proto, 'addEventListener', function (originalAddEventListener) {
        return function (

          type,
          listener,
          options,
        ) {
          if (type === 'click' || type == 'keypress') {
            try {
              const el = this ;
              const handlers = (el.__sentry_instrumentation_handlers__ = el.__sentry_instrumentation_handlers__ || {});
              const handlerForType = (handlers[type] = handlers[type] || { refCount: 0 });

              if (!handlerForType.handler) {
                const handler = makeDOMEventHandler(triggerDOMHandler);
                handlerForType.handler = handler;
                originalAddEventListener.call(this, type, handler, options);
              }

              handlerForType.refCount++;
            } catch (e) {
              // Accessing dom properties is always fragile.
              // Also allows us to skip `addEventListenrs` calls with no proper `this` context.
            }
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      });

      fill(
        proto,
        'removeEventListener',
        function (originalRemoveEventListener) {
          return function (

            type,
            listener,
            options,
          ) {
            if (type === 'click' || type == 'keypress') {
              try {
                const el = this ;
                const handlers = el.__sentry_instrumentation_handlers__ || {};
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
                    delete el.__sentry_instrumentation_handlers__;
                  }
                }
              } catch (e) {
                // Accessing dom properties is always fragile.
                // Also allows us to skip `addEventListenrs` calls with no proper `this` context.
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

      const target = getEventTarget$1(event);

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
      debounceTimerID = WINDOW$2.setTimeout(() => {
        lastCapturedEventTargetId = undefined;
        lastCapturedEventType = undefined;
      }, DEBOUNCE_DURATION);
    };
  }

  function getEventTarget$1(event) {
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

    const oldOnPopState = WINDOW$2.onpopstate;
    WINDOW$2.onpopstate = function ( ...args) {
      const to = WINDOW$2.location.href;
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

    fill(WINDOW$2.history, 'pushState', historyReplacementFunction);
    fill(WINDOW$2.history, 'replaceState', historyReplacementFunction);
  }

  /**
   * We generally want to use window.fetch / window.setTimeout.
   * However, in some cases this may be wrapped (e.g. by Zone.js for Angular),
   * so we try to get an unpatched version of this from a sandboxed iframe.
   */

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
  function getNativeImplementation(
    name,
  ) {
    const cached = cachedImplementations$2[name];
    if (cached) {
      return cached;
    }

    let impl = WINDOW$2[name] ;

    // Fast path to avoid DOM I/O
    if (isNativeFunction(impl)) {
      return (cachedImplementations$2[name] = impl.bind(WINDOW$2) );
    }

    const document = WINDOW$2.document;
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
        logger.warn(`Could not create sandbox iframe for ${name} check, bailing to window.${name}: `, e);
      }
    }

    // Sanity check: This _should_ not happen, but if it does, we just skip caching...
    // This can happen e.g. in tests where fetch may not be available in the env, or similar.
    if (!impl) {
      return impl;
    }

    return (cachedImplementations$2[name] = impl.bind(WINDOW$2) );
  }

  /** Clear a cached implementation. */
  function clearCachedImplementation(name) {
    cachedImplementations$2[name] = undefined;
  }

  /**
   * Get an unwrapped `setTimeout` method.
   * This ensures that even if e.g. Angular wraps `setTimeout`, we get the native implementation,
   * avoiding triggering change detection.
   */
  function setTimeout$3(...rest) {
    return getNativeImplementation('setTimeout')(...rest);
  }

  const SENTRY_XHR_DATA_KEY = '__sentry_xhr_v3__';

  /**
   * Add an instrumentation handler for when an XHR request happens.
   * The handler function is called once when the request starts and once when it ends,
   * which can be identified by checking if it has an `endTimestamp`.
   *
   * Use at your own risk, this might break without changelog notice, only used internally.
   * @hidden
   */
  function addXhrInstrumentationHandler(handler) {
    const type = 'xhr';
    addHandler$1(type, handler);
    maybeInstrument(type, instrumentXHR);
  }

  /** Exported only for tests. */
  function instrumentXHR() {
    if (!(WINDOW$2 ).XMLHttpRequest) {
      return;
    }

    const xhrproto = XMLHttpRequest.prototype;

    fill(xhrproto, 'open', function (originalOpen) {
      return function ( ...args) {
        const startTimestamp = timestampInSeconds() * 1000;

        // open() should always be called with two or more arguments
        // But to be on the safe side, we actually validate this and bail out if we don't have a method & url
        const method = isString(args[0]) ? args[0].toUpperCase() : undefined;
        const url = parseUrl(args[1]);

        if (!method || !url) {
          return originalOpen.apply(this, args);
        }

        this[SENTRY_XHR_DATA_KEY] = {
          method,
          url,
          request_headers: {},
        };

        // if Sentry key appears in URL, don't capture it as a request
        if (method === 'POST' && url.match(/sentry_key/)) {
          this.__sentry_own_request__ = true;
        }

        const onreadystatechangeHandler = () => {
          // For whatever reason, this is not the same instance here as from the outer method
          const xhrInfo = this[SENTRY_XHR_DATA_KEY];

          if (!xhrInfo) {
            return;
          }

          if (this.readyState === 4) {
            try {
              // touching statusCode in some platforms throws
              // an exception
              xhrInfo.status_code = this.status;
            } catch (e) {
              /* do nothing */
            }

            const handlerData = {
              endTimestamp: timestampInSeconds() * 1000,
              startTimestamp,
              xhr: this,
            };
            triggerHandlers$1('xhr', handlerData);
          }
        };

        if ('onreadystatechange' in this && typeof this.onreadystatechange === 'function') {
          fill(this, 'onreadystatechange', function (original) {
            return function ( ...readyStateArgs) {
              onreadystatechangeHandler();
              return original.apply(this, readyStateArgs);
            };
          });
        } else {
          this.addEventListener('readystatechange', onreadystatechangeHandler);
        }

        // Intercepting `setRequestHeader` to access the request headers of XHR instance.
        // This will only work for user/library defined headers, not for the default/browser-assigned headers.
        // Request cookies are also unavailable for XHR, as `Cookie` header can't be defined by `setRequestHeader`.
        fill(this, 'setRequestHeader', function (original) {
          return function ( ...setRequestHeaderArgs) {
            const [header, value] = setRequestHeaderArgs;

            const xhrInfo = this[SENTRY_XHR_DATA_KEY];

            if (xhrInfo && isString(header) && isString(value)) {
              xhrInfo.request_headers[header.toLowerCase()] = value;
            }

            return original.apply(this, setRequestHeaderArgs);
          };
        });

        return originalOpen.apply(this, args);
      };
    });

    fill(xhrproto, 'send', function (originalSend) {
      return function ( ...args) {
        const sentryXhrData = this[SENTRY_XHR_DATA_KEY];

        if (!sentryXhrData) {
          return originalSend.apply(this, args);
        }

        if (args[0] !== undefined) {
          sentryXhrData.body = args[0];
        }

        const handlerData = {
          startTimestamp: timestampInSeconds() * 1000,
          xhr: this,
        };
        triggerHandlers$1('xhr', handlerData);

        return originalSend.apply(this, args);
      };
    });
  }

  function parseUrl(url) {
    if (isString(url)) {
      return url;
    }

    try {
      // url can be a string or URL
      // but since URL is not available in IE11, we do not check for it,
      // but simply assume it is an URL and return `toString()` from it (which returns the full URL)
      // If that fails, we just return undefined
      return (url ).toString();
    } catch (e2) {} // eslint-disable-line no-empty

    return undefined;
  }

  const LAST_INTERACTIONS = [];
  const INTERACTIONS_SPAN_MAP = new Map();

  /**
   * Start tracking INP webvital events.
   */
  function startTrackingINP() {
    const performance = getBrowserPerformanceAPI();
    if (performance && browserPerformanceTimeOrigin) {
      const inpCallback = _trackINP();

      return () => {
        inpCallback();
      };
    }

    return () => undefined;
  }

  const INP_ENTRY_MAP = {
    click: 'click',
    pointerdown: 'click',
    pointerup: 'click',
    mousedown: 'click',
    mouseup: 'click',
    touchstart: 'click',
    touchend: 'click',
    mouseover: 'hover',
    mouseout: 'hover',
    mouseenter: 'hover',
    mouseleave: 'hover',
    pointerover: 'hover',
    pointerout: 'hover',
    pointerenter: 'hover',
    pointerleave: 'hover',
    dragstart: 'drag',
    dragend: 'drag',
    drag: 'drag',
    dragenter: 'drag',
    dragleave: 'drag',
    dragover: 'drag',
    drop: 'drag',
    keydown: 'press',
    keyup: 'press',
    keypress: 'press',
    input: 'press',
  };

  /** Starts tracking the Interaction to Next Paint on the current page. */
  function _trackINP() {
    return addInpInstrumentationHandler(({ metric }) => {
      const client = getClient();
      if (!client || metric.value == undefined) {
        return;
      }

      const entry = metric.entries.find(entry => entry.duration === metric.value && INP_ENTRY_MAP[entry.name]);

      if (!entry) {
        return;
      }

      const { interactionId } = entry;
      const interactionType = INP_ENTRY_MAP[entry.name];

      const options = client.getOptions();
      /** Build the INP span, create an envelope from the span, and then send the envelope */
      const startTime = msToSec((browserPerformanceTimeOrigin ) + entry.startTime);
      const duration = msToSec(metric.value);
      const scope = getCurrentScope();
      const activeSpan = getActiveSpan();
      const rootSpan = activeSpan ? getRootSpan(activeSpan) : undefined;

      // We first try to lookup the span from our INTERACTIONS_SPAN_MAP,
      // where we cache the route per interactionId
      const cachedSpan = interactionId != null ? INTERACTIONS_SPAN_MAP.get(interactionId) : undefined;

      const spanToUse = cachedSpan || rootSpan;

      // Else, we try to use the active span.
      // Finally, we fall back to look at the transactionName on the scope
      const routeName = spanToUse ? spanToJSON(spanToUse).description : scope.getScopeData().transactionName;

      const user = scope.getUser();

      // We need to get the replay, user, and activeTransaction from the current scope
      // so that we can associate replay id, profile id, and a user display to the span
      const replay = client.getIntegrationByName('Replay');

      const replayId = replay && replay.getReplayId();

      const userDisplay = user !== undefined ? user.email || user.id || user.ip_address : undefined;
      let profileId = undefined;
      try {
        // @ts-expect-error skip optional chaining to save bundle size with try catch
        profileId = scope.getScopeData().contexts.profile.profile_id;
      } catch (e) {
        // do nothing
      }

      const name = htmlTreeAsString(entry.target);
      const attributes = dropUndefinedKeys({
        release: options.release,
        environment: options.environment,
        transaction: routeName,
        [SEMANTIC_ATTRIBUTE_EXCLUSIVE_TIME]: metric.value,
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser.inp',
        user: userDisplay || undefined,
        profile_id: profileId || undefined,
        replay_id: replayId || undefined,
        // INP score calculation in the sentry backend relies on the user agent
        // to account for different INP values being reported from different browsers
        'user_agent.original': WINDOW$2.navigator && WINDOW$2.navigator.userAgent,
      });

      const span = startInactiveSpan({
        name,
        op: `ui.interaction.${interactionType}`,
        attributes,
        startTime: startTime,
        experimental: {
          standalone: true,
        },
      });

      span.addEvent('inp', {
        [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: 'millisecond',
        [SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: metric.value,
      });

      span.end(startTime + duration);
    });
  }

  /**
   * Register a listener to cache route information for INP interactions.
   * TODO(v9): `latestRoute` no longer needs to be passed in and will be removed in v9.
   */
  function registerInpInteractionListener(_latestRoute) {
    const handleEntries = ({ entries }) => {
      const activeSpan = getActiveSpan();
      const activeRootSpan = activeSpan && getRootSpan(activeSpan);

      entries.forEach(entry => {
        if (!isPerformanceEventTiming(entry) || !activeRootSpan) {
          return;
        }

        const interactionId = entry.interactionId;
        if (interactionId == null) {
          return;
        }

        // If the interaction was already recorded before, nothing more to do
        if (INTERACTIONS_SPAN_MAP.has(interactionId)) {
          return;
        }

        // We keep max. 10 interactions in the list, then remove the oldest one & clean up
        if (LAST_INTERACTIONS.length > 10) {
          const last = LAST_INTERACTIONS.shift() ;
          INTERACTIONS_SPAN_MAP.delete(last);
        }

        // We add the interaction to the list of recorded interactions
        // and store the span for this interaction
        LAST_INTERACTIONS.push(interactionId);
        INTERACTIONS_SPAN_MAP.set(interactionId, activeRootSpan);
      });
    };

    addPerformanceInstrumentationHandler('event', handleEntries);
    addPerformanceInstrumentationHandler('first-input', handleEntries);
  }

  /**
   * Creates a Transport that uses the Fetch API to send events to Sentry.
   */
  function makeFetchTransport(
    options,
    nativeFetch = getNativeImplementation('fetch'),
  ) {
    let pendingBodySize = 0;
    let pendingCount = 0;

    function makeRequest(request) {
      const requestSize = request.body.length;
      pendingBodySize += requestSize;
      pendingCount++;

      const requestOptions = {
        body: request.body,
        method: 'POST',
        referrerPolicy: 'origin',
        headers: options.headers,
        // Outgoing requests are usually cancelled when navigating to a different page, causing a "TypeError: Failed to
        // fetch" error and sending a "network_error" client-outcome - in Chrome, the request status shows "(cancelled)".
        // The `keepalive` flag keeps outgoing requests alive, even when switching pages. We want this since we're
        // frequently sending events right before the user is switching pages (eg. whenfinishing navigation transactions).
        // Gotchas:
        // - `keepalive` isn't supported by Firefox
        // - As per spec (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch):
        //   If the sum of contentLength and inflightKeepaliveBytes is greater than 64 kibibytes, then return a network error.
        //   We will therefore only activate the flag when we're below that limit.
        // There is also a limit of requests that can be open at the same time, so we also limit this to 15
        // See https://github.com/getsentry/sentry-javascript/pull/7553 for details
        keepalive: pendingBodySize <= 60000 && pendingCount < 15,
        ...options.fetchOptions,
      };

      if (!nativeFetch) {
        clearCachedImplementation('fetch');
        return rejectedSyncPromise('No fetch implementation available');
      }

      try {
        return nativeFetch(options.url, requestOptions).then(response => {
          pendingBodySize -= requestSize;
          pendingCount--;
          return {
            statusCode: response.status,
            headers: {
              'x-sentry-rate-limits': response.headers.get('X-Sentry-Rate-Limits'),
              'retry-after': response.headers.get('Retry-After'),
            },
          };
        });
      } catch (e) {
        clearCachedImplementation('fetch');
        pendingBodySize -= requestSize;
        pendingCount--;
        return rejectedSyncPromise(e);
      }
    }

    return createTransport(options, makeRequest);
  }

  const OPERA10_PRIORITY = 10;
  const OPERA11_PRIORITY = 20;
  const CHROME_PRIORITY = 30;
  const WINJS_PRIORITY = 40;
  const GECKO_PRIORITY = 50;

  function createFrame(filename, func, lineno, colno) {
    const frame = {
      filename,
      function: func === '<anonymous>' ? UNKNOWN_FUNCTION : func,
      in_app: true, // All browser frames are considered in_app
    };

    if (lineno !== undefined) {
      frame.lineno = lineno;
    }

    if (colno !== undefined) {
      frame.colno = colno;
    }

    return frame;
  }

  // This regex matches frames that have no function name (ie. are at the top level of a module).
  // For example "at http://localhost:5000//script.js:1:126"
  // Frames _with_ function names usually look as follows: "at commitLayoutEffects (react-dom.development.js:23426:1)"
  const chromeRegexNoFnName = /^\s*at (\S+?)(?::(\d+))(?::(\d+))\s*$/i;

  // This regex matches all the frames that have a function name.
  const chromeRegex =
    /^\s*at (?:(.+?\)(?: \[.+\])?|.*?) ?\((?:address at )?)?(?:async )?((?:<anonymous>|[-a-z]+:|.*bundle|\/)?.*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;

  const chromeEvalRegex = /\((\S*)(?::(\d+))(?::(\d+))\)/;

  // Chromium based browsers: Chrome, Brave, new Opera, new Edge
  // We cannot call this variable `chrome` because it can conflict with global `chrome` variable in certain environments
  // See: https://github.com/getsentry/sentry-javascript/issues/6880
  const chromeStackParserFn = line => {
    // If the stack line has no function name, we need to parse it differently
    const noFnParts = chromeRegexNoFnName.exec(line) ;

    if (noFnParts) {
      const [, filename, line, col] = noFnParts;
      return createFrame(filename, UNKNOWN_FUNCTION, +line, +col);
    }

    const parts = chromeRegex.exec(line) ;

    if (parts) {
      const isEval = parts[2] && parts[2].indexOf('eval') === 0; // start of line

      if (isEval) {
        const subMatch = chromeEvalRegex.exec(parts[2]) ;

        if (subMatch) {
          // throw out eval line/column and use top-most line/column number
          parts[2] = subMatch[1]; // url
          parts[3] = subMatch[2]; // line
          parts[4] = subMatch[3]; // column
        }
      }

      // Kamil: One more hack won't hurt us right? Understanding and adding more rules on top of these regexps right now
      // would be way too time consuming. (TODO: Rewrite whole RegExp to be more readable)
      const [func, filename] = extractSafariExtensionDetails(parts[1] || UNKNOWN_FUNCTION, parts[2]);

      return createFrame(filename, func, parts[3] ? +parts[3] : undefined, parts[4] ? +parts[4] : undefined);
    }

    return;
  };

  const chromeStackLineParser = [CHROME_PRIORITY, chromeStackParserFn];

  // gecko regex: `(?:bundle|\d+\.js)`: `bundle` is for react native, `\d+\.js` also but specifically for ram bundles because it
  // generates filenames without a prefix like `file://` the filenames in the stacktrace are just 42.js
  // We need this specific case for now because we want no other regex to match.
  const geckoREgex =
    /^\s*(.*?)(?:\((.*?)\))?(?:^|@)?((?:[-a-z]+)?:\/.*?|\[native code\]|[^@]*(?:bundle|\d+\.js)|\/[\w\-. /=]+)(?::(\d+))?(?::(\d+))?\s*$/i;
  const geckoEvalRegex = /(\S+) line (\d+)(?: > eval line \d+)* > eval/i;

  const gecko = line => {
    const parts = geckoREgex.exec(line) ;

    if (parts) {
      const isEval = parts[3] && parts[3].indexOf(' > eval') > -1;
      if (isEval) {
        const subMatch = geckoEvalRegex.exec(parts[3]) ;

        if (subMatch) {
          // throw out eval line/column and use top-most line number
          parts[1] = parts[1] || 'eval';
          parts[3] = subMatch[1];
          parts[4] = subMatch[2];
          parts[5] = ''; // no column when eval
        }
      }

      let filename = parts[3];
      let func = parts[1] || UNKNOWN_FUNCTION;
      [func, filename] = extractSafariExtensionDetails(func, filename);

      return createFrame(filename, func, parts[4] ? +parts[4] : undefined, parts[5] ? +parts[5] : undefined);
    }

    return;
  };

  const geckoStackLineParser = [GECKO_PRIORITY, gecko];

  const winjsRegex = /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:[-a-z]+):.*?):(\d+)(?::(\d+))?\)?\s*$/i;

  const winjs = line => {
    const parts = winjsRegex.exec(line) ;

    return parts
      ? createFrame(parts[2], parts[1] || UNKNOWN_FUNCTION, +parts[3], parts[4] ? +parts[4] : undefined)
      : undefined;
  };

  const winjsStackLineParser = [WINJS_PRIORITY, winjs];

  const opera10Regex = / line (\d+).*script (?:in )?(\S+)(?:: in function (\S+))?$/i;

  const opera10 = line => {
    const parts = opera10Regex.exec(line) ;
    return parts ? createFrame(parts[2], parts[3] || UNKNOWN_FUNCTION, +parts[1]) : undefined;
  };

  const opera10StackLineParser = [OPERA10_PRIORITY, opera10];

  const opera11Regex =
    / line (\d+), column (\d+)\s*(?:in (?:<anonymous function: ([^>]+)>|([^)]+))\(.*\))? in (.*):\s*$/i;

  const opera11 = line => {
    const parts = opera11Regex.exec(line) ;
    return parts ? createFrame(parts[5], parts[3] || parts[4] || UNKNOWN_FUNCTION, +parts[1], +parts[2]) : undefined;
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
    const isSafariExtension = func.indexOf('safari-extension') !== -1;
    const isSafariWebExtension = func.indexOf('safari-web-extension') !== -1;

    return isSafariExtension || isSafariWebExtension
      ? [
          func.indexOf('@') !== -1 ? (func.split('@')[0] ) : UNKNOWN_FUNCTION,
          isSafariExtension ? `safari-extension:${filename}` : `safari-web-extension:${filename}`,
        ]
      : [func, filename];
  };

  /** maxStringLength gets capped to prevent 100 breadcrumbs exceeding 1MB event payload size */
  const MAX_ALLOWED_STRING_LENGTH = 1024;

  const INTEGRATION_NAME$3 = 'Breadcrumbs';

  const _breadcrumbsIntegration = ((options = {}) => {
    const _options = {
      console: true,
      dom: true,
      fetch: true,
      history: true,
      sentry: true,
      xhr: true,
      ...options,
    };

    return {
      name: INTEGRATION_NAME$3,
      setup(client) {
        if (_options.console) {
          addConsoleInstrumentationHandler(_getConsoleBreadcrumbHandler(client));
        }
        if (_options.dom) {
          addClickKeypressInstrumentationHandler(_getDomBreadcrumbHandler(client, _options.dom));
        }
        if (_options.xhr) {
          addXhrInstrumentationHandler(_getXhrBreadcrumbHandler(client));
        }
        if (_options.fetch) {
          addFetchInstrumentationHandler(_getFetchBreadcrumbHandler(client));
        }
        if (_options.history) {
          addHistoryInstrumentationHandler(_getHistoryBreadcrumbHandler(client));
        }
        if (_options.sentry) {
          client.on('beforeSendEvent', _getSentryBreadcrumbHandler(client));
        }
      },
    };
  }) ;

  const breadcrumbsIntegration = defineIntegration(_breadcrumbsIntegration);

  /**
   * Adds a breadcrumb for Sentry events or transactions if this option is enabled.
   */
  function _getSentryBreadcrumbHandler(client) {
    return function addSentryBreadcrumb(event) {
      if (getClient() !== client) {
        return;
      }

      addBreadcrumb(
        {
          category: `sentry.${event.type === 'transaction' ? 'transaction' : 'event'}`,
          event_id: event.event_id,
          level: event.level,
          message: getEventDescription(event),
        },
        {
          event,
        },
      );
    };
  }

  /**
   * A HOC that creaes a function that creates breadcrumbs from DOM API calls.
   * This is a HOC so that we get access to dom options in the closure.
   */
  function _getDomBreadcrumbHandler(
    client,
    dom,
  ) {
    return function _innerDomBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }

      let target;
      let componentName;
      let keyAttrs = typeof dom === 'object' ? dom.serializeAttribute : undefined;

      let maxStringLength =
        typeof dom === 'object' && typeof dom.maxStringLength === 'number' ? dom.maxStringLength : undefined;
      if (maxStringLength && maxStringLength > MAX_ALLOWED_STRING_LENGTH) {
        logger.warn(
            `\`dom.maxStringLength\` cannot exceed ${MAX_ALLOWED_STRING_LENGTH}, but a value of ${maxStringLength} was configured. Sentry will use ${MAX_ALLOWED_STRING_LENGTH} instead.`,
          );
        maxStringLength = MAX_ALLOWED_STRING_LENGTH;
      }

      if (typeof keyAttrs === 'string') {
        keyAttrs = [keyAttrs];
      }

      // Accessing event.target can throw (see getsentry/raven-js#838, #768)
      try {
        const event = handlerData.event ;
        const element = _isEvent(event) ? event.target : event;

        target = htmlTreeAsString(element, { keyAttrs, maxStringLength });
        componentName = getComponentName(element);
      } catch (e) {
        target = '<unknown>';
      }

      if (target.length === 0) {
        return;
      }

      const breadcrumb = {
        category: `ui.${handlerData.name}`,
        message: target,
      };

      if (componentName) {
        breadcrumb.data = { 'ui.component_name': componentName };
      }

      addBreadcrumb(breadcrumb, {
        event: handlerData.event,
        name: handlerData.name,
        global: handlerData.global,
      });
    };
  }

  /**
   * Creates breadcrumbs from console API calls
   */
  function _getConsoleBreadcrumbHandler(client) {
    return function _consoleBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }

      const breadcrumb = {
        category: 'console',
        data: {
          arguments: handlerData.args,
          logger: 'console',
        },
        level: severityLevelFromString(handlerData.level),
        message: safeJoin(handlerData.args, ' '),
      };

      if (handlerData.level === 'assert') {
        if (handlerData.args[0] === false) {
          breadcrumb.message = `Assertion failed: ${safeJoin(handlerData.args.slice(1), ' ') || 'console.assert'}`;
          breadcrumb.data.arguments = handlerData.args.slice(1);
        } else {
          // Don't capture a breadcrumb for passed assertions
          return;
        }
      }

      addBreadcrumb(breadcrumb, {
        input: handlerData.args,
        level: handlerData.level,
      });
    };
  }

  /**
   * Creates breadcrumbs from XHR API calls
   */
  function _getXhrBreadcrumbHandler(client) {
    return function _xhrBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }

      const { startTimestamp, endTimestamp } = handlerData;

      const sentryXhrData = handlerData.xhr[SENTRY_XHR_DATA_KEY];

      // We only capture complete, non-sentry requests
      if (!startTimestamp || !endTimestamp || !sentryXhrData) {
        return;
      }

      const { method, url, status_code, body } = sentryXhrData;

      const data = {
        method,
        url,
        status_code,
      };

      const hint = {
        xhr: handlerData.xhr,
        input: body,
        startTimestamp,
        endTimestamp,
      };

      addBreadcrumb(
        {
          category: 'xhr',
          data,
          type: 'http',
        },
        hint,
      );
    };
  }

  /**
   * Creates breadcrumbs from fetch API calls
   */
  function _getFetchBreadcrumbHandler(client) {
    return function _fetchBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }

      const { startTimestamp, endTimestamp } = handlerData;

      // We only capture complete fetch requests
      if (!endTimestamp) {
        return;
      }

      if (handlerData.fetchData.url.match(/sentry_key/) && handlerData.fetchData.method === 'POST') {
        // We will not create breadcrumbs for fetch requests that contain `sentry_key` (internal sentry requests)
        return;
      }

      if (handlerData.error) {
        const data = handlerData.fetchData;
        const hint = {
          data: handlerData.error,
          input: handlerData.args,
          startTimestamp,
          endTimestamp,
        };

        addBreadcrumb(
          {
            category: 'fetch',
            data,
            level: 'error',
            type: 'http',
          },
          hint,
        );
      } else {
        const response = handlerData.response ;
        const data = {
          ...handlerData.fetchData,
          status_code: response && response.status,
        };
        const hint = {
          input: handlerData.args,
          response,
          startTimestamp,
          endTimestamp,
        };
        addBreadcrumb(
          {
            category: 'fetch',
            data,
            type: 'http',
          },
          hint,
        );
      }
    };
  }

  /**
   * Creates breadcrumbs from history API calls
   */
  function _getHistoryBreadcrumbHandler(client) {
    return function _historyBreadcrumb(handlerData) {
      if (getClient() !== client) {
        return;
      }

      let from = handlerData.from;
      let to = handlerData.to;
      const parsedLoc = parseUrl$1(WINDOW$3.location.href);
      let parsedFrom = from ? parseUrl$1(from) : undefined;
      const parsedTo = parseUrl$1(to);

      // Initial pushState doesn't provide `from` information
      if (!parsedFrom || !parsedFrom.path) {
        parsedFrom = parsedLoc;
      }

      // Use only the path component of the URL if the URL matches the current
      // document (almost all the time when using pushState)
      if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) {
        to = parsedTo.relative;
      }
      if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) {
        from = parsedFrom.relative;
      }

      addBreadcrumb({
        category: 'navigation',
        data: {
          from,
          to,
        },
      });
    };
  }

  function _isEvent(event) {
    return !!event && !!(event ).target;
  }

  const DEFAULT_EVENT_TARGET = [
    'EventTarget',
    'Window',
    'Node',
    'ApplicationCache',
    'AudioTrackList',
    'BroadcastChannel',
    'ChannelMergerNode',
    'CryptoOperation',
    'EventSource',
    'FileReader',
    'HTMLUnknownElement',
    'IDBDatabase',
    'IDBRequest',
    'IDBTransaction',
    'KeyOperation',
    'MediaController',
    'MessagePort',
    'ModalWindow',
    'Notification',
    'SVGElementInstance',
    'Screen',
    'SharedWorker',
    'TextTrack',
    'TextTrackCue',
    'TextTrackList',
    'WebSocket',
    'WebSocketWorker',
    'Worker',
    'XMLHttpRequest',
    'XMLHttpRequestEventTarget',
    'XMLHttpRequestUpload',
  ];

  const INTEGRATION_NAME$2 = 'BrowserApiErrors';

  const _browserApiErrorsIntegration = ((options = {}) => {
    const _options = {
      XMLHttpRequest: true,
      eventTarget: true,
      requestAnimationFrame: true,
      setInterval: true,
      setTimeout: true,
      ...options,
    };

    return {
      name: INTEGRATION_NAME$2,
      // TODO: This currently only works for the first client this is setup
      // We may want to adjust this to check for client etc.
      setupOnce() {
        if (_options.setTimeout) {
          fill(WINDOW$3, 'setTimeout', _wrapTimeFunction);
        }

        if (_options.setInterval) {
          fill(WINDOW$3, 'setInterval', _wrapTimeFunction);
        }

        if (_options.requestAnimationFrame) {
          fill(WINDOW$3, 'requestAnimationFrame', _wrapRAF);
        }

        if (_options.XMLHttpRequest && 'XMLHttpRequest' in WINDOW$3) {
          fill(XMLHttpRequest.prototype, 'send', _wrapXHR);
        }

        const eventTargetOption = _options.eventTarget;
        if (eventTargetOption) {
          const eventTarget = Array.isArray(eventTargetOption) ? eventTargetOption : DEFAULT_EVENT_TARGET;
          eventTarget.forEach(_wrapEventTarget);
        }
      },
    };
  }) ;

  /**
   * Wrap timer functions and event targets to catch errors and provide better meta data.
   */
  const browserApiErrorsIntegration = defineIntegration(_browserApiErrorsIntegration);

  function _wrapTimeFunction(original) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function ( ...args) {
      const originalCallback = args[0];
      args[0] = wrap(originalCallback, {
        mechanism: {
          data: { function: getFunctionName(original) },
          handled: false,
          type: 'instrument',
        },
      });
      return original.apply(this, args);
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _wrapRAF(original) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function ( callback) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return original.apply(this, [
        wrap(callback, {
          mechanism: {
            data: {
              function: 'requestAnimationFrame',
              handler: getFunctionName(original),
            },
            handled: false,
            type: 'instrument',
          },
        }),
      ]);
    };
  }

  function _wrapXHR(originalSend) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function ( ...args) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const xhr = this;
      const xmlHttpRequestProps = ['onload', 'onerror', 'onprogress', 'onreadystatechange'];

      xmlHttpRequestProps.forEach(prop => {
        if (prop in xhr && typeof xhr[prop] === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fill(xhr, prop, function (original) {
            const wrapOptions = {
              mechanism: {
                data: {
                  function: prop,
                  handler: getFunctionName(original),
                },
                handled: false,
                type: 'instrument',
              },
            };

            // If Instrument integration has been called before BrowserApiErrors, get the name of original function
            const originalFunction = getOriginalFunction(original);
            if (originalFunction) {
              wrapOptions.mechanism.data.handler = getFunctionName(originalFunction);
            }

            // Otherwise wrap directly
            return wrap(original, wrapOptions);
          });
        }
      });

      return originalSend.apply(this, args);
    };
  }

  function _wrapEventTarget(target) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalObject = WINDOW$3 ;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const proto = globalObject[target] && globalObject[target].prototype;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-prototype-builtins
    if (!proto || !proto.hasOwnProperty || !proto.hasOwnProperty('addEventListener')) {
      return;
    }

    fill(proto, 'addEventListener', function (original,)

   {
      return function (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        eventName,
        fn,
        options,
      ) {
        try {
          if (typeof fn.handleEvent === 'function') {
            // ESlint disable explanation:
            //  First, it is generally safe to call `wrap` with an unbound function. Furthermore, using `.bind()` would
            //  introduce a bug here, because bind returns a new function that doesn't have our
            //  flags(like __sentry_original__) attached. `wrap` checks for those flags to avoid unnecessary wrapping.
            //  Without those flags, every call to addEventListener wraps the function again, causing a memory leak.
            // eslint-disable-next-line @typescript-eslint/unbound-method
            fn.handleEvent = wrap(fn.handleEvent, {
              mechanism: {
                data: {
                  function: 'handleEvent',
                  handler: getFunctionName(fn),
                  target,
                },
                handled: false,
                type: 'instrument',
              },
            });
          }
        } catch (err) {
          // can sometimes get 'Permission denied to access property "handle Event'
        }

        return original.apply(this, [
          eventName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wrap(fn , {
            mechanism: {
              data: {
                function: 'addEventListener',
                handler: getFunctionName(fn),
                target,
              },
              handled: false,
              type: 'instrument',
            },
          }),
          options,
        ]);
      };
    });

    fill(
      proto,
      'removeEventListener',
      function (
        originalRemoveEventListener,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) {
        return function (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any

          eventName,
          fn,
          options,
        ) {
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
          const wrappedEventHandler = fn ;
          try {
            const originalEventHandler = wrappedEventHandler && wrappedEventHandler.__sentry_wrapped__;
            if (originalEventHandler) {
              originalRemoveEventListener.call(this, eventName, originalEventHandler, options);
            }
          } catch (e) {
            // ignore, accessing __sentry_wrapped__ will throw in some Selenium environments
          }
          return originalRemoveEventListener.call(this, eventName, wrappedEventHandler, options);
        };
      },
    );
  }

  const INTEGRATION_NAME$1 = 'GlobalHandlers';

  const _globalHandlersIntegration = ((options = {}) => {
    const _options = {
      onerror: true,
      onunhandledrejection: true,
      ...options,
    };

    return {
      name: INTEGRATION_NAME$1,
      setupOnce() {
        Error.stackTraceLimit = 50;
      },
      setup(client) {
        if (_options.onerror) {
          _installGlobalOnErrorHandler(client);
          globalHandlerLog('onerror');
        }
        if (_options.onunhandledrejection) {
          _installGlobalOnUnhandledRejectionHandler(client);
          globalHandlerLog('onunhandledrejection');
        }
      },
    };
  }) ;

  const globalHandlersIntegration = defineIntegration(_globalHandlersIntegration);

  function _installGlobalOnErrorHandler(client) {
    addGlobalErrorInstrumentationHandler(data => {
      const { stackParser, attachStacktrace } = getOptions();

      if (getClient() !== client || shouldIgnoreOnError()) {
        return;
      }

      const { msg, url, line, column, error } = data;

      const event = _enhanceEventWithInitialFrame(
        eventFromUnknownInput(stackParser, error || msg, undefined, attachStacktrace, false),
        url,
        line,
        column,
      );

      event.level = 'error';

      captureEvent(event, {
        originalException: error,
        mechanism: {
          handled: false,
          type: 'onerror',
        },
      });
    });
  }

  function _installGlobalOnUnhandledRejectionHandler(client) {
    addGlobalUnhandledRejectionInstrumentationHandler(e => {
      const { stackParser, attachStacktrace } = getOptions();

      if (getClient() !== client || shouldIgnoreOnError()) {
        return;
      }

      const error = _getUnhandledRejectionError(e );

      const event = isPrimitive(error)
        ? _eventFromRejectionWithPrimitive(error)
        : eventFromUnknownInput(stackParser, error, undefined, attachStacktrace, true);

      event.level = 'error';

      captureEvent(event, {
        originalException: error,
        mechanism: {
          handled: false,
          type: 'onunhandledrejection',
        },
      });
    });
  }

  function _getUnhandledRejectionError(error) {
    if (isPrimitive(error)) {
      return error;
    }

    // dig the object of the rejection out of known event types
    try {

      // PromiseRejectionEvents store the object of the rejection under 'reason'
      // see https://developer.mozilla.org/en-US/docs/Web/API/PromiseRejectionEvent
      if ('reason' in (error )) {
        return (error ).reason;
      }

      // something, somewhere, (likely a browser extension) effectively casts PromiseRejectionEvents
      // to CustomEvents, moving the `promise` and `reason` attributes of the PRE into
      // the CustomEvent's `detail` attribute, since they're not part of CustomEvent's spec
      // see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent and
      // https://github.com/getsentry/sentry-javascript/issues/2380
      if ('detail' in (error ) && 'reason' in (error ).detail) {
        return (error ).detail.reason;
      }
    } catch (e2) {} // eslint-disable-line no-empty

    return error;
  }

  /**
   * Create an event from a promise rejection where the `reason` is a primitive.
   *
   * @param reason: The `reason` property of the promise rejection
   * @returns An Event object with an appropriate `exception` value
   */
  function _eventFromRejectionWithPrimitive(reason) {
    return {
      exception: {
        values: [
          {
            type: 'UnhandledRejection',
            // String() is needed because the Primitive type includes symbols (which can't be automatically stringified)
            value: `Non-Error promise rejection captured with value: ${String(reason)}`,
          },
        ],
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _enhanceEventWithInitialFrame(event, url, line, column) {
    // event.exception
    const e = (event.exception = event.exception || {});
    // event.exception.values
    const ev = (e.values = e.values || []);
    // event.exception.values[0]
    const ev0 = (ev[0] = ev[0] || {});
    // event.exception.values[0].stacktrace
    const ev0s = (ev0.stacktrace = ev0.stacktrace || {});
    // event.exception.values[0].stacktrace.frames
    const ev0sf = (ev0s.frames = ev0s.frames || []);

    const colno = isNaN(parseInt(column, 10)) ? undefined : column;
    const lineno = isNaN(parseInt(line, 10)) ? undefined : line;
    const filename = isString(url) && url.length > 0 ? url : getLocationHref();

    // event.exception.values[0].stacktrace.frames
    if (ev0sf.length === 0) {
      ev0sf.push({
        colno,
        filename,
        function: UNKNOWN_FUNCTION,
        in_app: true,
        lineno,
      });
    }

    return event;
  }

  function globalHandlerLog(type) {
    logger.log(`Global Handler attached: ${type}`);
  }

  function getOptions() {
    const client = getClient();
    const options = (client && client.getOptions()) || {
      stackParser: () => [],
      attachStacktrace: false,
    };
    return options;
  }

  /**
   * Collects information about HTTP request headers and
   * attaches them to the event.
   */
  const httpContextIntegration = defineIntegration(() => {
    return {
      name: 'HttpContext',
      preprocessEvent(event) {
        // if none of the information we want exists, don't bother
        if (!WINDOW$3.navigator && !WINDOW$3.location && !WINDOW$3.document) {
          return;
        }

        // grab as much info as exists and add it to the event
        const url = (event.request && event.request.url) || (WINDOW$3.location && WINDOW$3.location.href);
        const { referrer } = WINDOW$3.document || {};
        const { userAgent } = WINDOW$3.navigator || {};

        const headers = {
          ...(event.request && event.request.headers),
          ...(referrer && { Referer: referrer }),
          ...(userAgent && { 'User-Agent': userAgent }),
        };
        const request = { ...event.request, ...(url && { url }), headers };

        event.request = request;
      },
    };
  });

  const DEFAULT_KEY = 'cause';
  const DEFAULT_LIMIT = 5;

  const INTEGRATION_NAME = 'LinkedErrors';

  const _linkedErrorsIntegration = ((options = {}) => {
    const limit = options.limit || DEFAULT_LIMIT;
    const key = options.key || DEFAULT_KEY;

    return {
      name: INTEGRATION_NAME,
      preprocessEvent(event, hint, client) {
        const options = client.getOptions();

        applyAggregateErrorsToEvent(
          // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
          exceptionFromError,
          options.stackParser,
          options.maxValueLength,
          key,
          limit,
          event,
          hint,
        );
      },
    };
  }) ;

  /**
   * Aggregrate linked errors in an event.
   */
  const linkedErrorsIntegration = defineIntegration(_linkedErrorsIntegration);

  /** Get the default integrations for the browser SDK. */
  function getDefaultIntegrations(_options) {
    /**
     * Note: Please make sure this stays in sync with Angular SDK, which re-exports
     * `getDefaultIntegrations` but with an adjusted set of integrations.
     */
    return [
      inboundFiltersIntegration(),
      functionToStringIntegration(),
      browserApiErrorsIntegration(),
      breadcrumbsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
    ];
  }

  function applyDefaultOptions(optionsArg = {}) {
    const defaultOptions = {
      defaultIntegrations: getDefaultIntegrations(),
      release:
        typeof __SENTRY_RELEASE__ === 'string' // This allows build tooling to find-and-replace __SENTRY_RELEASE__ to inject a release value
          ? __SENTRY_RELEASE__
          : WINDOW$3.SENTRY_RELEASE && WINDOW$3.SENTRY_RELEASE.id // This supports the variable that sentry-webpack-plugin injects
            ? WINDOW$3.SENTRY_RELEASE.id
            : undefined,
      autoSessionTracking: true,
      sendClientReports: true,
    };

    return { ...defaultOptions, ...optionsArg };
  }

  function shouldShowBrowserExtensionError() {
    const windowWithMaybeExtension =
      typeof WINDOW$3.window !== 'undefined' && (WINDOW$3 );
    if (!windowWithMaybeExtension) {
      // No need to show the error if we're not in a browser window environment (e.g. service workers)
      return false;
    }

    const extensionKey = windowWithMaybeExtension.chrome ? 'chrome' : 'browser';
    const extensionObject = windowWithMaybeExtension[extensionKey];

    const runtimeId = extensionObject && extensionObject.runtime && extensionObject.runtime.id;
    const href = (WINDOW$3.location && WINDOW$3.location.href) || '';

    const extensionProtocols = ['chrome-extension:', 'moz-extension:', 'ms-browser-extension:'];

    // Running the SDK in a dedicated extension page and calling Sentry.init is fine; no risk of data leakage
    const isDedicatedExtensionPage =
      !!runtimeId && WINDOW$3 === WINDOW$3.top && extensionProtocols.some(protocol => href.startsWith(`${protocol}//`));

    // Running the SDK in NW.js, which appears like a browser extension but isn't, is also fine
    // see: https://github.com/getsentry/sentry-javascript/issues/12668
    const isNWjs = typeof windowWithMaybeExtension.nw !== 'undefined';

    return !!runtimeId && !isDedicatedExtensionPage && !isNWjs;
  }

  /**
   * A magic string that build tooling can leverage in order to inject a release value into the SDK.
   */

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
  function init(browserOptions = {}) {
    const options = applyDefaultOptions(browserOptions);

    if (shouldShowBrowserExtensionError()) {
      consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.error(
          '[Sentry] You cannot run Sentry this way in a browser extension, check: https://docs.sentry.io/platforms/javascript/best-practices/browser-extensions/',
        );
      });
      return;
    }

    {
      if (!supportsFetch()) {
        logger.warn(
          'No Fetch API detected. The Sentry SDK requires a Fetch API compatible environment to send events. Please add a Fetch API polyfill.',
        );
      }
    }
    const clientOptions = {
      ...options,
      stackParser: stackParserFromStackParserOptions(options.stackParser || defaultStackParser),
      integrations: getIntegrationsToSetup(options),
      transport: options.transport || makeFetchTransport,
    };

    const client = initAndBind(BrowserClient, clientOptions);

    if (options.autoSessionTracking) {
      startSessionTracking();
    }

    return client;
  }

  /**
   * All properties the report dialog supports
   */

  /**
   * Present the user with a report dialog.
   *
   * @param options Everything is optional, we try to fetch all info need from the global scope.
   */
  function showReportDialog(options = {}) {
    // doesn't work without a document (React Native)
    if (!WINDOW$3.document) {
      logger.error('Global document not defined in showReportDialog call');
      return;
    }

    const scope = getCurrentScope();
    const client = scope.getClient();
    const dsn = client && client.getDsn();

    if (!dsn) {
      logger.error('DSN not configured for showReportDialog call');
      return;
    }

    if (scope) {
      options.user = {
        ...scope.getUser(),
        ...options.user,
      };
    }

    if (!options.eventId) {
      const eventId = lastEventId();
      if (eventId) {
        options.eventId = eventId;
      }
    }

    const script = WINDOW$3.document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = getReportDialogEndpoint(dsn, options);

    if (options.onLoad) {
      script.onload = options.onLoad;
    }

    const { onClose } = options;
    if (onClose) {
      const reportDialogClosedMessageHandler = (event) => {
        if (event.data === '__sentry_reportdialog_closed__') {
          try {
            onClose();
          } finally {
            WINDOW$3.removeEventListener('message', reportDialogClosedMessageHandler);
          }
        }
      };
      WINDOW$3.addEventListener('message', reportDialogClosedMessageHandler);
    }

    const injectionPoint = WINDOW$3.document.head || WINDOW$3.document.body;
    if (injectionPoint) {
      injectionPoint.appendChild(script);
    } else {
      logger.error('Not injecting report dialog. No injection point found in HTML');
    }
  }

  /**
   * This function is here to be API compatible with the loader.
   * @hidden
   */
  function forceLoad() {
    // Noop
  }

  /**
   * This function is here to be API compatible with the loader.
   * @hidden
   */
  function onLoad(callback) {
    callback();
  }

  /**
   * Enable automatic Session Tracking for the initial page load.
   */
  function startSessionTracking() {
    if (typeof WINDOW$3.document === 'undefined') {
      logger.warn('Session tracking in non-browser environment with @sentry/browser is not supported.');
      return;
    }

    // The session duration for browser sessions does not track a meaningful
    // concept that can be used as a metric.
    // Automatically captured sessions are akin to page views, and thus we
    // discard their duration.
    startSession({ ignoreDuration: true });
    captureSession();

    // We want to create a session for every navigation as well
    addHistoryInstrumentationHandler(({ from, to }) => {
      // Don't create an additional session for the initial route or if the location did not change
      if (from !== undefined && from !== to) {
        startSession({ ignoreDuration: true });
        captureSession();
      }
    });
  }

  /**
   * Captures user feedback and sends it to Sentry.
   *
   * @deprecated Use `captureFeedback` instead.
   */
  function captureUserFeedback(feedback) {
    const client = getClient();
    if (client) {
      // eslint-disable-next-line deprecation/deprecation
      client.captureUserFeedback(feedback);
    }
  }

  // This is a map of integration function method to bundle file name.
  const LazyLoadableIntegrations = {
    replayIntegration: 'replay',
    replayCanvasIntegration: 'replay-canvas',
    feedbackIntegration: 'feedback',
    feedbackModalIntegration: 'feedback-modal',
    feedbackScreenshotIntegration: 'feedback-screenshot',
    captureConsoleIntegration: 'captureconsole',
    contextLinesIntegration: 'contextlines',
    linkedErrorsIntegration: 'linkederrors',
    debugIntegration: 'debug',
    dedupeIntegration: 'dedupe',
    extraErrorDataIntegration: 'extraerrordata',
    httpClientIntegration: 'httpclient',
    reportingObserverIntegration: 'reportingobserver',
    rewriteFramesIntegration: 'rewriteframes',
    sessionTimingIntegration: 'sessiontiming',
    browserProfilingIntegration: 'browserprofiling',
  } ;

  const WindowWithMaybeIntegration = WINDOW$3

  ;

  /**
   * Lazy load an integration from the CDN.
   * Rejects if the integration cannot be loaded.
   */
  async function lazyLoadIntegration(name) {
    const bundle = LazyLoadableIntegrations[name];

    // `window.Sentry` is only set when using a CDN bundle, but this method can also be used via the NPM package
    const sentryOnWindow = (WindowWithMaybeIntegration.Sentry = WindowWithMaybeIntegration.Sentry || {});

    if (!bundle) {
      throw new Error(`Cannot lazy load integration: ${name}`);
    }

    // Bail if the integration already exists
    const existing = sentryOnWindow[name];
    // The `feedbackIntegration` is loaded by default in the CDN bundles,
    // so we need to differentiate between the real integration and the shim.
    // if only the shim exists, we still want to lazy load the real integration.
    if (typeof existing === 'function' && !('_isShim' in existing)) {
      return existing;
    }

    const url = getScriptURL(bundle);
    const script = WINDOW$3.document.createElement('script');
    script.src = url;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'origin';

    const waitForLoad = new Promise((resolve, reject) => {
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', reject);
    });

    WINDOW$3.document.body.appendChild(script);

    try {
      await waitForLoad;
    } catch (e) {
      throw new Error(`Error when loading integration: ${name}`);
    }

    const integrationFn = sentryOnWindow[name];

    if (typeof integrationFn !== 'function') {
      throw new Error(`Could not load integration: ${name}`);
    }

    return integrationFn;
  }

  function getScriptURL(bundle) {
    const client = getClient();
    const options = client && client.getOptions();
    const baseURL = (options && options.cdnBaseUrl) || 'https://browser.sentry-cdn.com';

    return new URL(`/${SDK_VERSION}/${bundle}.min.js`, baseURL).toString();
  }

  /**
   * Adds a value to a counter metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function increment(name, value = 1, data) {
    metrics$1.increment(BrowserMetricsAggregator, name, value, data);
  }

  /**
   * Adds a value to a distribution metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function distribution(name, value, data) {
    metrics$1.distribution(BrowserMetricsAggregator, name, value, data);
  }

  /**
   * Adds a value to a set metric. Value must be a string or integer.
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function set(name, value, data) {
    metrics$1.set(BrowserMetricsAggregator, name, value, data);
  }

  /**
   * Adds a value to a gauge metric
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */
  function gauge(name, value, data) {
    metrics$1.gauge(BrowserMetricsAggregator, name, value, data);
  }

  /**
   * Adds a timing metric.
   * The metric is added as a distribution metric.
   *
   * You can either directly capture a numeric `value`, or wrap a callback function in `timing`.
   * In the latter case, the duration of the callback execution will be captured as a span & a metric.
   *
   * @experimental This API is experimental and might have breaking changes in the future.
   */

  function timing(
    name,
    value,
    unit = 'second',
    data,
  ) {
    return metrics$1.timing(BrowserMetricsAggregator, name, value, unit, data);
  }

  const metrics = {
    increment,
    distribution,
    set,
    gauge,
    timing,
  };

  /**
   * Add a listener that cancels and finishes a transaction when the global
   * document is hidden.
   */
  function registerBackgroundTabDetection() {
    if (WINDOW$3 && WINDOW$3.document) {
      WINDOW$3.document.addEventListener('visibilitychange', () => {
        const activeSpan = getActiveSpan();
        if (!activeSpan) {
          return;
        }

        const rootSpan = getRootSpan(activeSpan);

        if (WINDOW$3.document.hidden && rootSpan) {
          const cancelledStatus = 'cancelled';

          const { op, status } = spanToJSON(rootSpan);

          {
            logger.log(`[Tracing] Transaction: ${cancelledStatus} -> since tab moved to the background, op: ${op}`);
          }

          // We should not set status if it is already set, this prevent important statuses like
          // error or data loss from being overwritten on transaction.
          if (!status) {
            rootSpan.setStatus({ code: SPAN_STATUS_ERROR, message: cancelledStatus });
          }

          rootSpan.setAttribute('sentry.cancellation_reason', 'document.hidden');
          rootSpan.end();
        }
      });
    } else {
      logger.warn('[Tracing] Could not set up background tab detection due to lack of global document');
    }
  }

  /** Options for Request Instrumentation */

  const responseToSpanId = new WeakMap();
  const spanIdToEndTimestamp = new Map();

  const defaultRequestInstrumentationOptions = {
    traceFetch: true,
    traceXHR: true,
    enableHTTPTimings: true,
  };

  /** Registers span creators for xhr and fetch requests  */
  function instrumentOutgoingRequests(client, _options) {
    const { traceFetch, traceXHR, shouldCreateSpanForRequest, enableHTTPTimings, tracePropagationTargets } = {
      traceFetch: defaultRequestInstrumentationOptions.traceFetch,
      traceXHR: defaultRequestInstrumentationOptions.traceXHR,
      ..._options,
    };

    const shouldCreateSpan =
      typeof shouldCreateSpanForRequest === 'function' ? shouldCreateSpanForRequest : (_) => true;

    const shouldAttachHeadersWithTargets = (url) => shouldAttachHeaders(url, tracePropagationTargets);

    const spans = {};

    if (traceFetch) {
      // Keeping track of http requests, whose body payloads resolved later than the intial resolved request
      // e.g. streaming using server sent events (SSE)
      client.addEventProcessor(event => {
        if (event.type === 'transaction' && event.spans) {
          event.spans.forEach(span => {
            if (span.op === 'http.client') {
              const updatedTimestamp = spanIdToEndTimestamp.get(span.span_id);
              if (updatedTimestamp) {
                span.timestamp = updatedTimestamp / 1000;
                spanIdToEndTimestamp.delete(span.span_id);
              }
            }
          });
        }
        return event;
      });

      addFetchEndInstrumentationHandler(handlerData => {
        if (handlerData.response) {
          const span = responseToSpanId.get(handlerData.response);
          if (span && handlerData.endTimestamp) {
            spanIdToEndTimestamp.set(span, handlerData.endTimestamp);
          }
        }
      });

      addFetchInstrumentationHandler(handlerData => {
        const createdSpan = instrumentFetchRequest(handlerData, shouldCreateSpan, shouldAttachHeadersWithTargets, spans);

        if (handlerData.response && handlerData.fetchData.__span) {
          responseToSpanId.set(handlerData.response, handlerData.fetchData.__span);
        }

        // We cannot use `window.location` in the generic fetch instrumentation,
        // but we need it for reliable `server.address` attribute.
        // so we extend this in here
        if (createdSpan) {
          const fullUrl = getFullURL(handlerData.fetchData.url);
          const host = fullUrl ? parseUrl$1(fullUrl).host : undefined;
          createdSpan.setAttributes({
            'http.url': fullUrl,
            'server.address': host,
          });
        }

        if (enableHTTPTimings && createdSpan) {
          addHTTPTimings(createdSpan);
        }
      });
    }

    if (traceXHR) {
      addXhrInstrumentationHandler(handlerData => {
        const createdSpan = xhrCallback(handlerData, shouldCreateSpan, shouldAttachHeadersWithTargets, spans);
        if (enableHTTPTimings && createdSpan) {
          addHTTPTimings(createdSpan);
        }
      });
    }
  }

  function isPerformanceResourceTiming(entry) {
    return (
      entry.entryType === 'resource' &&
      'initiatorType' in entry &&
      typeof (entry ).nextHopProtocol === 'string' &&
      (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest')
    );
  }

  /**
   * Creates a temporary observer to listen to the next fetch/xhr resourcing timings,
   * so that when timings hit their per-browser limit they don't need to be removed.
   *
   * @param span A span that has yet to be finished, must contain `url` on data.
   */
  function addHTTPTimings(span) {
    const { url } = spanToJSON(span).data || {};

    if (!url || typeof url !== 'string') {
      return;
    }

    const cleanup = addPerformanceInstrumentationHandler('resource', ({ entries }) => {
      entries.forEach(entry => {
        if (isPerformanceResourceTiming(entry) && entry.name.endsWith(url)) {
          const spanData = resourceTimingEntryToSpanData(entry);
          spanData.forEach(data => span.setAttribute(...data));
          // In the next tick, clean this handler up
          // We have to wait here because otherwise this cleans itself up before it is fully done
          setTimeout(cleanup);
        }
      });
    });
  }

  /**
   * Converts ALPN protocol ids to name and version.
   *
   * (https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids)
   * @param nextHopProtocol PerformanceResourceTiming.nextHopProtocol
   */
  function extractNetworkProtocol(nextHopProtocol) {
    let name = 'unknown';
    let version = 'unknown';
    let _name = '';
    for (const char of nextHopProtocol) {
      // http/1.1 etc.
      if (char === '/') {
        [name, version] = nextHopProtocol.split('/') ;
        break;
      }
      // h2, h3 etc.
      if (!isNaN(Number(char))) {
        name = _name === 'h' ? 'http' : _name;
        version = nextHopProtocol.split(_name)[1] ;
        break;
      }
      _name += char;
    }
    if (_name === nextHopProtocol) {
      // webrtc, ftp, etc.
      name = _name;
    }
    return { name, version };
  }

  function getAbsoluteTime$1(time = 0) {
    return ((browserPerformanceTimeOrigin || performance.timeOrigin) + time) / 1000;
  }

  function resourceTimingEntryToSpanData(resourceTiming) {
    const { name, version } = extractNetworkProtocol(resourceTiming.nextHopProtocol);

    const timingSpanData = [];

    timingSpanData.push(['network.protocol.version', version], ['network.protocol.name', name]);

    if (!browserPerformanceTimeOrigin) {
      return timingSpanData;
    }
    return [
      ...timingSpanData,
      ['http.request.redirect_start', getAbsoluteTime$1(resourceTiming.redirectStart)],
      ['http.request.fetch_start', getAbsoluteTime$1(resourceTiming.fetchStart)],
      ['http.request.domain_lookup_start', getAbsoluteTime$1(resourceTiming.domainLookupStart)],
      ['http.request.domain_lookup_end', getAbsoluteTime$1(resourceTiming.domainLookupEnd)],
      ['http.request.connect_start', getAbsoluteTime$1(resourceTiming.connectStart)],
      ['http.request.secure_connection_start', getAbsoluteTime$1(resourceTiming.secureConnectionStart)],
      ['http.request.connection_end', getAbsoluteTime$1(resourceTiming.connectEnd)],
      ['http.request.request_start', getAbsoluteTime$1(resourceTiming.requestStart)],
      ['http.request.response_start', getAbsoluteTime$1(resourceTiming.responseStart)],
      ['http.request.response_end', getAbsoluteTime$1(resourceTiming.responseEnd)],
    ];
  }

  /**
   * A function that determines whether to attach tracing headers to a request.
   * We only export this function for testing purposes.
   */
  function shouldAttachHeaders(
    targetUrl,
    tracePropagationTargets,
  ) {
    // window.location.href not being defined is an edge case in the browser but we need to handle it.
    // Potentially dangerous situations where it may not be defined: Browser Extensions, Web Workers, patching of the location obj
    const href = WINDOW$3.location && WINDOW$3.location.href;

    if (!href) {
      // If there is no window.location.origin, we default to only attaching tracing headers to relative requests, i.e. ones that start with `/`
      // BIG DISCLAIMER: Users can call URLs with a double slash (fetch("//example.com/api")), this is a shorthand for "send to the same protocol",
      // so we need a to exclude those requests, because they might be cross origin.
      const isRelativeSameOriginRequest = !!targetUrl.match(/^\/(?!\/)/);
      if (!tracePropagationTargets) {
        return isRelativeSameOriginRequest;
      } else {
        return stringMatchesSomePattern(targetUrl, tracePropagationTargets);
      }
    } else {
      let resolvedUrl;
      let currentOrigin;

      // URL parsing may fail, we default to not attaching trace headers in that case.
      try {
        resolvedUrl = new URL(targetUrl, href);
        currentOrigin = new URL(href).origin;
      } catch (e) {
        return false;
      }

      const isSameOriginRequest = resolvedUrl.origin === currentOrigin;
      if (!tracePropagationTargets) {
        return isSameOriginRequest;
      } else {
        return (
          stringMatchesSomePattern(resolvedUrl.toString(), tracePropagationTargets) ||
          (isSameOriginRequest && stringMatchesSomePattern(resolvedUrl.pathname, tracePropagationTargets))
        );
      }
    }
  }

  /**
   * Create and track xhr request spans
   *
   * @returns Span if a span was created, otherwise void.
   */
  function xhrCallback(
    handlerData,
    shouldCreateSpan,
    shouldAttachHeaders,
    spans,
  ) {
    const xhr = handlerData.xhr;
    const sentryXhrData = xhr && xhr[SENTRY_XHR_DATA_KEY];

    if (!xhr || xhr.__sentry_own_request__ || !sentryXhrData) {
      return undefined;
    }

    const shouldCreateSpanResult = hasTracingEnabled() && shouldCreateSpan(sentryXhrData.url);

    // check first if the request has finished and is tracked by an existing span which should now end
    if (handlerData.endTimestamp && shouldCreateSpanResult) {
      const spanId = xhr.__sentry_xhr_span_id__;
      if (!spanId) return;

      const span = spans[spanId];
      if (span && sentryXhrData.status_code !== undefined) {
        setHttpStatus(span, sentryXhrData.status_code);
        span.end();

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete spans[spanId];
      }
      return undefined;
    }

    const fullUrl = getFullURL(sentryXhrData.url);
    const host = fullUrl ? parseUrl$1(fullUrl).host : undefined;

    const hasParent = !!getActiveSpan();

    const span =
      shouldCreateSpanResult && hasParent
        ? startInactiveSpan({
            name: `${sentryXhrData.method} ${sentryXhrData.url}`,
            attributes: {
              type: 'xhr',
              'http.method': sentryXhrData.method,
              'http.url': fullUrl,
              url: sentryXhrData.url,
              'server.address': host,
              [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.browser',
              [SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'http.client',
            },
          })
        : new SentryNonRecordingSpan();

    xhr.__sentry_xhr_span_id__ = span.spanContext().spanId;
    spans[xhr.__sentry_xhr_span_id__] = span;

    const client = getClient();

    if (xhr.setRequestHeader && shouldAttachHeaders(sentryXhrData.url) && client) {
      addTracingHeadersToXhrRequest(
        xhr,
        client,
        // If performance is disabled (TWP) or there's no active root span (pageload/navigation/interaction),
        // we do not want to use the span as base for the trace headers,
        // which means that the headers will be generated from the scope and the sampling decision is deferred
        hasTracingEnabled() && hasParent ? span : undefined,
      );
    }

    return span;
  }

  function addTracingHeadersToXhrRequest(xhr, client, span) {
    const scope = getCurrentScope();
    const isolationScope = getIsolationScope();
    const { traceId, spanId, sampled, dsc } = {
      ...isolationScope.getPropagationContext(),
      ...scope.getPropagationContext(),
    };

    const sentryTraceHeader =
      span && hasTracingEnabled() ? spanToTraceHeader(span) : generateSentryTraceHeader(traceId, spanId, sampled);

    const sentryBaggageHeader = dynamicSamplingContextToSentryBaggageHeader(
      dsc || (span ? getDynamicSamplingContextFromSpan(span) : getDynamicSamplingContextFromClient(traceId, client)),
    );

    setHeaderOnXhr(xhr, sentryTraceHeader, sentryBaggageHeader);
  }

  function setHeaderOnXhr(
    xhr,
    sentryTraceHeader,
    sentryBaggageHeader,
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      xhr.setRequestHeader('sentry-trace', sentryTraceHeader);
      if (sentryBaggageHeader) {
        // From MDN: "If this method is called several times with the same header, the values are merged into one single request header."
        // We can therefore simply set a baggage header without checking what was there before
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        xhr.setRequestHeader(BAGGAGE_HEADER_NAME, sentryBaggageHeader);
      }
    } catch (_) {
      // Error: InvalidStateError: Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.
    }
  }

  function getFullURL(url) {
    try {
      // By adding a base URL to new URL(), this will also work for relative urls
      // If `url` is a full URL, the base URL is ignored anyhow
      const parsed = new URL(url, WINDOW$3.location.origin);
      return parsed.href;
    } catch (e2) {
      return undefined;
    }
  }

  /* eslint-disable max-lines */

  const BROWSER_TRACING_INTEGRATION_ID = 'BrowserTracing';

  const DEFAULT_BROWSER_TRACING_OPTIONS = {
    ...TRACING_DEFAULTS,
    instrumentNavigation: true,
    instrumentPageLoad: true,
    markBackgroundSpan: true,
    enableLongTask: true,
    enableLongAnimationFrame: false,
    enableInp: true,
    _experiments: {},
    ...defaultRequestInstrumentationOptions,
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
  const browserTracingIntegration = ((_options = {}) => {
    registerSpanErrorInstrumentation();

    const {
      enableInp,
      enableLongTask,
      enableLongAnimationFrame,
      _experiments: { enableInteractions },
      beforeStartSpan,
      idleTimeout,
      finalTimeout,
      childSpanTimeout,
      markBackgroundSpan,
      traceFetch,
      traceXHR,
      shouldCreateSpanForRequest,
      enableHTTPTimings,
      instrumentPageLoad,
      instrumentNavigation,
    } = {
      ...DEFAULT_BROWSER_TRACING_OPTIONS,
      ..._options,
    };

    const _collectWebVitals = startTrackingWebVitals();

    if (enableInp) {
      startTrackingINP();
    }

    if (enableLongAnimationFrame && PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
      startTrackingLongAnimationFrames();
    } else if (enableLongTask) {
      startTrackingLongTasks();
    }

    if (enableInteractions) {
      startTrackingInteractions();
    }

    const latestRoute = {
      name: undefined,
      source: undefined,
    };

    /** Create routing idle transaction. */
    function _createRouteSpan(client, startSpanOptions) {
      const isPageloadTransaction = startSpanOptions.op === 'pageload';

      const finalStartSpanOptions = beforeStartSpan
        ? beforeStartSpan(startSpanOptions)
        : startSpanOptions;

      const attributes = finalStartSpanOptions.attributes || {};

      // If `finalStartSpanOptions.name` is different than `startSpanOptions.name`
      // it is because `beforeStartSpan` set a custom name. Therefore we set the source to 'custom'.
      if (startSpanOptions.name !== finalStartSpanOptions.name) {
        attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] = 'custom';
        finalStartSpanOptions.attributes = attributes;
      }

      latestRoute.name = finalStartSpanOptions.name;
      latestRoute.source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

      const idleSpan = startIdleSpan(finalStartSpanOptions, {
        idleTimeout,
        finalTimeout,
        childSpanTimeout,
        // should wait for finish signal if it's a pageload transaction
        disableAutoFinish: isPageloadTransaction,
        beforeSpanEnd: span => {
          _collectWebVitals();
          addPerformanceEntries(span);
        },
      });

      function emitFinish() {
        if (['interactive', 'complete'].includes(WINDOW$3.document.readyState)) {
          client.emit('idleSpanEnableAutoFinish', idleSpan);
        }
      }

      if (isPageloadTransaction && WINDOW$3.document) {
        WINDOW$3.document.addEventListener('readystatechange', () => {
          emitFinish();
        });

        emitFinish();
      }

      return idleSpan;
    }

    return {
      name: BROWSER_TRACING_INTEGRATION_ID,
      afterAllSetup(client) {
        let activeSpan;
        let startingUrl = WINDOW$3.location && WINDOW$3.location.href;

        client.on('startNavigationSpan', startSpanOptions => {
          if (getClient() !== client) {
            return;
          }

          if (activeSpan && !spanToJSON(activeSpan).timestamp) {
            logger.log(`[Tracing] Finishing current root span with op: ${spanToJSON(activeSpan).op}`);
            // If there's an open transaction on the scope, we need to finish it before creating an new one.
            activeSpan.end();
          }
          activeSpan = _createRouteSpan(client, {
            op: 'navigation',
            ...startSpanOptions,
          });
        });

        client.on('startPageLoadSpan', (startSpanOptions, traceOptions = {}) => {
          if (getClient() !== client) {
            return;
          }

          if (activeSpan && !spanToJSON(activeSpan).timestamp) {
            logger.log(`[Tracing] Finishing current root span with op: ${spanToJSON(activeSpan).op}`);
            // If there's an open transaction on the scope, we need to finish it before creating an new one.
            activeSpan.end();
          }

          const sentryTrace = traceOptions.sentryTrace || getMetaContent('sentry-trace');
          const baggage = traceOptions.baggage || getMetaContent('baggage');

          const propagationContext = propagationContextFromHeaders(sentryTrace, baggage);
          getCurrentScope().setPropagationContext(propagationContext);

          activeSpan = _createRouteSpan(client, {
            op: 'pageload',
            ...startSpanOptions,
          });
        });

        // A trace should to stay the consistent over the entire time span of one route.
        // Therefore, when the initial pageload or navigation root span ends, we update the
        // scope's propagation context to keep span-specific attributes like the `sampled` decision and
        // the dynamic sampling context valid, even after the root span has ended.
        // This ensures that the trace data is consistent for the entire duration of the route.
        client.on('spanEnd', span => {
          const op = spanToJSON(span).op;
          if (span !== getRootSpan(span) || (op !== 'navigation' && op !== 'pageload')) {
            return;
          }

          const scope = getCurrentScope();
          const oldPropagationContext = scope.getPropagationContext();

          scope.setPropagationContext({
            ...oldPropagationContext,
            sampled: oldPropagationContext.sampled !== undefined ? oldPropagationContext.sampled : spanIsSampled(span),
            dsc: oldPropagationContext.dsc || getDynamicSamplingContextFromSpan(span),
          });
        });

        if (WINDOW$3.location) {
          if (instrumentPageLoad) {
            startBrowserTracingPageLoadSpan(client, {
              name: WINDOW$3.location.pathname,
              // pageload should always start at timeOrigin (and needs to be in s, not ms)
              startTime: browserPerformanceTimeOrigin ? browserPerformanceTimeOrigin / 1000 : undefined,
              attributes: {
                [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
                [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.pageload.browser',
              },
            });
          }

          if (instrumentNavigation) {
            addHistoryInstrumentationHandler(({ to, from }) => {
              /**
               * This early return is there to account for some cases where a navigation transaction starts right after
               * long-running pageload. We make sure that if `from` is undefined and a valid `startingURL` exists, we don't
               * create an uneccessary navigation transaction.
               *
               * This was hard to duplicate, but this behavior stopped as soon as this fix was applied. This issue might also
               * only be caused in certain development environments where the usage of a hot module reloader is causing
               * errors.
               */
              if (from === undefined && startingUrl && startingUrl.indexOf(to) !== -1) {
                startingUrl = undefined;
                return;
              }

              if (from !== to) {
                startingUrl = undefined;
                startBrowserTracingNavigationSpan(client, {
                  name: WINDOW$3.location.pathname,
                  attributes: {
                    [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'url',
                    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.browser',
                  },
                });
              }
            });
          }
        }

        if (markBackgroundSpan) {
          registerBackgroundTabDetection();
        }

        if (enableInteractions) {
          registerInteractionListener(idleTimeout, finalTimeout, childSpanTimeout, latestRoute);
        }

        if (enableInp) {
          registerInpInteractionListener();
        }

        instrumentOutgoingRequests(client, {
          traceFetch,
          traceXHR,
          tracePropagationTargets: client.getOptions().tracePropagationTargets,
          shouldCreateSpanForRequest,
          enableHTTPTimings,
        });
      },
    };
  }) ;

  /**
   * Manually start a page load span.
   * This will only do something if a browser tracing integration integration has been setup.
   *
   * If you provide a custom `traceOptions` object, it will be used to continue the trace
   * instead of the default behavior, which is to look it up on the <meta> tags.
   */
  function startBrowserTracingPageLoadSpan(
    client,
    spanOptions,
    traceOptions,
  ) {
    client.emit('startPageLoadSpan', spanOptions, traceOptions);

    getCurrentScope().setTransactionName(spanOptions.name);

    const span = getActiveSpan();
    const op = span && spanToJSON(span).op;
    return op === 'pageload' ? span : undefined;
  }

  /**
   * Manually start a navigation span.
   * This will only do something if a browser tracing integration has been setup.
   */
  function startBrowserTracingNavigationSpan(client, spanOptions) {
    getIsolationScope().setPropagationContext(generatePropagationContext());
    getCurrentScope().setPropagationContext(generatePropagationContext());

    client.emit('startNavigationSpan', spanOptions);

    getCurrentScope().setTransactionName(spanOptions.name);

    const span = getActiveSpan();
    const op = span && spanToJSON(span).op;
    return op === 'navigation' ? span : undefined;
  }

  /** Returns the value of a meta tag */
  function getMetaContent(metaName) {
    // Can't specify generic to `getDomElement` because tracing can be used
    // in a variety of environments, have to disable `no-unsafe-member-access`
    // as a result.
    const metaTag = getDomElement(`meta[name=${metaName}]`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return metaTag ? metaTag.getAttribute('content') : undefined;
  }

  /** Start listener for interaction transactions */
  function registerInteractionListener(
    idleTimeout,
    finalTimeout,
    childSpanTimeout,
    latestRoute,
  ) {
    let inflightInteractionSpan;
    const registerInteractionTransaction = () => {
      const op = 'ui.action.click';

      const activeSpan = getActiveSpan();
      const rootSpan = activeSpan && getRootSpan(activeSpan);
      if (rootSpan) {
        const currentRootSpanOp = spanToJSON(rootSpan).op;
        if (['navigation', 'pageload'].includes(currentRootSpanOp )) {
          logger.warn(`[Tracing] Did not create ${op} span because a pageload or navigation span is in progress.`);
          return undefined;
        }
      }

      if (inflightInteractionSpan) {
        inflightInteractionSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_IDLE_SPAN_FINISH_REASON, 'interactionInterrupted');
        inflightInteractionSpan.end();
        inflightInteractionSpan = undefined;
      }

      if (!latestRoute.name) {
        logger.warn(`[Tracing] Did not create ${op} transaction because _latestRouteName is missing.`);
        return undefined;
      }

      inflightInteractionSpan = startIdleSpan(
        {
          name: latestRoute.name,
          op,
          attributes: {
            [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: latestRoute.source || 'url',
          },
        },
        {
          idleTimeout,
          finalTimeout,
          childSpanTimeout,
        },
      );
    };

    if (WINDOW$3.document) {
      addEventListener('click', registerInteractionTransaction, { once: false, capture: true });
    }
  }

  // exporting a separate copy of `WINDOW` rather than exporting the one from `@sentry/browser`
  // prevents the browser package from being bundled in the CDN bundle, and avoids a
  // circular dependency between the browser and feedback packages
  const WINDOW$1 = GLOBAL_OBJ ;
  const DOCUMENT = WINDOW$1.document;
  const NAVIGATOR = WINDOW$1.navigator;

  const TRIGGER_LABEL = 'Report a Bug';
  const CANCEL_BUTTON_LABEL = 'Cancel';
  const SUBMIT_BUTTON_LABEL = 'Send Bug Report';
  const CONFIRM_BUTTON_LABEL = 'Confirm';
  const FORM_TITLE = 'Report a Bug';
  const EMAIL_PLACEHOLDER = 'your.email@example.org';
  const EMAIL_LABEL = 'Email';
  const MESSAGE_PLACEHOLDER = "What's the bug? What did you expect?";
  const MESSAGE_LABEL = 'Description';
  const NAME_PLACEHOLDER = 'Your Name';
  const NAME_LABEL = 'Name';
  const SUCCESS_MESSAGE_TEXT = 'Thank you for your report!';
  const IS_REQUIRED_LABEL = '(required)';
  const ADD_SCREENSHOT_LABEL = 'Add a screenshot';
  const REMOVE_SCREENSHOT_LABEL = 'Remove screenshot';
  const FEEDBACK_API_SOURCE = 'api';

  /**
   * Public API to send a Feedback item to Sentry
   */
  const sendFeedback = (
    params,
    hint = { includeReplay: true },
  ) => {
    if (!params.message) {
      throw new Error('Unable to submit feedback with empty message');
    }

    // We want to wait for the feedback to be sent (or not)
    const client = getClient();

    if (!client) {
      throw new Error('No client setup, cannot send feedback.');
    }

    if (params.tags && Object.keys(params.tags).length) {
      getCurrentScope().setTags(params.tags);
    }
    const eventId = captureFeedback(
      {
        source: FEEDBACK_API_SOURCE,
        url: getLocationHref(),
        ...params,
      },
      hint,
    );

    // We want to wait for the feedback to be sent (or not)
    return new Promise((resolve, reject) => {
      // After 5s, we want to clear anyhow
      const timeout = setTimeout(() => reject('Unable to determine if Feedback was correctly sent.'), 5000);

      const cleanup = client.on('afterSendEvent', (event, response) => {
        if (event.event_id !== eventId) {
          return;
        }

        clearTimeout(timeout);
        cleanup();

        // Require valid status codes, otherwise can assume feedback was not sent successfully
        if (
          response &&
          typeof response.statusCode === 'number' &&
          response.statusCode >= 200 &&
          response.statusCode < 300
        ) {
          resolve(eventId);
        }

        if (response && typeof response.statusCode === 'number' && response.statusCode === 0) {
          return reject(
            'Unable to send Feedback. This is because of network issues, or because you are using an ad-blocker.',
          );
        }

        return reject(
          'Unable to send Feedback. This could be because of network issues, or because you are using an ad-blocker',
        );
      });
    });
  };

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
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(NAVIGATOR.userAgent)) {
      return false;
    }
    /**
     * User agent on iPads show as Macintosh, so we need extra checks
     *
     * https://forums.developer.apple.com/forums/thread/119186
     * https://stackoverflow.com/questions/60482650/how-to-detect-ipad-useragent-on-safari-browser
     */
    if (/Macintosh/i.test(NAVIGATOR.userAgent) && NAVIGATOR.maxTouchPoints && NAVIGATOR.maxTouchPoints > 1) {
      return false;
    }
    if (!isSecureContext) {
      return false;
    }
    return true;
  }

  /**
   * Quick and dirty deep merge for the Feedback integration options
   */
  function mergeOptions(
    defaultOptions,
    optionOverrides,
  ) {
    return {
      ...defaultOptions,
      ...optionOverrides,
      tags: {
        ...defaultOptions.tags,
        ...optionOverrides.tags,
      },
      onFormOpen: () => {
        optionOverrides.onFormOpen && optionOverrides.onFormOpen();
        defaultOptions.onFormOpen && defaultOptions.onFormOpen();
      },
      onFormClose: () => {
        optionOverrides.onFormClose && optionOverrides.onFormClose();
        defaultOptions.onFormClose && defaultOptions.onFormClose();
      },
      onSubmitSuccess: (data) => {
        optionOverrides.onSubmitSuccess && optionOverrides.onSubmitSuccess(data);
        defaultOptions.onSubmitSuccess && defaultOptions.onSubmitSuccess(data);
      },
      onSubmitError: (error) => {
        optionOverrides.onSubmitError && optionOverrides.onSubmitError(error);
        defaultOptions.onSubmitError && defaultOptions.onSubmitError(error);
      },
      onFormSubmitted: () => {
        optionOverrides.onFormSubmitted && optionOverrides.onFormSubmitted();
        defaultOptions.onFormSubmitted && defaultOptions.onFormSubmitted();
      },
      themeDark: {
        ...defaultOptions.themeDark,
        ...optionOverrides.themeDark,
      },
      themeLight: {
        ...defaultOptions.themeLight,
        ...optionOverrides.themeLight,
      },
    };
  }

  /**
   * Creates <style> element for widget actor (button that opens the dialog)
   */
  function createActorStyles() {
    const style = DOCUMENT.createElement('style');
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

    return style;
  }

  /**
   * Helper function to set a dict of attributes on element (w/ specified namespace)
   */
  function setAttributesNS(el, attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttributeNS(null, key, val);
    });
    return el;
  }

  const SIZE = 20;
  const XMLNS$2 = 'http://www.w3.org/2000/svg';

  /**
   * Feedback Icon
   */
  function FeedbackIcon() {
    const createElementNS = (tagName) =>
      WINDOW$1.document.createElementNS(XMLNS$2, tagName);
    const svg = setAttributesNS(createElementNS('svg'), {
      width: `${SIZE}`,
      height: `${SIZE}`,
      viewBox: `0 0 ${SIZE} ${SIZE}`,
      fill: 'var(--foreground)',
    });

    const g = setAttributesNS(createElementNS('g'), {
      clipPath: 'url(#clip0_57_80)',
    });

    const path = setAttributesNS(createElementNS('path'), {
      ['fill-rule']: 'evenodd',
      ['clip-rule']: 'evenodd',
      d: 'M15.6622 15H12.3997C12.2129 14.9959 12.031 14.9396 11.8747 14.8375L8.04965 12.2H7.49956V19.1C7.4875 19.3348 7.3888 19.5568 7.22256 19.723C7.05632 19.8892 6.83435 19.9879 6.59956 20H2.04956C1.80193 19.9968 1.56535 19.8969 1.39023 19.7218C1.21511 19.5467 1.1153 19.3101 1.11206 19.0625V12.2H0.949652C0.824431 12.2017 0.700142 12.1783 0.584123 12.1311C0.468104 12.084 0.362708 12.014 0.274155 11.9255C0.185602 11.8369 0.115689 11.7315 0.0685419 11.6155C0.0213952 11.4995 -0.00202913 11.3752 -0.00034808 11.25V3.75C-0.00900498 3.62067 0.0092504 3.49095 0.0532651 3.36904C0.0972798 3.24712 0.166097 3.13566 0.255372 3.04168C0.344646 2.94771 0.452437 2.87327 0.571937 2.82307C0.691437 2.77286 0.82005 2.74798 0.949652 2.75H8.04965L11.8747 0.1625C12.031 0.0603649 12.2129 0.00407221 12.3997 0H15.6622C15.9098 0.00323746 16.1464 0.103049 16.3215 0.278167C16.4966 0.453286 16.5964 0.689866 16.5997 0.9375V3.25269C17.3969 3.42959 18.1345 3.83026 18.7211 4.41679C19.5322 5.22788 19.9878 6.32796 19.9878 7.47502C19.9878 8.62209 19.5322 9.72217 18.7211 10.5333C18.1345 11.1198 17.3969 11.5205 16.5997 11.6974V14.0125C16.6047 14.1393 16.5842 14.2659 16.5395 14.3847C16.4948 14.5035 16.4268 14.6121 16.3394 14.7042C16.252 14.7962 16.147 14.8698 16.0307 14.9206C15.9144 14.9714 15.7891 14.9984 15.6622 15ZM1.89695 10.325H1.88715V4.625H8.33715C8.52423 4.62301 8.70666 4.56654 8.86215 4.4625L12.6872 1.875H14.7247V13.125H12.6872L8.86215 10.4875C8.70666 10.3835 8.52423 10.327 8.33715 10.325H2.20217C2.15205 10.3167 2.10102 10.3125 2.04956 10.3125C1.9981 10.3125 1.94708 10.3167 1.89695 10.325ZM2.98706 12.2V18.1625H5.66206V12.2H2.98706ZM16.5997 9.93612V5.01393C16.6536 5.02355 16.7072 5.03495 16.7605 5.04814C17.1202 5.13709 17.4556 5.30487 17.7425 5.53934C18.0293 5.77381 18.2605 6.06912 18.4192 6.40389C18.578 6.73866 18.6603 7.10452 18.6603 7.47502C18.6603 7.84552 18.578 8.21139 18.4192 8.54616C18.2605 8.88093 18.0293 9.17624 17.7425 9.41071C17.4556 9.64518 17.1202 9.81296 16.7605 9.90191C16.7072 9.91509 16.6536 9.9265 16.5997 9.93612Z',
    });
    svg.appendChild(g).appendChild(path);

    const speakerDefs = createElementNS('defs');
    const speakerClipPathDef = setAttributesNS(createElementNS('clipPath'), {
      id: 'clip0_57_80',
    });

    const speakerRect = setAttributesNS(createElementNS('rect'), {
      width: `${SIZE}`,
      height: `${SIZE}`,
      fill: 'white',
    });

    speakerClipPathDef.appendChild(speakerRect);
    speakerDefs.appendChild(speakerClipPathDef);

    svg.appendChild(speakerDefs).appendChild(speakerClipPathDef).appendChild(speakerRect);

    return svg;
  }

  /**
   * The sentry-provided button to open the feedback modal
   */
  function Actor({ triggerLabel, triggerAriaLabel, shadow }) {
    const el = DOCUMENT.createElement('button');
    el.type = 'button';
    el.className = 'widget__actor';
    el.ariaHidden = 'false';
    el.ariaLabel = triggerAriaLabel || triggerLabel || TRIGGER_LABEL;
    el.appendChild(FeedbackIcon());
    if (triggerLabel) {
      const label = DOCUMENT.createElement('span');
      label.appendChild(DOCUMENT.createTextNode(triggerLabel));
      el.appendChild(label);
    }

    const style = createActorStyles();

    return {
      el,
      appendToDom() {
        shadow.appendChild(style);
        shadow.appendChild(el);
      },
      removeFromDom() {
        shadow.removeChild(el);
        shadow.removeChild(style);
      },
      show() {
        el.ariaHidden = 'false';
      },
      hide() {
        el.ariaHidden = 'true';
      },
    };
  }

  const PURPLE = 'rgba(88, 74, 192, 1)';

  const DEFAULT_LIGHT = {
    foreground: '#2b2233',
    background: '#ffffff',
    accentForeground: 'white',
    accentBackground: PURPLE,
    successColor: '#268d75',
    errorColor: '#df3338',
    border: '1.5px solid rgba(41, 35, 47, 0.13)',
    boxShadow: '0px 4px 24px 0px rgba(43, 34, 51, 0.12)',
    outline: '1px auto var(--accent-background)',
    interactiveFilter: 'brightness(95%)',
  };
  const DEFAULT_DARK = {
    foreground: '#ebe6ef',
    background: '#29232f',
    accentForeground: 'white',
    accentBackground: PURPLE,
    successColor: '#2da98c',
    errorColor: '#f55459',
    border: '1.5px solid rgba(235, 230, 239, 0.15)',
    boxShadow: '0px 4px 24px 0px rgba(43, 34, 51, 0.12)',
    outline: '1px auto var(--accent-background)',
    interactiveFilter: 'brightness(150%)',
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
  function createMainStyles({ colorScheme, themeDark, themeLight }) {
    const style = DOCUMENT.createElement('style');
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

  ${colorScheme !== 'system' ? 'color-scheme: only light;' : ''}

  ${getThemedCssVariables(
    colorScheme === 'dark' ? { ...DEFAULT_DARK, ...themeDark } : { ...DEFAULT_LIGHT, ...themeLight },
  )}
}

${
  colorScheme === 'system'
    ? `
@media (prefers-color-scheme: dark) {
  :host {
    ${getThemedCssVariables({ ...DEFAULT_DARK, ...themeDark })}
  }
}`
    : ''
}
}
`;

    return style;
  }

  const buildFeedbackIntegration = ({
    lazyLoadIntegration,
    getModalIntegration,
    getScreenshotIntegration,
  }

  ) => {
    const feedbackIntegration = (({
      // FeedbackGeneralConfiguration
      id = 'sentry-feedback',
      autoInject = true,
      showBranding = true,
      isEmailRequired = false,
      isNameRequired = false,
      showEmail = true,
      showName = true,
      enableScreenshot = true,
      useSentryUser = {
        email: 'email',
        name: 'username',
      },
      tags,

      // FeedbackThemeConfiguration
      colorScheme = 'system',
      themeLight = {},
      themeDark = {},

      // FeedbackTextConfiguration
      addScreenshotButtonLabel = ADD_SCREENSHOT_LABEL,
      cancelButtonLabel = CANCEL_BUTTON_LABEL,
      confirmButtonLabel = CONFIRM_BUTTON_LABEL,
      emailLabel = EMAIL_LABEL,
      emailPlaceholder = EMAIL_PLACEHOLDER,
      formTitle = FORM_TITLE,
      isRequiredLabel = IS_REQUIRED_LABEL,
      messageLabel = MESSAGE_LABEL,
      messagePlaceholder = MESSAGE_PLACEHOLDER,
      nameLabel = NAME_LABEL,
      namePlaceholder = NAME_PLACEHOLDER,
      removeScreenshotButtonLabel = REMOVE_SCREENSHOT_LABEL,
      submitButtonLabel = SUBMIT_BUTTON_LABEL,
      successMessageText = SUCCESS_MESSAGE_TEXT,
      triggerLabel = TRIGGER_LABEL,
      triggerAriaLabel = '',

      // FeedbackCallbacks
      onFormOpen,
      onFormClose,
      onSubmitSuccess,
      onSubmitError,
      onFormSubmitted,
    } = {}) => {
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

        onFormClose,
        onFormOpen,
        onSubmitError,
        onSubmitSuccess,
        onFormSubmitted,
      };

      let _shadow = null;
      let _subscriptions = [];

      /**
       * Get the shadow root where we will append css
       */
      const _createShadow = (options) => {
        if (!_shadow) {
          const host = DOCUMENT.createElement('div');
          host.id = String(options.id);
          DOCUMENT.body.appendChild(host);

          _shadow = host.attachShadow({ mode: 'open' });
          _shadow.appendChild(createMainStyles(options));
        }
        return _shadow ;
      };

      const _findIntegration = async (
        integrationName,
        getter,
        functionMethodName,
      ) => {
        const client = getClient();
        const existing = client && client.getIntegrationByName(integrationName);
        if (existing) {
          return existing ;
        }
        const integrationFn = (getter && getter()) || (await lazyLoadIntegration(functionMethodName));
        const integration = integrationFn();
        client && client.addIntegration(integration);
        return integration ;
      };

      const _loadAndRenderDialog = async (
        options,
      ) => {
        const screenshotRequired = options.enableScreenshot && isScreenshotSupported();
        const [modalIntegration, screenshotIntegration] = await Promise.all([
          _findIntegration('FeedbackModal', getModalIntegration, 'feedbackModalIntegration'),
          screenshotRequired
            ? _findIntegration(
                'FeedbackScreenshot',
                getScreenshotIntegration,
                'feedbackScreenshotIntegration',
              )
            : undefined,
        ]);
        if (!modalIntegration) {
          // TODO: Let the end-user retry async loading
          logger.error(
              '[Feedback] Missing feedback modal integration. Try using `feedbackSyncIntegration` in your `Sentry.init`.',
            );
          throw new Error('[Feedback] Missing feedback modal integration!');
        }
        if (screenshotRequired && !screenshotIntegration) {
          logger.error('[Feedback] Missing feedback screenshot integration. Proceeding without screenshots.');
        }

        const dialog = modalIntegration.createDialog({
          options: {
            ...options,
            onFormClose: () => {
              dialog && dialog.close();
              options.onFormClose && options.onFormClose();
            },
            onFormSubmitted: () => {
              dialog && dialog.close();
              options.onFormSubmitted && options.onFormSubmitted();
            },
          },
          screenshotIntegration: screenshotRequired ? screenshotIntegration : undefined,
          sendFeedback,
          shadow: _createShadow(options),
        });

        return dialog;
      };

      const _attachTo = (el, optionOverrides = {}) => {
        const mergedOptions = mergeOptions(_options, optionOverrides);

        const targetEl =
          typeof el === 'string' ? DOCUMENT.querySelector(el) : typeof el.addEventListener === 'function' ? el : null;

        if (!targetEl) {
          logger.error('[Feedback] Unable to attach to target element');
          throw new Error('Unable to attach to target element');
        }

        let dialog = null;
        const handleClick = async () => {
          if (!dialog) {
            dialog = await _loadAndRenderDialog({
              ...mergedOptions,
              onFormSubmitted: () => {
                dialog && dialog.removeFromDom();
                mergedOptions.onFormSubmitted && mergedOptions.onFormSubmitted();
              },
            });
          }
          dialog.appendToDom();
          dialog.open();
        };
        targetEl.addEventListener('click', handleClick);
        const unsubscribe = () => {
          _subscriptions = _subscriptions.filter(sub => sub !== unsubscribe);
          dialog && dialog.removeFromDom();
          dialog = null;
          targetEl.removeEventListener('click', handleClick);
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
          },
        });
        return actor;
      };

      return {
        name: 'Feedback',
        setupOnce() {
          if (!isBrowser() || !_options.autoInject) {
            return;
          }

          if (DOCUMENT.readyState === 'loading') {
            DOCUMENT.addEventListener('DOMContentLoaded', () => _createActor().appendToDom());
          } else {
            _createActor().appendToDom();
          }
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
        async createForm(
          optionOverrides = {},
        ) {
          return _loadAndRenderDialog(mergeOptions(_options, optionOverrides));
        },

        /**
         * Removes the Feedback integration (including host, shadow DOM, and all widgets)
         */
        remove() {
          if (_shadow) {
            _shadow.parentElement && _shadow.parentElement.remove();
            _shadow = null;
          }
          // Remove any lingering subscriptions
          _subscriptions.forEach(sub => sub());
          _subscriptions = [];
        },
      };
    }) ;

    return feedbackIntegration;
  };

  /**
   * This is a small utility to get a type-safe instance of the Feedback integration.
   */
  function getFeedback() {
    const client = getClient();
    return client && client.getIntegrationByName('Feedback');
  }

  var l$1;l$1={__e:function(n,l,u,t){for(var i,o,r;l=l.__;)if((i=l.__c)&&!i.__)try{if((o=i.constructor)&&null!=o.getDerivedStateFromError&&(i.setState(o.getDerivedStateFromError(n)),r=i.__d),null!=i.componentDidCatch&&(i.componentDidCatch(n,t||{}),r=i.__d),r)return i.__E=i}catch(l){n=l;}throw n}},"function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout;

  var r$1,u,i,f=[],c=[],e$1=l$1,a=e$1.__b,v=e$1.__r,l=e$1.diffed,m=e$1.__c,s=e$1.unmount,d=e$1.__;function j(){for(var n;n=f.shift();)if(n.__P&&n.__H)try{n.__H.__h.forEach(z),n.__H.__h.forEach(B),n.__H.__h=[];}catch(t){n.__H.__h=[],e$1.__e(t,n.__v);}}e$1.__b=function(n){r$1=null,a&&a(n);},e$1.__=function(n,t){t.__k&&t.__k.__m&&(n.__m=t.__k.__m),d&&d(n,t);},e$1.__r=function(n){v&&v(n);var i=(r$1=n.__c).__H;i&&(u===r$1?(i.__h=[],r$1.__h=[],i.__.forEach(function(n){n.__N&&(n.__=n.__N),n.__V=c,n.__N=n.i=void 0;})):(i.__h.forEach(z),i.__h.forEach(B),i.__h=[],0)),u=r$1;},e$1.diffed=function(n){l&&l(n);var t=n.__c;t&&t.__H&&(t.__H.__h.length&&(1!==f.push(t)&&i===e$1.requestAnimationFrame||((i=e$1.requestAnimationFrame)||w)(j)),t.__H.__.forEach(function(n){n.i&&(n.__H=n.i),n.__V!==c&&(n.__=n.__V),n.i=void 0,n.__V=c;})),u=r$1=null;},e$1.__c=function(n,t){t.some(function(n){try{n.__h.forEach(z),n.__h=n.__h.filter(function(n){return !n.__||B(n)});}catch(r){t.some(function(n){n.__h&&(n.__h=[]);}),t=[],e$1.__e(r,n.__v);}}),m&&m(n,t);},e$1.unmount=function(n){s&&s(n);var t,r=n.__c;r&&r.__H&&(r.__H.__.forEach(function(n){try{z(n);}catch(n){t=n;}}),r.__H=void 0,t&&e$1.__e(t,r.__v));};var k="function"==typeof requestAnimationFrame;function w(n){var t,r=function(){clearTimeout(u),k&&cancelAnimationFrame(t),setTimeout(n);},u=setTimeout(r,100);k&&(t=requestAnimationFrame(r));}function z(n){var t=r$1,u=n.__c;"function"==typeof u&&(n.__c=void 0,u()),r$1=t;}function B(n){var t=r$1;n.__c=n.__(),r$1=t;}

  /**
   * An integration to add user feedback to your application,
   * while loading most of the code lazily only when it's needed.
   */
  const feedbackAsyncIntegration = buildFeedbackIntegration({
    lazyLoadIntegration,
  });

  // exporting a separate copy of `WINDOW` rather than exporting the one from `@sentry/browser`
  // prevents the browser package from being bundled in the CDN bundle, and avoids a
  // circular dependency between the browser and replay packages should `@sentry/browser` import
  // from `@sentry/replay` in the future
  const WINDOW = GLOBAL_OBJ ;

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

  function _nullishCoalesce$1(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }var NodeType$1;
  (function (NodeType) {
      NodeType[NodeType["Document"] = 0] = "Document";
      NodeType[NodeType["DocumentType"] = 1] = "DocumentType";
      NodeType[NodeType["Element"] = 2] = "Element";
      NodeType[NodeType["Text"] = 3] = "Text";
      NodeType[NodeType["CDATA"] = 4] = "CDATA";
      NodeType[NodeType["Comment"] = 5] = "Comment";
  })(NodeType$1 || (NodeType$1 = {}));

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
          cssText = cssText.replace(' background-clip: text;', ' -webkit-background-clip: text; background-clip: text;');
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
      else if (isCSSStyleRule(rule) && rule.selectorText.includes(':')) {
          return fixSafariColons(rule.cssText);
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
  const cachedImplementations$1 = {};
  function getImplementation$1(name) {
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
  function setTimeout$1(...rest) {
      return getImplementation$1('setTimeout')(...rest);
  }
  function clearTimeout$2(...rest) {
      return getImplementation$1('clearTimeout')(...rest);
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
  function absoluteToDoc(doc, attributeValue) {
      if (!attributeValue || attributeValue.trim() === '') {
          return attributeValue;
      }
      const a = doc.createElement('a');
      a.href = attributeValue;
      return a.href;
  }
  function isSVGElement(el) {
      return Boolean(el.tagName === 'svg' || el.ownerSVGElement);
  }
  function getHref() {
      const a = document.createElement('a');
      a.href = '';
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
          return absoluteToStylesheet(value, getHref());
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
          const timer = setTimeout$1(() => {
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
          setTimeout$1(listener, 0);
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
      const timer = setTimeout$1(() => {
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
                      type: NodeType$1.Document,
                      childNodes: [],
                      compatMode: n.compatMode,
                  };
              }
              else {
                  return {
                      type: NodeType$1.Document,
                      childNodes: [],
                  };
              }
          case n.DOCUMENT_TYPE_NODE:
              return {
                  type: NodeType$1.DocumentType,
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
                  type: NodeType$1.CDATA,
                  textContent: '',
                  rootId,
              };
          case n.COMMENT_NODE:
              return {
                  type: NodeType$1.Comment,
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
          textContent = absoluteToStylesheet(textContent, getHref());
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
          type: NodeType$1.Text,
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
              delete attributes.rel;
              delete attributes.href;
              attributes._cssText = absoluteToStylesheet(cssText, stylesheet.href);
          }
      }
      if (tagName === 'style' &&
          n.sheet &&
          !(n.innerText || n.textContent || '').trim().length) {
          const cssText = stringifyStylesheet(n.sheet);
          if (cssText) {
              attributes._cssText = absoluteToStylesheet(cssText, getHref());
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
              const blankCanvas = document.createElement('canvas');
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
          const oldValue = image.crossOrigin;
          image.crossOrigin = 'anonymous';
          const recordInlineImage = () => {
              image.removeEventListener('load', recordInlineImage);
              try {
                  canvasService.width = image.naturalWidth;
                  canvasService.height = image.naturalHeight;
                  canvasCtx.drawImage(image, 0, 0);
                  attributes.rr_dataURL = canvasService.toDataURL(dataURLOptions.type, dataURLOptions.quality);
              }
              catch (err) {
                  console.warn(`Cannot inline img src=${image.currentSrc}! Error: ${err}`);
              }
              oldValue
                  ? (attributes.crossOrigin = oldValue)
                  : image.removeAttribute('crossorigin');
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
          if (!needBlock && !n.contentDocument) {
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
          type: NodeType$1.Element,
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
      if (slimDOMOptions.comment && sn.type === NodeType$1.Comment) {
          return true;
      }
      else if (sn.type === NodeType$1.Element) {
          if (slimDOMOptions.script &&
              (sn.tagName === 'script' ||
                  (sn.tagName === 'link' &&
                      (sn.attributes.rel === 'preload' ||
                          sn.attributes.rel === 'modulepreload') &&
                      sn.attributes.as === 'script') ||
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
              _serializedNode.type === NodeType$1.Text &&
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
      if (serializedNode.type === NodeType$1.Element) {
          recordChild = recordChild && !serializedNode.needBlock;
          delete serializedNode.needBlock;
          const shadowRoot = n.shadowRoot;
          if (shadowRoot && isNativeShadowDom(shadowRoot))
              serializedNode.isShadowHost = true;
      }
      if ((serializedNode.type === NodeType$1.Document ||
          serializedNode.type === NodeType$1.Element) &&
          recordChild) {
          if (slimDOMOptions.headWhitespace &&
              serializedNode.type === NodeType$1.Element &&
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
      if (serializedNode.type === NodeType$1.Element &&
          serializedNode.tagName === 'iframe') {
          onceIframeLoaded(n, () => {
              const iframeDoc = n.contentDocument;
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
      if (serializedNode.type === NodeType$1.Element &&
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

  function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
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
  const cachedImplementations = {};
  function getImplementation(name) {
      const cached = cachedImplementations[name];
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
      return (cachedImplementations[name] = impl.bind(window));
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
                          if (isSerializedIframe(currentN, this.mirror)) {
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
                          if (!target.contentDocument) {
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
      const { parentNode } = n;
      if (!parentNode) {
          return false;
      }
      const parentId = mirror.getId(parentNode);
      if (removes.some((r) => r.id === parentId)) {
          return true;
      }
      return _isParentRemoved(removes, parentNode, mirror);
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
  function getEventTarget(event) {
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
          const target = getEventTarget(evt);
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
              const target = getEventTarget(event);
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
          const target = getEventTarget(evt);
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
          let target = getEventTarget(event);
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
          const target = getEventTarget(event);
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

  function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
  class IframeManager {
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
          if (iframeEl.contentDocument &&
              iframeEl.contentDocument.adoptedStyleSheets &&
              iframeEl.contentDocument.adoptedStyleSheets.length > 0)
              this.stylesheetManager.adoptStyleSheets(iframeEl.contentDocument.adoptedStyleSheets, this.mirror.getId(iframeEl.contentDocument));
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
          if (node.type !== NodeType$1.Document && !node.rootId)
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
          if (!iframeElement.contentWindow || !iframeElement.contentDocument)
              return;
          this.patchAttachShadow(iframeElement.contentWindow.Element, iframeElement.contentDocument);
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
          this.loop = true;
          this.periodicallyClear();
      }
      periodicallyClear() {
          onRequestAnimationFrame(() => {
              this.clear();
              if (this.loop)
                  this.periodicallyClear();
          });
      }
      inOtherBuffer(node, thisBuffer) {
          const buffers = this.nodeMap.get(node);
          return (buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer));
      }
      add(node, buffer) {
          this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
      }
      clear() {
          this.nodeMap = new WeakMap();
      }
      destroy() {
          this.loop = false;
      }
  }

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
    fill(WINDOW, 'open', function (originalWindowOpen) {
      return function (...args) {
        if (handlers) {
          try {
            handlers.forEach(handler => handler());
          } catch (e) {
            // ignore errors in here
          }
        }

        return originalWindowOpen.apply(WINDOW, args);
      };
    });
  }

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
      this._scollTimeout = slowClickConfig.scrollTimeout / 1000;
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
      const hadScroll = click.scrollAfter && click.scrollAfter <= this._scollTimeout;
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
            url: WINDOW.location.href,
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
            url: WINDOW.location.href,
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

      this._checkClickTimeout = setTimeout$3(() => this._checkClicks(), 1000);
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
      if (source === IncrementalSource.Mutation) {
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
    return ((browserPerformanceTimeOrigin || WINDOW.performance.timeOrigin) + time) / 1000;
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

  /**
   * Add a CLS event to the replay based on a CLS metric.
   */
  function getCumulativeLayoutShift(metric) {
    const lastEntry = metric.entries[metric.entries.length - 1]

  ;
    const nodes = [];
    if (lastEntry && lastEntry.sources) {
      for (const source of lastEntry.sources) {
        if (source.node) {
          nodes.push(source.node);
        }
      }
    }
    return getWebVital(metric, 'cumulative-layout-shift', nodes);
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
  function getWebVital(metric, name, nodes) {
    const value = metric.value;
    const rating = metric.rating;

    const end = getAbsoluteTime(value);

    const data = {
      type: 'web-vital',
      name,
      start: end,
      end,
      data: {
        value,
        size: value,
        rating,
        nodeIds: nodes ? nodes.map(node => record.mirror.getId(node)) : undefined,
      },
    };

    return data;
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

  const r = `var t=Uint8Array,n=Uint16Array,r=Int32Array,e=new t([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new t([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new t([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=function(t,e){for(var i=new n(31),a=0;a<31;++a)i[a]=e+=1<<t[a-1];var s=new r(i[30]);for(a=1;a<30;++a)for(var o=i[a];o<i[a+1];++o)s[o]=o-i[a]<<5|a;return{b:i,r:s}},o=s(e,2),f=o.b,h=o.r;f[28]=258,h[258]=28;for(var l=s(i,0).r,u=new n(32768),c=0;c<32768;++c){var v=(43690&c)>>1|(21845&c)<<1;v=(61680&(v=(52428&v)>>2|(13107&v)<<2))>>4|(3855&v)<<4,u[c]=((65280&v)>>8|(255&v)<<8)>>1}var d=function(t,r,e){for(var i=t.length,a=0,s=new n(r);a<i;++a)t[a]&&++s[t[a]-1];var o,f=new n(r);for(a=1;a<r;++a)f[a]=f[a-1]+s[a-1]<<1;if(e){o=new n(1<<r);var h=15-r;for(a=0;a<i;++a)if(t[a])for(var l=a<<4|t[a],c=r-t[a],v=f[t[a]-1]++<<c,d=v|(1<<c)-1;v<=d;++v)o[u[v]>>h]=l}else for(o=new n(i),a=0;a<i;++a)t[a]&&(o[a]=u[f[t[a]-1]++]>>15-t[a]);return o},g=new t(288);for(c=0;c<144;++c)g[c]=8;for(c=144;c<256;++c)g[c]=9;for(c=256;c<280;++c)g[c]=7;for(c=280;c<288;++c)g[c]=8;var w=new t(32);for(c=0;c<32;++c)w[c]=5;var p=d(g,9,0),y=d(w,5,0),m=function(t){return(t+7)/8|0},b=function(n,r,e){return(null==r||r<0)&&(r=0),(null==e||e>n.length)&&(e=n.length),new t(n.subarray(r,e))},M=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],E=function(t,n,r){var e=new Error(n||M[t]);if(e.code=t,Error.captureStackTrace&&Error.captureStackTrace(e,E),!r)throw e;return e},z=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8},A=function(t,n,r){r<<=7&n;var e=n/8|0;t[e]|=r,t[e+1]|=r>>8,t[e+2]|=r>>16},_=function(r,e){for(var i=[],a=0;a<r.length;++a)r[a]&&i.push({s:a,f:r[a]});var s=i.length,o=i.slice();if(!s)return{t:F,l:0};if(1==s){var f=new t(i[0].s+1);return f[i[0].s]=1,{t:f,l:1}}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var h=i[0],l=i[1],u=0,c=1,v=2;for(i[0]={s:-1,f:h.f+l.f,l:h,r:l};c!=s-1;)h=i[i[u].f<i[v].f?u++:v++],l=i[u!=c&&i[u].f<i[v].f?u++:v++],i[c++]={s:-1,f:h.f+l.f,l:h,r:l};var d=o[0].s;for(a=1;a<s;++a)o[a].s>d&&(d=o[a].s);var g=new n(d+1),w=x(i[c-1],g,0);if(w>e){a=0;var p=0,y=w-e,m=1<<y;for(o.sort((function(t,n){return g[n.s]-g[t.s]||t.f-n.f}));a<s;++a){var b=o[a].s;if(!(g[b]>e))break;p+=m-(1<<w-g[b]),g[b]=e}for(p>>=y;p>0;){var M=o[a].s;g[M]<e?p-=1<<e-g[M]++-1:++a}for(;a>=0&&p;--a){var E=o[a].s;g[E]==e&&(--g[E],++p)}w=e}return{t:new t(g),l:w}},x=function(t,n,r){return-1==t.s?Math.max(x(t.l,n,r+1),x(t.r,n,r+1)):n[t.s]=r},D=function(t){for(var r=t.length;r&&!t[--r];);for(var e=new n(++r),i=0,a=t[0],s=1,o=function(t){e[i++]=t},f=1;f<=r;++f)if(t[f]==a&&f!=r)++s;else{if(!a&&s>2){for(;s>138;s-=138)o(32754);s>2&&(o(s>10?s-11<<5|28690:s-3<<5|12305),s=0)}else if(s>3){for(o(a),--s;s>6;s-=6)o(8304);s>2&&(o(s-3<<5|8208),s=0)}for(;s--;)o(a);s=1,a=t[f]}return{c:e.subarray(0,i),n:r}},T=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},k=function(t,n,r){var e=r.length,i=m(n+2);t[i]=255&e,t[i+1]=e>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var a=0;a<e;++a)t[i+a+4]=r[a];return 8*(i+4+e)},C=function(t,r,s,o,f,h,l,u,c,v,m){z(r,m++,s),++f[256];for(var b=_(f,15),M=b.t,E=b.l,x=_(h,15),C=x.t,U=x.l,F=D(M),I=F.c,S=F.n,L=D(C),O=L.c,j=L.n,q=new n(19),B=0;B<I.length;++B)++q[31&I[B]];for(B=0;B<O.length;++B)++q[31&O[B]];for(var G=_(q,7),H=G.t,J=G.l,K=19;K>4&&!H[a[K-1]];--K);var N,P,Q,R,V=v+5<<3,W=T(f,g)+T(h,w)+l,X=T(f,M)+T(h,C)+l+14+3*K+T(q,H)+2*q[16]+3*q[17]+7*q[18];if(c>=0&&V<=W&&V<=X)return k(r,m,t.subarray(c,c+v));if(z(r,m,1+(X<W)),m+=2,X<W){N=d(M,E,0),P=M,Q=d(C,U,0),R=C;var Y=d(H,J,0);z(r,m,S-257),z(r,m+5,j-1),z(r,m+10,K-4),m+=14;for(B=0;B<K;++B)z(r,m+3*B,H[a[B]]);m+=3*K;for(var Z=[I,O],$=0;$<2;++$){var tt=Z[$];for(B=0;B<tt.length;++B){var nt=31&tt[B];z(r,m,Y[nt]),m+=H[nt],nt>15&&(z(r,m,tt[B]>>5&127),m+=tt[B]>>12)}}}else N=p,P=g,Q=y,R=w;for(B=0;B<u;++B){var rt=o[B];if(rt>255){A(r,m,N[(nt=rt>>18&31)+257]),m+=P[nt+257],nt>7&&(z(r,m,rt>>23&31),m+=e[nt]);var et=31&rt;A(r,m,Q[et]),m+=R[et],et>3&&(A(r,m,rt>>5&8191),m+=i[et])}else A(r,m,N[rt]),m+=P[rt]}return A(r,m,N[256]),m+P[256]},U=new r([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),F=new t(0),I=function(){for(var t=new Int32Array(256),n=0;n<256;++n){for(var r=n,e=9;--e;)r=(1&r&&-306674912)^r>>>1;t[n]=r}return t}(),S=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=I[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},L=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,a=0|r.length,s=0;s!=a;){for(var o=Math.min(s+2655,a);s<o;++s)i+=e+=r[s];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|(65280&t)<<8|(255&(n%=65521))<<8|n>>8}}},O=function(a,s,o,f,u){if(!u&&(u={l:1},s.dictionary)){var c=s.dictionary.subarray(-32768),v=new t(c.length+a.length);v.set(c),v.set(a,c.length),a=v,u.w=c.length}return function(a,s,o,f,u,c){var v=c.z||a.length,d=new t(f+v+5*(1+Math.ceil(v/7e3))+u),g=d.subarray(f,d.length-u),w=c.l,p=7&(c.r||0);if(s){p&&(g[0]=c.r>>3);for(var y=U[s-1],M=y>>13,E=8191&y,z=(1<<o)-1,A=c.p||new n(32768),_=c.h||new n(z+1),x=Math.ceil(o/3),D=2*x,T=function(t){return(a[t]^a[t+1]<<x^a[t+2]<<D)&z},F=new r(25e3),I=new n(288),S=new n(32),L=0,O=0,j=c.i||0,q=0,B=c.w||0,G=0;j+2<v;++j){var H=T(j),J=32767&j,K=_[H];if(A[J]=K,_[H]=J,B<=j){var N=v-j;if((L>7e3||q>24576)&&(N>423||!w)){p=C(a,g,0,F,I,S,O,q,G,j-G,p),q=L=O=0,G=j;for(var P=0;P<286;++P)I[P]=0;for(P=0;P<30;++P)S[P]=0}var Q=2,R=0,V=E,W=J-K&32767;if(N>2&&H==T(j-W))for(var X=Math.min(M,N)-1,Y=Math.min(32767,j),Z=Math.min(258,N);W<=Y&&--V&&J!=K;){if(a[j+Q]==a[j+Q-W]){for(var $=0;$<Z&&a[j+$]==a[j+$-W];++$);if($>Q){if(Q=$,R=W,$>X)break;var tt=Math.min(W,$-2),nt=0;for(P=0;P<tt;++P){var rt=j-W+P&32767,et=rt-A[rt]&32767;et>nt&&(nt=et,K=rt)}}}W+=(J=K)-(K=A[J])&32767}if(R){F[q++]=268435456|h[Q]<<18|l[R];var it=31&h[Q],at=31&l[R];O+=e[it]+i[at],++I[257+it],++S[at],B=j+Q,++L}else F[q++]=a[j],++I[a[j]]}}for(j=Math.max(j,B);j<v;++j)F[q++]=a[j],++I[a[j]];p=C(a,g,w,F,I,S,O,q,G,j-G,p),w||(c.r=7&p|g[p/8|0]<<3,p-=7,c.h=_,c.p=A,c.i=j,c.w=B)}else{for(j=c.w||0;j<v+w;j+=65535){var st=j+65535;st>=v&&(g[p/8|0]=w,st=v),p=k(g,p+1,a.subarray(j,st))}c.i=v}return b(d,0,f+m(p)+u)}(a,null==s.level?6:s.level,null==s.mem?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(a.length)))):12+s.mem,o,f,u)},j=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},q=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&j(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},B=function(t){return 10+(t.filename?t.filename.length+1:0)},G=function(){function n(n,r){if("function"==typeof n&&(r=n,n={}),this.ondata=r,this.o=n||{},this.s={l:0,i:32768,w:32768,z:32768},this.b=new t(98304),this.o.dictionary){var e=this.o.dictionary.subarray(-32768);this.b.set(e,32768-e.length),this.s.i=32768-e.length}}return n.prototype.p=function(t,n){this.ondata(O(t,this.o,0,0,this.s),n)},n.prototype.push=function(n,r){this.ondata||E(5),this.s.l&&E(4);var e=n.length+this.s.z;if(e>this.b.length){if(e>2*this.b.length-32768){var i=new t(-32768&e);i.set(this.b.subarray(0,this.s.z)),this.b=i}var a=this.b.length-this.s.z;a&&(this.b.set(n.subarray(0,a),this.s.z),this.s.z=this.b.length,this.p(this.b,!1)),this.b.set(this.b.subarray(-32768)),this.b.set(n.subarray(a),32768),this.s.z=n.length-a+32768,this.s.i=32766,this.s.w=32768}else this.b.set(n,this.s.z),this.s.z+=n.length;this.s.l=1&r,(this.s.z>this.s.w+8191||r)&&(this.p(this.b,r||!1),this.s.w=this.s.i,this.s.i-=2)},n}();var H=function(){function t(t,n){this.c=L(),this.v=1,G.call(this,t,n)}return t.prototype.push=function(t,n){this.c.p(t),G.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){var r=O(t,this.o,this.v&&(this.o.dictionary?6:2),n&&4,this.s);this.v&&(function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;if(t[0]=120,t[1]=e<<6|(n.dictionary&&32),t[1]|=31-(t[0]<<8|t[1])%31,n.dictionary){var i=L();i.p(n.dictionary),j(t,2,i.d())}}(r,this.o),this.v=0),n&&j(r,r.length-4,this.c.d()),this.ondata(r,n)},t}(),J="undefined"!=typeof TextEncoder&&new TextEncoder,K="undefined"!=typeof TextDecoder&&new TextDecoder;try{K.decode(F,{stream:!0})}catch(t){}var N=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){this.ondata||E(5),this.d&&E(4),this.ondata(P(t),this.d=n||!1)},t}();function P(n,r){if(r){for(var e=new t(n.length),i=0;i<n.length;++i)e[i]=n.charCodeAt(i);return e}if(J)return J.encode(n);var a=n.length,s=new t(n.length+(n.length>>1)),o=0,f=function(t){s[o++]=t};for(i=0;i<a;++i){if(o+5>s.length){var h=new t(o+8+(a-i<<1));h.set(s),s=h}var l=n.charCodeAt(i);l<128||r?f(l):l<2048?(f(192|l>>6),f(128|63&l)):l>55295&&l<57344?(f(240|(l=65536+(1047552&l)|1023&n.charCodeAt(++i))>>18),f(128|l>>12&63),f(128|l>>6&63),f(128|63&l)):(f(224|l>>12),f(128|l>>6&63),f(128|63&l))}return b(s,0,o)}function Q(t){return function(t,n){n||(n={});var r=S(),e=t.length;r.p(t);var i=O(t,n,B(n),8),a=i.length;return q(i,n),j(i,a-8,r.d()),j(i,a-4,e),i}(P(t))}const R=new class{constructor(){this._init()}clear(){this._init()}addEvent(t){if(!t)throw new Error("Adding invalid event");const n=this._hasEvents?",":"";this.stream.push(n+t),this._hasEvents=!0}finish(){this.stream.push("]",!0);const t=function(t){let n=0;for(const r of t)n+=r.length;const r=new Uint8Array(n);for(let n=0,e=0,i=t.length;n<i;n++){const i=t[n];r.set(i,e),e+=i.length}return r}(this._deflatedData);return this._init(),t}_init(){this._hasEvents=!1,this._deflatedData=[],this.deflate=new H,this.deflate.ondata=(t,n)=>{this._deflatedData.push(t)},this.stream=new N(((t,n)=>{this.deflate.push(t,n)})),this.stream.push("[")}},V={clear:()=>{R.clear()},addEvent:t=>R.addEvent(t),finish:()=>R.finish(),compress:t=>Q(t)};addEventListener("message",(function(t){const n=t.data.method,r=t.data.id,e=t.data.arg;if(n in V&&"function"==typeof V[n])try{const t=V[n](e);postMessage({id:r,method:n,success:!0,response:t})}catch(t){postMessage({id:r,method:n,success:!1,response:t.message}),console.error(t)}})),postMessage({id:void 0,method:"init",success:!0,response:void 0});`;

  function e(){const e=new Blob([r]);return URL.createObjectURL(e)}

  /**
   * Log a message in debug mode, and add a breadcrumb when _experiment.traceInternals is enabled.
   */
  function logInfo(message, shouldAddBreadcrumb) {

    logger.info(message);

    if (shouldAddBreadcrumb) {
      addLogBreadcrumb(message);
    }
  }

  /**
   * Log a message, and add a breadcrumb in the next tick.
   * This is necessary when the breadcrumb may be added before the replay is initialized.
   */
  function logInfoNextTick(message, shouldAddBreadcrumb) {

    logger.info(message);

    if (shouldAddBreadcrumb) {
      // Wait a tick here to avoid race conditions for some initial logs
      // which may be added before replay is initialized
      setTimeout$3(() => {
        addLogBreadcrumb(message);
      }, 0);
    }
  }

  function addLogBreadcrumb(message) {
    addBreadcrumb(
      {
        category: 'console',
        data: {
          logger: 'replay',
        },
        level: 'info',
        message,
      },
      { level: 'info' },
    );
  }

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

     constructor() {
      this.events = [];
      this._totalSize = 0;
      this.hasCheckout = false;
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
     * This will either resolve when the worker is ready, or reject if an error occured.
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
      logInfo('[Replay] Destroying compression worker');
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
            logger.error('[Replay]', response.response);

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

     constructor(worker) {
      this._worker = new WorkerHandler(worker);
      this._earliestTimestamp = null;
      this._totalSize = 0;
      this.hasCheckout = false;
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
     * This will either resolve when the worker is ready, or reject if an error occured.
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
     * Returns true if event was successfuly received and processed by worker.
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
        logger.warn('[Replay] Sending "clear" message to worker failed', e);
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
        logInfo('[Replay] Failed to load the compression worker, falling back to simple buffer');
        return;
      }

      // Now we need to switch over the array buffer to the compression worker
      await this._switchToCompressionWorker();
    }

    /** Switch the used buffer to the compression worker. */
     async _switchToCompressionWorker() {
      const { events, hasCheckout } = this._fallback;

      const addEventPromises = [];
      for (const event of events) {
        addEventPromises.push(this._compression.addEvent(event));
      }

      this._compression.hasCheckout = hasCheckout;

      // We switch over to the new buffer immediately - any further events will be added
      // after the previously buffered ones
      this._used = this._compression;

      // Wait for original events to be re-added before resolving
      try {
        await Promise.all(addEventPromises);
      } catch (error) {
        logger.warn('[Replay] Failed to add events when switching buffers.', error);
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

    logInfo('[Replay] Using simple buffer');
    return new EventBufferArray();
  }

  function _loadWorker(customWorkerUrl) {
    try {
      const workerUrl = customWorkerUrl || _getWorkerUrl();

      if (!workerUrl) {
        return;
      }

      logInfo(`[Replay] Using compression worker${customWorkerUrl ? ` from ${customWorkerUrl}` : ''}`);
      const worker = new Worker(workerUrl);
      return new EventBufferProxy(worker);
    } catch (error) {
      logInfo('[Replay] Failed to create compression worker');
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
      return 'sessionStorage' in WINDOW && !!WINDOW.sessionStorage;
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
      WINDOW.sessionStorage.removeItem(REPLAY_SESSION_KEY);
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
      WINDOW.sessionStorage.setItem(REPLAY_SESSION_KEY, JSON.stringify(session));
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
  function fetchSession(traceInternals) {
    if (!hasSessionStorage()) {
      return null;
    }

    try {
      // This can throw if cookies are disabled
      const sessionStringFromStorage = WINDOW.sessionStorage.getItem(REPLAY_SESSION_KEY);

      if (!sessionStringFromStorage) {
        return null;
      }

      const sessionObj = JSON.parse(sessionStringFromStorage) ;

      logInfoNextTick('[Replay] Loading existing session', traceInternals);

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
      traceInternals,
      sessionIdleExpire,
      maxReplayDuration,
      previousSessionId,
    }

  ,
    sessionOptions,
  ) {
    const existingSession = sessionOptions.stickySession && fetchSession(traceInternals);

    // No session exists yet, just create a new one
    if (!existingSession) {
      logInfoNextTick('[Replay] Creating new session', traceInternals);
      return createSession(sessionOptions, { previousSessionId });
    }

    if (!shouldRefreshSession(existingSession, { sessionIdleExpire, maxReplayDuration })) {
      return existingSession;
    }

    logInfoNextTick('[Replay] Session in sessionStorage is expired, creating new one...');
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
    if (!replay.eventBuffer) {
      return null;
    }

    try {
      if (isCheckout && replay.recordingMode === 'buffer') {
        replay.eventBuffer.clear();
      }

      if (isCheckout) {
        replay.eventBuffer.hasCheckout = true;
      }

      const replayOptions = replay.getOptions();

      const eventAfterPossibleCallback = maybeApplyCallback(event, replayOptions.beforeAddRecordingEvent);

      if (!eventAfterPossibleCallback) {
        return;
      }

      return await replay.eventBuffer.addEvent(eventAfterPossibleCallback);
    } catch (error) {
      const reason = error && error instanceof EventBufferSizeExceededError ? 'addEventSizeExceeded' : 'addEvent';
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
      logInfoNextTick(
        `[Replay] Skipping event with timestamp ${timestampInMs} because it is after maxReplayDuration`,
        replay.getOptions()._experiments.traceInternals,
      );
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
      logger.error('[Replay] An error occured in the `beforeAddRecordingEvent` callback, skipping the event...', error);
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

    setTimeout$3(() => {
      // Capture current event buffer as new replay
      // This should never reject
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      replay.sendBufferedReplayOrFlush();
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
   * When an event is captured by `hanldleGlobalEvent`, when in buffer mode
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
        // Do nothing if replay has been disabled
        if (!replay.isEnabled()) {
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
          logger.log('[Replay] Ignoring error from rrweb internals', event);
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
    } catch (e2) {
      logger.warn('[Replay] Failed to serialize body', body);
      return [undefined, 'BODY_PARSE_ERROR'];
    }

    logger.info('[Replay] Skipping network body because of body type', body);

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
      } catch (e3) {
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
  function getFullUrl(url, baseURI = WINDOW.document.baseURI) {
    // Short circuit for common cases:
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith(WINDOW.location.origin)) {
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
   * This adds additional data (where approriate).
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
      logger.error('[Replay] Failed to capture fetch breadcrumb', error);
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
      logger.warn('[Replay] Failed to serialize response body', error);
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
      logger.warn('[Replay] Failed to get text body from response', error);
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
      logger.warn('[Replay] Failed to clone response body', error);
    }
  }

  /**
   * Get the response body of a fetch request, or timeout after 500ms.
   * Fetch can return a streaming body, that may not resolve (or not for a long time).
   * If that happens, we rather abort after a short time than keep waiting for this.
   */
  function _tryGetResponseText(response) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout$3(() => reject(new Error('Timeout while trying to read response body')), 500);

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
   * This adds additional data (where approriate).
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
      logger.error('[Replay] Failed to capture xhr breadcrumb', error);
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

    logger.warn('[Replay] Failed to get xhr response body', ...errors);

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
    } catch (e2) {
      logger.warn('[Replay] Failed to serialize body', body);
      return [undefined, 'BODY_PARSE_ERROR'];
    }

    logger.info('[Replay] Skipping network body because of body type', body);

    return [undefined, 'UNPARSEABLE_BODY_TYPE'];
  }

  function _getBodySize(
    body,
    responseType,
  ) {
    try {
      const bodyStr = responseType === 'json' && body && typeof body === 'object' ? JSON.stringify(body) : body;
      return getBodySize(bodyStr);
    } catch (e3) {
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
      logger.warn('Error when enriching network breadcrumb');
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
          createMemoryEntry(WINDOW.performance.memory),
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
      timerId = setTimeout$3(invokeFunc, wait);

      if (maxWait && maxTimerId === undefined) {
        maxTimerId = setTimeout$3(invokeFunc, maxWait);
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
        logger.warn('[Replay] Received replay event after session expired.');

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

        // Additionally, create a meta event that will capture certain SDK settings.
        // In order to handle buffer mode, this needs to either be done when we
        // receive checkout events or at flush time.
        //
        // `isCheckout` is always true, but want to be explicit that it should
        // only be added for checkouts
        addSettingsEvent(replay, isCheckout);

        // If there is a previousSessionId after a full snapshot occurs, then
        // the replay session was started due to session expiration. The new session
        // is started before triggering a new checkout and contains the id
        // of the previous session. Do not immediately flush in this case
        // to avoid capturing only the checkout and instead the replay will
        // be captured if they perform any follow-up actions.
        if (replay.session && replay.session.previousSessionId) {
          return true;
        }

        // When in buffer mode, make sure we adjust the session started date to the current earliest event of the buffer
        // this should usually be the timestamp of the checkout event, but to be safe...
        if (replay.recordingMode === 'buffer' && replay.session && replay.eventBuffer) {
          const earliestEvent = replay.eventBuffer.getEarliestTimestamp();
          if (earliestEvent) {
            logInfo(
              `[Replay] Updating session start time to earliest event in buffer to ${new Date(earliestEvent)}`,
              replay.getOptions()._experiments.traceInternals,
            );

            replay.session.started = earliestEvent;

            if (replay.getOptions().stickySession) {
              saveSession(replay.session);
            }
          }
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
      logInfo('An event processor returned `null`, will not send event.');
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
    const { recordingData, options } = replayData;

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

      if (options._experiments && options._experiments.captureExceptions) {
        captureException(err);
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
     * Recording can happen in one of three modes:
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
      logger.error('[Replay]', error);

      if (this._options._experiments && this._options._experiments.captureExceptions) {
        captureException(error);
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
        this.handleException(new Error('Unable to initialize and create session'));
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

      logInfoNextTick(
        `[Replay] Starting replay in ${this.recordingMode} mode`,
        this._options._experiments.traceInternals,
      );

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
        logger.info('[Replay] Recording is already in progress');
        return;
      }

      if (this._isEnabled && this.recordingMode === 'buffer') {
        logger.info('[Replay] Buffering is in progress, call `flush()` to save the replay');
        return;
      }

      logInfoNextTick('[Replay] Starting replay in session mode', this._options._experiments.traceInternals);

      // Required as user activity is initially set in
      // constructor, so if `start()` is called after
      // session idle expiration, a replay will not be
      // created due to an idle timeout.
      this._updateUserActivity();

      const session = loadOrCreateSession(
        {
          maxReplayDuration: this._options.maxReplayDuration,
          sessionIdleExpire: this.timeouts.sessionIdleExpire,
          traceInternals: this._options._experiments.traceInternals,
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
        logger.info('[Replay] Buffering is in progress, call `flush()` to save the replay');
        return;
      }

      logInfoNextTick('[Replay] Starting replay in buffer mode', this._options._experiments.traceInternals);

      const session = loadOrCreateSession(
        {
          sessionIdleExpire: this.timeouts.sessionIdleExpire,
          maxReplayDuration: this._options.maxReplayDuration,
          traceInternals: this._options._experiments.traceInternals,
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
          ...(this.recordingMode === 'buffer' && { checkoutEveryNms: BUFFER_CHECKOUT_TIME }),
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
        logInfo(
          `[Replay] Stopping Replay${reason ? ` triggered by ${reason}` : ''}`,
          this._options._experiments.traceInternals,
        );

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

      logInfo('[Replay] Pausing replay', this._options._experiments.traceInternals);
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

      logInfo('[Replay] Resuming replay', this._options._experiments.traceInternals);
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

      logInfo('[Replay] Converting buffer to session', this._options._experiments.traceInternals);

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
     * cases of mulitple flushes happening closely together.
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

    /** Get the current sesion (=replay) ID */
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
      const urlPath = `${WINDOW.location.pathname}${WINDOW.location.hash}${WINDOW.location.search}`;
      const url = `${WINDOW.location.origin}${urlPath}`;

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
          traceInternals: this._options._experiments.traceInternals,
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
        WINDOW.document.addEventListener('visibilitychange', this._handleVisibilityChange);
        WINDOW.addEventListener('blur', this._handleWindowBlur);
        WINDOW.addEventListener('focus', this._handleWindowFocus);
        WINDOW.addEventListener('keydown', this._handleKeyboardEvent);

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
        WINDOW.document.removeEventListener('visibilitychange', this._handleVisibilityChange);

        WINDOW.removeEventListener('blur', this._handleWindowBlur);
        WINDOW.removeEventListener('focus', this._handleWindowFocus);
        WINDOW.removeEventListener('keydown', this._handleKeyboardEvent);

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
      if (WINDOW.document.visibilityState === 'visible') {
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
        logInfo('[Replay] Document has become active, but session has expired');
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
      const performanceEntries = createPerformanceEntries(this.performanceEntries).concat(this.replayPerformanceEntries);

      this.performanceEntries = [];
      this.replayPerformanceEntries = [];

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
        logger.error('[Replay] No session or eventBuffer found to flush.');
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
        // We leave 30s wiggle room to accomodate late flushing etc.
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
          options: this.getOptions(),
          timestamp,
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
          client.recordDroppedEvent('send_error', 'replay');
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
        logger.error('[Replay] Attempting to finish replay event after session expired.');
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
        logInfo(
          `[Replay] Session duration (${Math.floor(duration / 1000)}s) is too ${
          tooShort ? 'short' : 'long'
        }, not sending replay.`,
          this._options._experiments.traceInternals,
        );

        if (tooShort) {
          this._debouncedFlush();
        }
        return;
      }

      const eventBuffer = this.eventBuffer;
      if (eventBuffer && this.session.segmentId === 0 && !eventBuffer.hasCheckout) {
        logInfo('[Replay] Flushing initial segment without checkout.', this._options._experiments.traceInternals);
        // TODO FN: Evaluate if we want to stop here, or remove this again?
      }

      // this._flushLock acts as a lock so that future calls to `_flush()`
      // will be blocked until this promise resolves
      if (!this._flushLock) {
        this._flushLock = this._runFlush();
        await this._flushLock;
        this._flushLock = undefined;
        return;
      }

      // Wait for previous flush to finish, then call the debounced `_flush()`.
      // It's possible there are other flush requests queued and waiting for it
      // to resolve. We want to reduce all outstanding requests (as well as any
      // new flush requests that occur within a second of the locked flush
      // completing) into a single flush.

      try {
        await this._flushLock;
      } catch (err) {
        logger.error(err);
      } finally {
        this._debouncedFlush();
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
    const defaultBlockedElements = ['base[href="/"]'];

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

    // unmaskTextSelector takes precendence
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
  }Replay.__initStatic();

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

  registerSpanErrorInstrumentation();

  exports.BrowserClient = BrowserClient;
  exports.SDK_VERSION = SDK_VERSION;
  exports.SEMANTIC_ATTRIBUTE_SENTRY_OP = SEMANTIC_ATTRIBUTE_SENTRY_OP;
  exports.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN = SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN;
  exports.SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE = SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE;
  exports.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE = SEMANTIC_ATTRIBUTE_SENTRY_SOURCE;
  exports.Scope = Scope;
  exports.WINDOW = WINDOW$3;
  exports.addBreadcrumb = addBreadcrumb;
  exports.addEventProcessor = addEventProcessor;
  exports.addIntegration = addIntegration;
  exports.breadcrumbsIntegration = breadcrumbsIntegration;
  exports.browserApiErrorsIntegration = browserApiErrorsIntegration;
  exports.browserTracingIntegration = browserTracingIntegration;
  exports.captureEvent = captureEvent;
  exports.captureException = captureException;
  exports.captureFeedback = captureFeedback;
  exports.captureMessage = captureMessage;
  exports.captureSession = captureSession;
  exports.captureUserFeedback = captureUserFeedback;
  exports.chromeStackLineParser = chromeStackLineParser;
  exports.close = close;
  exports.continueTrace = continueTrace;
  exports.createTransport = createTransport;
  exports.createUserFeedbackEnvelope = createUserFeedbackEnvelope;
  exports.dedupeIntegration = dedupeIntegration;
  exports.defaultStackLineParsers = defaultStackLineParsers;
  exports.defaultStackParser = defaultStackParser;
  exports.endSession = endSession;
  exports.eventFromException = eventFromException;
  exports.eventFromMessage = eventFromMessage;
  exports.exceptionFromError = exceptionFromError;
  exports.feedbackAsyncIntegration = feedbackAsyncIntegration;
  exports.feedbackIntegration = feedbackAsyncIntegration;
  exports.flush = flush;
  exports.forceLoad = forceLoad;
  exports.functionToStringIntegration = functionToStringIntegration;
  exports.geckoStackLineParser = geckoStackLineParser;
  exports.getActiveSpan = getActiveSpan;
  exports.getClient = getClient;
  exports.getCurrentHub = getCurrentHub;
  exports.getCurrentScope = getCurrentScope;
  exports.getDefaultIntegrations = getDefaultIntegrations;
  exports.getFeedback = getFeedback;
  exports.getGlobalScope = getGlobalScope;
  exports.getIsolationScope = getIsolationScope;
  exports.getRootSpan = getRootSpan;
  exports.getSpanDescendants = getSpanDescendants;
  exports.globalHandlersIntegration = globalHandlersIntegration;
  exports.httpContextIntegration = httpContextIntegration;
  exports.inboundFiltersIntegration = inboundFiltersIntegration;
  exports.init = init;
  exports.isInitialized = isInitialized;
  exports.lastEventId = lastEventId;
  exports.lazyLoadIntegration = lazyLoadIntegration;
  exports.linkedErrorsIntegration = linkedErrorsIntegration;
  exports.makeFetchTransport = makeFetchTransport;
  exports.metrics = metrics;
  exports.onLoad = onLoad;
  exports.opera10StackLineParser = opera10StackLineParser;
  exports.opera11StackLineParser = opera11StackLineParser;
  exports.parameterize = parameterize;
  exports.replayIntegration = replayIntegration;
  exports.setContext = setContext;
  exports.setCurrentClient = setCurrentClient;
  exports.setExtra = setExtra;
  exports.setExtras = setExtras;
  exports.setMeasurement = setMeasurement;
  exports.setTag = setTag;
  exports.setTags = setTags;
  exports.setUser = setUser;
  exports.showReportDialog = showReportDialog;
  exports.spanToBaggageHeader = spanToBaggageHeader;
  exports.spanToJSON = spanToJSON;
  exports.spanToTraceHeader = spanToTraceHeader;
  exports.startBrowserTracingNavigationSpan = startBrowserTracingNavigationSpan;
  exports.startBrowserTracingPageLoadSpan = startBrowserTracingPageLoadSpan;
  exports.startInactiveSpan = startInactiveSpan;
  exports.startNewTrace = startNewTrace;
  exports.startSession = startSession;
  exports.startSpan = startSpan;
  exports.startSpanManual = startSpanManual;
  exports.winjsStackLineParser = winjsStackLineParser;
  exports.withActiveSpan = withActiveSpan;
  exports.withIsolationScope = withIsolationScope;
  exports.withScope = withScope;

  return exports;

})({});
//# sourceMappingURL=bundle.tracing.replay.feedback.js.map
