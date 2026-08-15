#!/bin/bash

# Lighthouse CI Script for GitHub Actions
# Runs Lighthouse against a URL and checks thresholds

set -e

URL=${1:-"http://localhost:3000"}
OUTPUT_FILE="lighthouse-ci-results.json"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚢 Running Lighthouse CI against: $URL"

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s --head "$URL" > /dev/null; then
        echo "✅ Server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Server not ready after 30 seconds${NC}"
        exit 1
    fi
    sleep 1
done

# Run Lighthouse
lighthouse "$URL" \
    --output=json \
    --output-path="$OUTPUT_FILE" \
    --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
    --quiet

# Check thresholds
echo ""
echo "📊 Checking performance thresholds..."

node << EOF
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('$OUTPUT_FILE', 'utf8'));

const categories = report.categories;
const scores = {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100)
};

// Define thresholds
//
// performance: 40 is deliberately lenient, not a placeholder. Lighthouse's
// default throttlingMethod ('simulate') models a throttled mid-range mobile
// device (RTT 150ms, ~1.6 Mbps, 4x CPU slowdown) from the trace of the actual
// load — it is not real wall-clock time. Verified 2026-08-05: the real HTML
// document loaded in 482ms, yet the simulated LCP/TTI came back at 11-13s, and
// the same model scored live strummy.online at only 56/100 despite a real,
// instantly-responding Supabase backend. A 40-70 performance score under this
// model is normal for this app's size without dedicated perf tuning — judge
// deltas between runs, not the absolute number.
const thresholds = {
    performance: 40,
    accessibility: 80,
    bestPractices: 80,
    seo: 80
};

console.log('Lighthouse Scores vs Thresholds:');
console.log('================================');

let failed = false;
Object.entries(scores).forEach(([category, score]) => {
    const threshold = thresholds[category];
    const status = score >= threshold ? '✅ PASS' : '❌ FAIL';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' \$1');
    
    console.log(\`\${categoryName.padEnd(15)} \${score.toString().padStart(3)}/100 (min: \${threshold}) \${status}\`);
    
    if (score < threshold) {
        failed = true;
    }
});

if (failed) {
    console.log('\\n❌ Some Lighthouse scores are below thresholds');
    process.exit(1);
} else {
    console.log('\\n✅ All Lighthouse scores meet thresholds');
}
EOF

echo ""
echo -e "${GREEN}🎉 Lighthouse CI completed successfully!${NC}"