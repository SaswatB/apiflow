import Vue from "vue"
import Vuex from "vuex"
import { createPersistedState, createSharedMutations } from "vuex-electron"

Vue.use(Vuex)

import counter from "@/../renderer/store/modules/Counter"
import procedures from "@/../renderer/store/modules/Procedures"

export default new Vuex.Store({
  modules: {
    counter, procedures
  },
  plugins: [
    createPersistedState(),
    createSharedMutations()
  ],
  strict: process.env.NODE_ENV !== "production"
})
