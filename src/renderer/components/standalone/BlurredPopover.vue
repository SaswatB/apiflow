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

<script>
  import ElPopover2 from '../../element-ui/ElPopover2.vue'
  export default {
    name: 'BlurredPopover',
    components: { ElPopover2 },
    props: {
      title: { type: String, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    data() {
      return {
        popoverVisible: false
      }
    },
    methods: {
      hide() {
        this.popoverVisible = false;
      }
    }
  }
</script>

<style lang="scss">
  .blurred-popover {
    background-color: unset !important;
    border: unset !important;

    .popover-body {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 15px;
      backdrop-filter: blur(3px);
      background-color: rgba(0,0,0,.2);
      color: white;
    }
  }
</style>
