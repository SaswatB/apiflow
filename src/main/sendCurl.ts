import { Curl, CurlInfoDebug, HeaderInfo } from "node-libcurl";

export interface SendCurlRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: {name: string, value: string}[];
  body?: string;
}

interface DebugLog {
  timestamp: number;
  message: string;
}

interface TimingData {
  dns: number;
  connect: number;
  ttfb: number; // time to first byte
  total: number;
}

export interface SendCurlResult {
  statusCode: number;
  data: string | Buffer;
  headers: HeaderInfo[] | Buffer;
  timingData: TimingData;
  debugLog: DebugLog[];
}

/**
 * Sends the given request with curl
 * 
 * @param request the request to send
 * @returns curl's result of the request
 */
export function sendCurl(request: SendCurlRequest) {
  return new Promise<SendCurlResult>((resolve, reject) => {
    const curl = new Curl();

    // set the url and headers
    curl.setOpt(Curl.option.URL, request.url);
    curl.setOpt(Curl.option.HTTPHEADER, request.headers.map(h => `${h.name}: ${h.value}`));

    // have curl follow redirects
    curl.setOpt(Curl.option.FOLLOWLOCATION, true);

    // disable ssl certificate verification
    curl.setOpt(Curl.option.SSL_VERIFYHOST, false);
    curl.setOpt(Curl.option.SSL_VERIFYPEER, false);

    // set the curl method (by default it's GET)
    if(request.method === 'POST') {
      curl.setOpt(Curl.option.POST, true);
      // add a body for post requests, if one is given
      if(request.body !== undefined) {
        if (typeof request.body === "string") {
          curl.setOpt(Curl.option.POSTFIELDS, request.body);
        } else {
          curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(request.body));
        }
        curl.setOpt(Curl.option.POSTFIELDSIZE, -1);
      } else {
        // set an empty body
        curl.setOpt(Curl.option.POSTFIELDS, "");
        curl.setOpt(Curl.option.POSTFIELDSIZE, 0);
      }
    }
    
    // save curl debug logs
    const debugLog: DebugLog[] = []
    curl.setOpt(Curl.option.VERBOSE, true);
    curl.setOpt(Curl.option.DEBUGFUNCTION, (type: number, data: Buffer) => {
      try {
        let text: string;

        switch (type) {
          case CurlInfoDebug.DataIn:
            text = '-- RECEIVING DATA: ' + data.toString('utf8').length + 'bytes';
            break;
          case CurlInfoDebug.DataOut:
            text = '-- SENDING DATA: ' + data.toString('utf8').length + 'bytes';
            break;
          case CurlInfoDebug.HeaderIn:
            text = '-- RECEIVING HEADER: ' + data.toString('utf8');
            break;
          case CurlInfoDebug.HeaderOut:
            text = '-- SENDING HEADER: ' + data.toString('utf8');
            break;
          case CurlInfoDebug.SslDataIn:
            text = '-- RECEIVING SSL DATA: ' + data.toString('utf8').length + 'bytes';
            break;
          case CurlInfoDebug.SslDataOut:
            text = '-- SENDING SSL DATA: ' + data.toString('utf8').length + 'bytes';
            break;
          case CurlInfoDebug.Text:
          default:
            text = data.toString('utf8');
            break;
        }

        debugLog.push({ timestamp: Date.now(), message: text });
      } catch(err) {
        console.log("Error processing curl debug", err)
      }
      return 0;
    });

    curl.on('end', (statusCode, data, headers) => {
      try {
        // get the timing data result
        const timingData: TimingData = {
          dns: curl.getInfo(Curl.info.NAMELOOKUP_TIME_T) as number,
          connect: curl.getInfo(Curl.info.CONNECT_TIME_T) as number,
          ttfb: curl.getInfo(Curl.info.STARTTRANSFER_TIME_T) as number,
          total: curl.getInfo(Curl.info.TOTAL_TIME_T) as number
        }

        // return curl's result
        resolve({ statusCode, data, headers, timingData, debugLog });
      } catch(err) {
        console.log("Error processing curl end", err)
      }
      curl.close();
    });

    curl.on('error', (error: Error) => {
      console.error('curl error', error);
      (error as any).debugLog = debugLog;

      // return curl's error
      reject(error);
      curl.close();
    });

    // execute the request
    curl.perform();
  });
}