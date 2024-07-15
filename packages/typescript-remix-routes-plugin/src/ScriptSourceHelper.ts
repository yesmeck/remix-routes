import * as ts from 'typescript';
import { findNode } from './nodes';

export class ScriptSourceHelper {
    constructor(
        private readonly typescript: typeof ts,
        private readonly project: ts.server.Project
    ) { }

    getNode(fileName: string, position: number) {
        const sourceFile = this.getSourceFile(fileName);
        return sourceFile && findNode(this.typescript, sourceFile, position);
    }

    getProgram() {
        return this.project.getLanguageService().getProgram();
    }

    getSourceFile(fileName: string) {
        const program = this.getProgram();
        return program ? program.getSourceFile(fileName) : undefined;
    }
}
