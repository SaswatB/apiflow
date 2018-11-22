<template>
  <div class="frame">
    <Split :gutter-size="8">
      <!-- TODO: limit and persist split -->
      <SplitArea :size="25">
        <SideBar :flows="flows" :requests="requests"/>
      </SplitArea>
      <SplitArea :size="75">
        <div class="content">
          <RequestPane/>
        </div>
      </SplitArea>
    </Split>
  </div>
</template>

<script>
  import SideBar from './SideBar'
  import RequestPane from './RequestPane'

  export default {
    name: 'MainFrame',
    components: { SideBar, RequestPane },
    data() {
      return {
        flows: [],
        requests: []
      }
    },
    methods: {}
  }
</script>

<style lang="scss">
  .frame {
    height: calc(100% - 30px);

    .content {
      height: 100%;
      padding: 20px;
    }

    .gutter {
      background-image: unset;
      background-color: unset;
    }
  }
</style>
