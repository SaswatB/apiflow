<template>
  <div class="flow-pane">
    <Split :gutter-size="2" direction="vertical">
      <SplitArea :size="60" :min-size="350">
        <FlowDragDropGraph/>
      </SplitArea>
      <SplitArea :size="40">
        <div class="prop-editor" />
      </SplitArea>
    </Split>
    
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"

  import FlowDragDropGraph from "@/components/editors/FlowDragDropGraph.vue"

  @Component({ components: { FlowDragDropGraph } })
  export default class FlowEditor extends Vue {
  }
</script>

<style lang="scss">
  .flow-pane {
    height: 100%;

    .prop-editor {
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,.2);
      z-index: 10000;
    }
  }
</style>
