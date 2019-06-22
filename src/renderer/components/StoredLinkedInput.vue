<template>
  <LinkedInput v-model="linkedValue" :disabled="linkId === ''" :field-name="fieldName" required/>
</template>

<script lang="ts">
  import { Component, Prop, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"
  import { cloneDeep } from 'lodash'

  import { ProcedureLinkedValue } from "@/model/Procedure"
  import Procedures from "@/store/modules/Procedures"

  import LinkedInput from "@/components/standalone/LinkedInput.vue"

  @Component({})
  export default class StoredLinkedInput extends LinkedInput {
    @Prop(String) linkId!: string
    @Prop(String) linkName!: string
    @Prop(String) fieldName!: string

    ProceduresStore = getModule(Procedures, this.$store)
    localLinkedValue: ProcedureLinkedValue = {id:"", name:"", value: "", linked: false}

    get linkedValue() {
      return this.localLinkedValue;
    }
    set linkedValue(newLinkedValue) {
      this.localLinkedValue = newLinkedValue;
      this.ProceduresStore.saveLink(newLinkedValue);
    }

    @Watch("linkId", {immediate: true})
    refreshLocalLink() {
      let val = this.ProceduresStore.linkedValues[this.linkId];
      this.localLinkedValue = val !== undefined ? cloneDeep(val) : {id: this.linkId, name: this.linkName, value: "", linked: false};
    }
  }
</script>