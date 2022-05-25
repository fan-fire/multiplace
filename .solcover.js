module.exports = {
    skipFiles: ['ERC20.sol',
        'ERC721s.sol',
        'ERC1155s.sol',
        'Mocks.sol',
        'Overload.sol',
    ],
    istanbulReporter: ['html', 'lcov', 'text', 'json', 'clover']
};