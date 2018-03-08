/**
 * Document element (https://html.spec.whatwg.org/multipage/dom.html#dom-document-namedItem-which)
 */

describe('Document', () => {
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

  function getDocumentProperty(arg) {
    return page.evaluate(({ html, key }) => {
      document.body.innerHTML = html;

      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(document[key]),
        safe: window.stringify(unoverride.getProperty(document, key)),
      };
    }, arg);
  }

  it('gets properties that would otherwise be overridden by a named embed', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <embed name="nodeName" />
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLEmbedElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a named form', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <form name="nodeName"></form>
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLFormElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a named iframe', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <iframe name="nodeName" />
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object Window]'); // iframes give their content window.
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a named image', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <img name="nodeName" />
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLImageElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a named image that also has an ID', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <!-- name must not be empty for id to actively override -->
        <img id="nodeName" name="nodeName2" />
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLImageElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a named object', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <object name="nodeName"></object>
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLObjectElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by an object that has an ID', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <object id="nodeName"></object>
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLObjectElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by multiple named elements', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <embed name="nodeName" />
        <form name="nodeName"></form>
        <iframe name="nodeName"></iframe>
        <object name="nodeName"></object>
        <object id="nodeName"></object>
        <img name="nodeName" />
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLCollection]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('gets properties that would otherwise be overridden by a collection of iframes', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <iframe name="nodeName"></iframe>
        <iframe name="nodeName"></iframe>
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLCollection]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('does not crash if a node itself has overridden properties', async () => {
    const nodeName = await getDocumentProperty({
      html: `
        <form name="nodeName">
          <input name="constructor" />
          <input name="localName" />
          <input name="nodeName" />
          <input name="tagName" />
          <input name="shadowRoot" />
          <input name="parentNode" />
          <input name="parentElement" />
          <input name="replaceWith" />
          <input name="contains" />
          <input name="name" />
          <input name="id" />
        </form>
      `,
      key: 'nodeName',
    });

    expect(nodeName.unsafe).toEqual('[object HTMLFormElement]');
    expect(nodeName.safe).toEqual('#document');
  });

  it('does not lose valid collections', async () => {
    const nodeName = await page.evaluate(() => {
      document.body.innerHTML = `
        <img />
      `;

      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(document.images[0]),
        safe: window.stringify(unoverride.getProperty(document, 'images')[0]),
      };
    });

    expect(nodeName.unsafe).toEqual('[object HTMLImageElement]');
    expect(nodeName.safe).toEqual('[object HTMLImageElement]');
  });

  it('does not lose valid collections overridden by bad collection', async () => {
    const nodeName = await page.evaluate(() => {
      document.body.innerHTML = `
        <img />
        <form name="images"></form>
        <form name="images"></form>
      `;

      const unoverride = window['x-unoverride'];

      return {
        unsafe: window.stringify(document.images[0]),
        safe: window.stringify(unoverride.getProperty(document, 'images')[0]),
      };
    });

    expect(nodeName.unsafe).toEqual('[object HTMLFormElement]');
    expect(nodeName.safe).toEqual('[object HTMLImageElement]');
  });

  it('hides overrides from own property list', async () => {
    const docProperties = await page.evaluate(() => {
      document.body.innerHTML = '';
      const cleanSlate = Reflect.ownKeys(document);

      document.body.innerHTML = `
        <img name="img1" id="img12" />
        <iframe name="iframe1"></iframe>
        <form name="nodeName"></form>
        <embed name="embed1" />
        <embed name="location" />
        <object name="object1"></object>
        <object id="object2"></object>
      `;

      const unoverride = window['x-unoverride'];

      return {
        clean: cleanSlate,
        unsafe: Reflect.ownKeys(document),
        safe: unoverride.getOwnKeys(document),
      };
    });

    const cleanSlate = docProperties.clean;
    const badProperties = ['img12', 'img1', 'iframe1', 'nodeName', 'embed1', 'object1', 'object2'];

    expect(docProperties.unsafe).toEqual(cleanSlate.concat(badProperties));
    expect(docProperties.safe).toEqual(cleanSlate);
  });
});
