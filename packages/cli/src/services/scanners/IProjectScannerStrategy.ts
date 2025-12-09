import { ProjectInfo } from '../../interfaces/ProjectInfo.js';

export interface IProjectScannerStrategy {
    name: string;
    scan(): Promise<ProjectInfo[]>;
}
