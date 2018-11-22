<template>
  <el-input
    :placeholder="placeholder"
    :value="value.text"
    :class="!value.linked ? '' : 'linked'"
    :disabled="value.linked"
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

<script>
  export default {
    name: 'LinkedInput',
    props: { fieldName: { type: String, required: true }, value: {type: Object, required: true} },
    data() {
      return {
        tempValue: '' //used to hold value.text if the user clicks link, is not persisted
      }
    },
    computed: {
      placeholder() {
        return this.fieldName + (!this.value.linked ? "" : " - Linked") //todo animate this text change
      }
    },
    methods: {
      updateValueText(text) {
        this.value.text = text;
        this.$emit('input', this.value);
      },
      updateValuelinked(linked) {
        this.value.linked = linked;
        if(linked) {
          this.tempValue = this.value.text;
          this.value.text = "";
        } else {
          this.value.text = this.tempValue;
          this.tempValue = "";
        }
        this.$emit('input', this.value);
      }
    }
  }
</script>

<style lang="scss">
.linked-input.el-input {
  input::placeholder, button {
    transition: color 150ms linear;
  }
  &.linked {
    input::placeholder, button {
      color: lightgreen !important;
    }
  }
}
</style>
