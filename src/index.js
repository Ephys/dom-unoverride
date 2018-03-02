import * as formSanitizer from './HTMLFormElement';
import * as documentSanitizer from './Document';
import * as noSanitizer from './generic-operations';
import { isDocument, isHtmlForm } from './common';

function delegate(callback) {

  return function delegated(form, property, thirdArg) {

    const sanitizer = isHtmlForm(form)
      ? formSanitizer : isDocument(form)
        ? documentSanitizer
        : noSanitizer;

    return sanitizer[callback](form, property, thirdArg);
  };
}

const getProperty = delegate('getProperty');
const setProperty = delegate('setProperty');
const hasProperty = delegate('hasProperty');
const getOwnPropertyDescriptor = delegate('getOwnPropertyDescriptor');
const defineProperty = delegate('defineProperty');
const deleteProperty = delegate('deleteProperty');
const getOwnKeys = delegate('getOwnKeys');

const proxyHandler = {
  get: getProperty,
  set: setProperty,
  has: hasProperty,
  getOwnPropertyDescriptor,
  defineProperty,
  deleteProperty,
  ownKeys: getOwnKeys,
};

function sanitizeNode(node) {
  return new Proxy(node, proxyHandler);
}

export {
  getProperty,
  setProperty,
  hasProperty,
  getOwnPropertyDescriptor,
  defineProperty,
  deleteProperty,
  getOwnKeys,
  sanitizeNode,
};
