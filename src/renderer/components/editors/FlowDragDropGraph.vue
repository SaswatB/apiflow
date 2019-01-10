<template>
  <div class="graph-scroll-container">
    <vue-scroll ref="graphScroll">
      <div ref="graphContainer"/>
    </vue-scroll>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from "vue-property-decorator"
  import { v4 as uuidv4 } from "uuid"
  import * as d3 from "d3"
  import * as d3dag from "d3-dag"
  import { ResizeObserver as ResizeObserverType } from "ResizeObserver.d.ts"
  declare var ResizeObserver: ResizeObserverType;

  import { FlowNodeType, FlowRootNodeId, FlowPlayNodeId, getFlowNodeTypeIcon, FlowNode, FlowDagNode } from "@/model/Flow"
  import { hasPath, getTransformation, makeAbsoluteContext } from "@/utils/utils"

  const nodeRadius = 30;
  const sideBarElementWidth = 60;
  const sideBarElementHeight = 60;
  const sideBarElementIconSize = 40;
  const sideBarElementPadding = 5;
  const nodeIconSize = 40;
  const duration = 750; // default transition duration
  const fastDuration = 300;
  const veryFastDuration = 150;

  function getEdgeId(d: any) {
    return d != undefined ? d.source.id + "--" + d.target.id : "";
  }

  function linkPath(d: any) {
    let source:[number, number] = [ d.source.x + nodeRadius,  d.source.y ];
    let target:[number, number] = [ d.target.x - nodeRadius - 7, d.target.y ]; //-7 for marker
    return d3.linkHorizontal()({ source, target });
  }

  @Component({ components: {} })
  export default class FlowDragDropGraph extends Vue {
    @Prop(Array) value!: Array<FlowNode>

    // svg and its main content groups
    baseSvg!: d3.Selection<SVGSVGElement, {}, null, undefined>
    dagGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    dagOverlayGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    sidebarGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    // size of the svg
    height = 0
    width = 0
    // variables for adding nodes and drag/drop/click
    hoveredNode?: FlowDagNode
    selectedNode?: {d: FlowDagNode, domNode: Element}
    selectedEdge?: {d: any, domNode: Element}
    dagNodes!: Array<FlowDagNode>;
    sidebarClone: any
    draggedLink: any
    dragListener!: d3.DragBehavior<SVGGElement, FlowDagNode, {} | d3.SubjectPosition>
    playNodeLocation?: {x:number, y:number}
    // panning support
    scrollDx = 0
    scrollDy = 0
    scrollTimer?: number = undefined

    mounted() {
      // define the baseSvg and its main content groups
      this.baseSvg = d3.select(this.$refs.graphContainer as Element).append("svg");
      this.dagGroup = this.baseSvg.append("g");
      this.dagOverlayGroup = this.baseSvg.append("g");
      this.sidebarGroup = this.baseSvg.append("g");

      (this.dagGroup as any).x = 0;
      (this.dagGroup as any).y = 0;
      
      // Define the drag listeners for drag/drop behaviour of nodes.
      this.dragListener = d3.drag<SVGGElement, FlowDagNode>()
        .on("start", (d, i, domNodes) => { this.onStartNodeDrag(d, domNodes[i]); })
        .on("drag", (d, i, domNodes) => { this.onUpdateNodeDrag(d, domNodes[i]); })
        .on("end", (d, i, domNodes) => { this.onEndNodeDrag(d, domNodes[i]); });
      
      this.addSidebarBtn(0, 0, FlowNodeType.Request);
      // this.addSidebarBtn(0, sideBarElementHeight + sideBarElementPadding, FlowNodeType.WSConnect);
      // this.addSidebarBtn(0, (sideBarElementHeight + sideBarElementPadding) * 2, FlowNodeType.Aggregate);
      // this.addSidebarBtn(0, (sideBarElementHeight + sideBarElementPadding) * 3, FlowNodeType.Split);
      // this.addSidebarBtn(0, (sideBarElementHeight + sideBarElementPadding) * 4, FlowNodeType.Sleep);

      // set up resizing response
      new ResizeObserver(this.resize).observe(this.$el)
      new ResizeObserver(this.resize).observe(this.dagGroup.node())
      this.resize()

      let defs = this.baseSvg.append("svg:defs")

      // arrows for lines
      defs.append("svg:marker")
        .attr("id", "triangle")
        .attr("refX", 6)
        .attr("refY", 6)
        .attr("markerWidth", 30)
        .attr("markerHeight", 30)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 12 6 0 12 3 6")
        .style("fill", "white");
      
      // blur filter, needed for glows
      defs.append("filter")
        .attr("id","glow")
        .attr("filterUnits","userSpaceOnUse")
        .append("feGaussianBlur")
        .attr("stdDeviation","3.5");
      
      // refresh graph if necessary
      this.handleValueChanged();
    }

    destroyed() {
      clearInterval(this.scrollTimer);
    }


    @Watch("value")
    handleValueChanged() {
      if(this.value != undefined) {
        this.refreshNodes();
      }
    }

    addSidebarBtn(x: number, y: number, type: FlowNodeType) {
      let btn = this.sidebarGroup.append("g")
      let icon = getFlowNodeTypeIcon(type);
      this.addSidebarNodeElement(btn, x, y, icon, "rgba(0,0,0,.5)")
      btn.attr("pointer-events", "mouseover")
        .on("mouseover", (d, i, domNodes) => { this.onOverSidebarNode(domNodes[i], x, y, icon); })
        .on("mouseout", (d, i, domNodes) => { this.onOutSidebarNode(domNodes[i]); })
      btn.call(d3.drag<SVGGElement, any>()
          .on("start", (d, i, domNodes) => { this.onStartSidebarDrag(domNodes[i], x, y, type); })
          .on("drag", (d, i, domNodes) => { this.onUpdateSidebarDrag(domNodes[i]); })
          .on("end", (d, i, domNodes) => { this.onEndSidebarDrag(domNodes[i]); }));
    }

    addSidebarNodeElement(parent: d3.Selection<SVGGElement, any, any, any>, x: number, y: number, icon: string, fill: string) {
      parent.append("rect")
        .attr("class", "sidebar-rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", sideBarElementWidth)
        .attr("height", sideBarElementHeight)
        .attr("fill", fill);
      parent.append("text")
        .attr("class", "icon-text")
        .attr("x", x + sideBarElementWidth/2)
        .attr("y", y + sideBarElementHeight/2)
        .attr("font-size", `${sideBarElementIconSize}px` )
        .text(icon); 
    }

    // updates the graph with changes from value
    refreshNodes() {
      // convert out data to the dag format and generate a layout
      let dag = d3dag.dratify()(this.value);
      d3dag.sugiyama().layering(d3dag.layeringSimplex()).decross(d3dag.decrossOpt()).coord(d3dag.coordGreedy())(dag);

      // calculate an acceptable size for the dag, this isn"t perfect due to the strange ways the dag can get laid out
      let dagWidth = 500, dagHeight = 300;
      let maxLayer = 1;
      let layerCount: Array<number> = []
      dag.each((d: FlowDagNode) => { 
        if(d.layer > maxLayer) maxLayer = d.layer;
        if(!layerCount[d.layer]) layerCount[d.layer] = 0;
        layerCount[d.layer]++
      });
      let maxInLayer = 1;
      for(let i = 0; i < layerCount.length; i++) {
        if(layerCount[i] > maxInLayer) maxInLayer = layerCount[i];
      }
      dagHeight = maxInLayer * (nodeRadius * 2 + 10)
      if(maxLayer > 4) {
        dagWidth = maxLayer * (nodeRadius * 3 + 10)
      }

      // convert to horizontal
      dag.each((n:FlowDagNode) => [n.x, n.y] = [n.y * dagWidth, n.x * dagHeight]);
      dag.eachLinks((l:any) => (l.data.points || []).forEach((p:any) => [p.x, p.y] = [p.y * dagWidth, p.x * dagHeight]));

      // get the data from the dag, with the root node filtered out
      const edges = dag.links().filter((d: any) => d.source.id != FlowRootNodeId);
      this.dagNodes = dag.descendants().filter((d: FlowDagNode) => d.id != FlowRootNodeId);

      // add links
      const links = this.dagOverlayGroup
        .selectAll(".edge-group")
        .data(edges, getEdgeId)

      let linkEnter = links.enter().append("g").attr("class", "edge-group");
      let linkEnterPath = linkEnter.append("path")
        .attr("class", "link")
        .attr("d", linkPath)
      linkEnter.append("path") // this lets each link have a larger hit target without affecting apperance
        .attr("class", "link-ghost")
        .attr("d", linkPath)
        .on("mouseover", (d, i, domNodes) => { this.onOverEdge(d, domNodes[i]); })
        .on("mouseout", (d, i, domNodes) => { this.onOutEdge(d, domNodes[i]); })
        .on("click", (d, i, domNodes) => { this.onClickEdge(d, domNodes[i]); });
      if(this.playNodeLocation != undefined) {
        // when edges are added, there should be a temp edge that animates to this position, so we wait for that to finish moving before displaying
        linkEnterPath.attr("display", "none").attr("opacity", 0)
          .transition().delay(duration).attr("display", "").duration(fastDuration).attr("opacity", 1)
      }

      // display and opacity set here to cover edge cases where user interrupts transitions
      // d3's selectAll("path") doesn't seem to work here :/
      links.select(".link").transition().duration(duration).attr("opacity", 1).attr("display", "").attr("d", linkPath);
      links.select(".link-ghost").transition().duration(duration).attr("d", linkPath);
      links.transition(); // preempts the edge exit transition

      // add nodes
      const nodeTransform = (d: {x: number, y: number}) => `translate(${d.x}, ${d.y})`
      const nodes = this.dagGroup
        .selectAll(".node-group")
        .data(this.dagNodes, (d) => d != undefined ? (d as FlowDagNode).id : "");

      const nodeEnter = nodes.enter()
        .append("g")
        .attr("id", (d) => "dom-node-"+d.id)
        .attr("class", "node-group")
        .call(this.dragListener)
        .on("mouseover", (d, i, domNodes) => { this.onOverNode(d, domNodes[i]); })
        .on("mouseout", (d, i, domNodes) => { this.onOutNode(d, domNodes[i]); })
        .on("click", (d, i, domNodes) => { this.onClickNode(d, domNodes[i]); });
      nodeEnter.append("circle")
        .attr("class", "node")
        .attr("r", nodeRadius);
      nodeEnter.append("text")
        .attr("class", "icon-text")
        .attr("font-size", `${nodeIconSize}px` )
        .text((d: FlowDagNode) => getFlowNodeTypeIcon(d.data.type));
      if(this.playNodeLocation != undefined) {
        nodeEnter
          .attr("opacity", 0)
          .attr("transform", nodeTransform(this.playNodeLocation))
          .transition()
            .duration(duration)
            .attr("opacity", 1)
            .attr("transform", nodeTransform)
      } else {
        nodeEnter.attr("opacity", 1).attr("transform", nodeTransform)
      }
      
      let nodeUpdate = nodes.transition()
        .duration(duration)
        .attr("transform", nodeTransform)
        .attr("opacity", 1); // there was an issue where adding multiple nodes quickly would leave some faded, this opacity set fixes that

      // get the play node location as new nodes will spawn from it
      for(let i = 0; i < this.dagNodes.length; i++) {
        if(this.dagNodes[i].id == FlowPlayNodeId) {
          this.playNodeLocation = {x:this.dagNodes[i].x, y: this.dagNodes[i].y}
          break;
        }
      }

      let linkExit = links.exit();
      linkExit.select(".link").attr("opacity", 1)
        .transition().duration(duration).attr("opacity", 0).attr("d", linkPath({source: this.playNodeLocation, target: this.playNodeLocation}) || {} as any);
      linkExit.transition().delay(duration).remove();

      nodes.exit().attr("opacity", 1)
        .transition().duration(duration).attr("transform", nodeTransform(this.playNodeLocation!)).attr("opacity", 0).remove()
    }

    // responsive callback, resizes the svg and reponsitions elements based on space
    resize() {
      const graphTopBottomPadding = 10, graphRightPadding = 10, graphLeftPadding = 10;
      const sideBarTopPadding = 10, sideBarBottomPadding = 10, sideBarLeftPadding = 10;
      // get the on screen sizes of all the responsive elements
      const offset = this.baseSvg.node()!.getBoundingClientRect();
      const gSize = this.dagGroup.node()!.getBoundingClientRect();
      const sSize = this.sidebarGroup.node()!.getBoundingClientRect();
      const sideBarOffsetX = sideBarElementWidth + nodeRadius + graphLeftPadding // +10 for left padding
      // compute and set a new height and width for the svg based on the container
      this.width = Math.max(this.$el.clientWidth, gSize.width + sideBarOffsetX + graphRightPadding);
      this.height = Math.max(this.$el.clientHeight - 5, gSize.height + (graphTopBottomPadding*2), sSize.height + sideBarTopPadding + sideBarBottomPadding); // -5 for scrolling
      this.baseSvg.attr("width", this.width).attr("height", this.height);
      // keep the graph center, but don't let it overlap with the sidebar
      // the graph isn't always center in its group so we use the computed offset of the dagGroup, minus the offset of the svg itself, minus the previous offset attempt, to calculate the center offset
      (this.dagGroup as any).x = Math.max((this.width-gSize.width)/2, sideBarOffsetX) - (gSize.left - offset.left - (this.dagGroup as any).x);
      (this.dagGroup as any).y = (this.height-gSize.height)/2 - (gSize.top - offset.top - (this.dagGroup as any).y);
      this.dagGroup.style("transform", "translate("+(this.dagGroup as any).x+"px, "+(this.dagGroup as any).y+"px)");
      this.dagOverlayGroup.style("transform", "translate("+(this.dagGroup as any).x+"px, "+(this.dagGroup as any).y+"px)");
      // set the sidebar to be vertically centered on the left
      let sgY = Math.max((this.$el.clientHeight-sSize.height)/2, sideBarTopPadding); // using clientHeight directly to avoid the sidebar moving if the graph requires scrolling
      this.sidebarGroup.style("transform", "translate(" + sideBarLeftPadding + "px, " + sgY + "px)"); 
    }

    // side bar button mouse handlers
    onStartSidebarDrag(domNode: SVGElement, cloneX:number, cloneY: number, cloneType: FlowNodeType) {
      // add a clone of the button that the user can drag around
      let oriPos = makeAbsoluteContext(domNode, this.baseSvg.node()!)(cloneX, cloneY);
      this.sidebarClone = this.baseSvg.append("g");
      this.addSidebarNodeElement(this.sidebarClone, 0, 0, getFlowNodeTypeIcon(cloneType), "rgba(255, 255, 255, .3)")
      this.sidebarClone.x = oriPos.x;
      this.sidebarClone.y = oriPos.y;
      this.sidebarClone.type = cloneType;
      this.sidebarClone.attr("transform", "translate(" + this.sidebarClone.x + "," + this.sidebarClone.y + ")");
      this.sidebarClone.attr("opacity", 0).transition().duration(veryFastDuration).attr("opacity", 1);
    }
    onUpdateSidebarDrag(domNode: Element) {
      // update tbe clone's position
      this.sidebarClone.x += d3.event.dx;
      this.sidebarClone.y += d3.event.dy;
      this.sidebarClone.attr("transform", "translate(" + this.sidebarClone.x + "," + this.sidebarClone.y + ")");
    }
    onEndSidebarDrag(domNode: Element) {
      // add the new node
      this.value.push({
        id: "N_"+uuidv4(),
        type: this.sidebarClone.type,
        parentIds: [FlowRootNodeId]
      });
      this.refreshNodes();
      this.$emit("input", this.value);

      // hide the clone
      this.sidebarClone.attr("opacity", 1).transition().duration(fastDuration).attr("opacity", 0).remove();
      this.sidebarClone = undefined;
    }
    onOverSidebarNode(domNode: Element, x: number, y: number, icon: string) {
      // add a glow effect when the user hovers over
      let node = d3.select(domNode)
      if(node.select(".glow").size() == 0) {
        node.insert("text","text")
        .attr("class", "glow icon-text")
        .attr("x", x + sideBarElementWidth/2)
        .attr("y", y + sideBarElementHeight/2)
        .attr("font-size", `${sideBarElementIconSize}px`)
        .text(icon)
        .attr("opacity", 0).transition().duration(fastDuration).attr("opacity", 1);
      } else {
        //if there's a remove transition, this will undo it
        node.select(".glow").transition().duration(fastDuration).attr("opacity", 1);
      }
    }
    onOutSidebarNode(domNode: Element) {
      // hide the glow effect
      d3.select(domNode).select(".glow").transition().duration(fastDuration).attr("opacity", 0).remove()
    }

    // generates links that always go from left to right
    dragPath({source, target}: {source:[number, number], target:[number, number]}) {
      let path = d3.path();
      path.moveTo(source[0], source[1]);
      path.bezierCurveTo(source[0] + 5 + Math.abs(target[0] - source[0])/2, source[1], target[0] - 5 - Math.abs(target[0] - source[0])/2, target[1], target[0], target[1]);
      return path
    }

    // node mouse handlers
    onStartNodeDrag(d: FlowDagNode, domNode: Element) {
      if(d.id == FlowRootNodeId) return;

      // create a temporary link that the user can drag around
      this.draggedLink = this.dagOverlayGroup.append("g");
      this.draggedLink.d = {
        source: [d.x + nodeRadius, d.y],
        target: d3.mouse(this.dagGroup.node()!)
      }
      this.draggedLink.append("path")
        .attr("class", "link")
        .attr("d", this.dragPath(this.draggedLink.d))
        .attr("opacity", 0)
        .transition()
          .duration(fastDuration)
          .attr("opacity", 1)
    }
    onUpdateNodeDrag(d: FlowDagNode, domNode: Element) {
      if(d.id == FlowRootNodeId) return;

      // update the temporary link. if we're over a node, snap to it
      if(this.hoveredNode != undefined && this.hoveredNode != d) {
        this.draggedLink.d.target = [this.hoveredNode.x - nodeRadius - 7, this.hoveredNode.y];
      } else {
        this.draggedLink.d.target = d3.mouse(this.dagGroup.node()!)
      }
      this.draggedLink.select("path").attr("d", this.dragPath(this.draggedLink.d));

      // panning at screen edge
      const edgeBuffer = 50; // how far from the edge before we start scrolling
      let mousePos = d3.mouse(this.$el)
      if(mousePos[0] < edgeBuffer) this.scrollDx = mousePos[0] - edgeBuffer;
      else if(mousePos[0] > this.$el.clientWidth - edgeBuffer) this.scrollDx = mousePos[0] - this.$el.clientWidth + edgeBuffer;
      else this.scrollDx = 0;
      if(mousePos[1] < edgeBuffer) this.scrollDy = mousePos[1] - edgeBuffer;
      else if(mousePos[1] > this.$el.clientHeight - edgeBuffer) this.scrollDy = mousePos[1] - this.$el.clientHeight + edgeBuffer;
      else this.scrollDy = 0;

      if((this.scrollDx != 0 || this.scrollDy != 0) && this.scrollTimer == undefined) {
        this.scrollTimer = setInterval(
          () => {(this.$refs.graphScroll as any).scrollBy({dx: this.scrollDx, dy: this.scrollDy})},
          50);
      }
    }
    onEndNodeDrag(d: FlowDagNode, domNode: Element) {
      if(d.id == FlowRootNodeId) return;

      // add the new link to the selected node
      let mergeLink = false;
      if(this.hoveredNode != undefined && this.hoveredNode.id != d.id) {
        if(this.hoveredNode.id == FlowPlayNodeId) {
          this.$notify.error({title: "Cannot link to Play node", message: ""});
        } else {
          let linkExists = false;
          for(let id of this.hoveredNode.data.parentIds) { // check for an exising link
            if(id == d.id) {
              linkExists = true;
              break;
            }
          }
          if(!linkExists) {
            if(!hasPath(this.value, d.data, this.hoveredNode.id, {[this.hoveredNode.id]: [d.id]})) { // check for cycles
              if(this.hoveredNode.data.parentIds[0] == FlowRootNodeId) { // remove the root node if it was a parent
                this.hoveredNode.data.parentIds.shift();
              }
              this.hoveredNode.data.parentIds.push(d.id);
              this.refreshNodes();
              this.$emit("input", this.value);
              mergeLink = true;
            } else {
              this.$notify.error({title: "Link would create a dependency cycle", message: ""});
            }
          } else {
            this.$notify.error({title: "Link Already Exists", message: ""});
          }
        }
      }

      // if we successfully added a new link, transition this temp link to where the new link is going
      if(mergeLink) {
        // get the updated positions for the nodes
        for(let dagNode of this.dagNodes) {
          if(dagNode.id == d.id)
            this.draggedLink.d.source = [dagNode.x + nodeRadius, dagNode.y];
          if(dagNode.id == this.hoveredNode!.id)
            this.draggedLink.d.target = [dagNode.x - nodeRadius - 7, dagNode.y];
        }
        // transition with a crossfade, note that this line uses a different curve then the permanent one so there may be glitches
        this.draggedLink.select("path").transition().duration(duration).attr("d", this.dragPath(this.draggedLink.d)).transition().duration(duration).attr("opacity", 0).remove();
      } else {
        this.draggedLink.transition().duration(fastDuration).attr("opacity", 0).remove();
      }
      this.draggedLink = undefined;

      // clear panning
      if(this.scrollTimer != undefined) {
        clearInterval(this.scrollTimer);
        this.scrollTimer = undefined
        this.scrollDx = 0;
        this.scrollDy = 0;
      }
    }
    onOverNode(d: FlowDagNode, domNode: Element) {
      // add a glow effect when the user hovers over
      this.showNodeGlow(d, domNode);
      // keep track of this node in case the user performs an action on it
      this.hoveredNode = d;
    }
    onOutNode(d: FlowDagNode, domNode: Element) {
      // hide the glow effect if the node isn't selected
      if(this.selectedNode === undefined || this.selectedNode.d != d) {
        this.hideNodeGlow(d, domNode);
      }
      // clear the node from being tracked
      this.hoveredNode = undefined;
    }
    onClickNode(d: FlowDagNode, domNode: Element) {
      this.selectNode(d, domNode);
    }
    selectNodeById(id: string) {
      let d = this.getDagNode(id);
      let domNode = this.getDagNodeDomElement(id);
      if(d == null || domNode == null) return;

      this.selectNode(d, domNode as Element);
    }
    selectNode(d: FlowDagNode, domNode: Element) {
      if(this.selectedNode != undefined && this.selectedNode.d == d) return;
      this.clearSelection();
      this.selectedNode = {d, domNode};
      this.$emit("node-selected", d);
      this.showNodeGlow(d, domNode);
    }
    showNodeGlow(d: FlowDagNode, domNode: Element) {
      let node = d3.select(domNode)
      if(node.select(".glow").size() == 0) {
        node.insert("text","text")
        .attr("class", "glow icon-text")
        .attr("font-size", `${nodeIconSize + 5}px` ) // +5 for a stronger glow
        .text(getFlowNodeTypeIcon(d.data.type))
        .attr("opacity", 0).transition().duration(fastDuration).attr("opacity", 1);
      } else {
        //if there's a remove transition, this will undo it
        node.select(".glow").transition().duration(fastDuration).attr("opacity", 1);
      }
    }
    hideNodeGlow(d: FlowDagNode, domNode: Element, force = false) {
      let node = d3.select(domNode).select(".glow");
      if(!force) {
        node.transition().duration(fastDuration).attr("opacity", 0).remove();
      } else {
        node.remove();
      }
    }

    // edge mouse handlers
    onOverEdge(d: any, domNode: Element) {
      // add a glow effect when the user hovers over
      let group = d3.select(domNode.parentElement)
      let existingGlow = group.select(".glow-path-"+getEdgeId(d));
      if(existingGlow.size() == 0) {
        group.append("path")
          .attr("class", "link glow glow-path-"+getEdgeId(d))
          .attr("d", linkPath(d) || {} as any)
          .attr("stroke-width", 4)
          .style("marker-end", "unset")
          .attr("opacity", 0).transition().duration(fastDuration).attr("opacity", 1);
      } else {
        //if there's a remove transition, this will undo it
        existingGlow.transition().duration(fastDuration).attr("opacity", 1);
      }
    }
    onOutEdge(d: any, domNode: Element) {
      // hide the glow effect if the edge isn't selected
      if(this.selectedEdge === undefined || this.selectedEdge.d != d) {
        this.hideEdgeGlow(d, domNode);
      }
    }
    onClickEdge(d: any, domNode: Element) {
      if(this.selectedEdge != undefined && this.selectedEdge.d == d) return;
      this.clearSelection();
      this.selectedEdge = {d, domNode};
      this.$emit("edge-selected", d);
    }
    hideEdgeGlow(d: any, domNode: Element, force = false) {
      let edge = d3.select(domNode.parentElement).select(".glow-path-"+getEdgeId(d));
      if(!force) {
        edge.transition().duration(fastDuration).attr("opacity", 0).remove();
      } else {
        edge.remove();
      }
    }

    getDagNode(id: string) {
      for(let dagNode of this.dagNodes) {
        if(dagNode.id == id)
          return dagNode;
      }
      return undefined;
    }
    getDagNodeDomElement(id: string) {
      return d3.select("#dom-node-"+id).node();
    }

    clearSelection(force = false) {
      if(this.selectedNode !== undefined) {
        this.hideNodeGlow(this.selectedNode.d, this.selectedNode.domNode, force);
        this.selectedNode = undefined;
      }
      if(this.selectedEdge !== undefined) {
        this.hideEdgeGlow(this.selectedEdge.d, this.selectedEdge.domNode, force);
        this.selectedEdge = undefined;
      }
    }

    deleteSelection() {
      if(this.selectedNode !== undefined) {
        if(this.selectedNode.d.id == FlowRootNodeId) return false;
        if(this.selectedNode.d.id == FlowPlayNodeId) {
          this.$notify.error({title: "Cannot Delete Play Node", message: ""});
          return false;
        }

        // delete all the edges
        for(let child of this.selectedNode.d.children) {
          this.deleteEdgeHelper(child.data, this.selectedNode.d.id);
        }

        // delete the node
        for(let i = 0; i < this.value.length; i++) {
          if(this.value[i].id == this.selectedNode.d.id) {
            this.value.splice(i, 1);
            break;
          }
        }
      }
      if(this.selectedEdge !== undefined) {
        if(this.selectedEdge.d.source.id == FlowRootNodeId) return false;

        this.deleteEdgeHelper(this.selectedEdge.d.target.data, this.selectedEdge.d.source.id);
      }
      this.clearSelection(true);
      this.refreshNodes();
      this.$emit("input", this.value);
      return true;
    }

    deleteEdgeHelper(target: {parentIds: Array<string>}, sourceName: string) {
      for(let i = 0; i < target.parentIds.length; i++) { // find and remove the parent
        if(target.parentIds[i] == sourceName) {
          target.parentIds.splice(i as any, 1);
          break;
        }
      }
      if(target.parentIds.length == 0) { // if there are no more parents, add the root node
        target.parentIds.push(FlowRootNodeId);
      }
    }
  }
</script>

<style lang="scss">
.graph-scroll-container {
  height: 100%;
  width: 100%;

  svg {
    overflow: visible;

    text {
      user-select: none;
    }
    text::selection {
      background: none;
    }
  }

  .sidebar-rect {
    rx: 15;
    ry: 15;
    cursor: pointer;
  }

  .icon-text {
    text-anchor: middle;
    dominant-baseline: central;
    font-family: "Material Design Icons";
    fill: white;
    pointer-events: none;
  }

  .glow {
    filter: url(#glow);
  }

  .node {
    fill: rgba(0,0,0,.5);
    stroke: white;
    cursor: pointer;
    transform: rotate(.01deg); // hack to get better anti-aliasing
  }

  .link {
    fill: none;
    stroke: white;
    marker-end: url(#triangle);
    pointer-events: none;
  }

  .link-ghost {
    stroke-width: 10;
    stroke: transparent;
    fill: none;
    cursor: pointer;
  }

  .__vuescroll .__panel.__native {
    overflow: hidden;
  }
}
</style>
