#!/bin/bash
set -e # Exit immediately if a command fails

echo "================================================================="
echo "CHECKPOINT TESTING SCRIPT"
echo "================================================================="

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd app || exit 1 # Ensure we are in the app directory

# CHECKPOINT 1: AuthModule exports
echo -e "${YELLOW}CHECKPOINT 1: Testing AuthModule exports${NC}"
grep -q "TypeOrmModule.forFeature(\[User\])" src/microservices/auth/auth.module.ts || {
  echo -e "${RED}FAILURE: Auth module is not properly exporting User entity${NC}"
  exit 1
}
echo -e "${GREEN}✓ Auth module is correctly configured${NC}"

# CHECKPOINT 2: UserProfile entity created
echo -e "${YELLOW}CHECKPOINT 2: Testing UserProfile entity existence${NC}"
test -f src/microservices/user/entities/user-profile.entity.ts || {
  echo -e "${RED}FAILURE: UserProfile entity file does not exist${NC}"
  exit 1
}
echo -e "${GREEN}✓ UserProfile entity exists${NC}"

# CHECKPOINT 3: UserModule updated
echo -e "${YELLOW}CHECKPOINT 3: Testing UserModule configuration${NC}"
grep -q "AuthModule" src/microservices/user/user.module.ts || {
  echo -e "${RED}FAILURE: UserModule is not importing AuthModule${NC}"
  exit 1
}
grep -q "UserProfile" src/microservices/user/user.module.ts || {
  echo -e "${RED}FAILURE: UserModule is not registering UserProfile entity${NC}"
  exit 1
}
echo -e "${GREEN}✓ UserModule is correctly configured${NC}"

# CHECKPOINT 4: Old User entity references removed
echo -e "${YELLOW}CHECKPOINT 4: Testing old User entity references${NC}"
! grep -r "from \"../user/entities/user.entity\"" --include="*.ts" src/microservices || {
  echo -e "${RED}FAILURE: Found references to user/entities/user.entity.ts that need to be updated${NC}"
  grep -r "from \"../user/entities/user.entity\"" --include="*.ts" src/microservices
  exit 1
}
echo -e "${GREEN}✓ No remaining references to old User entity${NC}"

# Final build test
echo -e "${YELLOW}Final build test${NC}"
npm run build || {
  echo -e "${RED}FAILURE: Build failed after changes${NC}"
  exit 1
}
echo -e "${GREEN}✓ Build successful${NC}"

echo -e "${GREEN}All checkpoints passed successfully!${NC}" 