/* --------------------------------------------------------------------------------------------
 * Copyright (c) Remy Suen. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { DocumentLink, Range } from 'vscode-languageserver-types';
import { DockerfileParser } from 'dockerfile-ast';

export class DockerLinks {

    private static readonly ECR_PRIVATE_REGISTRY = /^(\d{12})\.dkr\.ecr(?:-fips)?\.([a-z0-9-]+)\.amazonaws\.com(\.cn)?$/;

    private static readonly DOCKER_HUB_REGISTRIES = ["docker.io", "index.docker.io", "registry-1.docker.io"];

    public getLinks(content: string): DocumentLink[] {
        let dockerfile = DockerfileParser.parse(content);
        let links = [];
        const stages = dockerfile.getFROMs().reduce((accumulator, from) => {
            const stage = from.getBuildStage();
            if (stage !== null) {
                accumulator.push(stage);
            }
            return accumulator;
        }, []);
        for (let from of dockerfile.getFROMs()) {
            let name = from.getImageName();
            const registry = from.getRegistry();
            if (registry === "ghcr.io") {
                const idx = name.lastIndexOf("/");
                if (idx === -1) {
                    continue;
                }
                links.push({
                    range: Range.create(from.getRegistryRange().start, from.getImageNameRange().end),
                    target: `https://github.com/${name}/pkgs/container/${name.substring(idx+1)}`
                })
                continue;
            }
            if (registry === "mcr.microsoft.com") {
                links.push({
                    range: Range.create(from.getRegistryRange().start, from.getImageNameRange().end),
                    target: "https://mcr.microsoft.com/artifact/mar/" + name
                })
                continue;
            }
            if (registry === "quay.io") {
                links.push({
                    range: Range.create(from.getRegistryRange().start, from.getImageNameRange().end),
                    target: "https://quay.io/repository/" + name
                })
                continue;
            }
            if (registry === "public.ecr.aws") {
                if (name.indexOf("/") === -1) {
                    continue;
                }
                links.push({
                    range: Range.create(from.getRegistryRange().start, from.getImageNameRange().end),
                    target: "https://gallery.ecr.aws/" + name
                });
                continue;
            }
            const ecrMatch = registry === null ? null : DockerLinks.ECR_PRIVATE_REGISTRY.exec(registry);
            if (ecrMatch !== null) {
                const account = ecrMatch[1];
                const region = ecrMatch[2];
                const consoleHost = ecrMatch[3] === ".cn" ? "console.amazonaws.cn" : `${region}.console.aws.amazon.com`;
                links.push({
                    range: Range.create(from.getRegistryRange().start, from.getImageNameRange().end),
                    target: `https://${consoleHost}/ecr/repositories/private/${account}/${name}?region=${region}`
                });
                continue;
            }
            if (registry !== null && DockerLinks.DOCKER_HUB_REGISTRIES.indexOf(registry) === -1) {
                // unknown registry, do not point to Docker Hub
                continue;
            }
            if (name !== null && registry !== null && name.indexOf("library/") === 0) {
                name = name.substring("library/".length);
            }
            if (name !== null && stages.indexOf(name) === -1) {
                if (name.indexOf('/') === -1) {
                    links.push({
                        range: from.getImageNameRange(),
                        data: "_/" + name + '/'
                    });
                } else {
                    links.push({
                        range: from.getImageNameRange(),
                        data: "r/" + name + '/'
                    });
                }
            }
        }
        return links;
    }

    public resolveLink(link: DocumentLink): DocumentLink {
        if (link.data) {
            link.target =  "https://hub.docker.com/" + link.data;
        }
        return link;
    }
}
