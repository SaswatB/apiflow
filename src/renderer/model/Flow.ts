import { Procedure, ProcedureLinkedValue, ProcedureMap } from "./Procedure"
const clonedeep = require("lodash.clonedeep")
import { Request } from "./Request"

export enum FlowNodeType {
  Root = "Root",
  Play = "Play",
  Request = "Request",
  WSConnect = "Websocket Connector",
  Aggregate = "Aggregate",
  Split = "Split",
  Sleep = "Sleep"
}

export const FlowRootNodeId = "root";
export const FlowPlayNodeId = "play";

export function getFlowNodeTypeIcon(type: FlowNodeType) {
  if(type == FlowNodeType.Root) return "\uF830"; //shape
  if(type == FlowNodeType.Play) return "\uF40A"; //play
  if(type == FlowNodeType.Request) return "\uF59F"; //web
  if(type == FlowNodeType.WSConnect) return "\uF7E4"; //pipe
  if(type == FlowNodeType.Aggregate) return "\uF0F8"; //call-merge
  if(type == FlowNodeType.Split) return "\uF9BA"; //arrow-decision
  if(type == FlowNodeType.Sleep) return "\uF4B2"; //sleep
  return "";
}

export interface FlowNode {
  id: string,
  type: FlowNodeType,
  parentIds: Array<string>
}

export interface FlowDagNode { // compatible with d3's dag node
  id: string,
  data: FlowNode,
  children: Array<FlowDagNode>,
  x: number,
  y: number,
  layer: number
}

export interface FlowNodeSettings {
  name?: string
  disabled?: boolean
  triggerAction?: string
  linkPolicy?: string
  linkedValueData: {[index: string]: string}
}

export interface FlowNodeRequestSettings extends FlowNodeSettings {
  requestId?: string
}

export interface FlowNodeWSConnectSettings extends FlowNodeSettings {
  wsconnectUrl?: string
}

export interface FlowNodeSleepSettings extends FlowNodeSettings {
  sleep?: number
}

export interface FlowContext {
  flows: ProcedureMap<Flow>,
  requests:  ProcedureMap<Request>,
  linkedValues:  {[index: string]: ProcedureLinkedValue}
}

export class Flow implements Procedure {
  classVersion = 1
  id: string
  name: string
  flowData: Array<FlowNode> = [ // two default nodes that need to be in every dag
    { "id": FlowRootNodeId, "type": FlowNodeType.Root, "parentIds": [] },
    { "id": FlowPlayNodeId, "type": FlowNodeType.Play, "parentIds": [FlowRootNodeId]}
  ];
  flowSettings: {[index: string]: FlowNodeSettings} = {}

  private constructor(id:string, name: string) {
    this.id = id
    this.name = name
  }

  static newFlow(id:string, name: string) {
    return new Flow(id, name);
  }

  static placeholder() {
    return new Flow("","");
  }

  static getFromStore(flowMap: ProcedureMap<Flow>, id: string) {
    return Flow.migrate(clonedeep(flowMap[id]));
  }

  static migrate(obj: any) {
    const flow = Flow.placeholder();
    Object.assign(flow, obj); //TODO: proper migrations
    return flow;
  }
}