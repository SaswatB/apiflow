<template>
  <div class="request-pane">
    <Split :gutter-size="20">
      <!-- TODO: limit and persist split -->
      <SplitArea :size="50">
        <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }">
          <div class="request-bar">
            <el-input v-model="value.url" placeholder="URL" required>
              <el-select slot="prepend" v-model="value.method" placeholder="Method">
                <el-option v-for="item in methodOptions" :key="item" :label="item" :value="item"/>
              </el-select>
              <el-button v-tooltip="'Send Request'" slot="append" @click="sendRequest"><i class="mdi mdi-send"/></el-button>
            </el-input>
          </div>
          <el-collapse v-model="activeForms" class="request-form">
            <!-- Authentication Form -->
            <MorphingCollapse :sub-item-count="3" :collapse-item-name="authFormName">
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
                      <StoredLinkedInput :link-id="value.authSimpleUsername" field-name="Username" required/>
                    </el-form-item>
                    <el-form-item>
                      <StoredLinkedInput :link-id="value.authSimplePassword" field-name="Password" required/>
                    </el-form-item>
                  </el-form>
                </div>
              </template>
              <template slot="subSlot3">
                <div v-if="authenticationTypeIsToken"><StoredLinkedInput :link-id="value.authToken" field-name="Token" required/></div>
              </template>
            </MorphingCollapse>
            <!-- Headers Form -->
            <el-collapse-item :name="headersFormName" :title="headersFormName" class="header-form">
              <div v-for="header in value.headers" :key="header.key" class="header-form-row">
                <el-form :inline="true" @submit.prevent="">
                  <StoredLinkedInput :link-id="header.name" field-name="Name" required/>
                  <StoredLinkedInput :link-id="header.value" field-name="Value" required/>
                  <el-button class="remove-btn" @click="removeHeader(header.key)"><i class="mdi mdi-minus"/></el-button>
                </el-form>
              </div>
              <el-button class="add-btn" @click="addHeader"><i class="mdi mdi-plus"/></el-button>
            </el-collapse-item>
            <!-- Payload Form -->
            <MorphingCollapse :sub-item-count="3" :collapse-item-name="payloadFormName">
              <template slot="select">
                <el-select v-model="value.payloadType" :class="payloadTypeIsNone ? 'none' : ''" placeholder="Type">
                  <el-option v-for="item in payloadOptions" :key="item" :label="item" :value="item"/>
                </el-select>
              </template>
              <template slot="subSlot1">
                <div v-if="payloadTypeIsNone" class="muted">No Payload Type Selected</div>
              </template>
              <template slot="subSlot2">
                <div v-if="payloadTypeIsJSON">
                  <AceEditor
                    ref="jsonPayloadEditor"
                    v-model="value.jsonPayload"
                    lang="javascript"
                    theme="merbivore_soft"
                    width="100%"
                    height="300"
                    @init="editorInit" />
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
          height="100%"
          @init="editorInit" />
      </SplitArea>
    </Split>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
  import { getModule } from 'vuex-module-decorators'
  import AceEditor from 'vue2-ace-editor'
  const difference = require('lodash/difference')
  const beautify = require('js-beautify').js

  const ace = require('brace');
  require('brace/ext/language_tools')
  require('brace/mode/javascript')
  require('brace/theme/merbivore_soft')
  require('brace/snippets/javascript')

  import {  newLinkedValueId } from '../../model/Procedure'
  import { RequestMethod, RequestAuthenticationType, RequestPayloadType, getPayloadTypes, Request } from '../../model/Request'
  import Procedures from '../../store/modules/Procedures'

  import StoredLinkedInput from '../StoredLinkedInput.vue' // TODO: fix references
  import MorphingCollapse from '../standalone/MorphingCollapse.vue'

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
      mode: 'text/javascript',
      theme: 'base16-dark',
      lineNumbers: true,
      line: true,
      placeholder: "JSON Body"
    }
    
    get method() { return this.value.method }
    get methodOptions() { return Object.keys(RequestMethod).map(k => RequestMethod[k as any]); }

    get authenticationTypeIsNone() { return this.value.authType === RequestAuthenticationType.None }
    get authenticationTypeIsSimple() { return this.value.authType === RequestAuthenticationType.Basic }
    get authenticationTypeIsToken() { return this.value.authType === RequestAuthenticationType.Bearer }
    get authenticationOptions() { return Object.keys(RequestAuthenticationType).map(k => RequestAuthenticationType[k as any]); }

    get payloadTypeIsNone() { return this.value.payloadType === RequestPayloadType.None }
    get payloadTypeIsJSON() { return this.value.payloadType === RequestPayloadType.JSON }
    get payloadOptions() { return this.method != undefined ? getPayloadTypes(this.method) : [RequestPayloadType.None]; }

    get prettyResponse() { return beautify(JSON.stringify(this.value.response)) }
    set prettyResponse(ignored) {}


    mounted() {
      (this.$refs.responseViewer as any).editor.setReadOnly(true);
    }


    @Watch('method')
    resetPayloadType() { 
        // reset payload type if its not supported for the set method
        if(this.method !== RequestMethod.Post) {
          this.value.payloadType = RequestPayloadType.None;
        }
    }

    @Watch('activeForms')
    handleFormOpenClose(newVal:Array<string>, oldVal:Array<string>) {
      let diff = difference(newVal, oldVal);
      if(diff.length == 1) {
        // auto focus the json editor if its collapse pane was opened
        if(diff[0] == this.payloadFormName && this.payloadTypeIsJSON) {
          (this.$refs.jsonPayloadEditor as any).editor.focus();
        }
      }
    }

    editorInit() {
    }

    addHeader() {
      this.value.headers.push({
        key: this.value.headers.length != 0 ? this.value.headers[this.value.headers.length-1].key+1 : 0,
        name: newLinkedValueId(),
        value: newLinkedValueId()
      })
    }
    removeHeader(headerKey: number) {
      for(let i in this.value.headers){
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
      for(let i in linkedValueIds) {
        const link = this.ProceduresStore.linkedValues[linkedValueIds[i]]
        if(link !== undefined) {
          linkedValues[linkedValueIds[i]] = link.value;
        }
      }
      return linkedValues
    }

    sendRequest() {
      // TODO: validate arguments
      let linkedValueIds = [];

      for(let i in this.value.headers) {
        linkedValueIds.push(this.value.headers[i].name);
        linkedValueIds.push(this.value.headers[i].value);
      }
      linkedValueIds.push(this.value.authSimpleUsername);
      linkedValueIds.push(this.value.authSimplePassword);
      linkedValueIds.push(this.value.authToken);

      this.value.sendRequest(this.constructLinkedValuesMap(linkedValueIds));
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
      width: 20px !important;
      border-left: 1px solid rgba(255, 255, 255, .2);
    }

    .request-bar {
      padding-right: 20px;
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
        button {
          border: unset;
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
        &:hover {
          color: red;
        }
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
  }
</style>
