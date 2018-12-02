<template>
  <div class="frame">
    <Split :gutter-size="8">
      <!-- TODO: limit and persist split -->
      <!-- Sidebar -->
      <SplitArea :size="25">
        <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }" class="sidebar">
          <div class="sidebar-content">
            <el-select v-model="currentProject" placeholder="Project">
              <el-option v-for="item in projects" :key="item.value" :label="item.label" :value="item.value"/>
            </el-select>
            <el-collapse v-model="activeTrees">
              <SideTreeBrowser
                ref="flowTreeBrowser"
                v-model="flowTree"
                item-icon="mdi-vector-polyline"
                title="Flows"
                item-name="Flow"
                @add-item="addFlow"
                @item-selected="flowSelected"/>
              <SideTreeBrowser
                ref="requestTreeBrowser"
                v-model="requestTree"
                item-icon="mdi-web"
                title="Requests"
                item-name="Request"
                @add-item="addRequest"
                @item-selected="requestSelected"/>
            </el-collapse>
          </div>
        </vue-scroll>
      </SplitArea>
      <!-- Editor -->
      <SplitArea :size="75">
        <div class="content">
          <FlowEditor v-if="editorType == 'flow'" v-model="flowEdit"/>
          <RequestEditor v-if="editorType == 'request'" v-model="requestEdit"/>
        </div>
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Watch } from 'vue-property-decorator'
  import { getModule } from 'vuex-module-decorators'
  import { v4 as uuidv4 } from 'uuid';
  // import clonedeep from 'lodash/cloneDeep';
  const clonedeep = require('lodash.clonedeep')

  import { Procedure, ProcedureMap, ProcedureFolderItemType, ProcedureRootFolderName, ProcedureFolderMap } from '../model/Procedure'
  import { Request } from '../model/Request'
  import Procedures from '../store/modules/Procedures' // TODO: fix reference to use @
  import Counter from '../store/modules/Counter'

  import SideTreeBrowser from './SideTreeBrowser.vue'
  import RequestEditor from './editors/RequestEditor.vue'
  import FlowEditor from './editors/FlowEditor.vue'

  function mapToTree(map: ProcedureMap, folders:ProcedureFolderMap, folderName:string = ProcedureRootFolderName): Array<object> {
    const arr = [];
    for(let i in folders[folderName]) {
      const id = folders[folderName][i].id;
      switch(folders[folderName][i].type) {
        case ProcedureFolderItemType.Procedure:
          arr.push({ label: map[id].name, id });
          break;
        case ProcedureFolderItemType.Folder:
          arr.push({ label: id, id, children: mapToTree(map, folders, id) });
          break;
      }
    }
    return arr;
  }

  @Component({ components: { SideTreeBrowser, RequestEditor, FlowEditor } })
  export default class MainFrame extends Vue {
    ProceduresStore = getModule(Procedures, this.$store)
    CounterStore = getModule(Counter, this.$store)
    projects = [ //TODO: persist
      { value: 'Project1', label: 'Project1' }
    ]
    currentProject = 'Project1' //TODO: persist
    activeTrees = ['Flows', 'Requests'] //TODO: persist
    flowTree: Array<object> = []
    requestTree: Array<object> = []
    editorType = ''
    flowEdit:Procedure = {id:'0', name:'0'}
    requestEdit:Request = Request.placeholder()

    created() {
      this.CounterStore.incrementCounter();
      this.refreshFlowTree();
      this.refreshRequestTree()
    }

    get flowsCommitId() { return this.ProceduresStore.flowsCommitId; }
    get requestsCommitId() { return this.ProceduresStore.requestsCommitId; }

    // @Watch('flowsCommitId')
    refreshFlowTree() {
      this.flowTree = mapToTree(this.ProceduresStore.flows, this.ProceduresStore.flowFolders);
    }
    // @Watch('requestsCommitId')
    refreshRequestTree() {
      this.requestTree = mapToTree(this.ProceduresStore.requests, this.ProceduresStore.requestFolders);
    }
    @Watch('flowEdit', {deep: true})
    saveFlowEdit() { 
      this.ProceduresStore.saveFlow(this.flowEdit);
    }
    @Watch('requestEdit', {deep: true})
    saveRequestEdit() {
      console.log("e", this.requestEdit)
      this.ProceduresStore.saveRequest(this.requestEdit);
    }

    addFlow(name: string) {
      let id = "Flow_"+uuidv4();
      this.ProceduresStore.saveFlow({name, id});
      this.ProceduresStore.addFlowToFolder({flowId: id, folderName: ProcedureRootFolderName});

      // TODO: fix and replace with nextTick
      setTimeout(() => { this.refreshFlowTree(); }, 100);
      setTimeout(() => { (this.$refs.flowTreeBrowser as any).selectItem(id); }, 150);
    }
    addRequest(name: string) {
      let id = "Request_"+uuidv4();
      this.ProceduresStore.saveRequest(Request.newRequest(id, name));
      this.ProceduresStore.addRequestToFolder({requestId: id, folderName: ProcedureRootFolderName});

      // TODO: fix and replace with nextTick
      setTimeout(() => { this.refreshRequestTree(); }, 100);
      setTimeout(() => { (this.$refs.requestTreeBrowser as any).selectItem(id); }, 150);
    }
    flowSelected(id: string) {
      this.flowEdit = clonedeep(this.ProceduresStore.flows[id]);
      this.editorType = 'flow';
    }
    requestSelected(id: string) {
      this.requestEdit = Request.migrate(clonedeep(this.ProceduresStore.requests[id]));
      this.editorType = 'request';
    }
  }
</script>

<style lang="scss">
  .frame {
    height: calc(100% - 30px);

    .sidebar {
      background-color: rgba(0, 0, 0, .2);

      .sidebar-content {
        padding: 20px;
      }

      .el-select {
        width: 100%;
        margin-bottom: 20px;

        input {
          background-color: transparent;
          color: white;
        }
      }
    }

    .content {
      height: 100%;
    }

    .gutter {
      background-image: unset;
      background-color: unset;
    }
  }
</style>
