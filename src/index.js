'use strict';

/*
 * Add note that DOM methods cannot be invoked on a proxy.

 * - Document element (https://html.spec.whatwg.org/multipage/dom.html#dom-document-namedItem-which)
 *   - Works with named
 		exposed embed (document.embeds, document.plugins),
 		form (document.forms),
 		iframe,
 		img (document.images),
 		and exposed object
 *   - Works with exposed object that have an ID
 *   - Works with an image that has an ID
 *   - Works with a form, exposed object and image that share the same ID (except form that has the `name` field set, because they are retrieved in a specific order)
 *   - Works with 2 forms sharing the same name (should return an HTMLCollection)
 * - DOMStringMap (https://html.spec.whatwg.org/multipage/dom.html#domstringmap)
 *  - Not as bad, overides inheritable builtins such as constructor. Has no instance built-ins
 */

// OverrideBuiltins is set on HTMLFormElements and a form's input gets added as a one of its properties.
// As a result, having an input named "action", "method" or even "className" will cause that property to return the input.
// https://twitter.com/EphysPotato/status/897812957979172865
// This is a workaround that lets you bypass that behavior.

function makePlaceholder() {
  const placeholder = document.createElement('div');
  placeholder.style.display = 'none';

  return placeholder;
}

const placeholder = makePlaceholder();

function isOverridden(form, property) {
  if (!Object.prototype.hasOwnProperty.call(form.elements, property)) {
    return false;
  }

  const propertyValue = form[property];
  const elements = form.elements;

  // funnily enough, in HTMLFormControlsCollection, built-ins take over.
  // Meaning that doing form.elements[property] not future proof and could break if
  // a property gets added to a parent class. Instead `namedItem` must be used.
  // Also means we need to use `item` because `namedItem` doesn't work with array indices.
  return propertyValue === elements.namedItem(property) || propertyValue === elements.item(property);
}

const getFormProperty = sanitizeFormMethod((form, property) => {
  return form[property];
});

const setFormProperty = sanitizeFormMethod((form, property, value) => {
  form[property] = value;
});

const hasFormProperty = sanitizeFormMethod((form, property) => {
  return property in form;
});

const getFormOwnPropertyDescriptor = sanitizeFormMethod((form, property) => {
  return Object.getOwnPropertyDescriptor(form, property);
});

const defineFormProperty = sanitizeFormMethod((form, property, value) => {
  return Object.defineProperty(form, property, value);
});

const deleteFormProperty = sanitizeFormMethod((form, property) => {
  delete form[property];
});

const hasOwnKey = sanitizeFormMethod((form, property) => {
  return Object.prototype.hasOwnProperty.call(form, property);
});

function getFormOwnKeys(form) {
  // use sanitizeIndices to remove all inputs in one go then get own keys
  return sanitizeIndices(form, 0, void 0, _getFormOwnKeysCallback);
}

function _getFormOwnKeysCallback(form) {
  return Reflect.ownKeys(form);
}

/**
 * Deoptimised version of sanitizedMethod that removes ALL inputs before calling the callback.
 * This is needed because removing one input merely shifts the indexes of the other inputs
 */
function sanitizeIndices(form, property, thirdArg, callback) {
  const placeholders = [];
  const evilInputs = [];

  // small optimisation: We only need to remove the input
  // and those that will be shifted in its place
  // (e.g. `form[4]` in a form with 5 inputs only removes one)
  const requestedIndex = Number(property);

  while (form.elements.length > requestedIndex) {
    const evilInput = form.elements[requestedIndex];
    const placeholder = makePlaceholder();

    evilInputs.push(evilInput);
    placeholders.push(placeholder);

    evilInput.replaceWith(placeholder);
  }

  const result = callback(form, property, thirdArg);

  for (let i = 0; i < evilInputs.length; i++) {
    const evilInput = evilInputs[i];
    const placeholder = placeholders[i];

    placeholder.replaceWith(evilInput);
  }

  return result;
}

/**
 * Version of sanitizedMethod that removes all inputs of a collection (we get collections when names collide).
 */
function sanitizeCollection(form, property, thirdArg, callback) {
  const evilInputsLive = form[property];
  const evilInputsInert = [];
  const placeholders = [];

  for (let i = evilInputsLive.length - 1; i >= 0; i--) {
    const evilInput = evilInputsLive[i];
    const placeholder = makePlaceholder();

    placeholders.push(placeholder);
    evilInputsInert.push(evilInput);

    evilInput.replaceWith(placeholder);
  }

  const result = callback(form, property, thirdArg);

  for (let i = evilInputsInert.length - 1; i >= 0; i--) {
    placeholders[i].replaceWith(evilInputsInert[i]);
  }

  return result;
}

function isIndiceProperty(property) {
  return /^\d+$/.test(property);
}

function sanitizeFormMethod(callback) {
  return function sanitizedMethod(form, property, thirdArg) {
    if (!isOverridden(form, property)) {
      return callback(form, property, thirdArg);
    }

    // getting numeric property (form[0])
    if (isIndiceProperty(property)) {
      // delegate to a less optimised version that removes all inputs.
      return sanitizeIndices(form, property, thirdArg, callback);
    }

    const evilInput = form[property];

    // When two inputs have the same name
    if (isHtmlCollection(evilInput)) {
      // delegate to a less optimised version that removes all inputs from the collection.
      return sanitizeCollection(form, property, thirdArg, callback);
    }

    evilInput.replaceWith(placeholder);
    const result = callback(form, property, thirdArg);
    placeholder.replaceWith(evilInput);

    return result;
  };
}

function isHtmlCollection(item) {
  return typeof item.length === 'number' && item.constructor.name === 'RadioNodeList';
}

const proxyHandler = {
  get: getFormProperty,
  set: setFormProperty,
  has: hasFormProperty,
  getOwnPropertyDescriptor: getFormOwnPropertyDescriptor,
  defineProperty: defineFormProperty,
  deleteProperty: deleteFormProperty,
  ownKeys: getFormOwnKeys,
};

// usage:
// unsafeForm.method => <input />
// safeForm = sanitizeForm(unsafeForm)
// safeForm.method => 'http://google.com'
function sanitizeForm(form) {
  return new Proxy(form, proxyHandler);
}

export {
  getFormProperty,
  setFormProperty,
  hasFormProperty,
  getFormOwnPropertyDescriptor,
  defineFormProperty,
  deleteFormProperty,
  sanitizeForm,
  getFormOwnKeys,
};
