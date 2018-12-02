<template>
  <div class="flow-pane">
    <DragDropGraph/>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
  import { getModule } from 'vuex-module-decorators'

  import DragDropGraph from '../standalone/DragDropGraph.vue'

  @Component({ components: { DragDropGraph } })
  export default class FlowEditor extends Vue {
  }
</script>

<style lang="scss">
  .flow-pane {
    height: 100%;
  }
</style>
