<template>
  <div class="flow-pane">
    <Split :gutter-size="2" direction="vertical">
      <SplitArea :size="53" :min-size="350">
        <FlowDragDropGraph ref="graph" v-model="value.flowData" @node-selected="nodeSelected" @edge-selected="edgeSelected"/>
      </SplitArea>
      <SplitArea :size="47">
        <div class="prop-editor">
          <el-tabs v-model="activePropEditor" :tab-position="'left'">
            <!-- Execute Pane -->
            <el-tab-pane label="Execute" name="execute">
              Execute
              <el-button v-tooltip="'Run Flow'" class="exec-btn" @click="runFlow"><i class="mdi mdi-send"/></el-button>
            </el-tab-pane>
            <!-- Results Pane -->
            <el-tab-pane class="log-container" label="Flow Log" name="results">
              <BlurredPopover
                ref="addItemPopover"
                :width="200"
                :height="100"
                placement="top"
                popover-body-class="filter-popover">
                <el-select v-model="logLevelFilter">
                  <el-option label="Verbose" value="verbose"/>
                  <el-option label="Information" value="information"/>
                  <el-option label="Warning" value="warning"/>
                  <el-option label="Error" value="error"/>
                </el-select>
                <el-button v-tooltip="'Filter Log'" slot="reference" class="filter-btn" @click="showFilterLog"><i class="mdi mdi-filter"/></el-button>
              </BlurredPopover>
              <el-button v-tooltip="'Copy Log'" class="copy-btn" @click="copyLog()"><i class="mdi mdi-content-copy"/></el-button>
              <div class="log code">
                <span
                  v-for="(entry, index) in flowRunner.log"
                  :key="index"
                  :class="getClassFromLogLevel(entry.level) + (entry.nodeId !== undefined ? ' clickable' : '')"
                  class="entry"
                  @click="onLogClick(entry)">
                  {{ entry.time | moment(logTimeFormat) }}
                  <span class="entry-level">{{ getFormattedTagFromLogLevel(entry.level) }}</span>
                  {{ entry.entry }}
                </span>
              </div>
            </el-tab-pane>
            <!-- Node Editor -->
            <el-tab-pane v-if="isNodeEditor" label="Node Editor" name="node-editor" class="node-editor">
              <el-row>
                <el-col :span="7">
                  Node Options <br>
                  <el-button v-tooltip="'Delete Node'" class="remove-btn" @click="deleteSelection"><i class="mdi mdi-delete"/></el-button>
                  <hr>
                  <el-form label-width="60px" @submit.native.prevent="">
                    <el-form-item label="Type">
                      <el-input v-model="selectedNode.data.type" disabled/>
                    </el-form-item>
                    <el-form-item label="Name">
                      <el-input v-model="nodeSettings.name" :placeholder="selectedNode.data.type" :disabled="isPlayNode"/>
                    </el-form-item>
                    <el-form-item label="Enabled">
                      <el-checkbox v-model="nodeSettingsEnabled" :disabled="isPlayNode"/>
                    </el-form-item>
                  </el-form>
                </el-col>
                <el-col :span="9" class="node-options">
                  {{ selectedNode.data.type }} Options <br>
                  <hr>
                  <el-form v-if="isRequestNode" label-width="60px" @submit.native.prevent="">
                    <el-form-item label="Request">
                      <el-select v-model="nodeSettingsRequestId">
                        <el-option v-for="request in requests" :key="request.id" :label="request.name" :value="request.id"/>
                      </el-select>
                    </el-form-item>
                    {{ nodeSettingsRequestLinks }}
                  </el-form>
                  <el-form v-else-if="isWSConnectNode" label-width="40px" @submit.native.prevent="">
                    <el-form-item label="URL">
                      <el-input v-model="nodeSettings.wsconnectUrl" placeholder="ws://..." required>
                        <el-button v-tooltip="'Test Connection'" slot="append" @click="testWSConnectUrl"><i class="mdi mdi-test-tube"/></el-button>
                      </el-input>
                    </el-form-item>
                  </el-form>
                  <el-form v-else-if="isSleepNode" label-width="80px" @submit.native.prevent="">
                    <el-form-item label="Time (ms)">
                      <el-input-number v-model="nodeSettingsSleep" :min="0"/>
                    </el-form-item>
                  </el-form>
                  <div v-else class="muted no-options">No Options</div>
                </el-col>
                <el-col :span="8">
                  Execution Options <br>
                  <hr>
                  <el-form label-width="100px" @submit.native.prevent="">
                    <el-form-item label="Trigger Action">
                      <el-select v-model="nodeSettings.triggerAction" :disabled="isPlayNode" placeholder="Default">
                        <el-option label="Run every time" value="everytime"/>
                        <el-option label="Run once and cache" value="cache"/>
                        <el-option label="Custom" value="custom"/>
                      </el-select>
                    </el-form-item>
                    <el-form-item label="Link Policy">
                      <el-select v-model="nodeSettings.linkPolicy" :disabled="isPlayNode" placeholder="Default">
                        <el-option label="Wait for links" value="wait"/>
                        <el-option label="Run on trigger" value="trigger"/>
                        <el-option label="Custom" value="custom"/>
                      </el-select>
                    </el-form-item>
                  </el-form>
                </el-col>
              </el-row>
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
            <el-tab-pane v-if="isNodeEditor" class="log-container" label="Node Log" name="node-log">
              <div class="log code">
                <el-button v-tooltip="'Copy Log'" class="copy-btn" @click="copyLog(selectedNode.id)"><i class="mdi mdi-content-copy"/></el-button>
                <span
                  v-for="(entry, index) in flowRunner.log"
                  v-if="entry.nodeId === selectedNode.id"
                  :key="index"
                  :class="getClassFromLogLevel(entry.level)"
                  class="entry">
                  {{ entry.time | moment(logTimeFormat) }}
                  <span class="entry-level">{{ getFormattedTagFromLogLevel(entry.level) }}</span>
                  {{ entry.entry }}
                </span>
              </div>
            </el-tab-pane>
            <!-- Edge Editor -->
            <el-tab-pane v-if="isEdgeEditor" label="Edge Editor" name="edge-editor" class="edge-editor">
              <el-row>
                <el-col :span="12">
                  Edge Editor <br>
                  <el-button v-tooltip="'Delete Edge'" class="remove-btn" @click="deleteSelection"><i class="mdi mdi-delete"/></el-button>
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
  import { getModule } from "vuex-module-decorators"
  import AceEditor from "vue2-ace-editor"
  import isURL from "validator/lib/isURL"
  const beautify = require("js-beautify").js

  import { ProcedureLinkedValue, ProcedureMap } from "@/model/Procedure"
  import { FlowNodeType, FlowPlayNodeId, FlowNodeRequestSettings, FlowNodeSleepSettings, FlowContext, Flow } from "@/model/Flow"
  import { Request } from "@/model/Request"
  import { FlowRunnerLogLevel, FlowRunnerLogEntryTargetPane, FlowRunnerLogEntry, FlowRunner } from "@/utils/FlowRunner"
  import { dumpObjectStrings } from "@/utils/utils"

  import BlurredPopover from "@/components/standalone/BlurredPopover"
  import FlowDragDropGraph from "@/components/editors/FlowDragDropGraph.vue"

  @Component({ components: { AceEditor, BlurredPopover, FlowDragDropGraph } })
  export default class FlowEditor extends Vue {
    @Prop(Object) value!: Flow
    @Prop(Object) ctx!: FlowContext

    logTimeFormat = "HH:mm:ss.SSS"
    logFullTimeFormat = "L-HH:mm:ss.SSS" // TODO: add full date format as an option when viewing logs
    logLevelFilter = "verbose" // TODO: persist
    propEditor = "none"
    activePropEditor = "execute"
    selectedNode: any = {}
    selectedEdge: any = {}
    flowRunner = FlowRunner.placeholder()

    get requests() {
      let reqs = []
      for(let id in this.ctx.requests) {
        if(this.ctx.requests.hasOwnProperty(id)) reqs.push({name:this.ctx.requests[id].name, id})
      }
      return reqs
    }

    get graph() { return this.$refs.graph as FlowDragDropGraph; }

    get isNodeEditor() { return this.propEditor == "node"; }
    get isEdgeEditor() { return this.propEditor == "edge"; }

    get isPlayNode() { return this.selectedNode.data.type == FlowNodeType.Play}
    get isRequestNode() { return this.selectedNode.data.type == FlowNodeType.Request}
    get isWSConnectNode() { return this.selectedNode.data.type == FlowNodeType.WSConnect}
    get isAggregateNode() { return this.selectedNode.data.type == FlowNodeType.Aggregate}
    get isSplitNode() { return this.selectedNode.data.type == FlowNodeType.Split}
    get isSleepNode() { return this.selectedNode.data.type == FlowNodeType.Sleep}

    get nodeSettings() { 
      let s = this.value.flowSettings[this.selectedNode.id];
      if(s == undefined) {
        this.nodeSettings = {}
        s = this.nodeSettings;
      }
      return s;
    }
    set nodeSettings(settings) { Vue.set(this.value.flowSettings, this.selectedNode.id, settings) }

    get nodeSettingsRequest() { return this.ctx.requests[(this.nodeSettings as FlowNodeRequestSettings).requestId!]; }
    get nodeSettingsRequestLinks() {
      let links = [];
      let props = dumpObjectStrings(this.nodeSettingsRequest, ["response", "jsonPayload"]);
      for(let prop of props) {
        if(this.ctx.linkedValues[prop] !== undefined && this.ctx.linkedValues[prop].linked) {
          links.push(this.ctx.linkedValues[prop])
        }
      }
      return links;
    }
    get nodeSettingsRequestId() { return (this.nodeSettings as any).requestId; }
    set nodeSettingsRequestId(id) { Vue.set(this.nodeSettings, "requestId", id); }

    get nodeSettingsSleep() { return (this.nodeSettings as FlowNodeSleepSettings).sleep || 0; }
    set nodeSettingsSleep(sleep) { Vue.set(this.nodeSettings, "sleep", sleep); }

    get nodeSettingsEnabled() { return !this.nodeSettings.disabled; }
    set nodeSettingsEnabled(enabled) { Vue.set(this.nodeSettings, "disabled", !enabled); }

    get nodePrettyResult() {
      if(this.flowRunner.results[this.selectedNode.id] != undefined)
        return beautify(JSON.stringify(this.flowRunner.results[this.selectedNode.id][0])); // TODO: support multiple results
      return "// No Data"
    }
    set nodePrettyResult(ignored) {}

    @Watch("activePropEditor")
    handleActivePropEditorChanged(val: string) {
      if(val === "node-results")
        (this.$refs.nodeResultViewer as any).editor.setReadOnly(true);
    }

    nodeSelected(node: any) {
      this.propEditor = "node";
      if(!this.activePropEditor.startsWith("node-")) this.activePropEditor = "node-editor"
      this.selectedNode = node;
      this.selectedEdge = {};
    }

    edgeSelected(edge: any) {
      this.propEditor = "edge";
      if(!this.activePropEditor.startsWith("edge-")) this.activePropEditor = "edge-editor"
      this.selectedNode = {};
      this.selectedEdge = edge;
    }

    clearSelection() {
      this.propEditor = "none";
      this.selectedNode = {};
      this.selectedEdge = {};
      this.graph.clearSelection(true);
    }

    deleteSelection() {
      if(this.graph.deleteSelection()) {
        this.clearSelection();
      }
    }

    getClassFromLogLevel(level: FlowRunnerLogLevel) {
      switch(level) {
        case FlowRunnerLogLevel.ERROR:
          return "error-entry";
        case FlowRunnerLogLevel.WARNING:
          return "warning-entry";
        case FlowRunnerLogLevel.INFORMATION:
          return "information-entry";
        case FlowRunnerLogLevel.VERBOSE:
          return "verbose-entry";
      }
    }

    getFormattedTagFromLogLevel(level: FlowRunnerLogLevel) {
      switch(level) {
        case FlowRunnerLogLevel.ERROR:
          return "ERR ";
        case FlowRunnerLogLevel.WARNING:
          return "WARN";
        case FlowRunnerLogLevel.INFORMATION:
          return "INFO";
        case FlowRunnerLogLevel.VERBOSE:
          return "VRBS";
      }
    }

    copyLog(filterNodeId?: string) {
      let text = "";
      for(let entry of this.flowRunner.log) {
        if(filterNodeId !== undefined && entry.nodeId != filterNodeId) continue;

        text += (this as any).$moment(entry.time).format(this.logFullTimeFormat) + " " +
          this.getFormattedTagFromLogLevel(entry.level) + " " +
          entry.entry + "\n";
      }
      (navigator as any).clipboard.writeText(text);
      this.$notify({title: "Log Copied", message: "", type: 'success'});
    }

    showFilterLog(event: any) {
      event.stopPropagation();
      // setTimeout(() => {this.$refs.addItemPopoverTextbox.focus()}, 150);
    }

    onLogClick(logEntry: FlowRunnerLogEntry) {
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

    runFlow() {
      let dagNode = this.graph.getDagNode(FlowPlayNodeId);
      if(dagNode == undefined) {
        this.$notify.error({title: "Unexpected error when trying to run flow", message: "Missing play node"});
        return;
      }
      this.flowRunner = new FlowRunner(this.value, this.ctx);
      this.flowRunner.run().catch((err) => {
        console.log("err", err)
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

        this.$notify.error({title: "Error occured while running flow", message});
      });
      console.log("runner", this.flowRunner);
      this.activePropEditor = "results";
    }

    testWSConnectUrl() {
      const url = (this.nodeSettings as any).wsconnectUrl;
      if(url === undefined || !isURL(url, {protocols: ["ws", "wss"], require_tld: false})) {
        this.$notify.error({title: "Invalid URL", message: ""});
        return;
      }
      let connectSuccess = false;
      const ws = new WebSocket(url);
      ws.onopen = () => {
        ws.close();
        this.$notify({title: "Web Socket Connection Success", message: "", type: 'success'});
      };

      ws.onerror = () => {
        this.$notify.error({title: "Web Socket Connection Failure", message: ""});
      };
    }
  }
</script>

<style lang="scss">
  .flow-pane {
    height: 100%;

    .prop-editor {
      width: 100%;
      height: 100%;
      padding: 0 10px;
      background-color: rgba(0,0,0,.2);

      .node-editor, .edge-editor {
        height: 100%;
        position: relative;
      }

      .node-options {
        display: flex;
        flex-direction: column;

        .no-options {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .log-container {
        position: relative;

        .filter-btn {
          position: absolute;
          right: 60px;
          top: 10px;
          padding: 10px;
        }

        .copy-btn {
          position: absolute;
          right: 20px;
          top: 10px;
          padding: 10px;
        }
      }

      .log {
        background-color: #000a12;
        padding: 15px 30px;
        height: 100%;
        font-size: 14px;
        overflow-y: auto; // TODO: replace with vuescroll
        
        .entry {
          display: flex;
          padding: 3px;

          &.clickable {
            cursor: pointer;

            &:before {
              content: "·";
              margin-left: -10.406px;
              color: white;
              padding-right: 2px;
            }
            &:hover {
              background-color: #ffffff3d;
            }
          }

          .entry-level {
            font-weight: 800;
            min-width: 40px;
            margin-left: 10px;
            display: inline-block;
          }

          &.error-entry {
            color: red;
          }
          &.warning-entry {
            color: yellow;
          }
          &.information-entry {
            color: white;
          }
          &.verbose-entry {
            color: #5bd9f1;
          }
        }
      }

      .remove-btn {
        position: absolute;
        top: 0px;
        right: 0px;;
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
        border-left: 1px solid #ffffff61;
        position: relative;
        hr {
          margin: 10px 0;
        }
      }
    }
  }
</style>
