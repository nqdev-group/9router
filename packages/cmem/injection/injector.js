export class Injector {
  constructor() {
    this.formatters = {};
  }

  registerFormatter(format, fn) {
    this.formatters[format] = fn;
  }

  inject(body, contextText, targetFormat) {
    if (!contextText || !body) return null;

    const formatter = this.formatters[targetFormat];
    if (formatter) {
      return formatter(body, contextText);
    }

    return this._defaultInject(body, contextText);
  }

  _defaultInject(body, contextText) {
    if (!body) return null;

    const messages = body.messages || body.input || body.contents || null;
    if (!messages) return null;

    const systemMsg = {
      role: "system",
      content: `[CMEM Memory Context]\n${contextText}\n[/CMEM Memory Context]`,
    };

    if (body.messages) {
      body.messages = [systemMsg, ...body.messages];
    } else if (body.input) {
      body.input = [systemMsg, ...body.input];
    } else if (body.contents) {
      body.contents.unshift(systemMsg);
    }

    return body;
  }
}
