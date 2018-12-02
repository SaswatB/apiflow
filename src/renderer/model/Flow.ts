import { Procedure } from "./Procedure"

export enum FlowNodeType {
  Root = "Root",
  Play = "Play",
  Request = "Request",
  WSConnect = "Websocket Connect",
  Aggregate = "Aggregate",
  Split = "Split",
  Sleep = "Sleep"
}

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

  // get icon() : string {
  //   return getFlowNodeTypeIcon(this.type);
  // } 
}

export class Flow implements Procedure {
  classVersion = 1
  id: string
  name: string
  flowData: Array<FlowNode> = [ // two default nodes that need to be in every dag
    { "id": "root", "type": FlowNodeType.Root, "parentIds": [] },
    { "id": "play", "type": FlowNodeType.Play, "parentIds": ["root"]}
  ];
  flowSettings: {[index: string]: {}} = {}

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

  static migrate(obj: any) {
    const flow = Flow.placeholder();
    Object.assign(flow, obj); //TODO: proper migrations
    return flow;
  }
}