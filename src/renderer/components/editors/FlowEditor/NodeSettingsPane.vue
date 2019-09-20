<template>
  <el-row>
    <el-col :span="7">
      Node Options <br>
      <el-button v-tooltip="'Delete Node'" class="remove-btn right-header-btn" @click="deleteNode"><i class="mdi mdi-delete"/></el-button>
      <hr>
      <el-form label-width="60px" @submit.native.prevent="">
        <el-form-item label="Type">
          <el-input v-model="node.data.type" disabled/>
        </el-form-item>
        <el-form-item label="Name">
          <el-input v-model="value.name" :placeholder="node.data.type" :disabled="isPlayNode"/>
        </el-form-item>
        <el-form-item label="Enabled">
          <el-checkbox v-model="nodeSettingsEnabled" :disabled="isPlayNode"/>
        </el-form-item>
      </el-form>
    </el-col>
    <el-col :span="9" class="node-options">
      {{ node.data.type }} Options <br>
      <div v-if="nodeTypeSupportsLinkedValues" class="right-header-btn">
        <el-button v-tooltip="'No Linked Values Exposed'" v-if="nodeSettingsLinkedValues.length == 0" :disabled="true"><i class="mdi mdi-link"/></el-button>
        <el-badge v-else :value="nodeSettingsLinkedValues.length" class="item" type="primary">
          <el-button v-tooltip="'Edit Links'" @click="linkedValueEditorVisible = true"><i class="mdi mdi-link"/></el-button>
        </el-badge>
      </div>
      <hr>
      <el-form v-if="isRequestNode" label-width="60px" @submit.native.prevent="">
        <el-form-item label="Request">
          <el-select v-model="nodeSettingsRequestId">
            <el-option v-for="request in requests" :key="request.id" :label="request.name" :value="request.id"/>
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-else-if="isWSConnectNode" label-width="40px" @submit.native.prevent="">
        <el-form-item label="URL">
          <el-input v-model="value.wsconnectUrl" placeholder="ws://..." required>
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
          <el-select v-model="value.triggerAction" :disabled="isPlayNode" placeholder="Default">
            <el-option label="Run every time" value="everytime"/>
            <el-option label="Run once and cache" value="cache"/>
            <el-option label="Custom" value="custom"/>
          </el-select>
        </el-form-item>
        <el-form-item label="Linked Values Policy">
          <el-select v-model="value.linkPolicy" :disabled="isPlayNode" placeholder="Default">
            <el-option label="Wait for links" value="wait"/>
            <el-option label="Run on trigger" value="trigger"/>
            <el-option label="Custom" value="custom"/>
          </el-select>
        </el-form-item>
      </el-form>
    </el-col>
    <el-dialog
      :visible.sync="linkedValueEditorVisible"
      title="Linked Value Editor">
      <el-form label-width="120px" @submit.native.prevent="">
        <div v-for="link in nodeSettingsLinkedValues" :key="node.id + '_' + link.id" class="code-field">
          <span class="code-title">{{ link.name }}</span>
          <div class="code-editor-wrapper">
            <AceEditor
              v-model="value.linkedValueData[link.id]"
              class="code-editor"
              lang="javascript"
              theme="merbivore_soft"
              @init="linkedValueEditorInit"/>
            <div v-if="!value.linkedValueData[link.id]" class="code-editor-empty">
              <span>Enter a Javascript expression...</span>
            </div>
          </div>
        </div>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="linkedValueEditorVisible = false">Close</el-button>
      </span>
    </el-dialog>
  </el-row>
</template>

