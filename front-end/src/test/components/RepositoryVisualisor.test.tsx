/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import RepositoryVisualisor from "../../components/RepositoryVisualisor";
import * as NetworkDiagram from "../../components/NetworkDiagram";
import { NetworkDiagramProps } from "../../components/NetworkDiagram";

afterEach(() => {
    jest.restoreAllMocks();
});

test("Test with blank vis data", () => {

    jest.spyOn(NetworkDiagram, "default").mockReturnValue(<></>);

    render(<RepositoryVisualisor visData={{ url: "test", commits: [] }} />)

});

test("Test triggering the tick function without commits", () => {

    let tickFunction: any;

    jest.spyOn(NetworkDiagram, "default").mockImplementation(
        (props: NetworkDiagramProps) => {
            tickFunction = props.tick;
            return <></>
        }
    );
    render(<RepositoryVisualisor visData={{ url: "test", commits: [] }} />)

    expect(tickFunction).toBeDefined();

    tickFunction();

});