import promiseIpc from 'electron-promise-ipc';
import { VM } from 'vm2';
import { SendCurlRequest } from '@/sendCurl';
import { RequestPayloadType, Request, RequestAuthenticationType } from '@/model/Request';

export function sendRequest(request: Request, linkedValueData: { [index: string]: string }, sandbox: object = {}) {
  // use a sandboxed environment to run user provided (or default) expressions
  const vm = new VM({
    timeout: 1000,
    sandbox
  });

  // validate the request
  if (request.method === undefined) {
    return Promise.reject(new Error("Method not provided"));
  } else if (request.url === undefined) {
    return Promise.reject(new Error("URL not provided"));
  }

  let args: SendCurlRequest = { method: request.method, url: request.url, headers: [] };
  const headers: {[index: string]: string} = {};

  // add the body if a payload type if set
  if (request.payloadType === RequestPayloadType.JSON) {
    try {
      args.body = JSON.parse(request.jsonPayload);
      headers["Content-Type"] = "application/json";
    } catch (err) {
      return Promise.reject(new Error("Invalid JSON Payload (" + (err.message || "Unknown Error") + ")"));
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