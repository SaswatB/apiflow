<template>
  <div class="request-pane">
    <Split :gutter-size="40">
      <!-- TODO: limit and persist split -->
      <SplitArea :size="50">
        <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }">
          <div class="request-bar">
            <el-input placeholder="URL" required>
              <el-select slot="prepend" v-model="methodValue" placeholder="Method">
                <el-option v-for="item in methodOptions" :key="item" :label="item" :value="item"/>
              </el-select>
              <el-button v-tooltip="'Send Request'" slot="append"><i class="mdi mdi-send"/></el-button>
            </el-input>
          </div>
          <el-collapse v-model="activeForms" class="request-form">
            <!-- Authentication Form -->
            <MorphingCollapse :sub-item-count="3" collapse-item-name="Authentication">
              <template slot="select">
                <el-select v-model="authenticationType" :class="authenticationTypeIsNone ? 'none' : ''" placeholder="Type">
                  <el-option v-for="item in authenticationOptions" :key="item" :label="item" :value="item"/>
                </el-select>
              </template>
              <template slot="subSlot1">
                <div v-if="authenticationTypeIsNone" class="muted">No Authentication Type Selected</div>
              </template>
              <template slot="subSlot2">
                <div v-if="authenticationType === 'Basic' || authenticationType === 'Digest'">
                  <el-form @submit.native.prevent="">
                    <el-form-item>
                      <LinkedInput v-model="simpleAuthUsername" field-name="Username" required/>
                    </el-form-item>
                    <el-form-item>
                      <LinkedInput v-model="simpleAuthPassword" field-name="Password" required/>
                    </el-form-item>
                  </el-form>
                </div>
              </template>
              <template slot="subSlot3">
                <div v-if="authenticationType === 'Bearer'"><el-input placeholder="Token" required/></div>
              </template>
            </MorphingCollapse>
            <!-- Headers Form -->
            <el-collapse-item name="Headers" title="Headers">
              <el-form :inline="true" @submit.prevent="addHeader">
                <el-form-item><el-input v-model="newHeaderName" placeholder="Name" required/></el-form-item>
                <el-form-item><el-input v-model="newHeaderValue" placeholder="Value" required/></el-form-item>
                <el-form-item><el-button type="submit"><i class="mdi mdi-plus"/></el-button></el-form-item>
              </el-form>
            </el-collapse-item>
            <!-- Payload Form -->
            <MorphingCollapse :sub-item-count="3" collapse-item-name="Payload">
              <template slot="select">
                <el-select v-model="payloadType" :class="payloadTypeIsNone ? 'none' : ''" placeholder="Type">
                  <el-option v-for="item in payloadOptions" :key="item" :label="item" :value="item"/>
                </el-select>
              </template>
              <template slot="subSlot1">
                <div v-if="payloadTypeIsNone" class="muted">No Payload Type Selected</div>
              </template>
              <template slot="subSlot2">
                <div v-if="payloadType === 'JSON'">
                  <codemirror v-model="jsonPayload" :options="jsonPayloadEditorOptions"/>
                </div>
              </template>
            </MorphingCollapse>
          </el-collapse>
        </vue-scroll>
      </SplitArea>
      <SplitArea :size="50">
        <span>hi</span>
      </SplitArea>
    </Split>
  </div>
</template>

<script>
  import codemirror from 'vue-codemirror/src/codemirror.vue' //TODO: don't directly reference
  import LinkedInput from './standalone/LinkedInput'
  import MorphingCollapse from './standalone/MorphingCollapse'

  export default {
    name: 'RequestPane',
    components: { codemirror, LinkedInput, MorphingCollapse },
    data() {
      return {
        activeForms: [],
        methodOptions: ['GET','POST'],
        methodValue: '',
        authenticationOptions: ['None','Basic','Digest','Bearer'],
        authenticationType: 'None',
        simpleAuthUsername: { text: '', linked: false},
        simpleAuthPassword: {text: '', linked: false},
        postPayloadOptions: ['None','JSON'],
        payloadType: 'None',
        headers: [],
        newHeaderName: "",
        newHeaderValue: "",
        jsonPayload: "",
        jsonPayloadEditorOptions: {
          tabSize: 4,
          mode: 'text/javascript',
          theme: 'base16-dark',
          lineNumbers: true,
          line: true,
        }
      }
    },
    computed: {
      authenticationTypeIsNone() {
        return this.authenticationType === 'None'
      },
      payloadTypeIsNone() {
        return this.payloadType === 'None'
      },
      payloadOptions() {
        return this.methodValue == "POST" ? this.postPayloadOptions : ['None'];
      }
    },
    watch: {
      methodValue(val) {
        //reset payload type if its not supported for the set method
        if(val !== "POST") {
          this.payloadType = 'None';
        }
      },
      authenticationType() {
        //auto open the collapse container if the user selects an auth type
        if(!this.authenticationTypeIsNone && !this.activeForms.includes("Authentication")) {
          setTimeout(() => { this.activeForms.push("Authentication");}, 100); //hack, if we open this immediately the animation glitches
        }
      }
    },
    methods: {
      addHeader() {
        this.headers.push({key: this.headers.length, name: this.newHeaderName, value: this.newHeaderValue})
        this.newHeaderName = ""
        this.newHeaderValue = ""
      }
    }
  }
</script>

<style lang="scss">
  .request-pane {
    height: 100%;

    .__view {
      min-height: unset !important; //TODO: look into why this is needed for scrolling
    }

    .gutter {
      width: 20px !important;
      border-left: 1px solid rgba(255, 255, 255, .2);
      margin-left: 20Px;
    }

    .request-bar {
      .el-select {
        width: 100px;
      }
    }
    .request-form {
      margin: 20px;
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
      padding-left: 40px;
      padding-right: 40px;
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
