export interface IFileSystem {
    exists(path: string): boolean;
    readFile(path: string): string;
    writeFile(path: string, content: string): void;
    mkdir(path: string): void;
    unlink(path: string): void;
    join(...paths: string[]): string;
    dirname(path: string): string;
    basename(path: string): string;
    relative(from: string, to: string): string;
}
