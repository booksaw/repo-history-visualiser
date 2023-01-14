import { useState } from "react";
import { Filechangetype, Repository } from "../RepositoryRepresentation";
import { addDirectory, getFileData } from "../utils/RepositoryRepresentationUtils";
import NetworkDiagram, { FileData, LinkData, NodeData } from "./NetworkDiagram";

export interface RepositoryVisualisorProps {
    visData: Repository;
    debugMode?: boolean;
}

/**
 * parent component to the network diagram to act as an overarching controller and reduce the complexity of individual components
 * @param props Properties for this network diagram
 * @returns the function
 */
export default function RepositoryVisualisor(props: RepositoryVisualisorProps) {

    const [nodes, setNodes] = useState<NodeData[]>([{ name: "" }]);
    const [links, setLinks] = useState<LinkData[]>([]);

    const [indexedFileClusters, setIndexedFileClusters] = useState<{ [key: string]: string[] }>({});
    const [fileClusters, setFileClusters] = useState<FileData[]>([]);

    function addCommit() {
        if (!props.visData || props.visData.commits.length === 0) {
            console.log("No more commits to display");
            return;
        }

        const commit = props.visData.commits.shift()!;

        const newNodes: NodeData[] = [...nodes];
        const newLinks: LinkData[] = [...links];
        const newIndexedFileClusters: { [key: string]: string[] } = { ...indexedFileClusters };
        const newFileClusters: FileData[] = [...fileClusters];

        commit.c.forEach(change => {
            const fileData = getFileData(change.f);

            // adding the containing directory
            addDirectory(newNodes, newLinks, { name: fileData.directory });

            if (change.t === Filechangetype.ADDED) {
                //  adding the new node
                newFileClusters.push(fileData);
                newIndexedFileClusters[fileData.directory] = [...newIndexedFileClusters[fileData.directory] ?? [], fileData.name];

            } else if (change.t === Filechangetype.DELETED) {
                // removing the existing node
            }

        });

        setNodes(newNodes);
        setLinks(newLinks);
        setFileClusters(newFileClusters);
        setIndexedFileClusters(newIndexedFileClusters);

    }

    return (
        <NetworkDiagram
            showDirectories={props.debugMode}
            fileClusters={fileClusters}
            indexedFileClusters={indexedFileClusters}
            links={links}
            nodes={nodes}
            onClick={addCommit}
        />
    );
}