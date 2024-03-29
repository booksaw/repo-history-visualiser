import { Commit, Filechangetype, Milestone, RepositoryMetadata, Structure } from "./RepositoryRepresentation";
import DrawnLineManager from "./DrawnLineManager";
import { VariableDataProps } from "./VisualisationVariableManager";
import ScheduledChangeManager from "./ScheduledChangeManager";
import ContributorManager from "./ContributorManager";
import DirectoryStructureManager from "./DirectoryChangeManager";
import { CommitRequestParams, loadCommitDataRequest, performPrevis } from "../utils/BackEndCommunicator";
import { VisualisationSpeedOptions } from "../visualisation/VisualisationSpeedOptions";
import { ContributorProps } from "../components/RepositoryVisualiser";
import { Vector } from "../utils/MathUtils";
import FileLabelManager from "./FileLabelManager";
import { getModifiedFileData } from "../utils/RepositoryRepresentationUtils";
import DirectoryChangeManager from "./DirectoryChangeManager";

/**
 * The URL query parameters that can be set
 */
export interface RequestParams {
    repo?: string;
    branch?: string;
    speed?: string;
    debug?: boolean;
    settings?: string;
    key?: boolean;
    displayFileNames?: boolean;
}

export enum DataState {
    AWAITING_LOADING_METADATA,
    LOADING_METADATA,
    AWAITING_LOADING_COMMITS,
    LOADING_COMMITS,
    READY,
}


export default class RepositoryDataManager {

    static getRequestParams(
        cloneURL: string,
        branch: string,
        settings?: string,

    ) {
        const params: RequestParams = {
            repo: cloneURL,
            branch: branch,
        };

        if (settings) {
            params.settings = settings;
        }
        return params;
    }

    private params: RequestParams;
    private currentTicks = 0;
    commits: { [id: number]: Commit } = {};
    metadata: RepositoryMetadata | undefined;
    private currentCommit = 0;
    activeStructures: Structure[] = [];
    private loadingCommits = false;


    constructor(params: RequestParams) {
        this.params = params;
    }

    async requestInitialMetadata(setError: (error: string) => void, setDataState: (state: DataState) => void) {
        setDataState(DataState.LOADING_METADATA);
        await performPrevis(this.params, (data: any) => {
            setDataState(DataState.AWAITING_LOADING_COMMITS);
            this.metadata = data;
            this.processInitialMetadata();
        }, setError);
    }

    processInitialMetadata() {
        if (!this.metadata?.settings?.structures) {
            return;
        }

        this.metadata.settings.structures.forEach(structure => {
            if (!structure.startCommitHash) {
                this.activeStructures.push(structure);
            }
        })
    }

    processStructureChanges(commit: Commit, options: VisualisationSpeedOptions, props: VariableDataProps) {

        if (!this.metadata?.settings?.structures) {
            return;
        }

        const addStructures = this.metadata.settings.structures.filter(structure => structure.startCommitHash === commit.commitHash);
        const removeStructures = this.metadata.settings.structures.filter(structure => structure.endCommitHash === commit.commitHash);

        addStructures.forEach(structure => {
            this.activeStructures.push(structure);
            if (structure.collapse) {
                // if the file structure may need a collapse
                // removing existing links and nodes within the set of files 
                props.fileClusters.value
                    .filter(file => file.directory.startsWith(structure.folder))
                    .forEach(file => DirectoryChangeManager.removeNode(file, props.fileClusters.value, props.indexedFileClusters.value, props.nodes.value, props.links.value));

                // adding the collapsed element
                DirectoryStructureManager.addNode(getModifiedFileData({ file: structure.folder + "/" + structure.label, type: "A", collapsed: true }).fileData, props.fileClusters.value, props.indexedFileClusters.value, props.nodes.value, props.links.value, options.displayChangesFor, commit.author, false);
            }
        });

        removeStructures.forEach(structure => {
            const index = this.activeStructures.indexOf(structure);
            if (index !== -1) {
                this.activeStructures.splice(index, 1);
            }
            if (structure.collapse) {
                // removing the node relating to this structure
                const directory = props.fileClusters.value.filter(file => file.directory === structure.folder && file.name === structure.label && file.collapsed)[0];
                if (directory) {
                    DirectoryChangeManager.removeNode(directory, props.fileClusters.value, props.indexedFileClusters.value, props.nodes.value, props.links.value);
                }
            }
        });

    }

