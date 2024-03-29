package com.github.mcnair.repohistoryvisualiser.services;

import com.github.mcnair.repohistoryvisualiser.exception.IllegalBranchException;
import com.github.mcnair.repohistoryvisualiser.exception.RepositoryTraverseException;
import com.github.mcnair.repohistoryvisualiser.repository.*;
import com.github.mcnair.repohistoryvisualiser.repository.FileChange.FileChangeType;
import graphql.com.google.common.collect.Iterables;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffEntry.ChangeType;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.diff.RawTextComparator;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import org.springframework.stereotype.Service;

import javax.validation.constraints.NotNull;
import java.io.File;
import java.io.IOException;
import java.util.*;

@Service
@Slf4j
public class GitService {

    public static FileChangeType getFileChangeType(ChangeType change) {

        if (change != null) {
            switch (change) {
                case ADD:
                    return FileChangeType.A;
                case MODIFY:
                    return FileChangeType.M;
                case DELETE:
                    return FileChangeType.D;
            }
        }
        return FileChangeType.A;
    }

    /**
     * Used to clone a repository from its url into the specified folder
     *
     * @param url        The clone URL of the repository
     * @param directory  The directory to clone the repository to
     * @param noCheckout if the no checkout flag should be applied
     * @return The repository
     * @throws GitAPIException Thrown if an error occurs during cloning
     */
    public @NotNull Git cloneRepositoryToDirectory(@NotNull String url, @NotNull File directory, @NotNull boolean noCheckout) throws GitAPIException {
        log.info("Cloning {} to {}", url, directory.getAbsolutePath());
        return Git.cloneRepository().setURI(url).setNoCheckout(noCheckout).setDirectory(directory).call();
    }

    public Git getLocalRepository(File directory) throws IOException {
        return Git.open(directory);
    }

    public Map<Integer, Commit> loadCommitData(String cloneURL, Git git, String branch, List<Structure> structures, int startCommit, int commitCount) throws RepositoryTraverseException, IllegalBranchException {
        HashMap<Integer, Commit> commitData = new HashMap<>();

        List<Structure> activeStructures = new ArrayList<>();

        if (structures != null) {
            for (Structure structure : structures) {
                if (structure.isActive(startCommit - 1) && structure.collapse) {
                    activeStructures.add(structure);
                }
            }
        }


        // adding commits
        try {

            var branchVar = git.getRepository().resolve(branch);

            if (branchVar == null) {
                throw new IllegalBranchException(branch);
            }

            List<RevCommit> revCommits = new ArrayList<>();
            for (RevCommit commit : git.log().add(branchVar).call()) {
                revCommits.add(commit);
            }
            Collections.reverse(revCommits);

            for (int i = startCommit; i < startCommit + commitCount && i < revCommits.size(); i++) {
                List<FileChange> additionalChanges = new ArrayList<>();
                if (structures != null) {
                    for (Structure structure : structures) {
                        // checking if the structure needs adding
                        if (!activeStructures.contains(structure) && structure.isActive(i) && structure.collapse) {
                            activeStructures.add(structure);
                        } else if (activeStructures.contains(structure) && !structure.isActive(i)) {
                            additionalChanges.addAll(getFilesWithinStructure(git.getRepository(), revCommits.get(i), structure));
                            activeStructures.remove(structure);
                        }
                    }
                }

                Commit commit = createCommit(git.getRepository(), revCommits.get(i), i, activeStructures);
                commit.getChanges().addAll(additionalChanges);
                commitData.put(i, commit);
            }

        } catch (GitAPIException | IOException e) {
            throw new RepositoryTraverseException(e);
        }

        return commitData;
    }

    private Commit createCommit(org.eclipse.jgit.lib.Repository repo, RevCommit revCommit, int commitId, List<Structure> structures) throws RepositoryTraverseException {

        List<FileChange> changes;
        if (revCommit.getParentCount() == 0) {
            changes = getChangesFromRoot(repo, revCommit);
        } else {
            changes = getChangesFromParent(repo, revCommit);
        }

        // replacing all collapsed node with the parent of the collapsed node
        for (FileChange change : new ArrayList<>(changes)) {

            for (Structure structure : structures) {
                if (change.getFile().startsWith(structure.folder)) {
                    if (changes.stream().anyMatch(fc -> fc.getFile().equals(structure.folder + "/" + structure.label) && fc.getCollapsed())) {
                        changes.remove(change);
                    } else {
                        change.setFile(structure.folder + "/" + structure.label);
                        change.setCollapsed(true);
                    }
                }
            }
        }

        PersonIdent authorIdent = revCommit.getAuthorIdent();
        return new Commit(revCommit.getCommitTime(), changes, authorIdent.getName(), revCommit.getId().getName(), commitId);

    }

    private List<FileChange> getChangesFromParent(org.eclipse.jgit.lib.Repository repo, RevCommit commit) throws RepositoryTraverseException {
        RevCommit parent = commit.getParent(0);

        List<FileChange> changes = new ArrayList<>();
        List<DiffEntry> diffs;

        try (DiffFormatter df = new DiffFormatter(DisabledOutputStream.INSTANCE)) {
            df.setRepository(repo);
            df.setDiffComparator(RawTextComparator.DEFAULT);
            diffs = df.scan(parent.getTree(), commit.getTree());
        } catch (IOException e) {
            throw new RepositoryTraverseException(e);
        }

        for (DiffEntry diff : diffs) {
            var changeType = getFileChangeType(diff.getChangeType());
            changes.add(new FileChange(changeType, (changeType == FileChangeType.D) ? diff.getOldPath() : diff.getNewPath()));
        }

        return changes;
    }

