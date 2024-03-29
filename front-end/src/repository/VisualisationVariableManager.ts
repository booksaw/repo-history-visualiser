import { DirectoryData, FileData, LinkData } from "../components/NetworkDiagram";
import { ContributorProps } from "../components/RepositoryVisualiser";
import { Milestone } from "./RepositoryRepresentation";

export class ValueSetterCombo<T> {

    value: T;
    setter: (v: T) => void;

    constructor(value: T, setter: (v: T) => void) {
        this.value = value;
        this.setter = setter;
    }


    applyValue() {
        this.setter(this.value);
    }
}

export interface VariableDataProps {
    nodes: ValueSetterCombo<DirectoryData[]>,
    links: ValueSetterCombo<LinkData[]>,
    indexedFileClusters: ValueSetterCombo<{ [key: string]: string[] }>,
    fileClusters: ValueSetterCombo<FileData[]>,
    contributors: ValueSetterCombo<{ [name: string]: ContributorProps }>,
    date: ValueSetterCombo<number | undefined>,
    milestone: ValueSetterCombo<Milestone | undefined>,
    screenHeight: number,

}

export class VisualisationVariableManager {

    props: VariableDataProps;

    constructor(props: VariableDataProps) {
        this.props = props;
    }

    setProps(props: VariableDataProps) {
        this.props = props;
    }

    triggerSetters() {
        // eslint-disable-next-line
        for (const [_, v] of Object.entries(this.props)) {
            if (v instanceof ValueSetterCombo) {
                v.applyValue();
            }
        }
    }

    getTickFunction(processVariables: (props: VariableDataProps) => void) {
        return () => {
            processVariables(this.props);
            this.triggerSetters();
        }
    }

}

