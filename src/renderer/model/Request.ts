import { Procedure, newLinkedValueId } from "./Procedure"
import axios from "axios"

export enum RequestMethod {
  Get = "GET",
  Post = "POST"
}

export enum RequestAuthenticationType {
  None = "None",
  Basic = "Basic",
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
  authToken: string // ProcedureLinkedValue
  //headers
  headers:Array<{key: number, name: string, value: string}> = []//name: ProcedureLinkedValue, value: authSimpleUsername
  //payload
  payloadType = RequestPayloadType.None
  jsonPayload = "" //ace editor doesn't like undefined
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

  static migrate(obj: any) {
    const req = Request.placeholder();
    Object.assign(req, obj); //TODO: proper migrations
    return req;
  }


  sendRequest(linkedValues: {[index: string]: string}) {
    let args:any = { method: this.method, url: this.url, headers: {} }
    if(this.payloadType === RequestPayloadType.JSON) {
      args.data = JSON.parse(this.jsonPayload)
    }
    for(let i in this.headers){
      const nameLink = linkedValues[this.headers[i].name]
      const valueLink = linkedValues[this.headers[i].value]
      if(nameLink !== undefined && valueLink !== undefined) {
        args.headers[nameLink] = valueLink
      }
    }
    if(this.authType === RequestAuthenticationType.Basic) {
      const usernameLink = linkedValues[this.authSimpleUsername]
      const passwordLink = linkedValues[this.authSimplePassword]
      if(usernameLink !== undefined && passwordLink !== undefined) {
        args.headers["Authorization"] = "Basic " + btoa(usernameLink + ":" + passwordLink);
      }
    } else if(this.authType === RequestAuthenticationType.Bearer) {
      const tokenLink = linkedValues[this.authToken]
      if(tokenLink !== undefined) {
        args.headers["Authorization"] = "Bearer " + tokenLink;
      }
    }
    axios(args).then((response) => {
      this.response = response
    }).catch((error) => {
      this.response = error
    });
  }
}