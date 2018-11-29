<template>
  <el-input
    :placeholder="placeholder"
    :value="value.value"
    :class="!value.linked ? '' : 'linked'"
    class="linked-input"
    @input="updateValueText">
    <el-button
      v-tooltip="!value.linked ? 'Expose this field as a link' : 'Unlink this field'"
      slot="append"
      @click="updateValuelinked(!value.linked)">
      <i class="mdi mdi-link"/>
    </el-button>
  </el-input>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
  import { ProcedureLinkedValue } from '../../model/Procedure'

  @Component({})
  export default class LinkedInput extends Vue {
    @Prop(String) fieldName!: string
    @Prop(Object) value!: ProcedureLinkedValue

    //TODO: animate this text change
    get placeholder() { return this.fieldName + (!this.value.linked ? "" : " - Linked") }

    updateValueText(newText: string) {
      this.value.value = newText;
      this.$emit('input', this.value);
    }

    updateValuelinked(linked: boolean) {
      this.value.linked = linked;
      this.$emit('input', this.value);
    }
  }
</script>

<style lang="scss">
.linked-input.el-input {
  input,input::placeholder, button {
    transition: color 150ms linear;
  }
  &.linked {
    input,input::placeholder, button {
      color: lightgreen !important;
    }
  }
}
</style>
