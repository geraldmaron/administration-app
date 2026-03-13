#!/bin/bash

set -e

echo "Setting up iOS project for local AI testing..."

cd "$(dirname "$0")"

if [ ! -d "models" ]; then
    mkdir models
fi

cd models

if [ ! -f "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" ]; then
    echo "Downloading TinyLlama model for local testing..."
    curl -L -o tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf \
        "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
    echo "Model downloaded successfully!"
else
    echo "Model already exists."
fi

cd ..

echo "Renaming model for iOS bundle..."
if [ -f "models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" ]; then
    cp models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf models/model.gguf
    echo "Model ready for iOS!"
fi

echo ""
echo "iOS project setup complete!"
echo "Model location: ios/models/model.gguf"
echo ""
echo "Next steps:"
echo "1. Open Xcode"
echo "2. File > New > Project > iOS > App"
echo "3. Name: TheAdministration"
echo "4. Add the TheAdministration folder as source"
echo "5. Add models/model.gguf to the project resources"
echo "6. Build and run"
