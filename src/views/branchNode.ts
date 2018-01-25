'use strict';
import { Iterables } from '../system';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { CommitNode } from './commitNode';
import { GlyphChars } from '../constants';
import { Container } from '../container';
import { ExplorerNode, ExplorerRefNode, MessageNode, ResourceType, ShowAllNode } from './explorerNode';
import { GitExplorer } from './gitExplorer';
import { GitBranch, GitUri } from '../gitService';
import { ExplorerBranchesLayout } from '../configuration';

export class BranchNode extends ExplorerRefNode {

    readonly supportsPaging: boolean = true;

    constructor(
        public readonly branch: GitBranch,
        uri: GitUri,
        private readonly explorer: GitExplorer
    ) {
        super(uri);
    }

    get ref(): string {
        return this.branch.name;
    }

    get label(): string {
        const branchName = this.branch.getName();
        if (this.explorer.config.branches.layout === ExplorerBranchesLayout.List) {
            return branchName;
        } else {
            return !!branchName.match(/\s/) ? branchName : this.branch.getBasename();
        }
    }

    get current(): boolean {
        return this.branch.current;
    }

    async getChildren(): Promise<ExplorerNode[]> {
        const log = await Container.git.getLog(this.uri.repoPath!, { maxCount: this.maxCount, ref: this.branch.name });
        if (log === undefined) return [new MessageNode('No commits yet')];

        const children: (CommitNode | ShowAllNode)[] = [...Iterables.map(log.commits.values(), c => new CommitNode(c, this.explorer, this.branch))];
        if (log.truncated) {
            children.push(new ShowAllNode('Show All Commits', this, this.explorer));
        }
        return children;
    }

    async getTreeItem(): Promise<TreeItem> {
        let name = this.label;
        if (!this.branch.remote && this.branch.tracking !== undefined && this.explorer.config.showTrackingBranch) {
            name += ` ${GlyphChars.Space}${GlyphChars.ArrowLeftRight}${GlyphChars.Space} ${this.branch.tracking}`;
        }
        const item = new TreeItem(`${this.branch!.current ? `${GlyphChars.Check} ${GlyphChars.Space}` : ''}${name}`, TreeItemCollapsibleState.Collapsed);

        if (this.branch.remote) {
            item.contextValue = ResourceType.RemoteBranch;
        }
        else if (this.branch.current) {
            item.contextValue = !!this.branch.tracking
                ? ResourceType.CurrentBranchWithTracking
                : ResourceType.CurrentBranch;
        }
        else {
            item.contextValue = !!this.branch.tracking
                ? ResourceType.BranchWithTracking
                : ResourceType.Branch;
        }

        let iconSuffix = '';
        if (this.branch.tracking) {
            if (this.branch.state.ahead && this.branch.state.behind) {
                iconSuffix = '-yellow';
            }
            else if (this.branch.state.ahead) {
                iconSuffix = '-green';
            }
            else if (this.branch.state.behind) {
                iconSuffix = '-red';
            }
        }

        item.iconPath = {
            dark: Container.context.asAbsolutePath(`images/dark/icon-branch${iconSuffix}.svg`),
            light: Container.context.asAbsolutePath(`images/light/icon-branch${iconSuffix}.svg`)
        };

        return item;
    }
}
