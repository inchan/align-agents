import crypto from 'crypto';
import fs from 'fs';

export class ChecksumService {
    /**
     * Calculate SHA-256 checksum of a file
     */
    async calculateFileChecksum(filePath: string): Promise<string | null> {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const fileBuffer = await fs.promises.readFile(filePath);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (error) {
            // console.error('Error calculating checksum:', error);
            return null;
        }
    }

    /**
     * Calculate SHA-256 checksum of a string content
     */
    calculateStringChecksum(content: string): string {
        const hashSum = crypto.createHash('sha256');
        hashSum.update(content);
        return hashSum.digest('hex');
    }
}
