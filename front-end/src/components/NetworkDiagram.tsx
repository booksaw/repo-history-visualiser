import * as d3 from 'd3';
import { forceManyBody, SimulationNodeDatum } from 'd3-force';
import { MutableRefObject, useEffect, useMemo, useState } from "react";
import ForceGraph2d, {
    ForceGraphMethods, NodeObject,
} from "react-force-graph-2d";
import angleMaximisation from '../forces/AngleMaximisation';
import Collide from '../forces/Collide';
import { Vector } from '../utils/MathUtils';
import ClusterFileCircles from '../visualisation/ClusterFileCircles';
import { FileKeyConstants } from '../visualisation/VisualisationConstants';


export interface NetworkDiagramProps {
    nodes: DirectoryData[];
    links: LinkData[];
    indexedFileClusters: { [key: string]: string[] };
    fileClusters: FileData[];
    tick?: () => void;
    hideFiles?: boolean;
    showDirectories?: boolean;
    showFullPathOnHover?: boolean;
    onClick?: (e: any) => void;
    onRenderFramePost?: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void;
    onRenderFramePre?: (canvasContext: CanvasRenderingContext2D, globalScale: number) => void;
    graphRef: MutableRefObject<ForceGraphMethods | undefined>;
    divRef: any;
}

export interface NodeData extends SimulationNodeDatum {
    name: string;
    fx?: number;
    fy?: number;
    radius?: number;
}

const maxRadChange = 0.01;

export interface FileData extends NodeData {
    directory: string;
    color: string;
    fileExtension: string;
    collapsed?: boolean;
}

export interface DirectoryData extends NodeData {
    x: number;
    y: number;
}

export class LinkData {

    private static getName(obj: string | NodeData) {
        if (typeof obj === "string") {
            return obj;
        } else {
            return obj.name;
        }
    }

    source: string | NodeData;
    target: string | NodeData;

    constructor(source: string, target: string) {
        this.source = source;
        this.target = target;
    }

    getSourceName() {
        return LinkData.getName(this.source);
    }

    getTargetName() {
        return LinkData.getName(this.target);
    }

}

export const svgParentID = "svg-parent";

let mousePos: Vector | undefined;

