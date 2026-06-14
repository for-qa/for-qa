import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Core interface for any README update strategy.
 * This allows us to scale out the script to handle multiple dynamic sections
 * independently without creating a monolithic function.
 */
interface ReadmeStrategy {
    update(content: string): string;
}

/**
 * Strategy specifically for updating the overall Years of Experience in QA.
 */
class ExperienceUpdater implements ReadmeStrategy {
    private readonly joinDate: Date;
    private readonly regex = /(\d+)\+\s*Years in Software QA/;

    constructor(joinDateString: string) {
        this.joinDate = new Date(joinDateString);
    }

    private calculateYearsOfExperience(): number {
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate.getTime() - this.joinDate.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
    }

    public update(content: string): string {
        const diffYears = this.calculateYearsOfExperience();
        
        if (this.regex.test(content)) {
            return content.replace(this.regex, `${diffYears}+ Years in Software QA`);
        }
        
        console.warn("[ExperienceUpdater] Target text not found in README.");
        return content;
    }
}

/**
 * Context manager that orchestrates reading, applying strategies, and writing.
 */
class ReadmeManager {
    constructor(
        private readonly filePath: string,
        private readonly strategies: ReadmeStrategy[]
    ) {}

    public process(): void {
        const originalContent = fs.readFileSync(this.filePath, 'utf8');
        let updatedContent = originalContent;

        // Apply all update strategies sequentially
        for (const strategy of this.strategies) {
            updatedContent = strategy.update(updatedContent);
        }

        // Only perform disk write if a change actually occurred
        if (updatedContent === originalContent) {
            console.log("No dynamic changes required for README.md at this time.");
        } else {
            fs.writeFileSync(this.filePath, updatedContent);
            console.log("README.md updated successfully with new dynamic values.");
        }
    }
}

// ==========================================
// Execution Entrypoint
// ==========================================
const readmePath = path.join(__dirname, '..', 'README.md');

const manager = new ReadmeManager(readmePath, [
    // Add additional strategies here as your portfolio grows!
    new ExperienceUpdater('2019-04-01') 
]);

manager.process();
