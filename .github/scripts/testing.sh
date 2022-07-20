echo $(pwd)
# cd ../../
# echo $(pwd)
printenv
# if CI is set, then we are running on github need to install eveyrthing
if [ "$CI" == "true" ]; then
    echo "CI is set"
    npm ci
    nvm use v16.14.2
else
    echo "CI is not set"
fi

echo "Running npx hardhat coverage"
npx hardhat coverage --network hardhat>>test_output.log
sed -i '1s/^/```\n/' test_output.log
echo '```' >>test_output.log
echo "Test output"
cat test_output.log