export default function NetworkDiagram(props: NetworkDiagramProps) {

    const [idIndexedFlies, setIdIndexedFiles] = useState<{ [key: string]: FileData }>({});

    useEffect(() => {


        const current = props.graphRef.current!;

        const chargeForce = forceManyBody()
        chargeForce.strength(
            (node: any) => {
                // 0.5 * calculateWeight(node);

                return - 40;
            }
        );
        chargeForce.theta(0.1);

        current.d3Force('charge', chargeForce);

        const forceLink = d3.forceLink();
        forceLink.id((node: any) => node.directory);
        forceLink.strength((link) => {
            return 0.75 / Math.min(props.links.filter(l => l.source === link.source).length, props.links.filter(l => l.target === link.target).length);
        })
        current.d3Force("link", forceLink);

        const collideForce = Collide(
            (node: any) => {
                const files = props.indexedFileClusters[node.name];

                const currentRad: number | undefined = node.radius;
                const target = ClusterFileCircles.getCombinedCircleRadius(files?.length ?? 0);

                let diff = target - ((currentRad) ? currentRad : 0);

                if (Math.abs(diff) > maxRadChange && currentRad !== undefined) {
                    diff = (diff > 0) ? + maxRadChange : -maxRadChange;
                }
                const newRad = diff + (currentRad ? currentRad : 0);
                node.radius = newRad;
                return newRad;
            }
        );
        collideForce.iterations(10);
        collideForce.strength(0.005);
        current.d3Force("collide", collideForce);

        const idIndexedNodes: { [key: string]: NodeData } = {};

        props.nodes.forEach(node => {
            idIndexedNodes[node.name] = node;
        });

        current.d3Force("angleMax", angleMaximisation(
            props.links,
            props.nodes,
            idIndexedNodes,
            (f: NodeData) => f.name,
        ));


    }, [props.nodes, props.links, props.indexedFileClusters, props.graphRef])

    useMemo(() => {

        const newIdIndexedFlies: { [key: string]: FileData } = {};
        props.fileClusters.forEach(file => {
            newIdIndexedFlies[file.directory + "/" + file.name] = file;
        });
        setIdIndexedFiles(newIdIndexedFlies);

    }, [props.fileClusters]);


    const data = { nodes: props.nodes, links: props.links };


    let toDraw: FileData | undefined = undefined;

    function clusterCircles(node: any, ctx: CanvasRenderingContext2D, globalScale: number) {
        if (props.showDirectories) {
            ctx.beginPath();
            ctx.fillStyle = 'yellow';
            ctx.strokeStyle = "yellow"
            ctx.arc(node.x, node.y, node.radius ?? 1, 0, 2 * Math.PI);
            ctx.fill();
        }

        let i = 0;
        const index = props.indexedFileClusters[node.name];
        if (!index) {
            // cannot draw files if no files exist
            return;
        }

        index.forEach(file => {
            const positionVector = ClusterFileCircles.getPositionVector(i);
            const fd = idIndexedFlies[node.name + "/" + file];

            const pos = new Vector(node.x + positionVector.x, node.y + positionVector.y)

            ctx.beginPath();
            ctx.fillStyle = fd.color;
            ctx.strokeStyle = fd.color;

            ctx.arc(pos.x, pos.y, fd.collapsed ?  ClusterFileCircles.enlargedRadius : ClusterFileCircles.circleRadius, 0, 2 * Math.PI);
            ctx.fill();

            // updating so modified lines can be drawn to this point
            fd.x = pos.x;
            fd.y = pos.y;

            // checking if the node is being hovered over
            if (mousePos && Vector.calculateDistanceSquared(pos, mousePos) <= ClusterFileCircles.circleRadius ** 2) {
                toDraw = fd;
            }

            i++;
        })


    }

    function onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number) {

        if (props.onRenderFramePost) {
            props.onRenderFramePost(ctx, globalScale);
        }

        if (toDraw && mousePos) {
            FileKeyConstants.configureCtxToFileKey(ctx, globalScale);
            const width = (10 / globalScale) + Math.max(ctx.measureText(toDraw.name).width, ctx.measureText(toDraw.directory).width);
            const mouseOffset = 15 / globalScale;
            ctx.beginPath();
            ctx.roundRect(mousePos.x + mouseOffset, mousePos.y, width, ((toDraw.directory.length !== 0) ? 32 : 20) / globalScale, 5);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = toDraw.color;
            ctx.fillText(toDraw.name, mousePos.x + mouseOffset + (5 / globalScale), mousePos.y + (13 / globalScale))

            if (toDraw.directory.length !== 0) {
                ctx.fillStyle = "white";
                ctx.fillText(toDraw.directory, mousePos.x + mouseOffset + (5 / globalScale), mousePos.y + (25 / globalScale))
            }
        }
    }

    const zoomToFit = function () {
        if (!props.graphRef.current || props.nodes.length <= 1) {
            return
        }
        props.graphRef.current.zoomToFit(100, 100);
    }

    function onEngineTick() {

        if (props.tick) {
            props.tick();
        }

        zoomToFit();
    }

    function onMouseMove(e: any) {

        if (!props.graphRef.current) {
            return;
        }

        const { x, y } = props.graphRef.current.screen2GraphCoords(e.clientX, e.clientY);
        mousePos = new Vector(x, y);
    }

    return (
        <div id={svgParentID}
            ref={props.divRef}
            onClick={props.onClick}
            onMouseMove={onMouseMove}
            style={{
                height: "100vh",
                width: "100%",
                marginRight: "0px",
                marginLeft: "0px",
            }}>
            <ForceGraph2d
                ref={props.graphRef}
                graphData={data}
                nodeId="name"
                linkColor={() => "white"}
                nodeCanvasObject={clusterCircles}
                onEngineTick={onEngineTick}
                onRenderFramePost={onRenderFramePost}
                onRenderFramePre={props.onRenderFramePre}
                autoPauseRedraw={false}
                nodeLabel={""}
            />
        </div>

    )
}