import { Procedure, ProcedureLinkedValue, newLinkedValueId } from './Procedure'

export enum RequestMethod {
  Get = "GET",
  Post = "POST"
}

export enum RequestAuthenticationType {
  None = "None",
  Basic = "Basic",
  Digest = "Digest",
  Bearer = "Bearer"
}

export enum RequestPayloadType {
  None = "None",
  JSON = "JSON"
}

export function getPayloadTypes(method: RequestMethod) {
  return [RequestPayloadType.None, ...(method == RequestMethod.Post ? [RequestPayloadType.JSON] : [])];
}

export class Request implements Procedure {
  classVersion = 1
  id: string
  name: string
  url?: string
  method?: RequestMethod
  //auth
  authType = RequestAuthenticationType.None
  authSimpleUsername: string // ProcedureLinkedValue
  authSimplePassword: string // ProcedureLinkedValue
  //headers
  headers:Array<{key: number, name: string, value: string}> = []//name: ProcedureLinkedValue, value: authSimpleUsername
  //payload
  payloadType = RequestPayloadType.None
  jsonPayload = "" //ace editor doesn't like undefined
  response = {}

  private constructor(id:string, name: string, authSimpleUsername: string, authSimplePassword: string) {
    this.id = id
    this.name = name
    this.authSimpleUsername = authSimpleUsername
    this.authSimplePassword = authSimplePassword
  }

  static newRequest(id:string, name: string) {
    return new Request(id, name, newLinkedValueId(), newLinkedValueId());
  }

  static placeholder() {
    return new Request("","","","");
  }

  static migrate(obj: any) {
    const req = Request.placeholder();
    Object.assign(req, obj); //TODO: proper migrations
    return req;
  }
}