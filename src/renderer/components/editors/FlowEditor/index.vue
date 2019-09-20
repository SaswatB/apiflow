<template>
  <div class="flow-pane">
    <Split :gutter-size="2" direction="vertical">
      <SplitArea :size="53" :min-size="350">
        <FlowDragDropGraph ref="graph" v-model="value.nodes" @node-selected="nodeSelected" @edge-selected="edgeSelected"/>
      </SplitArea>
      <SplitArea :size="47">
        <div class="prop-editor elevated">
          <el-tabs v-model="activePropEditor" :tab-position="'left'">
            <!-- Flow Settings -->
            <el-tab-pane label="Flow Editor" name="flow-editor">
              <FlowSettingsPane @run-flow="runFlow" />
            </el-tab-pane>
            <!-- Flow Log -->
            <el-tab-pane label="Flow Log" name="results">
              <LogPane :log="flowRunner.log" @log-click="onLogClick" />
            </el-tab-pane>
            <!-- Node Editor -->
            <el-tab-pane v-if="isNodeEditor" label="Node Editor" name="node-editor" class="node-editor">
              <NodeSettingsPane v-model="nodeSettings" :flow="value" :node="selectedNode" :ctx="ctx" @delete-node="deleteSelection" />
            </el-tab-pane>
            <!-- Node Results -->
            <el-tab-pane v-if="isNodeEditor" label="Node Results" name="node-results">
              <AceEditor
                ref="nodeResultViewer"
                v-model="nodePrettyResult"
                disabled
                lang="javascript"
                theme="merbivore_soft"
                width="100%"
                height="100%"/>
            </el-tab-pane>
            <!-- Node Log -->
            <el-tab-pane v-if="isNodeEditor" label="Node Log" name="node-log">
              <LogPane :log="flowRunner.log" :node-id="selectedNode.id" />
            </el-tab-pane>
            <!-- Edge Editor -->
            <el-tab-pane v-if="isEdgeEditor" label="Edge Editor" name="edge-editor" class="edge-editor">
              <el-row>
                <el-col :span="12">
                  Edge Editor <br>
                  <el-button v-tooltip="'Delete Edge'" class="remove-btn right-header-btn" @click="deleteSelection"><i class="mdi mdi-delete"/></el-button>
                  <hr>
                  From {{ selectedEdge.source.data.type }} Node to {{ selectedEdge.target.data.type }} Node
                </el-col>
              </el-row>
            </el-tab-pane>
            <!-- Edge Log -->
            <el-tab-pane v-if="isEdgeEditor" label="Edge Log" name="edge-log">
              Edge Log
            </el-tab-pane>
          </el-tabs>
        </div>
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from "vue-property-decorator"
  import AceEditor from "vue2-ace-editor"
  import { js as beautify } from "js-beautify"

  import { FlowPlayNodeId, FlowContext, Flow } from "@/model/Flow"
  import { FlowRunnerLogEntryTargetPane, FlowRunnerLogEntry, FlowRunner } from "@/utils/FlowRunner"
  import { DEFAULT_NOTIFY_OPTIONS } from "@/utils/utils"

  import BlurredPopover from "@/components/standalone/BlurredPopover.vue"
  import FlowDragDropGraph from "@/components/editors/FlowDragDropGraph.vue"
  import FlowSettingsPane from "@/components/editors/FlowEditor/FlowSettingsPane.vue"
  import LogPane from "@/components/editors/FlowEditor/LogPane.vue"
  import NodeSettingsPane from "@/components/editors/FlowEditor/NodeSettingsPane.vue"

  @Component({ components: { AceEditor, BlurredPopover, FlowDragDropGraph, FlowSettingsPane, LogPane, NodeSettingsPane } })
  export default class FlowEditor extends Vue {
    @Prop(Object) value!: Flow
    @Prop(Object) ctx!: FlowContext

    public $refs!: Vue['$refs'] & {
      graph: FlowDragDropGraph,
      nodeResultViewer: any,
    };

    public propEditor = "none"
    public activePropEditor = "flow-editor"
    public selectedNode: any = {}
    public selectedEdge: any = {}
    public flowRunner = FlowRunner.placeholder()

    get graph() { return this.$refs.graph; }

    get isNodeEditor() { return this.propEditor == "node"; }
    get isEdgeEditor() { return this.propEditor == "edge"; }

    get isNodeActiveEditor() { return this.activePropEditor.startsWith("node-"); }
    get isEdgeActiveEditor() { return this.activePropEditor.startsWith("edge-"); }

    get nodeSettings() { 
      let s = this.value.nodeSettingsMap[this.selectedNode.id]; // TODO: look into doing migrations here if necessary
      if(s == undefined) {
        this.nodeSettings = { linkedValueData: {} };
        s = this.nodeSettings;
      }
      Vue.set(s, "linkedValueData", new Proxy(s.linkedValueData || {}, {
        get(target, name) { return target[name.toString()] || ""; }
      }));
      return s;
    }
    set nodeSettings(settings) { Vue.set(this.value.nodeSettingsMap, this.selectedNode.id, settings) }


    get nodePrettyResult() {
      if(this.flowRunner.results[this.selectedNode.id] != undefined)
        return beautify(JSON.stringify(this.flowRunner.results[this.selectedNode.id][0])); // TODO: support multiple results
      return "// No Data"
    }
    set nodePrettyResult(ignored) {}

    @Watch("activePropEditor")
    handleActivePropEditorChanged(val: string) {
      if(val === "node-results") {
        const ace = this.$refs.nodeResultViewer;
        if(ace) {
          ace.editor.setReadOnly(true);
        }
      }
    }

    public nodeSelected(node: any) {
      this.propEditor = "node";
      if(!this.isNodeActiveEditor) this.activePropEditor = "node-editor"
      this.selectedNode = node;
      this.selectedEdge = {};
    }

    public edgeSelected(edge: any) {
      this.propEditor = "edge";
      if(!this.isEdgeActiveEditor) this.activePropEditor = "edge-editor"
      this.selectedNode = {};
      this.selectedEdge = edge;
    }

    public clearSelection() {
      this.propEditor = "none";
      if(this.isNodeActiveEditor || this.isEdgeActiveEditor) 
        this.activePropEditor = "flow-editor";
      this.selectedNode = {};
      this.selectedEdge = {};
      this.graph.clearSelection(true);
    }

    public deleteSelection() {
      if(this.graph.deleteSelection()) {
        this.clearSelection();
      }
    }

    public onLogClick(logEntry: FlowRunnerLogEntry) {
      if(logEntry.nodeId === undefined) return;
      this.graph.selectNodeById(logEntry.nodeId);
      switch(logEntry.targetPane){
        case FlowRunnerLogEntryTargetPane.PropertyEditor:
          this.activePropEditor = "node-editor";
          break;
        case FlowRunnerLogEntryTargetPane.ResultViewer:
          this.activePropEditor = "node-results";
          break;
        case FlowRunnerLogEntryTargetPane.LogViewer:
          this.activePropEditor = "node-log"
          break;
      }
    }

    public runFlow() {
      let dagNode = this.graph.getDagNode(FlowPlayNodeId);
      if(dagNode == undefined) {
        this.$notify.error({...DEFAULT_NOTIFY_OPTIONS, title: "Unexpected error when trying to run flow", message: "Missing play node"});
        return;
      }
      this.flowRunner = new FlowRunner(this.value, this.ctx);
      this.flowRunner.run().catch((err) => {
        let message;
        if(err instanceof Error) {
          if(err.message) {
            message = err.message;
          } else {
            message = "An unknown error was thrown"
          }
        } else {
          message = err;
        }

        this.$notify.error({...DEFAULT_NOTIFY_OPTIONS, title: "Error occured while running flow", message});
      });
      this.activePropEditor = "results";
    }

  }