<script lang="ts">
  import { Vue, Component, Prop } from "vue-property-decorator"
  import isURL from "validator/lib/isURL";

  import { FlowContext, FlowNodeSettings, FlowNodeSleepSettings, FlowNodeRequestSettings, FlowNodeWSConnectSettings, Flow, FlowNodeType } from "@/model/Flow";
  import { dumpObjectStrings, DEFAULT_NOTIFY_OPTIONS } from "@/utils/utils";

  @Component({})
  export default class NodeSettingsPane extends Vue {
    @Prop(Object) value!: FlowNodeSettings
    @Prop(Object) flow!: Flow
    @Prop(Object) node!: any
    @Prop(Object) ctx!: FlowContext

    public linkedValueEditorVisible = false

    get requests() {
      return Object.values(this.ctx.requests);
    }

    get isPlayNode() { return this.node.data.type == FlowNodeType.Play}
    get isRequestNode() { return this.node.data.type == FlowNodeType.Request}
    get isWSConnectNode() { return this.node.data.type == FlowNodeType.WSConnect}
    get isAggregateNode() { return this.node.data.type == FlowNodeType.Aggregate}
    get isSplitNode() { return this.node.data.type == FlowNodeType.Split}
    get isSleepNode() { return this.node.data.type == FlowNodeType.Sleep}

    get nodeSettingsRequestId() { return (this.value as any).requestId; }
    set nodeSettingsRequestId(id) { Vue.set(this.value, "requestId", id); }

    get nodeSettingsSleep() { return (this.value as FlowNodeSleepSettings).sleep || 0; }
    set nodeSettingsSleep(sleep) { Vue.set(this.value, "sleep", sleep); }

    get nodeSettingsEnabled() { return !this.value.disabled; }
    set nodeSettingsEnabled(enabled) { Vue.set(this.value, "disabled", !enabled); }

    get nodeTypeSupportsLinkedValues() { return this.isRequestNode; }
    get nodeSettingsRequest() { return this.ctx.requests[(this.value as FlowNodeRequestSettings).requestId!]; }
    get nodeSettingsLinkedValues() {
      let links = [];
      let props = dumpObjectStrings(this.nodeSettingsRequest, ["response", "body"]);
      for(let prop of props) {
        if(this.ctx.linkedValues[prop] !== undefined && this.ctx.linkedValues[prop].linked) {
          links.push(this.ctx.linkedValues[prop])
        }
      }
      return links;
    }


    public linkedValueEditorInit(editor: any) {
      let customCompleters = [{
        getCompletions: (editor: any, session: any, pos: any, prefix: any, callback: any) => {
          // get the index of the token before the cursor
          let idStart = pos.column - prefix.length;
          let idIndex = undefined;
          for(let token of session.bgTokenizer.lines[pos.row]) {
            if(token.start === idStart) {
              idIndex = token.index - 1;
              break;
            }
            if(token.start === idStart - token.value.length) {
              idIndex = token.index;
              break;
            }
          }
          // disable autocomplete if there's a dot operator preceding the cursor
          if(idIndex !== undefined) {
            for(let i = idIndex; i >= 0; i--) {
              let token = session.bgTokenizer.lines[pos.row][i];
              if(token.type === "text" || token.type.startsWith("comment")) continue;
              if(token.value === ".") return;
              break;
            }
          }
          // populate the auto complete with the flow node names
          let nodeOptions = this.flow.nodes.map((node) => {
            let nodeSettings = this.flow.nodeSettingsMap[node.id];
            if(nodeSettings && nodeSettings.name)
              return {name: nodeSettings.name, value: nodeSettings.name, score: 1, meta: "flow node"};
            return undefined;
          }).filter((val) => val)

          nodeOptions.push({name: "$caller", value: "$caller", score: .5, meta: "context"});

          callback(null, nodeOptions);
        }
      }]

      editor.setOptions({
        minLines: 1,
        maxLines: 15,
        fontSize: "14px",
        showLineNumbers: false,
        enableBasicAutocompletion: customCompleters
      });
      editor.renderer.setScrollMargin(10, 10);
      editor.renderer.setPadding(20);
      editor.renderer.setShowGutter(false);
    }


    protected deleteNode() { this.$emit("delete-node"); }

    public testWSConnectUrl() {
      const url = (this.value as FlowNodeWSConnectSettings).wsconnectUrl;
      if(url === undefined || !isURL(url, {protocols: ["ws", "wss"], require_tld: false})) {
        this.$notify.error({...DEFAULT_NOTIFY_OPTIONS, title: "Invalid URL"});
        return;
      }
      // let connectSuccess = false;
      const ws = new WebSocket(url);
      ws.onopen = () => {
        ws.close();
        this.$notify.success({...DEFAULT_NOTIFY_OPTIONS, title: "Web Socket Connection Success"});
      };

      ws.onerror = () => {
        this.$notify.error({...DEFAULT_NOTIFY_OPTIONS, title: "Web Socket Connection Failure"});
      };
    }
  }
</script>

<style lang="scss" scoped>
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
  
  .code-field {
    display: flex;
    align-items: center;

    .code-title {
      padding: 10px;
    }
    .code-editor-wrapper {
      position: relative;
      flex-grow: 1;

      .code-editor-empty {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 25px;
        z-index: 10;

        display: flex;
        align-items: center;
        pointer-events: none;

        color: gray;
        font-style: italic;
      }
    }
  }
</style>