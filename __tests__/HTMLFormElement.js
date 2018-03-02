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
    await page.evaluate(() => {
      const script = document.createElement('script');

      // language=JavaScript
      script.innerHTML = `
        function stringify(val) {
          if (val === null || typeof val !== 'object') {
            return val;
          }

          return String(val);
        }
      `;

      document.head.appendChild(script);
    });
  });

  function getFormProperty(arg) {
    return page.evaluate(({ html, target = 'form', key }) => {
      document.body.innerHTML = html;

      const form = document.querySelector(target);
      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(form[key]),
        safe: window.stringify(unoverride.getProperty(form, key)),
      };
    }, arg);
  }

  it('gets properties that would otherwise be overridden by a named field', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello">
          <input type="text" name="className" value="create" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLInputElement]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by a field with ID', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello">
          <input type="text" id="className" value="create" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLInputElement]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by multiple fields that share the same name', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello">
          <input type="text" name="className" value="create" />
          <input type="text" name="className" value="delete" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object RadioNodeList]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by multiple named fields that share the same name and the name is an index', async () => {
    const property = await getFormProperty({
      html: `
        <form class="hello">
          <input type="text" name="1" value="create" />
          <select name="1"></select>
        </form>
      `,
      key: '1',
    });

    expect(property.unsafe).toEqual('[object HTMLSelectElement]');
    expect(property.safe).toEqual(void 0);
  });

  it('gets properties that would otherwise be overridden by elements placed outside the form, but owned by the form', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" id="my-form"></form>
        <input type="text" name="className" value="create" form="my-form" />
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLInputElement]');
    expect(className.safe).toEqual('hello');
  });

  it('skips elements not part of the form', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" id="my-form">
          <input type="text" name="className" value="create" form="my-other-form" />
        </form>
        
        <form method="POST" id="my-other-form"></form>
      `,
      target: '#my-form',
      key: 'className',
    });

    expect(className.unsafe).toEqual('hello');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by a named image', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" >
          <img name="className" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLImageElement]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by an image with ID', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" >
          <img id="className" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLImageElement]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by multiple images that share the same name', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" >
          <img name="className" />
          <img name="className" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object RadioNodeList]');
    expect(className.safe).toEqual('hello');
  });

  it('gets properties that would otherwise be overridden by an image and an input sharing the same name', async () => {
    // imgs are only listed if there are no matching inputs, we need to make sure that IMG even if there are inputs.
    const className = await getFormProperty({
      html: `
        <form class="hello">
          <img name="className" />
          <input name="className" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLInputElement]');
    expect(className.safe).toEqual('hello');
  });

  it('doesn\'t lose custom image properties', async () => {
    const property = await page.evaluate(() => {
      document.body.innerHTML = `<form></form>`;

      const img = new Image();
      img.name = 'my-pretty-image';
      document.body.appendChild(img);

      const form = document.querySelector('form');
      form.appendChild(img);

      const key = 'x-custom-key';

      // The image is named, in the document, even a child of the form, but the name mismatches the key.
      form[key] = img;

      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(form[key]),
        safe: window.stringify(unoverride.getProperty(form, key)),
      };
    });

    expect(property.unsafe).toEqual('[object HTMLImageElement]');
    expect(property.safe).toEqual('[object HTMLImageElement]');
  });

  it('doesn\'t lose custom input properties', async () => {
    const property = await page.evaluate(() => {
      document.body.innerHTML = `<form></form>`;

      const input = document.createElement('input');
      input.name = 'my-pretty-image';

      const form = document.querySelector('form');
      form.appendChild(input);

      const key = 'x-custom-key';

      // The image is named, in the document, even a child of the form, but the name mismatches the key.
      form[key] = input;

      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(form[key]),
        safe: window.stringify(unoverride.getProperty(form, key)),
      };
    });

    expect(property.unsafe).toEqual('[object HTMLInputElement]');
    expect(property.safe).toEqual('[object HTMLInputElement]');
  });

  it('works when vital properties are overridden', async () => {
    const className = await getFormProperty({
      html: `
        <form class="hello" >
          <input name="className" />

          <input name="length" />
          <input name="elements" />
          <input name="contains" />
        </form>
      `,
      key: 'className',
    });

    expect(className.unsafe).toEqual('[object HTMLInputElement]');
    expect(className.safe).toEqual('hello');
  });
});