    async loadCommitData(setError: (error: string) => void, startCommit: number, setDataState?: (state: DataState) => void) {
        if (setDataState) {
            setDataState(DataState.LOADING_COMMITS);
        }
        const params: CommitRequestParams = { ...this.params };
        params.startCommit = startCommit;
        await loadCommitDataRequest(params, (data: any) => {
            if (setDataState) {
                setDataState(DataState.READY);
            }
            // eslint-disable-next-line
            for (const [key, value] of Object.entries({ ...data })) {
                if (parseInt(key) < this.currentCommit) {
                    delete data[key];
                }
            }
            this.commits = { ...this.commits, ...data }
            this.loadingCommits = false;
        }, setError)
    }

    getProcessVisDataFunction(
        options: VisualisationSpeedOptions,
    ) {
        return (props: VariableDataProps) => {

            this.currentTicks++;
            if (this.currentTicks >= options.ticksToProgress && options.ticksToProgress !== -1) {
                this.addCommitToQueue(options, props);
                this.currentTicks = 0;
            }

            ScheduledChangeManager.updateScheduledChanges(props);
        }
    }

    addCommitToQueue(
        options: VisualisationSpeedOptions,
        props: VariableDataProps
    ): void {

        ScheduledChangeManager.applyAllChanges(props);

        console.log("Adding commit " + this.currentCommit + " loaded commits length: " + Object.keys(this.commits).length);
        if (!this.metadata || this.metadata?.totalCommits <= this.currentCommit) {
            console.log("No more commits to display");
            return;
        }

        const commit = this.commits[this.currentCommit];
        this.advanceCommits();

        if (!commit) {
            console.log("Cannot locate commit", this.currentCommit, "within repository");
            return;
        }

        // managing structures 
        this.processStructureChanges(commit, options, props);

        // managing contributions 
        if (!props.contributors.value[commit.author]) {
            // adding new contributor
            props.contributors.value[commit.author] = { name: commit.author, x: 0, y: props.screenHeight / 2, commitsSinceLastContribution: 0 };
        }

        const contributor = props.contributors.value[commit.author];

        contributor.commitsSinceLastContribution = 0;

        const changesData = commit.changes.map(change => getModifiedFileData(change));

        const location = ContributorManager.getCommitContributorLocation(changesData.map(fd => fd.fileData), props.nodes.value);
        const changePerTick = ContributorManager.calculateChangePerTick(location, contributor, options.contributorMovementTicks);

        const applychangesFunction = function (
            props: VariableDataProps
        ) {
            changesData.forEach(fileData => {
                FileLabelManager.addFile(fileData.fileData);
                ScheduledChangeManager.addDelayedChange({ ticksUntilChange: options.contributorMovementTicks + options.displayChangesFor, applyChange: () => { FileLabelManager.removeFile(fileData.fileData) } });

                if (fileData.changeType === Filechangetype.ADDED) {
                    // adding the containing directory
                    DirectoryStructureManager.addNode(fileData.fileData, props.fileClusters.value, props.indexedFileClusters.value, props.nodes.value, props.links.value, options.displayChangesFor, commit.author, true);

                } else if (fileData.changeType === Filechangetype.DELETED) {
                    DrawnLineManager.addRemovedLine(fileData.fileData, options.displayChangesFor, commit.author);

                    if (!fileData.fileData.collapsed) {
                        ScheduledChangeManager.addDelayedChange({
                            ticksUntilChange: options.displayChangesFor,
                            applyChange: (lineProps: VariableDataProps) => {
                                DirectoryStructureManager.removeNode(fileData.fileData, lineProps.fileClusters.value, lineProps.indexedFileClusters.value, lineProps.nodes.value, lineProps.links.value);
                            }
                        })
                    }
                } else if (fileData.changeType === Filechangetype.EXPANDED) {
                    DirectoryStructureManager.addNode(fileData.fileData, props.fileClusters.value, props.indexedFileClusters.value, props.nodes.value, props.links.value, options.displayChangesFor, commit.author, false);
                } else {
                    // modified
                    DrawnLineManager.addModifiedLine(fileData.fileData, options.displayChangesFor, commit.author);
                }

            });
        }

        const contributorMoveFunction = ContributorManager.getContributorMoveFunction(commit.author, changePerTick);

        ScheduledChangeManager.addDelayedChange({ ticksUntilChange: options.contributorMovementTicks, applyChange: contributorMoveFunction, repeating: true });
        ScheduledChangeManager.addDelayedChange({ ticksUntilChange: options.contributorMovementTicks, applyChange: applychangesFunction });

        if (options.contributorMovementTicks !== -1) {
            ScheduledChangeManager.addDelayedChange({
                ticksUntilChange: options.contributorMovementTicks, applyChange:
                    () => {
                        let scaled = changePerTick.clone();
                        scaled.scale(0.1);
                        ScheduledChangeManager.addDelayedChange({ ticksUntilChange: options.ticksToProgress - options.contributorMovementTicks, applyChange: ContributorManager.getContributorMoveFunction(commit.author, scaled), repeating: true })
                    },
            })
        }

        props.date.value = commit.timestamp;
        const milestone = this.getMilestone(commit.commitHash);
        if (milestone) {
            props.milestone.value = milestone;
        }

        this.handleUnusedContributors(options, props.contributors.value, props.screenHeight);
    }

