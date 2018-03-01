# dom-unoverride

A 2KB library (minified) that allows you to safely access properties on a form.

## Usage

Install using `npm install --save dom-unoverride`

Access it using:

`import ... from 'dom-unoverride';` (ESM, see below for exported names).

`const unoverride = require('dom-unoverride');` (CJS)

`const unoverride = window['x-unoverride']` (Script, the file you need to load is located at `dist/bundle.js`)

## The problem

**TL;DR**: Adding a named input to an HTML form will create an eponymous property on that form's DOM object. That property is allowed to override built-ins/standard.
See issue: https://github.com/whatwg/html/issues/2212

---

Adding a named input to an HTML form will create an eponymous property on that form's DOM object. \
Which means that if you have the following form:

```html
<form method="POST" action="http://google.com" id="my-form">
  <input type="text" name="username" value="ephys" />
</form>
```

You can then access the `username` input via the form element.

```javascript
const form = document.querySelector('#my-form');
form.username; 
// Expected Output: <input type="text" name="username" value="ephys" />
```

Neat feature. The first problem is that it shares its namespace with other built-in properties (e.g. `action`, `className`, etc...), making it not future proof as new DOM properties can collide with your field names. Instead you should use `form.elements.namedItem(key)` or `form.elements.item(indice)` to access these inputs. (

*TIP: `form.elements[key]` does __not__ have precedence over built-ins so `form.elements.hasOwnProperty` will always return a function even if you have an input called `hasOwnProperty`. Use `namedItem`!*

The second problem arrives when you realise that those inputs actually have precedence over built-in properties. So now if you have the following form:

```html
<form method="POST" action="http://google.com">
  <!-- This is actually a very common pattern -->
  <input type="hidden" name="action" value="create" />
</form>
```

The only way you can sanely retrieve the value of `form.action` is through `getAttribute`. And that does not work for properties that do not have a corresponding HTML attribute (e.g. `classList`, `textContent`, etc...). (Prototype Functions can still be retrieved through the prototype through, but it's cumbersome).

## The solution

This script provides a series of helper function to get/set/check/delete/etc properties on an `HTMLFormElement` instance while completely ignoring and hidding the added `input` elements. It also adds a method `sanitizeForm` that proxies the form and fixes everything for you (needs an environment that supports or polyfills `Proxy`).

Please note that you can still use `HTMLFormElement#elements` to access the form's inputs!

Here is some documentation on how to use these helper methods:

### `sanitizeForm(form: HTMLFormElement): Proxy<HTMLFormElement>`

Creates a proxy around the form that completely ignores and hides inputs added as properties on the form itself.

```javascript
const safeForm = sanitizeForm(form);

safeForm.action;
// expected output: 'http://google.com'

safeForm.action = 'https://madkings.com';
safeForm.action;
// expected output: 'https://madkings.com'

form.action;
// expected output: <input type="hidden" name="action" value="create" />
```

**CAVEATS**: DOM methods must be called on a DOM object. Due to that restriction, executing any DOM method on the proxy (e.g. `safeForm.appendChild()`) will throw.

### `getFormProperty(form: HTMLFormElement, key: string): any`

Returns the value of a property of an `HTMLFormElement`.

```javascript
form.action
// expected output: <input type="hidden" name="action" value="create" />

getFormProperty(form, 'action');
// expected output: 'http://google.com'
```

### `setFormProperty(form: HTMLFormElement, key: string, value: any): void`

Sets the value of a property of an `HTMLFormElement`.

```javascript
setFormProperty(form, 'action', 'https://madkings.com');

form.action
// expected output: <input type="hidden" name="action" value="create" />

getFormProperty(form, 'action');
// expected output: 'https://madkings.com'
```

### `hasFormProperty(form: HTMLFormElement, key: string): boolean`

Returns whether a property exists on an `HTMLFormElement` ignoring `input`s.

```javascript
hasFormProperty(form, 'username');
// expected output: false

'username' in form
// expected output: true
```

### `getFormOwnPropertyDescriptor(form: HTMLFormElement, key: string): PropertyDescriptor`

Returns the descriptor of a property of an `HTMLFormElement`, ingoring inputs.\
It works exactly like `Object.getOwnPropertyDescriptor(obj, key)`.

### `getFormOwnPropertyDescriptor(form: HTMLFormElement, key: string, descriptor: PropertyDescriptor): form`

Sets the descriptor of a property of an `HTMLFormElement`, ingoring inputs.\
It works exactly like `Object.defineProperty(obj, key, descriptor)`.

### `deleteFormProperty(form: HTMLFormElement, key: string): void`

Deletes a property from an `HTMLFormElement`, ignoring inputs.\
It works like `delete form.<property>`.

### `getFormOwnKeys(form: HTMLFormElement): Array<string|Symbol>`

Like `Reflect.ownKeys` but ignores HTML inputs.
