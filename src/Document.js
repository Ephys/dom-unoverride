import {
  getConstructorName,
  hasOwnProperty, isHtmlForm,
  makeMethodSanitizer, sanitizeSingle,
} from './common';
import {
  defineProperty,
  deleteProperty,
  getOwnPropertyDescriptor,
  getProperty,
  hasProperty,
  setProperty,
} from './generic-operations';
import { getProperty as safeGetProperty } from './index';

function isNamedElementOverride(document, property, value) {
  return safeGetProperty(value, 'name') === property && isRoot(document, value);
}

function isOverridden(document, property) {
  if (!hasOwnProperty(document, property)) {
    return false;
  }

  /*
  - Exposed embed, form, iframe => name attribute
  - Exposed object elements     => id, name
  - img                         => id (if they have a name), name
   */

  const value = document[property];
  const constructorName = getConstructorName(value);

  if (isHtmlForm(value) || constructorName === 'HTMLEmbedElement') {
    return isNamedElementOverride(document, property, value);
  }

  if (constructorName === 'HTMLObjectElement') {
    return (
      safeGetProperty(value, 'name') === property
      || safeGetProperty(value, 'id') === property
    ) && isRoot(document, value);
  }

  if (constructorName === 'HTMLImageElement') {
    if (!isRoot(document, value)) {
      return false;
    }

    const name = safeGetProperty(value, 'name');
    if (name === property) {
      return true;
    }

    if (!name) {
      return false;
    }

    return safeGetProperty(value, 'id') === property;
  }

  if (constructorName === 'HTMLCollection') {
    return true;
  }

  if (isIframeWindow(value)) {
    return isNamedElementOverride(document, property, value.frameElement);
  }

  return false;
}

function isRoot(document, node) {
  const getRoot = Node.prototype.getRootNode;
  if (getRoot) {
    return getRoot.call(node) === document;
  }

  return safeGetProperty(node, 'ownerDocument') === document;
}

function isIframeWindow(object) {
  return getConstructorName(object) === 'Window' && object.frameElement;
}

const _sanitizeDocMethod = makeMethodSanitizer(isOverridden);

function sanitizeDocMethod(callback) {
  const sanitized = _sanitizeDocMethod(callback);

  return function sanitizedMethod(document, property, thirdArg) {
    // SPECIAL CASE: We get a *window* because iframes generate a property that give their window object
    const value = document[property];
    if (isIframeWindow(value)) {
      const iframe = value.frameElement;
      if (!isNamedElementOverride(document, property, iframe)) {
        return callback(document, property, thirdArg);
      }

      return sanitizeSingle(sanitizedMethod, iframe, document, property, thirdArg);
    }

    return sanitized(document, property, thirdArg);
  };
}

const getDocProperty = sanitizeDocMethod(getProperty);
const setDocProperty = sanitizeDocMethod(setProperty);
const hasDocProperty = sanitizeDocMethod(hasProperty);
const getDocOwnPropertyDescriptor = sanitizeDocMethod(getOwnPropertyDescriptor);
const defineDocProperty = sanitizeDocMethod(defineProperty);
const deleteDocProperty = sanitizeDocMethod(deleteProperty);

function getDocOwnKeys(doc) {
  return Reflect.ownKeys(doc).filter(name => !isOverridden(doc, name));
}

export {
  getDocProperty as getProperty,
  setDocProperty as setProperty,
  hasDocProperty as hasProperty,
  getDocOwnPropertyDescriptor as getOwnPropertyDescriptor,
  defineDocProperty as defineProperty,
  deleteDocProperty as deleteProperty,
  getDocOwnKeys as getOwnKeys,
};
