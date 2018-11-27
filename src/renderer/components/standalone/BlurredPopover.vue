<template>
  <el-popover2
    v-model="popoverVisible"
    :width="width"
    :height="height"
    :popper-options="{data: {offsets: {popper: { height: height } } } }"
    placement="right"
    popper-class="blurred-popover">
    <div class="popover-body" @keydown.esc="hide()">
      <h3>{{ title }}</h3>
      <slot/>
    </div>
    <slot slot="reference" name="reference" />
  </el-popover2>
</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import ElPopover2 from '../../libs/element-ui/ElPopover2.vue' // TODO: properly reference this

  @Component({ components: { ElPopover2 } })
  export default class BlurredPopover extends Vue {
    @Prop(String) title!: string
    @Prop(Number) width!: number
    @Prop(Number) height!: number

    popoverVisible = false

    hide() {
      this.popoverVisible = false;
    }
  }
</script>

<style lang="scss">
  .blurred-popover {
    background-color: unset !important;
    border: unset !important;

    h3 {
      margin-bottom: 10px;
    }

    .popper__arrow {
      border: unset !important;
      left: -7px !important;

      &::after {
        border-right-color: rgba(0, 0, 0, .25) !important;
      }
    }

    .popover-body {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 15px;
      backdrop-filter: blur(3px);
      background-color: rgba(0,0,0,.25);
      color: white;
    }
  }
</style>
