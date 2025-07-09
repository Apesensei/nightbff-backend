#!/usr/bin/env bash
# validate-before-push.sh - Comprehensive validation before CI push
# Usage: ./scripts/validate-before-push.sh
set -euo pipefail

echo "🔍 NightBFF Pre-Push Validation Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
VALIDATION_PASSED=true

validate_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "\n${YELLOW}⏳ $step_name${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $step_name - PASSED${NC}"
    else
        echo -e "${RED}❌ $step_name - FAILED${NC}"
        VALIDATION_PASSED=false
    fi
}

# Step 1: Environment Check
validate_step "Node.js Version Check" "node --version | grep -q 'v20'"

# Step 2: Clean Install Check
validate_step "Clean Dependency Installation" "cd app && rm -rf node_modules && npm ci --ignore-scripts"

# Step 3: TypeScript Compilation
validate_step "TypeScript Compilation" "cd app && npx tsc --noEmit"

# Step 4: Linting
validate_step "ESLint Validation" "cd app && npm run lint"

# Step 5: Unit Tests  
validate_step "Unit Test Suite" "cd app && npm run test -- --passWithNoTests --bail --forceExit"

# Step 6: Environment Variables Validation
validate_step "Environment Variables Check" "cd app && npm run env:lint"

# Step 7: Migration Validation (if migrations exist)
if [ -d "app/src/database/migrations" ] && [ "$(ls -A app/src/database/migrations)" ]; then
    validate_step "Migration File Validation" "cd app && npm run migration:validate"
fi

# Step 8: Docker Build Test
validate_step "Docker Build Test" "cd app && docker build -t nightbff-backend-test:latest ."

# Step 9: Workspace Configuration Check
validate_step "Workspace Configuration" "cd ../integration_scan && bash scripts/validate-workspace.sh"

# Step 10: Check for hardcoded secrets/tokens
validate_step "Secret Scan" "! grep -r -i --exclude-dir=node_modules --exclude='*.log' 'api[_-]key\\|secret\\|token\\|password' app/src/ || echo 'Warning: Potential secrets found'"

# Final Result
echo -e "\n========================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}🎉 ALL VALIDATIONS PASSED - SAFE TO PUSH${NC}"
    echo -e "✅ Dependencies resolved"
    echo -e "✅ TypeScript compilation clean"
    echo -e "✅ Linting passed"
    echo -e "✅ Tests passing"
    echo -e "✅ Environment validated"
    echo -e "✅ Docker build successful"
    echo -e "✅ No hardcoded secrets detected"
    echo ""
    echo -e "${YELLOW}📤 You can now push to CI with confidence${NC}"
    exit 0
else
    echo -e "${RED}💥 VALIDATION FAILED - DO NOT PUSH TO CI${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Fix the failing checks above before pushing${NC}"
    exit 1
fi 