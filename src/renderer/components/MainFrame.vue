<template>
  <div class="frame">
    <Split :gutter-size="2">
      <!-- TODO: limit and persist split -->
      <!-- Sidebar -->
      <SplitArea :size="25" :min-size="200">
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
          <transition name="fade">
            <FlowEditor
              v-if="editorType == 'flow'"
              ref="flowEditor"
              v-model="flowEdit"
              :ctx="flowCtx"
              class="editor"/>
          </transition>
          <transition name="fade">
            <RequestEditor v-if="editorType == 'request'" ref="requestEditor" v-model="requestEdit" class="editor"/>
          </transition>
        </div>
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"
  import { v4 as uuidv4 } from "uuid";

  import { ProcedureRootFolderName } from "@/model/Procedure"
  import { Flow, FlowContext } from "@/model/Flow"
  import { Request } from "@/model/Request"
  import Procedures from "@/store/modules/Procedures" // TODO: fix reference to use @
  import Counter from "@/store/modules/Counter"
  import { mapToTree } from "@/utils/utils"

  import SideTreeBrowser from "@/components/SideTreeBrowser.vue"
  import RequestEditor from "@/components/editors/RequestEditor.vue"
  import FlowEditor from "@/components/editors/FlowEditor.vue"

  @Component({ components: { SideTreeBrowser, RequestEditor, FlowEditor } })
  export default class MainFrame extends Vue {
    ProceduresStore = getModule(Procedures, this.$store)
    CounterStore = getModule(Counter, this.$store)
    projects = [ //TODO: persist
      { value: "Project1", label: "Project1" }
    ]
    currentProject = "Project1" //TODO: persist
    activeTrees = ["Flows", "Requests"] //TODO: persist
    flowTree: Array<object> = []
    requestTree: Array<object> = []
    editorType = ""
    flowEdit: Flow = Flow.placeholder()
    flowCtx: FlowContext = {flows: this.ProceduresStore.flows, requests: this.ProceduresStore.requests, linkedValues: this.ProceduresStore.linkedValues}
    requestEdit: Request = Request.placeholder()

    created() {
      this.CounterStore.incrementCounter();
      this.refreshFlowTree();
      this.refreshRequestTree()
    }

    get flowsCommitId() { return this.ProceduresStore.flowsCommitId; }
    get requestsCommitId() { return this.ProceduresStore.requestsCommitId; }

    // @Watch("flowsCommitId")
    refreshFlowTree() {
      this.flowTree = mapToTree(this.ProceduresStore.flows, this.ProceduresStore.flowFolders);
    }
    // @Watch("requestsCommitId")
    refreshRequestTree() {
      this.requestTree = mapToTree(this.ProceduresStore.requests, this.ProceduresStore.requestFolders);
    }
    @Watch("flowEdit", {deep: true})
    handleFlowEditChanged() {
      this.ProceduresStore.saveFlow(this.flowEdit);
    }
    @Watch("requestEdit", {deep: true})
    handleRequestEditChanged() {
      this.ProceduresStore.saveRequest(this.requestEdit);
    }

    addFlow(name: string) {
      let id = "Flow_"+uuidv4();
      this.ProceduresStore.saveFlow(Flow.newFlow(id, name));
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
      if(this.$refs.flowEditor) (this.$refs.flowEditor as any).clearSelection();
      this.flowEdit = Flow.getFromStore(this.ProceduresStore.flows, id);
      this.editorType = "flow";
    }
    requestSelected(id: string) {
      if(this.$refs.requestEditor) (this.$refs.requestEditor as any).prepareTransition();
      this.requestEdit = Request.getFromStore(this.ProceduresStore.requests, id);
      this.editorType = "request";
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
      overflow: hidden;
      position: relative;
      .editor {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity .3s;
  }
  .fade-enter, .fade-leave-to {
    opacity: 0;
  }
</style>
