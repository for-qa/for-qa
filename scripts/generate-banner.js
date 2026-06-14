// scripts/generate-banner.js
const fs = require('node:fs');

async function fetchIcon(slug, color) {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/${slug}.svg`);
        if (!response.ok) return '';
        let svg = await response.text();
        // inject fill color and dimensions into the svg
        svg = svg.replace('<svg ', `<svg fill="${color}" width="24" height="24" `);
        return svg;
    } catch (e) {
        console.error(`Failed to fetch icon ${slug}:`, e);
        return '';
    }
}

function createIconGroup(x, y, svgContent, label) {
    return `
    <g transform="translate(${x}, ${y}) scale(2.4)">
        ${svgContent}
        <text x="12" y="34" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="4.5" fill="#8892B0" text-anchor="middle">${label}</text>
    </g>
    `;
}

async function buildBanner() {
    console.log("Fetching logos...");
    
    // Brand logos
    const tsIcon = await fetchIcon('typescript', '#3178C6');
    // Simple-Icons removed Playwright and OpenAI, so we fetch them from Iconify CDN
    let playwrightIcon = '';
    let openaiIcon = '';
    try {
        playwrightIcon = await (await fetch('https://api.iconify.design/logos/playwright.svg')).text();
        openaiIcon = await (await fetch('https://api.iconify.design/simple-icons/openai.svg?color=white')).text();
    } catch (e) {
        console.error('Failed to fetch from Iconify:', e);
    } 
    const geminiIcon = await fetchIcon('googlegemini', '#8E75B2'); 
    const anthropicIcon = await fetchIcon('anthropic', '#D1CEBD'); // Claude
    
    let deepseekIcon = await fetchIcon('deepseek', '#4A90E2');
    if (!deepseekIcon) {
        deepseekIcon = `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" fill="#4A90E2"/></svg>`;
    }

    const svgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1584 396" width="1584" height="396">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0B0F19" />
            <stop offset="50%" stop-color="#111827" />
            <stop offset="100%" stop-color="#0B0F19" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(46, 173, 51, 0.05)" stroke-width="1" />
        </pattern>
        <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>

    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)" />
    <rect width="100%" height="100%" fill="url(#grid)" />

    <!-- Decorative Vibe Elements -->
    <path d="M -100 350 Q 300 200 800 300 T 1700 200" fill="none" stroke="#2EAD33" stroke-width="2" opacity="0.3" filter="url(#glow)"/>
    <path d="M -100 380 Q 400 300 900 350 T 1700 150" fill="none" stroke="#3178C6" stroke-width="1" opacity="0.2" filter="url(#glow)"/>

    <!-- MacOS Terminal Dots -->
    <rect x="100" y="80" width="14" height="14" rx="7" fill="#FF5F56" />
    <rect x="130" y="80" width="14" height="14" rx="7" fill="#FFBD2E" />
    <rect x="160" y="80" width="14" height="14" rx="7" fill="#27C93F" />

    <!-- Main Typography -->
    <text x="100" y="190" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="85" fill="#FFFFFF" letter-spacing="-2">
        GAIRIK SINGHA
    </text>
    
    <text x="105" y="245" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="30" fill="#2EAD33" filter="url(#glow)">
        > SDET &amp; QA Architect
    </text>
    
    <text x="105" y="295" font-family="'JetBrains Mono', monospace" font-weight="500" font-size="24" fill="#8892B0">
        AI Agent Orchestration • Playwright • Clean Architecture
    </text>

    <!-- Faint Code Snippet Background -->
    <text x="960" y="70" font-family="'JetBrains Mono', monospace" font-size="22" fill="#2EAD33" opacity="0.15">
        const agent = new AIQAOrchestrator();
    </text>
    <text x="960" y="105" font-family="'JetBrains Mono', monospace" font-size="22" fill="#2EAD33" opacity="0.15">
        await agent.analyzeArchitecture();
    </text>
    <text x="960" y="140" font-family="'JetBrains Mono', monospace" font-size="22" fill="#2EAD33" opacity="0.15">
        agent.generateE2ESuite({ target: 'production' });
    </text>

    <!-- Logos Group -->
    ${createIconGroup(1000, 200, tsIcon, "TypeScript")}
    ${createIconGroup(1090, 200, playwrightIcon, "Playwright")}
    ${createIconGroup(1180, 200, openaiIcon, "OpenAI")}
    ${createIconGroup(1270, 200, geminiIcon, "Gemini")}
    ${createIconGroup(1360, 200, anthropicIcon, "Claude")}
    ${createIconGroup(1450, 200, deepseekIcon, "DeepSeek")}
</svg>
    `;

    fs.writeFileSync('assets/header-banner.svg', svgTemplate.trim());
    console.log("Successfully generated assets/header-banner.svg");
}

buildBanner();
