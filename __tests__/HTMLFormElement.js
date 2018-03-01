/**
 * https://html.spec.whatwg.org/multipage/forms.html#dom-form-nameditem
 *
 * An HTMLFormElement executes the following step when getting a property named <name>:
 * - If the form is the owner of *elements* with the id or name equal to <name>, return these elements.
 * - If the form has HTMLImageElements descendants with the id or name equal to <name>, return these images.
 * - If the form HAD *elements* with the id or name equal to <name>, return the most recent ones.
 *
 * - In the above steps, if the amount of items to return is 1, only that item is returned. If it is above 1, an RadioNodeList containing them is returned.
 */

describe('HTMLFormElement', () => {
  let page;
  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: './dist/bundle.js' });
  });

  it('gets properties that would otherwise be overridden by a named field', async () => {
    const className = await page.evaluate(() => {
      document.body.innerHTML = `
        <form method="POST" name="location" action="http://google.com" class="hello">
          <input type="text" name="className" value="create" />
        </form>
      `;

      const form = document.querySelector('form');
      const unoverride = window['x-unoverride'];

      return {
        unsafe: form.className,
        safe: unoverride.getFormProperty(form, 'className'),
      };
    });

    // the className should have been been overwritten by the input[name=className]
    expect(typeof className.unsafe).toEqual('object');
    expect(typeof className.safe).toEqual('string');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by a field with ID', async () => {
    const className = await page.evaluate(() => {
      document.body.innerHTML = `
        <form method="POST" name="location" action="http://google.com" class="hello">
          <input type="text" id="className" value="create" />
        </form>
      `;

      const form = document.querySelector('form');
      const unoverride = window['x-unoverride'];

      return {
        unsafe: form.className,
        safe: unoverride.getFormProperty(form, 'className'),
      };
    });

    // the className should have been been overwritten by the input[name=className]
    expect(typeof className.unsafe).toEqual('object');
    expect(typeof className.safe).toEqual('string');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by multiple named fields', async () => {
    const className = await page.evaluate(() => {
      document.body.innerHTML = `
        <form method="POST" name="location" action="http://google.com" class="hello">
          <input type="text" name="className" value="create" />
          <input type="text" name="className" value="delete" />
        </form>
      `;

      const form = document.querySelector('form');
      const unoverride = window['x-unoverride'];

      return {
        unsafe: form.className,
        safe: unoverride.getFormProperty(form, 'className'),
      };
    });

    // the className should have been been overwritten by the input[name=className]
    expect(typeof className.unsafe).toEqual('object');
    expect(typeof className.safe).toEqual('string');
    expect(className.safe).toEqual('hello');
  });

  it('works with elements outside the form', async () => {
    const className = await page.evaluate(() => {
      document.body.innerHTML = `
        <form method="POST" name="location" action="http://google.com" class="hello" id="my-form"></form>
        <input type="text" name="className" value="create" form="my-form" />
      `;

      const form = document.querySelector('form');
      const unoverride = window['x-unoverride'];

      return {
        unsafe: form.className,
        safe: unoverride.getFormProperty(form, 'className'),
      };
    });

    expect(typeof className.unsafe).toEqual('object');
    expect(typeof className.safe).toEqual('string');
    expect(className.safe).toEqual('hello');
  });

  it('skips elements not part of the form', async () => {
    const className = await page.evaluate(() => {
      document.body.innerHTML = `
        <form method="POST" name="location" action="http://google.com" class="hello" id="my-form">
          <input type="text" name="className" value="create" form="my-other-form" />
        </form>
        
        <form method="POST" name="location" action="http://google.com" class="hello" id="my-other-form"></form>
      `;

      const form = document.querySelector('#my-form');
      const unoverride = window['x-unoverride'];

      return {
        unsafe: form.className,
        safe: unoverride.getFormProperty(form, 'className'),
      };
    });

    // should not be overridden
    expect(typeof className.unsafe).toEqual('string');
    expect(typeof className.safe).toEqual('string');
    expect(className.safe).toEqual('hello');
  });
});

/*
 * LIST OF TESTS TO IMPLEMENT
 * - HTMLFormElement ()
 *   - Works with multiple inputs with same name or id
 *   - Works with child images that have an ID or name property
 *   - Check what happens if the HTMLFormElement has an <input> and an <img> with the same name
 *   - Check that the .className returns the className and not the property
 */
