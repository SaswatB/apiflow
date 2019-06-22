// import recast from "recast"
import * as d3dag from "d3-dag"

import { FlowNodeType, FlowPlayNodeId, FlowDagNode, FlowNodeRequestSettings, FlowContext, Flow } from "@/model/Flow"
import { Request } from "@/model/Request"
import Vue from "vue";

export enum FlowRunnerLogLevel {
  VERBOSE, INFORMATION, WARNING, ERROR
}

export enum FlowRunnerLogEntryTargetPane {
  PropertyEditor, LogViewer, ResultViewer
}

export interface FlowRunnerLogEntry {
  time: number,
  level: FlowRunnerLogLevel,
  entry: string,
  nodeId?: string,
  targetPane?: FlowRunnerLogEntryTargetPane // what editor pane should open if this entry is clicked
}

function nodeNamePrint(nodeType: FlowNodeType, nodeName?: string) {
  return nodeType + " Node" + (nodeName != undefined ? ` '${nodeName}'` : "")
}

export class FlowRunner {
  flow: Flow;
  ctx: FlowContext;
  dagRoot: FlowDagNode;

  log: Array<FlowRunnerLogEntry> = [];
  results: {[index:string]: Array<any>} = {} // map between a node and an array of its results (one entry for every time its executed in this run)

  constructor(flow: Flow, ctx: FlowContext) {
    this.flow = flow;
    this.ctx = ctx;

    this.dagRoot = d3dag.dratify()(flow.nodes);
  }

  static placeholder() {
    return new FlowRunner(Flow.placeholder(), {flows:{}, requests:{}, linkedValues: {}});
  }

  run(): Promise<any> {
    this.addLog(FlowRunnerLogLevel.VERBOSE, "Validating Nodes");
    // get the play node
    let playNode: (FlowDagNode | undefined) = undefined;
    for(let node of this.dagRoot.children) {
      if(node.id == FlowPlayNodeId) {
        playNode = node;
        break;
      }
    }
    if(playNode == undefined) {
      this.addLog(FlowRunnerLogLevel.ERROR, "Play Node Missing");
      this.addLog(FlowRunnerLogLevel.ERROR, "Validation Failed");
      return Promise.reject("Validation failed");
    }
    // validate all the nodes from the play node
    if(!this.validateNode(playNode)) {
      this.addLog(FlowRunnerLogLevel.ERROR, "Validation Failed");
      return Promise.reject("Validation failed");
    }
    // run the flow, starting from the play node
    this.addLog(FlowRunnerLogLevel.INFORMATION, "Running Flow");
    return this.runNode(playNode).finally(() => {
      this.addLog(FlowRunnerLogLevel.INFORMATION, "Finished Flow");
    });
  }

  validateNode(node: FlowDagNode) {
    let nodeSettings = this.flow.nodeSettingsMap[node.id] || {};
    let valid = true;

    this.addLog(FlowRunnerLogLevel.VERBOSE, "Validating " + nodeNamePrint(node.data.type, nodeSettings.name), node.id, FlowRunnerLogEntryTargetPane.LogViewer);

    // skip validation of this node and its children if its disabled
    if(nodeSettings.disabled) {
      return valid;
    }
  
    switch(node.data.type) {
      case FlowNodeType.Play: 
        // play node must have children
        if(node.children.length == 0) {
          this.addLog(FlowRunnerLogLevel.ERROR, "No nodes connected to Play node", node.id, FlowRunnerLogEntryTargetPane.PropertyEditor);
          valid = false;
        }
        break;
      case FlowNodeType.Request:
        if((nodeSettings as FlowNodeRequestSettings).requestId == undefined) {
          this.addLog(FlowRunnerLogLevel.ERROR, nodeNamePrint(node.data.type, nodeSettings.name) + " missing request", node.id, FlowRunnerLogEntryTargetPane.PropertyEditor);
          valid = false;
        }
        break;
      default:
        this.addLog(FlowRunnerLogLevel.ERROR, "Node Type '" + node.data.type + "' currently unsupported", node.id, FlowRunnerLogEntryTargetPane.PropertyEditor);
        valid = false;
    }
  
    // validate all the children, even if we already failed this will still log any issues with the children
    for(let child of node.children) {
      if(!this.validateNode(child)) valid = false;
    }
    return valid;
  }

  runNode(node: FlowDagNode, context: object = {}) {
    let nodeSettings = this.flow.nodeSettingsMap[node.id] || {};

    this.addLog(FlowRunnerLogLevel.VERBOSE, "Running " + nodeNamePrint(node.data.type, nodeSettings.name), node.id, FlowRunnerLogEntryTargetPane.LogViewer);

    // skip execution of this node and its children if its disabled
    if(nodeSettings.disabled) {
      this.addLog(FlowRunnerLogLevel.INFORMATION, "Skipping disabled " + nodeNamePrint(node.data.type, nodeSettings.name), node.id, FlowRunnerLogEntryTargetPane.PropertyEditor);
      return Promise.resolve();
    }

    // execute node
    let execPromise: Promise<any>;
    switch(node.data.type) {
      case FlowNodeType.Request:
        execPromise = this.runRequestNode(node, context).then((data) => {
          this.addLog(FlowRunnerLogLevel.INFORMATION, "Got results for " + nodeNamePrint(node.data.type, nodeSettings.name), node.id, FlowRunnerLogEntryTargetPane.ResultViewer);
          // save the result data
          this.addNodeResult(node.id, data);
          return Promise.resolve(data);
        }).catch((err) => {
          if(typeof err === "object") {
            // save the error as the result
            this.addNodeResult(node.id, err);
          }
          return Promise.reject(err);
        });
        break;
      default:
        execPromise = Promise.resolve();
    }

    //log if the promise fails, then propagate that failure
    execPromise = execPromise.catch((err) => {
      this.addLog(FlowRunnerLogLevel.ERROR, nodeNamePrint(node.data.type, nodeSettings.name) + " request failed, " + err, node.id, FlowRunnerLogEntryTargetPane.LogViewer);
      return Promise.reject(err);
    })

    // run any children
    if(node.children.length > 0) {
      execPromise = execPromise.then((data) => Promise.all(node.children.map((child) => {
        let subContext : {[index: string]: object} = { ...context };
        if(nodeSettings.name) {
          subContext[nodeSettings.name] = data;
        }
        return this.runNode(child, subContext);
      }, this)));
    }
    
    return execPromise;
  }

  runRequestNode(node: FlowDagNode, context: object) {
    let nodeSettings = this.flow.nodeSettingsMap[node.id] || {};
    let request = Request.getFromStore(this.ctx.requests, (nodeSettings as FlowNodeRequestSettings).requestId!);

    return request.sendRequest(nodeSettings.linkedValueData || {}, context);
  }

  addLog(level: FlowRunnerLogLevel, entry: string, nodeId?: string, targetPane?: FlowRunnerLogEntryTargetPane) {
    this.log.push({time: Date.now(), level, entry, nodeId, targetPane});
  }

  addNodeResult(nodeId: string, result: any) {
    if(this.results[nodeId] === undefined) {
      Vue.set(this.results, nodeId, []); // required by Vue for proper reactive changes
    }
    this.results[nodeId].push(result)
  }
}
