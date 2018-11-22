<template>
  <el-collapse-item :name="title" class="stb">
    <template slot="title">
      <div class="tree-title">
        {{ title }}
        <div class="spacer"/>
        <div>
          <BlurredPopover ref="addItemPopover" :title="'Add ' + itemName" :width="200" :height="100">
            <form @submit.prevent="addItem">
              <el-input
                ref="addItemPopoverTextbox"
                v-model="addItemName"
                placeholder="Name"
                required/>
            </form>
            <el-button slot="reference" @click="showAddItem"><i class="mdi mdi-plus"/></el-button>
          </BlurredPopover>
        </div>
      </div>
    </template>
    <!-- TODO: scroll shadow https://vuescrolljs.yvescoding.org/guide/event.html#handle-resize -->
    <el-tree
      :allow-drop="allowDrop"
      :allow-drag="allowDrag"
      :data="value"
      default-expand-all
      draggable
      empty-text="No Items"
      highlight-current
      node-key="id">
      <div slot-scope="{ node, data }" class="tree-node">
        <i :class="itemIcon" class="mdi tree-icon"/>
        <span>{{ node.label }}</span>
        <div class="spacer"/>
        <el-popover :title="'Edit ' + itemName ">
          <el-button v-tooltip="'Rename'" type="warning" @click="confirmRenameItem(node, data)"><i class="mdi mdi-rename-box"/></el-button>
          <el-button v-tooltip="'Delete'" type="danger" @click="confirmDeleteItem(node, data)"><i class="mdi mdi-delete"/></el-button>
          <el-button slot="reference"><i class="mdi mdi-dots-vertical"/></el-button>
        </el-popover>
      </div>
    </el-tree>
    <!-- TODO: fix style -->
    <el-dialog :title="'Rename ' + itemName" :visible.sync="renameDialogVisible">
      <form @submit.prevent="renameItemFromDialogInput">
        <el-input ref="renameDialogInput" v-model="renameDialogNewName" placeholder="Name" required/>
      </form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="renameDialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="renameItemFromDialogInput">Confirm</el-button>
      </span>
    </el-dialog>
  </el-collapse-item>
</template>

<script>
  import BlurredPopover from './standalone/BlurredPopover'
  const uuidv4 = require('uuid/v4');

  export default {
    name: 'SideTreeBrowser',
    components: { BlurredPopover },
    props: {
      title: { type: String, required: true },
      value: { type: Array, required: true },
      itemName: { type: String, required: true },
      itemIcon: { type: String, required: true }
    },
    data() {
      return {
        addItemName: '',
        renameDialogVisible: false,
        renameDialogNewName: "",
        renameDialogData: {}
      }
    },
    methods: {
      allowDrag() {
        return true;
      },
      allowDrop() { // TODO: restrict to folders
        return true;
      },
      showAddItem(event) {
        event.stopPropagation();
        setTimeout(() => {this.$refs.addItemPopoverTextbox.focus()}, 150);
      },
      addItem() {
        this.value.push({ label: this.addItemName, id: uuidv4() })
        this.$emit('input', this.value);

        this.$refs.addItemPopover.hide();
        // wait a bit before clearing so that the user doesn't see an empty text box
        setTimeout(() => {this.addItemName = ""}, 300);
      },
      confirmRenameItem(node, data) {
        this.renameDialogVisible = true;
        this.renameDialogNewName = data.label;
        this.renameDialogData = data;
        setTimeout(() => {this.$refs.renameDialogInput.focus()}, 150);
      },
      renameItemFromDialogInput() {
        console.log("codmk")
        this.renameDialogData.label = this.renameDialogNewName;

        this.renameDialogVisible = false;
        this.renameDialogNewName = "";
        this.renameDialogData = {};
      },
      confirmDeleteItem(node, data) {
        this.$confirm("Are you sure want to delete " + this.itemName + " '" + data.label + "'?", '', {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            type: 'warning'
          })
          .then(() => {this.deleteItem(node, data)})
          .catch(() => {});
      },
      deleteItem(node, data) {
        const parent = node.parent;
        const children = parent.data.children || parent.data;
        const index = children.findIndex(d => d.id === data.id);
        children.splice(index, 1);
      },
    }
  }
</script>

<style lang="scss">
  @import '~@mdi/font/css/materialdesignicons.css';

  .stb {
    .el-collapse-item__content {
      padding-left: 5px;
    }

    .el-tree {
      background: unset;
      color: unset;
    }
    .el-tree-node__content {
      transition: background-color 150ms linear;

      &:hover {
        background-color: rgba(0, 0, 0, .2);
      }
    }
    .el-tree-node:focus>.el-tree-node__content,
    .el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
      background-color: rgba(0, 0, 0, .2);
    }

    .tree-node {
      display: flex;
      width: 100%;

      .spacer {
        flex-grow: 1;
      }
      button {
        padding: unset;
      }
    }
    .tree-icon {
      padding-right: 10px;
    }

    button {
      color: white;
      border: unset;
      padding: 8px;
      margin-right: 10px;
    }
  }
</style>
