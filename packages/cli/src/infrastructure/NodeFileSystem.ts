import fs from 'fs';
import path from 'path';
import { IFileSystem } from '../interfaces/IFileSystem.js';

export class NodeFileSystem implements IFileSystem {
    exists(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    readFile(filePath: string): string {
        return fs.readFileSync(filePath, 'utf-8');
    }

    writeFile(filePath: string, content: string): void {
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    mkdir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    unlink(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    join(...paths: string[]): string {
        return path.join(...paths);
    }

    dirname(filePath: string): string {
        return path.dirname(filePath);
    }

    basename(filePath: string): string {
        return path.basename(filePath);
    }

    relative(from: string, to: string): string {
        return path.relative(from, to);
    }
}
