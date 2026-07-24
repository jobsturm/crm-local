/**
 * Minimal browser-safe XML builder with fluent API compatible with xmlbuilder2.
 * Replaces xmlbuilder2 at runtime to avoid Node stream imports in browser/Electron renderer.
 */

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

class XmlNode {
  private readonly name: string;
  private readonly attrs: Map<string, string> = new Map();
  private readonly children: (XmlNode | string)[] = [];
  private readonly parentNode: XmlNode | null;
  private readonly root: XmlRoot;

  constructor(name: string, parent: XmlNode | null, root: XmlRoot, attrs?: Record<string, string>) {
    this.name = name;
    this.parentNode = parent;
    this.root = root;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        this.attrs.set(k, v);
      }
    }
  }

  ele(name: string, attrs?: Record<string, string>): XmlNode {
    const child = new XmlNode(name, this, this.root, attrs);
    this.children.push(child);
    return child;
  }

  att(name: string, value: string): this {
    this.attrs.set(name, value);
    return this;
  }

  txt(text: string): this {
    this.children.push(text);
    return this;
  }

  up(): XmlNode {
    return this.parentNode ?? this;
  }

  doc(): XmlRoot {
    return this.root;
  }

  serialize(indent: number, pretty: boolean): string {
    const pad = pretty ? ' '.repeat(indent) : '';
    const nl = pretty ? '\n' : '';

    let attrStr = '';
    for (const [k, v] of this.attrs) {
      attrStr += ` ${k}="${escapeAttr(v)}"`;
    }

    if (this.children.length === 0) {
      return `${pad}<${this.name}${attrStr}></${this.name}>`;
    }

    // Single text child — inline
    if (this.children.length === 1 && typeof this.children[0] === 'string') {
      return `${pad}<${this.name}${attrStr}>${escapeText(this.children[0])}</${this.name}>`;
    }

    const inner = this.children
      .map((c) => (typeof c === 'string' ? `${pad}  ${escapeText(c)}` : c.serialize(indent + 2, pretty)))
      .join(nl);

    return `${pad}<${this.name}${attrStr}>${nl}${inner}${nl}${pad}</${this.name}>`;
  }
}

class XmlRoot {
  private readonly version: string;
  private readonly encoding: string;
  private rootNode: XmlNode | null = null;

  constructor(version: string, encoding: string) {
    this.version = version;
    this.encoding = encoding;
  }

  ele(name: string, attrs?: Record<string, string>): XmlNode {
    this.rootNode = new XmlNode(name, null, this, attrs);
    return this.rootNode;
  }

  end(opts?: { prettyPrint?: boolean }): string {
    const pretty = opts?.prettyPrint ?? false;
    const nl = pretty ? '\n' : '';
    const decl = `<?xml version="${this.version}" encoding="${this.encoding}"?>`;
    if (!this.rootNode) return decl;
    return `${decl}${nl}${this.rootNode.serialize(0, pretty)}`;
  }
}

export function create(opts: { version: string; encoding: string }): XmlRoot {
  return new XmlRoot(opts.version, opts.encoding);
}
