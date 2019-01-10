import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators" 
import { onRenderer } from "@/../renderer/utils/utils"
import { Procedure, ProcedureLinkedValue, ProcedureMap, ProcedureFolderItemType, ProcedureFolder, ProcedureRootFolderName, ProcedureFolderMap } from "@/../renderer/model/Procedure"
import { FlowData, Flow } from "@/../renderer/model/Flow"
import { RequestData, Request } from "@/../renderer/model/Request"

@Module(onRenderer({ name: "procedures" }))
export default class Procedures extends VuexModule {
  // TODO: implement projects
  flows: ProcedureMap<FlowData> = {}
    flowsCommitId = 0
  flowFolders: ProcedureFolderMap = { [ProcedureRootFolderName]: [] }

  requests: ProcedureMap<RequestData> = {}
    requestsCommitId = 0
  requestFolders: ProcedureFolderMap = { [ProcedureRootFolderName]: [] }

  linkedValues: {[index: string]: ProcedureLinkedValue} = {}

  openProcedure = ""


  @Mutation _addFlowToFolder({flowId, folderName}: {flowId: string, folderName: string}) { this.flowFolders[folderName].push({id: flowId, type: ProcedureFolderItemType.Procedure}) }
  @Mutation _addRequestToFolder({requestId, folderName}: {requestId: string, folderName: string}) { this.requestFolders[folderName].push({id: requestId, type: ProcedureFolderItemType.Procedure}) }

  @Mutation _saveFlow(flow: Flow) { this.flows[flow.id] = flow; this.flowsCommitId++; }
  @Mutation _saveRequest(request: Request) { this.requests[request.id] = request; this.requestsCommitId++; }
  @Mutation _saveLink(link: ProcedureLinkedValue) { this.linkedValues[link.id] = link; }

  @Mutation _deleteFlow(id: string) { delete this.flows[id]; this.flowsCommitId++; }
  @Mutation _deleteRequest(id: string) { delete this.requests[id]; this.requestsCommitId++; }
  @Mutation _deleteLink(id: string) { delete this.linkedValues[id]; }

  @Mutation _setOpenProcedure(procedure: string) { this.openProcedure = procedure }

  
  @Action({commit: "_addFlowToFolder"}) addFlowToFolder({flowId, folderName}: {flowId: string, folderName: string}) { return {flowId, folderName} }
  @Action({commit: "_addRequestToFolder"}) addRequestToFolder({requestId, folderName}: {requestId: string, folderName: string}) { return {requestId, folderName} }

  @Action({commit: "_saveFlow"}) saveFlow(flow: Flow) { return flow }
  @Action({commit: "_saveRequest"}) saveRequest(request: Request) { return request }
  @Action({commit: "_saveLink"}) saveLink(link: ProcedureLinkedValue) { return link }

  @Action({commit: "_deleteFlow"}) deleteFlow(id: string) { return id }
  @Action({commit: "_deleteRequest"}) deleteRequest(id: string) { return id }
  @Action({commit: "_deleteLink"}) deleteLink(id: string) { return id }


  @Action({commit: "_setOpenProcedure"}) setOpenProcedure(procedure: string) { return procedure }
}
