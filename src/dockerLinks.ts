/* --------------------------------------------------------------------------------------------
 * Copyright (c) Remy Suen. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { DocumentLink, Position, Range } from 'vscode-languageserver-types';
import { Copy, DockerfileParser } from 'dockerfile-ast';

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
            const registry = from.getRegistry();
            const link = this.createImageLink(
                registry,
                from.getImageName(),
                registry === null ? null : from.getRegistryRange(),
                from.getImageNameRange(),
                stages
            );
            if (link !== null) {
                links.push(link);
            }
        }
        for (const copy of dockerfile.getCOPYs()) {
            const link = this.createCopyFromLink(copy, stages);
            if (link !== null) {
                links.push(link);
            }
        }
        return links;
    }

    private createCopyFromLink(copy: Copy, stages: string[]): DocumentLink | null {
        const flag = copy.getFromFlag();
        if (flag === null) {
            return null;
        }
        const value = flag.getValue();
        const valueRange = flag.getValueRange();
        if (value === null || valueRange === null || value === "" || value.indexOf("$") !== -1) {
            return null;
        }
        // skip values split across lines with escaped newlines
        if (valueRange.start.line !== valueRange.end.line || valueRange.end.character - valueRange.start.character !== value.length) {
            return null;
        }
        // --from may reference a build stage by name or index
        if (/^\d+$/.test(value) || stages.some(stage => stage.toLowerCase() === value.toLowerCase())) {
            return null;
        }

        let reference = value;
        const digestIndex = reference.indexOf("@");
        if (digestIndex !== -1) {
            reference = reference.substring(0, digestIndex);
        }
        const tagIndex = reference.lastIndexOf(":");
        if (tagIndex > reference.lastIndexOf("/")) {
            reference = reference.substring(0, tagIndex);
        }

        let registry: string | null = null;
        let name = reference;
        const slashIndex = reference.indexOf("/");
        if (slashIndex !== -1) {
            const host = reference.substring(0, slashIndex);
            if (host.indexOf(".") !== -1 || host.indexOf(":") !== -1 || host === "localhost") {
                registry = host;
                name = reference.substring(slashIndex + 1);
            }
        }
        if (name === "") {
            return null;
        }

        const line = valueRange.start.line;
        const start = valueRange.start.character;
        const nameStart = registry === null ? start : start + registry.length + 1;
        const registryRange = registry === null ? null : Range.create(line, start, line, start + registry.length);
        const nameRange = Range.create(Position.create(line, nameStart), Position.create(line, nameStart + name.length));
        return this.createImageLink(registry, name, registryRange, nameRange, []);
    }

    private createImageLink(registry: string | null, name: string | null, registryRange: Range | null, nameRange: Range, stages: string[]): DocumentLink | null {
        if (registry === "ghcr.io") {
            const idx = name.lastIndexOf("/");
            if (idx === -1) {
                return null;
            }
            return {
                range: Range.create(registryRange.start, nameRange.end),
                target: `https://github.com/${name}/pkgs/container/${name.substring(idx+1)}`
            };
        }
        if (registry === "mcr.microsoft.com") {
            return {
                range: Range.create(registryRange.start, nameRange.end),
                target: "https://mcr.microsoft.com/artifact/mar/" + name
            };
        }
        if (registry === "quay.io") {
            return {
                range: Range.create(registryRange.start, nameRange.end),
                target: "https://quay.io/repository/" + name
            };
        }
        if (registry === "public.ecr.aws") {
            if (name.indexOf("/") === -1) {
                return null;
            }
            return {
                range: Range.create(registryRange.start, nameRange.end),
                target: "https://gallery.ecr.aws/" + name
            };
        }
        const ecrMatch = registry === null ? null : DockerLinks.ECR_PRIVATE_REGISTRY.exec(registry);
        if (ecrMatch !== null) {
            const account = ecrMatch[1];
            const region = ecrMatch[2];
            const consoleHost = ecrMatch[3] === ".cn" ? "console.amazonaws.cn" : `${region}.console.aws.amazon.com`;
            return {
                range: Range.create(registryRange.start, nameRange.end),
                target: `https://${consoleHost}/ecr/repositories/private/${account}/${name}?region=${region}`
            };
        }
        if (registry !== null && DockerLinks.DOCKER_HUB_REGISTRIES.indexOf(registry) === -1) {
            // unknown registry, do not point to Docker Hub
            return null;
        }
        if (name !== null && registry !== null && name.indexOf("library/") === 0) {
            name = name.substring("library/".length);
        }
        if (name === null || stages.indexOf(name) !== -1) {
            return null;
        }
        return {
            range: nameRange,
            data: (name.indexOf('/') === -1 ? "_/" : "r/") + name + '/'
        };
    }

    public resolveLink(link: DocumentLink): DocumentLink {
        if (link.data) {
            link.target =  "https://hub.docker.com/" + link.data;
        }
        return link;
    }
}
