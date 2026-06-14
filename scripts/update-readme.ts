import * as fs from 'node:fs';
import * as path from 'node:path';

interface ReadmeStrategy {
    update(content: string): Promise<string>;
}

class ExperienceUpdater implements ReadmeStrategy {
    private readonly joinDate: Date;

    constructor(joinDateString: string) {
        this.joinDate = new Date(joinDateString);
    }

    private calculateExactExperience(): string {
        const startDate = this.joinDate;
        const endDate = new Date();

        let years = endDate.getFullYear() - startDate.getFullYear();
        let months = endDate.getMonth() - startDate.getMonth();
        let days = endDate.getDate() - startDate.getDate();

        if (days < 0) {
            months -= 1;
            const prevMonthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
            days += prevMonthDate.getDate();
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        const yearStr = years === 1 ? '1 Year' : `${years} Years`;
        const monthStr = months === 1 ? '1 Month' : `${months} Months`;
        const dayStr = days === 1 ? '1 Day' : `${days} Days`;

        let result = [];
        if (years > 0) result.push(yearStr);
        if (months > 0) result.push(monthStr);
        if (days > 0) result.push(dayStr);

        if (result.length === 3) {
            return `${result[0]}, ${result[1]} and ${result[2]}`;
        } else if (result.length === 2) {
            return `${result[0]} and ${result[1]}`;
        } else if (result.length === 1) {
            return result[0];
        }
        return '0 Days';
    }

    public async update(content: string): Promise<string> {
        const diffStr = this.calculateExactExperience();
        
        const regex = /<!-- DYNAMIC:EXPERIENCE_START -->[\s\S]*?<!-- DYNAMIC:EXPERIENCE_END -->/;
        if (regex.test(content)) {
            return content.replace(regex, `<!-- DYNAMIC:EXPERIENCE_START -->${diffStr}<!-- DYNAMIC:EXPERIENCE_END -->`);
        }
        
        // Fallback for migration
        const oldRegex = /(\d+)\+\s*Years/;
        if (oldRegex.test(content)) {
            return content.replace(oldRegex, `<!-- DYNAMIC:EXPERIENCE_START -->${diffStr}<!-- DYNAMIC:EXPERIENCE_END -->`);
        }

        console.warn("[ExperienceUpdater] Target text not found in README.");
        return content;
    }
}

class CurrentlyLearningUpdater implements ReadmeStrategy {
    private readonly dataPath: string;

    constructor(dataPath: string) {
        this.dataPath = dataPath;
    }

    public async update(content: string): Promise<string> {
        try {
            if (!fs.existsSync(this.dataPath)) return content;
            
            const rawData = fs.readFileSync(this.dataPath, 'utf8');
            const data = JSON.parse(rawData);
            
            let injectedText = '';
            
            if (data.isActive) {
                if (data.currentFocus && data.currentlyReading) {
                    injectedText = `\n> 📚 **Currently Learning:** ${data.currentFocus} &middot; **Reading:** ${data.currentlyReading}\n`;
                } else if (data.currentFocus) {
                    injectedText = `\n> 📚 **Currently Learning:** ${data.currentFocus}\n`;
                } else if (data.currentlyReading) {
                    injectedText = `\n> 📚 **Currently Reading:** ${data.currentlyReading}\n`;
                }
            }
            
            const regex = /<!-- DYNAMIC:LEARNING_START -->[\s\S]*<!-- DYNAMIC:LEARNING_END -->/;
            return content.replace(regex, `<!-- DYNAMIC:LEARNING_START -->${injectedText}<!-- DYNAMIC:LEARNING_END -->`);
        } catch (error) {
            console.warn("[CurrentlyLearningUpdater] Failed to parse learning.json", error);
            return content;
        }
    }
}

class TestHealthUpdater implements ReadmeStrategy {
    private readonly repo: string;
    
    constructor(repo: string) {
        this.repo = repo;
    }

    public async update(content: string): Promise<string> {
        try {
            // Using public GitHub API
            const headers: Record<string, string> = { 'User-Agent': 'for-qa-portfolio-script' };
            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const response = await fetch(`https://api.github.com/repos/${this.repo}/actions/runs?per_page=1`, { headers });
            if (!response.ok) {
                console.warn(`[TestHealthUpdater] GitHub API returned ${response.status}`);
                return content;
            }

            const data = await response.json();
            if (data?.workflow_runs && data.workflow_runs.length > 0) {
                const latestRun = data.workflow_runs[0];
                const statusStr = latestRun.conclusion === 'success' ? '🟢 100% Passed' : '🔴 Failing';
                const dateStr = new Date(latestRun.updated_at).toLocaleDateString();
                
                const injectedText = `\n**Nightly E2E Status:** ${statusStr} (Last run: ${dateStr})\n`;
                
                const regex = /<!-- DYNAMIC:TEST_HEALTH_START -->[\s\S]*<!-- DYNAMIC:TEST_HEALTH_END -->/;
                return content.replace(regex, `<!-- DYNAMIC:TEST_HEALTH_START -->${injectedText}<!-- DYNAMIC:TEST_HEALTH_END -->`);
            }
            return content;
        } catch (error) {
            console.warn("[TestHealthUpdater] Failed to fetch data", error);
            return content;
        }
    }
}

class WakatimeUpdater implements ReadmeStrategy {
    public async update(content: string): Promise<string> {
        const apiKey = process.env.WAKATIME_API_KEY;
        if (!apiKey) {
            console.warn("[WakatimeUpdater] WAKATIME_API_KEY is not set. Skipping.");
            return content;
        }

        try {
            // Base64 encode the API key for Basic Auth
            const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`;
            const response = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
                headers: { 'Authorization': authHeader }
            });

            if (!response.ok) {
                console.warn(`[WakatimeUpdater] WakaTime API returned ${response.status}`);
                return content;
            }

            const json = await response.json();
            const data = json.data;
            if (!data?.languages) return content;

            // Take top 3 languages
            const topLangs = data.languages.slice(0, 3).map((l: any) => `${l.name} (${l.text})`).join(' · ');
            const injectedText = `\n**Last 7 Days Coding Activity:** ${topLangs}\n`;

            const regex = /<!-- DYNAMIC:WAKATIME_START -->[\s\S]*<!-- DYNAMIC:WAKATIME_END -->/;
            return content.replace(regex, `<!-- DYNAMIC:WAKATIME_START -->${injectedText}<!-- DYNAMIC:WAKATIME_END -->`);
            
        } catch (error) {
            console.warn("[WakatimeUpdater] Failed to fetch WakaTime stats", error);
            return content;
        }
    }
}

class ReadmeManager {
    constructor(
        private readonly filePath: string,
        private readonly strategies: ReadmeStrategy[]
    ) {}

    public async process(): Promise<void> {
        const originalContent = fs.readFileSync(this.filePath, 'utf8');
        let updatedContent = originalContent;

        for (const strategy of this.strategies) {
            updatedContent = await strategy.update(updatedContent);
        }

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
const learningPath = path.join(__dirname, '..', 'learning.json');

const manager = new ReadmeManager(readmePath, [
    new ExperienceUpdater('2019-04-01'),
    new CurrentlyLearningUpdater(learningPath),
    new TestHealthUpdater('for-qa/agentic-e2e-framework'),
    new WakatimeUpdater()
]);

manager.process().catch(console.error);
