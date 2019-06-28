/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { getRegistryPassword } from "../registryPasswords";
import { IDockerCliCredentials, RegistryTreeItemBase } from "../RegistryTreeItemBase";
import { GitLabAccountTreeItem } from "./GitLabAccountTreeItem";
import { GitLabRepositoryTreeItem } from "./GitLabRepositoryTreeItem";

const gitLabRegistryUrl: string = 'registry.gitlab.com';

export class GitLabProjectTreeItem extends RegistryTreeItemBase {
    public parent: GitLabAccountTreeItem;
    public projectId: string;
    public pathWithNamespace: string;

    private _nextLink?: string;

    public constructor(parent: GitLabAccountTreeItem, id: string, pathWithNamespace: string) {
        super(parent);
        this.projectId = id;
        this.pathWithNamespace = pathWithNamespace;
    }

    public get baseUrl(): string {
        return this.parent.baseUrl;
    }

    public get id(): string {
        return this.projectId;
    }

    public get label(): string {
        return this.pathWithNamespace;
    }

    public get baseImagePath(): string {
        return gitLabRegistryUrl + '/' + this.pathWithNamespace;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let url = this._nextLink || `api/v4/projects/${this.projectId}/registry/repositories?per_page=${PAGE_SIZE}`;
        let response = await registryRequest<IRepository[]>(this, 'GET', url);
        this._nextLink = getNextLinkFromHeaders(response);
        return await this.createTreeItemsWithErrorHandling(
            response.body,
            'invalidRepository',
            r => new GitLabRepositoryTreeItem(this, r.id.toString(), r.name),
            r => r.name
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        await this.parent.addAuth(options);
    }

    public async getDockerCliCredentials(): Promise<IDockerCliCredentials> {
        return {
            registryPath: gitLabRegistryUrl,
            auth: {
                token: await getRegistryPassword(this.parent.cachedProvider)
            }
        };
    }
}

interface IRepository {
    name: string;
    id: number;
}