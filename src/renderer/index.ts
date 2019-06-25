import Vue from "vue"
import Element from "element-ui"
import Overdrive from "vue-overdrive"
import { VueContext } from "vue-context";
import vuescroll from "vuescroll"
import VueSplit from "vue-split-panel"
import VTooltip from "v-tooltip"
import vuemoment from "vue-moment"

import App from "@/App.vue"
import router from "@/router"
import store from "@/store"

import "vuescroll/dist/vuescroll.css";
import 'element-ui/lib/theme-chalk/index.css';
import "@/style/main.scss"

Vue.config.productionTip = false

Vue.use(Element, {locale: require("element-ui/lib/locale/lang/en")})
Vue.use(Overdrive)
Vue.use(VueContext)
Vue.use(vuemoment);
Vue.use(vuescroll)
Vue.use(VueSplit)
Vue.use(VTooltip)

Vue.prototype.$vuescrollConfig = { bar: {background: "rgba(0, 0, 0, 0.34)"} };
VTooltip.options.defaultHideOnTargetClick = false


// eslint-disable no-new
new Vue({
  components: { App },
  router,
  store,
  template: "<App/>"
}).$mount("#app")