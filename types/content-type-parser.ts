declare module "content-type-parser" {

  interface ContentType {
    type: string;
    subtype: string;
    parameterList: {
      separator: string,
      key?: string,
      value: string,
    }[];
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    isXML(): boolean;
    isHTML(): boolean;
    isText(): boolean;
    toString(): string
  }

  function parseContentType(contentType: string): ContentType | null;
  export = parseContentType;
}