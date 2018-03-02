import { freePlaceholder, getPlaceholder } from './placeholders';

export function isHtmlImage(item) {
  return getConstructorName(item) === 'HTMLImageElement';
}

export function isHtmlForm(item) {
  // we can't use .constructor because it could have been overridden. Instead we need to stringify.
  return String(item) === '[object HTMLFormElement]';
}

export function isDocument(item) {
  return String(item) === '[object HTMLDocument]';
}

export function isRadioNodeList(item) {
  return getConstructorName(item) === 'RadioNodeList';
}

export function isHtmlCollection(item) {
  return getConstructorName(item) === 'HTMLCollection';
}

export function isFormElementsCollection(item) {
  return getConstructorName(item) === 'HTMLFormControlsCollection';
}

export function getConstructorName(item) {
  return item && item.constructor && item.constructor.name || null;
}

export function hasOwnProperty(obj, val) {
  return Object.prototype.hasOwnProperty.call(obj, val);
}

function replaceWith(oldNode, newNode) {
  HTMLElement.prototype.replaceWith.call(oldNode, newNode);
}

// =========

function sanitizeCollection(form, property, thirdArg, callback) {
  const evilInputsLive = form[property];
  const evilInputsInert = [];
  const placeholders = [];

  for (let i = evilInputsLive.length - 1; i >= 0; i--) {
    const evilInput = evilInputsLive[i];
    const placeholder = getPlaceholder();

    placeholders.push(placeholder);
    evilInputsInert.push(evilInput);

    replaceWith(evilInput, placeholder);
  }

  const result = callback(form, property, thirdArg);

  for (let i = evilInputsInert.length - 1; i >= 0; i--) {
    replaceWith(placeholders[i], evilInputsInert[i]);
    freePlaceholder(placeholders[i]);
  }

  return result;
}

export function makeMethodSanitizer(isOverridden) {
  return function sanitizeMethod(callback) {
    return function sanitizedMethod(form, property, thirdArg) {
      if (!isOverridden(form, property)) {
        return callback(form, property, thirdArg);
      }

      const evilInput = form[property];

      // When two inputs have the same name
      if (isHtmlCollection(evilInput) || isRadioNodeList(evilInput)) {
        // delegate to a less optimised version that removes all inputs from the collection.
        return sanitizeCollection(form, property, thirdArg, callback);
      }

      return sanitizeSingle(sanitizedMethod, evilInput, form, property, thirdArg);
    };
  };
}

export function sanitizeSingle(sanitizedMethod, evilInput, form, property, thirdArg) {
  const placeholder = getPlaceholder();
  replaceWith(evilInput, placeholder);

  // call self recursively because the property will return
  // - a form-owned input if it exists
  // - a form-owned image if it exists and the input doesn't exist
  const result = sanitizedMethod(form, property, thirdArg);

  replaceWith(placeholder, evilInput);
  freePlaceholder(placeholder);

  return result;
}