</script>

<style lang="scss">
  @import "@/style/mixins.scss";

  .flow-pane {
    height: 100%;

    .prop-editor {
      @include dark-container;
      width: calc(100% - 20px);
      height: calc(100% - 20px);
      margin: 10px;
      padding-right: 10px;

      #tab-results {
        transition: border-bottom .5s ease-in-out;
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, .25)
        }
      }

      #tab-node-editor, #tab-node-results, #tab-node-log,
      #tab-edge-editor, #tab-edge-log {
        animation: fadeIn .5s ease-in-out;
      }

      .right-header-btn {
        position: absolute;
        top: 0px;
        right: 0px;

        .el-badge__content {
          right: 2px;
          transform: unset;
          line-height: 15px;
          pointer-events: none;
        }
      }

      .el-tabs {
        height: 100%;
        padding: 10px 0;

        .el-tabs__header {
          width: 120px;
        }

        .el-tabs__content {
          height: 100%;
          display: flex;

          .el-tab-pane {
            height: 100%;
            width: 100%;
          }
        }
      }

      .el-row {
        height: 100%;
        display: flex;

        .el-col:first-child {
          border-left-width: 0;
        }
      }

      .el-col {
        height: 100%;
        padding: 10px;
        border-left: 1px solid rgba(255, 255, 255, .4);
        position: relative;
        hr {
          margin: 10px 0;
        }
      }
    }
  }
</style>
