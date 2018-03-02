import { freePlaceholder, getPlaceholder } from './placeholders';
import { hasOwnProperty, isFormElementsCollection, isHtmlImage, isRadioNodeList, makeMethodSanitizer } from './common';
import { defineProperty, getOwnPropertyDescriptor, getProperty, hasProperty, setProperty, deleteProperty } from './generic-operations';

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

  const formElements = getFormProperty(form, 'elements');

  while (formElements.length > requestedIndex) {
    const evilInput = formElements[requestedIndex];
    const placeholder = getPlaceholder();

    evilInputs.push(evilInput);
    placeholders.push(placeholder);

    evilInput.replaceWith(placeholder);
  }

  const result = callback(form, property, thirdArg);

  for (let i = 0; i < evilInputs.length; i++) {
    const evilInput = evilInputs[i];
    const placeholder = placeholders[i];

    placeholder.replaceWith(evilInput);
    freePlaceholder(placeholder);
  }

  return result;
}

function isOverridden(form, property) {

  // Special-case: protect vital property
  if (property === 'elements') {
    return !isFormElementsCollection(form.elements);
  }

  const formElements = getFormProperty(form, 'elements');
  if (!hasOwnProperty(formElements, property)) {

    // images aren't marked as own properties:
    const value = form[property];
    if (isFormOwnedImage(form, property, value)) {
      return true;
    }

    if (isFormOwnedImageCollection(form, property, value)) {
      return true;
    }

    return false;
  }

  const propertyValue = form[property];

  // funnily enough, in HTMLFormControlsCollection, built-ins take over.
  // Meaning that doing form.elements[property] not future proof and could break if
  // a property gets added to a parent class. Instead `namedItem` must be used.
  // Also means we need to use `item` because `namedItem` doesn't work with array indices.
  return propertyValue === formElements.namedItem(property) || propertyValue === formElements.item(property);
}

function isFormOwnedImageCollection(form, key, nodeList) {
  if (!isRadioNodeList(nodeList)) {
    return false;
  }

  for (let i = 0; i < nodeList.length; i++) {
    if (!isFormOwnedImage(form, key, nodeList.item(i))) {
      return false;
    }
  }

  return true;
}

function isFormOwnedImage(form, key, value) {

  if (value == null) {
    return false;
  }

  if (!isHtmlImage(value)) {
    return false;
  }

  if (value.name !== key && value.id !== key) {
    return false;
  }

  // Use prototype in case .contains has been overridden by an input
  if (!HTMLFormElement.prototype.contains.call(form, value)) {
    return false;
  }

  return true;
}

function isIndiceProperty(property) {
  return /^\d+$/.test(property);
}

const _sanitizeFormMethod = makeMethodSanitizer(isOverridden);

function sanitizeFormMethod(callback) {
  const sanitized = _sanitizeFormMethod(callback);

  return function sanitizedMethod(form, property, thirdArg) {
    // getting numeric property (form[0])
    if (isIndiceProperty(property)) {
      // delegate to a less optimised version that removes all inputs.
      return sanitizeIndices(form, property, thirdArg, callback);
    }

    return sanitized(form, property, thirdArg);
  };
}

const getFormProperty = sanitizeFormMethod(getProperty);
const setFormProperty = sanitizeFormMethod(setProperty);
const hasFormProperty = sanitizeFormMethod(hasProperty);
const getFormOwnPropertyDescriptor = sanitizeFormMethod(getOwnPropertyDescriptor);
const defineFormProperty = sanitizeFormMethod(defineProperty);
const deleteFormProperty = sanitizeFormMethod(deleteProperty);

function getFormOwnKeys(form) {
  // use sanitizeIndices to remove all inputs in one go then get own keys
  return sanitizeIndices(form, 0, void 0, _getFormOwnKeysCallback);
}

function _getFormOwnKeysCallback(form) {
  return Reflect.ownKeys(form);
}

export {
  getFormProperty as getProperty,
  setFormProperty as setProperty,
  hasFormProperty as hasProperty,
  getFormOwnPropertyDescriptor as getOwnPropertyDescriptor,
  defineFormProperty as defineProperty,
  deleteFormProperty as deleteProperty,
  getFormOwnKeys as getOwnKeys,
};
