import contentTypeParser from "content-type-parser";
import { ProcedureMap, ProcedureFolderItemType, ProcedureRootFolderName, ProcedureFolderMap } from "@/../renderer/model/Procedure"
import { FlowNode } from "@/../renderer/model/Flow"

/**
 * Deeply dumps all the string values in an object
 * @param o the object to dump
 * @param blacklist any properties in the object to ignore
 * @returns an array of all the string values
 */
export function dumpObjectStrings(o: {[index: string]: any}, blacklist:Array<string>) {
  let strMap: Array<string> = []
  for(let prop in o) {
    if(o.hasOwnProperty(prop) && !blacklist.includes(prop)) {
      if(typeof o[prop] === "object") strMap = strMap.concat(dumpObjectStrings(o[prop], blacklist));
      if(typeof o[prop] === "string") strMap.push(o[prop]);
    }
  }
  return strMap
}

/**
 * Reverse dfs to find a path
 * 
 * @param nodes all the nodes in the dag
 * @param node the node to start searching from
 * @param target the node to reach
 * @param additionalEdges any additional edges to consider when searching
 * @returns true if target is reachable from node, false otherwise
 */
export function hasPath(nodes: Array<FlowNode>, node: FlowNode, target: string, additionalEdges: {[index:string]: Array<string>}) {
  if(node.id == target) return true;
  let edges = node.parentIds
  if(additionalEdges[node.id] != undefined) edges.concat(additionalEdges[node.id]);
  for(let edge of edges) {
    for(let subNode of nodes) {
      if(edge == subNode.id) {
        if(hasPath(nodes, subNode, target, additionalEdges)) return true;
        break;
      }
    }
  }
  return false;
}

// from https://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
export function getTransformation(transform: string) {
  // Create a dummy g for calculation purposes only. This will never
  // be appended to the DOM and will be discarded once this function 
  // returns.
  let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  
  // Set the transform attribute to the provided string value.
  g.setAttributeNS(null as any, "transform", transform);
  
  // consolidate the SVGTransformList containing all transformations
  // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
  // its SVGMatrix. 
  let matrix = g.transform.baseVal.consolidate().matrix;
  
  // Below calculations are taken and adapted from the private function
  // transform/decompose.js of D3's module d3-interpolate.
  let {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
  let scaleX = Math.sqrt(a * a + b * b);
  if (scaleX) a /= scaleX, b /= scaleX;
  let skewX = a * c + b * d
  if (skewX) c -= a * skewX, d -= b * skewX;
  let scaleY = Math.sqrt(c * c + d * d);
  if (scaleY) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * 180 / Math.PI,
    skewX: Math.atan(skewX) * 180 / Math.PI,
    scaleX: scaleX,
    scaleY: scaleY
  };
}

// from https://stackoverflow.com/questions/26049488/how-to-get-absolute-coordinates-of-object-inside-a-g-group
export function makeAbsoluteContext(element: any, svgDocument: SVGSVGElement) {
  return function(x:number, y:number) {
    var offset = svgDocument.getBoundingClientRect();
    var matrix = element.getScreenCTM();
    return {
      x: (matrix.a * x) + (matrix.c * y) + matrix.e - offset.left,
      y: (matrix.b * x) + (matrix.d * y) + matrix.f - offset.top
    };
  };
}

/**
 * Maps the given folder structure, starting at the given folder name,
 * to a map usable by Element's tree component
 * @param map a map of all the procedures contained in the folders
 * @param folders a map of all the folders that may be in the stucture
 * @param folderName the folder to start the tree at, by default this is the predefined root folder name
 */
export function mapToTree(map: ProcedureMap, folders:ProcedureFolderMap, folderName:string = ProcedureRootFolderName): Array<object> {
  const arr = [];
  for(let procedure of folders[folderName]) {
    switch(procedure.type) {
      case ProcedureFolderItemType.Procedure:
        arr.push({ label: map[procedure.id].name, id: procedure.id });
        break;
      case ProcedureFolderItemType.Folder:
        arr.push({ label:  procedure.id, id: procedure.id, children: mapToTree(map, folders, procedure.id) });
        break;
    }
  }
  return arr;
}

/**
 * Returns the given params object if the current process is the renderer
 * Otherwise returns an empty object
 * @param params the object to return if the current process is the renderer
 */
export function onRenderer(params:object) {
  return (process && process.type === 'renderer') ? params : {};
}

/**
 * Pulses the background color of the given element
 * @param element the element to pulse
 */
export function pulse(element: HTMLElement) {
  element.setAttribute('data-pulse', `${parseInt(element.getAttribute('data-pulse') || '0', 10) % 3 + 1}`);
}

/**
 * Returns `value` if it is a member of `enumType`, otherwise returns undefined
 * @param enumType the enum to search against
 * @param value the value to find within enumType
 */
export function parseString<T>(enumType: T, value: string): T[keyof T] | undefined {
  return Object.values(enumType).find((e) => e === value);
}

// default options for $notify (element-ui's notification lib)
export const DEFAULT_NOTIFY_OPTIONS = { message: "", offset: 25 };

// based on https://mimesniff.spec.whatwg.org/#mime-type-groups
export function isJsonContentType(contentType: string) {
  const parsedType = contentTypeParser(contentType);

  return parsedType && (
    (
      (parsedType.type === 'application' || parsedType.type === 'text')
      && parsedType.subtype === 'json'
    ) || parsedType.subtype.endsWith('+json')
  );
}

/**
 * Case-insensitive header get
 */
export function getHeader(headers: { [index: string]: string }, name: string) {
  const key = Object.keys(headers).find(key => key.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}