    private List<FileChange> getChangesFromRoot(org.eclipse.jgit.lib.Repository repo, RevCommit commit) throws RepositoryTraverseException {
        List<FileChange> changes = new ArrayList<>();
        try (var tw = new TreeWalk(repo)) {
            tw.addTree(commit.getTree());
            tw.setRecursive(true);

            while (tw.next()) {
                changes.add(new FileChange(FileChangeType.A, tw.getPathString()));
            }

        } catch (IOException e) {
            throw new RepositoryTraverseException(e);
        }

        return changes;
    }

    private List<FileChange> getFilesWithinStructure(org.eclipse.jgit.lib.Repository repo, RevCommit commit, Structure structure) throws RepositoryTraverseException {
        List<FileChange> changes = new ArrayList<>();
        try (var tw = new TreeWalk(repo)) {
            tw.addTree(commit.getTree());
            tw.setRecursive(false);

            boolean found = false;
            while (tw.next()) {
                if (tw.isSubtree()) {
                    String pathString = tw.getPathString();
                    if (structure.folder.equals(pathString)) {
                        //
                        tw.enterSubtree();
                        found = true;
                        break;
                    }
                    if (structure.folder.startsWith(pathString)) {
                        tw.enterSubtree();
                    }
                }
            }

            if (found) {
                tw.setRecursive(true);
                while (tw.next()) {
                    changes.add(new FileChange(FileChangeType.EXPANDED, tw.getPathString()));
                }
            } else {
                // no files exist within the structure
                return changes;
            }

        } catch (IOException e) {
            throw new RepositoryTraverseException(e);
        }

        return changes;
    }

    public RepositoryMetadata getRepositoryMetadata(String cloneURL, String branch, Git git, Settings settings) throws RepositoryTraverseException, IllegalBranchException {
        int commitCount = getCommitCount(git, branch);
        if (settings != null) {
            orderMilestoneAndStructureData(branch, git, settings, commitCount);
        }

        return new RepositoryMetadata(cloneURL, branch, commitCount, settings);
    }

    private void orderMilestoneAndStructureData(String branch, Git git, Settings settings, int commitCount) throws IllegalBranchException, RepositoryTraverseException {
        // streaming milestones into hashmap for efficient lookup
        HashMap<String, Milestone> milestones = new HashMap<>();
        HashMap<String, List<Structure>> structuresStart = new HashMap<>();
        HashMap<String, List<Structure>> structuresEnd = new HashMap<>();


        if (settings.milestones != null) {
            settings.milestones.forEach(milestone -> milestones.put(milestone.commitHash, milestone));
        }

        if (settings.structures != null) {
            settings.structures.forEach(structure -> {
                if (structure.startCommitHash != null) {
                    List<Structure> structureList = structuresStart.get(structure.startCommitHash);
                    if (structureList == null) {
                        structureList = new ArrayList<>();
                        structureList.add(structure);
                        structuresStart.put(structure.startCommitHash, structureList);
                    } else {
                        structureList.add(structure);
                    }

                }
                if (structure.endCommitHash != null) {
                    List<Structure> structureList = structuresEnd.get(structure.endCommitHash);
                    if (structureList == null) {
                        structureList = new ArrayList<>();
                        structureList.add(structure);
                        structuresEnd.put(structure.endCommitHash, structureList);
                    } else {
                        structureList.add(structure);
                    }
                }
            });
        }

        try {
            var branchVar = git.getRepository().resolve(branch);

            if (branchVar == null) {
                throw new IllegalBranchException(branch);
            }

            // getting the location id of all the milestone commits so they can be ordered
            int id = commitCount;
            for (RevCommit commit : git.log().add(branchVar).call()) {
                String commitHash = commit.getId().getName();
                var milestone = milestones.get(commitHash);
                if (milestone != null) {
                    milestone.commitID = id;
                    milestones.remove(milestone.commitHash);
                }

                var structureEnd = structuresEnd.get(commitHash);
                if (structureEnd != null) {
                    int finalId = id;
                    structureEnd.forEach(structure -> {
                        structure.endCommitID = finalId;
                    });
                    structuresEnd.remove(commitHash);
                }

                var structureStart = structuresStart.get(commitHash);
                if (structureStart != null) {
                    int finalId = id;
                    structureStart.forEach(structure -> {
                        structure.startCommitID = finalId;
                    });
                    structuresStart.remove(commitHash);
                }

                id--;
            }
        } catch (IOException | GitAPIException e) {
            throw new RepositoryTraverseException(e);
        }

        for (Map.Entry<String, Milestone> temp : milestones.entrySet()) {
            log.warn("Commit hash: " + temp.getKey() + " does not exist on git data");
            settings.milestones.remove(temp.getValue());
        }

        for (Map.Entry<String, List<Structure>> temp : structuresStart.entrySet()) {
            log.warn("Commit hash: " + temp.getKey() + " does not exist on git data");
            settings.milestones.remove(temp.getValue());
        }

        for (Map.Entry<String, List<Structure>> temp : structuresEnd.entrySet()) {
            log.warn("Commit hash: " + temp.getKey() + " does not exist on git data");
            settings.milestones.remove(temp.getValue());
        }

    }

    private int getCommitCount(Git git, String branch) throws RepositoryTraverseException, IllegalBranchException {

        try {
            var branchVar = git.getRepository().resolve(branch);

            if (branchVar == null) {
                throw new IllegalBranchException(branch);
            }
            return Iterables.size(git.log().add(branchVar).call());

        } catch (IOException | GitAPIException | NullPointerException e) {
            throw new RepositoryTraverseException(e);
        }

    }

    public void pullRepository(Git git) {
        git.pull();
    }
}
