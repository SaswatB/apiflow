<template>
  <vue-scroll :ops="{ scrollPanel: { scrollingX: false } }" class="sidebar">
    <div class="sidebar-content">
      <el-select v-model="value" placeholder="Project">
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"/>
      </el-select>
      <el-collapse v-model="activeNames">
        <SideTreeBrowser v-model="flows" item-icon="mdi-vector-polyline" title="Flows" item-name="Flow"/>
        <SideTreeBrowser v-model="requests" item-icon="mdi-web" title="Requests" item-name="Add Request"/>
      </el-collapse>
    </div>
  </vue-scroll>
</template>

<script>
  import { mapActions } from 'vuex'
  import SideTreeBrowser from './SideTreeBrowser'

  export default {
    name: 'SideBar',
    components: { SideTreeBrowser },
    props: { flows: { type: Array, required: true }, requests: { type: Array, required: true } },
    data() {
      return {
        addFlowPopoverVisible: false,
        addFlowName: '',
        options: [{ //TODO: persist
          value: 'Project1',
          label: 'Project1'
        }],
        value: 'Project1', //TODO: persist
        activeNames: ['Flows', 'APIs'], //TODO: persist
      }
    },
    computed: {
      counter() {
        return this.$store.state.Counter.main;
      }
    },
    mounted() {
      this.incrementCounter();
    },
    methods: {
      ...mapActions(['incrementCounter'])
    }
  }
</script>

<style lang="scss">
  .sidebar {
    background-color: rgba(0, 0, 0, .2);

    .sidebar-content {
      padding: 20px;
    }

    .el-select {
      width: 100%;
      margin-bottom: 20px;

      input {
        background-color: transparent;
        color: white;
      }
    }
  }
</style>
