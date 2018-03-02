export function getProperty(form, property) {
  return form[property];
}

export function setProperty(object, property, value) {
  object[property] = value;
}

export function hasProperty(object, property) {
  // eslint-disable-next-line no-restricted-syntax
  return property in object;
}

export function getOwnPropertyDescriptor(object, property) {
  return Object.getOwnPropertyDescriptor(object, property);
}

export function defineProperty(object, property, value) {
  return Object.defineProperty(object, property, value);
}

export function deleteProperty(object, property) {
  delete object[property];
}
