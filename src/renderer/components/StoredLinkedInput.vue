<template>
  <LinkedInput v-model="linkedValue" :field-name="fieldName" required/>
</template>

<script lang="ts">
  import { Component, Prop, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"
  const clonedeep = require("lodash.clonedeep")

  import { ProcedureLinkedValue } from "@/model/Procedure"
  import Procedures from "@/store/modules/Procedures"

  import LinkedInput from "@/components/standalone/LinkedInput.vue"

  @Component({})
  export default class RequestEditor extends LinkedInput {
    @Prop(String) linkId!: string
    @Prop(String) fieldName!: string

    ProceduresStore = getModule(Procedures, this.$store)
    localLinkedValue: ProcedureLinkedValue = {id:"", value: "", linked: false}

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
      this.localLinkedValue = val !== undefined ? clonedeep(val) : {id: this.linkId, value: "", linked: false};
    }
  }
</script>