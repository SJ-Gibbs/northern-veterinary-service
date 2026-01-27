#!/bin/bash

echo "========================================="
echo "  Northern Veterinary Service"
echo "  Starting Web Application"
echo "========================================="
echo ""

cd /home/runner/workspace

# Start the server using nix-shell which provides Node.js
nix-shell --run "node server.js"

