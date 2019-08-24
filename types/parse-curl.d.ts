declare module "parse-curl" {
  function parse(curlCommand:string) : {
    method: string;
    header: { [index: string]: string | undefined }
    url?: string;
    body?: string;
  };
  export = parse;
}