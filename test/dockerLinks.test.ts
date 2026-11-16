/* --------------------------------------------------------------------------------------------
 * Copyright (c) Remy Suen. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as assert from "assert";

import { DocumentLink } from 'vscode-languageserver-types';
import { DockerfileLanguageServiceFactory } from '../src/main';

let service = DockerfileLanguageServiceFactory.createLanguageService();

function assertLink(documentLink: DocumentLink, target: string, data: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
    assert.strictEqual(documentLink.target, target);
    assert.strictEqual(documentLink.data, data);
    assert.strictEqual(documentLink.range.start.line, startLine);
    assert.strictEqual(documentLink.range.start.character, startCharacter);
    assert.strictEqual(documentLink.range.end.line, endLine);
    assert.strictEqual(documentLink.range.end.character, endCharacter);
}

describe("Dockerfile links", function () {
    describe("Docker Hub", function() {
        it("FROM", function () {
            let links = service.computeLinks("FROM");
            assert.strictEqual(links.length, 0);
        });

        it("FROM node", function () {
            let links = service.computeLinks("FROM node");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 5, 0, 9);
        });

        it("FROM node:latest", function () {
            let links = service.computeLinks("FROM node:latest");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 5, 0, 9);
        });

        it("FROM node@sha256:613685c22f65d01f2264bdd49b8a336488e14faf29f3ff9b6bf76a4da23c4700", function () {
            let links = service.computeLinks("FROM node@sha256:613685c22f65d01f2264bdd49b8a336488e14faf29f3ff9b6bf76a4da23c4700");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 5, 0, 9);
        });

        it("FROM microsoft/dotnet", function () {
            let links = service.computeLinks("FROM microsoft/dotnet");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "r/microsoft/dotnet/", 0, 5, 0, 21);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/r/microsoft/dotnet/", "r/microsoft/dotnet/", 0, 5, 0, 21);
        });

        it("FROM microsoft/dotnet:sdk", function () {
            let links = service.computeLinks("FROM microsoft/dotnet:sdk");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "r/microsoft/dotnet/", 0, 5, 0, 21);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/r/microsoft/dotnet/", "r/microsoft/dotnet/", 0, 5, 0, 21);
        });

        it("FROM microsoft/dotnet@sha256:5483e2b609c0f66c3ebd96666de7b0a74537613b43565879ecb0d0a73e845d7d", function () {
            let links = service.computeLinks("FROM microsoft/dotnet@sha256:5483e2b609c0f66c3ebd96666de7b0a74537613b43565879ecb0d0a73e845d7d");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "r/microsoft/dotnet/", 0, 5, 0, 21);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/r/microsoft/dotnet/", "r/microsoft/dotnet/", 0, 5, 0, 21);
        });

        it("FROM microsoft/dotnet:non-existent-tag@sha256:5483e2b609c0f66c3ebd96666de7b0a74537613b43565879ecb0d0a73e845d7d", () => {
            const links = service.computeLinks("FROM microsoft/dotnet:non-existent-tag@sha256:5483e2b609c0f66c3ebd96666de7b0a74537613b43565879ecb0d0a73e845d7d");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "r/microsoft/dotnet/", 0, 5, 0, 21);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/r/microsoft/dotnet/", "r/microsoft/dotnet/", 0, 5, 0, 21);
        });
    });

    describe("ghcr.io", function() {
        it("FROM ghcr.io/super-linter/super-linter", function() {
            const links = service.computeLinks("FROM ghcr.io/super-linter/super-linter");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://github.com/super-linter/super-linter/pkgs/container/super-linter", undefined, 0, 5, 0, 38);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://github.com/super-linter/super-linter/pkgs/container/super-linter", undefined, 0, 5, 0, 38);
        });

        it("FROM ghcr.io/super-linter/super-linter:latest-buildcache", function() {
            const links = service.computeLinks("FROM ghcr.io/super-linter/super-linter:latest-buildcache");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://github.com/super-linter/super-linter/pkgs/container/super-linter", undefined, 0, 5, 0, 38);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://github.com/super-linter/super-linter/pkgs/container/super-linter", undefined, 0, 5, 0, 38);
        });

        it("FROM ghcr.io/super-linter", function() {
            const links = service.computeLinks("FROM ghcr.io/super-linter");
            assert.strictEqual(links.length, 0);
        });
    });

    describe("mcr.microsoft.com", function() {
        it("FROM mcr.microsoft.com/powershell", function() {
            const links = service.computeLinks("FROM mcr.microsoft.com/powershell");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/powershell", undefined, 0, 5, 0, 33);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/powershell", undefined, 0, 5, 0, 33);
        });

        it("FROM mcr.microsoft.com/powershell:3.17", function() {
            const links = service.computeLinks("FROM mcr.microsoft.com/powershell:3.17");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/powershell", undefined, 0, 5, 0, 33);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/powershell", undefined, 0, 5, 0, 33);
        });

        it("FROM mcr.microsoft.com/windows/servercore", function() {
            const links = service.computeLinks("FROM mcr.microsoft.com/windows/servercore");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/windows/servercore", undefined, 0, 5, 0, 41);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/windows/servercore", undefined, 0, 5, 0, 41);
        });

        it("FROM mcr.microsoft.com/windows/servercore:ltsc2025", function() {
            const links = service.computeLinks("FROM mcr.microsoft.com/windows/servercore:ltsc2025");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/windows/servercore", undefined, 0, 5, 0, 41);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://mcr.microsoft.com/artifact/mar/windows/servercore", undefined, 0, 5, 0, 41);
        });
    });

    describe("quay.io", function() {
        it("FROM quay.io/prometheus/node-exporter", function() {
            const links = service.computeLinks("FROM quay.io/prometheus/node-exporter");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://quay.io/repository/prometheus/node-exporter", undefined, 0, 5, 0, 37);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://quay.io/repository/prometheus/node-exporter", undefined, 0, 5, 0, 37);
        });

        it("FROM quay.io/prometheus/node-exporter:v1.9.1", function() {
            const links = service.computeLinks("FROM quay.io/prometheus/node-exporter:v1.9.1");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://quay.io/repository/prometheus/node-exporter", undefined, 0, 5, 0, 37);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://quay.io/repository/prometheus/node-exporter", undefined, 0, 5, 0, 37);
        });
    });

    describe("Amazon ECR (private)", function() {
        it("FROM 123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-app", function() {
            const links = service.computeLinks("FROM 123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-app");
            assert.strictEqual(links.length, 1);
            const target = "https://eu-central-1.console.aws.amazon.com/ecr/repositories/private/123456789012/my-app?region=eu-central-1";
            assertLink(links[0], target, undefined, 0, 5, 0, 59);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], target, undefined, 0, 5, 0, 59);
        });

        it("FROM 123456789012.dkr.ecr.us-east-1.amazonaws.com/team/my-app:1.0", function() {
            const links = service.computeLinks("FROM 123456789012.dkr.ecr.us-east-1.amazonaws.com/team/my-app:1.0");
            assert.strictEqual(links.length, 1);
            const target = "https://us-east-1.console.aws.amazon.com/ecr/repositories/private/123456789012/team/my-app?region=us-east-1";
            assertLink(links[0], target, undefined, 0, 5, 0, 61);
        });

        it("FROM 123456789012.dkr.ecr.cn-north-1.amazonaws.com.cn/my-app", function() {
            const links = service.computeLinks("FROM 123456789012.dkr.ecr.cn-north-1.amazonaws.com.cn/my-app");
            assert.strictEqual(links.length, 1);
            const target = "https://console.amazonaws.cn/ecr/repositories/private/123456789012/my-app?region=cn-north-1";
            assertLink(links[0], target, undefined, 0, 5, 0, 60);
        });
    });

    describe("Amazon ECR Public", function() {
        it("FROM public.ecr.aws/docker/library/node:20", function() {
            const links = service.computeLinks("FROM public.ecr.aws/docker/library/node:20");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://gallery.ecr.aws/docker/library/node", undefined, 0, 5, 0, 39);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://gallery.ecr.aws/docker/library/node", undefined, 0, 5, 0, 39);
        });

        it("FROM public.ecr.aws/node", function() {
            const links = service.computeLinks("FROM public.ecr.aws/node");
            assert.strictEqual(links.length, 0);
        });
    });

    describe("explicit Docker Hub registry", function() {
        it("FROM docker.io/library/node", function() {
            const links = service.computeLinks("FROM docker.io/library/node");
            assert.strictEqual(links.length, 1);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 15, 0, 27);
        });

        it("FROM docker.io/microsoft/dotnet", function() {
            const links = service.computeLinks("FROM docker.io/microsoft/dotnet");
            assert.strictEqual(links.length, 1);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/r/microsoft/dotnet/", "r/microsoft/dotnet/", 0, 15, 0, 31);
        });
    });

    describe("unknown registries", function() {
        it("FROM registry.example.com/my-app", function() {
            const links = service.computeLinks("FROM registry.example.com/my-app");
            assert.strictEqual(links.length, 0);
        });

        it("FROM localhost:5000/my-app", function() {
            const links = service.computeLinks("FROM localhost:5000/my-app");
            assert.strictEqual(links.length, 0);
        });
    });

    describe("COPY --from", function() {
        it("COPY --from=ghcr.io/php/pie:bin /pie /usr/bin/pie", function() {
            const links = service.computeLinks("COPY --from=ghcr.io/php/pie:bin /pie /usr/bin/pie");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://github.com/php/pie/pkgs/container/pie", undefined, 0, 12, 0, 27);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://github.com/php/pie/pkgs/container/pie", undefined, 0, 12, 0, 27);
        });

        it("COPY --from=ghcr.io/php/pie@sha256:... after a FROM", function() {
            const links = service.computeLinks("FROM php:8.4\nCOPY --from=ghcr.io/php/pie@sha256:613685c22f65d01f2264bdd49b8a336488e14faf29f3ff9b6bf76a4da23c4700 /pie /usr/bin/pie");
            assert.strictEqual(links.length, 2);
            assertLink(links[0], undefined, "_/php/", 0, 5, 0, 8);
            assertLink(links[1], "https://github.com/php/pie/pkgs/container/pie", undefined, 1, 12, 1, 27);
        });

        it("COPY --from=composer:2", function() {
            const links = service.computeLinks("COPY --from=composer:2 /usr/bin/composer /usr/bin/composer");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/composer/", 0, 12, 0, 20);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/composer/", "_/composer/", 0, 12, 0, 20);
        });

        it("COPY --from=mlocati/php-extension-installer", function() {
            const links = service.computeLinks("COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/bin/");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "r/mlocati/php-extension-installer/", 0, 12, 0, 43);
        });

        it("COPY --from=123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-app:1.0", function() {
            const links = service.computeLinks("COPY --from=123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-app:1.0 /app /app");
            assert.strictEqual(links.length, 1);
            const target = "https://eu-central-1.console.aws.amazon.com/ecr/repositories/private/123456789012/my-app?region=eu-central-1";
            assertLink(links[0], target, undefined, 0, 12, 0, 66);
        });

        it("COPY --from=public.ecr.aws/docker/library/node:20", function() {
            const links = service.computeLinks("COPY --from=public.ecr.aws/docker/library/node:20 /a /b");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], "https://gallery.ecr.aws/docker/library/node", undefined, 0, 12, 0, 46);
        });

        it("COPY --from=registry.example.com/my-app", function() {
            const links = service.computeLinks("COPY --from=registry.example.com/my-app /a /b");
            assert.strictEqual(links.length, 0);
        });

        it("COPY --from=<build stage name>", function() {
            const links = service.computeLinks("FROM node AS Build\nFROM alpine\nCOPY --from=build /a /b");
            assert.strictEqual(links.length, 2);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            assertLink(links[1], undefined, "_/alpine/", 1, 5, 1, 11);
        });

        it("COPY --from=<build stage index>", function() {
            const links = service.computeLinks("FROM node\nFROM alpine\nCOPY --from=0 /a /b");
            assert.strictEqual(links.length, 2);
        });

        it("COPY --from=${IMAGE}", function() {
            const links = service.computeLinks("ARG IMAGE=node\nFROM alpine\nCOPY --from=${IMAGE} /a /b");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/alpine/", 1, 5, 1, 11);
        });

        it("COPY --from=", function() {
            const links = service.computeLinks("COPY --from= /a /b");
            assert.strictEqual(links.length, 0);
        });

        it("COPY without --from", function() {
            const links = service.computeLinks("COPY /a /b");
            assert.strictEqual(links.length, 0);
        });
    });

    describe("build stages", function () {
        it("valid", () => {
            let links = service.computeLinks("FROM node AS base\nFROM base");
            assert.strictEqual(links.length, 1);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 5, 0, 9);
        });

        it("wrong stage name", () => {
            let links = service.computeLinks("FROM node AS base\nFROM base2");
            assert.strictEqual(links.length, 2);
            assertLink(links[0], undefined, "_/node/", 0, 5, 0, 9);
            links[0] = service.resolveLink(links[0]);
            assertLink(links[0], "https://hub.docker.com/_/node/", "_/node/", 0, 5, 0, 9);
            assertLink(links[1], undefined, "_/base2/", 1, 5, 1, 10);
            links[1] = service.resolveLink(links[1]);
            assertLink(links[1], "https://hub.docker.com/_/base2/", "_/base2/", 1, 5, 1, 10);
        });
    });
});
