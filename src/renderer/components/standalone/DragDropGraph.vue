<template>
  <div class="graph-scroll-container">
    <vue-scroll ref="graphScroll">
      <div ref="graphContainer"/>
    </vue-scroll>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
  import { v4 as uuidv4 } from 'uuid'
  import * as d3 from "d3"
  import * as d3dag from "d3-dag"
  import { ResizeObserver as ResizeObserverType } from '@/../../types/ResizeObserver.d.ts'
  declare var ResizeObserver: ResizeObserverType;

  const rootNodeId = "root";
  const playNodeId = "play";
  const nodeRadius = 30;
  const sideBarElementWidth = 100;
  const sideBarElementHeight = 100;
  const sideBarElementIconSize = 70;
  const nodeIconSize = 40;
  const duration = 750; // default transition duration
  const fastDuration = 300;
  const veryFastDuration = 150;

  interface NodeDatum {
    id: string,
    icon: string,
    parentIds: Array<string>
  }

  // from https://stackoverflow.com/questions/26049488/how-to-get-absolute-coordinates-of-object-inside-a-g-group
  function makeAbsoluteContext(element: any, svgDocument: SVGSVGElement) {
    return function(x:number, y:number) {
      var offset = svgDocument.getBoundingClientRect();
      var matrix = element.getScreenCTM();
      return {
        x: (matrix.a * x) + (matrix.c * y) + matrix.e - offset.left,
        y: (matrix.b * x) + (matrix.d * y) + matrix.f - offset.top
      };
    };
  }

  // from https://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
  function getTransformation(transform: string) {
    // Create a dummy g for calculation purposes only. This will never
    // be appended to the DOM and will be discarded once this function 
    // returns.
    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    // Set the transform attribute to the provided string value.
    g.setAttributeNS(null as any, "transform", transform);
    
    // consolidate the SVGTransformList containing all transformations
    // to a single SVGTransform of type SVG_TRANSFORM_MATRIX and get
    // its SVGMatrix. 
    let matrix = g.transform.baseVal.consolidate().matrix;
    
    // Below calculations are taken and adapted from the private function
    // transform/decompose.js of D3's module d3-interpolate.
    let {a, b, c, d, e, f} = matrix;   // ES6, if this doesn't work, use below assignment
    let scaleX = Math.sqrt(a * a + b * b);
    if (scaleX) a /= scaleX, b /= scaleX;
    let skewX = a * c + b * d
    if (skewX) c -= a * skewX, d -= b * skewX;
    let scaleY = Math.sqrt(c * c + d * d);
    if (scaleY) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * 180 / Math.PI,
      skewX: Math.atan(skewX) * 180 / Math.PI,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  @Component({ components: {} })
  export default class DragDropGraph extends Vue {
    nodeData: Array<NodeDatum> = [{
      "id": rootNodeId,
      "icon": "\uF830", //shape
      "parentIds": []
    }, {
      "id": playNodeId,
      "icon": "\uF40A", //play
      "parentIds": [rootNodeId]
    }];

    // svg and its main content groups
    baseSvg!: d3.Selection<SVGSVGElement, {}, null, undefined>
    dagGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    dagOverlayGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    sidebarGroup!: d3.Selection<SVGGElement, {}, null, undefined>
    // size of the svg
    height = 0
    width = 0
    // variables for adding nodes and drag/drop
    selectedNode:any
    dagNodes: any;
    sidebarClone: any
    draggedLink: any
    dragListener!: d3.DragBehavior<SVGGElement, any, {} | d3.SubjectPosition>
    playNodeLocation?: {x:number, y:number}

    mounted() {
      // define the baseSvg and its main content groups
      this.baseSvg = d3.select(this.$refs.graphContainer as Element).append("svg");
      this.dagGroup = this.baseSvg.append("g");
      this.dagOverlayGroup = this.baseSvg.append("g");
      this.sidebarGroup = this.baseSvg.append("g");

      (this.dagGroup as any).x = 0;
      (this.dagGroup as any).y = 0;
      
      // Define the drag listeners for drag/drop behaviour of nodes.
      this.dragListener = d3.drag<SVGGElement, any>()
        .on("start", (d, i, domNodes) => { this.startDrag(d, domNodes[i]); })
        .on("drag", (d, i, domNodes) => { this.updateDrag(d, domNodes[i]); })
        .on("end", (d, i, domNodes) => { this.endDrag(d, domNodes[i]); });
      
      this.addSidebarBtn(0, 0, '\uF59F'); //web
      //+10 for padding
      this.addSidebarBtn(0, sideBarElementHeight + 10, '\uF7E4'); //pipe
      this.addSidebarBtn(0, (sideBarElementHeight + 10) * 2, '\uF0F8'); //call-merge
      this.addSidebarBtn(0, (sideBarElementHeight + 10) * 3, '\uF9BA'); //arrow-decision
      this.addSidebarBtn(0, (sideBarElementHeight + 10) * 4, '\uF4B2'); //sleep

      // set up resizing response
      new ResizeObserver(this.resize).observe(this.$el)
      new ResizeObserver(this.resize).observe(this.dagGroup.node())
      this.resize()

      let defs = this.baseSvg.append("svg:defs")

      //arrows for lines
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
      
      //blur filter, useful for glows
      defs.append("filter")
        .attr("id","glow")
        .append("feGaussianBlur")
        .attr("stdDeviation","3.5")

      //show the graph
      this.refreshNodes();
    }


    addSidebarBtn(x: number, y: number, icon: string) {
      let btn = this.sidebarGroup.append("g")
      this.addSidebarNodeElement(btn, x, y, icon, "rgba(0,0,0,.5)")
      btn.attr('pointer-events', 'mouseover')
        .on("mouseover", (d, i, domNodes) => { this.overSidebarNode(d, domNodes[i], x, y, icon); })
        .on("mouseout", (d, i, domNodes) => { this.outSidebarNode(d, domNodes[i]); })
      btn.call(d3.drag<SVGGElement, any>()
          .on("start", (d, i, domNodes) => { this.startSidebarDrag(d, domNodes[i], x, y, icon); })
          .on("drag", (d, i, domNodes) => { this.updateSidebarDrag(d, domNodes[i]); })
          .on("end", (d, i, domNodes) => { this.endSidebarDrag(d, domNodes[i]); }));
    }

    addSidebarNodeElement(parent: d3.Selection<SVGGElement, any, any, any>, x: number, y: number, icon: string, fill: string) {
      parent.append("rect")
        .attr("class", "sidebar-rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", sideBarElementWidth)
        .attr("height", sideBarElementHeight)
        .attr("fill", fill);
      parent.append('text')
        .attr("class", "icon-text")
        .attr("x", x + sideBarElementWidth/2)
        .attr("y", y + sideBarElementHeight/2)
        .attr('font-size', `${sideBarElementIconSize}px` )
        .text(icon); 
    }

    // updates the graph with changes from nodeData
    refreshNodes() {
      // convert out data to the dag format and generate a layout
      let dag = d3dag.dratify()(this.nodeData);
      d3dag.sugiyama().layering(d3dag.layeringSimplex()).decross(d3dag.decrossOpt())(dag);

      // calculate an acceptable size for the dag, this isn't perfect due to the strange ways the dag can get laid out
      let dagWidth = 500, dagHeight = 300;
      let maxLayer = 1;
      let layerCount: Array<number> = []
      dag.each((d: any) => { 
        if(d.layer > maxLayer) maxLayer = d.layer;
        if(!layerCount[d.layer]) layerCount[d.layer] = 0;
        layerCount[d.layer]++
      });
      let maxInLayer = 1;
      for(let i in layerCount) {
        if(layerCount[i] > maxInLayer) maxInLayer = layerCount[i];
      }
      dagHeight = maxInLayer * (nodeRadius * 2 + 10)
      if(maxLayer > 4) {
        dagWidth = maxLayer * (nodeRadius * 3 + 10)
      }

      // convert to horizontal
      dag.each((n:any) => [n.x, n.y] = [n.y * dagWidth, n.x * dagHeight]);
      dag.eachLinks((l:any) => (l.data.points || []).forEach((p:any) => [p.x, p.y] = [p.y * dagWidth, p.x * dagHeight]));

      // get the data from the dag, with the root node filtered out
      const edges = dag.links().filter((d: any) => d.source.id != rootNodeId);
      this.dagNodes = dag.descendants().filter((d: any) => d.id != rootNodeId);

      // add links
      const linkPath = (d: any) => {
        let source:[number, number] = [ d.source.x + nodeRadius,  d.source.y ];
        let target:[number, number] = [ d.target.x - nodeRadius - 7, d.target.y ]; //-7 for marker
        return d3.linkHorizontal()({ source, target });
      }
      const links = this.dagGroup
        .selectAll('path')
        .data(edges, (d: any) => { 
          return d != undefined ? d.source.id + ":" + d.target.id : "";
        })

      links.enter()
        .append('path')
        .attr('d', linkPath)
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr("marker-end", "url(#triangle)")
        .attr("display", "none")
        .transition()
          .delay(duration)
          .attr("display", "")

      links.transition()
        .duration(duration)
        .attr('d', linkPath);

      links.exit()
        .transition()
          .duration(duration)
          .attr("opacity", 0)
          .remove();

      // add nodes
      const nodeTransform = (d: any) => `translate(${d.x}, ${d.y})`
      const nodes = this.dagGroup
        .selectAll('g')
        .data(this.dagNodes, (d: any) => d != undefined ? d.id : "");

      const nodeEnter = nodes.enter()
        .append('g')
        .call(this.dragListener)
        .on("mouseover", (d, i, domNodes) => { this.overNode(d, domNodes[i]); })
        .on("mouseout", (d, i, domNodes) => { this.outNode(d, domNodes[i]); });
      nodeEnter.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', 'rgba(0,0,0,.5)')
        .attr('stroke', 'white')
        .style('cursor', 'pointer')
      nodeEnter.append('text')
        .attr("class", "icon-text")
        .attr('font-size', `${nodeIconSize}px` )
        .text((d: any) => d.data.icon);
      if(this.playNodeLocation != undefined) {
        nodeEnter
          .attr("opacity", 0)
          .attr('transform', nodeTransform(this.playNodeLocation))
          .transition()
            .duration(duration)
            .attr("opacity", 1)
            .attr('transform', nodeTransform)
      } else {
        nodeEnter.attr("opacity", 1).attr('transform', nodeTransform)
      }
      
      let nodeUpdate = nodes.transition()
        .duration(duration)
        .attr("transform", nodeTransform);

      // get the play node location as new nodes will spawn from it
      for(let i in this.dagNodes) {
        if(this.dagNodes[i].id == playNodeId) {
          this.playNodeLocation = {x:this.dagNodes[i].x, y: this.dagNodes[i].y}
          break;
        }
      }
    }

    // responsive callback, resizes the svg and reponsitions elements based on space
    resize() {
      const graphTopBottomPadding = 10, graphRightPadding = 10, graphLeftPadding = 10;
      // get the on screen sizes of all the responsive elements
      const offset = this.baseSvg.node()!.getBoundingClientRect();
      const gSize = this.dagGroup.node()!.getBoundingClientRect();
      const sSize = this.sidebarGroup.node()!.getBoundingClientRect();
      const sideBarOffsetX = sideBarElementWidth + nodeRadius + graphLeftPadding // +10 for left padding
      // compute and set a new height and width for the svg based on the container
      this.width = Math.max(this.$el.clientWidth, gSize.width + sideBarOffsetX + graphRightPadding);
      this.height = Math.max(this.$el.clientHeight - 5, gSize.height + (graphTopBottomPadding*2)); // -5 for scrolling
      this.baseSvg.attr("width", this.width).attr("height", this.height);
      // keep the graph center, but don't let it overlap with the sidebar
      // the graph isn't always center in its group so we use the computed offset of the dagGroup, minus the offset of the svg itself, minus the previous offset attempt, to calculate the center offset
      (this.dagGroup as any).x = Math.max((this.width-gSize.width)/2, sideBarOffsetX) - (gSize.left - offset.left - (this.dagGroup as any).x);
      (this.dagGroup as any).y = (this.height-gSize.height)/2 - (gSize.top - offset.top - (this.dagGroup as any).y);
      this.dagGroup.style("transform", "translate("+(this.dagGroup as any).x+"px, "+(this.dagGroup as any).y+"px)");
      this.dagOverlayGroup.style("transform", "translate("+(this.dagGroup as any).x+"px, "+(this.dagGroup as any).y+"px)");
      // set the sidebar to be vertically centered on the left
      this.sidebarGroup.style("transform", "translate(0px, " + ((this.$el.clientHeight-sSize.height)/2) + "px)"); // using clientHeight directly to avoid the sidebar moving if the graph requires scrolling
    }

    // side bar button mouse handlers
    startSidebarDrag(d: undefined, domNode: SVGElement, cloneX:number, cloneY: number, cloneIcon: string) {
      // add a clone of the button that the user can drag around
      let oriPos = makeAbsoluteContext(domNode, this.baseSvg.node()!)(cloneX, cloneY);
      this.sidebarClone = this.baseSvg.append("g");
      this.addSidebarNodeElement(this.sidebarClone, 0, 0, cloneIcon, "rgba(255, 255, 255, .3)")
      this.sidebarClone.x = oriPos.x;
      this.sidebarClone.y = oriPos.y;
      this.sidebarClone.icon = cloneIcon;
      this.sidebarClone.attr("transform", "translate(" + this.sidebarClone.x + "," + this.sidebarClone.y + ")");
      this.sidebarClone.attr("opacity", 0).transition().duration(veryFastDuration).attr("opacity", 1);
    }
    updateSidebarDrag(d: undefined, domNode: Element) {
      // update tbe clone's position
      this.sidebarClone.x += d3.event.dx;
      this.sidebarClone.y += d3.event.dy;
      this.sidebarClone.attr("transform", "translate(" + this.sidebarClone.x + "," + this.sidebarClone.y + ")");
    }
    endSidebarDrag(d: undefined, domNode: Element) {
      // add the new node
      this.nodeData.push({
        "id": "N_"+uuidv4(),
        "icon": this.sidebarClone.icon,
        "parentIds": [rootNodeId]
      })
      this.refreshNodes();
      // hide the clone
      this.sidebarClone.attr("opacity", 1).transition().duration(fastDuration).attr("opacity", 0).remove();
      this.sidebarClone = undefined;
    }
    overSidebarNode(d: any, domNode: Element, x: number, y: number, icon: string) {
      // add a glow effect when the user hovers over
      let node = d3.select(domNode)
      if(node.select(".glow").size() == 0) {
        node.insert("text","text")
        .attr('class', 'glow icon-text')
        .attr("x", x + sideBarElementWidth/2)
        .attr("y", y + sideBarElementHeight/2)
        .attr('font-size', `${sideBarElementIconSize}px`)
        .style("filter", "url(#glow)")
        .text(icon)
        .attr("opacity", 0).transition().duration(fastDuration).attr("opacity", 1);
      }
    }
    outSidebarNode(d: any, domNode: Element) {
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
    startDrag(d: any, domNode: Element) {
      if(d.id == rootNodeId) return;

      // create a temporary link that the user can drag around
      this.draggedLink = this.dagOverlayGroup.append("g");
      this.draggedLink.d = {
        source: [d.x + nodeRadius, d.y],
        target: d3.mouse(this.dagGroup.node()!)
      }
      this.draggedLink.append('path')
        .attr('d', this.dragPath(this.draggedLink.d))
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr("marker-end", "url(#triangle)")
        .attr("opacity", 0)
        .attr("pointer-events", "none")
        .transition()
          .duration(duration)
          .attr("opacity", 1)
    }
    updateDrag(d: any, domNode: Element) {
      if(d.id == rootNodeId) return;

      // update the temporary link. if we're over a node, snap to it
      if(this.selectedNode != undefined && this.selectedNode != d) {
        this.draggedLink.d.target = [this.selectedNode.x - nodeRadius - 7, this.selectedNode.y];
      } else {
        this.draggedLink.d.target = d3.mouse(this.dagGroup.node()!)
      }
      this.draggedLink.select('path').attr('d', this.dragPath(this.draggedLink.d));

      // panning at screen edge
      const edgeBuffer = 50; // how far from the edge before we start scrolling
      let dx = undefined, dy = undefined;
      let mousePos = d3.mouse(this.$el)
      if(mousePos[0] < edgeBuffer) dx = -30;
      if(mousePos[0] > this.$el.clientWidth - edgeBuffer) dx = 30;
      if(mousePos[1] < edgeBuffer) dy = -30;
      if(mousePos[1] > this.$el.clientHeight - edgeBuffer) dy = 30;

      if(dx != undefined || dy != undefined)
        (this.$refs.graphScroll as any).scrollBy({dx, dy})
    }
    endDrag(d: any, domNode: Element) {
      if(d.id == rootNodeId) return;

      // add the new link to the selected node
      let mergeLink = false;
      if(this.selectedNode != undefined && this.selectedNode.id != playNodeId) { // TODO: show a visible warning to the user
        let linkExists = false;
        for(let i in this.selectedNode.data.parentIds) { // check for an exising link
          if(this.selectedNode.data.parentIds[i] == d.id) {
            linkExists = true;
            break;
          }
        }
        if(!linkExists) {
          this.selectedNode.data.parentIds.push(d.id);
          if(!this.hasCycle(d.data, this.selectedNode.id)) { // check for cycles
            if(this.selectedNode.data.parentIds[0] == rootNodeId) {
              this.selectedNode.data.parentIds.shift();
            }
            this.refreshNodes();
            mergeLink = true;
          } else {
            this.selectedNode.data.parentIds.pop();
            console.log("cycle!"); // TODO: show a visible warning to the user
          }
        } else {
          console.log("link exists"); // TODO: show a visible warning to the user
        }
      }

      // if we successfully added a new link, transition this temp link to where the new link is going
      if(mergeLink) {
        // get the updated positions for the nodes
        for(let i in this.dagNodes) {
          if(this.dagNodes[i].id == d.id)
            this.draggedLink.d.source = [this.dagNodes[i].x + nodeRadius, this.dagNodes[i].y];
          if(this.dagNodes[i].id == this.selectedNode.id)
            this.draggedLink.d.target = [this.dagNodes[i].x - nodeRadius - 7, this.dagNodes[i].y];
        }
        // transition with a cut, note that this line uses a different curve then the permanent one so there may be glitches
        this.draggedLink.select('path').transition().duration(duration).attr('d', this.dragPath(this.draggedLink.d)).remove();
      } else {
        this.draggedLink.attr("opacity", 1).transition().duration(fastDuration).attr("opacity", 0).remove();
      }
      this.draggedLink = undefined;
    }
    overNode(d: any, domNode: Element) {
      // add a glow effect when the user hovers over
      let node = d3.select(domNode)
      if(node.select(".glow").size() == 0) {
        node.insert("text","text")
        .attr('class', 'glow icon-text')
        .attr('font-size', `${nodeIconSize + 5}px` ) // +5 for a stronger glow
        .style("filter", "url(#glow)")
        .text(d.data.icon)
        .attr("opacity", 0).transition().duration(fastDuration).attr("opacity", 1);
      }
      // keep track of this node in case the user performs an action on it
      this.selectedNode = d;
    }
    outNode(d: any, domNode: Element) {
      // hide the glow effect
      d3.select(domNode).select(".glow").transition().duration(fastDuration).attr("opacity", 0).remove()
      // clear the node from being tracked
      this.selectedNode = undefined;
    }

    // dfs to detect a cycle
    hasCycle(node: NodeDatum, target: string) {
      if(node.id == target) return true;
      for(let i in node.parentIds) {
        for(let j in this.nodeData) {
          if(node.parentIds[i] == this.nodeData[j].id) {
            if(this.hasCycle(this.nodeData[j], target)) return true;
            break;
          }
        }
      }
      return false;
    }
  }
</script>

<style lang="scss">
.graph-scroll-container {
  height: 100%;

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

  .__vuescroll .__panel.__native {
    overflow: hidden;
  }
}
</style>
