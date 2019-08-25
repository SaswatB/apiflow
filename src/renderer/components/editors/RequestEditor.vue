<template>
  <div class="request-pane">
    <Split :gutter-size="12">
      <!-- TODO: limit and persist split -->
      <SplitArea :size="50">
        <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }">
          <div ref="requestBar" class="request-bar">
            <el-input v-model="value.url" placeholder="URL" required>
              <el-select slot="prepend" v-model="value.method" placeholder="Method">
                <el-option v-for="item in methodOptions" :key="item" :label="item" :value="item"/>
              </el-select>
              <el-button v-tooltip="'Send Request'" slot="append" @click="sendRequest"><i class="mdi mdi-send"/></el-button>
            </el-input>
          </div>
          <el-collapse v-model="activeForms" class="request-form">
            <!-- Authentication Form -->
            <MorphingCollapse ref="authForm" :sub-item-count="3" :collapse-item-name="authFormName">
              <template slot="select">
                <el-select v-model="value.authType" :class="authenticationTypeIsNone ? 'none' : ''" placeholder="Type" @change="autoOpenAuthenticationPane">
                  <el-option v-for="item in authenticationOptions" :key="item" :label="item" :value="item"/>
                </el-select>
              </template>
              <template slot="subSlot1">
                <div v-if="authenticationTypeIsNone" class="muted">No Authentication Type Selected</div>
              </template>
              <template slot="subSlot2">
                <div v-if="authenticationTypeIsSimple">
                  <el-form @submit.native.prevent="">
                    <el-form-item>
                      <StoredLinkedInput :link-id="value.authSimpleUsername" link-name="Auth Username" field-name="Username" required/>
                    </el-form-item>
                    <el-form-item>
                      <StoredLinkedInput :link-id="value.authSimplePassword" link-name="Auth Password" field-name="Password" required/>
                    </el-form-item>
                  </el-form>
                </div>
              </template>
              <template slot="subSlot3">
                <div v-if="authenticationTypeIsToken"><StoredLinkedInput :link-id="value.authToken" link-name="Auth Token" field-name="Token" required/></div>
              </template>
            </MorphingCollapse>
            <!-- Headers Form -->
            <el-collapse-item ref="headerForm" :name="headersFormName" :title="headersFormName" class="header-form">
              <div v-for="header in value.headers" :key="header.key" class="header-form-row">
                <el-form :inline="true" @submit.prevent="">
                  <StoredLinkedInput :link-id="header.name" :link-name="'Header ' + header.key + ' Name'" field-name="Name" required/>
                  <StoredLinkedInput :link-id="header.value" :link-name="'Header ' + header.key + ' Value'" field-name="Value" required/>
                  <el-button class="remove-btn" @click="removeHeader(header.key)"><i class="mdi mdi-minus"/></el-button>
                </el-form>
              </div>
              <el-button class="add-btn" @click="addHeader"><i class="mdi mdi-plus"/></el-button>
            </el-collapse-item>
            <!-- Payload Form -->
            <MorphingCollapse ref="payloadForm" :sub-item-count="5" :collapse-item-name="payloadFormName">
              <template slot="select">
                <el-select v-model="value.bodyType" :class="bodyTypeIsNone ? 'none' : ''" placeholder="Type">
                  <el-option v-for="item in payloadOptions" :key="item" :label="item" :value="item"/>
                </el-select>
              </template>
              <template slot="subSlot1">
                <div v-if="bodyTypeIsNone" class="muted">No Body Type Selected</div>
              </template>
              <template slot="subSlot2">
                <div v-if="bodyTypeIsRaw">
                  <textarea 
                    v-model="value.body"
                    class="body-editor"/>
                </div>
              </template>
              <template slot="subSlot3">
                <div v-if="bodyTypeIsForm">
                  <textarea 
                    v-model="value.body"
                    class="body-editor"/>
                </div>
              </template>
              <template slot="subSlot4">
                <div v-if="bodyTypeIsJSON">
                  <AceEditor
                    ref="jsonPayloadEditor"
                    v-model="value.body"
                    lang="javascript"
                    theme="merbivore_soft"
                    width="100%"
                    height="300"/>
                </div>
              </template>
            </MorphingCollapse>
          </el-collapse>
        </vue-scroll>
      </SplitArea>
      <SplitArea :size="50">
        <AceEditor
          ref="responseViewer"
          v-model="prettyResponse"
          disabled
          lang="javascript"
          theme="merbivore_soft"
          width="100%"
          height="100%"/>
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"
  import AceEditor from "vue2-ace-editor"
  import isURL from "validator/lib/isURL"
  import isJSON from "validator/lib/isJSON"
  import difference from "lodash/difference"
  import { js as beautify } from "js-beautify"
  import parseCurl from "parse-curl"

  import "brace"
  import "brace/ext/language_tools"
  import "brace/mode/javascript"
  import "brace/theme/merbivore_soft"
  import "brace/snippets/javascript"

  import {  newLinkedValueId } from "@/model/Procedure"
  import { RequestMethod, RequestAuthenticationType, RequestBodyType, getBodyTypes, Request } from "@/model/Request"
  import Procedures from "@/store/modules/Procedures"

  import StoredLinkedInput from "@/components/StoredLinkedInput.vue"
  import MorphingCollapse from "@/components/standalone/MorphingCollapse.tsx"

  import { sendRequest } from "@/utils/requestUtils"
  import { pulse, parseString } from "../../utils/utils";

  @Component({ components: { AceEditor, StoredLinkedInput, MorphingCollapse } })
  export default class RequestEditor extends Vue {
    @Prop(Object) value!: Request
    
    ProceduresStore = getModule(Procedures, this.$store)
    activeForms:Array<string> = []
    authFormName = "Authentication"
    headersFormName = "Headers"
    payloadFormName = "Payload"
    jsonPayloadEditorOptions = {
      tabSize: 4,
      mode: "text/javascript",
      theme: "base16-dark",
      lineNumbers: true,
      line: true,
      placeholder: "JSON Body"
    }
    transitionClone?: Node
    zIndex = 10000
    
    get method() { return this.value.method }
    get methodOptions() { return Object.keys(RequestMethod).map(k => RequestMethod[k as any]); }

    get authenticationTypeIsNone() { return this.value.authType === RequestAuthenticationType.None }
    get authenticationTypeIsSimple() { return this.value.authType === RequestAuthenticationType.Basic }
    get authenticationTypeIsToken() { return this.value.authType === RequestAuthenticationType.Bearer }
    get authenticationOptions() { return Object.keys(RequestAuthenticationType).map(k => RequestAuthenticationType[k as any]); }

    get bodyTypeIsNone() { return this.value.bodyType === RequestBodyType.None }
    get bodyTypeIsRaw() { return this.value.bodyType === RequestBodyType.Raw }
    get bodyTypeIsForm() { return this.value.bodyType === RequestBodyType.Form }
    get bodyTypeIsJSON() { return this.value.bodyType === RequestBodyType.JSON }
    get payloadOptions() { return this.method != undefined ? getBodyTypes(this.method) : [RequestBodyType.None]; }

    get prettyResponse() { return beautify(JSON.stringify(this.value.response)) }
    set prettyResponse(ignored) {}


    mounted() {
      (this.$refs.responseViewer as any).editor.setReadOnly(true);
    }


    @Watch("method")
    handleMethodChanged() { 
      // reset payload type if its not supported for the set method
      if(this.method !== RequestMethod.Post) {
        this.value.bodyType = RequestBodyType.None;
      }
    }

    @Watch("activeForms")
    handleFormOpenClose(newVal:Array<string>, oldVal:Array<string>) {
      let diff = difference(newVal, oldVal);
      if(diff.length == 1) {
        // auto focus the json editor if its collapse pane was opened
        if(diff[0] == this.payloadFormName && this.bodyTypeIsJSON) {
          (this.$refs.jsonPayloadEditor as any).editor.focus();
        }
      }
    }

    // @Watch("value")
    // handleValueChanged() {
    //   // if(this.transitionClone == undefined) return;
    //   // let element = (this.transitionClone as HTMLElement);
    //   // this.transitionClone = undefined;
    //   // //push away the clone
    //   // element.style.animation = "push-right 500ms 1 forwards cubic-bezier(.5,0,1,.5)";
    //   // //remove the clone after the animation
    //   // setTimeout(() => {
    //   //   this.$el.parentElement!.removeChild(element);
    //   // }, 750);
    // }

    @Watch("value", { deep: true })
    handleValuePropChanged() {
      // if a curl command was pasted in the url box, process it and replace the current request
      if (this.value.url && this.value.url.trim().toLowerCase().startsWith('curl ')) {
        const cmd = parseCurl(this.value.url);
        this.value.url = cmd.url;
        this.value.method = parseString(RequestMethod, cmd.method) || RequestMethod.Get;
        this.value.headers = Object.entries(cmd.header).map(([name, value], key) => ({ key, name, value: value || '' }));
        if (cmd.body) {
          // simple check to determine body type, might not be 100% accurate
          if (cmd.body.includes('{')) {
            this.value.bodyType = RequestBodyType.JSON
          } else {
            this.value.bodyType = RequestBodyType.Form;
          }
        } else {
          this.value.bodyType = RequestBodyType.None;
        }
        this.value.body = cmd.body || '';
        this.pulseForm();
      }
    }

    addHeader() {
      this.value.headers.push({
        key: this.value.headers.length != 0 ? this.value.headers[this.value.headers.length-1].key+1 : 0,
        name: newLinkedValueId(),
        value: newLinkedValueId()
      })
    }
    removeHeader(headerKey: number) {
      for(let i = 0; i < this.value.headers.length; i++) {
        if(this.value.headers[i].key==headerKey){
            this.ProceduresStore.deleteLink(this.value.headers[i].name)
            this.ProceduresStore.deleteLink(this.value.headers[i].value)
            this.value.headers.splice(i as any, 1);
            break;
        }
      }
    }

    autoOpenAuthenticationPane() { 
      // auto open the collapse container if the user selects an auth type
      if(!this.authenticationTypeIsNone && !this.activeForms.includes(this.authFormName)) {
        // hack, if we open this immediately after a change the animation glitches
        setTimeout(() => { this.activeForms.push(this.authFormName);}, 100);
      }
    }

    constructLinkedValuesMap(linkedValueIds: Array<string>) {
      let linkedValues:{[index:string]:string} = {};
      for(let i = 0; i < linkedValueIds.length; i++) {
        const link = this.ProceduresStore.linkedValues[linkedValueIds[i]]
        if(link !== undefined) {
          linkedValues[linkedValueIds[i]] = "\"" + link.value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
        }
      }
      return linkedValues
    }

    sendRequest() {
      //validate arguments
      // TODO: validate more arguments
      if(!isURL(this.value.url || "", {protocols: ["http", "https"], require_tld: false})) {
        this.$notify.error({title: "Invalid URL", message: ""});
        return;
      }
      if(this.bodyTypeIsJSON && !isJSON(this.value.body)) {
        this.$notify.error({title: "Invalid JSON Payload", message: ""});
        return;
      }

      // get all the linked values used in the request
      let linkedValueIds = [];
      for(let i = 0; i < this.value.headers.length; i++) {
        linkedValueIds.push(this.value.headers[i].name);
        linkedValueIds.push(this.value.headers[i].value);
      }
      linkedValueIds.push(this.value.authSimpleUsername);
      linkedValueIds.push(this.value.authSimplePassword);
      linkedValueIds.push(this.value.authToken);

      // send the request, with the resolved linked values
      sendRequest(this.value, this.constructLinkedValuesMap(linkedValueIds))
        .then((response) => {
          this.value.response = response
        }).catch((error) => {
          this.value.response = error
        });
    }

    /**
     * Prepare to perform a transition due to a model change
     * It's expected that this.value is will be set immdiately 
     * after this call, which will finish the transition
     */
    prepareTransition() {
      // //clone ourself
      // let fromParent = this.$el.parentElement;
      // this.transitionClone = this.$el.cloneNode(true);
      // const position = this.$el.getBoundingClientRect();
      // fromParent!.appendChild(this.transitionClone!);
      // //set an explict width to allow the margin-left animation to work properly
      // (this.transitionClone as HTMLElement).style.width = position.width + "px";
      // //use incrementally lower z-index so that new clones appear under older ones
      // (this.transitionClone as HTMLElement).style.zIndex = (this.zIndex--)+"";
    }

    pulseForm() {
      pulse(this.$refs.requestBar as HTMLElement);
      pulse((this.$refs.authForm as Vue).$el as HTMLElement);
      pulse((this.$refs.headerForm as Vue).$el as HTMLElement);
      pulse((this.$refs.payloadForm as Vue).$el as HTMLElement);
    }
  }
