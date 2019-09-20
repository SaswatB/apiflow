<template>
  <el-button v-tooltip="'Run Flow'" class="exec-btn" @click="runFlow">
    <i class="mdi mdi-send"/>
  </el-button>
</template>

<script lang="ts">
  import { Vue, Component } from "vue-property-decorator"

  @Component({})
  export default class FlowSettingsPane extends Vue {
    protected runFlow() {
      this.$emit("run-flow");
    }
  }
</script>
