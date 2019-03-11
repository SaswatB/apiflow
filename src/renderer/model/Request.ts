import { Procedure, newLinkedValueId, ProcedureMap } from "./Procedure"
const clonedeep = require("lodash.clonedeep")
import axios from "axios"
import { VM } from 'vm2';

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

  static getFromStore(requestMap: ProcedureMap<RequestData>, id: string) {
    return Request.migrate(clonedeep(requestMap[id]));
  }

  static migrate(obj: any) {
    const req = Request.placeholder();
    Object.assign(req, obj);
    return req;
  }

  sendRequest(linkedValueData: {[index: string]: string}) {
    const vm = new VM({
        timeout: 1000,
        sandbox: {}
    });

    if(this.method === undefined) {
      return Promise.reject("Method not provided");
    }
    if(this.url === undefined) {
      return Promise.reject("URL not provided");
    }
    let args:any = { method: this.method, url: this.url, headers: {} }
    if(this.payloadType === RequestPayloadType.JSON) {
      try {
        args.data = JSON.parse(this.jsonPayload)
      } catch(err) {
        return Promise.reject("Invalid JSON Payload (" + (err.message || "Unknown Error") + ")");
      }
    }
    for(let header of this.headers) {
      const nameLink = vm.run(linkedValueData[header.name])
      const valueLink = vm.run(linkedValueData[header.value])
      if(nameLink !== undefined && valueLink !== undefined) {
        args.headers[nameLink] = valueLink
      }
    }
    if(this.authType === RequestAuthenticationType.Basic) {
      const usernameLink = vm.run(linkedValueData[this.authSimpleUsername])
      const passwordLink = vm.run(linkedValueData[this.authSimplePassword])
      if(usernameLink !== undefined && passwordLink !== undefined) {
        args.headers["Authorization"] = "Basic " + btoa(usernameLink + ":" + passwordLink);
      }
    } else if(this.authType === RequestAuthenticationType.Bearer) {
      const tokenLink = vm.run(linkedValueData[this.authToken])
      if(tokenLink !== undefined) {
        args.headers["Authorization"] = "Bearer " + tokenLink;
      }
    }
    return axios(args);
  }
}