</script>

<style lang="scss">
  .request-pane {
    height: 100%;
    padding: 12px;

    .__view {
      min-height: unset !important; // TODO: look into why this is needed for scrolling
    }

    .gutter {
      border-left: 1px solid rgba(255, 255, 255, .2);
    }

    .request-bar {
      margin-right: 20px;
      .el-select {
        width: 100px;
      }
    }
    .request-form {
      margin: 20px;
      padding-right: 20px;
    }

    .header-form {
      .header-form-row{
        input {
          padding-right: 0;
        }
        .el-input-group__append {
          padding: 0 12px;
          button {
            padding: 12px 12px;
          }
        }
        &:first-child {
          .el-input {
            margin-top: 0;
          }
        }
        &:nth-last-child(2) {
          margin-bottom: 15px;
        }
      }
      .el-collapse-item__content {
        padding-top: 0;
      }
      .el-input-group {
        margin: 5px;
      }
      .add-btn {
        width: 100%;
        padding: 6px;
      }
      .remove-btn {
        padding: 7px;
      }
    }

    .el-collapse {
      margin-top: 20px;
    }

    .tree-title {
      .el-select {
        margin-left: 40px;
        input {
          border: unset;
          width: 100px;
        }
      }
    }

    .el-collapse-item__content {
      padding-left: 25px;
      padding-right: 25px;
    }

    .el-form.el-form--inline {
      display: flex;

      .el-form-item {
        flex-grow: 1;

        .el-form-item__content {
          display: unset;
        }
      }
    }

    .body-editor {
      width: 100%;
      height: 300px;
      background-color: #1c1c1c;
      color: white;
      padding: 10px;
      border: 0;
    }
  }

  @keyframes push-right {
    0% { margin-left: 0; background-color: transparent; }
    40% { background-color: rgba(0,0,0,.2); }
    100% { margin-left: 100vw; }
  }
</style>
