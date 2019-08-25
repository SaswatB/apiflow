import promiseIpc from 'electron-promise-ipc';
import { VM } from 'vm2';
import { SendCurlRequest } from '@/sendCurl';
import { RequestBodyType, Request, RequestAuthenticationType } from '@/model/Request';

export async function sendRequest(request: Request, linkedValueData: { [index: string]: string }, sandbox: object = {}) {
  // use a sandboxed environment to run user provided (or default) expressions
  const vm = new VM({
    timeout: 1000,
    sandbox
  });

  // validate the request
  if (request.method === undefined) {
    throw new Error("Method not provided");
  } else if (request.url === undefined) {
    throw new Error("URL not provided");
  }

  let args: SendCurlRequest = { method: request.method, url: request.url, headers: [] };
  const headers: {[index: string]: string} = {};

  // add the body if a payload type if set
  if (request.bodyType !== RequestBodyType.None) {
    try {
      switch(request.bodyType) {
        case RequestBodyType.JSON:
          headers["Content-Type"] =  "application/json";
          args.body = JSON.parse(request.body);
          break;
        case RequestBodyType.Form:
          headers["Content-Type"] =  "application/x-www-form-urlencoded";
          args.body = request.body;
          break
        case RequestBodyType.Raw:
        default:
          headers["Content-Type"] =  "text/plain";
          args.body = request.body;
          break;
      }
    } catch (err) {
      throw new Error(`Invalid JSON Payload (${err.message || "Unknown Error"})`);
    }
  }

  // add the headers
  for (let header of request.headers) {
    const nameLink: string = vm.run(linkedValueData[header.name])
    const valueLink: string = vm.run(linkedValueData[header.value])
    if (nameLink !== undefined && valueLink !== undefined) {
      headers[nameLink] = valueLink
    }
  }

  // add the auth header
  if (request.authType === RequestAuthenticationType.Basic) {
    const usernameLink = vm.run(linkedValueData[request.authSimpleUsername])
    const passwordLink = vm.run(linkedValueData[request.authSimplePassword])
    if (usernameLink !== undefined && passwordLink !== undefined) {
      headers["Authorization"] = "Basic " + btoa(usernameLink + ":" + passwordLink);
    }
  } else if (request.authType === RequestAuthenticationType.Bearer) {
    const tokenLink = vm.run(linkedValueData[request.authToken])
    if (tokenLink !== undefined) {
      headers["Authorization"] = "Bearer " + tokenLink;
    }
  }

  // push the headers into the SendCurlRequest
  Object.entries(headers).forEach(([name, value]) => {
    args.headers.push({name, value});
  })

  // send the request over ipc
  return promiseIpc.send('sendCurl', args)
}