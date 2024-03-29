package com.github.mcnair.repohistoryvisualiser.repository;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class Settings {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty
    public List<Milestone> milestones;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    @JsonProperty
    public List<Structure> structures;

}
