<template>
  <div class="request-pane">
    <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }">
      <div class="request-bar">
        <el-input placeholder="FLOW!" required>
          <el-select slot="prepend" v-model="methodValue" placeholder="Method">
            <el-option v-for="item in methodOptions" :key="item" :label="item" :value="item"/>
          </el-select>
          <el-button v-tooltip="'Send Request'" slot="append"><i class="mdi mdi-send"/></el-button>
        </el-input>
      </div>
    </vue-scroll>
  </div>
</template>

<script>
  import LinkedInput from '@/components/standalone/LinkedInput'
  import MorphingCollapse from '@/components/standalone/MorphingCollapse'

  export default {
    name: 'FlowEditor',
    components: { LinkedInput, MorphingCollapse },
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
  // .request-pane {
  //   height: 100%;

  //   .__view {
  //     min-height: unset !important; //TODO: look into why this is needed for scrolling
  //   }

  //   .gutter {
  //     width: 20px !important;
  //     border-left: 1px solid rgba(255, 255, 255, .2);
  //     margin-left: 20Px;
  //   }

  //   .request-bar {
  //     .el-select {
  //       width: 100px;
  //     }
  //   }
  //   .request-form {
  //     margin: 20px;
  //   }

  //   .el-collapse {
  //     margin-top: 20px;
  //   }

  //   .tree-title {
  //     .el-select {
  //       margin-left: 40px;
  //       input {
  //         border: unset;
  //         width: 100px;
  //       }
  //     }
  //   }

  //   .el-collapse-item__content {
  //     padding-left: 40px;
  //     padding-right: 40px;
  //   }

  //   .el-form.el-form--inline {
  //     display: flex;

  //     .el-form-item {
  //       flex-grow: 1;

  //       .el-form-item__content {
  //         display: unset;
  //       }
  //     }
  //   }
  // }
</style>
