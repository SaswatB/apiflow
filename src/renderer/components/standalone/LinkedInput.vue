<template>
  <el-input
    :placeholder="placeholder"
    :value="value.value"
    :disabled="disabled"
    :class="!value.linked ? '' : 'linked'"
    class="linked-input"
    @input="updateValueText">
    <el-button
      v-tooltip="!value.linked ? 'Expose this field as a link' : 'Unlink this field'"
      slot="append"
      :disabled="disabled"
      @click="updateValuelinked(!value.linked)">
      <i class="mdi mdi-link"/>
    </el-button>
  </el-input>
</template>

<script lang="ts">
  import { Vue, Component, Prop } from "vue-property-decorator"
  import { ProcedureLinkedValue } from "@/model/Procedure"

  @Component({})
  export default class LinkedInput extends Vue {
    @Prop(String) fieldName!: string
    @Prop(Object) value!: ProcedureLinkedValue
    @Prop({type: Boolean, default: false}) disabled!: boolean

    //TODO: animate this text change
    get placeholder() { return this.fieldName + (!this.value.linked ? "" : " - Linked") }

    updateValueText(newText: string) {
      if(this.disabled) return;
      this.value.value = newText;
      this.$emit("input", this.value);
    }

    updateValuelinked(linked: boolean) {
      if(this.disabled) return;
      this.value.linked = linked;
      this.$emit("input", this.value);
    }
  }
</script>

<style lang="scss">
.linked-input.el-input {
  input::placeholder {
    transition: color 150ms linear;
  }
  &.linked {
    input,input::placeholder, button {
      color: lightgreen !important;
    }
  }
}
</style>
