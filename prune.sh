#!/bin/bash
echo "Fetching functions..."
FUNCTIONS=$(aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `candidate-portal-backend-dev-`)].FunctionName' --output text)

COUNT=0
for FUNC in $FUNCTIONS; do
  if [ $COUNT -ge 5 ]; then
    break
  fi
  echo "Pruning function: $FUNC"
  
  VERSIONS=$(aws lambda list-versions-by-function --function-name "$FUNC" --query 'Versions[?Version!=`$LATEST`].Version' --output text)
  
  for VER in $VERSIONS; do
    echo "Deleting version $VER of $FUNC..."
    aws lambda delete-function --function-name "$FUNC" --qualifier "$VER" || true
  done
  
  COUNT=$((COUNT+1))
done
echo "Done pruning."