    private handleUnusedContributors(options: VisualisationSpeedOptions, contributors: { [name: string]: ContributorProps }, screenHeight: number) {
        // TODO
        for (let key in contributors) {
            let value = contributors[key];
            value.commitsSinceLastContribution += 1;

            if (value.commitsSinceLastContribution >= 10) {
                // contributor needs to leave

                const changePerTick = ContributorManager.calculateChangePerTick(new Vector(value.x, screenHeight / 2), value, options.contributorMovementTicks);
                const contributorMoveFunction = ContributorManager.getContributorMoveFunction(key, changePerTick);
                ScheduledChangeManager.addDelayedChange({ ticksUntilChange: options.contributorMovementTicks, applyChange: contributorMoveFunction, repeating: true });
                ScheduledChangeManager.addDelayedChange({
                    ticksUntilChange: options.contributorMovementTicks, applyChange:
                        (props: VariableDataProps) => {
                            delete props.contributors.value[key];
                        }
                });
            }
        }
    }

    private advanceCommits() {
        delete this.commits[this.currentCommit]
        this.currentCommit += 1;
        const commitOffset = 25;
        if (!this.commits[this.currentCommit + commitOffset] && !this.loadingCommits) {
            this.loadingCommits = true;
            console.log("Requesting more commits")
            this.loadCommitData((error: string) => { console.log("ERROR GETTING COMMITS: ", error) }, this.currentCommit + commitOffset);
        }
    }


    getMilestone(commitHash: string): Milestone | undefined {
        if (!this.metadata?.settings?.milestones) {
            return undefined;
        }

        const lst = this.metadata.settings.milestones.filter(value => value.commitHash === commitHash);

        if (!lst || lst.length === 0) {
            return undefined;
        }

        if (lst[0].displayFor === undefined) {
            lst[0].displayFor = 1000;
        }

        return lst[0];
    }

}

