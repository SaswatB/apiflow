import { v4 as uuidv4 } from 'uuid'

export interface Procedure {
  [index: string]: any
  id: string
  name: string
}

export interface ProcedureLinkedValue {
  id: string,
  value: string,
  linked: boolean
}

export function newLinkedValueId() {
  return "LV_"+uuidv4();
}
  
export interface ProcedureMap<T extends Procedure = Procedure> {
  [index: string]: T
}

export enum ProcedureFolderItemType {
  Procedure, Folder
}

export interface ProcedureFolderItem {
  id: string
  type: ProcedureFolderItemType
}

//array of procedure ids
export interface ProcedureFolder extends Array<ProcedureFolderItem> {}

export const ProcedureRootFolderName = "_root_95ec7b9b-60cc-4f52-9dcf-c75b6f2cf0df"

export interface ProcedureFolderMap {
  [index: string]: ProcedureFolder
  [ProcedureRootFolderName]: ProcedureFolder
}
