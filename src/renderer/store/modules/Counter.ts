import { Module, VuexModule, Mutation, Action } from "vuex-module-decorators" 
import { onRenderer } from "@/../renderer/utils/utils"

@Module(onRenderer({ name: "counter" }))
export default class Counter extends VuexModule {
  main = 0

  @Mutation incrCounter() {this.main++}
  @Mutation decrCounter() {this.main--}

  @Action({commit: "incrCounter"}) incrementCounter() {}
}
