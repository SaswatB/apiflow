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
      ref="tree"
      :allow-drop="allowDrop"
      :allow-drag="allowDrag"
      :data="value"
      default-expand-all
      draggable
      empty-text="No Items"
      highlight-current
      node-key="id"
      @current-change="data => itemSelected(data.id)">
      <div slot-scope="{ data, node }" class="tree-node">
        <i :class="itemIcon" class="mdi tree-icon"/>
        <span class="title">{{ node.label }}</span>
        <div class="spacer"/>
        <BlurredPopover :ref="'editItemPopover_'+data.id" :title="'Edit ' + itemName" :width="200" :height="100">
          <el-button-group class="block">
            <el-button v-tooltip="'Rename'" type="warning" @click="confirmRenameItem(data)"><i class="mdi mdi-rename-box"/></el-button>
            <el-button v-tooltip="'Delete'" type="danger" @click="confirmDeleteItem(data, node)"><i class="mdi mdi-delete"/></el-button>
          </el-button-group>
          <el-button slot="reference" class="edit-button" @click.stop><i class="mdi mdi-dots-vertical"/></el-button>
        </BlurredPopover>
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

<script lang="ts">
  import { Vue, Component, Prop, Watch } from "vue-property-decorator"
  import { getModule } from "vuex-module-decorators"
  import { ElTree, TreeNode, TreeData } from "element-ui/types/tree";
  import BlurredPopover from "@/components/standalone/BlurredPopover.vue"
  import { Procedure } from "@/model/Procedure";
  import Procedures from "@/store/modules/Procedures";
  import { ElInput } from "element-ui/types/input";

  @Component({ components: { BlurredPopover } })
  export default class SideTreeBrowser extends Vue {
    @Prop(String) title!: string
    @Prop(Array) value!: Procedure[]
    @Prop(String) itemName!: string
    @Prop(String) itemIcon!: string

    public $refs!: Vue['$refs'] & {
      addItemPopover: BlurredPopover,
      addItemPopoverTextbox: ElInput,
      tree: ElTree<any, any>,
      // ['editItemPopover_'+data.id]: BlurredPopover
      renameDialogInput: ElInput,
    };

    ProceduresStore = getModule(Procedures, this.$store)
    addItemName = ""
    renameDialogVisible = false
    renameDialogNewName = ""
    renameDialogData?: TreeData

    get openProcedure() { return this.ProceduresStore.openProcedure; }

    setOpenProcedure(procedureId: Procedure["id"]) { this.ProceduresStore.setOpenProcedure(procedureId) }

    @Watch("openProcedure")
    handleOpenProcedureChange(procedure: Procedure) {
      // if a different procedure has been selected in a different tree, clear our selected one
      const currentKey = this.$refs.tree.getCurrentKey()
      if(currentKey != null && currentKey != procedure) {
        this.$refs.tree.setCurrentKey(null)
      }
    }

    mounted() {
      // if a procedure was recorded as open, reselect it
      for(let procedure of this.value) {
        if(procedure.id === this.openProcedure) {
          this.$emit("item-selected", procedure.id);
          this.$refs.tree.setCurrentKey(procedure.id);
          break;
        }
      }
    }

    allowDrag() {
      return true;
    }
    allowDrop() { // TODO: allow folders
      return false;
    }
    showAddItem(event: MouseEvent) {
      event.stopPropagation();
      setTimeout(this.$refs.addItemPopoverTextbox.focus, 150)
    }
    addItem() {
      this.$emit("add-item", this.addItemName);
      this.$refs.addItemPopover.hide();
      // wait a bit before clearing so that the user doesn't see an empty text box
      setTimeout(() => {this.addItemName = ""}, 300);
    }
    confirmRenameItem(data: TreeData) {
      (this.$refs["editItemPopover_"+data.id] as BlurredPopover).hide();
      this.renameDialogVisible = true;
      this.renameDialogNewName = data.label!;
      this.renameDialogData = data;
      setTimeout(this.$refs.renameDialogInput.focus, 150);
    }
    renameItemFromDialogInput() {
      // TODO: do rename properly by sending an event to the parent
      this.renameDialogData!.label = this.renameDialogNewName;

      this.renameDialogVisible = false;
      this.renameDialogNewName = "";
      this.renameDialogData = undefined;
    }
    confirmDeleteItem(data: TreeData, node: TreeNode<number, TreeData>) {
      (this.$refs["editItemPopover_"+data.id] as BlurredPopover).hide();
      this.$confirm("Are you sure want to delete " + this.itemName + " '" + data.label + "'?", "", {
          confirmButtonText: "OK",
          cancelButtonText: "Cancel",
          type: "warning"
        })
        .then(() => {this.deleteItem(data, node)})
        .catch(() => {});
    }
    deleteItem(data: TreeData, node: TreeNode<number, TreeData>) {
      // TODO: do delete properly by sending an event to the parent
      const parent = node.parent;
      const children = parent!.data.children!;
      const index = children.findIndex(d => d.id === data.id);
      children.splice(index, 1);
    }
    selectItem(id: Procedure["id"]) {
      this.$refs.tree.setCurrentKey(id)
      this.itemSelected(id)
    }
    itemSelected(id: Procedure["id"]) {
      // when the user selects an item, save it and update the application's state
      if(id != this.openProcedure) {
        this.$emit("item-selected", id)
        this.setOpenProcedure(id)
      }
    }
  }
</script>

<style lang="scss">
  .stb {
    .el-collapse-item__content {
      padding-left: 5px;
    }

    .el-tree {
      background: unset;
      color: white;
    }
    .el-tree-node__content {
      transition: background-color 150ms linear;
      height: unset;
      border-radius: 4px;
    }
    .el-tree-node:hover>.el-tree-node__content,
    .el-tree-node:focus>.el-tree-node__content {
      background-color: rgba(0, 0, 0, .1);
    }
    .el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
      background-color: rgba(0, 0, 0, .2);
    }

    .tree-node {
      display: flex;
      width: 100%;
      font-size: 14px;
      align-items: stretch;

      .title {
        padding: 3px 0;
      }
      .spacer {
        flex-grow: 1;
      }
      .edit-button {
        padding: 5px;
        margin-right: 0px;
        height: 100%;
      }
    }
    .tree-icon {
      padding-right: 10px;
    }

    button {
      padding: 8px;
      margin-right: 10px;
    }
  }
</style>
