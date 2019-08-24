import { cloneDeep } from "lodash";
import { Procedure, newLinkedValueId, ProcedureMap } from "./Procedure"

export enum RequestMethod {
  Get = "GET",
  Post = "POST"
}

export enum RequestAuthenticationType {
  None = "None",
  Basic = "Basic",
  Bearer = "Bearer"
}

export enum RequestBodyType {
  None = "None",
  Raw = "Raw",
  Form = "Form",
  JSON = "JSON",
}

export function getBodyTypes(method: RequestMethod) {
  return [RequestBodyType.None, ...(method == RequestMethod.Post ? [RequestBodyType.Raw, RequestBodyType.Form, RequestBodyType.JSON] : [])];
}

//stub used to distinguish migrated and unmigrated objects
export interface RequestData extends Procedure {}

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
  authToken: string // ProcedureLinkedValue
  //headers
  headers:Array<{key: number, name: string, value: string}> = []//name: ProcedureLinkedValue, value: authSimpleUsername
  //payload
  bodyType = RequestBodyType.None
  body = "" //ace editor doesn't like undefined
  response = {}

  private constructor(id:string, name: string, authSimpleUsername: string, authSimplePassword: string, authToken: string) {
    this.id = id
    this.name = name
    this.authSimpleUsername = authSimpleUsername
    this.authSimplePassword = authSimplePassword
    this.authToken = authToken
  }

  static newRequest(id:string, name: string) {
    return new Request(id, name, newLinkedValueId(), newLinkedValueId(), newLinkedValueId());
  }

  static placeholder() {
    return new Request("","","","","");
  }

  static getFromStore(requestMap: ProcedureMap<RequestData>, id: string) {
    return Request.migrate(cloneDeep(requestMap[id]));
  }

  static migrate(obj: any) {
    const req = Request.placeholder();
    Object.assign(req, obj);
    return req;
  }
}